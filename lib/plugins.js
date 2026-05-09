"use strict";

const { spawnSync } = require("child_process");
const { MARKETPLACES, PLUGINS } = require("./config");
const { ok, warn, sep } = require("./ui");

function getInstalledPlugins() {
  const r = spawnSync("claude", ["plugin", "list"], { encoding: "utf8" });
  return r.stdout || "";
}

function getConfiguredMarketplaces() {
  const r = spawnSync("claude", ["plugin", "marketplace", "list"], { encoding: "utf8" });
  return r.stdout || "";
}

function ensureMarketplace({ name, source }) {
  const list = getConfiguredMarketplaces();
  if (list.includes(name)) {
    ok(`Marketplace '${name}' — ya configurado`);
    return;
  }
  const r = spawnSync("claude", ["plugin", "marketplace", "add", source], {
    stdio: "inherit",
    encoding: "utf8",
  });
  if (r.status === 0) ok(`Marketplace '${name}' — añadido`);
  else warn(`Marketplace '${name}' — fallo. Añadir manualmente: claude plugin marketplace add ${source}`);
}

function installPlugin({ name, marketplace }) {
  const installed = getInstalledPlugins();
  if (installed.includes(`${name}@${marketplace}`)) {
    ok(`Plugin '${name}' — ya instalado`);
    return;
  }
  const r = spawnSync("claude", ["plugin", "install", `${name}@${marketplace}`], {
    stdio: "inherit",
    encoding: "utf8",
  });
  if (r.status === 0) ok(`Plugin '${name}' — instalado`);
  else warn(`Plugin '${name}' — fallo. Instalar manualmente: claude plugin install ${name}@${marketplace}`);
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
