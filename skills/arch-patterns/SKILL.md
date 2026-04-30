---
name: arch-patterns
description: Seleccionar y aplicar patrones de diseño (creacionales, estructurales, de comportamiento) y tomar decisiones de arquitectura de módulos. Activar al diseñar un nuevo módulo, refactorizar una estructura compleja o elegir entre alternativas arquitectónicas.
---

## Proceso de decisión

### 1. ENTENDER EL PROBLEMA ANTES DE SELECCIONAR EL PATRÓN
- ¿Cuál es la variabilidad real que el código debe gestionar?
- ¿Qué puede cambiar en el futuro y qué es estable?
- ¿Cuáles son las restricciones concretas: rendimiento, memoria, legibilidad, tamaño del equipo?
- ¿El equipo conoce el patrón candidato? (legibilidad colectiva importa)

### 2. CATÁLOGO DE PATRONES

**Creacionales** — cómo se crean los objetos

| Patrón | Cuándo usarlo | Señal de que se necesita |
|---|---|---|
| Factory Method | El tipo concreto del objeto puede variar | `new ConcreteX()` dispersos con lógica condicional |
| Abstract Factory | Familias de objetos relacionados que deben ser compatibles | Varias factories que deben coordinarse |
| Builder | Objetos complejos con muchos parámetros opcionales | Constructor con 5+ parámetros |
| Singleton | Un único punto de acceso global (usar con precaución) | Estado compartido que no puede duplicarse |
| Prototype | Clonar objetos costosos de crear | `new()` en hot paths con inicialización pesada |

**Estructurales** — cómo se componen los objetos

| Patrón | Cuándo usarlo | Señal de que se necesita |
|---|---|---|
| Adapter | Integrar APIs incompatibles sin modificar ninguna | Código que convierte entre formatos en múltiples lugares |
| Decorator | Añadir comportamiento dinámicamente sin herencia | Explosión de subclases para combinaciones de funcionalidad |
| Facade | Simplificar un subsistema complejo | Clientes que necesitan conocer demasiados internos |
| Proxy | Controlar acceso, cachear o añadir logging | Acoplamiento directo a recursos costosos o remotos |
| Composite | Tratar objetos individuales y composiciones uniformemente | `if (isLeaf) ... else (isContainer)` repetido |

**De comportamiento** — cómo se comunican los objetos

| Patrón | Cuándo usarlo | Señal de que se necesita |
|---|---|---|
| Strategy | Intercambiar algoritmos en runtime | Switch grande que crece con cada nueva variante |
| Observer | Notificar cambios sin acoplamiento directo | Múltiples módulos que reaccionan al mismo evento |
| Command | Encapsular operaciones (undo, queue, log) | Lógica de negocio mezclada con la capa de presentación |
| Template Method | Esqueleto de algoritmo con pasos variables | Duplicación de algoritmos casi idénticos |
| Chain of Responsibility | Procesar solicitudes por una cadena de handlers | Condicional anidado de responsabilidades en cascada |
| State | Comportamiento que varía con el estado interno | Switch sobre estado en cada método de la clase |

### 3. EVALUACIÓN DE ALTERNATIVAS

Presentar siempre al menos dos opciones:
```
OPCIÓN A: [Patrón o enfoque]
  Pros: [beneficios concretos en este contexto]
  Contras: [limitaciones concretas en este contexto]
  Complejidad añadida: [Baja / Media / Alta]

OPCIÓN B: [Alternativa]
  Pros: ...
  Contras: ...
  Complejidad añadida: ...

RECOMENDACIÓN: [Opción] porque [razón específica al contexto actual]
```

### 4. CUÁNDO NO APLICAR UN PATRÓN (YAGNI)
- Si tres líneas directas resuelven el problema: usar las tres líneas
- Si el problema no tiene variabilidad real: el patrón es sobreingeniería
- Si el equipo no conoce el patrón y el codebase es pequeño: la curva de aprendizaje no vale

### 5. SEÑALES DE ALARMA (código que probablemente necesita un patrón)
- Switch/if-else que crece con cada nueva funcionalidad → Strategy o State
- Constructores con más de 4-5 parámetros → Builder
- Clases que hacen más de una cosa → Single Responsibility, extraer
- Duplicación de algoritmos similares con pequeñas diferencias → Template Method
- Acoplamiento directo a implementaciones concretas → Dependency Injection + Interface
