#!/usr/bin/env python3
"""
centinel_preflight.py — Hook de seguridad en tiempo real para Claude Code.

Invocado por hooks PreToolUse de settings.json (Bash, Write, Edit, WebFetch).
Lee CLAUDE_TOOL_INPUT (JSON), infiere el tipo de operación y aplica las
comprobaciones de centinel_iocs.json.

Si el comando Bash pasa la auditoría y rtk está instalado, lo reescribe
para reducir el output de tokens antes de devolverlo a Claude Code.

Fail-open: cualquier error interno permite la ejecución (exit 0).
"""

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


def load_iocs():
    try:
        ioc_path = Path(__file__).parent / "centinel_iocs.json"
        with open(ioc_path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def matches_any_pattern(text, patterns):
    lower = text.lower()
    for p in patterns:
        try:
            if re.search(p, lower, re.IGNORECASE):
                return p
        except re.error:
            if p.lower() in lower:
                return p
    return None


def contains_any(text, substrings):
    lower = text.lower()
    for s in substrings:
        if s.lower() in lower:
            return s
    return None


def block(reason):
    # stdout: Claude Code muestra este texto como motivo de bloqueo
    sys.stdout.write(f"[CENTINEL] BLOQUEADO: {reason}\n")
    sys.stdout.flush()
    sys.exit(1)


def warn(reason):
    # stderr: advertencia visible en logs sin interferir con la respuesta JSON
    sys.stderr.write(f"[CENTINEL] ADVERTENCIA: {reason}\n")
    sys.stderr.flush()


def try_rtk_rewrite(command):
    """Intenta reescribir el comando con rtk para reducir tokens de output.

    Retorna el comando reescrito si rtk está instalado y tiene equivalente,
    o None si rtk no está disponible o no tiene rewrite para este comando.
    """
    if not shutil.which("rtk"):
        return None
    try:
        result = subprocess.run(
            ["rtk", "rewrite", command],
            capture_output=True, text=True, timeout=2,
        )
        # exit 0: rewrite encontrado; exit 1: sin equivalente; exit 2: deny
        if result.returncode == 0:
            rewritten = result.stdout.strip()
            if rewritten and rewritten != command:
                return rewritten
    except Exception:
        pass
    return None


def emit_rewrite(rewritten_command):
    """Emite la respuesta JSON de rewrite hacia Claude Code y termina."""
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "allow",
            "permissionDecisionReason": "RTK rewrite",
            "updatedInput": {"command": rewritten_command},
        }
    }
    sys.stdout.write(json.dumps(output) + "\n")
    sys.stdout.flush()


def check_bash(command, iocs):
    if not command:
        return

    hard_blocked = [
        "rm -rf /", "rm -rf ~", "rm -rf $HOME",
        "mkfs", "dd if=", "shred -uz",
        "format c:", "format /q",
        "> /dev/sda", "> /dev/nvme",
    ]
    found = contains_any(command, hard_blocked)
    if found:
        block(f"Comando destructivo detectado: '{found}'")

    dangerous = iocs.get("dangerous_command_patterns", {})
    for category, patterns in dangerous.items():
        match = matches_any_pattern(command, patterns)
        if match:
            block(f"Patron peligroso ({category}): '{match}' en comando")

    pi_patterns = iocs.get("prompt_injection_patterns", [])
    pi_match = matches_any_pattern(command, pi_patterns)
    if pi_match:
        warn(f"Posible prompt injection en comando: '{pi_match}'")

    sensitive_vars = iocs.get("sensitive_env_vars", {})
    exact_vars = sensitive_vars.get("exact", [])
    var_patterns = [rf"\${v}|\${{{v}}}" for v in exact_vars] + sensitive_vars.get("patterns", [])
    var_match = matches_any_pattern(command, var_patterns)
    exfil_services = iocs.get("exfiltration_services", [])
    if var_match and any(svc in command for svc in exfil_services):
        block(f"Posible exfiltracion de variable sensible: '{var_match}'")


def check_write(file_path, content, iocs):
    if not file_path:
        return

    sensitive = iocs.get("sensitive_paths", {})
    normalized = file_path.replace("\\", "/")
    for p in sensitive.get("exact", []):
        expanded = p.replace("~", str(Path.home())).replace("\\", "/")
        if normalized == expanded or normalized.startswith(expanded):
            block(f"Escritura en ruta sensible bloqueada: '{file_path}'")

    path_match = matches_any_pattern(file_path, sensitive.get("patterns", []))
    if path_match:
        warn(f"Escritura en ruta potencialmente sensible: '{file_path}' (patron: '{path_match}')")

    if content:
        env_vars = iocs.get("sensitive_env_vars", {})
        for v in env_vars.get("exact", []):
            if v in content and ("=" in content or ":" in content):
                warn(f"Posible secret hardcodeado en contenido: '{v}'")
                break

        is_claude_config = any(k in file_path for k in [".claude", "CLAUDE", "claude"])
        if is_claude_config:
            pi_match = matches_any_pattern(content, iocs.get("prompt_injection_patterns", []))
            if pi_match:
                block(f"Prompt injection detectado en archivo de configuracion Claude: '{pi_match}'")


def check_web_fetch(url, iocs):
    if not url:
        return

    allowlist = iocs.get("allowlist_domains", [])
    if any(d in url for d in allowlist):
        return

    exfil = iocs.get("exfiltration_services", [])
    exfil_match = contains_any(url, exfil)
    if exfil_match:
        block(f"URL apunta a servicio de exfiltracion conocido: '{exfil_match}'")

    mal_exact = (iocs.get("malicious_domains") or {}).get("exact", [])
    mal_match = contains_any(url, mal_exact)
    if mal_match:
        block(f"Dominio malicioso conocido: '{mal_match}'")

    susp_tlds = (iocs.get("malicious_domains") or {}).get("suspicious_tlds", [])
    try:
        hostname = url.split("://")[1].split("/")[0].split("?")[0] if "://" in url else url
        for tld in susp_tlds:
            if hostname.endswith(tld):
                warn(f"URL con TLD sospechoso: '{tld}' en '{url}'")
                break
    except Exception:
        pass


def main():
    try:
        raw = os.environ.get("CLAUDE_TOOL_INPUT", "{}")
        try:
            tool_input = json.loads(raw)
        except json.JSONDecodeError:
            sys.exit(0)

        iocs = load_iocs()

        if "command" in tool_input:
            command = tool_input.get("command", "")
            check_bash(command, iocs)
            # centinel aprobó — intentar rewrite con rtk para reducir tokens
            rewritten = try_rtk_rewrite(command)
            if rewritten:
                emit_rewrite(rewritten)
        elif "url" in tool_input:
            check_web_fetch(tool_input.get("url", ""), iocs)
        elif "file_path" in tool_input:
            check_write(
                tool_input.get("file_path", ""),
                tool_input.get("content", tool_input.get("new_string", "")),
                iocs,
            )

        sys.exit(0)
    except SystemExit:
        raise
    except Exception:
        sys.exit(0)  # fail-open en cualquier error interno


if __name__ == "__main__":
    main()
