Actualiza la configuración global de Claude Code desde el repositorio oficial.

Sigue estos pasos en orden:

1. Busca si el repositorio `claude-config` ya existe localmente. Comprueba estas rutas en orden:
   - El directorio actual si contiene `bootstrap.py`
   - `~/claude-config`
   - `~/workspace/tmp/claude-config`
   - `~/.claude-config-repo`
   Si no existe en ninguna, clónalo: `git clone https://github.com/sanvelasaez/claude-config.git ~/claude-config`

2. Entra al directorio del repositorio y actualiza: `git pull origin main`

3. Ejecuta el bootstrap con `--force` para actualizar todos los archivos:
   `python3 bootstrap.py --force`
   El script verifica dependencias, copia archivos a ~/.claude/ y valida el hook.

4. Verifica que el MCP centinel está configurado en `~/.claude.json`. Si no aparece la clave `centinel` en `mcpServers`, muéstrale al usuario exactamente qué añadir.

5. Informa del resultado: qué archivos se actualizaron, qué dependencias se instalaron, si el hook funciona y qué pasos manuales quedan pendientes (si los hay).

No hagas nada más. Este comando solo actualiza la configuración global de Claude Code.
