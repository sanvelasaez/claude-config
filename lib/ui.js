"use strict";

const fs = require("fs");

const ok   = (m) => console.log(`  [OK]   ${m}`);
const warn = (m) => console.log(`  [WARN] ${m}`);
const err  = (m) => console.log(`  [ERR]  ${m}`);
const info = (m) => console.log(`         ${m}`);
const sep  = () => console.log();

function confirmarInstalacion(claudeDir, force) {
  sep();
  console.log("  ⚠  AVISO DE SEGURIDAD");
  console.log(`  Esta operación copiará archivos a: ${claudeDir}`);
  if (force) {
    console.log("  Modo --force: los archivos existentes SERÁN SOBREESCRITOS.");
  } else {
    console.log("  Los archivos existentes se respetan; solo se añade lo que falta.");
  }
  sep();
  process.stdout.write("  ¿Deseas continuar? (s): ");

  const buf = Buffer.alloc(16);
  let n = 0;
  try {
    n = fs.readSync(0, buf, 0, 16);
  } catch {
    return true;
  }
  const respuesta = buf.slice(0, n).toString().trim().toLowerCase();
  return (
    respuesta === "" ||
    respuesta === "s" ||
    respuesta === "si" ||
    respuesta === "sí" ||
    respuesta === "SI" ||
    respuesta === "SÍ"
  );
}

function printNextSteps() {
  console.log("=== LISTO ===");
  sep();
  console.log("Iniciar Claude Code — los hooks y el MCP centinel ya están activos:");
  console.log("  claude");
  sep();
  console.log("Para actualizar en el futuro:");
  console.log("  npx --yes github:sanvelasaez/claude-config");
  console.log("  (o desde Claude Code: /setup)");
  sep();
  console.log("Para verificar el estado de la instalación en cualquier momento:");
  console.log("  npx github:sanvelasaez/claude-config --check");
  sep();
}

module.exports = { ok, warn, err, info, sep, confirmarInstalacion, printNextSteps };
