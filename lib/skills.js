"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { ROOT, CLAUDE_DIR, EXTERNAL_SKILLS } = require("./config");
const { ok, warn, info } = require("./ui");

function isSkillInstalled(name) {
  return fs.existsSync(path.join(CLAUDE_DIR, "skills", name, "SKILL.md"));
}

function installExternalSkill({ repo, name, flags, merge }) {
  if (isSkillInstalled(name)) {
    ok(`Skill externa '${name}' — ya instalada`);
    return;
  }
  info(`Instalando skill externa: ${repo}`);
  const r = spawnSync("npx", ["skills", "add", repo, ...flags], {
    stdio: "inherit",
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
  });
  if (r.status === 0) {
    ok(`Skill externa '${name}' — instalada`);
  } else {
    warn(`Skill '${name}' — fallo. Instalar manualmente: npx skills add ${repo} ${flags.join(" ")}`);
    return;
  }
  if (merge) {
    const mergeScript = path.join(ROOT, "scripts", "merge-skill-extension.js");
    if (fs.existsSync(mergeScript)) {
      const rm = spawnSync("node", [mergeScript, name], { stdio: "inherit", encoding: "utf8" });
      if (rm.status === 0) ok(`Skill '${name}' — extensiones aplicadas`);
      else warn(`Skill '${name}' — extensiones: fallo en merge`);
    }
  }
}

function installExternalSkills() {
  for (const skill of EXTERNAL_SKILLS) installExternalSkill(skill);
}

module.exports = { isSkillInstalled, installExternalSkill, installExternalSkills };
