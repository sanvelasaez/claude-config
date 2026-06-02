"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { CLAUDE_DIR, COPY_ITEMS, EXTERNAL_SKILLS, PLUGINS, readJson } = require("./config");
const { ok, warn, err, info, sep } = require("./ui");
const { checkPython, getPythonCmd } = require("./system");
const { isSkillInstalled } = require("./skills");
const { getInstalledPlugins, parseInstalledPluginIds } = require("./plugins");
const { checkObsoleteFiles } = require("./files");

function checkFiles() {
  let allPresent = true;
  for (const item of COPY_ITEMS) {
    const p = path.join(CLAUDE_DIR, item);
    if (fs.existsSync(p)) ok(`${item}`);
    else {
      err(`Falta: ${item}`);
      allPresent = false;
    }
  }
  return allPresent;
}

function checkSettingsJson() {
  const settingsPath = path.join(CLAUDE_DIR, "settings.json");
  try {
    const s = readJson(settingsPath);
    const todasEntradas = Object.values(s.hooks || {}).flat();
    const tieneHook = todasEntradas.some((h) =>
      (h.hooks || []).some((hh) => (hh.command || "").includes("centinel_preflight")),
    );
    if (tieneHook) {
      ok("settings.json — hook centinel_preflight configurado");
      return true;
    }
    err("settings.json — no contiene el hook centinel_preflight");
    return false;
  } catch (e) {
    err(`settings.json — no encontrado o JSON inválido: ${e.message}`);
    return false;
  }
}

function checkMcpConfig() {
  const r = spawnSync("claude", ["mcp", "list"], { shell: true, encoding: "utf8" });
  const output = (r.stdout || "") + (r.stderr || "");
  if (output.includes("centinel")) {
    ok("MCP centinel — configurado (claude mcp list)");
    return true;
  }
  err("MCP centinel — no encontrado en claude mcp list");
  return false;
}

function checkHook(pythonCmdHint) {
  const hook = path.join(CLAUDE_DIR, "hooks", "centinel_preflight.py");
  if (!fs.existsSync(hook)) {
    err("hooks/centinel_preflight.py — no instalado");
    return false;
  }

  const pyCmd = pythonCmdHint || getPythonCmd()?.cmd;
  if (!pyCmd) {
    warn("Python no encontrado — hook instalado pero sin verificar (instalar Python para activarlo)");
    return true;
  }

  let r = spawnSync(pyCmd, [hook], {
    env: { ...process.env, CLAUDE_TOOL_INPUT: '{"command":"git status"}' },
    encoding: "utf8",
  });
  if (r.error && r.error.code === "ENOENT") {
    warn(`Hook instalado — Python '${pyCmd}' aún no en PATH, reiniciar terminal para activarlo`);
    return true;
  }
  if (r.status !== 0) {
    err(`Hook — fallo con comando seguro (exit=${r.status}): ${(r.stdout || "").trim()}`);
    return false;
  }
  ok("Hook — comando seguro (git status) pasa correctamente");

  r = spawnSync(pyCmd, [hook], {
    env: { ...process.env, CLAUDE_TOOL_INPUT: '{"command":"rm -rf /"}' },
    encoding: "utf8",
  });
  if (r.status === 1) {
    ok("Hook — bloquea comandos destructivos (rm -rf /)");
  } else {
    err(`Hook — NO bloqueó 'rm -rf /' (exit=${r.status})`);
    return false;
  }

  r = spawnSync(pyCmd, [hook], {
    env: { ...process.env, CLAUDE_TOOL_INPUT: '{"url":"https://pastebin.com/abc"}' },
    encoding: "utf8",
  });
  if (r.status === 1) {
    ok("Hook — bloquea URLs de exfiltración (pastebin.com)");
  } else {
    warn("Hook — no bloqueó URL de exfiltración (puede ser intencional si pastebin está en allowlist)");
  }

  r = spawnSync(pyCmd, [hook], {
    env: { ...process.env, CLAUDE_TOOL_INPUT: '{"url":"https://api.github.com/repos"}' },
    encoding: "utf8",
  });
  if (r.status === 0) {
    ok("Hook — permite URLs de la allowlist (api.github.com)");
    return true;
  }
  err("Hook — bloqueó URL de allowlist (api.github.com), revisar configuración");
  return false;
}

function checkMcpServer(pythonCmdHint) {
  const serverPath = path.join(CLAUDE_DIR, "mcps", "centinel-server.py");
  if (!fs.existsSync(serverPath)) {
    err("mcps/centinel-server.py — no instalado");
    return false;
  }

  const pyCmd = pythonCmdHint || getPythonCmd()?.cmd;
  if (!pyCmd) {
    warn("Python no encontrado — MCP server instalado pero sin verificar");
    return true;
  }

  const initMsg = JSON.stringify({
    jsonrpc: "2.0", id: 1, method: "initialize",
    params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "verifier", version: "1.0" } },
  });

  const r = spawnSync(pyCmd, [serverPath], {
    input: initMsg + "\n",
    encoding: "utf8",
    timeout: 5000,
  });

  try {
    const firstLine = (r.stdout || "").trim().split("\n")[0];
    const resp = JSON.parse(firstLine);
    if (resp.result && resp.result.serverInfo && resp.result.serverInfo.name === "centinel") {
      ok("MCP server — responde al protocolo MCP (initialize OK)");

      const listMsg = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
      const r2 = spawnSync(pyCmd, [serverPath], {
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
  } catch {
    /* fall through */
  }

  err("MCP server — no responde o respuesta inesperada");
  return false;
}

function runChecks(pythonCmdHint) {
  let allOk = true;

  console.log("  Dependencias del sistema");
  allOk = checkPython() && allOk;
  sep();

  console.log("  Archivos en ~/.claude/");
  allOk = checkFiles() && allOk;
  sep();

  console.log("  Configuración");
  allOk = checkSettingsJson() && allOk;
  allOk = checkMcpConfig() && allOk;
  sep();

  console.log("  Hook centinel_preflight.py");
  allOk = checkHook(pythonCmdHint) && allOk;
  sep();

  console.log("  MCP centinel-server.py");
  allOk = checkMcpServer(pythonCmdHint) && allOk;
  sep();

  console.log("  Skills externas");
  for (const { name } of EXTERNAL_SKILLS) {
    if (isSkillInstalled(name)) ok(`Skill '${name}'`);
    else warn(`Skill '${name}' — no instalada (ejecutar paso 4 del instalador)`);
  }
  allOk = EXTERNAL_SKILLS.every(({ name }) => isSkillInstalled(name)) && allOk;
  sep();

  console.log("  Plugins instalados");
  const installedPluginsOutput = getInstalledPlugins();
  for (const { name, marketplace } of PLUGINS) {
    if (installedPluginsOutput.includes(`${name}@${marketplace}`)) ok(`Plugin '${name}@${marketplace}'`);
    else {
      warn(`Plugin '${name}' — no instalado`);
      allOk = false;
    }
  }
  const managedIds = new Set(PLUGINS.map(p => `${p.name}@${p.marketplace}`));
  const extras = parseInstalledPluginIds(installedPluginsOutput).filter(id => !managedIds.has(id));
  if (extras.length > 0) {
    warn(`${extras.length} plugin(s) extra no gestionados — se eliminarán al ejecutar el instalador:`);
    for (const id of extras) info(`  ├─ ${id}  →  claude plugin uninstall ${id}`);
  }
  sep();

  console.log("  Archivos obsoletos en ~/.claude/");
  const obsoletos = checkObsoleteFiles();
  if (obsoletos.length === 0) {
    ok("No hay archivos obsoletos");
  } else {
    warn(`${obsoletos.length} archivo(s) ya no están en el repo — pueden eliminarse manualmente:`);
    for (const o of obsoletos) info(`  ├─ ${o.seccion}/${o.archivo}`);
  }
  sep();

  return allOk;
}

module.exports = {
  checkFiles, checkSettingsJson, checkMcpConfig,
  checkHook, checkMcpServer, runChecks,
};
