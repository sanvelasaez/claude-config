---
name: code-review
description: Revisar código en busca de bugs, problemas de seguridad, rendimiento y mantenibilidad. Activar antes de considerar cualquier implementación terminada, al recibir código para revisar, o cuando @reviewer analiza un cambio.
---

## Proceso de revisión

### 1. CORRECTITUD
- ¿El código hace exactamente lo que debe hacer?
- ¿Hay edge cases no cubiertos (inputs vacíos, nulos, límites, concurrencia)?
- ¿Las condiciones de error están manejadas explícitamente?
- ¿La lógica es correcta en todos los flujos, incluidos los alternativos?

### 2. SEGURIDAD
- Validación y sanitización de inputs en los límites del sistema
- Manejo de credenciales y datos sensibles (¿se loggean por accidente?)
- Vectores de inyección: SQL, command, XSS, path traversal
- Exposición involuntaria de datos en respuestas de API
→ Si hay nuevas dependencias externas: invocar centinel-auditor

### 3. RENDIMIENTO
- Complejidad algorítmica innecesaria (O(n²) donde podría ser O(n log n))
- N+1 queries en acceso a datos
- Operaciones bloqueantes en rutas críticas (I/O síncrono, locks)
- Objetos grandes innecesariamente en memoria

### 4. MANTENIBILIDAD
- Funciones de más de 50 líneas → candidatas a extraer
- Anidamiento superior a 3 niveles → señal de refactorización
- Duplicación de lógica → extraer a función compartida
- Nomenclatura inconsistente con el resto del proyecto
- Tests ausentes para código nuevo (mínimo 80% de cobertura)

### 5. FORMATO DE SALIDA

Ordenar hallazgos por severidad:

**CRÍTICO** — Bloquea el merge. Bug que produce datos incorrectos, vulnerabilidad explotable.
**ALTO** — Debe corregirse antes del merge. Lógica incorrecta en caso no trivial, fuga de datos.
**MEDIO** — Corregir si es razonable. Rendimiento degradado, mantenibilidad comprometida.
**BAJO** — Sugerencia de mejora. Legibilidad, estilo, simplificación posible.

Por cada hallazgo:
```
[SEVERIDAD] Descripción del problema
→ Riesgo: qué puede pasar si no se corrige
→ Solución: cambio concreto sugerido
→ Ubicación: archivo:línea
```

Si no hay hallazgos CRÍTICO o ALTO: confirmar que el código está listo para merge.
