---
name: test-writer
description: Escribir tests para código nuevo o modificado. Activar cuando se completa una función o módulo sin tests, cuando @qa identifica gaps de cobertura, o cuando se corrige un bug que debe quedar cubierto con un test de regresión.
---

## Estrategia de testing

### 1. IDENTIFICAR QUÉ TESTEAR
Antes de escribir código, mapear los casos relevantes:
- Camino feliz (happy path): el flujo principal que debe funcionar
- Edge cases: inputs vacíos, nulos, límites (min/max), strings especiales, listas vacías
- Casos de error: qué pasa cuando falla algo esperado (excepción, null, error de red)
- Regresión: casos que han fallado antes y no deben volver a fallar

### 2. ESTRUCTURA DE UN BUEN TEST (AAA)
```
Arrange: preparar el estado inicial y los datos de entrada
Act:     ejecutar la función o comportamiento bajo prueba
Assert:  verificar el resultado o efecto esperado
```
Un test = un comportamiento. Si el test necesita verificar cosas no relacionadas, dividirlo.

### 3. PRIORIDAD DE COBERTURA
1. Lógica de negocio crítica (no el framework, la lógica del dominio propio)
2. Código que maneja datos del usuario o de sistemas externos
3. Código que ha fallado en producción anteriormente
4. Integraciones con sistemas externos (con doubles apropiados)

### 4. TIPOS DE TEST A GENERAR

**Tests unitarios** (la mayoría):
- Prueban una unidad de lógica con dependencias substituidas por doubles
- Rápidos, deterministas, sin I/O real ni red
- Testean una sola responsabilidad por archivo de test

**Tests de integración** (cuando el contrato importa):
- Verifican que los módulos se integran correctamente entre sí
- Usar dependencias reales cuando la integración es el objeto de prueba
- Más lentos pero más fieles al comportamiento en producción

**Tests de contrato de API** (si hay API pública):
- Verificar que los endpoints responden con la estructura documentada
- Cubrir status codes correctos, estructura de respuesta y manejo de errores

### 5. NOMENCLATURA
```
describe('<Componente o módulo bajo prueba>') {
  it('<comportamiento esperado en lenguaje natural>') { ... }
}

// Ejemplos:
describe('UserService') {
  it('returns null when the user does not exist')
  it('throws AuthError when the password is incorrect')
  it('updates lastLogin timestamp on successful authentication')
}
```

### 6. COBERTURA MÍNIMA
- 80% en código nuevo (límite establecido en el proyecto)
- Priorizar cobertura de branches sobre cobertura de líneas
- No perseguir el 100%: testear comportamientos, no líneas

### 7. LO QUE NO HACER
- No mockear la base de datos cuando el test valida el comportamiento de una query concreta
- No testear getters/setters triviales sin lógica adicional
- No copiar el código de producción en el test (el test no verificaría nada real)
- No usar sleep/timeouts fijos: usar mocks de tiempo, fake timers o callbacks
- No escribir tests que dependen del orden de ejecución entre ellos
