---
name: perf-profiler
description: Analizar rendimiento e identificar cuellos de botella en código. Activar cuando hay degradación observable de rendimiento, antes de optimizaciones especulativas, o al revisar código en rutas críticas de alta frecuencia.
---

## Principio fundamental

**Medir antes de optimizar. Nunca optimizar por intuición.**
Confirmar el cuello de botella con datos antes de cambiar nada.
Una optimización sin medición es deuda técnica disfrazada de mejora.

## Proceso de análisis

### 1. DEFINIR LA MÉTRICA OBJETIVO
- ¿Qué exactamente es lento o consume demasiado? (latencia, throughput, memoria, CPU)
- ¿Cuánto es inaceptable? (SLA, umbral de experiencia de usuario, límite de infraestructura)
- ¿En qué condición se manifiesta? (carga concurrente, tamaño de dataset, frecuencia de llamada)

### 2. MEDIR EL ESTADO ACTUAL (línea base)
Antes de tocar nada, registrar:
- Tiempo de ejecución en el caso problemático (p50, p95, p99 si aplica)
- Uso de memoria pico
- Frecuencia de la operación (¿cuántas veces se llama por request/segundo/día?)

### 3. IDENTIFICAR EL CUELLO DE BOTELLA

**Patrones comunes a buscar:**

| Patrón | Síntoma observable | Cómo diagnosticarlo |
|---|---|---|
| N+1 queries | Tiempo crece linealmente con el tamaño del dataset | Log de queries, contar llamadas a DB |
| Carga innecesaria | Se traen más datos de los que se usan | Revisar SELECT *, filtros y proyecciones |
| Algoritmo O(n²) | Tiempo explota con datasets grandes | Revisar loops anidados sobre colecciones |
| Serialización costosa | CPU alta sin I/O esperable | Profiler de CPU, identificar hot functions |
| Fuga de memoria | Memoria crece y nunca baja | Heap dump, profiler de memoria, referencias colgantes |
| I/O síncrono bloqueante | Threads bloqueados esperando | Revisar operaciones de red/disco en el thread principal |
| Caché ausente | Misma operación costosa repetida | Log de hits/misses, identificar operaciones idempotentes |
| Serialización innecesaria | Objeto convertido a JSON y de vuelta sin necesidad | Trazar el objeto a lo largo del flujo |

### 4. EVALUAR IMPACTO ANTES DE OPTIMIZAR

```
Impacto = frecuencia_de_llamada × coste_unitario_de_mejora
```

- Optimizar una función llamada 1.000.000 veces/día con 1ms de mejora = 1.000s/día ahorrados
- Optimizar una función llamada 1 vez/día con 500ms de mejora = 0.5s/día ahorrados

Optimizar siempre el código con mayor frecuencia primero.

### 5. IMPLEMENTAR Y MEDIR DE NUEVO
- Aplicar una optimización a la vez (para medir el impacto de cada cambio individualmente)
- Medir el impacto antes de aplicar la siguiente
- Si no hay mejora medible: revertir el cambio (la complejidad añadida no vale nada sin ganancia)
- Documentar qué se midió, qué se cambió y cuánto mejoró

### 6. LO QUE NO HACER
- No optimizar sin datos que confirmen el problema
- No añadir caché antes de confirmar que la operación es realmente repetida y costosa
- No añadir índices en BD sin analizar el query plan primero
- No cambiar el algoritmo antes de confirmar que ese algoritmo es el cuello de botella
- No micro-optimizar código que se ejecuta raramente

## Formato de reporte

```
MÉTRICA INICIAL: [tiempo/memoria/throughput en las condiciones problemáticas]
CUELLO DE BOTELLA: [función/query/operación concreta]
CAUSA RAÍZ: [descripción técnica del por qué]
OPTIMIZACIÓN APLICADA: [descripción del cambio]
MÉTRICA TRAS CAMBIO: [resultado medido]
RATIO DE MEJORA: [X veces más rápido / Y% menos memoria / Z req/s más throughput]
```
