Ejecuta el proceso de mantenimiento de todas las skills instaladas:

**Skills del config repo** (propias + modificadas): se actualizan sincronizando con GitHub.  
**Skills externas** (terceros puros, como owasp-security): se actualizan con su comando `npx skills add`.

Proceso paso a paso:

1. Lee `scripts/skills-manifest.json` para obtener la lista completa: skills del repo y skills externas con sus comandos.

2. Muestra el resumen de qué se va a actualizar.

3. **Para skills externas**: avisa al usuario que debe ejecutar `/centinel-auditor` sobre la nueva versión antes de confirmar la actualización. Espera confirmación explícita.

4. Ejecuta las actualizaciones con:
   ```
   node scripts/update-skills.js
   ```
   O por partes:
   ```
   node scripts/update-skills.js --own       # solo config repo
   node scripts/update-skills.js --external  # solo externas
   node scripts/update-skills.js --check     # dry-run, sin cambios
   ```

5. Tras completar, recuerda al usuario actualizar `SKILL-REGISTRY.md` con la fecha de hoy en cada skill actualizada.

6. Si alguna skill externa tenía una versión nueva relevante, sugerir añadir fila al historial de auditorías de SKILL-REGISTRY.md.
