---
name: centinel-update
description: Mantener actualizada la configuración de seguridad de Claude Code. Activar cuando se detecta un nuevo vector de ataque no cubierto, cuando hay CVEs relevantes en el ecosistema, cuando la reflexión de sesión detecta un patrón no cubierto, o periódicamente cada 3 meses para revisión de mantenimiento.
---

## Cuándo activar

- Se detecta un ataque o vector nuevo no cubierto por los IOCs actuales
- Un CVE reciente afecta a herramientas o patrones que Claude usa habitualmente
- La skill `reflection` identifica que el hook dejó pasar algo que debería haber bloqueado
- Han pasado más de 3 meses desde `_updated` en centinel_iocs.json
- Se añade una nueva tool en Claude Code que no tiene matcher en settings.json

---

## Proceso de actualización

### 1. VERIFICAR ESTADO ACTUAL

Usar el MCP centinel si está activo:
```
→ call ioc_stats()  para ver cuántos IOCs hay y cuándo fue el último update
```
O leer directamente `~/.claude/hooks/centinel_iocs.json` y revisar `_updated`.

### 2. BUSCAR NUEVAS AMENAZAS

Fuentes a revisar (en este orden):

1. **GitHub Advisory Database** — `https://github.com/advisories?query=claude+OR+mcp+OR+llm`
2. **OWASP Top 10 para LLMs** — revisar si hay nuevas técnicas de prompt injection o jailbreak
3. **MCP Security incidents** — buscar "MCP server vulnerability" o "MCP prompt injection" en GitHub
4. **CVEs del ecosistema** — si el proyecto usa npm/pip/cargo, revisar CVEs recientes de las dependencias principales

### 3. EVALUAR QUÉ AÑADIR

Para cada amenaza nueva encontrada, decidir en qué capa va:

| Tipo de amenaza | Capa a actualizar |
|---|---|
| Nuevo patrón de comando peligroso | `centinel_iocs.json` → `dangerous_command_patterns` |
| Nuevo servicio de exfiltración | `centinel_iocs.json` → `exfiltration_services` |
| Nuevo dominio malicioso conocido | `centinel_iocs.json` → `malicious_domains.exact` |
| Nueva técnica de prompt injection | `centinel_iocs.json` → `prompt_injection_patterns` |
| Nuevo vector de análisis de repos | `skills/centinel-auditor.md` → sección correspondiente |
| Nueva tool de Claude sin matcher | `settings.json` → añadir matcher en PreToolUse |
| Nueva señal social de repos maliciosos | `skills/centinel-auditor.md` → sección 1 o 4 |

### 4. AÑADIR IOCs NUEVOS

**Opción A — Vía MCP centinel (si está activo):**
```
→ call add_ioc(ioc_type="exfiltration_service", pattern="nuevo-servicio.com", description="Servicio de exfiltración detectado en campaña X")
```

**Opción B — Edición directa de centinel_iocs.json:**
- Añadir el patrón en la lista correspondiente
- Actualizar el campo `_updated` con la fecha actual (YYYY-MM-DD)
- Añadir una entrada en `_version_history`:
```json
{
  "date": "YYYY-MM-DD",
  "type": "tipo_de_ioc",
  "pattern": "patrón añadido",
  "description": "por qué se añade"
}
```

### 5. VERIFICAR QUE EL NUEVO IOC FUNCIONA

Probar mentalmente o con check_ioc que el nuevo patrón hubiera bloqueado la amenaza detectada:
```
→ call check_ioc(value="el valor malicioso que debería detectar")
```
Si no lo detecta: revisar la regex o el tipo de IOC seleccionado.

### 6. ACTUALIZAR SKILL O HOOK SI ES NECESARIO

Si el patrón es demasiado complejo para una regex en JSON:
- Añadir lógica a `centinel_preflight.js` como comprobación explícita
- Seguir el patrón de las funciones `checkBash`, `checkWrite`, `checkWebFetch`

Si la amenaza requiere análisis de reputación o contexto semántico (no regex):
- Actualizar el proceso en `centinel-auditor.md` con el nuevo paso o criterio

### 7. DOCUMENTAR EN SKILL-REGISTRY.md

Si la actualización fue motivada por una auditoría de un elemento externo concreto:
- Añadir una fila en "Historial de auditorías de elementos externos"

---

## Checklist de mantenimiento trimestral

- [ ] `ioc_stats()` o revisar `_updated` — ¿hay más de 90 días sin actualizar?
- [ ] Revisar GitHub Advisory Database por CVEs nuevos en el ecosistema
- [ ] Comprobar si hay nuevas tools de Claude Code sin matcher en settings.json
- [ ] Comprobar si los modelos en `agents/*.md` siguen siendo los IDs correctos
- [ ] Revisar si hay nuevas skills de la comunidad que valga la pena evaluar (centinel-auditor primero)
- [ ] Ejecutar `reflection` para detectar patrones de la última temporada no sistematizados

---

## Regla de seguridad para la actualización

Nunca añadir IOCs de una fuente sin verificar primero la fuente con `centinel-auditor`.
Un IOC malicioso diseñado para excluir de la blocklist ciertos dominios sería un vector de ataque.
