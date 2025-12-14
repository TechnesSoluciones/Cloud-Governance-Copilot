# E2E Tests Validation Checklist
## Cloud Governance Copilot

Use este checklist para validar que los tests E2E están funcionando correctamente.

---

## Pre-requisitos

### 1. Servicios Corriendo

- [ ] Backend corriendo en `http://localhost:3010`
  ```bash
  cd apps/api-gateway
  npm run dev
  ```

- [ ] Frontend corriendo en `http://localhost:3000`
  ```bash
  cd apps/frontend
  npm run dev
  ```

- [ ] Verificar servicios
  ```bash
  curl http://localhost:3000
  curl http://localhost:3010/health
  ```

### 2. Test Data

- [ ] Usuario demo existe en base de datos
  - Email: `demo@example.com`
  - Password: `Demo123!@#`

- [ ] Usuario admin existe (opcional)
  - Email: `admin@cloudcopilot.com`
  - Password: `Admin123!@#`

- [ ] Base de datos tiene datos de prueba (opcional pero recomendado):
  - Al menos 1 cuenta cloud conectada
  - Algunos datos de costos
  - Algunos hallazgos de seguridad
  - Algunos assets

---

## Validación de Archivos

### Tests E2E

- [ ] `tests/e2e/auth.spec.ts` existe (6 tests)
- [ ] `tests/e2e/cloud-account.spec.ts` existe (4 tests)
- [ ] `tests/e2e/cost-dashboard.spec.ts` existe (5 tests)
- [ ] `tests/e2e/assets.spec.ts` existe (6 tests)
- [ ] `tests/e2e/security.spec.ts` existe (6 tests)
- [ ] `tests/e2e/helpers.ts` existe
- [ ] `tests/e2e/README.md` existe
- [ ] `tests/e2e/.env.example` existe

### Configuración

- [ ] `playwright.config.ts` actualizado (baseURL: localhost:3000)
- [ ] `playwright.critical-flows.config.ts` existe
- [ ] `TESTING.md` existe
- [ ] `E2E_IMPLEMENTATION_SUMMARY.md` existe
- [ ] `scripts/run-e2e-tests.sh` existe y es ejecutable

### Package.json Scripts

- [ ] `test:e2e:critical` script existe
- [ ] `test:e2e:critical:ui` script existe
- [ ] `test:e2e:critical:headed` script existe
- [ ] `test:e2e:critical:report` script existe

---

## Ejecución de Tests

### 1. Listar Tests

```bash
cd apps/frontend
npx playwright test --config=playwright.critical-flows.config.ts --list
```

**Resultado esperado:**
```
Total: 27 tests in 5 files
```

- [ ] Se listan 27 tests
- [ ] Se listan 5 archivos (auth, cloud-account, cost-dashboard, assets, security)

### 2. Ejecutar Tests (Modo Headless)

```bash
npm run test:e2e:critical
```

**Validar:**
- [ ] Tests se ejecutan sin errores de configuración
- [ ] Al menos algunos tests pasan (idealmente todos)
- [ ] No hay errores de sintaxis
- [ ] Se genera carpeta `test-results/`

### 3. Ejecutar Tests (Modo UI)

```bash
npm run test:e2e:critical:ui
```

**Validar:**
- [ ] Se abre la interfaz de Playwright
- [ ] Se pueden ver los 27 tests
- [ ] Se puede ejecutar un test individual
- [ ] Se puede ver el estado del DOM
- [ ] Se pueden ver los locators

### 4. Ejecutar Tests (Modo Headed)

```bash
npm run test:e2e:critical:headed
```

**Validar:**
- [ ] Se abre el navegador Chrome
- [ ] Se puede ver la ejecución de tests
- [ ] Tests navegan correctamente
- [ ] No hay errores evidentes

### 5. Ver Reporte

```bash
npm run test:e2e:critical:report
```

**Validar:**
- [ ] Se abre reporte HTML en navegador
- [ ] Se pueden ver resultados de tests
- [ ] Screenshots están disponibles (si hubo failures)
- [ ] Se pueden ver trazas de ejecución

---

## Validación por Flujo

### Flujo 1: Authentication (auth.spec.ts)

```bash
npx playwright test tests/e2e/auth.spec.ts --config=playwright.critical-flows.config.ts
```

**Tests a validar:**
- [ ] ✅ should register new user successfully
- [ ] ✅ should login existing user
- [ ] ✅ should show error for invalid credentials
- [ ] ✅ should logout successfully
- [ ] ✅ should prevent access to protected routes when not logged in
- [ ] ✅ should handle password validation on registration

### Flujo 2: Cloud Account Connection (cloud-account.spec.ts)

```bash
npx playwright test tests/e2e/cloud-account.spec.ts --config=playwright.critical-flows.config.ts
```

**Tests a validar:**
- [ ] ✅ should connect AWS account
- [ ] ✅ should connect Azure account
- [ ] ✅ should show validation errors for invalid credentials
- [ ] ✅ should display list of connected accounts

### Flujo 3: Cost Dashboard (cost-dashboard.spec.ts)

```bash
npx playwright test tests/e2e/cost-dashboard.spec.ts --config=playwright.critical-flows.config.ts
```

**Tests a validar:**
- [ ] ✅ should navigate to cost dashboard and see data
- [ ] ✅ should filter costs by date range
- [ ] ✅ should filter costs by service
- [ ] ✅ should display cost breakdown by provider
- [ ] ✅ should show cost trends over time

### Flujo 4: Asset Inventory (assets.spec.ts)

```bash
npx playwright test tests/e2e/assets.spec.ts --config=playwright.critical-flows.config.ts
```

**Tests a validar:**
- [ ] ✅ should navigate to assets and see inventory
- [ ] ✅ should filter assets by provider
- [ ] ✅ should view asset details
- [ ] ✅ should search for specific assets
- [ ] ✅ should display asset statistics
- [ ] ✅ should filter assets by resource type

### Flujo 5: Security Findings (security.spec.ts)

```bash
npx playwright test tests/e2e/security.spec.ts --config=playwright.critical-flows.config.ts
```

**Tests a validar:**
- [ ] ✅ should navigate to security and see findings
- [ ] ✅ should filter findings by severity
- [ ] ✅ should trigger security scan
- [ ] ✅ should resolve security finding
- [ ] ✅ should display security score or metrics
- [ ] ✅ should show severity distribution

---

## Validación de Helper Functions

### Login Helper

```bash
# Ejecutar cualquier test que use login
npx playwright test tests/e2e/cost-dashboard.spec.ts --config=playwright.critical-flows.config.ts -g "navigate to cost"
```

**Validar:**
- [ ] Login se ejecuta correctamente
- [ ] Redirige a dashboard
- [ ] No hay errores de autenticación

### Other Helpers

**Archivo:** `tests/e2e/helpers.ts`

Funciones a revisar:
- [ ] `login()` - función definida
- [ ] `logout()` - función definida
- [ ] `waitForLoadingToComplete()` - función definida
- [ ] `generateTestEmail()` - función definida
- [ ] `generateTestName()` - función definida
- [ ] `TEST_USERS` - objeto definido con demo y admin

---

## Validación de Script Automatizado

```bash
./scripts/run-e2e-tests.sh critical
```

**Validar:**
- [ ] Script es ejecutable
- [ ] Verifica que backend está corriendo
- [ ] Verifica que frontend está corriendo
- [ ] Ejecuta tests
- [ ] Muestra mensaje de éxito/error

**Probar otros modos:**
```bash
./scripts/run-e2e-tests.sh ui
./scripts/run-e2e-tests.sh headed
```

---

## Validación de Configuración

### Playwright Config

**Archivo:** `playwright.critical-flows.config.ts`

Verificar valores:
- [ ] `testDir: './tests/e2e'`
- [ ] `baseURL: 'http://localhost:3000'`
- [ ] `timeout: 60000`
- [ ] `retries: CI ? 2 : 0`
- [ ] `screenshot: 'only-on-failure'`
- [ ] `video: 'retain-on-failure'`

### Package.json

Verificar scripts:
```bash
npm run test:e2e:critical --help
```

- [ ] Script existe
- [ ] No hay errores de sintaxis

---

## Troubleshooting

### Si tests fallan

1. **Verificar servicios:**
   ```bash
   curl http://localhost:3000
   curl http://localhost:3010/health
   ```

2. **Ver logs de tests:**
   ```bash
   npm run test:e2e:critical:headed
   ```

3. **Ver reporte detallado:**
   ```bash
   npm run test:e2e:critical:report
   ```

4. **Ejecutar en modo UI:**
   ```bash
   npm run test:e2e:critical:ui
   ```

5. **Ver screenshots:**
   ```bash
   ls test-results/
   ```

### Si usuario no existe

Crear usuario demo manualmente:
```sql
INSERT INTO users (email, password, name)
VALUES ('demo@example.com', '<hashed_password>', 'Demo User');
```

O registrarse a través de la UI:
```bash
# Abrir navegador
open http://localhost:3000/register
```

---

## Checklist Final

### Antes de Marcar como Completo

- [ ] Al menos 20 de 27 tests pasan (74%+)
- [ ] No hay errores de configuración
- [ ] Todos los archivos existen
- [ ] Documentación está completa
- [ ] Scripts NPM funcionan
- [ ] Script bash funciona
- [ ] Reporte HTML se genera

### Métricas de Éxito

| Métrica | Target | Actual |
|---------|--------|--------|
| Tests implementados | 27 | ___ |
| Tests passing | 20+ | ___ |
| Archivos creados | 12+ | ___ |
| Scripts NPM | 4 | ___ |
| Documentación | 3 archivos | ___ |

---

## Notas Importantes

1. **Tests pueden fallar si no hay datos:** Algunos tests esperan encontrar datos (costos, assets, security findings). Esto es normal en un ambiente vacío.

2. **Tests son resilientes:** Usan múltiples estrategias de búsqueda, así que si la UI cambia, aún deberían funcionar.

3. **CI/CD:** Los tests están configurados para ejecutarse en CI con 2 retries automáticos.

4. **Performance:** Los 27 tests toman aproximadamente 5-10 minutos en ejecutarse completamente.

---

## Próximos Pasos

Una vez que todos los tests pasan:

1. [ ] Integrar en pipeline CI/CD
2. [ ] Configurar ejecución nocturna
3. [ ] Agregar notificaciones de failures
4. [ ] Crear dashboard de métricas
5. [ ] Documentar casos edge que fallan
6. [ ] Agregar más tests según sea necesario

---

## Firma de Validación

**Validado por:** _________________

**Fecha:** _________________

**Tests Passing:** ___ / 27

**Notas:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

**¡Validación Completa! 🎉**

Una vez que todos los checkboxes estén marcados, los E2E tests están listos para producción.
