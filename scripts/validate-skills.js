#!/usr/bin/env node
/**
 * validate-skills.js — Valida que todos los SKILL.md tengan el frontmatter correcto.
 *
 * Comprueba:
 *   - Existe SKILL.md en cada subdirectorio de skills/
 *   - El frontmatter YAML contiene los campos obligatorios: name, description
 *   - El campo name coincide con el nombre del directorio
 *
 * Uso:
 *   node scripts/validate-skills.js
 */

"use strict";

const fs = require("fs");
const path = require("path");

const SKILLS_DIR = path.join(__dirname, "..", "skills");
const REQUIRED_FIELDS = ["name", "description"];

let errors = 0;

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) fields[m[1].trim()] = m[2].trim();
  }
  return fields;
}

function fail(msg) {
  console.error(`  [ERR]  ${msg}`);
  errors++;
}

function ok(msg) {
  console.log(`  [OK]   ${msg}`);
}

const skillDirs = fs
  .readdirSync(SKILLS_DIR)
  .filter((d) => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory());

for (const skillDir of skillDirs) {
  const skillFile = path.join(SKILLS_DIR, skillDir, "SKILL.md");

  if (!fs.existsSync(skillFile)) {
    fail(`${skillDir}/ — falta SKILL.md`);
    continue;
  }

  const content = fs.readFileSync(skillFile, "utf8");
  const fm = parseFrontmatter(content);

  if (!fm) {
    fail(`${skillDir}/SKILL.md — no tiene frontmatter YAML (--- ... ---)`);
    continue;
  }

  let skillOk = true;
  for (const field of REQUIRED_FIELDS) {
    if (!fm[field]) {
      fail(`${skillDir}/SKILL.md — campo '${field}' faltante en frontmatter`);
      skillOk = false;
    }
  }

  if (fm.name && fm.name !== skillDir) {
    fail(
      `${skillDir}/SKILL.md — 'name: ${fm.name}' no coincide con el directorio '${skillDir}'`
    );
    skillOk = false;
  }

  if (skillOk) ok(`${skillDir}/SKILL.md`);
}

if (errors > 0) {
  console.error(`\n${errors} error(es) encontrado(s).`);
  process.exit(1);
} else {
  console.log(`\nTodas las skills (${skillDirs.length}) son válidas.`);
}
