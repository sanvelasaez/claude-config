---
name: debug-tracer
description: Depurar errores con análisis sistemático de hipótesis. Activar cuando el origen de un bug no es obvio, cuando el error es intermitente, cuando el stack trace no indica claramente la causa, o cuando una corrección anterior no funcionó.
---

## Proceso de depuración (obligatorio, sin saltar pasos)

### PASO 1 — REPRODUCIR
Encontrar el caso mínimo que reproduce el error:
- ¿Con qué input exacto falla? ¿Con cualquier input o solo algunos?
- ¿Falla siempre o de forma intermitente? ¿Con qué frecuencia?
- ¿En qué entorno? ¿Solo en producción, en staging, en local?
- Simplificar hasta el test case más pequeño posible que siga fallando

Si no se puede reproducir de forma fiable: registrar las condiciones observadas
y continuar con el paso 2 usando la información disponible.

### PASO 2 — AISLAR
Delimitar el área de código donde se origina el error:
- ¿En qué capa falla? (presentación / lógica de negocio / datos / infraestructura)
- Usar búsqueda binaria: dividir el sistema y verificar en qué mitad está el fallo
- Revisar el stack trace completo de abajo a arriba (el origen suele estar abajo)
- Identificar la última operación que produce un resultado correcto

### PASO 3 — HIPÓTESIS
Formular hipótesis ordenadas de mayor a menor probabilidad:
```
H1: [hipótesis más probable]
    Evidencia que la apoya: [datos concretos]
    Cómo verificarla: [comprobación específica]

H2: [segunda más probable]
    Evidencia que la apoya: [datos concretos]
    Cómo verificarla: [comprobación específica]
```
No asumir la causa sin evidencia. Documentar el razonamiento antes de actuar.

### PASO 4 — VERIFICAR
Para cada hipótesis, en orden de probabilidad:
- Diseñar una comprobación específica (log puntual, test aislado, breakpoint)
- Ejecutar la comprobación y registrar el resultado
- ¿Confirma o descarta la hipótesis?
- Si descarta: actualizar el análisis y pasar a la siguiente

**NO implementar el fix hasta tener la hipótesis confirmada con evidencia.**

### PASO 5 — CORREGIR
Implementar el fix más simple y específico posible:
- El fix debe solucionar exactamente la causa raíz identificada, nada más
- No aprovechar para refactorizar código adyacente (eso es un PR separado)
- Verificar que el fix resuelve el caso original sin romper otros comportamientos

### PASO 6 — PREVENIR
Antes de cerrar el bug:
- ¿Existe un test que hubiera detectado este bug antes de llegar a producción? Si no: crearlo
- ¿El mismo patrón problemático puede existir en otros lugares? Buscar y corregir
- ¿El bug tiene causa raíz en un diseño problemático? Documentar como deuda técnica

## Registro de investigación
Mantener este registro durante el proceso:
```
BUG: [descripción del error observable]
REPRODUCCIÓN: [pasos o condiciones exactas]
ÁREA AISLADA: [archivo / módulo / función]
HIPÓTESIS ACTIVA: [cuál y por qué]
HIPÓTESIS DESCARTADAS: [cuáles y evidencia que las descartó]
EVIDENCIA ACUMULADA: [logs, outputs, observaciones relevantes]
FIX APLICADO: [descripción del cambio]
TEST AÑADIDO: [sí/no — ubicación]
```
