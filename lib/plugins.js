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
  const r = spawnClaude(["plugin", "enable", pluginId], { stdio: "inherit" });
  if (r.status === 0) ok(`Plugin '${name}' — habilitado`);
  else warn(`Plugin '${name}' — habilitar manualmente: claude plugin enable ${pluginId}`);
}

function installPlugin({ name, marketplace }) {
  const pluginId = `${name}@${marketplace}`;
  const { installed, enabled } = parsePluginStatus(getInstalledPlugins(), pluginId);

  if (!installed) {
    const r = spawnClaude(["plugin", "install", pluginId], { stdio: "inherit" });
    if (r.status !== 0) {
      const detail = r.error ? ` (${r.error.message})` : r.stderr ? ` (${r.stderr.trim()})` : "";
      warn(`Plugin '${name}' — fallo${detail}; instalar manualmente: claude plugin install ${pluginId}`);
      return;
    }
    const { enabled: nowEnabled } = parsePluginStatus(getInstalledPlugins(), pluginId);
    if (nowEnabled) ok(`Plugin '${name}' — instalado y activo`);
    else enablePlugin(name, pluginId);
  } else if (!enabled) {
    enablePlugin(name, pluginId);
  } else {
    ok(`Plugin '${name}' — activo`);
  }
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
