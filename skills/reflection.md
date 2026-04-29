---
name: reflection
description: Analizar el historial de la sesión actual para identificar patrones de error, decisiones subóptimas, reglas no aplicadas y áreas de mejora en la configuración. Activar periódicamente en sesiones largas o al finalizar trabajo complejo para detectar qué se puede sistematizar.
---

## Cuándo activar
- Al finalizar una sesión de trabajo compleja o larga
- Cuando el usuario ha tenido que corregir la misma cosa más de una vez
- Periódicamente en sesiones muy largas (cada ~10 intercambios significativos)
- Antes de hacer `/clear` para no perder aprendizajes de la sesión

## Qué analizar

### 1. ERRORES Y CORRECCIONES
- ¿El usuario tuvo que corregir alguna decisión técnica o de enfoque?
- ¿Se implementó algo que luego tuvo que deshacerse?
- ¿Hubo malentendidos sobre los requisitos?
→ Identificar el origen: ¿falta de contexto, pregunta no formulada, asunción incorrecta?

### 2. REGLAS NO APLICADAS
- ¿Se saltó algún paso del checklist pre-entrega?
- ¿Alguna skill que debería haberse invocado automáticamente no se invocó?
- ¿Algún comportamiento prohibido estuvo cerca de ocurrir o ocurrió?
→ ¿La regla está clara en CLAUDE.md o necesita precisarse?

### 3. FRICCIÓN EN EL FLUJO
- ¿Hubo algo que ralentizó innecesariamente el trabajo?
- ¿Alguna confirmación solicitada fue redundante o innecesaria?
- ¿Faltó contexto que podría estar en el CLAUDE.md del proyecto?

### 4. PATRONES REPETIDOS (candidatos a sistematizar)
- ¿Hay una tarea que se repitió y podría convertirse en una skill?
- ¿Hay un tipo de pregunta recurrente que debería responderse automáticamente?
- ¿Hay un flujo manual que podría automatizarse con un hook?

## Formato de salida

```
SESIÓN: [descripción breve del trabajo realizado]
FECHA: [fecha]

ERRORES/CORRECCIONES:
  - [descripción] → causa raíz: [X] → acción de mejora: [Y]

REGLAS NO APLICADAS:
  - [regla] → por qué no se aplicó: [X] → acción de mejora: [Y]

FRICCIÓN DETECTADA:
  - [descripción] → propuesta de mejora: [Y]

CANDIDATOS A NUEVA SKILL O HOOK:
  - [patrón detectado] → propuesta: [descripción de la skill/hook]

CAMBIOS SUGERIDOS EN CLAUDE.md:
  - [cambio específico con justificación]
```

Si no hay nada que mejorar en alguna categoría: indicarlo explícitamente con "Sin hallazgos".
La reflexión no tiene que encontrar problemas donde no los hay.

## Cómo aplicar los hallazgos
Si se identifican cambios en CLAUDE.md: presentarlos al usuario y pedir confirmación antes de modificar.
Si se identifica una skill nueva: seguir el proceso de skill-finder y centinel-auditor.
Si se identifica un hook nuevo: proponer el cambio en settings.json al usuario.
Si el hook dejó pasar algo que debería haber bloqueado: activar centinel-update para añadir el IOC.
Si han pasado más de 3 meses desde `_updated` en centinel_iocs.json: recomendar ejecutar centinel-update.
