# CLAUDE.md — [Nombre del Proyecto]

> Configuración específica del proyecto. Extiende la configuración global en `~/.claude/CLAUDE.md`.
> No contradice reglas de seguridad globales ni comportamientos prohibidos.
> Copiar este archivo a `.claude/CLAUDE.md` en la raíz del proyecto y completar cada sección.
> Última revisión: [FECHA]

---

## 📋 CONTEXTO DEL PROYECTO

- **Nombre**: [nombre del proyecto]
- **Descripción**: [qué hace en una frase]
- **Tipo**: [web app / API REST / CLI / librería / monorepo / otro]
- **Estado**: [en desarrollo / producción / mantenimiento]
- **Equipo**: [tamaño y estructura básica, ej: "2 backend, 1 frontend"]

---

## 🛠️ STACK TECNOLÓGICO

- **Lenguaje principal**: [ej: TypeScript 5.x / Python 3.12 / Go 1.22 / Java 21]
- **Framework**: [ej: Next.js 14 / FastAPI / gin / Spring Boot]
- **Base de datos**: [ej: PostgreSQL 16 / MongoDB 7 / SQLite / ninguna]
- **Runtime / entorno**: [ej: Node 20 LTS / Python venv / Docker / JVM 21]
- **Testing**: [ej: Jest / Pytest / Go test / JUnit 5]
- **Linting / formatting**: [ej: ESLint + Prettier / Ruff / gofmt / Checkstyle]
- **CI/CD**: [ej: GitHub Actions / GitLab CI / Jenkins / ninguno]

---

## 🏗️ ARQUITECTURA

[Descripción breve de la estructura del proyecto. Qué hace cada capa o módulo principal.]

```
src/
├── [módulo-1]/    → [responsabilidad en una frase]
├── [módulo-2]/    → [responsabilidad en una frase]
└── [módulo-3]/    → [responsabilidad en una frase]
```

**Puntos de entrada principales**: [ej: `src/index.ts`, `app/main.py`, `cmd/server/main.go`]
**Patrón de arquitectura**: [ej: MVC / hexagonal / feature-based / monolito modular / microservicios]

---

## 📏 CONVENCIONES ESPECÍFICAS DEL PROYECTO

> Solo añadir aquí lo que difiere o complementa los estándares globales.
> Si no hay diferencias, dejar esta sección vacía o eliminarla.

### Nomenclatura
- [Convención específica si difiere del estándar global, ej: "archivos de componentes en PascalCase.tsx"]

### Estructura de imports
- [Si hay un orden definido de imports, ej: "externos → internos → tipos → estilos"]

### Manejo de errores
- [Patrón específico del proyecto si existe, ej: "usar Result<T, E> en lugar de excepciones"]

### Otras convenciones
- [Cualquier otra convención relevante específica del proyecto]

---

## 🔌 FLUJOS OPCIONALES ACTIVOS

> Descomentar los flujos que estén activos en este proyecto.
> Al activar un flujo, verificar que los permisos necesarios están en .claude/settings.json.

<!-- Git workflow activado:
@~/.claude/git-workflow.md
Permisos Git adicionales en .claude/settings.json: git add, git commit, git checkout, git switch
-->

---

## 🧪 COMANDOS CLAVE

```bash
# Instalar dependencias
[comando, ej: npm install / pip install -r requirements.txt / go mod download]

# Arrancar en desarrollo
[comando, ej: npm run dev / uvicorn app.main:app --reload / go run cmd/server/main.go]

# Ejecutar tests
[comando, ej: npm test / pytest / go test ./...]

# Lint y formato
[comando, ej: npm run lint / ruff check . / golangci-lint run]

# Build
[comando, ej: npm run build / docker build . / go build ./...]
```

---

## ⚙️ VARIABLES DE ENTORNO

| Variable | Requerida | Descripción |
|---|---|---|
| `[VAR_1]` | Sí | [descripción] |
| `[VAR_2]` | No | [descripción — default: valor] |

→ Ver `.env.example` en la raíz del proyecto para el conjunto completo.

---

## 🚫 RESTRICCIONES ESPECÍFICAS DEL PROYECTO

> Solo restricciones adicionales a las globales. Nunca eliminar las globales.

- [Ej: No modificar archivos en `src/generated/` — son auto-generados por el build]
- [Ej: La carpeta `legacy/` es solo lectura — no modificar sin aprobación del tech lead]
- [Ej: Toda llamada a la API externa debe pasar por `src/services/api-client.ts`]

---

## 📝 NOTAS PARA CLAUDE

> Contexto específico que Claude debe conocer para trabajar eficientemente en este proyecto.
> Decisiones técnicas no obvias, deuda técnica conocida, módulos problemáticos, gotchas.

- [Nota 1, ej: "El módulo de pagos usa una versión antigua de Stripe SDK — no actualizar sin avisarme"]
- [Nota 2, ej: "Los tests de integración requieren Docker corriendo localmente"]
- [Nota 3, ej: "La lógica de precios en pricing.ts tiene un bug conocido en descuentos combinados — ver issue #42"]
