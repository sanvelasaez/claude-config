---
name: ui-design-review
description: Revisar y guiar el diseño visual de interfaces frontend: contraste, tipografía, espaciado, estados de componente, accesibilidad y consistencia con el sistema de diseño. Activar al diseñar componentes nuevos, revisar implementaciones visuales o evaluar la coherencia del sistema de diseño.
---

## Criterios de revisión

### 1. CONTRASTE Y ACCESIBILIDAD (WCAG AA mínimo)
- Texto normal (< 18pt): ratio de contraste ≥ 4.5:1 contra el fondo
- Texto grande (≥ 18pt regular o ≥ 14pt bold): ratio ≥ 3:1
- Componentes interactivos y bordes con significado: ratio ≥ 3:1
- Touch targets: mínimo 44×44px en móvil, 24×24px en desktop
- No comunicar información exclusivamente con color (añadir icono, texto o patrón)
- Verificar con herramientas: contrast ratio checkers o Lighthouse

### 2. TIPOGRAFÍA
- ¿Hay jerarquía visual clara? (H1 > H2 > H3 > body > caption)
- ¿El tamaño base del cuerpo de texto es ≥ 16px?
- ¿El line-height del cuerpo es ≥ 1.5?
- ¿Se usan máximo 2-3 familias tipográficas en todo el diseño?
- ¿Los pesos tipográficos son coherentes con el sistema de diseño definido?
- ¿Las longitudes de línea son razonables (45-75 caracteres para texto de lectura)?

### 3. ESPACIADO Y LAYOUT
- ¿Se usa una escala de espaciado consistente? (ej: 4/8/12/16/24/32/48/64px)
- ¿El ritmo vertical es consistente entre secciones con contenido similar?
- ¿Los márgenes son proporcionales al contenido que encierran?
- En responsive: ¿el layout funciona correctamente en 375px, 768px y 1280px?
- ¿Los elementos relacionados están visualmente agrupados (proximidad)?

### 4. ESTADOS DE COMPONENTE
Cada componente interactivo debe tener definidos y visualmente distintos:
- **Default**: estado base sin interacción
- **Hover**: retroalimentación visual de que el elemento es interactivo
- **Active/Pressed**: confirmación visual del clic/tap
- **Focus**: visible y claramente diferenciado para navegación por teclado
- **Disabled**: no interactivo, contraste reducido pero todavía legible
- **Error**: con mensaje descriptivo, color y/o icono de error
- **Loading**: skeleton, spinner o indicador de progreso apropiado

### 5. CONSISTENCIA CON EL SISTEMA DE DISEÑO
- ¿Los colores vienen de los tokens de diseño definidos?
- ¿Los componentes nuevos reutilizan primitivos del sistema existente?
- ¿Los radios de borde, sombras y elevaciones son consistentes?
- ¿El tono visual (formal/casual, denso/espacioso) es coherente con la aplicación?

## Formato de revisión

```
COMPONENTE: [nombre del componente revisado]
ESTADO: ✅ Aprobado / ⚠️ Ajustes menores / ❌ Rediseñar

[CRÍTICO] — Bloquea: [ej: contraste 2.1:1 en texto principal, incumple WCAG AA]
[ALTO]    — Debe corregir: [ej: falta estado focus, no navegable por teclado]
[MEDIO]   — Recomendado: [ej: espaciado no sigue la escala base del sistema]
[BAJO]    — Sugerencia: [ej: reducir peso tipográfico del label secundario]
```
