# 🤖 agent-coordination.md — Coordinación de Equipos de Agentes

> Flujo de trabajo multi-agente opcional. **Inactivo por defecto.** Requiere activación explícita por proyecto.
> Ubicación: `~/.claude/agent-coordination.md`

---

## ⚙️ Cómo activar en un proyecto

**Paso 1 — Importar el archivo en el CLAUDE.md del proyecto**

Añadir esta línea al `.claude/CLAUDE.md` del proyecto:

```
@~/.claude/agent-coordination.md
```

**Paso 2 — Crear el directorio de coordinación**

En la raíz del proyecto, crear `.agent/` con los archivos base:

```bash
mkdir .agent
touch .agent/BACKLOG.md .agent/TASKS.md .agent/DECISIONS.md .agent/BLOCKERS.md .agent/PROGRESS.md .agent/ISSUES.md
```

Commitear el directorio vacío para que todos los agentes lo vean desde el primer momento.

---

## 📁 Directorio de coordinación `.agent/`

El directorio `.agent/` es el espacio de trabajo compartido entre todos los agentes del proyecto.
Está commiteado en el repositorio. Los agentes lo leen y escriben; el usuario lo consulta.

```
.agent/
├── BACKLOG.md      ← Inbox del usuario: peticiones de features/bugs pendientes de procesar
├── TASKS.md        ← Tablón de tareas: pendiente / en progreso / interrumpida / completada
├── DECISIONS.md    ← Registro de decisiones técnicas autónomas con contexto y alternativas
├── BLOCKERS.md     ← Impedimentos que requieren intervención del usuario (con pregunta concreta)
├── PROGRESS.md     ← Resumen de progreso por fase para consulta rápida
└── ISSUES.md       ← Incidencias de calidad detectadas por agentes
```

**Regla de propiedad:**
- `BACKLOG.md` → lo escribe el usuario, el orquestador solo elimina líneas ya procesadas
- El resto → los agentes leen y escriben; el usuario consulta

---

## 📋 Protocolos y formatos de archivo

### BACKLOG.md — Inbox del usuario

El usuario añade una línea por petición. El orquestador lo consulta al inicio de cada sesión y cuando el usuario lo indica.

**Formato de entrada (usuario):**
```
[FEATURE] Descripción breve de la funcionalidad deseada
[BUG] Descripción breve del error
[REFACTOR] Descripción breve de lo que refactorizar
Sin etiqueta → se asume FEATURE por defecto
```

**Ciclo de procesamiento (orquestador):**
1. Leer todas las líneas de BACKLOG.md
2. Convertir cada línea en una tarea formal en TASKS.md (con ID, agente, dependencias)
3. Si requiere decisión arquitectónica: documentar en DECISIONS.md antes de crear la tarea
4. Eliminar la línea procesada de BACKLOG.md
5. Nunca escribir en BACKLOG.md excepto para eliminar líneas ya procesadas

---

### TASKS.md — Tablón de tareas

```markdown
## [FASE N] Nombre de la fase actual

### En progreso
| ID | Tarea | Agente | Branch | Inicio |
|----|-------|--------|--------|--------|
| T-001 | Descripción de la tarea | nombre-agente | feature/nombre | YYYY-MM-DD |

### Pendiente
| ID | Tarea | Agente asignado | Dependencias | Notas |
|----|-------|----------------|--------------|-------|
| T-002 | Descripción | nombre-agente | T-001 | |
| T-003 | Descripción | nombre-agente | — | REINTENTAR |

### Interrumpida (agente caído con trabajo parcial)
| ID | Tarea | Branch | Último commit | Qué falta |
|----|-------|--------|--------------|-----------|
| T-004 | Descripción | feature/nombre | abc1234 | Descripción concreta de lo que falta |

### Completada
| ID | Tarea | Branch mergeado | Fecha |
|----|-------|----------------|-------|
| T-000 | Descripción | develop | YYYY-MM-DD |
```

**Reglas del orquestador sobre TASKS.md:**
- Actualizar TASKS.md **antes** de asignar cualquier tarea y **después** de que se complete
- Nunca asignar a dos agentes tareas que modifiquen el mismo archivo simultáneamente
- Las tareas en estado "Interrumpida" tienen prioridad sobre las "Pendiente" al recuperar un agente

---

### DECISIONS.md — Registro de decisiones técnicas

Cuando el orquestador o un agente toma una decisión arquitectónica de forma autónoma, debe documentarla aquí **antes de implementar**.

**Regla para todos los agentes:** Ante cualquier ambigüedad técnica o decisión de diseño, consultar DECISIONS.md primero. Si existe una decisión previa relevante, respetarla. Si no existe y la decisión es significativa, documentarla antes de proceder.

```markdown
## DEC-001 — Título de la decisión

- **Fecha:** YYYY-MM-DD
- **Agente:** orchestrator / nombre-agente
- **Contexto:** Por qué fue necesaria esta decisión (situación, restricción, requisito)
- **Decisión:** Qué se decidió hacer exactamente
- **Alternativas descartadas:** Qué otras opciones había y por qué no se eligieron
- **Impacto:** Qué archivos, módulos o capas afecta
```

---

### BLOCKERS.md — Impedimentos para el usuario

Cuando un agente no puede continuar sin información o decisión del usuario, lo documenta aquí en lugar de interrumpir directamente.

El orquestador agrupa los blockers y los presenta al usuario en un único momento, evitando interrupciones fragmentadas.

```markdown
## BLOCKER-001 — Título del impedimento

- **Fecha:** YYYY-MM-DD
- **Agente que lo detecta:** nombre-agente
- **Tarea bloqueada:** T-XXX
- **Descripción:** Qué está bloqueado y por qué no puede resolverse autónomamente
- **Información necesaria:** Pregunta concreta y específica al usuario (una sola pregunta por blocker)
- **Estado:** PENDIENTE / RESUELTO
```

**Cuándo crear un BLOCKER** (y no interrumpir directamente):
- Información de negocio no especificada que el agente no puede inferir
- Credenciales o accesos externos que el agente no tiene
- Decisiones que afectarían irreversiblemente la arquitectura

---

### PROGRESS.md — Progreso por fase

```markdown
## Fase N — Estado general: EN PROGRESO / COMPLETADA

| Módulo | Completadas | Total | % |
|--------|-------------|-------|---|
| módulo-a | 3 | 5 | 60% |
| módulo-b | 1 | 6 | 17% |

**Última actualización:** YYYY-MM-DD por orchestrator
```

---

### ISSUES.md — Incidencias de calidad

```markdown
## ISSUE-001 — Descripción breve

- **Detectado por:** nombre-agente
- **Fecha:** YYYY-MM-DD
- **Tarea relacionada:** T-XXX
- **Descripción:** Qué problema de calidad se ha encontrado
- **Severidad:** CRÍTICO / ALTO / MEDIO / BAJO
- **Estado:** ABIERTO / EN REVISIÓN / RESUELTO
```

---

## 🔄 Protocolo de recuperación de agente caído

Cuando el monitor de agentes (configurado en la sesión principal) detecta que un agente no responde, el orquestador sigue este protocolo obligatoriamente. **Nunca ejecutar directamente el trabajo del agente caído.**

### Paso 1 — Evaluar el estado real antes de actuar
```bash
git status
git log --oneline -5
```
Ejecutar en la rama del agente caído para saber exactamente qué hay commiteado y qué no.

### Paso 2 — Actualizar TASKS.md con el estado exacto
- Sin commit → tarea vuelve a **Pendiente** con nota `REINTENTAR`
- Commit parcial → tarea pasa a **Interrumpida** con descripción de qué archivos están creados y qué falta

### Paso 3 — Lanzar el agente de reemplazo con contexto completo

El nuevo agente recibe siempre estos tres datos en su prompt inicial:
1. Descripción completa de la tarea desde TASKS.md
2. Resultado de `git status` y `git log --oneline -5` de su rama
3. Instrucción explícita: *"Retoma desde donde se quedó el agente anterior. No reescribas lo que ya está commiteado."*

### Lo que el orquestador NUNCA debe hacer
- Ejecutar él mismo el trabajo de un agente especializado
- Crear un agente nuevo sin pasarle el contexto del estado actual
- Lanzar más de un agente de reemplazo para la misma tarea simultáneamente

---

## ⚡ Reglas del orquestador en modo multi-agente

Estas reglas complementan las de la sesión principal del CLAUDE.md global.

1. Leer `.agent/BACKLOG.md` al inicio de cada sesión y procesar todas las peticiones pendientes
2. Mantener `.agent/TASKS.md` actualizado antes de asignar cualquier tarea y después de completarla
3. Asignar en paralelo solo tareas de módulos o capas **independientes** entre sí
4. **Nunca asignar a dos agentes tareas que modifiquen el mismo archivo simultáneamente**
5. Revisar el diff de cada agente antes de mergear su rama a `develop`
6. Documentar en `DECISIONS.md` cualquier decisión arquitectónica autónoma antes de implementarla
7. Interrumpir al usuario **únicamente** para:
   - Información de negocio no especificada en ningún documento del proyecto
   - Credenciales o accesos externos
   - Decisiones que afectarían irreversiblemente la arquitectura
   - Blockers acumulados que impiden avanzar
