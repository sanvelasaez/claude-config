#!/usr/bin/env node
/**
 * install.js — Entry point del instalador de configuración global de Claude Code.
 *
 * Invocado por: npx github:sanvelasaez/claude-config [--check] [--force]
 *
 * Cuando npm descarga el paquete de GitHub, todos los archivos del repo ya están
 * disponibles localmente en __dirname/../, así que solo necesitamos copiarlos
 * a ~/.claude/ sin ninguna descarga adicional.
 */

"use strict";

const fs      = require("fs");
const path    = require("path");
const os      = require("os");
const { spawnSync } = require("child_process");

const ROOT       = path.join(__dirname, "..");
const CLAUDE_DIR = path.join(os.homedir(), ".claude");

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

// --- Salida ---
const ok   = (m) => console.log(`  [OK]   ${m}`);
const warn = (m) => console.log(`  [WARN] ${m}`);
const err  = (m) => console.log(`  [ERR]  ${m}`);
const info = (m) => console.log(`         ${m}`);
const sep  = ()  => console.log();

// --- Argumentos ---
const args  = process.argv.slice(2);
const force = args.includes("--force");
const check = args.includes("--check");

// --- Comprobaciones ---

function checkNodeVersion() {
  const [major] = process.versions.node.split(".").map(Number);
  if (major >= 18) {
    ok(`Node.js ${process.versions.node} (requerido >= 18)`);
    return true;
  }
  err(`Node.js ${process.versions.node} es demasiado antiguo. Se necesita >= 18`);
  return false;
}

function checkClaudeCode() {
  const result = spawnSync(process.platform === "win32" ? "where" : "which", ["claude"], { encoding: "utf8" });
  if (result.status === 0) {
    ok("Claude Code — encontrado en PATH");
    return true;
  }
  warn("Claude Code — NO encontrado. Instalar: npm install -g @anthropic-ai/claude-code");
  return false;
}

function checkGit() {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", ["git"], { encoding: "utf8" });
  if (r.status === 0) ok("Git — encontrado en PATH");
  else warn("Git — NO encontrado. Requerido para git-workflow.md");
}

// --- Copia de archivos ---

function copyItem(src, dst) {
  if (fs.existsSync(dst) && !force) return "skipped";
  const action = fs.existsSync(dst) ? "updated" : "copied";
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
    copyDir(src, dst);
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
  return action;
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dst, entry);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function installFiles() {
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  const stats = { copied: 0, updated: 0, skipped: 0, errors: 0 };

  for (const item of COPY_ITEMS) {
    const src = path.join(ROOT, item);
    const dst = path.join(CLAUDE_DIR, item);
    if (!fs.existsSync(src)) {
      warn(`No encontrado en el paquete: ${item} — omitiendo`);
      stats.errors++;
      continue;
    }
    try {
      const action = copyItem(src, dst);
      stats[action]++;
      const label = { copied: "NUEVO    ", updated: "ACT.     ", skipped: "EXISTENTE" }[action];
      info(`[${label}] ${item}  →  ${dst}`);
    } catch (e) {
      err(`Error copiando ${item}: ${e.message}`);
      stats.errors++;
    }
  }
  return stats;
}

// --- Configuración MCP en ~/.claude.json ---

function configureMcp() {
  const claudeJson = path.join(os.homedir(), ".claude.json");
  const serverPath = path.join(CLAUDE_DIR, "mcps", "centinel-server.js");

  let config = {};
  if (fs.existsSync(claudeJson)) {
    try { config = JSON.parse(fs.readFileSync(claudeJson, "utf8")); }
    catch { warn("~/.claude.json existe pero no es JSON válido — se deja sin modificar"); return; }
  }

  config.mcpServers = config.mcpServers || {};
  if (config.mcpServers.centinel) {
    ok("MCP centinel — ya configurado en ~/.claude.json");
    return;
  }

  config.mcpServers.centinel = { command: "node", args: [serverPath] };
  try {
    fs.writeFileSync(claudeJson, JSON.stringify(config, null, 2), "utf8");
    ok(`MCP centinel — añadido a ~/.claude.json`);
  } catch (e) {
    warn(`No se pudo escribir ~/.claude.json: ${e.message}`);
    info(`Añadir manualmente: { "mcpServers": { "centinel": { "command": "node", "args": ["${serverPath}"] } } }`);
  }
}

// --- Permisos (Unix) ---

function setHookPermissions() {
  if (process.platform === "win32") return;
  const hook = path.join(CLAUDE_DIR, "hooks", "centinel_preflight.js");
  if (fs.existsSync(hook)) {
    fs.chmodSync(hook, fs.statSync(hook).mode | 0o111);
    ok("Permisos de ejecucion en hooks/centinel_preflight.js");
  }
}

// --- Verificacion del hook ---

function verifyHook() {
  const hook = path.join(CLAUDE_DIR, "hooks", "centinel_preflight.js");
  if (!fs.existsSync(hook)) {
    warn("Hook no instalado — saltando verificacion");
    return false;
  }

  let r = spawnSync("node", [hook], {
    env: { ...process.env, CLAUDE_TOOL_INPUT: '{"command": "git status"}' },
    encoding: "utf8",
  });
  if (r.status !== 0) {
    err(`Hook fallo con comando seguro (exit=${r.status}): ${(r.stdout || "").trim()}`);
    return false;
  }
  ok("Hook centinel_preflight.js — comando seguro pasa correctamente");

  r = spawnSync("node", [hook], {
    env: { ...process.env, CLAUDE_TOOL_INPUT: '{"command": "rm -rf /"}' },
    encoding: "utf8",
  });
  if (r.status === 1) {
    ok("Hook centinel_preflight.js — bloquea comandos destructivos correctamente");
    return true;
  }
  err(`Hook NO bloqueo 'rm -rf /' (exit=${r.status}). Revisar instalacion.`);
  return false;
}

// --- Verificacion de archivos (--check) ---

function checkFilesOnly() {
  console.log(`Archivos en ${CLAUDE_DIR}:`);
  for (const item of COPY_ITEMS) {
    const dst  = path.join(CLAUDE_DIR, item);
    const stat = fs.existsSync(dst) ? "OK   " : "FALTA";
    console.log(`  [${stat}] ${dst}`);
  }
}

// --- Pasos siguientes ---

function printNextSteps() {
  sep();
  console.log("=== LISTO ===");
  sep();
  console.log("1. Iniciar Claude Code — los hooks y el MCP centinel ya estan activos:");
  console.log("   claude");
  sep();
  console.log("2. Para actualizar en el futuro:");
  console.log("   npx --yes github:sanvelasaez/claude-config");
  console.log("   (o desde Claude Code: /setup)");
  sep();
  console.log("3. Para activar el flujo Git en un proyecto, añadir a .claude/CLAUDE.md:");
  console.log("   @~/.claude/git-workflow.md");
  sep();
}

// --- Main ---

const mode = check ? "VERIFICACION" : (force ? "INSTALACION FORZADA" : "INSTALACION");
console.log(`=== INSTALADOR CLAUDE CODE CONFIG — ${mode} ===`);
sep();

console.log("1. REQUISITOS DE SISTEMA");
if (!checkNodeVersion()) process.exit(1);
checkClaudeCode();
checkGit();
sep();

if (check) {
  console.log("2. ARCHIVOS EN ~/.claude/");
  checkFilesOnly();
  sep();
  console.log("Modo --check completado. Para instalar: npx github:sanvelasaez/claude-config");
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

console.log("5. VERIFICACION DEL HOOK");
verifyHook();
sep();

printNextSteps();

if (stats.errors > 0) {
  warn(`${stats.errors} error(es) durante la instalacion. Revisar output arriba.`);
  process.exit(1);
}
console.log("=== INSTALACION COMPLETADA ===");
