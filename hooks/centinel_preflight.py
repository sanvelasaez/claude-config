#!/usr/bin/env python3
"""
centinel_preflight.py — Hook de seguridad en tiempo real para Claude Code.

Invocado por los hooks PreToolUse de settings.json para: Bash, Write, Edit, WebFetch.
Lee CLAUDE_TOOL_INPUT (JSON), infiere el tipo de operación y aplica las comprobaciones
de centinel_iocs.json. Fail-open: cualquier error interno permite la ejecución (exit 0).

Uso en settings.json:
  "command": "python3 ~/.claude/hooks/centinel_preflight.py"
"""

import json
import os
import re
import sys
from pathlib import Path


# --- Carga de IOCs ---

def load_iocs() -> dict:
    script_dir = Path(__file__).parent
    ioc_path = script_dir / "centinel_iocs.json"
    try:
        with open(ioc_path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


# --- Utilidades ---

def matches_any_pattern(text: str, patterns: list[str]) -> str | None:
    """Devuelve el primer patrón que coincide, o None."""
    text_lower = text.lower()
    for pattern in patterns:
        try:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return pattern
        except re.error:
            if pattern.lower() in text_lower:
                return pattern
    return None


def contains_any(text: str, substrings: list[str]) -> str | None:
    """Devuelve el primer substring encontrado, o None."""
    text_lower = text.lower()
    for s in substrings:
        if s.lower() in text_lower:
            return s
    return None


def block(reason: str) -> None:
    print(f"⛔ CENTINEL BLOQUEADO: {reason}", flush=True)
    sys.exit(1)


def warn(reason: str) -> None:
    print(f"⚠️  CENTINEL ADVERTENCIA: {reason}", flush=True)


# --- Comprobaciones por tipo de herramienta ---

def check_bash(command: str, iocs: dict) -> None:
    if not command:
        return

    # 1. Patrones destructivos (bloqueo duro sin IOCs como red de seguridad)
    hard_blocked = [
        "rm -rf /", "rm -rf ~", "rm -rf $HOME",
        "mkfs", "dd if=", "shred -uz",
        "format c:", "format /q",
        "> /dev/sda", "> /dev/nvme",
    ]
    found = contains_any(command, hard_blocked)
    if found:
        block(f"Comando destructivo detectado: '{found}'")

    # 2. Patrones de IOCs
    dangerous = iocs.get("dangerous_command_patterns", {})
    for category, patterns in dangerous.items():
        match = matches_any_pattern(command, patterns)
        if match:
            block(f"Patrón peligroso ({category}): '{match}' en comando")

    # 3. Prompt injection en argumentos del comando
    pi_patterns = iocs.get("prompt_injection_patterns", [])
    match = matches_any_pattern(command, pi_patterns)
    if match:
        warn(f"Posible prompt injection en comando: '{match}'")

    # 4. Variables de entorno sensibles impresas o exfiltradas
    sensitive_vars = iocs.get("sensitive_env_vars", {})
    exact_vars = sensitive_vars.get("exact", [])
    var_patterns = sensitive_vars.get("patterns", [])
    all_var_patterns = [f"\\${v}|\\${{{v}}}" for v in exact_vars] + var_patterns
    match = matches_any_pattern(command, all_var_patterns)
    if match and any(svc in command for svc in iocs.get("exfiltration_services", [])):
        block(f"Posible exfiltración de variable sensible: '{match}'")


def check_write(file_path: str, content: str, iocs: dict) -> None:
    if not file_path:
        return

    # 1. Rutas sensibles exactas
    sensitive = iocs.get("sensitive_paths", {})
    exact_paths = sensitive.get("exact", [])
    normalized = file_path.replace("\\", "/")
    for path in exact_paths:
        expanded = os.path.expanduser(path).replace("\\", "/")
        if normalized == expanded or normalized.startswith(expanded):
            block(f"Escritura en ruta sensible bloqueada: '{file_path}'")

    # 2. Patrones de ruta sensible
    path_patterns = sensitive.get("patterns", [])
    match = matches_any_pattern(file_path, path_patterns)
    if match:
        warn(f"Escritura en ruta potencialmente sensible: '{file_path}' (patrón: '{match}')")

    # 3. Análisis de contenido si existe
    if content:
        # Secrets hardcodeados (variables de entorno sensibles en el contenido)
        env_vars = iocs.get("sensitive_env_vars", {})
        for var in env_vars.get("exact", []):
            if var in content and ("=" in content or ":" in content):
                warn(f"Posible secret hardcodeado en contenido: '{var}'")
                break

        # Prompt injection en contenido a escribir (archivos de configuración de Claude)
        if ".claude" in file_path or "CLAUDE" in file_path or "claude" in file_path.lower():
            pi_patterns = iocs.get("prompt_injection_patterns", [])
            match = matches_any_pattern(content, pi_patterns)
            if match:
                block(f"Prompt injection detectado en archivo de configuración Claude: '{match}'")


def check_web_fetch(url: str, iocs: dict) -> None:
    if not url:
        return

    # 1. Allowlist: siempre permitido
    allowlist = iocs.get("allowlist_domains", [])
    for domain in allowlist:
        if domain in url:
            return

    # 2. Servicios de exfiltración conocidos
    exfil = iocs.get("exfiltration_services", [])
    found = contains_any(url, exfil)
    if found:
        block(f"URL apunta a servicio de exfiltración conocido: '{found}'")

    # 3. Dominios maliciosos exactos
    mal_domains = iocs.get("malicious_domains", {}).get("exact", [])
    found = contains_any(url, mal_domains)
    if found:
        block(f"Dominio malicioso conocido: '{found}'")

    # 4. TLDs sospechosos
    suspicious_tlds = iocs.get("malicious_domains", {}).get("suspicious_tlds", [])
    url_lower = url.lower().split("?")[0].split("/")[2] if "://" in url else url.lower()
    for tld in suspicious_tlds:
        if url_lower.endswith(tld):
            warn(f"URL con TLD sospechoso: '{tld}' en '{url}'")
            break


# --- Punto de entrada ---

def main() -> None:
    try:
        raw = os.environ.get("CLAUDE_TOOL_INPUT", "{}")
        tool_input = json.loads(raw)
    except json.JSONDecodeError:
        sys.exit(0)  # fail-open

    try:
        iocs = load_iocs()
    except Exception:
        iocs = {}

    try:
        # Inferir tipo de herramienta por los campos presentes
        if "command" in tool_input:
            check_bash(tool_input.get("command", ""), iocs)
        elif "url" in tool_input:
            check_web_fetch(tool_input.get("url", ""), iocs)
        elif "file_path" in tool_input:
            check_write(
                tool_input.get("file_path", ""),
                tool_input.get("content", tool_input.get("new_string", "")),
                iocs,
            )
    except SystemExit:
        raise
    except Exception:
        sys.exit(0)  # fail-open en cualquier error interno


if __name__ == "__main__":
    main()
