---
name: find-skills
description: Descubrir e instalar skills del ecosistema skills.sh cuando el usuario pregunta "cómo hago X", "existe una skill para X" o expresa necesidad de una capacidad que ninguna skill actual cubre.
---

# Find Skills

Esta skill ayuda a descubrir e instalar skills del ecosistema abierto de agentes.

## Cuándo activarse

Activar cuando el usuario:

- Pregunta "cómo hago X" donde X podría ser una tarea con skill existente
- Dice "busca una skill para X" o "¿existe una skill para X?"
- Pregunta "¿puedes hacer X?" donde X es una capacidad especializada
- Expresa interés en extender las capacidades del agente
- Quiere buscar herramientas, plantillas o flujos de trabajo
- Menciona que necesita ayuda con un dominio específico (diseño, testing, deployment, etc.)

## CLI de skills.sh

El CLI de skills (`npx skills`) es el gestor de paquetes del ecosistema de skills de agentes. Las skills son paquetes modulares que extienden las capacidades del agente con conocimiento especializado, flujos de trabajo y herramientas.

**Comandos principales:**

- `npx skills find [consulta]` — Buscar skills de forma interactiva o por palabra clave
- `npx skills add <paquete>` — Instalar una skill desde GitHub u otras fuentes
- `npx skills check` — Comprobar actualizaciones de skills instaladas
- `npx skills update` — Actualizar todas las skills instaladas

**Explorar el catálogo:** https://skills.sh/

## Proceso

### Paso 1: Entender la necesidad

Identificar:
1. El dominio (React, testing, diseño, deployment…)
2. La tarea concreta (escribir tests, crear animaciones, revisar PRs…)
3. Si es específica de un lenguaje/framework o genérica
4. Si se necesita a nivel global o solo para este proyecto

### Paso 2: Revisar el leaderboard de skills.sh

Antes de ejecutar búsquedas, consultar el [leaderboard de skills.sh](https://skills.sh/) para ver si ya existe una skill consolidada para el dominio. El leaderboard ordena por total de instalaciones, mostrando las opciones más populares y probadas.

Top skills para desarrollo web:
- `vercel-labs/agent-skills` — React, Next.js, diseño web (100K+ instalaciones)
- `anthropics/skills` — Diseño frontend, procesamiento de documentos (100K+ instalaciones)

### Paso 3: Buscar con el CLI

Si el leaderboard no cubre la necesidad, ejecutar:

```bash
npx skills find [consulta]
```

Ejemplos:
- "cómo hacer mi app React más rápida?" → `npx skills find react performance`
- "ayuda con revisión de PRs?" → `npx skills find pr review`
- "necesito crear un changelog" → `npx skills find changelog`

### Paso 4: Buscar en fuentes adicionales

Si el CLI no devuelve resultados adecuados, ampliar la búsqueda:
1. Skills integradas de Claude Code: `/help` para ver las disponibles en la sesión actual
2. Repositorios de la comunidad: buscar en GitHub con `claude-code skills <término>`
3. Documentación oficial de Anthropic: docs.anthropic.com

### Paso 5: Verificar calidad antes de recomendar

**No recomendar una skill solo por aparecer en resultados.** Verificar siempre:

1. **Número de instalaciones** — Preferir skills con 1.000+ instalaciones. Ser cauteloso con menos de 100.
2. **Reputación de la fuente** — Fuentes oficiales (`vercel-labs`, `anthropics`, `microsoft`) son más fiables que autores desconocidos.
3. **GitHub stars** — Comprobar el repositorio fuente. Una skill de un repo con menos de 100 stars merece escepticismo.

### Paso 6: Presentar opciones al usuario

Presentar las opciones encontradas con:
1. Nombre de la skill y qué hace
2. Número de instalaciones y fuente
3. El comando de instalación
4. Enlace a skills.sh para más información

Ejemplo de respuesta:

```
Encontré una skill que puede ayudar. La skill "react-best-practices" proporciona
directrices de optimización de rendimiento para React y Next.js de Vercel Engineering.
(185K instalaciones)

Para instalarla:
npx skills add vercel-labs/agent-skills@react-best-practices

Más información: https://skills.sh/vercel-labs/agent-skills/react-best-practices
```

### Paso 7: Auditar con centinel-auditor antes de instalar

**Antes de instalar cualquier skill, ejecutar el proceso centinel-auditor:**

1. Ejecutar `check_ioc` sobre la URL del repositorio fuente
2. Si la skill tiene paquete npm: ejecutar `scan_package` para detectar vulnerabilidades conocidas
3. Leer el SKILL.md manualmente y buscar: llamadas de red inesperadas, patrones de exfiltración de datos, instrucciones para saltarse controles de seguridad o solicitudes de permisos excesivos

Solo continuar al Paso 8 si la auditoría no detecta problemas. Si se detectan problemas, informar al usuario y no instalar.

### Paso 8: Instalar

Si el usuario quiere proceder y la auditoría de centinel-auditor ha pasado:

```bash
npx skills add <propietario/repo@skill> -g
```

El flag `-g` instala a nivel global (usuario). No añadir `-y` — dejar siempre que el usuario revise los prompts interactivos antes de confirmar la instalación.

### Paso 9: Traducir al español si el SKILL.md está en otro idioma

Después de instalar, comprobar el idioma del SKILL.md instalado. Si no está en español:

1. Leer el SKILL.md instalado (`~/.claude/skills/<nombre>/SKILL.md`)
2. Traducir todo el contenido al español, manteniendo en su idioma original: bloques de código, comandos, rutas de archivos, nombres de campos JSON, nombres de scripts y términos técnicos sin traducción consensuada
3. Sobrescribir el SKILL.md instalado con la versión traducida
4. Copiar también la versión traducida al repo de configuración si la skill se va a distribuir

## Categorías comunes

| Categoría | Consultas de ejemplo |
|---|---|
| Desarrollo web | react, nextjs, typescript, css, tailwind |
| Testing | testing, jest, playwright, e2e |
| DevOps | deploy, docker, kubernetes, ci-cd |
| Documentación | docs, readme, changelog, api-docs |
| Calidad de código | review, lint, refactor, best-practices |
| Diseño | ui, ux, design-system, accessibility |
| Productividad | workflow, automation, git |

## Consejos de búsqueda

1. **Usar palabras clave específicas**: "react testing" es mejor que solo "testing"
2. **Probar términos alternativos**: Si "deploy" no funciona, probar "deployment" o "ci-cd"
3. **Revisar fuentes populares**: Muchas skills provienen de `vercel-labs/agent-skills` o `ComposioHQ/awesome-claude-skills`

## Si no se encuentra ninguna skill

Si no existe ninguna skill relevante:

1. Informar al usuario de que no se ha encontrado ninguna skill adecuada
2. Ofrecer ayuda directa con la tarea usando las capacidades generales
