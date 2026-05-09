# 📋 Registro de Skills y Plugins Instalados

> Registra todas las skills y plugins activos, su origen, estado de seguridad y fecha de incorporación.
> Se actualiza cada vez que se instala, desinstala o actualiza una skill o plugin.
> Última actualización: 2026-05

---

## Leyenda de origen y seguridad

| Símbolo | Significado |
|---|---|
| 🟢 **VERIFICADA** | Fuente oficial (Anthropic) o tercero verificado con auditoría superada documentada |
| 🟡 **CONFIABLE** | Tercero reconocido, código revisado públicamente, uso amplio en la comunidad |
| 🔵 **PROPIA** | Creación interna, sin dependencias externas, código 100% bajo control |
| 🔴 **BLOQUEADA** | No usar — riesgo identificado en auditoría de centinel-auditor |
| ⚪ **PENDIENTE** | Pendiente de auditoría con centinel-auditor |

---

## Skills activas

Instaladas en `~/.claude/skills/`. Las del repo se copian con `npx github:sanvelasaez/claude-config`; las externas se instalan con `npx skills add`.

| Nombre | Origen | Seguridad | Versión/Fecha | Notas |
|---|---|---|---|---|
| `centinel-auditor` | Creación propia | 🔵 PROPIA | 2026-04 | Skill de seguridad base — prioridad máxima. Enriquecida con IOCs de MCP Sentinel |
| `centinel-update` | Creación propia | 🔵 PROPIA | 2026-04 | Mantenimiento de IOCs, hooks y skills — checklist trimestral + respuesta a incidentes |
| `security-audit` | Creación propia | 🔵 PROPIA | 2026-04 | Auditoría OWASP y autenticación |
| `test-writer` | Creación propia | 🔵 PROPIA | 2026-04 | Generación de tests unitarios e integración |
| `debug-tracer` | Creación propia | 🔵 PROPIA | 2026-04 | Depuración sistemática con hipótesis |
| `arch-patterns` | Creación propia | 🔵 PROPIA | 2026-04 | Patrones de diseño y arquitectura |
| `doc-writer` | Creación propia | 🔵 PROPIA | 2026-04 | Documentación técnica inline y de módulo |
| `ui-design-review` | Creación propia | 🔵 PROPIA | 2026-04 | Revisión visual y accesibilidad WCAG |
| `perf-profiler` | Creación propia | 🔵 PROPIA | 2026-04 | Análisis de rendimiento basado en métricas |
| `reflection` | Creación propia | 🔵 PROPIA | 2026-04 | Análisis de sesión para mejora continua |
| `find-skills` | Tercero: vercel-labs/skills (MIT) + Extensiones propias | 🟡 CONFIABLE | 2026-05-08 | Instalada upstream. Extensiones en repo (`SKILL.ext.md`): fuentes adicionales (GitHub, /help, docs Anthropic), centinel-auditor obligatorio antes de instalar, sin flag -y. Aplicar con `npm run merge-skill -- find-skills`. |
| `owasp-security` | Tercero: agamm/claude-code-owasp (MIT) | 🟡 CONFIABLE | 2026-05-06 | OWASP Top 10:2025, ASVS 5.0, LLM Top 10:2025, Agentic AI Security 2026. Gen=Safe, Socket=0 alerts, Snyk=Low Risk. |

---

## Plugins instalados

Instalados en `~/.claude/plugins/cache/<marketplace>/<plugin>/`. Se gestionan con `claude plugin`.

| Nombre | Marketplace | Origen | Seguridad | Fecha auditoría | Qué aporta |
|---|---|---|---|---|---|
| `skill-creator` | `claude-plugins-official` | Anthropic oficial | 🟢 VERIFICADA | 2026-05-09 | Crear y mejorar skills con ciclo de evaluación iterativo |
| `hookify` | `claude-plugins-official` | Anthropic oficial | 🟢 VERIFICADA | 2026-05-09 | Crear hooks mediante lenguaje natural; sin código ejecutable exfiltrable |
| `security-guidance` | `claude-plugins-official` | Anthropic oficial | 🟢 VERIFICADA | 2026-05-09 | Hook PreToolUse para detectar patrones inseguros en código (eval, XSS, injection). Python revisado, sin red |
| `frontend-design` | `claude-plugins-official` | Anthropic oficial | 🟢 VERIFICADA | 2026-05-09 | Skill de implementación frontend production-grade (full-stack) |
| `claude-md-management` | `claude-plugins-official` | Anthropic oficial | 🟢 VERIFICADA | 2026-05-09 | Audita CLAUDE.md vs codebase; captura learnings de sesión |
| `feature-dev` | `claude-plugins-official` | Anthropic oficial | 🟢 VERIFICADA | 2026-05-09 | Flujo 7 fases con 3 agentes (explorer, architect, reviewer) |
| `code-review` | `claude-plugins-official` | Anthropic oficial | 🟢 VERIFICADA | 2026-05-09 | 4 agentes paralelos con scoring de confianza ≥80 para PRs |
| `pr-review-toolkit` | `claude-plugins-official` | Anthropic oficial | 🟢 VERIFICADA | 2026-05-09 | 6 agentes especializados: comentarios, tests, fallos silenciosos, tipos, calidad, simplificación |
| `plugin-dev` | `claude-plugins-official` | Anthropic oficial | 🟢 VERIFICADA | 2026-05-09 | Toolkit para desarrollar plugins propios: 7 skills + agentes + flujo guiado 8 fases |
| `warp` | `claude-code-warp` | Partner oficial (Warp Terminal) | 🟢 VERIFICADA | preinstalado | Integración con Warp Terminal |

### Marketplaces configurados

| Nombre | Fuente GitHub | Tipo |
|---|---|---|
| `claude-plugins-official` | `anthropics/claude-plugins-official` | Oficial Anthropic |
| `claude-code-warp` | `warpdotdev/claude-code-warp` | Partner oficial |

---

## Historial de auditorías de elementos externos

> Cada vez que se audita un elemento externo con `centinel-auditor`, registrar aquí el resultado.

| Elemento auditado | Tipo | Resultado | Fecha | Notas |
|---|---|---|---|---|
| `soy-rafa/claude-mcp-sentinel` | Repo GitHub / Hook | ⚠️ PRECAUCIÓN | 2026-04-29 | Repo legítimo con buenas intenciones; no instalado como MCP. IOC patterns extraídos e integrados en centinel_iocs.json y centinel-auditor.md |
| `vercel-labs/find-skills` | Skill / SKILL.md | ⚠️ PRECAUCIÓN→🟡 | 2026-04-30 | Fuente legítima (Vercel, MIT, 16.6K stars). Instalada con modificaciones: proceso de instalación requiere centinel-auditor obligatorio (paso 6) y sin flag -y. Riesgo mitigado: el ecosistema skills.sh tiene 13.4% de skills con issues críticos según ToxicSkills/Snyk (2026). Verificaciones de Vercel confirman que sus paquetes npm no fueron comprometidos en el incidente de abril 2026. |
| `agamm/claude-code-owasp` | Skill / SKILL.md | 🟡 CONFIABLE | 2026-05-06 | Tercero individual. MIT. Commits activos (último abr 2026). Sin advisories en GitHub DB. Solo SKILL.md, sin binarios ni scripts de instalación. Contenido defensivo puro. Validación adicional del installer: Gen=Safe, Socket=0, Snyk=Low Risk. |
| `anthropics/claude-plugins-official` (9 plugins) | Plugins / Markdown + Python hooks | 🟢 VERIFICADA | 2026-05-09 | Org Anthropic verificada por GitHub. 18.960 stars, mantenimiento diario. Código ejecutable revisado en security-guidance y hookify: sin red, sin acceso a secretos, fail-safe. Resto son Markdown puro. |

---

## Cómo actualizar este registro

### Al instalar una skill nueva

1. Ejecutar `centinel-auditor` si es de origen externo
2. Añadir una fila a la tabla "Skills activas" con todos los campos:
   - **Origen**: "Creación propia" / "Anthropic oficial" / "Tercero: [nombre del repo]"
   - **Seguridad**: el símbolo correspondiente al resultado de la auditoría
   - **Versión/Fecha**: fecha de instalación o versión si está disponible
3. Si la auditoría generó un informe: añadirlo en "Historial de auditorías"
4. Actualizar la tabla de skills en CLAUDE.md

### Al instalar un plugin nuevo

1. Ejecutar `centinel-auditor` — revisar código ejecutable (hooks, scripts) y llamadas de red
2. Instalar: `claude plugin install <nombre>@<marketplace>`
3. Añadir fila a la tabla "Plugins instalados" con resultado de auditoría
4. Si la auditoría generó un informe: añadirlo en "Historial de auditorías"
5. Actualizar la sección de Plugins en CLAUDE.md

### Al desinstalar una skill o plugin

**Skill:** mover la fila a "Skills desinstaladas o bloqueadas" con el motivo.
**Plugin:** eliminar la fila de la tabla de plugins. Registrar si fue por riesgo.
En ambos casos: actualizar CLAUDE.md eliminando la entrada.

### Al actualizar skills o plugins

**Skills del repo:** `npx --yes github:sanvelasaez/claude-config`
**Skills externas:** `npx skills add <repo@skill> -g` + `npm run merge-skill -- <nombre>`
**Plugins:** `claude plugin update <nombre>`
Actualizar la columna "Versión/Fecha" tras cada actualización.

---

## Sistema de extensiones (skills de terceros modificadas)

Las skills de terceros se instalan SIN modificar desde su fuente upstream. Las personalizaciones se aplican después sobre el archivo instalado.

### Arquitectura

```
skills-extensions/<nombre>/
└── SKILL.ext.md   ← solo este archivo en el repo (nuestras adiciones)

~/.claude/skills/<nombre>/
└── SKILL.md       ← upstream + extensión añadida al final (lo que Claude lee)
```

El `SKILL.ext.md` del repo se añade **al final** del `SKILL.md` instalado, delimitado por marcadores:

```
<!-- EXTENSIÓN: sanvelasaez/claude-config — inicio -->

[contenido de la extensión]

<!-- EXTENSIÓN: sanvelasaez/claude-config — fin -->
```

### Aplicar extensiones

```bash
npm run merge-skill -- find-skills   # una skill concreta
npm run merge-skills                  # todas las que tengan SKILL.ext.md en skills-extensions/
```

El script es idempotente: si ya existe un bloque de extensión, lo reemplaza.

### Extensiones actuales

| Skill | Base source | Extensiones |
|---|---|---|
| `find-skills` | vercel-labs/skills@find-skills (MIT) | Fuentes adicionales, centinel-auditor obligatorio, sin flag -y |
