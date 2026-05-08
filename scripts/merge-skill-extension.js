#!/usr/bin/env node
/**
 * merge-skill-extension.js — Aplica SKILL.ext.md sobre la skill instalada.
 *
 * Lee la extensión de este repo (skills/<nombre>/SKILL.ext.md) y la añade
 * al final del archivo instalado en ~/.claude/skills/<nombre>/SKILL.md,
 * delimitada por marcadores HTML para identificarla visualmente.
 *
 * Idempotente: si ya se aplicó una extensión anterior, la reemplaza.
 *
 * Uso:
 *   node scripts/merge-skill-extension.js <nombre-skill>
 *   node scripts/merge-skill-extension.js --all
 *
 * Alias npm:
 *   npm run merge-skill -- <nombre-skill>
 *   npm run merge-skills
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const REPO_SKILLS_DIR = path.join(__dirname, "..", "skills-extensions");
const INSTALLED_SKILLS_DIR = path.join(os.homedir(), ".claude", "skills");

const MARKER_START = "<!-- EXTENSIÓN: sanvelasaez/claude-config — inicio -->";
const MARKER_END = "<!-- EXTENSIÓN: sanvelasaez/claude-config — fin -->";

// =============================================================================
// Helpers
// =============================================================================

/** Extrae el cuerpo de un archivo con frontmatter YAML (--- ... ---). */
function extractBody(content) {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return match ? match[1] : content;
}

// =============================================================================
// Merge de una skill
// =============================================================================

function mergeSkill(skillName) {
  const extPath = path.join(REPO_SKILLS_DIR, skillName, "SKILL.ext.md");
  const installedPath = path.join(INSTALLED_SKILLS_DIR, skillName, "SKILL.md");

  if (!fs.existsSync(extPath)) {
    console.log(`  ℹ️   ${skillName}: sin SKILL.ext.md en el repo — nada que aplicar`);
    return true;
  }

  const extContent = fs.readFileSync(extPath, "utf8");
  const body = extractBody(extContent).trim();

  if (!body) {
    console.log(`  ℹ️   ${skillName}: extensión vacía — nada que aplicar`);
    return true;
  }

  if (!fs.existsSync(installedPath)) {
    console.error(`  ❌  ${skillName}: skill no instalada (${installedPath})`);
    console.error(`         Instalarla primero: npx skills add <repo@${skillName}> -g`);
    return false;
  }

  let base = fs.readFileSync(installedPath, "utf8");

  // Idempotente: eliminar extensión previa si ya fue aplicada
  const startIdx = base.indexOf(MARKER_START);
  if (startIdx !== -1) {
    base = base.slice(0, startIdx).trimEnd();
    console.log(`  🔄  ${skillName}: reemplazando extensión anterior`);
  }

  const block = `\n\n${MARKER_START}\n\n${body}\n\n${MARKER_END}\n`;
  fs.writeFileSync(installedPath, base + block, "utf8");
  console.log(`  ✅  ${skillName}: extensión aplicada → ${installedPath}`);
  return true;
}

// =============================================================================
// Main
// =============================================================================

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help")) {
  console.log("Uso:");
  console.log("  node scripts/merge-skill-extension.js <nombre-skill>");
  console.log("  node scripts/merge-skill-extension.js --all");
  console.log("  npm run merge-skill -- <nombre-skill>");
  console.log("  npm run merge-skills");
  process.exit(0);
}

console.log("");
console.log("─".repeat(60));
console.log("  🔀  merge-skill-extension");
console.log("─".repeat(60));
console.log("");

if (args.includes("--all")) {
  if (!fs.existsSync(REPO_SKILLS_DIR)) {
    console.log("  No se encontró el directorio skills/ en el repo");
    process.exit(0);
  }

  const skills = fs
    .readdirSync(REPO_SKILLS_DIR)
    .filter((d) => fs.existsSync(path.join(REPO_SKILLS_DIR, d, "SKILL.ext.md")));

  if (skills.length === 0) {
    console.log("  No se encontraron skills con SKILL.ext.md");
  } else {
    for (const s of skills) mergeSkill(s);
  }
} else {
  mergeSkill(args[0]);
}

console.log("");
