#!/usr/bin/env python3
"""
centinel-server.py — MCP server local de enriquecimiento de seguridad.

Proporciona a Claude herramientas para consultar vulnerabilidades en tiempo real
y gestionar la base de IOCs local. NO puede bloquear operaciones (eso es el hook).

APIs usadas:
  - OSV.dev (https://api.osv.dev) — base de CVEs pública, sin autenticación
  - GitHub Advisory Database — vía API pública, sin token (rate limit: 60 req/h)

Configuración en .mcp.json del proyecto:
  {
    "mcpServers": {
      "centinel": {
        "command": "python3",
        "args": ["~/.claude/mcps/centinel-server.py"]
      }
    }
  }

Seguridad:
  - Solo consulta dominios de la allowlist hardcodeada
  - Formatea siempre la respuesta — nunca pasa contenido raw de APIs externas
  - Timeout de 5 segundos en todas las llamadas de red
  - Sin autenticación ni almacenamiento de credenciales
"""

import json
import sys
import os
import re
from pathlib import Path
from datetime import datetime, timezone
from typing import Any

try:
    import urllib.request
    import urllib.error
except ImportError:
    pass

# ── MCP SDK ────────────────────────────────────────────────────────────────────
# pip install mcp
try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import Tool, TextContent
except ImportError:
    print(
        "ERROR: MCP SDK no instalado. Ejecuta: pip install mcp",
        file=sys.stderr
    )
    sys.exit(1)


# ── Configuración ──────────────────────────────────────────────────────────────

ALLOWED_HOSTS = {
    "api.osv.dev",
    "api.github.com",
}

IOC_PATH = Path(__file__).parent / "centinel_iocs.json"

TIMEOUT = 5  # segundos para llamadas HTTP


# ── Utilidades de red ──────────────────────────────────────────────────────────

def safe_get(url: str) -> dict | None:
    """GET con validación de host, timeout y manejo de errores. Fail-silent."""
    try:
        from urllib.parse import urlparse
        host = urlparse(url).netloc
        if host not in ALLOWED_HOSTS:
            return None
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "centinel-mcp/1.0", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


def safe_post(url: str, payload: dict) -> dict | None:
    """POST con validación de host, timeout y manejo de errores. Fail-silent."""
    try:
        from urllib.parse import urlparse
        host = urlparse(url).netloc
        if host not in ALLOWED_HOSTS:
            return None
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "User-Agent": "centinel-mcp/1.0",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


# ── Carga de IOCs ──────────────────────────────────────────────────────────────

def load_iocs() -> dict:
    try:
        with open(IOC_PATH, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_iocs(iocs: dict) -> bool:
    try:
        with open(IOC_PATH, "w", encoding="utf-8") as f:
            json.dump(iocs, f, indent=2, ensure_ascii=False)
        return True
    except Exception:
        return False


# ── Herramientas de seguridad ──────────────────────────────────────────────────

def scan_package(name: str, ecosystem: str) -> str:
    """
    Consulta OSV.dev para vulnerabilidades conocidas de un paquete.
    Ecosistemas válidos: npm, PyPI, Go, crates.io, RubyGems, Maven, NuGet, Packagist, pub
    """
    ecosystem_map = {
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
    osv_ecosystem = ecosystem_map.get(ecosystem.lower(), ecosystem)

    payload = {"package": {"name": name, "ecosystem": osv_ecosystem}}
    result = safe_post("https://api.osv.dev/v1/query", payload)

    if result is None:
        return f"No se pudo consultar OSV.dev para {name} ({osv_ecosystem}). Comprueba conectividad."

    vulns = result.get("vulns", [])
    if not vulns:
        return f"✅ Sin vulnerabilidades conocidas en OSV.dev para {name} ({osv_ecosystem})."

    lines = [f"⚠️  {len(vulns)} vulnerabilidad(es) encontrada(s) para {name} ({osv_ecosystem}):"]
    for v in vulns[:5]:  # máximo 5 para no saturar el contexto
        vid = v.get("id", "ID desconocido")
        summary = v.get("summary", "Sin descripción")[:120]
        severity = "—"
        for s in v.get("severity", []):
            if s.get("type") == "CVSS_V3":
                score = s.get("score", "")
                if score:
                    try:
                        n = float(str(score).split("/")[0].split(":")[1] if ":" in str(score) else score)
                        severity = f"CVSS {n:.1f}"
                    except Exception:
                        severity = str(score)
        lines.append(f"  • {vid} [{severity}]: {summary}")

    if len(vulns) > 5:
        lines.append(f"  … y {len(vulns) - 5} más. Ver https://osv.dev/list?q={name}")
    return "\n".join(lines)


def check_ioc(value: str) -> str:
    """Comprueba si un valor (URL, dominio, comando, variable) coincide con algún IOC local."""
    iocs = load_iocs()
    if not iocs:
        return "No se pudo cargar centinel_iocs.json."

    findings = []
    value_lower = value.lower()

    # Dominios maliciosos exactos
    for domain in iocs.get("malicious_domains", {}).get("exact", []):
        if domain.lower() in value_lower:
            findings.append(f"🔴 Dominio malicioso conocido: '{domain}'")

    # TLDs sospechosos
    for tld in iocs.get("malicious_domains", {}).get("suspicious_tlds", []):
        if value_lower.rstrip("/").split("?")[0].endswith(tld):
            findings.append(f"🟠 TLD sospechoso: '{tld}'")

    # Servicios de exfiltración
    for svc in iocs.get("exfiltration_services", []):
        if svc.lower() in value_lower:
            findings.append(f"🔴 Servicio de exfiltración conocido: '{svc}'")

    # Patrones de comandos peligrosos
    for category, patterns in iocs.get("dangerous_command_patterns", {}).items():
        for pattern in patterns:
            try:
                if re.search(pattern, value, re.IGNORECASE):
                    findings.append(f"🔴 Patrón peligroso ({category}): '{pattern}'")
                    break
            except re.error:
                pass

    # Prompt injection
    for phrase in iocs.get("prompt_injection_patterns", []):
        try:
            if re.search(phrase, value, re.IGNORECASE):
                findings.append(f"🟠 Posible prompt injection: '{phrase}'")
                break
        except re.error:
            pass

    if not findings:
        return f"✅ '{value[:80]}' no coincide con ningún IOC conocido."
    return "\n".join(findings)


def add_ioc(ioc_type: str, pattern: str, description: str) -> str:
    """
    Añade un nuevo IOC a centinel_iocs.json.
    Tipos válidos: malicious_domain, exfiltration_service, dangerous_pattern, prompt_injection
    """
    iocs = load_iocs()
    if not iocs:
        return "No se pudo cargar centinel_iocs.json."

    type_map = {
        "malicious_domain": ("malicious_domains", "exact"),
        "exfiltration_service": ("exfiltration_services", None),
        "prompt_injection": ("prompt_injection_patterns", None),
    }

    if ioc_type not in type_map and not ioc_type.startswith("dangerous_pattern"):
        return f"Tipo desconocido: '{ioc_type}'. Válidos: malicious_domain, exfiltration_service, dangerous_pattern:<categoria>, prompt_injection"

    if ioc_type == "malicious_domain":
        section, subsection = "malicious_domains", "exact"
        target = iocs.setdefault(section, {}).setdefault(subsection, [])
        if pattern in target:
            return f"'{pattern}' ya existe en {section}.{subsection}."
        target.append(pattern)

    elif ioc_type == "exfiltration_service":
        target = iocs.setdefault("exfiltration_services", [])
        if pattern in target:
            return f"'{pattern}' ya existe en exfiltration_services."
        target.append(pattern)

    elif ioc_type == "prompt_injection":
        target = iocs.setdefault("prompt_injection_patterns", [])
        if pattern in target:
            return f"'{pattern}' ya existe en prompt_injection_patterns."
        target.append(pattern)

    elif ioc_type.startswith("dangerous_pattern:"):
        category = ioc_type.split(":", 1)[1]
        target = iocs.setdefault("dangerous_command_patterns", {}).setdefault(category, [])
        if pattern in target:
            return f"'{pattern}' ya existe en dangerous_command_patterns.{category}."
        target.append(pattern)
    else:
        return f"Tipo no reconocido: '{ioc_type}'"

    # Registrar en historial de versiones
    history = iocs.setdefault("_version_history", [])
    history.append({
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "type": ioc_type,
        "pattern": pattern,
        "description": description,
    })
    iocs["_updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if save_iocs(iocs):
        return f"✅ IOC añadido: [{ioc_type}] '{pattern}' — {description}"
    return "Error al guardar centinel_iocs.json."


def ioc_stats() -> str:
    """Devuelve estadísticas del estado actual de la base de IOCs."""
    iocs = load_iocs()
    if not iocs:
        return "No se pudo cargar centinel_iocs.json."

    lines = [
        f"📊 Estado de centinel_iocs.json",
        f"  Versión: {iocs.get('_version', '—')} | Actualizado: {iocs.get('_updated', '—')}",
        "",
        "Categorías:",
    ]

    paths = iocs.get("sensitive_paths", {})
    lines.append(f"  • Rutas sensibles: {len(paths.get('exact', []))} exactas, {len(paths.get('patterns', []))} patrones")

    env_vars = iocs.get("sensitive_env_vars", {})
    lines.append(f"  • Variables de entorno: {len(env_vars.get('exact', []))} exactas, {len(env_vars.get('patterns', []))} patrones")

    mal = iocs.get("malicious_domains", {})
    lines.append(f"  • Dominios maliciosos: {len(mal.get('exact', []))} exactos, {len(mal.get('suspicious_tlds', []))} TLDs")

    lines.append(f"  • Servicios de exfiltración: {len(iocs.get('exfiltration_services', []))}")

    cmd_patterns = iocs.get("dangerous_command_patterns", {})
    total_cmd = sum(len(v) for v in cmd_patterns.values())
    lines.append(f"  • Patrones de comandos peligrosos: {total_cmd} en {len(cmd_patterns)} categorías")

    lines.append(f"  • Patrones de prompt injection: {len(iocs.get('prompt_injection_patterns', []))}")

    history = iocs.get("_version_history", [])
    if history:
        lines.append(f"\nÚltimas actualizaciones:")
        for entry in history[-3:]:
            lines.append(f"  • {entry.get('date', '—')} [{entry.get('type', '—')}] {entry.get('pattern', '—')}")

    return "\n".join(lines)


# ── Servidor MCP ───────────────────────────────────────────────────────────────

server = Server("centinel")

TOOLS = [
    Tool(
        name="scan_package",
        description="Consulta OSV.dev para buscar vulnerabilidades conocidas de un paquete. Usar antes de instalar cualquier dependencia nueva.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Nombre del paquete"},
                "ecosystem": {"type": "string", "description": "Ecosistema: npm, pypi, go, cargo, gems, maven, nuget, composer, dart"},
            },
            "required": ["name", "ecosystem"],
        },
    ),
    Tool(
        name="check_ioc",
        description="Comprueba si un valor (URL, dominio, comando, string) coincide con algún IOC de la base de datos local.",
        inputSchema={
            "type": "object",
            "properties": {
                "value": {"type": "string", "description": "Valor a comprobar (URL, dominio, fragmento de comando, etc.)"},
            },
            "required": ["value"],
        },
    ),
    Tool(
        name="add_ioc",
        description="Añade un nuevo IOC a la base de datos local centinel_iocs.json. Usar cuando se detecta una nueva amenaza no cubierta.",
        inputSchema={
            "type": "object",
            "properties": {
                "ioc_type": {
                    "type": "string",
                    "description": "Tipo de IOC: malicious_domain, exfiltration_service, prompt_injection, dangerous_pattern:<categoria>",
                },
                "pattern": {"type": "string", "description": "Patrón a añadir (string exacto o regex)"},
                "description": {"type": "string", "description": "Descripción breve de por qué es un IOC"},
            },
            "required": ["ioc_type", "pattern", "description"],
        },
    ),
    Tool(
        name="ioc_stats",
        description="Muestra estadísticas del estado actual de la base de IOCs: cuántos patrones hay por categoría y cuándo fue la última actualización.",
        inputSchema={"type": "object", "properties": {}},
    ),
]


@server.list_tools()
async def list_tools() -> list[Tool]:
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    try:
        if name == "scan_package":
            result = scan_package(arguments["name"], arguments["ecosystem"])
        elif name == "check_ioc":
            result = check_ioc(arguments["value"])
        elif name == "add_ioc":
            result = add_ioc(arguments["ioc_type"], arguments["pattern"], arguments["description"])
        elif name == "ioc_stats":
            result = ioc_stats()
        else:
            result = f"Herramienta desconocida: {name}"
    except Exception as e:
        result = f"Error interno en centinel-server: {type(e).__name__}"

    return [TextContent(type="text", text=result)]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
