"use strict";

const path = require("path");
const os = require("os");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const CLAUDE_JSON = path.join(os.homedir(), ".claude.json");

const args = process.argv.slice(2);
const force = args.includes("--force");
const check = args.includes("--check");

const COPY_ITEMS = [
  "CLAUDE.md",
  "settings.json",
  "SKILL-PLUGIN-REGISTRY.md",
  "git-workflow.md",
  "agent-coordination.md",
  "skills",
  "agents",
  "hooks",
  "mcps",
  "commands",
  "templates",
  "scripts",
];

const EXTERNAL_SKILLS = [
  {
    repo: "vercel-labs/skills@find-skills",
    name: "find-skills",
    flags: ["-g"],
    merge: true,
  },
];

const MARKETPLACES = [
  { name: "claude-plugins-official", source: "anthropics/claude-plugins-official" },
];

const PLUGINS = [
  { name: "skill-creator",        marketplace: "claude-plugins-official" },
  { name: "hookify",              marketplace: "claude-plugins-official" },
  { name: "security-guidance",    marketplace: "claude-plugins-official" },
  { name: "frontend-design",      marketplace: "claude-plugins-official" },
  { name: "claude-md-management", marketplace: "claude-plugins-official" },
  { name: "feature-dev",          marketplace: "claude-plugins-official" },
  { name: "pr-review-toolkit",    marketplace: "claude-plugins-official" },
];

function readJson(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  return JSON.parse(content);
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}

module.exports = {
  ROOT, CLAUDE_DIR, CLAUDE_JSON,
  args, force, check,
  COPY_ITEMS, EXTERNAL_SKILLS, MARKETPLACES, PLUGINS,
  readJson, writeJson,
};
