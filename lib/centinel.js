"use strict";

const fs = require("fs");
const path = require("path");
const { ROOT, CLAUDE_DIR, CLAUDE_JSON, readJson, writeJson } = require("./config");
const { ok, warn } = require("./ui");
const { getPythonCmd } = require("./system");

function ensureHookInSettings() {
  const settingsPath = path.join(CLAUDE_DIR, "settings.json");
  if (!fs.existsSync(settingsPath)) return;

  let settings;
  try {
    settings = readJson(settingsPath);
  } catch {
    warn("settings.json no es JSON válido — hooks no configurados");
    return;
  }

  const allEntries = Object.values(settings.hooks || {}).flat();
  const tieneCentinel = allEntries.some((h) =>
    (h.hooks || []).some((hh) => (hh.command || "").includes("centinel_preflight")),
  );
  if (tieneCentinel) {
    ok("settings.json — hooks centinel ya presentes");
    return;
  }

  const templatePath = path.join(ROOT, "settings.json");
  let template;
  try {
    template = readJson(templatePath);
  } catch {
    warn("settings.json de plantilla no encontrado — hooks no configurados");
    return;
  }

  settings.hooks = settings.hooks || {};
  for (const [evento, entradas] of Object.entries(template.hooks || {})) {
    settings.hooks[evento] = settings.hooks[evento] || [];
    for (const entrada of entradas) {
      const yaPresente = settings.hooks[evento].some(
        (e) => JSON.stringify(e) === JSON.stringify(entrada),
      );
      if (!yaPresente) settings.hooks[evento].push(entrada);
    }
  }

  try {
    writeJson(settingsPath, settings);
    ok("settings.json — hooks centinel añadidos");
  } catch (e) {
    warn(`No se pudo actualizar settings.json: ${e.message}`);
  }
}

function configureMcp() {
  const serverPath = path.join(CLAUDE_DIR, "mcps", "centinel-server.py");
  const pyCmd = getPythonCmd()?.cmd || "python3";
  let config = {};
  if (fs.existsSync(CLAUDE_JSON)) {
    try {
      config = readJson(CLAUDE_JSON);
    } catch {
      warn("~/.claude.json no es JSON válido — se deja sin modificar");
      return;
    }
  }
  config.mcpServers = config.mcpServers || {};
  if (config.mcpServers.centinel) {
    ok("MCP centinel — ya configurado en ~/.claude.json");
    return;
  }
  config.mcpServers.centinel = { command: pyCmd, args: [serverPath] };
  try {
    writeJson(CLAUDE_JSON, config);
    ok(`MCP centinel — añadido a ~/.claude.json (${pyCmd})`);
  } catch (e) {
    warn(`No se pudo escribir ~/.claude.json: ${e.message}`);
  }
}

function setHookPermissions() {
  if (process.platform === "win32") return;
  for (const f of ["hooks/centinel_preflight.py", "mcps/centinel-server.py"]) {
    const p = path.join(CLAUDE_DIR, f);
    if (fs.existsSync(p)) fs.chmodSync(p, fs.statSync(p).mode | 0o111);
  }
  ok("Permisos de ejecución en centinel_preflight.py y centinel-server.py");
}

module.exports = { ensureHookInSettings, configureMcp, setHookPermissions };
