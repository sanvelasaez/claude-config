#!/usr/bin/env node
/**
 * update-skills.js — Mantiene actualizadas todas las skills instaladas.
 *
 * Skills propias / modificadas en el config repo: se actualizan con
 *   npx --yes github:sanvelasaez/claude-config
 *
 * Skills externas (terceros puros, listadas en skills-manifest.json):
 *   se actualizan con su comando 'npx skills add' correspondiente.
 *
 * Uso:
 *   node scripts/update-skills.js              → actualiza todo
 *   node scripts/update-skills.js --check      → muestra qué se haría, sin ejecutar
 *   node scripts/update-skills.js --own        → solo skills del config repo
 *   node scripts/update-skills.js --external   → solo skills externas
 *
 * Alias npm: npm run update-skills
 */

"use strict";

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const MERGE_SCRIPT = path.join(__dirname, "merge-skill-extension.js");
const SKILLS_DIR = path.join(__dirname, "..", "skills-extensions");

// --- CLI args ---
const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const OWN_ONLY = args.includes("--own");
const EXTERNAL_ONLY = args.includes("--external");
const updateOwn = !EXTERNAL_ONLY;
const updateExternal = !OWN_ONLY;

// --- Manifest ---
const MANIFEST_PATH = path.join(__dirname, "skills-manifest.json");

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`Error: no se encontró ${MANIFEST_PATH}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const externalSkills = manifest.external_skills || [];
const repoSkills = manifest.repo_skills || [];

// --- Formato ---
const LINE = "─".repeat(64);

function section(title) {
  console.log("");
  console.log(LINE);
  console.log(`  ${title}`);
  console.log(LINE);
}

function run(cmd, label) {
  if (CHECK) {
    console.log(`  [DRY-RUN] ${cmd}`);
    return true;
  }
  try {
    console.log(`  $ ${cmd}`);
    execSync(cmd, { stdio: "inherit" });
    console.log(`  ✅  ${label} — OK`);
    return true;
  } catch (e) {
    console.error(`  ❌  ${label} — fallo: ${e.message}`);
    process.exitCode = 1;
    return false;
  }
}

// --- Cabecera ---
console.log("");
console.log(LINE);
console.log("  🔄  update-skills — Mantenimiento de skills de Claude Code");
if (CHECK) console.log("  ℹ️   Modo verificación (--check): sin cambios");
console.log(LINE);

// =============================================================================
// 1. SKILLS DEL CONFIG REPO (propias + modificadas)
// =============================================================================
if (updateOwn) {
  section(`📦 SKILLS DEL CONFIG REPO (${repoSkills.length})`);
  console.log("");
  console.log(`  Skills: ${repoSkills.join(", ")}`);
  console.log("");
  console.log(`  Comando: ${manifest._update_repo_command}`);
  console.log("");

  if (!CHECK) {
    console.log("  ⚠️  Esto sincroniza hooks, settings.json, CLAUDE.md y skills del repo.");
    console.log("  ⚠️  Modifica solo archivos que el instalador gestiona.");
    console.log("");
  }

  run(manifest._update_repo_command, "config repo");
}

// =============================================================================
// 2. SKILLS EXTERNAS (terceros puros)
// =============================================================================
if (updateExternal) {
  section(`🌐 SKILLS EXTERNAS (${externalSkills.length})`);

  if (externalSkills.length === 0) {
    console.log("");
    console.log("  No hay skills externas registradas en skills-manifest.json.");
    console.log("  (Para añadir una, editarlo tras centinel-auditor.)");
  }

  for (const skill of externalSkills) {
    console.log("");
    console.log(`  → ${skill.name}  [${skill.security_level}]`);
    console.log(`     Repo:    ${skill.repo}`);
    console.log(`     Comando: ${skill.install_command}`);
    if (skill.notes) console.log(`     Notas:   ${skill.notes}`);
    console.log("");

    if (skill.requires_centinel_audit_before_update) {
      console.log("  ⚠️  ANTES DE ACTUALIZAR: ejecutar centinel-auditor sobre la nueva versión.");
      console.log("     Verificar que no introduce dependencias, binarios o cambios de comportamiento.");
      console.log("");
    }

    const ok = run(skill.install_command, skill.name);

    // Si la skill tiene extensión en el repo, aplicarla tras reinstalar
    if (ok && !CHECK) {
      const skillExt = path.join(SKILLS_DIR, skill.name, "SKILL.ext.md");
      if (fs.existsSync(skillExt)) {
        console.log(`  🔀  Aplicando extensión sobre ${skill.name}...`);
        run(`node "${MERGE_SCRIPT}" "${skill.name}"`, `merge ${skill.name}`);
      }
    }
  }
}

// =============================================================================
// Resumen final
// =============================================================================
section("📋 SIGUIENTE PASO");
console.log("");
if (CHECK) {
  console.log("  Verificación completada — no se realizaron cambios.");
  console.log("  Ejecuta sin --check para aplicar las actualizaciones.");
} else {
  console.log("  Actualización completada.");
  console.log("  (Las extensiones de skills externas se han aplicado automáticamente.)");
  console.log("");
  console.log("  Recuerda actualizar SKILL-REGISTRY.md:");
  console.log("    · Columna Versión/Fecha de cada skill actualizada (fecha de hoy)");
  console.log("    · Si alguna skill externa tuvo nueva versión: añadir fila al historial");
  console.log("    · Si centinel-auditor detectó algo relevante: registrarlo también");
}
console.log("");
