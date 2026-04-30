#!/usr/bin/env node
/**
 * centinel_preflight.js — Hook de seguridad en tiempo real para Claude Code.
 *
 * Invocado por hooks PreToolUse de settings.json (Bash, Write, Edit, WebFetch).
 * Lee CLAUDE_TOOL_INPUT (JSON), infiere el tipo de operación y aplica las
 * comprobaciones de centinel_iocs.json.
 * Fail-open: cualquier error interno permite la ejecución (exit 0).
 *
 * Uso en settings.json:
 *   "command": "node ~/.claude/hooks/centinel_preflight.js"
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

// --- Carga de IOCs ---

function loadIocs() {
  try {
    const iocPath = path.join(__dirname, "centinel_iocs.json");
    return JSON.parse(fs.readFileSync(iocPath, "utf8"));
  } catch {
    return {};
  }
}

// --- Utilidades ---

function matchesAnyPattern(text, patterns) {
  const lower = text.toLowerCase();
  for (const p of patterns) {
    try {
      if (new RegExp(p, "i").test(lower)) return p;
    } catch {
      if (lower.includes(p.toLowerCase())) return p;
    }
  }
  return null;
}

function containsAny(text, substrings) {
  const lower = text.toLowerCase();
  for (const s of substrings) {
    if (lower.includes(s.toLowerCase())) return s;
  }
  return null;
}

function block(reason) {
  process.stdout.write(`[CENTINEL] BLOQUEADO: ${reason}\n`);
  process.exit(1);
}

function warn(reason) {
  process.stdout.write(`[CENTINEL] ADVERTENCIA: ${reason}\n`);
}

// --- Comprobaciones por tipo de herramienta ---

function checkBash(command, iocs) {
  if (!command) return;

  const hardBlocked = [
    "rm -rf /", "rm -rf ~", "rm -rf $HOME",
    "mkfs", "dd if=", "shred -uz",
    "format c:", "format /q",
    "> /dev/sda", "> /dev/nvme",
  ];
  const found = containsAny(command, hardBlocked);
  if (found) block(`Comando destructivo detectado: '${found}'`);

  const dangerous = iocs.dangerous_command_patterns || {};
  for (const [category, patterns] of Object.entries(dangerous)) {
    const match = matchesAnyPattern(command, patterns);
    if (match) block(`Patron peligroso (${category}): '${match}' en comando`);
  }

  const piPatterns = iocs.prompt_injection_patterns || [];
  const piMatch = matchesAnyPattern(command, piPatterns);
  if (piMatch) warn(`Posible prompt injection en comando: '${piMatch}'`);

  const sensitiveVars = iocs.sensitive_env_vars || {};
  const exactVars = sensitiveVars.exact || [];
  const varPatterns = exactVars.map(v => `\\$${v}|\\$\\{${v}\\}`).concat(sensitiveVars.patterns || []);
  const varMatch = matchesAnyPattern(command, varPatterns);
  const exfilServices = iocs.exfiltration_services || [];
  if (varMatch && exfilServices.some(svc => command.includes(svc))) {
    block(`Posible exfiltracion de variable sensible: '${varMatch}'`);
  }
}

function checkWrite(filePath, content, iocs) {
  if (!filePath) return;

  const sensitive = iocs.sensitive_paths || {};
  const normalized = filePath.replace(/\\/g, "/");
  for (const p of (sensitive.exact || [])) {
    const expanded = p.replace(/^~/, os.homedir()).replace(/\\/g, "/");
    if (normalized === expanded || normalized.startsWith(expanded)) {
      block(`Escritura en ruta sensible bloqueada: '${filePath}'`);
    }
  }

  const pathMatch = matchesAnyPattern(filePath, sensitive.patterns || []);
  if (pathMatch) warn(`Escritura en ruta potencialmente sensible: '${filePath}' (patron: '${pathMatch}')`);

  if (content) {
    const envVars = iocs.sensitive_env_vars || {};
    for (const v of (envVars.exact || [])) {
      if (content.includes(v) && (content.includes("=") || content.includes(":"))) {
        warn(`Posible secret hardcodeado en contenido: '${v}'`);
        break;
      }
    }

    const isClaudeConfig = [".claude", "CLAUDE", "claude"].some(k => filePath.includes(k));
    if (isClaudeConfig) {
      const piMatch = matchesAnyPattern(content, iocs.prompt_injection_patterns || []);
      if (piMatch) block(`Prompt injection detectado en archivo de configuracion Claude: '${piMatch}'`);
    }
  }
}

function checkWebFetch(url, iocs) {
  if (!url) return;

  const allowlist = iocs.allowlist_domains || [];
  if (allowlist.some(d => url.includes(d))) return;

  const exfil = iocs.exfiltration_services || [];
  const exfilMatch = containsAny(url, exfil);
  if (exfilMatch) block(`URL apunta a servicio de exfiltracion conocido: '${exfilMatch}'`);

  const malExact = (iocs.malicious_domains || {}).exact || [];
  const malMatch = containsAny(url, malExact);
  if (malMatch) block(`Dominio malicioso conocido: '${malMatch}'`);

  const suspTlds = (iocs.malicious_domains || {}).suspicious_tlds || [];
  try {
    const hostname = url.includes("://") ? url.split("://")[1].split("/")[0].split("?")[0] : url;
    for (const tld of suspTlds) {
      if (hostname.endsWith(tld)) { warn(`URL con TLD sospechoso: '${tld}' en '${url}'`); break; }
    }
  } catch { /* fail-open */ }
}

// --- Punto de entrada ---

try {
  const raw = process.env.CLAUDE_TOOL_INPUT || "{}";
  let toolInput;
  try { toolInput = JSON.parse(raw); } catch { process.exit(0); }

  const iocs = loadIocs();

  if ("command" in toolInput) {
    checkBash(toolInput.command || "", iocs);
  } else if ("url" in toolInput) {
    checkWebFetch(toolInput.url || "", iocs);
  } else if ("file_path" in toolInput) {
    checkWrite(
      toolInput.file_path || "",
      toolInput.content || toolInput.new_string || "",
      iocs
    );
  }
  process.exit(0);
} catch (e) {
  if (e instanceof SystemExit) throw e;
  process.exit(0); // fail-open en cualquier error interno
}
