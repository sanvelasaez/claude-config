# Recomendaciones de Skills y Plugins

> Herramientas auditadas y listas para instalar, organizadas por tipo de proyecto.
> Ubicación: `~/.claude/SKILL-PLUGIN-RECOMMENDATIONS.md`
> Última revisión: 2026-06

## Cómo usar este archivo

**Antes de buscar en el marketplace**, comprobar si la necesidad ya está cubierta aquí.
**Al detectar señales del proyecto** que encajen con los triggers de una herramienta, sugerirla al usuario proactivamente.
**Al recibir una petición** de skill o plugin, revisar este archivo primero antes de buscar en fuentes externas.

---

## Herramientas recomendadas

### context-mode — Compresión masiva de outputs de herramientas

| Campo | Valor |
|---|---|
| **Tipo** | MCP server (plugin de Claude Code) |
| **Scope** | Global — disponible en todos los proyectos |
| **Instalar** | `claude plugin install context-mode@context-mode` |
| **Licencia** | ELv2 (Elastic License 2.0) — uso personal permitido |
| **Auditoría** | 🟡 PRECAUCIÓN — 2026-06 |
| **Repo** | https://github.com/mksglu/context-mode |

**Qué aporta:**
Sandboxea los outputs de herramientas pesadas (Playwright, logs, APIs) en subprocesos aislados.
Solo el `console.log()` del script de análisis entra en el contexto del modelo.
Reducción real del 98-99% en tokens de output para estos casos.

| Escenario | Sin context-mode | Con context-mode |
|---|---|---|
| Log de 10.000 líneas | ~40K tokens | ~300 tokens |
| Snapshot Playwright | 56 KB | 299 bytes |
| Respuesta API JSON grande | 60 KB | ~1 KB |

**Cuándo sugerir — triggers:**
- El usuario menciona analizar logs de producción o archivos de log grandes
- El proyecto tiene tests E2E con Playwright, Cypress o similar
- El usuario pega o referencia archivos de más de 500 líneas para análisis
- El proyecto hace scraping o procesa respuestas de APIs externas masivas
- El usuario menciona que el contexto se llena rápidamente en sesiones largas

**Riesgos conocidos (informar antes de instalar):**
- El script `postinstall` modifica `~/.claude/settings.json` automáticamente al instalar
- Requiere Node.js ≥22.5 (en Linux) o Bun
- Riesgo de prompt injection si se usa `ctx_fetch_and_index` con URLs no confiables
- Licencia ELv2: no redistribuible como servicio gestionado

---

### code-review-graph — Navegación estructural de codebases grandes

| Campo | Valor |
|---|---|
| **Tipo** | MCP server (herramienta CLI + Python) |
| **Scope** | Por proyecto — requiere indexar cada repo |
| **Instalar** | `pip install code-review-graph` o `uv add code-review-graph` |
| **Inicializar en proyecto** | `crg init` (en la raíz del repo) |
| **Licencia** | MIT ✅ |
| **Auditoría** | ✅ SEGURO — 2026-06 |
| **Repo** | https://github.com/tirth8205/code-review-graph |

**Qué aporta:**
Construye un grafo de dependencias del codebase usando Tree-sitter (AST parsing) y lo almacena en SQLite.
El LLM consulta el grafo en lugar de leer archivos completos:
- "¿Qué llama a esta función?" → 500 tokens en lugar de grep en 50 archivos
- "¿Qué impacto tiene cambiar X?" → blast radius directo
- "¿Qué componente maneja este endpoint?" → 1 query al grafo

**Cuándo sugerir — triggers:**
- El proyecto tiene más de 20.000 líneas de código
- El usuario pregunta por impacto de cambios o dependencias entre módulos
- Se trabaja en refactorizaciones que afectan múltiples archivos
- El usuario hace preguntas tipo "¿qué rompe si cambio X?" con frecuencia
- El proyecto tiene arquitectura compleja: microservicios, monorepo, herencia profunda
- Investigación de incidencias donde hay que trazar call chains

**Configuración MCP (añadir a `.mcp.json` del proyecto):**
```json
{
  "mcpServers": {
    "code-review-graph": {
      "command": "crg",
      "args": ["mcp"]
    }
  }
}
```

**Riesgos conocidos (bajos):**
- Auto-inyecta configuración en plataformas AI al instalar (`crg init`) — documentado
- Los embeddings opcionales envían firmas de funciones a APIs externas (Gemini/OpenAI) — no activar salvo intención explícita
- El daemon `crg-daemon` corre en background — detener cuando no se use

---

## Añadir una nueva recomendación

Al identificar una herramienta candidata:

1. Ejecutar `centinel-auditor` — sin auditoría aprobada no se añade
2. Añadir entrada con: tipo, scope, instalación, licencia, veredicto centinel con fecha, triggers, riesgos
3. Actualizar fecha de revisión del archivo
4. Si la herramienta es global, añadirla también a la tabla de plugins de `CLAUDE.md`
