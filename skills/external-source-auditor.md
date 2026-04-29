---
name: external-source-auditor
description: Auditar cualquier elemento que provenga de una fuente externa antes de instalarlo o usarlo: skills de marketplace o comunidad, plugins, MCP servers, paquetes npm/pip/cargo, scripts de instalación, herramientas CLI, extensiones y cualquier código no escrito en este proyecto.
---

## Qué auditar

Cualquier elemento externo: skills, MCP servers, dependencias (npm/pip/cargo/gems),
scripts de instalación, herramientas CLI, plugins, extensiones.

## Proceso obligatorio

### 1. VERIFICAR ORIGEN
- ¿Es oficial (Anthropic, organización verificada) o de tercero?
- ¿Tiene página pública con información clara sobre autor y propósito?
- ¿El repositorio tiene mantenimiento activo y actividad reciente?
- ¿Cuántas instalaciones/stars tiene? ¿Es ampliamente usado o muy nuevo/oscuro?

### 2. REVISAR CÓDIGO (si es accesible)
- ¿Qué permisos o accesos solicita?
- ¿Hace llamadas de red? ¿A qué endpoints?
- ¿Lee o escribe archivos del sistema? ¿Cuáles?
- ¿Tiene acceso a variables de entorno o secrets?
- ¿Hay código ofuscado o difícil de leer sin razón aparente?
- Para MCP servers: ¿puede recibir instrucciones de contenido externo? (prompt injection)

### 3. EVALUAR RIESGO
- CRÍTICO: permisos excesivos, código ofuscado, llamadas a dominios desconocidos
- ALTO: acceso amplio a filesystem, red o entorno sin justificación clara
- MEDIO: poco historial, autor desconocido pero código revisable
- BAJO: fuente verificada, código abierto y revisado, uso amplio en comunidad

### 4. VEREDICTO
- ✅ SEGURO — proceder con la instalación/activación
- ⚠️ PRECAUCIÓN — informar al usuario de los riesgos y pedir confirmación explícita
- ❌ BLOQUEADO — no instalar bajo ninguna circunstancia; explicar por qué

## Regla absoluta
Ningún elemento externo se instala, activa o usa sin pasar por esta auditoría.
Si el usuario insiste en saltarse la auditoría, registrar la advertencia
y exigir confirmación explícita describiendo el riesgo asumido.
