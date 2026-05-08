# Cómo funciona Claude Code después de la instalación

Referencia para entender el sistema una vez que `npx github:sanvelasaez/claude-config` ha terminado.

---

## 1. Qué carga Claude Code al arrancar

Cuando ejecutas `claude`, el CLI construye el **system prompt** de la sesión concatenando varios bloques en orden:

1. `~/.claude/CLAUDE.md` — instrucciones globales (filosofía, reglas, tabla de skills)
2. `.claude/CLAUDE.md` del proyecto, si existe — contexto específico del proyecto
3. Un **skill listing** automático: Claude Code lee todos los `SKILL.md` de `~/.claude/skills/*/` y `.claude/skills/*/`, extrae el frontmatter de cada uno y construye una tabla interna con `name` y `description`. Esta tabla se incluye en el contexto.

El resultado: antes de ver tu primer mensaje, Claude ya sabe que existen las 13 skills y para qué sirve cada una, pero **no ha leído su contenido completo todavía**. El parámetro `skillListingMaxDescChars` en `settings.json` controla cuántos caracteres de la `description` se incluyen por skill antes de truncar.

---

## 2. Cómo decide Claude qué skill usar

El matching no es automático a nivel de herramienta. Lo hace Claude mismo, guiado por dos mecanismos:

**Las `description` del frontmatter de cada skill** son el trigger. Por ejemplo:

```yaml
---
name: find-skills
description: Descubrir e instalar skills del ecosistema skills.sh cuando el usuario
  pregunta "cómo hago X", "existe una skill para X"...
---
```

Cuando el usuario escribe algo, Claude evalúa si el contexto encaja con alguna descripción. Cuanto más precisa y específica sea la descripción, menos falsos positivos.

**La instrucción explícita en CLAUDE.md** actúa como regla obligatoria:

```
ANTES de cada tarea, verificar internamente:
  1. ¿Existe una skill cuya descripción encaja con este contexto?
  2. Si SÍ  → cargar y aplicar la skill antes de proceder
  3. Si NO  → activar find-skills para buscar si existe algo adecuado
```

Esta instrucción forma parte del system prompt, así que Claude la aplica en cada turno sin necesidad de que el usuario lo pida.

---

## 3. Qué ocurre cuando una skill coincide

Claude llama a la herramienta `Skill` con el nombre de la skill:

```
Skill({ skill: "code-review" })
```

Claude Code lee el archivo completo `~/.claude/skills/code-review/SKILL.md` y lo inyecta en el contexto del turno actual. A partir de ese momento Claude tiene el proceso completo: pasos, criterios, formato de salida. La skill se carga **bajo demanda**, no al inicio. Por eso el skill listing solo incluye nombres y descripciones: cargar el contenido de 13 skills en cada turno sería demasiado costoso en tokens.

---

## 4. El sistema de extensiones — qué ve Claude

**Nada de la estructura interna.** Claude solo lee `~/.claude/skills/<nombre>/SKILL.md`. Los archivos `SKILL.ext.md` del config repo no existen para él.

La arquitectura de extensiones es un mecanismo de mantenimiento para el humano:

```
SKILL.ext.md (en el config repo)
       │
       ▼
merge-skill-extension.js
       │  toma el SKILL.md instalado en ~/.claude/skills/ y le
       │  añade al final el bloque de extensión con marcadores
       ▼
~/.claude/skills/<nombre>/SKILL.md  ← esto es lo que Claude lee
(contenido original + bloque de extensión al final)
```

Cuando Claude Code carga `find-skills`, lee un único archivo que contiene el original upstream más las adiciones propias al final, delimitadas por marcadores HTML. Claude ve todo el contenido como un documento coherente y sigue todas las instrucciones que encuentra, incluyendo las de la extensión.

El valor del sistema es que cuando `npx skills add vercel-labs/skills@find-skills -g` reinstala la skill limpia (sin nuestras adiciones), basta ejecutar `npm run merge-skill -- find-skills` para reaplicar la extensión. Las personalizaciones sobreviven al update porque viven en `SKILL.ext.md` del config repo, que nunca toca el instalador upstream.

---

## 5. Hooks y skills — dos capas completamente independientes

La confusión más común es pensar que están relacionados. No lo están.

**Los hooks** (`centinel_preflight.py`) se ejecutan a nivel de proceso, **fuera** del contexto de Claude. Cuando Claude Code va a ejecutar una herramienta (Bash, Edit, Write…), lanza primero el hook como subprocess y lee su exit code:

- Exit 0 → la herramienta se ejecuta
- Exit 1 → la herramienta se bloquea, Claude recibe un mensaje de error

Esto ocurre **siempre**, independientemente de lo que Claude haya decidido o de qué skill esté aplicando. Es la capa determinista: no puede ser ignorada ni evitada por instrucciones en el contexto.

**Las skills** viven dentro del contexto de Claude, en el espacio de razonamiento. Son instrucciones que Claude sigue, no restricciones externas.

```
Usuario escribe mensaje
       │
       ▼
Claude evalúa skill listing + instrucciones de CLAUDE.md
       │  ¿hay skill aplicable?
       ▼
Claude carga SKILL.md completo (herramienta Skill)
       │
       ▼
Claude decide ejecutar herramienta (Bash, Edit…)
       │
       ▼  ← aquí Claude Code intercepta
centinel_preflight.py (hook, fuera de Claude)
       │  exit 0 o exit 1
       ├─ 0 → herramienta se ejecuta
       └─ 1 → bloqueado, Claude recibe error
```

Un hook puede bloquear `rm -rf /` aunque ninguna skill lo mencione. Una skill puede instruir a Claude a ser cuidadoso con ciertos comandos, pero si Claude los intentara igualmente, el hook los bloquearía de todas formas.

---

## 6. CLAUDE.md como pegamento del sistema

`CLAUDE.md` no es documentación — es system prompt activo. Cada línea forma parte del contexto de Claude en cada turno. Por eso contiene:

- **Tabla de skills con sus triggers** — para que Claude las reconozca sin leer cada SKILL.md
- **Regla de auto-invocación** — para que Claude las aplique antes de cada tarea
- **Comportamientos prohibidos** — restricciones que Claude sigue por instrucción (no por hook)
- **Arquitectura de capas** — para que sepa cuándo delegar a subagentes

Las instrucciones de CLAUDE.md tienen prioridad sobre las preferencias que el usuario exprese en la conversación (están en el system prompt, no en el historial de mensajes). Pero son de menor prioridad que los hooks, porque los hooks operan fuera del contexto de Claude.

---

## 7. Agentes — cuándo y cómo se usan

Los subagentes (`@explorer`, `@reviewer`, etc.) son instancias Claude independientes con su propio contexto. La sesión principal los invoca con la herramienta `Agent`:

```
Agent({ subagent_type: "reviewer", prompt: "revisa estos cambios..." })
```

Cada agente tiene su propio archivo en `~/.claude/agents/<nombre>.md` que define:
- Su modelo (Haiku para @explorer, Sonnet para el resto)
- Sus skills asignadas (las carga automáticamente)
- Su scope y comportamiento

La sesión principal delega cuando la exploración o la especialización consumirían demasiado de su propio contexto. El explorador, por ejemplo, usa Haiku (más rápido y barato) para mapear un codebase sin mezclar esa información con la sesión principal.

---

## 8. Flujo completo de una sesión típica

```
claude (inicio)
  │
  ├─ Lee ~/.claude/CLAUDE.md
  ├─ Lee .claude/CLAUDE.md del proyecto (si existe)
  ├─ Lee todos los SKILL.md → construye skill listing
  │
  └─ Sesión activa
       │
       ├─ Usuario escribe → Claude evalúa skill listing
       │      │ match → Skill({ skill: "..." }) → carga SKILL.md completo
       │      └─ no match → find-skills o criterio propio
       │
       ├─ Claude decide herramienta → hook intercepta → ejecuta o bloquea
       │
       ├─ Tarea compleja → Agent({ subagent_type: "..." }) → instancia independiente
       │
       └─ Fin de turno
```
