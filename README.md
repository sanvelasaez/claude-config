# claude-config

Configuración global de Claude Code lista para usar. Un solo comando instala un sistema de seguridad en tiempo real, skills reutilizables, agentes especializados, hooks de auditoría y un sistema de extensiones para skills de terceros.

## Instalación

Un solo comando. Solo requiere Node.js 18+ (que ya viene con Claude Code):

```bash
npx github:sanvelasaez/claude-config
```

Copia todos los archivos a `~/.claude/`, configura el MCP centinel en `~/.claude.json` y verifica que el sistema funciona. No hay pasos adicionales.

Para actualizar en el futuro:

```bash
npx --yes github:sanvelasaez/claude-config
```

O desde dentro de Claude Code:

```
/setup
```

Para verificar sin instalar nada:

```bash
npx github:sanvelasaez/claude-config --check
```

## Qué incluye

### Sistema de seguridad Centinel

Tres capas que trabajan juntas:

- **Hook `centinel_preflight.py`** — se ejecuta antes de cada herramienta. Bloquea comandos destructivos (`rm -rf`, `git reset --hard`…), URLs de exfiltración (pastebin, requestbin…) y patrones de prompt injection. Configurable via `hooks/centinel_iocs.json`.
- **MCP server `centinel-server.py`** — expone cuatro herramientas a Claude: `scan_package` (consulta OSV.dev), `check_ioc`, `add_ioc` e `ioc_stats`. Permite auditar dependencias npm/pypi/cargo/go antes de instalar.
- **Skill `centinel-auditor`** — proceso de 7 pasos para auditar cualquier elemento externo (skills, MCPs, paquetes, scripts) antes de instalarlo o usarlo.

### Skills

13 skills organizadas por prioridad y cargadas automáticamente cuando el contexto lo requiere:

| Prioridad | Skill | Cuándo se activa |
|---|---|---|
| 1 | `centinel-auditor` | Cualquier elemento de origen externo |
| 2 | `find-skills` | Buscar o instalar skills nuevas |
| 3 | `centinel-update` | Mantenimiento trimestral de IOCs |
| 4 | `security-code` | Código con autenticación, credenciales o datos sensibles |
| 6 | `test-writer` | Código nuevo o modificado sin cobertura |
| 7 | `debug-tracer` | Bugs no obvios o errores intermitentes |
| 8 | `arch-patterns` | Diseño de módulos o refactorizaciones estructurales |
| 9 | `doc-writer` | APIs públicas o lógica no obvia |
| 10 | `ui-design-review` | Interfaces frontend |
| 11 | `perf-profiler` | Degradación de rendimiento observable |
| 12 | `reflection` | Análisis de sesión para mejora continua |
| 13 | `skill-creator` | Crear o mejorar skills |

Más información en @SKILL-REGISTRY.md

### Agentes especializados

Seis subagentes con modelos y skills asignadas. La sesión principal los delega automáticamente:

- `@explorer` — mapear codebases desconocidos (Haiku, sin contaminar contexto principal)
- `@architect` — decisiones de arquitectura y patrones de diseño
- `@reviewer` — code review exhaustivo + auditoría de seguridad + rendimiento
- `@debugger` — análisis sistemático de hipótesis para bugs complejos
- `@qa` — validación funcional + tests + centinel-auditor
- `@designer` — diseño visual, sistemas de diseño, accesibilidad WCAG

### Sistema de extensiones para skills de terceros

Las skills de terceros se instalan limpias (sin modificar). Las personalizaciones van en archivos de extensión separados que se mergean al regenerar:

```
skills/<nombre>/
├── SKILL.base.md   ← original o traducción fiel (no tocar)
├── SKILL.ext.md    ← nuestras adiciones con directivas EXT:
└── SKILL.md        ← archivo activo generado por merge
```

Directivas disponibles: `FRONTMATTER`, `INJECT_AFTER`, `INJECT_BEFORE`, `REPLACE_SECTION`, `APPEND`.

```bash
npm run merge-skills              # regenera todos los SKILL.md
npm run merge-skills:find-skills  # solo una skill concreta
```

Skills actualmente extendidas: `find-skills` (vercel-labs, +4 extensiones), `skill-creator` (Anthropic, traducción como base).

### Mantenimiento de skills

Un solo script mantiene actualizadas todas las skills:

```bash
npm run update-skills          # actualiza todo (config repo + skills externas)
npm run update-skills:check    # dry-run, muestra qué cambiaría
npm run update-skills:own      # solo skills del config repo
npm run update-skills:external # solo skills de terceros (+ merge automático)
```

El script lee `scripts/skills-manifest.json` para saber qué skills vienen de este repo y cuáles de terceros. Para skills externas, aplica las extensiones automáticamente tras reinstalar.

### Flujos opcionales (activar por proyecto)

En `.claude/CLAUDE.md` del proyecto:

```markdown
@~/.claude/git-workflow.md        ← flujo Git con commits, PRs y revisiones
@~/.claude/agent-coordination.md  ← coordinación multi-agente avanzada
```

### Hooks de sesión

Además del hook de seguridad, el `settings.json` incluye hooks para auditoría y logging:

- `PostToolUse Write/Edit` — registra cada archivo modificado en `~/.claude/audit.log`
- `SessionStart` — registra inicio de sesión en `~/.claude/sessions.log`

## Novedades recientes

### Ahorro de tokens en CLI — integración RTK

El hook `centinel_preflight.py` ahora incluye una segunda fase: tras aprobar un comando Bash, intenta reescribirlo con [rtk](https://github.com/rtk-ai/rtk) para comprimir el output antes de que llegue al contexto del modelo.

El instalador descarga y configura rtk automáticamente (macOS: brew; Linux/Windows: binario precompilado desde GitHub Releases). No requiere configuración adicional.

```
Claude solicita: git status
        ↓ centinel (seguridad primero)
        ↓ rtk rewrite → "rtk git status"
Claude recibe: * main...origin/main\n M archivo.py   (−84% tokens)
```

Comandos cubiertos: `git`, `gh`, `grep`, `find`, `ls`, `docker`, `kubectl`, `aws`, `test`, y 15 más. El ahorro es mayor en comandos verbosos (`git status`, `npm test`, `pytest`) y nulo en los que ya usan flags compactos (`--oneline`, `--stat`).

Centinel mantiene prioridad absoluta: los comandos bloqueados nunca llegan a rtk.

### Recomendaciones de herramientas por tipo de proyecto

Nuevo archivo `SKILL-PLUGIN-RECOMMENDATIONS.md` (desplegado en `~/.claude/`) con herramientas auditadas organizadas por triggers de proyecto:

- **context-mode** — compresión de outputs masivos: logs de 10.000 líneas → 300 tokens, snapshots Playwright, APIs JSON grandes. Auditoría: 🟡 PRECAUCIÓN (ver análisis completo antes de instalar).
- **code-review-graph** — grafo de dependencias AST para codebases >20K líneas. Auditoría: ✅ SEGURO (MIT, sin CVEs).

Claude sugiere estas herramientas proactivamente cuando detecta señales del proyecto que encajan con sus triggers.

### Reglas de eficiencia de tokens en CLAUDE.md

Cinco reglas nuevas derivadas del análisis de `drona23/claude-token-efficient`:

- No releer archivos ya leídos en la misma sesión
- En code reviews: problema + fix + parar, sin sugerencias fuera de scope
- No generar boilerplate no solicitado
- Máximo 3 subagentes en paralelo salvo instrucción explícita
- En fallos de subagente: reportar qué + por qué + qué se intentó, luego parar

---

## Requisitos

| Requisito | Versión | Para qué | Instalación automática |
|---|---|---|---|
| Node.js | 18+ | Instalador `npx` | Sí — winget / brew / apt |
| Python | 3.x | Hook centinel, MCP server | Sí — winget / brew / apt |
| Claude Code | última | Todo | No — `npm install -g @anthropic-ai/claude-code` |
| Git | cualquiera | Flujo git-workflow.md (opcional) | No |
| rtk | 0.23.0+ | Compresión de outputs CLI | Sí — brew (macOS) / binario GitHub (Linux/Windows) |

El instalador detecta automáticamente si Node.js o Python no están y los instala usando el gestor de paquetes del sistema.

## Notas para Windows

### 1 — Deshabilitar los alias de ejecución de aplicaciones de Python

Windows 10/11 incluye por defecto dos alias (`python.exe` y `python3.exe`) que, en lugar de ejecutar Python, abren el Microsoft Store. Esto hace que los hooks y plugins fallen aunque Python esté correctamente instalado.

Hay que desactivarlos antes de instalar:

> **Inicio → Configuración → Aplicaciones → Aplicaciones y características → Alias de ejecución de aplicaciones**

Desactiva los dos entradas llamadas **"Instalador de aplicación"** para `python.exe` y `python3.exe`.

Si están activos, `python --version` abrirá el Store en lugar de mostrar la versión instalada.

### 2 — Alias python3 (creado automáticamente)

En Windows, Python solo instala `python.exe`. Los plugins oficiales de Anthropic (como `hookify` y `security-guidance`) usan `python3` en sus hooks, lo que provoca el error `python3: command not found`.

El instalador resuelve esto automáticamente: crea un hardlink `python3.exe → python.exe` en el mismo directorio de Python. El hardlink no ocupa espacio adicional en disco y funciona en todos los entornos (PowerShell, CMD y Git Bash).

Si en algún momento actualizas Python y el hardlink queda desactualizado, basta con volver a ejecutar el instalador:

```bash
npx --yes github:sanvelasaez/claude-config
```
