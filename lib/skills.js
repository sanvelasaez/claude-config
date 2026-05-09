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
  if (!isSkillInstalled(name)) {
    info(`Instalando skill externa: ${repo}`);
    const skillsCmd = ["npx", "skills", "add", repo, ...flags].join(" ");
    const r = spawnSync(skillsCmd, [], {
      stdio: ["pipe", "inherit", "inherit"],
      encoding: "utf8",
      shell: true,
      env: { ...process.env, CI: "1" },
      input: "y\n",
    });
    if (r.status === 0 && isSkillInstalled(name)) {
      ok(`Skill externa '${name}' — instalada`);
    } else {
      const detail = r.error ? ` (${r.error.message})` : r.status != null ? ` (exit ${r.status})` : "";
      warn(`Skill '${name}' — instalar manualmente: npx skills add ${repo} ${flags.join(" ")}${detail}`);
      return;
    }
  } else {
    ok(`Skill externa '${name}' — ya instalada`);
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
