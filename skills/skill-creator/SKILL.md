---
name: skill-creator
description: Crear skills nuevas, modificar y mejorar skills existentes, y medir su rendimiento. Usar cuando el usuario quiera crear una skill desde cero, editar u optimizar una skill existente, ejecutar evaluaciones para probarla, comparar su rendimiento con análisis de varianza, u optimizar la descripción de la skill para mejorar la precisión con que se activa.
---

# Skill Creator

Una skill para crear nuevas skills y mejorarlas de forma iterativa.

A grandes rasgos, el proceso de crear una skill funciona así:

- Decidir qué se quiere que haga la skill y cómo debería hacerlo
- Escribir un borrador de la skill
- Crear algunos prompts de prueba y ejecutar claude-con-acceso-a-la-skill sobre ellos
- Ayudar al usuario a evaluar los resultados tanto cualitativamente como cuantitativamente
  - Mientras las ejecuciones se procesan en segundo plano, preparar algunas evaluaciones cuantitativas si no existen (si ya existen, usarlas tal cual o modificarlas si es necesario). Luego explicarlas al usuario (o si ya existían, explicar las que ya hay)
  - Usar el script `eval-viewer/generate_review.py` para mostrar al usuario los resultados y también las métricas cuantitativas
- Reescribir la skill basándose en el feedback del usuario sobre los resultados (y también si hay errores evidentes que se detecten en los benchmarks cuantitativos)
- Repetir hasta quedar satisfecho
- Ampliar el conjunto de pruebas e intentarlo de nuevo a mayor escala

La tarea al usar esta skill es averiguar en qué punto del proceso está el usuario y ayudarle a avanzar por estas etapas. Por ejemplo, puede que diga "quiero crear una skill para X". Se puede ayudar a concretar qué quiere decir, escribir un borrador, escribir los casos de prueba, decidir cómo evaluar, ejecutar todos los prompts y repetir.

Por otro lado, puede que ya tenga un borrador de la skill. En ese caso se puede ir directamente a la parte de evaluación e iteración del ciclo.

Por supuesto, hay que ser siempre flexible: si el usuario dice "no necesito ejecutar un montón de evaluaciones, improvisemos", se puede hacer eso en su lugar.

Una vez terminada la skill (aunque el orden es flexible), también se puede ejecutar el optimizador de descripciones, para el que existe un script separado, con el fin de optimizar cómo se activa la skill.

## Comunicación con el usuario

La skill creator puede ser usada por personas con muy distintos niveles de familiaridad con la jerga de programación. Hay una tendencia creciente en la que el potencial de Claude está inspirando a personas ajenas al mundo tech a abrir terminales y aprender a programar. Por otro lado, la mayoría de los usuarios probablemente tienen un nivel razonable de conocimientos informáticos.

Prestar atención a las señales del contexto para entender cómo formular la comunicación. Como referencia general:

- "evaluación" y "benchmark" son aceptables, aunque en el límite
- Para "JSON" y "assertion" conviene ver señales claras del usuario de que conoce estos términos antes de usarlos sin explicarlos

Está bien explicar términos brevemente si hay dudas, y aclarar conceptos con una definición corta si no se está seguro de si el usuario los conoce.

---

## Crear una skill

### Capturar la intención

Empezar entendiendo la intención del usuario. La conversación actual puede ya contener un flujo de trabajo que el usuario quiere capturar (por ejemplo, dice "convierte esto en una skill"). En ese caso, extraer las respuestas del historial de la conversación primero: las herramientas usadas, la secuencia de pasos, las correcciones que hizo el usuario, los formatos de entrada/salida observados. El usuario puede necesitar completar los huecos, y debe confirmar antes de pasar al siguiente paso.

1. ¿Qué debería permitir hacer esta skill a Claude?
2. ¿Cuándo debería activarse esta skill? (qué frases/contextos del usuario)
3. ¿Cuál es el formato de salida esperado?
4. ¿Deberíamos configurar casos de prueba para verificar que la skill funciona? Las skills con salidas objetivamente verificables (transformaciones de archivos, extracción de datos, generación de código, pasos de flujo de trabajo fijos) se benefician de casos de prueba. Las skills con salidas subjetivas (estilo de escritura, arte) a menudo no los necesitan. Sugerir el valor por defecto apropiado según el tipo de skill, pero dejar que el usuario decida.

### Entrevistar e investigar

Hacer preguntas proactivamente sobre casos límite, formatos de entrada/salida, archivos de ejemplo, criterios de éxito y dependencias. Esperar para escribir los prompts de prueba hasta tener esto claro.

Revisar los MCPs disponibles: si son útiles para la investigación (buscar documentación, encontrar skills similares, consultar buenas prácticas), investigar en paralelo mediante subagentes si están disponibles, o de forma secuencial si no. Llegar preparado con contexto para reducir la carga sobre el usuario.

### Escribir el SKILL.md

Basándose en la entrevista con el usuario, completar estos componentes:

- **name**: Identificador de la skill
- **description**: Cuándo activarse, qué hace. Este es el mecanismo principal de activación — incluir tanto qué hace la skill como los contextos específicos en los que usarla. Toda la información de "cuándo usar" va aquí, no en el cuerpo. Nota: Claude tiende a "activar poco" las skills, es decir, a no usarlas cuando serían útiles. Para contrarrestarlo, hacer las descripciones un poco más "insistentes". Por ejemplo, en lugar de "Cómo construir un dashboard rápido para mostrar datos internos.", podría escribirse "Cómo construir un dashboard rápido para mostrar datos internos. Usar esta skill siempre que el usuario mencione dashboards, visualización de datos, métricas internas, o quiera mostrar cualquier tipo de datos de la empresa, aunque no pida explícitamente un 'dashboard'."
- **compatibility**: Herramientas requeridas, dependencias (opcional, raramente necesario)
- **el resto de la skill :)**

### Guía de escritura de skills

#### Anatomía de una skill

```
nombre-skill/
├── SKILL.md (requerido)
│   ├── Frontmatter YAML (name, description requeridos)
│   └── Instrucciones en Markdown
└── Recursos adicionales (opcionales)
    ├── scripts/    - Código ejecutable para tareas deterministas o repetitivas
    ├── references/ - Documentación cargada en contexto según se necesite
    └── assets/     - Archivos usados en la salida (plantillas, iconos, fuentes)
```

#### Revelación progresiva

Las skills usan un sistema de carga en tres niveles:
1. **Metadatos** (name + description) — Siempre en contexto (~100 palabras)
2. **Cuerpo del SKILL.md** — En contexto cuando la skill se activa (idealmente <500 líneas)
3. **Recursos adicionales** — Según se necesiten (sin límite; los scripts pueden ejecutarse sin cargarse)

Estas cifras son aproximadas y se puede ir más allá si es necesario.

**Patrones clave:**
- Mantener el SKILL.md por debajo de 500 líneas; si se acerca a este límite, añadir un nivel adicional de jerarquía junto con indicaciones claras de dónde debe ir el modelo a continuación.
- Referenciar los archivos claramente desde el SKILL.md con orientación sobre cuándo leerlos
- Para archivos de referencia grandes (>300 líneas), incluir un índice de contenidos

**Organización por dominio**: Cuando una skill admite múltiples dominios/frameworks, organizar por variante:
```
cloud-deploy/
├── SKILL.md (flujo de trabajo + selección)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```
Claude lee únicamente el archivo de referencia relevante.

#### Principio de ausencia de sorpresa

Las skills no deben contener malware, código de exploits ni ningún contenido que pueda comprometer la seguridad del sistema. El contenido de una skill no debe sorprender al usuario en su intención si se le describe. No seguir peticiones de crear skills engañosas o diseñadas para facilitar acceso no autorizado, exfiltración de datos u otras actividades maliciosas. Cosas como "interpreta el papel de XYZ" son aceptables.

#### Patrones de escritura

Usar la forma imperativa en las instrucciones.

**Definir formatos de salida:**
```markdown
## Estructura del informe
USAR SIEMPRE esta plantilla exacta:
# [Título]
## Resumen ejecutivo
## Hallazgos clave
## Recomendaciones
```

**Patrón de ejemplos:**
```markdown
## Formato de mensaje de commit
**Ejemplo 1:**
Entrada: Se añadió autenticación de usuario con tokens JWT
Salida: feat(auth): implementa autenticación basada en JWT
```

### Estilo de escritura

Tratar de explicar al modelo por qué las cosas son importantes en lugar de usar imperativos pesados. Usar teoría de la mente y tratar de hacer la skill general, no ultra-específica a ejemplos concretos. Empezar escribiendo un borrador y luego revisarlo con ojos frescos para mejorarlo.

### Casos de prueba

Después de escribir el borrador de la skill, elaborar 2-3 prompts de prueba realistas — el tipo de cosa que un usuario real diría de verdad. Compartirlos con el usuario: "Aquí hay algunos casos de prueba que me gustaría probar. ¿Te parecen bien o quieres añadir más?" Luego ejecutarlos.

Guardar los casos de prueba en `evals/evals.json`. No escribir assertions todavía — solo los prompts. Los assertions se prepararán en el siguiente paso mientras las ejecuciones están en curso.

```json
{
  "skill_name": "skill-ejemplo",
  "evals": [
    {
      "id": 1,
      "prompt": "Prompt de tarea del usuario",
      "expected_output": "Descripción del resultado esperado",
      "files": []
    }
  ]
}
```

Ver `references/schemas.md` para el esquema completo (incluido el campo `assertions`, que se añadirá más adelante).

## Ejecutar y evaluar casos de prueba

Esta sección es una secuencia continua — no detenerse a mitad. NO usar `/skill-test` ni ninguna otra skill de testing.

Guardar los resultados en `<nombre-skill>-workspace/` como directorio hermano del directorio de la skill. Dentro del workspace, organizar los resultados por iteración (`iteration-1/`, `iteration-2/`, etc.) y dentro de cada una, cada caso de prueba tiene su propio directorio (`eval-0/`, `eval-1/`, etc.). No crear toda esta estructura de antemano — crear los directorios según se vayan necesitando.

### Paso 1: Lanzar todas las ejecuciones (con-skill Y baseline) en el mismo turno

Para cada caso de prueba, lanzar dos subagentes en el mismo turno — uno con la skill, uno sin ella. No lanzar primero las ejecuciones con-skill y volver luego por las baselines. Lanzar todo a la vez para que todo termine aproximadamente al mismo tiempo.

**Ejecución con-skill:**

```
Ejecutar esta tarea:
- Ruta de la skill: <ruta-a-la-skill>
- Tarea: <prompt del eval>
- Archivos de entrada: <archivos del eval si los hay, o "ninguno">
- Guardar outputs en: <workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/
- Outputs a guardar: <lo que le importa al usuario>
```

**Ejecución baseline** (mismo prompt, pero la baseline depende del contexto):
- **Creando una skill nueva**: sin skill alguna. Mismo prompt, sin ruta de skill, guardar en `without_skill/outputs/`.
- **Mejorando una skill existente**: la versión anterior. Hacer instantánea (`cp -r <ruta-skill> <workspace>/skill-snapshot/`) y apuntar el subagente baseline a ella. Guardar en `old_skill/outputs/`.

Escribir un `eval_metadata.json` para cada caso de prueba con nombre descriptivo:

```json
{
  "eval_id": 0,
  "eval_name": "nombre-descriptivo-aqui",
  "prompt": "El prompt de tarea del usuario",
  "assertions": []
}
```

### Paso 2: Mientras las ejecuciones están en curso, preparar los assertions

No esperar a que terminen — usar este tiempo para preparar assertions cuantitativos y explicárselos al usuario.

Los buenos assertions son objetivamente verificables y tienen nombres descriptivos. Las skills subjetivas se evalúan mejor cualitativamente — no forzar assertions en cosas que requieren juicio humano.

### Paso 3: A medida que completan las ejecuciones, capturar los datos de tiempo

Cuando cada tarea de subagente completa, se recibe una notificación con `total_tokens` y `duration_ms`. Guardar inmediatamente en `timing.json`:

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3
}
```

### Paso 4: Puntuar, agregar y lanzar el visor

1. **Puntuar cada ejecución** — lanzar un subagente grader que lea `agents/grader.md`. El array expectations de `grading.json` debe usar los campos `text`, `passed` y `evidence`.

2. **Agregar en benchmark:**
   ```bash
   python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <nombre>
   ```

3. **Hacer un análisis** — leer `agents/analyzer.md` para saber qué patrones buscar.

4. **Lanzar el visor:**
   ```bash
   nohup python <ruta-skill-creator>/eval-viewer/generate_review.py \
     <workspace>/iteration-N \
     --skill-name "mi-skill" \
     --benchmark <workspace>/iteration-N/benchmark.json \
     > /dev/null 2>&1 &
   VIEWER_PID=$!
   ```
   Para la iteración 2+, añadir `--previous-workspace <workspace>/iteration-<N-1>`.
   En entornos sin pantalla, usar `--static <ruta-output>`.

5. **Decirle al usuario:** "He abierto los resultados en tu navegador. Hay dos pestañas — 'Outputs' para revisar cada caso de prueba, 'Benchmark' para la comparación cuantitativa. Cuando termines, vuelve aquí y dímelo."

### Paso 5: Leer el feedback

```json
{
  "reviews": [
    {"run_id": "eval-0-with_skill", "feedback": "al gráfico le faltan etiquetas en los ejes", "timestamp": "..."},
    {"run_id": "eval-1-with_skill", "feedback": "", "timestamp": "..."}
  ],
  "status": "complete"
}
```

El feedback vacío significa que el usuario lo consideró correcto. Centrar las mejoras donde hubo quejas específicas.

```bash
kill $VIEWER_PID 2>/dev/null
```

---

## Mejorar la skill

### Cómo pensar en las mejoras

1. **Generalizar a partir del feedback.** Se están creando skills para usarse muchas veces con prompts muy distintos. En lugar de cambios minuciosos y sobreajustados, si hay un problema persistente, intentar ampliar y usar diferentes metáforas o patrones de trabajo.

2. **Mantener el prompt ligero.** Eliminar cosas que no aporten valor. Leer las transcripciones, no solo los outputs finales.

3. **Explicar el por qué.** Esforzarse en explicar el **por qué** detrás de lo que se le pide al modelo. Si uno se encuentra escribiendo SIEMPRE o NUNCA en mayúsculas, reformular y explicar el razonamiento.

4. **Buscar trabajo repetido entre casos de prueba.** Si varios subagentes escribieron scripts similares de forma independiente, eso es una señal de que la skill debería incluir ese script en `scripts/`.

### El ciclo de iteración

1. Aplicar las mejoras a la skill
2. Reejecutar todos los casos de prueba en `iteration-<N+1>/`, incluidas las ejecuciones baseline
3. Lanzar el revisor con `--previous-workspace` apuntando a la iteración anterior
4. Esperar feedback del usuario
5. Repetir

Continuar hasta que el usuario esté satisfecho, el feedback esté vacío, o no se progrese de forma significativa.

---

## Avanzado: Comparación ciega

Para una comparación más rigurosa entre dos versiones de una skill, leer `agents/comparator.md` y `agents/analyzer.md`. La idea básica: dar dos outputs a un agente independiente sin decirle cuál es cuál, y dejar que juzgue la calidad.

Opcional, requiere subagentes, la mayoría de usuarios no lo necesitarán.

---

## Optimización de la descripción

El campo description del frontmatter es el mecanismo principal que determina si Claude invoca una skill. Después de crear o mejorar una skill, ofrecer optimizar la descripción para mejorar la precisión de activación.

### Paso 1: Generar consultas de evaluación de activación

Crear 20 consultas de evaluación — mezcla de debería-activar y no-debería-activar:

```json
[
  {"query": "el prompt del usuario", "should_trigger": true},
  {"query": "otro prompt", "should_trigger": false}
]
```

Las consultas deben ser realistas, concretas y con suficiente detalle. Centrarse en los casos límite.

Mal: `"Formatear estos datos"` — demasiado fácil.
Bien: `"mi jefa me mandó un xlsx llamado 'Q4 ventas final FINAL v2.xlsx' y quiere una columna de margen de beneficio"`

Para **debería-activar** (8-10): diferentes formas de expresar la misma intención, casos donde el usuario no nombra explícitamente la skill pero claramente la necesita.

Para **no-debería-activar** (8-10): casi-coincidencias — consultas que comparten palabras clave pero necesitan algo diferente. No hacerlas obviamente irrelevantes.

### Paso 2: Revisar con el usuario

1. Leer la plantilla de `assets/eval_review.html`
2. Reemplazar `__EVAL_DATA_PLACEHOLDER__`, `__SKILL_NAME_PLACEHOLDER__` y `__SKILL_DESCRIPTION_PLACEHOLDER__`
3. Escribir en `/tmp/eval_review_<nombre-skill>.html` y abrir
4. El usuario edita y hace clic en "Export Eval Set"
5. El archivo se descarga en `~/Downloads/eval_set.json`

### Paso 3: Ejecutar el ciclo de optimización

```bash
python -m scripts.run_loop \
  --eval-set <ruta-a-trigger-eval.json> \
  --skill-path <ruta-a-la-skill> \
  --model <id-del-modelo-que-alimenta-esta-sesion> \
  --max-iterations 5 \
  --verbose
```

Hacer tail del output periódicamente para dar actualizaciones al usuario. El script divide el conjunto en 60% entrenamiento / 40% test, evalúa la descripción actual (cada consulta 3 veces) e itera hasta 5 veces. Devuelve `best_description` seleccionada por puntuación de test.

### Paso 4: Aplicar el resultado

Tomar `best_description` y actualizar el frontmatter del SKILL.md. Mostrar al usuario el antes y el después con las puntuaciones.

---

### Empaquetar y presentar (solo si `present_files` está disponible)

```bash
python -m scripts.package_skill <ruta/al/directorio-skill>
```

Indicar al usuario la ruta del archivo `.skill` resultante.

---

## Instrucciones específicas para Claude.ai

Sin subagentes, adaptar lo siguiente:

- **Casos de prueba**: uno a la vez, sin baselines. Leer el SKILL.md y completar el prompt uno mismo.
- **Revisar resultados**: presentar directamente en la conversación. Si el output es un archivo, indicar dónde está.
- **Benchmarking**: omitir el cuantitativo.
- **Optimización de descripción**: requiere `claude -p` CLI. Omitir en Claude.ai.
- **Comparación ciega**: requiere subagentes. Omitir.
- **Actualizar una skill existente**: preservar el nombre original; copiar a `/tmp/nombre-skill/` antes de editar.

---

## Instrucciones específicas para Cowork

- Hay subagentes: el flujo principal funciona.
- Sin pantalla: usar `--static <ruta-output>` en `generate_review.py`.
- El feedback se descarga como `feedback.json`.
- GENERAR EL VISOR DE EVALUACIÓN *ANTES* de evaluar los inputs uno mismo.
- Actualizar una skill existente: seguir la guía de la sección Claude.ai.

---

## Archivos de referencia

- `agents/grader.md` — Cómo evaluar assertions contra outputs
- `agents/comparator.md` — Cómo hacer una comparación A/B ciega entre dos outputs
- `agents/analyzer.md` — Cómo analizar por qué una versión superó a otra
- `references/schemas.md` — Estructuras JSON para evals.json, grading.json, etc.

---

Resumen del ciclo principal:

- Averiguar de qué trata la skill
- Redactar o editar la skill
- Ejecutar claude-con-acceso-a-la-skill sobre los prompts de prueba
- Con el usuario, evaluar los outputs (crear benchmark.json y ejecutar `eval-viewer/generate_review.py`)
- Repetir hasta que el usuario y el modelo estén satisfechos
- Empaquetar la skill final y devolvérsela al usuario

¡Buena suerte!
