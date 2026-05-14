# 🌿 git-workflow.md — Flujo de Trabajo con Git
> Flujo de trabajo Git opcional. **Inactivo por defecto.** Requiere activación explícita por proyecto.  
> Ubicación: `~/.claude/git-workflow.md`

---

## ⚙️ Cómo activar en un proyecto

**Paso 1 — Importar el archivo en el CLAUDE.md del proyecto**

Añadir esta línea al `.claude/CLAUDE.md` del proyecto:

```
@~/.claude/git-workflow.md
```

Esto importa el archivo directamente en el contexto del proyecto. Claude leerá y aplicará las instrucciones de este flujo en esa sesión.

**Paso 2 — Añadir los permisos Git en `.claude/settings.json`**

Sin esta configuración, los comandos Git que modifican el repositorio seguirán bloqueados por el `deny` global:

```json
{
  "permissions": {
    "allow": [
      "Bash(git add*)",
      "Bash(git commit*)",
      "Bash(git checkout*)",
      "Bash(git switch*)"
    ]
  }
}
```

> `git push`, `git merge`, `git rebase` y `git reset --hard` requieren confirmación explícita del usuario caso por caso. No añadirlos al allow salvo decisión explícita del usuario.

**Paso 3 — Verificar con Claude**

Antes de empezar a trabajar con Git en el proyecto, Claude debe confirmar:

1. ¿En qué rama se trabaja por defecto y cuáles están protegidas?
2. ¿Se trabaja con ramas de feature o directamente en la rama principal?
3. ¿Hay un remote configurado? ¿Está autenticado?

---

## 📋 CONVENCIONES DE COMMIT

### Formato Conventional Commits

```
<tipo>(<scope>): <descripción en imperativo, minúsculas, sin punto final>

[cuerpo opcional: contexto adicional sobre el cambio]

[footer opcional: referencias a issues, breaking changes]
```

### Tipos permitidos

| Tipo | Cuándo usarlo |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Cambio de código sin añadir features ni corregir bugs |
| `test` | Añadir o modificar tests |
| `docs` | Cambios en documentación |
| `style` | Cambios de formato, espaciado, sin afectar lógica |
| `perf` | Mejoras de rendimiento |
| `chore` | Tareas de mantenimiento, actualizaciones de dependencias |
| `ci` | Cambios en pipelines de CI/CD |
| `build` | Cambios en el sistema de build o dependencias externas |

### Reglas del mensaje de commit

- La descripción va en imperativo: "añade" no "añadido", "corrige" no "corregido"
- Máximo 72 caracteres en la primera línea
- El scope es opcional pero recomendado: `feat(auth):`, `fix(api):`, `refactor(ui):`
- Si el cambio rompe compatibilidad: añadir `BREAKING CHANGE:` en el footer

### Ejemplos correctos

```
feat(auth): añade autenticación con OAuth2
fix(api): corrige paginación cuando el resultado está vacío
refactor(utils): extrae lógica de formateo a función separada
test(checkout): añade tests para flujo de pago con tarjeta
docs(readme): actualiza instrucciones de instalación
```

---

## 🌿 FLUJO DE RAMAS

### Flujo estándar (adaptar al proyecto)

```
main / master          ← rama de producción, protegida
  └─ develop           ← rama de integración (si existe)
       └─ feature/xyz  ← desarrollo de cada feature
       └─ fix/abc      ← correcciones concretas
       └─ hotfix/def   ← correcciones urgentes en producción
```

### Nomenclatura de ramas

```
feature/<descripción-kebab-case>    → feat(scope): nueva funcionalidad
fix/<descripción-kebab-case>        → fix(scope): corrección de bug
hotfix/<descripción-kebab-case>     → fix urgente sobre main
refactor/<descripción-kebab-case>   → refactor sin cambio funcional
docs/<descripción-kebab-case>       → solo documentación
```

### Reglas de trabajo con ramas

- Nunca trabajar directamente en `main` o `master`
- Nunca hacer push a ramas protegidas sin pasar por PR/MR
- Cada rama debe tener un objetivo único y concreto
- Mantener las ramas actualizadas con su rama base antes de abrir PR

---

## 🔄 PROCESO DE DESARROLLO CON GIT

### Inicio de una feature

```bash
git checkout develop          # o main, según el proyecto
git pull                      # actualizar antes de ramificar
git checkout -b feature/nombre-de-la-feature
```

> Claude realiza estos pasos solo con permiso explícito del usuario.

### Antes de cada commit

Verificar internamente:
- [ ] El código compila sin errores
- [ ] Los tests pasan (`@qa` ha validado si aplica)
- [ ] `@reviewer` ha revisado si es un cambio significativo
- [ ] No hay archivos de debug, logs temporales o secrets en el staging area
- [ ] El mensaje de commit sigue Conventional Commits

### Hacer commit

```bash
git add <archivos-específicos>     # nunca: git add .  sin revisar primero
git status                         # confirmar qué se va a commitear
git diff --cached                  # revisar los cambios antes de commit
git commit -m "tipo(scope): descripción"
```

> Claude NUNCA hace `git add .` sin revisar primero el `git status` y el diff.  
> Siempre añadir archivos de forma selectiva y explícita.

### Push y Pull Request

```bash
git push origin feature/nombre-de-la-feature
```

> El push requiere confirmación explícita del usuario en cada ocasión.  
> Tras el push, informar al usuario del enlace para crear el PR/MR si el remoto lo proporciona.

---

## 🤝 FLUJO MULTI-AGENTE

Cuando el flujo Git está activo en un proyecto con `agent-coordination.md`:

- **Solo el orquestador (sesión principal) mergea a `develop`.** Ningún subagente mergea directamente.
- Cada subagente trabaja en su propia rama de feature y hace push al terminar
- El orquestador revisa el diff de la rama antes de mergear
- Si hay conflictos entre ramas de agentes, el orquestador los resuelve; nunca un agente individual

---

## 🚨 OPERACIONES DE ALTO RIESGO

Las siguientes operaciones **requieren confirmación explícita del usuario** y descripción clara del impacto antes de ejecutarse:

| Operación | Riesgo | Acción previa obligatoria |
|---|---|---|
| `git reset --hard` | Pérdida de cambios no commiteados | Mostrar qué se perderá con `git status` y `git diff` |
| `git push --force` | Reescribe historia remota | Explicar impacto en otros colaboradores |
| `git rebase` | Reescribe historia local | Confirmar que la rama no es compartida |
| `git merge` en rama protegida | Posible conflicto en producción | Solo si no hay PR/MR configurado |
| Eliminar rama | Pérdida de trabajo si no está mergeada | Verificar estado del merge primero |

---

## 📝 GESTIÓN DEL CONTEXTO GIT EN SESIÓN

Claude puede usar estos comandos de lectura en cualquier momento para entender el estado del repo:

```bash
git status                        # estado actual del working tree
git log --oneline -10             # últimos 10 commits
git branch                        # ramas locales
git diff                          # cambios no staged
git diff --cached                 # cambios staged
git diff main...HEAD              # diferencia con la rama base
```

Estos comandos están permitidos por defecto (no requieren permisos adicionales).
