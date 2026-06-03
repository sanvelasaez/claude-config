"use strict";

const fs = require("fs");
const path = require("path");
const { ROOT, CLAUDE_DIR, COPY_ITEMS, EXTERNAL_SKILLS, force, readJson } = require("./config");
const { ok, warn, err, info } = require("./ui");
const { getPythonCmd } = require("./system");

function copyItem(src, dst) {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    let algoCambiado = false;
    for (const entry of fs.readdirSync(src)) {
      const resultado = copyItem(path.join(src, entry), path.join(dst, entry));
      if (resultado !== "skipped") algoCambiado = true;
    }
    return algoCambiado ? "updated" : "skipped";
  }
  if (fs.existsSync(dst) && !force) return "skipped";
  const accion = fs.existsSync(dst) ? "updated" : "copied";
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return accion;
}

function installFiles() {
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  const stats = { copied: 0, updated: 0, skipped: 0, errors: 0 };
  for (const item of COPY_ITEMS) {
    const src = path.join(ROOT, item);
    const dst = path.join(CLAUDE_DIR, item);
    if (!fs.existsSync(src)) {
      warn(`No encontrado en el paquete: ${item}`);
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

function backupSettings() {
  const dst = path.join(CLAUDE_DIR, "settings.json");
  const bak = path.join(CLAUDE_DIR, "settings.json.old");
  if (!fs.existsSync(dst)) return;
  if (fs.existsSync(bak)) fs.rmSync(bak);
  fs.renameSync(dst, bak);
  ok("settings.json existente guardado como settings.json.old");
}

function fixPythonCommandInSettings(pythonCmdHint) {
  const settingsPath = path.join(CLAUDE_DIR, "settings.json");
  if (!fs.existsSync(settingsPath)) return;
  const pyCmd = pythonCmdHint || getPythonCmd()?.cmd;
  if (!pyCmd || pyCmd === "python") return;

  // pyCmd is "python3" — check if plain "python" also works as Python 3
  const { spawnSync } = require("child_process");
  const r = spawnSync("python", ["--version"], { encoding: "utf8" });
  const pythonWorks = r.status === 0 && /Python 3\./.test((r.stdout || r.stderr || "").trim());
  if (pythonWorks) return;

  // Only "python3" works — patch hook command strings (not the allow list)
  try {
    let content = fs.readFileSync(settingsPath, "utf8");
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
    const updated = content.replace(/"python (~\/\.claude\/hooks\/[^"]+)"/g, '"python3 $1"');
    if (updated === content) return;
    fs.writeFileSync(settingsPath, updated, "utf8");
    ok(`settings.json — hook ajustado a 'python3'`);
  } catch (e) {
    warn(`No se pudo ajustar el comando python en settings.json: ${e.message}`);
  }
}

function getAllFilesRelative(dir) {
  const files = [];
  const walk = (current, rel) => {
    for (const entry of fs.readdirSync(current)) {
      const full = path.join(current, entry);
      const relPath = rel ? path.join(rel, entry) : entry;
      try {
        if (fs.statSync(full).isDirectory()) walk(full, relPath);
        else files.push(relPath);
      } catch (_) {
        // broken symlink/junction — skip silently
      }
    }
  };
  walk(dir, "");
  return files;
}

// Builds a set of "<section>/<relpath>" (OS separators) for every file deployed
// by any installed plugin. Two complementary sources:
//   Source 1 — installed_plugins.json: authoritative; covers any managed dir.
//   Source 2 — settings.json hook commands: fallback for broken symlinks or hooks
//              deployed before the plugin cache tracked install paths.
function getPluginManagedFiles() {
  const managed = new Set();

  try {
    const pluginsJson = path.join(CLAUDE_DIR, "plugins", "installed_plugins.json");
    const ip = readJson(pluginsJson);
    for (const entries of Object.values(ip.plugins || {})) {
      for (const entry of (Array.isArray(entries) ? entries : [])) {
        const installPath = entry.installPath;
        if (!installPath) continue;
        for (const section of COPY_ITEMS) {
          const pluginSection = path.join(installPath, section);
          try {
            if (!fs.statSync(pluginSection).isDirectory()) continue;
          } catch { continue; }
          for (const f of getAllFilesRelative(pluginSection)) {
            managed.add(path.join(section, f));
          }
        }
      }
    }
  } catch {}

  try {
    const s = readJson(path.join(CLAUDE_DIR, "settings.json"));
    for (const event of Object.values(s.hooks || {})) {
      for (const matcher of (Array.isArray(event) ? event : [])) {
        for (const hook of (matcher.hooks || [])) {
          const cmd = hook.command || "";
          const matches = cmd.match(/hooks[/\\]([\w.-]+)/g) || [];
          for (const m of matches) managed.add(path.join("hooks", path.basename(m)));
        }
      }
    }
  } catch {}

  return managed;
}

function checkObsoleteFiles() {
  const externalSkillNames = new Set(EXTERNAL_SKILLS.map((s) => s.name));
  const pluginFiles = getPluginManagedFiles();
  const obsoletos = [];
  for (const item of COPY_ITEMS) {
    const repoSrc = path.join(ROOT, item);
    const claudeDst = path.join(CLAUDE_DIR, item);
    if (!fs.existsSync(repoSrc) || !fs.existsSync(claudeDst)) continue;
    if (!fs.statSync(repoSrc).isDirectory()) continue;
    const repoFiles = new Set(getAllFilesRelative(repoSrc));
    for (const f of getAllFilesRelative(claudeDst)) {
      if (item === "skills" && externalSkillNames.has(f.split(path.sep)[0])) continue;
      if (pluginFiles.has(path.join(item, f))) continue;
      if (!repoFiles.has(f)) obsoletos.push({ seccion: item, archivo: f });
    }
  }
  return obsoletos;
}

module.exports = {
  copyItem, installFiles, backupSettings,
  fixPythonCommandInSettings, getAllFilesRelative,
  checkObsoleteFiles,
};
