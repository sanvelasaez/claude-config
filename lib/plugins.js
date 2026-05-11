"use strict";

const { spawnSync } = require("child_process");
const { MARKETPLACES, PLUGINS } = require("./config");
const { ok, warn, sep } = require("./ui");

const claude = "claude";
const SPAWN_OPTS = { shell: true, encoding: "utf8" };

function spawnClaude(args, extraOpts = {}) {
  return spawnSync(claude, args, { ...SPAWN_OPTS, ...extraOpts });
}

function getInstalledPlugins() {
  const r = spawnClaude(["plugin", "list"]);
  return (r.stdout || "") + (r.stderr || "");
}

function getConfiguredMarketplaces() {
  const r = spawnClaude(["plugin", "marketplace", "list"]);
  return (r.stdout || "") + (r.stderr || "");
}

function parsePluginStatus(output, pluginId) {
  const name = pluginId.split("@")[0];
  if (output.includes(pluginId) || output.includes(name)) {
    const line = output.split("\n").find((l) => l.includes(name)) || "";
    const enabled = line.includes("enabled") || line.includes("✔") || line.includes("active");
    return { installed: true, enabled };
  }
  return { installed: false, enabled: false };
}

function ensureMarketplace({ name, source }) {
  const list = getConfiguredMarketplaces();
  if (list.includes(name) || list.includes(source)) {
    ok(`Marketplace '${name}' — ya configurado`);
    return;
  }
  const r = spawnClaude(["plugin", "marketplace", "add", source], { stdio: "inherit" });
  if (r.status === 0) {
    ok(`Marketplace '${name}' — añadido`);
  } else {
    const detail = r.error ? ` (${r.error.message})` : r.stderr ? ` (${r.stderr.trim()})` : "";
    warn(`Marketplace '${name}' — fallo${detail}; añadir manualmente: claude plugin marketplace add ${source}`);
  }
}

function enablePlugin(name, pluginId) {
  // pipe para capturar output y detectar "already enabled"
  const r = spawnClaude(["plugin", "enable", pluginId], {
    stdio: ["inherit", "pipe", "pipe"],
  });
  const out = (r.stdout || "") + (r.stderr || "");
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);

  if (r.status === 0) {
    ok(`Plugin '${name}' — habilitado`);
  } else if (out.includes("already enabled")) {
    ok(`Plugin '${name}' — activo`);
  } else {
    const detail = r.stderr ? ` (${r.stderr.trim()})` : "";
    warn(`Plugin '${name}' — fallo al habilitar${detail}; ejecutar: claude plugin enable ${pluginId}`);
  }
}

function installPlugin({ name, marketplace }) {
  const pluginId = `${name}@${marketplace}`;

  // Siempre instala — actualiza si ya existe
  const r = spawnClaude(["plugin", "install", pluginId], { stdio: "inherit" });
  const output = (r.stdout || "") + (r.stderr || "");

  if (r.status !== 0 && !output.includes("already installed")) {
    const detail = r.error ? ` (${r.error.message})` : r.stderr ? ` (${r.stderr.trim()})` : "";
    warn(`Plugin '${name}' — fallo${detail}; instalar manualmente: claude plugin install ${pluginId}`);
    return;
  }

  enablePlugin(name, pluginId);
}

function installPlugins() {
  for (const mkt of MARKETPLACES) ensureMarketplace(mkt);
  sep();
  for (const plugin of PLUGINS) installPlugin(plugin);
}

module.exports = {
  getInstalledPlugins, getConfiguredMarketplaces,
  ensureMarketplace, installPlugin, installPlugins,
};
