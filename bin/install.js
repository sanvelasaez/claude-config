#!/usr/bin/env node
/**
 * install.js — Instalador y verificador de la configuración global de Claude Code.
 *
 * Uso:
 *   npx github:sanvelasaez/claude-config           → instala y verifica
 *   npx github:sanvelasaez/claude-config --force   → actualiza archivos existentes y verifica
 *   npx github:sanvelasaez/claude-config --check   → solo verifica sin instalar nada
 */

"use strict";

const { force, check, CLAUDE_DIR } = require("../lib/config");
const { sep, info, warn, confirmarInstalacion, printNextSteps } = require("../lib/ui");
const { ensureNode, ensureClaudeCode, ensureGit, ensurePython } = require("../lib/system");
const { backupSettings, installFiles, fixPythonCommandInSettings } = require("../lib/files");
const { ensureHookInSettings, configureMcp, setHookPermissions } = require("../lib/centinel");
const { installExternalSkills } = require("../lib/skills");
const { installPlugins } = require("../lib/plugins");
const { runChecks } = require("../lib/verify");

const mode = check ? "VERIFICACION" : force ? "INSTALACION FORZADA" : "INSTALACION";
console.log(`=== CLAUDE CODE CONFIG — ${mode} ===`);
sep();

console.log("1. REQUISITOS DE SISTEMA");
ensureNode();
ensureClaudeCode();
ensureGit();
const pythonCmd = ensurePython();
sep();

if (check) {
  console.log("2. COMPROBACIONES DE INSTALACION");
  const allOk = runChecks();
  if (allOk) {
    console.log("Todo correcto. La instalacion esta completa y funcional.");
  } else {
    console.log("Hay problemas con la instalacion. Ejecutar sin --check para reinstalar:");
    console.log("  npx --yes github:sanvelasaez/claude-config");
    process.exit(1);
  }
  process.exit(0);
}

if (!confirmarInstalacion(CLAUDE_DIR, force)) {
  console.log("  Instalación cancelada.");
  process.exit(0);
}
sep();

console.log(`2. ARCHIVOS → ${CLAUDE_DIR}`);
if (!force) info("Los archivos existentes NO se sobreescriben (usa --force para actualizar)");
backupSettings();
const stats = installFiles();
fixPythonCommandInSettings(pythonCmd);
sep();
info(`Resumen: ${stats.copied} nuevos, ${stats.updated} actualizados, ${stats.skipped} omitidos, ${stats.errors} errores`);
sep();

console.log("3. CENTINEL");
ensureHookInSettings();
configureMcp();
sep();

console.log("4. SKILLS EXTERNAS");
installExternalSkills();
sep();

console.log("5. PLUGINS");
installPlugins();
sep();

console.log("6. PERMISOS");
setHookPermissions();
sep();

console.log("7. VERIFICACION FINAL");
const installOk = runChecks(pythonCmd);

if (!installOk || stats.errors > 0) {
  warn("La instalacion completó con errores. Revisar la salida anterior.");
  process.exit(1);
}

printNextSteps();
console.log("=== INSTALACION COMPLETADA ===");
