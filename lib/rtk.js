"use strict";

const path = require("path");
const os = require("os");
const fs = require("fs");
const { spawnSync } = require("child_process");
const { ok, warn, err, info } = require("./ui");

const RTK_REPO = "rtk-ai/rtk";
const RTK_MIN_VERSION = "0.23.0";

// ── Utilidades ─────────────────────────────────────────────────────────────

function checkRtk() {
  const which = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(which, ["rtk"], { encoding: "utf8" });
  if (r.status !== 0) return null;
  const v = spawnSync("rtk", ["--version"], { encoding: "utf8" });
  return (v.stdout || "").trim() || "instalado";
}

function getNpmBinDir() {
  // npm_config_prefix lo inyecta npm/npx automáticamente al ejecutar scripts
  const envPrefix = process.env.npm_config_prefix;
  if (envPrefix) {
    return process.platform === "win32" ? envPrefix : path.join(envPrefix, "bin");
  }
  // Fallback: en Windows npm es npm.cmd y requiere shell:true para resolverse
  const r = spawnSync("npm", ["config", "get", "prefix"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const prefix = (r.stdout || "").trim();
  if (!prefix) return null;
  return process.platform === "win32" ? prefix : path.join(prefix, "bin");
}

function getTarget() {
  const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
  if (process.platform === "darwin") return `${arch}-apple-darwin`;
  if (process.platform === "linux") return `${arch}-unknown-linux-musl`;
  if (process.platform === "win32") return `${arch}-pc-windows-msvc`;
  return null;
}

// Descarga un archivo vía HTTPS usando un subproceso Node (sin curl|bash).
// Sigue redirecciones y falla si el status no es 200.
function downloadFile(url, dest) {
  const script = `
    const https = require('https');
    const http = require('http');
    const fs = require('fs');

    function get(u, depth) {
      if (depth > 5) { process.stderr.write('Too many redirects'); process.exit(1); }
      const mod = u.startsWith('https') ? https : http;
      mod.get(u, { headers: { 'User-Agent': 'claude-config-installer' } }, r => {
        if (r.statusCode >= 300 && r.headers.location) { get(r.headers.location, depth + 1); return; }
        if (r.statusCode !== 200) { process.stderr.write('HTTP ' + r.statusCode + ' for ' + u); process.exit(1); }
        const f = fs.createWriteStream(${JSON.stringify(dest)});
        r.pipe(f);
        f.on('finish', () => f.close(() => process.exit(0)));
        f.on('error', e => { process.stderr.write(e.message); process.exit(1); });
      }).on('error', e => { process.stderr.write(e.message); process.exit(1); });
    }
    get(${JSON.stringify(url)}, 0);
  `;
  const r = spawnSync("node", ["-e", script], { encoding: "utf8", timeout: 120000 });
  return r.status === 0;
}

function getLatestVersion() {
  const script = `
    const https = require('https');
    https.get(
      { host: 'api.github.com', path: '/repos/${RTK_REPO}/releases/latest', headers: { 'User-Agent': 'claude-config-installer' } },
      r => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => {
          try { process.stdout.write(JSON.parse(d).tag_name || ''); }
          catch { process.exit(1); }
        });
      }
    ).on('error', () => process.exit(1));
  `;
  const r = spawnSync("node", ["-e", script], { encoding: "utf8", timeout: 10000 });
  const tag = (r.stdout || "").trim();
  return (r.status === 0 && tag) ? tag : null;
}

// ── Instaladores por plataforma ─────────────────────────────────────────────

function installRtkMac() {
  info("Instalando rtk via Homebrew...");
  const r = spawnSync("brew", ["install", "rtk"], { stdio: "inherit", encoding: "utf8" });
  return r.status === 0;
}

function installRtkFromRelease(version) {
  const target = getTarget();
  if (!target) { err("rtk — arquitectura no soportada"); return false; }

  const binDir = getNpmBinDir();
  if (!binDir) { err("rtk — no se pudo determinar el directorio de instalación (npm no encontrado)"); return false; }

  const isWin = process.platform === "win32";
  const ext = isWin ? ".zip" : ".tar.gz";
  const binaryName = isWin ? "rtk.exe" : "rtk";
  const archiveName = `rtk-${target}${ext}`;
  const downloadUrl = `https://github.com/${RTK_REPO}/releases/download/${version}/${archiveName}`;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rtk-install-"));
  const archivePath = path.join(tmpDir, archiveName);

  info(`Descargando rtk ${version} (${target})...`);
  if (!downloadFile(downloadUrl, archivePath)) {
    err("rtk — fallo al descargar el binario");
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return false;
  }

  // Extraer
  let srcBinary;
  if (isWin) {
    const extractDir = path.join(tmpDir, "extracted");
    const r = spawnSync("powershell", [
      "-NonInteractive", "-Command",
      `Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${extractDir}' -Force`,
    ], { stdio: "pipe", encoding: "utf8" });
    if (r.status !== 0) {
      err(`rtk — fallo al extraer: ${(r.stderr || "").trim()}`);
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return false;
    }
    srcBinary = path.join(extractDir, binaryName);
  } else {
    const r = spawnSync("tar", ["-xzf", archivePath, "-C", tmpDir], {
      stdio: "pipe", encoding: "utf8",
    });
    if (r.status !== 0) {
      err(`rtk — fallo al extraer: ${(r.stderr || "").trim()}`);
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return false;
    }
    srcBinary = path.join(tmpDir, binaryName);
  }

  // Copiar al directorio de npm (en PATH)
  fs.mkdirSync(binDir, { recursive: true });
  const destBinary = path.join(binDir, binaryName);
  try {
    fs.copyFileSync(srcBinary, destBinary);
    if (!isWin) fs.chmodSync(destBinary, 0o755);
  } catch (e) {
    err(`rtk — no se pudo copiar el binario a ${binDir}: ${e.message}`);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return false;
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });

  // Verificar instalación
  const installed = checkRtk();
  if (installed) {
    ok(`rtk — ${installed} instalado en ${binDir}`);
    return true;
  }
  // Si no está en PATH aún (PATH se refresca al reiniciar terminal)
  if (fs.existsSync(destBinary)) {
    ok(`rtk — binario en ${destBinary} (puede requerir reiniciar el terminal para activarse en PATH)`);
    return true;
  }
  err(`rtk — binario copiado a ${destBinary} pero no verificable`);
  return false;
}

// ── Función principal ───────────────────────────────────────────────────────

function ensureRtk() {
  const existing = checkRtk();
  if (existing) {
    ok(`rtk — ${existing} (integración con centinel activa)`);
    return true;
  }

  if (process.platform === "darwin") {
    const installed = installRtkMac();
    if (!installed) { err("rtk — fallo al instalar con brew. Instalar manualmente: brew install rtk"); return false; }
    const v = checkRtk();
    if (v) ok(`rtk — ${v} instalado`);
    return !!v;
  }

  // Linux y Windows: descargar binario precompilado
  const version = getLatestVersion();
  if (!version) {
    warn("rtk — no se pudo obtener la versión de GitHub. Instalar manualmente:");
    if (process.platform === "win32") {
      info("  Descargar rtk-x86_64-pc-windows-msvc.zip de https://github.com/rtk-ai/rtk/releases");
    } else {
      info("  cargo install --git https://github.com/rtk-ai/rtk");
    }
    return false;
  }

  return installRtkFromRelease(version);
}

module.exports = { checkRtk, ensureRtk };
