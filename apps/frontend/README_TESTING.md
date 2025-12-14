# Frontend Testing Guide - Cloud Copilot

Bienvenido al plan integral de pruebas para validar todas las mejoras frontend del Cloud Copilot. Este documento te guiará paso a paso.

---

## Documentos de Testing Disponibles

| Documento | Propósito | Tiempo | Para Quién |
|-----------|----------|--------|-----------|
| **FRONTEND_TESTING_PLAN.md** | Plan completo y detallado | 60+ min de lectura | QA Engineers, Leads |
| **TESTING_QUICK_REFERENCE.md** | Checklists rápidos y comandos | 5-10 min lectura | Testers, Devs |
| **TESTING_EXECUTION_CHECKLIST.md** | Formato imprimible para marcar | Uso durante testing | Testers en ejecución |
| **README_TESTING.md** | Este documento - Guía de inicio | 10 min | Todos |

---

## Inicio Rápido (5 minutos)

### Paso 1: Setup del Entorno

```bash
# Navega al directorio frontend
cd /Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend

# Instala dependencias
npm install

# Inicia servidor de desarrollo
npm run dev
```

Deberías ver:
```
  ▲ Next.js 14.0.4
  - Local:        http://localhost:3000
```

### Paso 2: Abre el Navegador

```
http://localhost:3000
```

Abre DevTools (F12) - Console debería estar limpia (sin errores rojos)

### Paso 3: Elige Tu Rol

**Si eres QA/Tester:**
1. Abre `TESTING_EXECUTION_CHECKLIST.md`
2. Imprime o abre en segunda pantalla
3. Sigue las 13 fases de testing
4. Marca checkboxes según avances

**Si eres Developer:**
1. Abre `TESTING_QUICK_REFERENCE.md`
2. Ejecuta comandos clave
3. Verifica que tests pasen localmente
4. Reporta issues encontrados

**Si eres Lead/Manager:**
1. Lee sección "Executive Summary" en FRONTEND_TESTING_PLAN.md
2. Sigue "Criterios de Aceptación"
3. Revisa "Reportes de Ejecución"

---

## Mejoras a Probar (Resumen)

Estas 10 mejoras deben validarse:

| # | Mejora | Estado Esperado | Riesgo |
|---|--------|-----------------|--------|
| 1 | Iconos Lucide React | Todos visibles sin errores | BAJO |
| 2 | Padding Responsivo | 16px/24px/32px según viewport | MEDIO |
| 3 | Design Tokens | Colores consistentes, WCAG AA | ALTO |
| 4 | PageWrapper Component | Variantes full/container/2xl/4xl | MEDIO |
| 5 | Tipografía Estandarizada | Escala consistente | BAJO |
| 6 | Transiciones en Cards | Hover suave, 200-300ms | BAJO |
| 7 | LoadingButton Component | Spinner anima, size constante | MEDIO |
| 8 | Variante 'brand' en Button | Color #ff6b35, hover #e65525 | BAJO |
| 9 | Skeleton Loaders | Animación pulse, desaparece | BAJO |
| 10 | Aria-labels | Labels para a11y, screen readers | ALTO |

---

## Fase de Testing (Opción A: Manual - 4 horas)

### Día 1 (1 hora)
- Setup y verificación inicial
- Pruebas de iconos y padding
- Design tokens y colores

```bash
# Comandos para monitorear
npm run dev           # Servidor corriendo
```

**Checklist:**
- [ ] Página carga sin errores
- [ ] Iconos visibles
- [ ] Padding correcto en 320px/768px/1024px
- [ ] Colores primarios correctos

### Día 2 (1 hora)
- PageWrapper component
- LoadingButton y Button brand
- Skeleton loaders

**Checklist:**
- [ ] PageWrapper con máx-width funciona
- [ ] LoadingButton spinner anima
- [ ] Brand button es orange (#ff6b35)
- [ ] Skeletons animan

### Día 3 (1 hora)
- Dark mode
- Accesibilidad
- Responsive design

**Checklist:**
- [ ] Dark mode activa (document.documentElement.classList.add('dark'))
- [ ] Tab navigation funciona
- [ ] Todos textos legibles (contraste >= 4.5:1)
- [ ] Responsive en 320px, 768px, 1024px, 1440px

### Día 4 (1 hora)
- Cross-browser testing
- Regresión
- Reporte final

**Checklist:**
- [ ] Chrome, Firefox, Safari funcionan igual
- [ ] Login flujo sin cambios
- [ ] Navegación completa
- [ ] Formularios guardan datos

---

## Fase de Testing (Opción B: Automático - 30 minutos)

Si prefieres pruebas automáticas con Playwright:

```bash
# Ejecutar todos los tests E2E
npm run test:e2e

# Con UI interactivo
npm run test:e2e:ui

# Solo tests críticos
npm run test:e2e:critical

# Ver reporte
npm run test:e2e:report
```

**Ventaja:** Más rápido, reproducible
**Desventaja:** No detecta issues visuales/UX

---

## Estructura del Plan

```
FRONTEND_TESTING_PLAN.md
├── 1. Resumen Ejecutivo
│   └── Tabla de mejoras, objetivos
│
├── 2. Checklist de Pruebas Manuales
│   ├── 1. Iconos Lucide React (2 test cases)
│   ├── 2. Padding Responsivo (3 test cases)
│   ├── 3. Design Tokens (3 test cases)
│   ├── 4. Dark Mode (3 test cases)
│   ├── 5. PageWrapper (5 test cases)
│   ├── 6. Tipografía (3 test cases)
│   ├── 7. Transiciones (2 test cases)
│   ├── 8. LoadingButton (4 test cases)
│   ├── 9. Button Brand (4 test cases)
│   ├── 10. Skeleton Loaders (4 test cases)
│   └── 11. Aria-labels/Accesibilidad (4 test cases)
│   └── TOTAL: ~45 test cases
│
├── 3. Test Cases por Navegador
│   ├── Chrome (3 test cases)
│   ├── Firefox (2 test cases)
│   ├── Safari (2 test cases)
│   └── Mobile (2 test cases)
│
├── 4. Test Cases de Accesibilidad
│   ├── Keyboard Navigation
│   ├── Color Contrast (WCAG AA)
│   ├── Focus Indicators
│   ├── Form Accessibility
│   ├── Screen Reader Testing
│   └── Motion/Animation
│
├── 5. Test Cases de Responsive Design
│   ├── 320px Mobile
│   ├── 768px Tablet
│   ├── 1024px Desktop
│   ├── 1440px Large Desktop
│   └── Transiciones de breakpoints
│
└── 6. Escenarios de Regresión
    ├── Critical Path (5 test cases)
    ├── Component Level (5 test cases)
    └── Visual Regression (3 test cases)
```

---

## Comandos Esenciales

```bash
# DESARROLLO
npm run dev                    # Inicia servidor local (3000)
npm run build                  # Build para producción
npm start                      # Sirve build producción

# TESTING
npm run test:e2e              # Tests Playwright completos
npm run test:e2e:ui           # UI mode (visual, paso a paso)
npm run test:e2e:headed       # Navegador visible
npm run test:e2e:debug        # Debug mode
npm run test:e2e:critical     # Solo tests críticos
npm run test:e2e:report       # Ver reporte

# QUALITY
npm run lint                   # ESLint
npm run type-check            # TypeScript check

# DEBUGGING EN CONSOLE
# Dark mode
document.documentElement.classList.add('dark')
document.documentElement.classList.remove('dark')

# Check CSS variables
document.documentElement.style.cssText

# Check responsive padding
window.getComputedStyle(document.querySelector('main')).padding
```

---

## Breakpoints Clave

El plan validar estos puntos de quiebre:

```
320px   ←→ 768px   ←→ 1024px   ←→ 1440px   ←→ 1920px
 SM       MD        LG         XL          2XL
p-4      sm:p-6    lg:p-8     lg:p-8      lg:p-8
────────────────────────────────────────────────────────
MOBILE   TABLET     DESKTOP     LARGE       HUGE
```

### En DevTools
```
F12 → Ctrl+Shift+M (Device Emulation)
Seleccionar:
- iPhone SE (375px)
- iPad (768px)
- Laptop (1024px+)
O personalizar manualmente
```

---

## Criterios de Aceptación GLOBAL

Para que testing sea EXITOSO:

### Funcionalidad
- [ ] 100% de componentes se renderizan
- [ ] No hay errores en Console
- [ ] No hay 404 en assets
- [ ] Todas acciones funcionan

### Accesibilidad
- [ ] WCAG 2.1 AA en 100%
- [ ] Keyboard navigation completa
- [ ] Screen readers pueden usar
- [ ] Focus indicators visibles

### Responsividad
- [ ] 320px: mobile optimizado
- [ ] 768px: tablet layout
- [ ] 1024px: desktop completo
- [ ] 1440px: máx-width respetado
- [ ] Sin scroll horizontal

### Performance
- [ ] Lighthouse >= 80
- [ ] Carga < 3 segundos
- [ ] Animaciones suaves (60fps)

### Dark Mode
- [ ] Se activa con `dark` class
- [ ] Colores correctos
- [ ] Legibilidad mantenida
- [ ] WCAG AA en dark también

### Cross-Browser
- [ ] Chrome 120+: OK
- [ ] Firefox 121+: OK
- [ ] Safari 17+: OK
- [ ] Mobile iOS: OK
- [ ] Mobile Android: OK

---

## Matriz de Decisión

### ¿Cuándo PASAR testing?
```
SI:
✓ >= 95% test cases PASS
✓ 0 bugs CRÍTICOS
✓ WCAG AA cumplido
✓ Responsivo en todos breakpoints
✓ Dark mode funciona

ENTONCES: APROBADO - Listo para release
```

### ¿Cuándo FALLAR testing?
```
SI:
✗ Bugs CRÍTICOS encontrados
✗ Accesibilidad < AA
✗ Dark mode roto
✗ Scroll horizontal en mobile
✗ Componentes no renderizan

ENTONCES: FALLO - Arreglar y retestear
```

---

## Reportar Issues

Cuando encuentres un bug:

```markdown
## BUG-XXX: [Título claro]

**Severidad:** [CRÍTICA|ALTA|MEDIA|BAJA]
**Componente:** [Button|Card|PageWrapper|etc]
**Navegador:** Chrome 120, Desktop 1440px

### Pasos de Reproducción
1.
2.
3.

### Resultado Esperado
[Descripción]

### Resultado Actual
[Descripción]

### Screenshot
[URL o descripción]
```

---

## Preguntas Frecuentes

### P: ¿Cuánto tiempo toma testing?
**R:**
- Manual completo: 4 horas (1 hora/día en 4 días)
- Automático (E2E): 30 minutos
- Quick check: 30 minutos

### P: ¿Necesito testear en Mac, Windows y Linux?
**R:** No, solo navegadores: Chrome, Firefox, Safari. Los mismos funcionan en cualquier OS.

### P: ¿Qué pasa si un test falla?
**R:** Reporta como bug con severidad, documenta pasos de reproducción, y reasigna a dev.

### P: ¿Puedo testear solo en Chrome?
**R:** No recomendado. Mínimo Chrome + Firefox + Safari. Mobile es importante por responsive.

### P: ¿Qué es WCAG AA?
**R:** Estándar de accesibilidad que requiere ratio de contraste 4.5:1 para texto normal.

### P: ¿Debo testear en dispositivos reales?
**R:** Ideal sí, pero DevTools emulation es suficiente para testing funcional.

### P: ¿Cuál es el documento más importante?
**R:**
1. Para ejecutar: `TESTING_EXECUTION_CHECKLIST.md`
2. Para detalles: `FRONTEND_TESTING_PLAN.md`
3. Para referencia rápida: `TESTING_QUICK_REFERENCE.md`

---

## Próximos Pasos

1. **Revisa este README** ← Estás aquí
2. **Lee TESTING_QUICK_REFERENCE.md** (5 min) ← Rápido
3. **Abre TESTING_EXECUTION_CHECKLIST.md** (Imprime o 2da pantalla)
4. **Inicia `npm run dev`** en terminal
5. **Comienza testing** siguiendo checklist
6. **Documenta resultados** en checklist
7. **Reporta bugs** encontrados

---

## Contacto

**Preguntas sobre el plan:**
- Revisa secciones relevantes en FRONTEND_TESTING_PLAN.md

**Issues encontrados:**
- Documental en TESTING_EXECUTION_CHECKLIST.md
- Crear en issue tracker con template arriba

**Cambios al plan:**
- Todos documentos están en `/apps/frontend/`
- Editable si es necesario

---

## Recursos

### Documentación Oficial
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)
- [Lucide Icons](https://lucide.dev)

### Accesibilidad
- [WCAG 2.1 Quick Ref](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [NVDA Screen Reader](https://www.nvaccess.org/)

### Performance
- [Google Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)

---

## Versionamiento

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-12-11 | Inicial - Plan completo |

---

## Checklist Antes de Empezar

- [ ] Lees este README
- [ ] Entiendes las 10 mejoras a testear
- [ ] Tienes los documentos abiertos
- [ ] `npm run dev` está corriendo
- [ ] DevTools disponible (F12)
- [ ] Navegadores actualizados
- [ ] Dispositivo móvil o emulador disponible
- [ ] 4 horas disponibles (o menos si automático)

---

**¡Listo para testear! Comienza con el TESTING_EXECUTION_CHECKLIST.md**

```
Fecha de inicio: _________________
Tester: _________________________
Status: [ ] En progreso [ ] Completado [ ] Fallido
```

---

**Fin del README - Testing Guide**
