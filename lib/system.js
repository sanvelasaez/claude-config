"use strict";

const { spawnSync } = require("child_process");
const { ok, warn, err, info } = require("./ui");

function installPackage(wingetId, brewId, aptId) {
  if (process.platform === "win32") {
    const r = spawnSync(
      "winget",
      ["install", "--id", wingetId, "--source", "winget", "-e",
        "--accept-package-agreements", "--accept-source-agreements"],
      { stdio: "inherit", encoding: "utf8" },
    );
    return r.status === 0;
  }
  if (process.platform === "darwin") {
    const r = spawnSync("brew", ["install", brewId], { stdio: "inherit", encoding: "utf8" });
    return r.status === 0;
  }
  for (const [mgr, arg] of [["apt-get", aptId], ["dnf", aptId]]) {
    const r = spawnSync("sudo", [mgr, "install", "-y", arg], { stdio: "inherit", encoding: "utf8" });
    if (r.status === 0) return true;
  }
  return false;
}

function getPythonCmd() {
  for (const cmd of ["python3", "python"]) {
    const w = spawnSync(
      process.platform === "win32" ? "where" : "which",
      [cmd],
      { encoding: "utf8" },
    );
    if (w.status !== 0) continue;
    const v = spawnSync(cmd, ["--version"], { encoding: "utf8" });
    const ver = (v.stdout || v.stderr || "").trim();
    if (/Python 3\./.test(ver)) return { cmd, ver };
  }
  return null;
}

function checkPython() {
  const found = getPythonCmd();
  if (found) {
    ok(`Python — ${found.ver} (${found.cmd})`);
    return true;
  }
  warn("Python 3 — NO encontrado");
  return false;
}

function ensureNode() {
  const [major] = process.versions.node.split(".").map(Number);
  if (major >= 18) {
    ok(`Node.js ${process.versions.node} (>= 18)`);
    return;
  }
  warn(`Node.js ${process.versions.node} demasiado antiguo. Se necesita >= 18. Actualizando...`);
  const installed = installPackage("OpenJS.NodeJS.LTS", "node", "nodejs");
  if (installed) {
    ok("Node.js LTS instalado. Reinicia el terminal y ejecuta el instalador de nuevo.");
    process.exit(0);
  }
  err("No se pudo instalar Node.js automáticamente. Instalar desde: https://nodejs.org");
  process.exit(1);
}

function ensureClaudeCode() {
  const r = spawnSync(
    process.platform === "win32" ? "where" : "which",
    ["claude"],
    { encoding: "utf8" },
  );
  if (r.status === 0) {
    ok("Claude Code — encontrado en PATH");
    return;
  }
  warn("Claude Code — no encontrado. Instalando...");
  const r2 = spawnSync("npm", ["install", "-g", "@anthropic-ai/claude-code"], {
    stdio: "inherit",
    encoding: "utf8",
  });
  if (r2.status === 0) {
    ok("Claude Code instalado correctamente");
    return;
  }
  err("No se pudo instalar Claude Code. Instalar manualmente: npm install -g @anthropic-ai/claude-code");
}

function ensureGit() {
  const r = spawnSync(
    process.platform === "win32" ? "where" : "which",
    ["git"],
    { encoding: "utf8" },
  );
  if (r.status === 0) {
    ok("Git — encontrado en PATH");
    return;
  }
  warn("Git — no encontrado. Instalando...");
  const installed = installPackage("Git.Git", "git", "git");
  if (installed) {
    ok("Git instalado correctamente. Puede requerir reiniciar el terminal.");
    return;
  }
  warn("No se pudo instalar Git automáticamente. Instalar desde: https://git-scm.com");
}

function ensurePython() {
  const found = getPythonCmd();
  if (found) return found.cmd;
  info("Instalando Python 3...");
  const installed = installPackage("Python.Python.3.13", "python3", "python3");
  if (installed) {
    ok("Python 3 instalado correctamente. Puede requerir reiniciar el terminal.");
    return process.platform === "win32" ? "python" : "python3";
  }
  err("No se pudo instalar Python 3 automáticamente. Instalar desde: https://www.python.org/downloads/");
  return null;
}

module.exports = {
  installPackage, getPythonCmd, checkPython,
  ensureNode, ensureClaudeCode, ensureGit, ensurePython,
};
