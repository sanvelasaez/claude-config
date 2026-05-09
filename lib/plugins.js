"use strict";

const { spawnSync } = require("child_process");
const { MARKETPLACES, PLUGINS } = require("./config");
const { ok, warn, sep } = require("./ui");

const claude = "claude";

function getInstalledPlugins() {
  const r = spawnSync(claude, ["plugin", "list"], { encoding: "utf8" });
  return r.stdout || "";
}

function getConfiguredMarketplaces() {
  const r = spawnSync(claude, ["plugin", "marketplace", "list"], { encoding: "utf8" });
  return r.stdout || "";
}

function parsePluginStatus(output, pluginId) {
  const sections = output.split(/\s*❯\s+/);
  for (const section of sections) {
    if (section.trimStart().startsWith(pluginId)) {
      return { installed: true, enabled: section.includes("✔ enabled") };
    }
  }
  return { installed: false, enabled: false };
}

function ensureMarketplace({ name, source }) {
  const list = getConfiguredMarketplaces();
  if (list.includes(name)) {
    ok(`Marketplace '${name}' — ya configurado`);
    return;
  }
  const r = spawnSync(claude, ["plugin", "marketplace", "add", source], {
    stdio: "inherit",
    encoding: "utf8",
  });
  if (r.status === 0) ok(`Marketplace '${name}' — añadido`);
  else warn(`Marketplace '${name}' — añadir manualmente: claude plugin marketplace add ${source}`);
}

function enablePlugin(name, pluginId) {
  const r = spawnSync(claude, ["plugin", "enable", pluginId], { stdio: "inherit", encoding: "utf8" });
  if (r.status === 0) ok(`Plugin '${name}' — habilitado`);
  else warn(`Plugin '${name}' — habilitar manualmente: claude plugin enable ${pluginId}`);
}

function installPlugin({ name, marketplace }) {
  const pluginId = `${name}@${marketplace}`;
  const { installed, enabled } = parsePluginStatus(getInstalledPlugins(), pluginId);

  if (!installed) {
    const r = spawnSync(claude, ["plugin", "install", pluginId], {
      stdio: "inherit",
      encoding: "utf8",
    });
    if (r.status !== 0) {
      warn(`Plugin '${name}' — instalar manualmente: claude plugin install ${pluginId}`);
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
