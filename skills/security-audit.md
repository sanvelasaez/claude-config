---
name: security-audit
description: Auditar código que maneje datos sensibles, autenticación, autorización o credenciales. Activar cuando el código toca auth, sesiones, inputs externos, criptografía, APIs externas o almacenamiento de datos de usuario.
---

## Áreas de auditoría

### AUTENTICACIÓN Y SESIONES
- ¿Se valida correctamente la identidad del usuario en cada operación sensible?
- ¿Los tokens/sesiones tienen expiración configurada?
- ¿Los tokens se almacenan de forma segura (no en localStorage para apps sensibles)?
- ¿Hay protección contra fuerza bruta (rate limiting, lockout)?
- ¿Se invalidan las sesiones al hacer logout?

### AUTORIZACIÓN
- ¿Cada endpoint verifica permisos antes de operar (no solo autenticación)?
- ¿Hay separación entre roles y la lógica de roles está centralizada?
- ¿Se valida que el usuario tiene acceso al recurso específico solicitado (IDOR)?
- ¿Los errores de autorización devuelven 403, no 404 (información de existencia)?

### VALIDACIÓN DE INPUTS (OWASP Top 10)
- Inyección SQL: ¿se usan queries parametrizadas o ORMs que las garanticen?
- XSS: ¿se escapan outputs al renderizar en HTML?
- Command injection: ¿se evita pasar input del usuario a exec/shell/eval?
- Path traversal: ¿se validan y normalizan rutas de archivo?
- SSRF: ¿se validan y filtran URLs que el servidor va a consultar?
- Deserialización insegura: ¿se valida el tipo de datos antes de deserializar?

### SECRETOS Y CREDENCIALES
- ¿Hay API keys, passwords o tokens hardcodeados en el código?
- ¿Los secrets vienen de variables de entorno o un vault dedicado?
- ¿Los logs pueden exponer datos sensibles (passwords, tokens, PII)?
- ¿Las respuestas de API exponen más datos de los necesarios (over-exposure)?
- ¿Los mensajes de error revelan información interna del sistema?

### CRIPTOGRAFÍA
- ¿Se usan algoritmos actuales (AES-256, SHA-256+, RSA-2048+, ECDSA)?
- ¿Nunca MD5 o SHA1 para datos de seguridad (solo para checksums no críticos)?
- ¿Las passwords se hashean con bcrypt, argon2 o scrypt (no SHA simple)?
- ¿Los números aleatorios de seguridad usan CSPRNG (no Math.random())?
- ¿Los IVs/nonces son únicos por operación de cifrado?

### DEPENDENCIAS
→ Invocar centinel-auditor para cualquier dependencia nueva o actualización.

## Formato de salida

Por cada vulnerabilidad encontrada:
```
[CRÍTICO/ALTO/MEDIO/BAJO] Nombre del vector (ej: SQL Injection, Broken Auth)
→ Ubicación: archivo:línea
→ Descripción: cómo se manifiesta el riesgo en este código concreto
→ Impacto: qué puede hacer un atacante si explota esto
→ Remediación: cambio concreto y específico con ejemplo de código si aplica
```

Referencia: OWASP Top 10 — https://owasp.org/www-project-top-ten/
