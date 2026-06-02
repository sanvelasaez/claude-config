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
