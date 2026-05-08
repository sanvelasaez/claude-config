Aplica las extensiones del config repo (`skills/<nombre>/SKILL.ext.md`) sobre las skills instaladas en `~/.claude/skills/`.

Si se ha proporcionado un nombre de skill como argumento (`$ARGUMENTS`), aplicar la extensión solo a esa skill:

```bash
node scripts/merge-skill-extension.js $ARGUMENTS
```

Si no hay argumento (comando invocado sin parámetros), aplicar todas las extensiones disponibles:

```bash
node scripts/merge-skill-extension.js --all
```

Muestra el resultado al usuario indicando qué skills han sido actualizadas y la ruta del archivo modificado.
