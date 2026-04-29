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
| 🔴 **BLOQUEADA** | No usar — riesgo identificado en auditoría de external-source-auditor |
| ⚪ **PENDIENTE** | Pendiente de auditoría con external-source-auditor |

---

## Skills activas

| Nombre | Origen | Seguridad | Versión/Fecha | Notas |
|---|---|---|---|---|
| `external-source-auditor` | Creación propia | 🔵 PROPIA | 2026-04 | Skill de seguridad base — prioridad máxima |
| `skill-finder` | Creación propia | 🔵 PROPIA | 2026-04 | Búsqueda de skills — prioridad máxima |
| `code-review` | Creación propia | 🔵 PROPIA | 2026-04 | Revisión de código pre-merge |
| `security-audit` | Creación propia | 🔵 PROPIA | 2026-04 | Auditoría OWASP y autenticación |
| `test-writer` | Creación propia | 🔵 PROPIA | 2026-04 | Generación de tests unitarios e integración |
| `debug-tracer` | Creación propia | 🔵 PROPIA | 2026-04 | Depuración sistemática con hipótesis |
| `arch-patterns` | Creación propia | 🔵 PROPIA | 2026-04 | Patrones de diseño y arquitectura |
| `doc-writer` | Creación propia | 🔵 PROPIA | 2026-04 | Documentación técnica inline y de módulo |
| `ui-design-review` | Creación propia | 🔵 PROPIA | 2026-04 | Revisión visual y accesibilidad WCAG |
| `perf-profiler` | Creación propia | 🔵 PROPIA | 2026-04 | Análisis de rendimiento basado en métricas |
| `reflection` | Creación propia | 🔵 PROPIA | 2026-04 | Análisis de sesión para mejora continua |

---

## Skills desinstaladas o bloqueadas

| Nombre | Motivo | Fecha |
|---|---|---|
| — | — | — |

---

## Historial de auditorías de elementos externos

> Cada vez que se audita un elemento externo con `external-source-auditor`, registrar aquí el resultado.

| Elemento auditado | Tipo | Resultado | Fecha | Notas |
|---|---|---|---|---|
| — | — | — | — | — |

---

## Cómo actualizar este registro

### Al instalar una skill nueva

1. Ejecutar `external-source-auditor` si es de origen externo
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

1. Si es de origen externo: repetir la auditoría con `external-source-auditor`
2. Actualizar la columna "Versión/Fecha" en la tabla
3. Si el resultado de la auditoría cambia: actualizar el símbolo de seguridad y registrar en el historial
