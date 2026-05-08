# 📋 Registro de Skills Instaladas

> Este archivo registra todas las skills activas, su origen, estado de seguridad y fecha de incorporación.
> Se actualiza cada vez que se instala, desinstala o actualiza una skill.
> Última actualización: 2026-04

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

| Nombre | Origen | Seguridad | Versión/Fecha | Notas |
|---|---|---|---|---|
| `centinel-auditor` | Creación propia | 🔵 PROPIA | 2026-04 | Skill de seguridad base — prioridad máxima. Enriquecida con IOCs de MCP Sentinel |
| `centinel-update` | Creación propia | 🔵 PROPIA | 2026-04 | Mantenimiento de IOCs, hooks y skills — checklist trimestral + respuesta a incidentes |
| `code-review` | Creación propia | 🔵 PROPIA | 2026-04 | Revisión de código pre-merge |
| `security-audit` | Creación propia | 🔵 PROPIA | 2026-04 | Auditoría OWASP y autenticación |
| `test-writer` | Creación propia | 🔵 PROPIA | 2026-04 | Generación de tests unitarios e integración |
| `debug-tracer` | Creación propia | 🔵 PROPIA | 2026-04 | Depuración sistemática con hipótesis |
| `arch-patterns` | Creación propia | 🔵 PROPIA | 2026-04 | Patrones de diseño y arquitectura |
| `doc-writer` | Creación propia | 🔵 PROPIA | 2026-04 | Documentación técnica inline y de módulo |
| `ui-design-review` | Creación propia | 🔵 PROPIA | 2026-04 | Revisión visual y accesibilidad WCAG |
| `perf-profiler` | Creación propia | 🔵 PROPIA | 2026-04 | Análisis de rendimiento basado en métricas |
| `reflection` | Creación propia | 🔵 PROPIA | 2026-04 | Análisis de sesión para mejora continua |
| `find-skills` | Tercero: vercel-labs/skills (MIT) + Extensiones propias | 🟡 CONFIABLE | 2026-05-08 | Instalada upstream. Extensiones en repo (`SKILL.ext.md`): fuentes adicionales (GitHub, /help, docs Anthropic), centinel-auditor obligatorio antes de instalar, sin flag -y. Aplicar con `npm run merge-skill -- find-skills`. |
| `skill-creator` | Tercero: anthropics/skills (Apache 2.0) | 🟢 VERIFICADA | 2026-04-30 | Instalada upstream sin modificaciones. 177.3K installs. Gen=Safe, Socket=0, Snyk=Low Risk. Instalar con `npx skills add anthropics/skills@skill-creator -g`. |
| `owasp-security` | Tercero: agamm/claude-code-owasp (MIT) | 🟡 CONFIABLE | 2026-05-06 | OWASP Top 10:2025, ASVS 5.0, LLM Top 10:2025, Agentic AI Security 2026. Instalada con `npx skills add agamm/claude-code-owasp -g -y`. Gen=Safe, Socket=0 alerts, Snyk=Low Risk. Pendiente: fusionar formato de output y checklist de `security-audit`. |

---

## Skills desinstaladas o bloqueadas

| Nombre | Motivo | Fecha |
|---|---|---|
| `skill-finder` | Fusionada en `find-skills` | 2026-04-30 |

---

## Historial de auditorías de elementos externos

> Cada vez que se audita un elemento externo con `centinel-auditor`, registrar aquí el resultado.

| Elemento auditado | Tipo | Resultado | Fecha | Notas |
|---|---|---|---|---|
| `soy-rafa/claude-mcp-sentinel` | Repo GitHub / Hook | ⚠️ PRECAUCIÓN | 2026-04-29 | Repo legítimo con buenas intenciones; no instalado como MCP. IOC patterns extraídos e integrados en centinel_iocs.json y centinel-auditor.md |
| `vercel-labs/find-skills` | Skill / SKILL.md | ⚠️ PRECAUCIÓN→🟡 | 2026-04-30 | Fuente legítima (Vercel, MIT, 16.6K stars). Instalada con modificaciones: proceso de instalación requiere centinel-auditor obligatorio (paso 6) y sin flag -y. Riesgo mitigado: el ecosistema skills.sh tiene 13.4% de skills con issues críticos según ToxicSkills/Snyk (2026). Verificaciones de Vercel confirman que sus paquetes npm no fueron comprometidos en el incidente de abril 2026. |
| `anthropics/skills@skill-creator` | Skill / SKILL.md + scripts + agentes | 🟢 APROBADA | 2026-04-30 | Anthropic oficial (127K stars, Apache 2.0). Gen=Safe, Socket=0 alertas, Snyk=Low Risk. SKILL.md analizado: sin llamadas de red inesperadas, sin exfiltración, con sección de seguridad explícita. Traducida al español tras instalación. |
| `agamm/claude-code-owasp` | Skill / SKILL.md | 🟡 CONFIABLE | 2026-05-06 | Tercero individual. MIT. Commits activos (último abr 2026). Sin advisories en GitHub DB. Solo SKILL.md, sin binarios ni scripts de instalación. Contenido defensivo puro. Validación adicional del installer: Gen=Safe, Socket=0, Snyk=Low Risk. |

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

### Al desinstalar una skill

1. Mover la fila de "Skills activas" a "Skills desinstaladas o bloqueadas"
2. Registrar el motivo (desinstalada voluntariamente / bloqueada por riesgo / sustituida por otra)
3. Actualizar CLAUDE.md eliminando la skill de la tabla

### Al actualizar una skill existente

**Método automático (recomendado):**
```
node scripts/update-skills.js          # actualiza todo
node scripts/update-skills.js --check  # dry-run, ver qué cambiaría
```
O desde Claude Code con el slash command: `/update-skills`

El script lee `scripts/skills-manifest.json` para saber:
- Qué skills están en el **config repo** (se actualizan con `npx --yes github:sanvelasaez/claude-config`)
- Qué skills son **externas** (se actualizan con su `npx skills add` específico)

**Pasos manuales siempre necesarios después:**
1. Si es de origen externo: repetir la auditoría con `centinel-auditor`
2. Actualizar la columna "Versión/Fecha" en la tabla de skills activas
3. Si el resultado de la auditoría cambia: actualizar el símbolo de seguridad y registrar en el historial

**Para añadir una nueva skill externa al mantenimiento automático:**
1. Auditar con `centinel-auditor`
2. Añadir entrada en `scripts/skills-manifest.json` → sección `external_skills`
3. Añadir fila en la tabla de skills activas de este archivo

---

## Sistema de extensiones (skills de terceros modificadas)

Las skills de terceros se instalan SIN modificar desde su fuente upstream. Las personalizaciones se aplican después sobre el archivo instalado.

### Arquitectura

```
skills/<nombre>/
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
npm run merge-skills                  # todas las que tengan SKILL.ext.md
```

El script es idempotente: si ya existe un bloque de extensión, lo reemplaza.

### Flujo al actualizar una skill de terceros

```
npx skills add <repo@skill> -g        # reinstala upstream limpio
npm run merge-skill -- <nombre>        # reaplica la extensión
```

`update-skills.js --external` hace ambos pasos automáticamente.

### Extensiones actuales

| Skill | Base source | Extensiones |
|---|---|---|
| `find-skills` | vercel-labs/skills@find-skills (MIT) | Fuentes adicionales, centinel-auditor obligatorio, sin flag -y |
