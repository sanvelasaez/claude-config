# claude-config

Configuración global de Claude Code lista para usar. Instala un sistema de seguridad en tiempo real, skills reutilizables, agentes especializados y hooks de auditoría.

## Instalación

Un solo comando. Solo requiere Node.js 18+ (que ya viene con Claude Code):

```bash
npx github:sanvelasaez/claude-config
```

Esto copia todos los archivos a `~/.claude/`, configura el MCP centinel en `~/.claude.json` y verifica que el sistema funciona. No hay pasos adicionales.

Para actualizar en el futuro:

```bash
npx --yes github:sanvelasaez/claude-config
```

O desde dentro de Claude Code:

```
/setup
```

Para verificar que todo está funcionando correctamente (sin instalar nada):

```bash
npx github:sanvelasaez/claude-config --check
```

Comprueba: archivos instalados, hook configurado en `settings.json`, MCP configurado en `~/.claude.json`, que el hook bloquea comandos peligrosos y permite los seguros, y que el MCP server responde al protocolo MCP.

## Qué incluye

**Sistema de seguridad Centinel**
- Hook en tiempo real que bloquea comandos destructivos, exfiltración de datos y prompt injection antes de que se ejecuten
- MCP server que consulta OSV.dev para detectar vulnerabilidades en dependencias
- Base de IOCs (Indicators of Compromise) actualizable

**Skills**
- `centinel-auditor` — audita cualquier elemento externo antes de instalarlo
- `centinel-update` — mantiene actualizada la base de IOCs
- `code-review`, `security-audit`, `test-writer`, `debug-tracer`
- `arch-patterns`, `doc-writer`, `ui-design-review`, `perf-profiler`, `reflection`

**Agentes especializados**
- `@explorer`, `@architect`, `@reviewer`, `@debugger`, `@qa`, `@designer`

**Flujos opcionales** (activar por proyecto)
- `git-workflow.md` — flujo Git con commits, PRs y revisiones
- `agent-coordination.md` — coordinación multi-agente

## Requisitos

| Requisito | Versión | Para qué | Instalación automática |
|---|---|---|---|
| Node.js | 18+ | Todo (instalador, hooks, MCP server) | Sí — via winget / brew / apt |
| Python | 3.x | Scripts de skills (ej. skill-creator) | Sí — via winget / brew / apt |
| Claude Code | última | `npm install -g @anthropic-ai/claude-code` | No |
| Git | cualquiera | Flujo git-workflow.md (opcional) | No |

El instalador detecta automáticamente si Node.js o Python no están presentes y los instala usando el gestor de paquetes del sistema (winget en Windows, brew en macOS, apt/dnf en Linux).
