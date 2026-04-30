Actualiza la configuración global de Claude Code desde el repositorio oficial.

Sigue estos pasos en orden:

1. Ejecuta el instalador via npx para descargar la última versión y aplicarla:
   `npx --yes github:sanvelasaez/claude-config`

   Este comando descarga el repositorio completo desde GitHub y ejecuta el instalador,
   que copia todos los archivos a ~/.claude/ con --force y verifica el hook.

2. Verifica que el MCP centinel está configurado en `~/.claude.json`. Si no aparece la clave `centinel`
   en `mcpServers`, muéstrale al usuario exactamente qué añadir:
   ```json
   { "mcpServers": { "centinel": { "command": "node", "args": ["~/.claude/mcps/centinel-server.js"] } } }
   ```

3. Informa del resultado: qué archivos se actualizaron, si el hook funciona
   y qué pasos manuales quedan pendientes (si los hay).

No hagas nada más. Este comando solo actualiza la configuración global de Claude Code.
