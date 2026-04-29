---
name: skill-finder
description: Buscar skills existentes (marketplace oficial, comunidad, repositorios públicos) cuando se identifica que una tarea requiere capacidad especializada que ninguna skill actual cubre.
---

## Cuándo activarse

- Ninguna skill actual cubre el dominio necesario para una tarea
- El usuario pide explícitamente buscar una skill para una función concreta
- Al finalizar una tarea se detecta un patrón repetible que podría ser una skill

## Proceso de búsqueda

### 1. DEFINIR LA NECESIDAD
- ¿Qué capacidad concreta se necesita?
- ¿Es específica de un lenguaje/framework o genérica?
- ¿Para uso global o solo para este proyecto?

### 2. BUSCAR EN FUENTES (en este orden)
1. Skills built-in de Claude Code: /help para ver las disponibles en la sesión actual
2. Repositorios de la comunidad: buscar en GitHub con "claude-code skills <término>"
3. Documentación oficial de Anthropic (docs.anthropic.com)
4. Si no existe nada adecuado → proponer crearla como skill personalizada en skills/

### 3. EVALUAR CANDIDATAS
Para cada skill encontrada:
- ¿Su descripción cubre exactamente la necesidad?
- ¿Es de fuente verificada (Anthropic o repositorio con historial claro)?
- → Invocar centinel-auditor antes de cualquier instalación
- → Registrar en SKILL-REGISTRY.md con origen y estado de seguridad

### 4. RECOMENDAR
- Presentar opciones con pros/contras
- Recomendar la más adecuada o proponer crear una personalizada
- Si se instala: pasar siempre por centinel-auditor primero
- Si se crea: añadirla a SKILL-REGISTRY.md con tipo "Creación propia" y 🔵 PROPIA

## Resultado esperado
Informe conciso con: opciones encontradas, evaluación de cada una y recomendación clara.
