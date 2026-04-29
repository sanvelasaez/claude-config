---
name: doc-writer
description: Generar documentación técnica inline o de archivo al crear o modificar APIs públicas, módulos compartidos o código con lógica no obvia. Activar cuando se crea una interfaz pública, un módulo reutilizable, o cuando el código tiene invariantes o restricciones que no son evidentes por el nombre.
---

## Qué documentar y qué no

### DOCUMENTAR
- **APIs públicas**: todo lo que otros módulos o equipos van a consumir
- **Decisiones no obvias**: por qué se eligió este enfoque (no qué hace el código)
- **Contratos de función**: precondiciones, postcondiciones, excepciones posibles
- **Configuración**: parámetros de entorno, flags y opciones con sus efectos reales
- **Invariantes del sistema**: restricciones que siempre deben cumplirse y por qué

### NO DOCUMENTAR
- Código que se explica solo por sus nombres de variable y función
- Getters/setters triviales sin lógica adicional
- Implementaciones estándar de patrones bien conocidos
- Lo que ya está en el historial de git (eso va en el commit message)
- El "qué" hace el código cuando el nombre ya lo dice

## Formato por tipo

### Comentario inline (máximo una línea)
Solo cuando el WHY no es obvio — una restricción oculta, un workaround, una invariante:
```python
# max(price, 0.01) evita división por cero para productos de precio cero
discount_ratio = savings / max(price, 0.01)
```

### Docstring de función (API pública o lógica compleja)
```python
def calculate_discount(price: float, user_tier: str) -> float:
    """Calcula el descuento aplicable según el tier del usuario.

    Args:
        price: Precio base en euros, debe ser mayor que cero.
        user_tier: Tier del usuario ('basic', 'premium', 'enterprise').

    Returns:
        Precio final con descuento aplicado, nunca negativo.

    Raises:
        ValueError: Si price es negativo o user_tier no es un valor válido.
    """
```

### Documentación de módulo
Al inicio del archivo, solo si el módulo tiene una responsabilidad no obvia
o una restricción importante de alcance:
```python
"""Módulo de cálculo de precios con descuentos por tier y volumen.

NO incluye cálculo de impuestos — ver tax_calculator.py.
Los precios aquí son siempre pre-IVA.
"""
```

### Documentación de configuración
```markdown
## Configuración

| Variable       | Tipo   | Default | Descripción                        |
|----------------|--------|---------|------------------------------------|
| MAX_RETRIES    | int    | 3       | Intentos antes de marcar como fallo|
| TIMEOUT_MS     | int    | 5000    | Timeout de conexión en milisegundos|
| CACHE_TTL_SEC  | int    | 300     | Tiempo de vida de entradas en caché|
```

## Estilo
- Imperativo en docstrings: "Calcula" no "Calculamos" ni "Calcula el..."
- Sin obviedades: no repetir lo que el nombre ya dice
- En el idioma del proyecto (si el código es en inglés, la documentación en inglés)
- Máximo 3-4 líneas por comentario inline; si necesita más, es una doc de módulo
