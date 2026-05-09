"use strict";

const fs = require("fs");
const path = require("path");
const { ROOT, CLAUDE_DIR, COPY_ITEMS, force } = require("./config");
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

function fixPythonCommandInSettings() {
  const settingsPath = path.join(CLAUDE_DIR, "settings.json");
  if (!fs.existsSync(settingsPath)) return;
  const pyCmd = getPythonCmd()?.cmd;
  if (!pyCmd || pyCmd === "python3") return;
  try {
    let content = fs.readFileSync(settingsPath, "utf8");
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
    const updated = content.replace(/\bpython3\b/g, pyCmd);
    fs.writeFileSync(settingsPath, updated, "utf8");
    ok(`settings.json — comando python ajustado a '${pyCmd}'`);
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
      if (fs.statSync(full).isDirectory()) walk(full, relPath);
      else files.push(relPath);
    }
  };
  walk(dir, "");
  return files;
}

function checkObsoleteFiles() {
  const obsoletos = [];
  for (const item of COPY_ITEMS) {
    const repoSrc = path.join(ROOT, item);
    const claudeDst = path.join(CLAUDE_DIR, item);
    if (!fs.existsSync(repoSrc) || !fs.existsSync(claudeDst)) continue;
    if (!fs.statSync(repoSrc).isDirectory()) continue;
    const repoFiles = new Set(getAllFilesRelative(repoSrc));
    for (const f of getAllFilesRelative(claudeDst)) {
      if (!repoFiles.has(f)) obsoletos.push({ seccion: item, archivo: f });
    }
  }
  return obsoletos;
}

module.exports = {
  copyItem, installFiles, backupSettings,
  fixPythonCommandInSettings, getAllFilesRelative, checkObsoleteFiles,
};
