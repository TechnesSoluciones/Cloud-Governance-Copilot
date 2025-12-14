# Quick Start - E2E Tests
## Cloud Governance Copilot

## TL;DR - Ejecutar Tests Ahora

```bash
# 1. Asegura que backend y frontend estén corriendo
# Terminal 1: cd apps/api-gateway && npm run dev
# Terminal 2: cd apps/frontend && npm run dev

# 2. Ejecuta los tests
cd apps/frontend
npm run test:e2e:critical

# O usa el script automatizado
./scripts/run-e2e-tests.sh critical
```

---

## Comandos Más Usados

### Ejecutar Tests

```bash
# Todos los critical flows (27 tests)
npm run test:e2e:critical

# Modo UI - RECOMENDADO para desarrollo
npm run test:e2e:critical:ui

# Ver navegador mientras se ejecutan
npm run test:e2e:critical:headed

# Ver reporte HTML
npm run test:e2e:critical:report
```

### Ejecutar Tests Específicos

```bash
# Por archivo
npx playwright test tests/e2e/auth.spec.ts --config=playwright.critical-flows.config.ts

# Por nombre de test
npx playwright test --config=playwright.critical-flows.config.ts -g "should login"

# Solo un flujo específico
npx playwright test tests/e2e/cost-dashboard.spec.ts --config=playwright.critical-flows.config.ts
```

### Debugging

```bash
# Modo UI (mejor opción)
npm run test:e2e:critical:ui

# Ver navegador
npm run test:e2e:critical:headed

# Ver reporte después de ejecución
npm run test:e2e:critical:report
```

---

## Estructura de Tests

```
tests/e2e/
├── auth.spec.ts              (6 tests) - Autenticación
├── cloud-account.spec.ts     (4 tests) - Cuentas Cloud
├── cost-dashboard.spec.ts    (5 tests) - Costos
├── assets.spec.ts            (6 tests) - Assets
├── security.spec.ts          (6 tests) - Seguridad
└── helpers.ts                          - Utilidades
```

**Total: 27 tests**

---

## Pre-requisitos

1. Backend corriendo en `http://localhost:3010`
2. Frontend corriendo en `http://localhost:3000`
3. Usuario demo existe: `demo@example.com` / `Demo123!@#`

---

## Verificar Todo Está Bien

```bash
# Listar todos los tests
npx playwright test --config=playwright.critical-flows.config.ts --list

# Debería mostrar: "Total: 27 tests in 5 files"
```

---

## Script Automatizado

```bash
# Verifica servicios y ejecuta tests
./scripts/run-e2e-tests.sh critical

# Modo UI
./scripts/run-e2e-tests.sh ui

# Ver navegador
./scripts/run-e2e-tests.sh headed
```

---

## Archivos de Documentación

- `TESTING.md` - Guía completa de testing
- `E2E_IMPLEMENTATION_SUMMARY.md` - Resumen de implementación
- `E2E_VALIDATION_CHECKLIST.md` - Checklist de validación
- `tests/e2e/README.md` - Documentación técnica detallada

---

## Troubleshooting Rápido

### Error: "Timeout waiting for navigation"
```bash
# Verificar servicios
curl http://localhost:3000
curl http://localhost:3010/health
```

### Error: "Element not found"
```bash
# Ejecutar en modo UI para debugging
npm run test:e2e:critical:ui
```

### Error: "Authentication failed"
```bash
# Verificar usuario demo existe
# Email: demo@example.com
# Password: Demo123!@#
```

---

## CI/CD

Para GitHub Actions, agrega a tu workflow:

```yaml
- name: Run E2E Tests
  run: |
    cd apps/frontend
    npx playwright test --config=playwright.critical-flows.config.ts
```

---

## Próximos Pasos

1. Ejecuta `npm run test:e2e:critical:ui` para explorar los tests
2. Lee `TESTING.md` para guía completa
3. Revisa `E2E_IMPLEMENTATION_SUMMARY.md` para detalles técnicos

---

**¡Listo para testear! 🚀**
