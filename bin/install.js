#!/usr/bin/env node
/**
 * install.js — Instalador y verificador de la configuración global de Claude Code.
 *
 * Uso:
 *   npx github:sanvelasaez/claude-config           → instala y verifica
 *   npx github:sanvelasaez/claude-config --force   → actualiza archivos existentes y verifica
 *   npx github:sanvelasaez/claude-config --check   → solo verifica sin instalar nada
 */

"use strict";

const fs  = require("fs");
const path = require("path");
const os  = require("os");
const { spawnSync } = require("child_process");

const ROOT       = path.join(__dirname, "..");
const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const CLAUDE_JSON = path.join(os.homedir(), ".claude.json");

const COPY_ITEMS = [
  "CLAUDE.md",
  "settings.json",
  "SKILL-REGISTRY.md",
  "git-workflow.md",
  "agent-coordination.md",
  "skills",
  "agents",
  "hooks",
  "mcps",
  "commands",
];

// ── Salida ────────────────────────────────────────────────────────────────────
const ok   = (m) => console.log(`  [OK]   ${m}`);
const warn = (m) => console.log(`  [WARN] ${m}`);
const err  = (m) => console.log(`  [ERR]  ${m}`);
const info = (m) => console.log(`         ${m}`);
const sep  = ()  => console.log();

// ── Argumentos ────────────────────────────────────────────────────────────────
const args  = process.argv.slice(2);
const force = args.includes("--force");
const check = args.includes("--check");

// ── Requisitos de sistema ─────────────────────────────────────────────────────

function checkNodeVersion() {
  const [major] = process.versions.node.split(".").map(Number);
  if (major >= 18) { ok(`Node.js ${process.versions.node} (requerido >= 18)`); return true; }
  err(`Node.js ${process.versions.node} demasiado antiguo. Se necesita >= 18`);
  return false;
}

function checkClaudeCode() {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", ["claude"], { encoding: "utf8" });
  if (r.status === 0) ok("Claude Code — encontrado en PATH");
  else warn("Claude Code — NO encontrado. Instalar: npm install -g @anthropic-ai/claude-code");
}

function checkGit() {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", ["git"], { encoding: "utf8" });
  if (r.status === 0) ok("Git — encontrado en PATH");
  else warn("Git — NO encontrado (opcional, requerido para git-workflow.md)");
}

// ── Copia de archivos ─────────────────────────────────────────────────────────

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dst, entry);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function copyItem(src, dst) {
  if (fs.existsSync(dst) && !force) return "skipped";
  const action = fs.existsSync(dst) ? "updated" : "copied";
  if (fs.statSync(src).isDirectory()) {
    if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
    copyDir(src, dst);
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
  return action;
}

function installFiles() {
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  const stats = { copied: 0, updated: 0, skipped: 0, errors: 0 };
  for (const item of COPY_ITEMS) {
    const src = path.join(ROOT, item);
    const dst = path.join(CLAUDE_DIR, item);
    if (!fs.existsSync(src)) { warn(`No encontrado en el paquete: ${item}`); stats.errors++; continue; }
    try {
      const action = copyItem(src, dst);
      stats[action]++;
      const label = { copied: "NUEVO    ", updated: "ACT.     ", skipped: "EXISTENTE" }[action];
      info(`[${label}] ${item}  →  ${dst}`);
    } catch (e) { err(`Error copiando ${item}: ${e.message}`); stats.errors++; }
  }
  return stats;
}

// ── Configuración MCP en ~/.claude.json ───────────────────────────────────────

function configureMcp() {
  const serverPath = path.join(CLAUDE_DIR, "mcps", "centinel-server.js");
  let config = {};
  if (fs.existsSync(CLAUDE_JSON)) {
    try { config = JSON.parse(fs.readFileSync(CLAUDE_JSON, "utf8")); }
    catch { warn("~/.claude.json no es JSON válido — se deja sin modificar"); return; }
  }
  config.mcpServers = config.mcpServers || {};
  if (config.mcpServers.centinel) { ok("MCP centinel — ya configurado en ~/.claude.json"); return; }
  config.mcpServers.centinel = { command: "node", args: [serverPath] };
  try {
    fs.writeFileSync(CLAUDE_JSON, JSON.stringify(config, null, 2), "utf8");
    ok("MCP centinel — añadido a ~/.claude.json");
  } catch (e) {
    warn(`No se pudo escribir ~/.claude.json: ${e.message}`);
  }
}

// ── Permisos Unix ─────────────────────────────────────────────────────────────

function setHookPermissions() {
  if (process.platform === "win32") return;
  const hook = path.join(CLAUDE_DIR, "hooks", "centinel_preflight.js");
  if (fs.existsSync(hook)) {
    fs.chmodSync(hook, fs.statSync(hook).mode | 0o111);
    ok("Permisos de ejecución en hooks/centinel_preflight.js");
  }
}

// ── Verificaciones ────────────────────────────────────────────────────────────

/** 1. Todos los archivos instalados en ~/.claude/ */
function checkFiles() {
  let allPresent = true;
  for (const item of COPY_ITEMS) {
    const p = path.join(CLAUDE_DIR, item);
    if (fs.existsSync(p)) ok(`${item}`);
    else { err(`Falta: ${item}`); allPresent = false; }
  }
  return allPresent;
}

/** 2. settings.json contiene el hook centinel */
function checkSettingsJson() {
  const settingsPath = path.join(CLAUDE_DIR, "settings.json");
  try {
    const s = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    const preHooks = (s.hooks || {}).PreToolUse || [];
    const hasHook = preHooks.some((h) =>
      (h.hooks || []).some((hh) => (hh.command || "").includes("centinel_preflight.js"))
    );
    if (hasHook) { ok("settings.json — hook centinel_preflight.js configurado"); return true; }
    err("settings.json — no contiene el hook centinel_preflight.js");
    return false;
  } catch (e) {
    err(`settings.json — no encontrado o JSON inválido: ${e.message}`);
    return false;
  }
}

/** 3. ~/.claude.json tiene mcpServers.centinel */
function checkClaudeJson() {
  try {
    const config = JSON.parse(fs.readFileSync(CLAUDE_JSON, "utf8"));
    if (config.mcpServers && config.mcpServers.centinel) {
      ok("~/.claude.json — mcpServers.centinel configurado");
      return true;
    }
    err("~/.claude.json — no contiene mcpServers.centinel");
    return false;
  } catch {
    err("~/.claude.json — no encontrado o JSON inválido");
    return false;
  }
}

/** 4. Hook bloquea lo peligroso y deja pasar lo seguro */
function checkHook() {
  const hook = path.join(CLAUDE_DIR, "hooks", "centinel_preflight.js");
  if (!fs.existsSync(hook)) { err("hooks/centinel_preflight.js — no instalado"); return false; }

  let r = spawnSync("node", [hook], {
    env: { ...process.env, CLAUDE_TOOL_INPUT: '{"command":"git status"}' },
    encoding: "utf8",
  });
  if (r.status !== 0) {
    err(`Hook — fallo con comando seguro (exit=${r.status}): ${(r.stdout || "").trim()}`);
    return false;
  }
  ok("Hook — comando seguro (git status) pasa correctamente");

  r = spawnSync("node", [hook], {
    env: { ...process.env, CLAUDE_TOOL_INPUT: '{"command":"rm -rf /"}' },
    encoding: "utf8",
  });
  if (r.status === 1) { ok("Hook — bloquea comandos destructivos (rm -rf /)"); }
  else { err(`Hook — NO bloqueó 'rm -rf /' (exit=${r.status})`); return false; }

  r = spawnSync("node", [hook], {
    env: { ...process.env, CLAUDE_TOOL_INPUT: '{"url":"https://pastebin.com/abc"}' },
    encoding: "utf8",
  });
  if (r.status === 1) { ok("Hook — bloquea URLs de exfiltración (pastebin.com)"); }
  else { warn("Hook — no bloqueó URL de exfiltración (puede ser intencional si pastebin está en allowlist)"); }

  r = spawnSync("node", [hook], {
    env: { ...process.env, CLAUDE_TOOL_INPUT: '{"url":"https://api.github.com/repos"}' },
    encoding: "utf8",
  });
  if (r.status === 0) { ok("Hook — permite URLs de la allowlist (api.github.com)"); return true; }
  err("Hook — bloqueó URL de allowlist (api.github.com), revisar configuración");
  return false;
}

/** 5. MCP server arranca y responde al protocolo MCP */
function checkMcpServer() {
  const serverPath = path.join(CLAUDE_DIR, "mcps", "centinel-server.js");
  if (!fs.existsSync(serverPath)) { err("mcps/centinel-server.js — no instalado"); return false; }

  const initMsg = JSON.stringify({
    jsonrpc: "2.0", id: 1, method: "initialize",
    params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "verifier", version: "1.0" } },
  });

  const r = spawnSync("node", [serverPath], {
    input: initMsg + "\n",
    encoding: "utf8",
    timeout: 5000,
  });

  try {
    const firstLine = (r.stdout || "").trim().split("\n")[0];
    const resp = JSON.parse(firstLine);
    if (resp.result && resp.result.serverInfo && resp.result.serverInfo.name === "centinel") {
      ok("MCP server — responde al protocolo MCP (initialize OK)");

      // Verificar que tools/list devuelve las 4 herramientas esperadas
      const listMsg = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
      const r2 = spawnSync("node", [serverPath], {
        input: initMsg + "\n" + listMsg + "\n",
        encoding: "utf8",
        timeout: 5000,
      });
      const lines = (r2.stdout || "").trim().split("\n").filter(Boolean);
      const listResp = JSON.parse(lines[lines.length - 1]);
      const tools = (listResp.result || {}).tools || [];
      const expected = ["scan_package", "check_ioc", "add_ioc", "ioc_stats"];
      const found = expected.filter((t) => tools.some((tool) => tool.name === t));
      if (found.length === expected.length) {
        ok(`MCP server — expone las ${expected.length} herramientas: ${expected.join(", ")}`);
      } else {
        warn(`MCP server — faltan herramientas: ${expected.filter((t) => !found.includes(t)).join(", ")}`);
      }
      return true;
    }
  } catch { /* fall through */ }

  err("MCP server — no responde o respuesta inesperada");
  return false;
}

/** Ejecuta todas las verificaciones y devuelve true si todo está OK */
function runChecks() {
  let allOk = true;

  console.log("  Archivos en ~/.claude/");
  allOk = checkFiles() && allOk;
  sep();

  console.log("  Configuración");
  allOk = checkSettingsJson() && allOk;
  allOk = checkClaudeJson() && allOk;
  sep();

  console.log("  Hook centinel_preflight.js");
  allOk = checkHook() && allOk;
  sep();

  console.log("  MCP centinel-server.js");
  allOk = checkMcpServer() && allOk;
  sep();

  return allOk;
}

// ── Pasos siguientes ──────────────────────────────────────────────────────────

function printNextSteps() {
  console.log("=== LISTO ===");
  sep();
  console.log("Iniciar Claude Code — los hooks y el MCP centinel ya están activos:");
  console.log("  claude");
  sep();
  console.log("Para actualizar en el futuro:");
  console.log("  npx --yes github:sanvelasaez/claude-config");
  console.log("  (o desde Claude Code: /setup)");
  sep();
  console.log("Para verificar el estado de la instalación en cualquier momento:");
  console.log("  npx github:sanvelasaez/claude-config --check");
  sep();
}

// ── Main ──────────────────────────────────────────────────────────────────────

const mode = check ? "VERIFICACION" : (force ? "INSTALACION FORZADA" : "INSTALACION");
console.log(`=== CLAUDE CODE CONFIG — ${mode} ===`);
sep();

console.log("1. REQUISITOS DE SISTEMA");
if (!checkNodeVersion()) process.exit(1);
checkClaudeCode();
checkGit();
sep();

if (check) {
  console.log("2. COMPROBACIONES DE INSTALACION");
  const ok2 = runChecks();
  if (ok2) {
    console.log("Todo correcto. La instalacion esta completa y funcional.");
  } else {
    console.log("Hay problemas con la instalacion. Ejecutar sin --check para reinstalar:");
    console.log("  npx --yes github:sanvelasaez/claude-config");
    process.exit(1);
  }
  process.exit(0);
}

console.log(`2. ARCHIVOS → ${CLAUDE_DIR}`);
if (!force) info("Los archivos existentes NO se sobreescriben (usa --force para actualizar)");
const stats = installFiles();
sep();
info(`Resumen: ${stats.copied} nuevos, ${stats.updated} actualizados, ${stats.skipped} omitidos, ${stats.errors} errores`);
sep();

console.log("3. MCP CENTINEL");
configureMcp();
sep();

console.log("4. PERMISOS");
setHookPermissions();
sep();

console.log("5. VERIFICACION FINAL");
const installOk = runChecks();

if (!installOk || stats.errors > 0) {
  warn("La instalacion completó con errores. Revisar output arriba.");
  process.exit(1);
}

printNextSteps();
console.log("=== INSTALACION COMPLETADA ===");
