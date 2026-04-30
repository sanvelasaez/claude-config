#!/usr/bin/env node
/**
 * centinel-server.js — MCP server local de enriquecimiento de seguridad.
 *
 * Implementa el protocolo MCP (JSON-RPC sobre stdio) sin dependencias externas.
 * Solo requiere Node.js 18+.
 *
 * Herramientas: scan_package, check_ioc, add_ioc, ioc_stats
 *
 * Configuracion en ~/.claude.json:
 *   { "mcpServers": { "centinel": { "command": "node", "args": ["~/.claude/mcps/centinel-server.js"] } } }
 *
 * Seguridad:
 *   - Solo consulta dominios de la allowlist hardcodeada (api.osv.dev)
 *   - Timeout de 5 segundos en todas las llamadas de red
 *   - Sin autenticacion ni almacenamiento de credenciales
 */

"use strict";

const https    = require("https");
const fs       = require("fs");
const path     = require("path");
const readline = require("readline");

const ALLOWED_HOSTS = new Set(["api.osv.dev", "api.github.com"]);
const IOC_PATH      = path.join(__dirname, "centinel_iocs.json");
const TIMEOUT_MS    = 5000;

// --- Red ---

function httpsPost(url, payload) {
  return new Promise((resolve) => {
    let urlObj;
    try { urlObj = new URL(url); } catch { return resolve(null); }
    if (!ALLOWED_HOSTS.has(urlObj.hostname)) return resolve(null);

    const data = JSON.stringify(payload);
    const req  = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          "User-Agent": "centinel-mcp/1.0",
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
    req.write(data);
    req.end();
  });
}

// --- IOCs ---

function loadIocs() {
  try { return JSON.parse(fs.readFileSync(IOC_PATH, "utf8")); } catch { return {}; }
}

function saveIocs(iocs) {
  try { fs.writeFileSync(IOC_PATH, JSON.stringify(iocs, null, 2), "utf8"); return true; }
  catch { return false; }
}

// --- Herramientas ---

async function scanPackage(name, ecosystem) {
  const ecosystemMap = {
    npm: "npm", node: "npm",
    pypi: "PyPI", pip: "PyPI", python: "PyPI",
    go: "Go", golang: "Go",
    cargo: "crates.io", rust: "crates.io",
    gems: "RubyGems", ruby: "RubyGems",
    maven: "Maven", java: "Maven",
    nuget: "NuGet", dotnet: "NuGet",
    composer: "Packagist", php: "Packagist",
    dart: "pub", flutter: "pub",
  };
  const osv = ecosystemMap[ecosystem.toLowerCase()] || ecosystem;
  const result = await httpsPost("https://api.osv.dev/v1/query", { package: { name, ecosystem: osv } });

  if (!result) return `No se pudo consultar OSV.dev para ${name} (${osv}). Comprueba conectividad.`;

  const vulns = result.vulns || [];
  if (!vulns.length) return `Sin vulnerabilidades conocidas en OSV.dev para ${name} (${osv}).`;

  const lines = [`${vulns.length} vulnerabilidad(es) encontrada(s) para ${name} (${osv}):`];
  for (const v of vulns.slice(0, 5)) {
    const vid     = v.id || "ID desconocido";
    const summary = (v.summary || "Sin descripcion").slice(0, 120);
    let severity  = "-";
    for (const s of v.severity || []) {
      if (s.type === "CVSS_V3" && s.score) { severity = `CVSS ${s.score}`; break; }
    }
    lines.push(`  * ${vid} [${severity}]: ${summary}`);
  }
  if (vulns.length > 5) lines.push(`  ... y ${vulns.length - 5} mas. Ver https://osv.dev/list?q=${name}`);
  return lines.join("\n");
}

function checkIoc(value) {
  const iocs = loadIocs();
  if (!Object.keys(iocs).length) return "No se pudo cargar centinel_iocs.json.";
  const lower = value.toLowerCase();
  const findings = [];

  for (const d of ((iocs.malicious_domains || {}).exact || [])) {
    if (lower.includes(d.toLowerCase())) findings.push(`Dominio malicioso conocido: '${d}'`);
  }
  for (const tld of ((iocs.malicious_domains || {}).suspicious_tlds || [])) {
    const host = lower.replace(/\/.*/, "").replace(/\?.*/, "");
    if (host.endsWith(tld)) findings.push(`TLD sospechoso: '${tld}'`);
  }
  for (const svc of (iocs.exfiltration_services || [])) {
    if (lower.includes(svc.toLowerCase())) findings.push(`Servicio de exfiltracion conocido: '${svc}'`);
  }
  for (const [cat, patterns] of Object.entries(iocs.dangerous_command_patterns || {})) {
    for (const p of patterns) {
      try { if (new RegExp(p, "i").test(value)) { findings.push(`Patron peligroso (${cat}): '${p}'`); break; } }
      catch { /* skip bad regex */ }
    }
  }
  for (const phrase of (iocs.prompt_injection_patterns || [])) {
    try { if (new RegExp(phrase, "i").test(value)) { findings.push(`Posible prompt injection: '${phrase}'`); break; } }
    catch { /* skip */ }
  }

  if (!findings.length) return `'${value.slice(0, 80)}' no coincide con ningun IOC conocido.`;
  return findings.join("\n");
}

function addIoc(iocType, pattern, description) {
  const iocs = loadIocs();
  if (!Object.keys(iocs).length) return "No se pudo cargar centinel_iocs.json.";

  if (iocType === "malicious_domain") {
    const target = ((iocs.malicious_domains = iocs.malicious_domains || {}).exact = iocs.malicious_domains.exact || []);
    if (target.includes(pattern)) return `'${pattern}' ya existe en malicious_domains.exact.`;
    target.push(pattern);
  } else if (iocType === "exfiltration_service") {
    iocs.exfiltration_services = iocs.exfiltration_services || [];
    if (iocs.exfiltration_services.includes(pattern)) return `'${pattern}' ya existe en exfiltration_services.`;
    iocs.exfiltration_services.push(pattern);
  } else if (iocType === "prompt_injection") {
    iocs.prompt_injection_patterns = iocs.prompt_injection_patterns || [];
    if (iocs.prompt_injection_patterns.includes(pattern)) return `'${pattern}' ya existe en prompt_injection_patterns.`;
    iocs.prompt_injection_patterns.push(pattern);
  } else if (iocType.startsWith("dangerous_pattern:")) {
    const category = iocType.split(":")[1];
    const cat = ((iocs.dangerous_command_patterns = iocs.dangerous_command_patterns || {})[category] = iocs.dangerous_command_patterns[category] || []);
    if (cat.includes(pattern)) return `'${pattern}' ya existe en dangerous_command_patterns.${category}.`;
    cat.push(pattern);
  } else {
    return `Tipo desconocido: '${iocType}'. Validos: malicious_domain, exfiltration_service, prompt_injection, dangerous_pattern:<categoria>`;
  }

  const today = new Date().toISOString().slice(0, 10);
  (iocs._version_history = iocs._version_history || []).push({ date: today, type: iocType, pattern, description });
  iocs._updated = today;

  return saveIocs(iocs) ? `IOC anadido: [${iocType}] '${pattern}' - ${description}` : "Error al guardar centinel_iocs.json.";
}

function iocStats() {
  const iocs = loadIocs();
  if (!Object.keys(iocs).length) return "No se pudo cargar centinel_iocs.json.";

  const paths  = iocs.sensitive_paths || {};
  const envs   = iocs.sensitive_env_vars || {};
  const mal    = iocs.malicious_domains || {};
  const cmds   = iocs.dangerous_command_patterns || {};
  const total  = Object.values(cmds).reduce((a, v) => a + v.length, 0);
  const hist   = (iocs._version_history || []).slice(-3);

  const lines = [
    `Estado de centinel_iocs.json`,
    `  Version: ${iocs._version || "-"} | Actualizado: ${iocs._updated || "-"}`,
    ``,
    `Categorias:`,
    `  * Rutas sensibles: ${(paths.exact || []).length} exactas, ${(paths.patterns || []).length} patrones`,
    `  * Variables de entorno: ${(envs.exact || []).length} exactas, ${(envs.patterns || []).length} patrones`,
    `  * Dominios maliciosos: ${(mal.exact || []).length} exactos, ${(mal.suspicious_tlds || []).length} TLDs`,
    `  * Servicios de exfiltracion: ${(iocs.exfiltration_services || []).length}`,
    `  * Patrones de comandos peligrosos: ${total} en ${Object.keys(cmds).length} categorias`,
    `  * Patrones de prompt injection: ${(iocs.prompt_injection_patterns || []).length}`,
  ];
  if (hist.length) {
    lines.push(`\nUltimas actualizaciones:`);
    for (const e of hist) lines.push(`  * ${e.date} [${e.type}] ${e.pattern}`);
  }
  return lines.join("\n");
}

// --- Definiciones de herramientas MCP ---

const TOOLS = [
  {
    name: "scan_package",
    description: "Consulta OSV.dev para buscar vulnerabilidades conocidas de un paquete. Usar antes de instalar cualquier dependencia nueva.",
    inputSchema: {
      type: "object",
      properties: {
        name:      { type: "string", description: "Nombre del paquete" },
        ecosystem: { type: "string", description: "Ecosistema: npm, pypi, go, cargo, gems, maven, nuget, composer, dart" },
      },
      required: ["name", "ecosystem"],
    },
  },
  {
    name: "check_ioc",
    description: "Comprueba si un valor (URL, dominio, comando) coincide con algun IOC de la base de datos local.",
    inputSchema: {
      type: "object",
      properties: { value: { type: "string", description: "Valor a comprobar" } },
      required: ["value"],
    },
  },
  {
    name: "add_ioc",
    description: "Anade un nuevo IOC a la base de datos local centinel_iocs.json.",
    inputSchema: {
      type: "object",
      properties: {
        ioc_type:    { type: "string", description: "Tipo: malicious_domain, exfiltration_service, prompt_injection, dangerous_pattern:<categoria>" },
        pattern:     { type: "string", description: "Patron a anadir (string exacto o regex)" },
        description: { type: "string", description: "Por que es un IOC" },
      },
      required: ["ioc_type", "pattern", "description"],
    },
  },
  {
    name: "ioc_stats",
    description: "Muestra estadisticas del estado actual de la base de IOCs.",
    inputSchema: { type: "object", properties: {} },
  },
];

// --- Servidor MCP (JSON-RPC sobre stdio) ---

async function handleMessage(msg) {
  const { id, method, params = {} } = msg;

  if (method === "initialize") {
    return {
      jsonrpc: "2.0", id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "centinel", version: "1.0.0" },
      },
    };
  }

  if (method === "initialized") return null;

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }

  if (method === "tools/call") {
    const { name, arguments: args = {} } = params;
    let text;
    try {
      if      (name === "scan_package") text = await scanPackage(args.name, args.ecosystem);
      else if (name === "check_ioc")   text = checkIoc(args.value);
      else if (name === "add_ioc")     text = addIoc(args.ioc_type, args.pattern, args.description);
      else if (name === "ioc_stats")   text = iocStats();
      else                             text = `Herramienta desconocida: ${name}`;
    } catch (e) {
      text = `Error interno en centinel-server: ${e.message}`;
    }
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } };
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } };
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try { msg = JSON.parse(trimmed); } catch { return; }

  handleMessage(msg).then((response) => {
    if (response !== null && response !== undefined) {
      process.stdout.write(JSON.stringify(response) + "\n");
    }
  }).catch(() => {});
});
