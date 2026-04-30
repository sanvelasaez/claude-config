---
name: centinel-auditor
description: Auditar cualquier elemento de origen externo antes de instalarlo o usarlo: skills de marketplace o comunidad, plugins, MCP servers, paquetes npm/pip/cargo, scripts de instalación, herramientas CLI, extensiones y cualquier código no escrito en este proyecto. También se activa al detectar dependencias nuevas en archivos de proyecto (package.json, requirements.txt, pubspec.yaml, go.mod, Cargo.toml).
---

## Qué auditar

Cualquier elemento externo: skills, MCP servers, dependencias (npm/pip/cargo/gems/pub),
scripts de instalación, herramientas CLI, plugins, extensiones, repositorios de terceros.

> El hook `centinel_preflight.js` actúa en tiempo real de forma automática.
> Esta skill guía el análisis manual profundo cuando el hook no puede aplicar.

---

## Proceso obligatorio

### 1. VERIFICAR ORIGEN

- ¿Es oficial (Anthropic, organización verificada) o de tercero?
- ¿Tiene página pública con información clara sobre autor y propósito?
- ¿El repositorio tiene mantenimiento activo y actividad reciente (último commit < 6 meses)?
- ¿Cuántas instalaciones/stars tiene? ¿El ratio stars/forks es sospechosamente alto? (posible star-farming)
- ¿Los contributors son cuentas reales con historial consistente?
- ¿Hay issues abiertos de seguridad sin respuesta del mantenedor?

### 2. REVISAR CÓDIGO

Para cada archivo relevante del elemento externo:

**Permisos y accesos:**
- ¿Qué permisos solicita? ¿Son proporcionales a lo que declara hacer?
- ¿Lee o escribe archivos del sistema? ¿Cuáles concretamente?
- ¿Tiene acceso a variables de entorno? ¿A cuáles?
- ¿Accede a `~/.ssh`, `~/.aws`, `~/.kube`, `~/.docker`, archivos `.env`?

**Red:**
- ¿Hace llamadas de red? ¿A qué endpoints?
- ¿Los dominios están en la allowlist conocida (api.github.com, pypi.org, npmjs.com...)?
- ¿Hay llamadas a servicios de exfiltración (pastebin, ngrok, webhook.site, transfer.sh)?
- ¿Se usa base64 + curl/wget combinados?

**Ejecución:**
- ¿Hay código ofuscado, eval/exec dinámico, o base64 sin justificación?
- ¿Se usan subprocesos con `shell=True` + input de usuario?
- ¿Hay scripts de instalación (postinstall, prepare, install.sh) que ejecutan código adicional?
- ¿El código que hace la función declarada coincide con el código que realmente se ejecuta? (coherencia)

**Prompt injection (específico para MCP servers):**
- ¿El server puede recibir instrucciones de contenido externo que lleguen al modelo?
- ¿Lee archivos, URLs o datos de usuario sin sanitización antes de pasarlos al contexto?
- ¿Permite que una página web o un archivo malicioso inyecte instrucciones al modelo?

### 3. INVESTIGACIÓN MULTI-FUENTE

Buscar información del paquete/herramienta en:

1. **GitHub Advisory Database** — `https://github.com/advisories?query=<nombre>`
2. **VulnCheck / OSV.dev** — `https://osv.dev/list?q=<nombre>`
3. **npm audit / pip audit** — si aplica al ecosistema
4. **Reputación del autor** — otros proyectos del mismo autor, consistencia de identidad

### 4. ANÁLISIS DE COHERENCIA

Verificar que el comportamiento real coincide con el declarado:

- ¿El README describe exactamente lo que el código hace?
- ¿Los permisos solicitados son necesarios para la función declarada o van más allá?
- ¿Hay funcionalidad "extra" no documentada que podría ser maliciosa?
- ¿El changelog/historial de commits es coherente con las versiones publicadas?

### 5. DETECCIÓN DE SUPPLY CHAIN ATTACKS

Señales de alerta específicas de ataques a la cadena de suministro:

- Versión muy reciente con cambio de propietario del paquete
- Nombre muy similar a un paquete popular (typosquatting): `reqeusts` vs `requests`
- Dependencia transitiva añadida recientemente que accede a red/filesystem
- Scripts `postinstall` o `prepare` que ejecutan código de red
- Diferencia inexplicable entre el código del repo y el paquete publicado (auditar con `npm pack --dry-run`)

### 6. EVALUACIÓN DE RIESGO

| Nivel | Señales |
|-------|---------|
| 🔴 CRÍTICO | Permisos excesivos, código ofuscado, llamadas a dominios desconocidos, scripts de instalación sospechosos, prompt injection confirmada |
| 🟠 ALTO | Acceso amplio a filesystem/red/entorno sin justificación, author desconocido con repositorio nuevo |
| 🟡 MEDIO | Poco historial, author desconocido pero código revisable y transparente |
| 🟢 BAJO | Fuente verificada, código abierto revisado, uso amplio en comunidad, sin flags de seguridad |

### 7. VEREDICTO

- ✅ **SEGURO** — proceder con la instalación/activación
- ⚠️ **PRECAUCIÓN** — informar al usuario de los riesgos específicos y pedir confirmación explícita describiendo qué se asume
- ❌ **BLOQUEADO** — no instalar bajo ninguna circunstancia; explicar exactamente qué patrón malicioso se detectó

---

## Separación de responsabilidades

| Qué hace `centinel_preflight.js` (hook automático) | Qué hace esta skill (análisis manual) |
|---|---|
| Bloquea comandos destructivos en tiempo real | Audita reputación y código de elementos externos |
| Detecta exfiltración en URLs/comandos en tiempo real | Investiga en fuentes de seguridad (Advisory DB, OSV) |
| Alerta sobre escritura en rutas sensibles | Evalúa coherencia entre código declarado y real |
| Detecta prompt injection en archivos de config Claude | Analiza supply chain y dependencias transitivas |
| Funciona en cada herramienta sin intervención humana | Requiere invocación explícita antes de cada instalación |

---

## Regla absoluta

Ningún elemento externo se instala, activa o usa sin pasar por esta auditoría.
Si el usuario insiste en saltarse la auditoría, registrar la advertencia
y exigir confirmación explícita describiendo el riesgo asumido.
