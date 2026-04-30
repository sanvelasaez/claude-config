#!/usr/bin/env python3
"""
centinel-server.py — MCP server local de enriquecimiento de seguridad.

Implementa el protocolo MCP (JSON-RPC sobre stdio) sin dependencias externas.
Solo requiere Python 3.x.

Herramientas: scan_package, check_ioc, add_ioc, ioc_stats

Seguridad:
  - Solo consulta dominios de la allowlist hardcodeada (api.osv.dev)
  - Timeout de 5 segundos en todas las llamadas de red
  - Sin autenticación ni almacenamiento de credenciales
"""

import json
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime, timezone

ALLOWED_HOSTS = {"api.osv.dev", "api.github.com"}
IOC_PATH = Path(__file__).parent / "centinel_iocs.json"
TIMEOUT_S = 5

ECOSYSTEM_MAP = {
    "npm": "npm", "node": "npm",
    "pypi": "PyPI", "pip": "PyPI", "python": "PyPI",
    "go": "Go", "golang": "Go",
    "cargo": "crates.io", "rust": "crates.io",
    "gems": "RubyGems", "ruby": "RubyGems",
    "maven": "Maven", "java": "Maven",
    "nuget": "NuGet", "dotnet": "NuGet",
    "composer": "Packagist", "php": "Packagist",
    "dart": "pub", "flutter": "pub",
}


def https_post(url, payload):
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        if parsed.hostname not in ALLOWED_HOSTS:
            return None
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            url, data=data,
            headers={"Content-Type": "application/json", "User-Agent": "centinel-mcp/1.0"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


def load_iocs():
    try:
        with open(IOC_PATH, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_iocs(iocs):
    try:
        with open(IOC_PATH, "w", encoding="utf-8") as f:
            json.dump(iocs, f, indent=2, ensure_ascii=False)
        return True
    except Exception:
        return False


def scan_package(name, ecosystem):
    osv = ECOSYSTEM_MAP.get(ecosystem.lower(), ecosystem)
    result = https_post("https://api.osv.dev/v1/query", {"package": {"name": name, "ecosystem": osv}})
    if result is None:
        return f"No se pudo consultar OSV.dev para {name} ({osv}). Comprueba conectividad."
    vulns = result.get("vulns", [])
    if not vulns:
        return f"Sin vulnerabilidades conocidas en OSV.dev para {name} ({osv})."
    lines = [f"{len(vulns)} vulnerabilidad(es) encontrada(s) para {name} ({osv}):"]
    for v in vulns[:5]:
        vid = v.get("id", "ID desconocido")
        summary = (v.get("summary") or "Sin descripcion")[:120]
        severity = "-"
        for s in v.get("severity", []):
            if s.get("type") == "CVSS_V3" and s.get("score"):
                severity = f"CVSS {s['score']}"
                break
        lines.append(f"  * {vid} [{severity}]: {summary}")
    if len(vulns) > 5:
        lines.append(f"  ... y {len(vulns) - 5} mas. Ver https://osv.dev/list?q={name}")
    return "\n".join(lines)


def check_ioc(value):
    iocs = load_iocs()
    if not iocs:
        return "No se pudo cargar centinel_iocs.json."
    lower = value.lower()
    findings = []
    for d in (iocs.get("malicious_domains") or {}).get("exact", []):
        if d.lower() in lower:
            findings.append(f"Dominio malicioso conocido: '{d}'")
    for tld in (iocs.get("malicious_domains") or {}).get("suspicious_tlds", []):
        host = re.sub(r"[/?].*", "", lower)
        if host.endswith(tld):
            findings.append(f"TLD sospechoso: '{tld}'")
    for svc in iocs.get("exfiltration_services", []):
        if svc.lower() in lower:
            findings.append(f"Servicio de exfiltracion conocido: '{svc}'")
    for cat, patterns in (iocs.get("dangerous_command_patterns") or {}).items():
        for p in patterns:
            try:
                if re.search(p, value, re.IGNORECASE):
                    findings.append(f"Patron peligroso ({cat}): '{p}'")
                    break
            except re.error:
                pass
    for phrase in iocs.get("prompt_injection_patterns", []):
        try:
            if re.search(phrase, value, re.IGNORECASE):
                findings.append(f"Posible prompt injection: '{phrase}'")
                break
        except re.error:
            pass
    if not findings:
        return f"'{value[:80]}' no coincide con ningun IOC conocido."
    return "\n".join(findings)


def add_ioc(ioc_type, pattern, description):
    iocs = load_iocs()
    if not iocs:
        return "No se pudo cargar centinel_iocs.json."
    if ioc_type == "malicious_domain":
        exact = iocs.setdefault("malicious_domains", {}).setdefault("exact", [])
        if pattern in exact:
            return f"'{pattern}' ya existe en malicious_domains.exact."
        exact.append(pattern)
    elif ioc_type == "exfiltration_service":
        lst = iocs.setdefault("exfiltration_services", [])
        if pattern in lst:
            return f"'{pattern}' ya existe en exfiltration_services."
        lst.append(pattern)
    elif ioc_type == "prompt_injection":
        lst = iocs.setdefault("prompt_injection_patterns", [])
        if pattern in lst:
            return f"'{pattern}' ya existe en prompt_injection_patterns."
        lst.append(pattern)
    elif ioc_type.startswith("dangerous_pattern:"):
        category = ioc_type.split(":", 1)[1]
        lst = iocs.setdefault("dangerous_command_patterns", {}).setdefault(category, [])
        if pattern in lst:
            return f"'{pattern}' ya existe en dangerous_command_patterns.{category}."
        lst.append(pattern)
    else:
        return (
            f"Tipo desconocido: '{ioc_type}'. "
            "Validos: malicious_domain, exfiltration_service, prompt_injection, dangerous_pattern:<categoria>"
        )
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    iocs.setdefault("_version_history", []).append(
        {"date": today, "type": ioc_type, "pattern": pattern, "description": description}
    )
    iocs["_updated"] = today
    return (
        f"IOC anadido: [{ioc_type}] '{pattern}' - {description}"
        if save_iocs(iocs) else "Error al guardar centinel_iocs.json."
    )


def ioc_stats():
    iocs = load_iocs()
    if not iocs:
        return "No se pudo cargar centinel_iocs.json."
    paths = iocs.get("sensitive_paths", {})
    envs = iocs.get("sensitive_env_vars", {})
    mal = iocs.get("malicious_domains", {})
    cmds = iocs.get("dangerous_command_patterns", {})
    total = sum(len(v) for v in cmds.values())
    hist = (iocs.get("_version_history") or [])[-3:]
    lines = [
        "Estado de centinel_iocs.json",
        f"  Version: {iocs.get('_version', '-')} | Actualizado: {iocs.get('_updated', '-')}",
        "",
        "Categorias:",
        f"  * Rutas sensibles: {len(paths.get('exact', []))} exactas, {len(paths.get('patterns', []))} patrones",
        f"  * Variables de entorno: {len(envs.get('exact', []))} exactas, {len(envs.get('patterns', []))} patrones",
        f"  * Dominios maliciosos: {len(mal.get('exact', []))} exactos, {len(mal.get('suspicious_tlds', []))} TLDs",
        f"  * Servicios de exfiltracion: {len(iocs.get('exfiltration_services', []))}",
        f"  * Patrones de comandos peligrosos: {total} en {len(cmds)} categorias",
        f"  * Patrones de prompt injection: {len(iocs.get('prompt_injection_patterns', []))}",
    ]
    if hist:
        lines.append("\nUltimas actualizaciones:")
        for e in hist:
            lines.append(f"  * {e['date']} [{e['type']}] {e['pattern']}")
    return "\n".join(lines)


TOOLS = [
    {
        "name": "scan_package",
        "description": "Consulta OSV.dev para buscar vulnerabilidades conocidas de un paquete. Usar antes de instalar cualquier dependencia nueva.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Nombre del paquete"},
                "ecosystem": {"type": "string", "description": "Ecosistema: npm, pypi, go, cargo, gems, maven, nuget, composer, dart"},
            },
            "required": ["name", "ecosystem"],
        },
    },
    {
        "name": "check_ioc",
        "description": "Comprueba si un valor (URL, dominio, comando) coincide con algun IOC de la base de datos local.",
        "inputSchema": {
            "type": "object",
            "properties": {"value": {"type": "string", "description": "Valor a comprobar"}},
            "required": ["value"],
        },
    },
    {
        "name": "add_ioc",
        "description": "Anade un nuevo IOC a la base de datos local centinel_iocs.json.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "ioc_type": {"type": "string", "description": "Tipo: malicious_domain, exfiltration_service, prompt_injection, dangerous_pattern:<categoria>"},
                "pattern": {"type": "string", "description": "Patron a anadir (string exacto o regex)"},
                "description": {"type": "string", "description": "Por que es un IOC"},
            },
            "required": ["ioc_type", "pattern", "description"],
        },
    },
    {
        "name": "ioc_stats",
        "description": "Muestra estadisticas del estado actual de la base de IOCs.",
        "inputSchema": {"type": "object", "properties": {}},
    },
]


def handle_message(msg):
    req_id = msg.get("id")
    method = msg.get("method", "")
    params = msg.get("params", {})

    if method == "initialize":
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "centinel", "version": "1.0.0"},
            },
        }
    if method in ("initialized", "notifications/initialized"):
        return None
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}}
    if method == "tools/call":
        name = params.get("name", "")
        args = params.get("arguments", {})
        try:
            if name == "scan_package":
                text = scan_package(args.get("name", ""), args.get("ecosystem", ""))
            elif name == "check_ioc":
                text = check_ioc(args.get("value", ""))
            elif name == "add_ioc":
                text = add_ioc(args.get("ioc_type", ""), args.get("pattern", ""), args.get("description", ""))
            elif name == "ioc_stats":
                text = ioc_stats()
            else:
                text = f"Herramienta desconocida: {name}"
        except Exception as e:
            text = f"Error interno en centinel-server: {e}"
        return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": text}]}}
    if req_id is not None:
        return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": "Method not found"}}
    return None


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
            response = handle_message(msg)
            if response is not None:
                sys.stdout.write(json.dumps(response, ensure_ascii=False) + "\n")
                sys.stdout.flush()
        except json.JSONDecodeError:
            pass
        except Exception as e:
            error_resp = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": str(e)}}
            sys.stdout.write(json.dumps(error_resp) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
