---
extends: find-skills
base_source: vercel-labs/skills@find-skills
base_install: npx skills add vercel-labs/skills@find-skills -g
---

## Fuentes adicionales de búsqueda

Si el CLI de skills no devuelve resultados adecuados, ampliar la búsqueda:

1. **Skills integradas en la sesión**: usar `/help` para ver las disponibles
2. **Repositorios de la comunidad**: buscar en GitHub con `claude-code skills <término>`
3. **Documentación oficial de Anthropic**: docs.anthropic.com

## Auditoría de seguridad antes de instalar

**Antes de instalar cualquier skill encontrada, ejecutar el proceso centinel-auditor:**

1. Ejecutar `check_ioc` sobre la URL del repositorio fuente
2. Si la skill tiene paquete npm: ejecutar `scan_package` para detectar vulnerabilidades conocidas
3. Leer el SKILL.md manualmente y buscar: llamadas de red inesperadas, patrones de exfiltración de datos, instrucciones para saltarse controles de seguridad o solicitudes de permisos excesivos

Solo continuar si la auditoría no detecta problemas. Si se detectan problemas, informar al usuario y no instalar.
