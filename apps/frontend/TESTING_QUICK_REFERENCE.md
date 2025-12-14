# Testing Quick Reference - Frontend Copilot

Documento de referencia rápida para ejecutar pruebas. Usar junto con FRONTEND_TESTING_PLAN.md

---

## Setup Inicial (5 min)

```bash
# 1. Navegar al directorio frontend
cd /Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Abrir navegador
# http://localhost:3000
```

---

## Checklist de Pruebas Rápidas (30 min)

### 1. NAVEGADORES (15 min)
- [ ] Chrome - Página carga sin errores (F12 > Console)
- [ ] Firefox - Animaciones funcionan suavemente
- [ ] Safari - Funcionalidad completa
- [ ] Mobile - Layout responsive, sin scroll horizontal

### 2. COMPONENTES CLAVE (10 min)
- [ ] Button (default, outline, ghost, brand, destructive)
- [ ] LoadingButton - Spinner anima, botón se disablediza
- [ ] Card - Hover effect visible, transición suave
- [ ] PageWrapper - Padding responsive (16px/24px/32px)
- [ ] Skeleton - Animación pulse visible
- [ ] Dark Mode - Colores oscuros, legible

### 3. ACCESIBILIDAD (5 min)
- [ ] Tab - Navegación lógica izquierda a derecha
- [ ] Focus - Outline visible en todos elementos
- [ ] Screen Reader - Aria-labels presentes en buttons sin texto

---

## Comandos Rápidos

```bash
# Desarrollo
npm run dev                      # Inicia servidor local

# Tests
npm run test:e2e               # Ejecuta Playwright tests
npm run test:e2e:ui            # UI interactivo
npm run test:e2e:headed        # Con navegador visible
npm run test:e2e:critical      # Solo tests críticos

# Linting
npm run lint                    # ESLint
npm run type-check             # TypeScript

# Build
npm run build                  # Production build
npm start                      # Servir build
```

---

## Breakpoints a Testear

| Dispositivo | Ancho | Padding | Checklist |
|-------------|-------|---------|-----------|
| Mobile | 320px | 16px (p-4) | [ ] Sin scroll H, legible |
| Tablet | 768px | 24px (sm:p-6) | [ ] Layout 2 col, centrado |
| Desktop | 1024px | 32px (lg:p-8) | [ ] Layout completo |
| Large | 1440px | 32px (lg:p-8) | [ ] Max-width respetado |

### En DevTools
```
1. F12 > Ctrl+Shift+M (Device Emulation)
2. Seleccionar tamaño o personalizado
3. Verificar padding y layout
```

---

## Colores Design Tokens

### Light Mode
| Token | Valor | Uso |
|-------|-------|-----|
| Primary | #ff6b35 (Orange) | Buttons, highlights |
| Secondary | #0078d4 (Blue) | Secondary actions |
| Success | #34a853 (Green) | Confirmaciones |
| Error | #dc2626 (Red) | Errores, destructive |
| Background | #ffffff (White) | Fondo |
| Foreground | #232f3e (Dark) | Texto |

### Dark Mode (agregar `dark` class a root)
```javascript
// En Console para testear
document.documentElement.classList.add('dark')
document.documentElement.classList.remove('dark')
```

| Token | Valor | Cambio |
|-------|-------|--------|
| Background | #232f3e (Navy) | Oscurece |
| Foreground | #ffffff (White) | Aclara |
| Cards | #2a3d52 (Gris Navy) | Visible |

---

## Test Cases Críticos (5 cada uno)

### TC-ICONS-001: Iconos Lucide
```
1. Abrir navegador (dev mode)
2. F12 > Console - Sin errores
3. Encontrar button con ícono
4. Verificar ícono visible y nítido
5. PASS si: visible, correcto tamaño, sin errores
```

### TC-PADDING-001: Padding Mobile (320px)
```
1. F12 > Ctrl+Shift+M
2. iPhone SE (375px)
3. Verificar margen en bordes ≈ 16px
4. Verificar contenido legible
5. PASS si: padding correcto, sin scroll H
```

### TC-LOADINGBUTTON-001: Estado Cargando
```
1. Encontrar formulario con LoadingButton
2. Click en enviar
3. Observar spinner aparece
4. Esperar carga o cancelar
5. PASS si: spinner visible, botón disabled, ancho constante
```

### TC-BRAND-001: Button Brand
```
1. Encontrar button variant="brand"
2. Color = #ff6b35 (orange)
3. Hover = #e65525 (darker orange)
4. Contraste con texto blanco >= 4.5:1
5. PASS si: colores correctos, hover visible
```

### TC-DARKMODE-001: Dark Mode Activación
```
1. Console: document.documentElement.classList.add('dark')
2. Observar interfaz se oscurece
3. Texto debe ser blanco/claro
4. Verificar todos elementos visibles
5. PASS si: oscuro, legible, todos elementos visibles
```

---

## Checklist de Accesibilidad (3 min)

```javascript
// Ejecutar en Console para auditoría rápida

// 1. Focus visible
// Presionar Tab 5 veces - Debe verse outline en elemento

// 2. Colores en dark mode
document.documentElement.classList.add('dark')
// Verificar contraste visualmente

// 3. Aria-labels en buttons sin texto
document.querySelectorAll('button:not(:has(*))').forEach(btn => {
  if (!btn.ariaLabel && !btn.textContent.trim()) {
    console.warn('Button sin label', btn)
  }
})
```

---

## Common Issues & Fixes

| Issue | Síntoma | Verificación |
|-------|---------|--------------|
| Padding no responsivo | Margen igual 320px/1440px | Verificar media queries |
| Dark mode no funciona | Colors no cambian | Verificar CSS variables |
| Iconos no renderizados | Espacio vacío | Verificar Lucide imports |
| LoadingButton size jump | Botón cambia ancho cargando | Verificar minWidth capture |
| Color contrast WCAG | Texto difícil de leer | Usar WebAIM contrast checker |
| Skeleton no anima | Placeholder estático | Verificar animate-pulse clase |

---

## Performance Checklist

```
Lighthouse (Chrome DevTools)
1. F12 > Lighthouse
2. Generate report (Desktop)
3. Verificar scores:
   - Performance >= 80
   - Accessibility >= 90
   - Best Practices >= 90
   - SEO >= 90
```

---

## Screenshot Points (para visual regression)

Capturar screenshots en estos puntos clave:

### Desktop (1440px)
- [ ] Homepage/Dashboard
- [ ] Page con cards
- [ ] Page con tabla
- [ ] Dark mode de arriba
- [ ] Form/Modal

### Mobile (375px)
- [ ] Homepage/Dashboard
- [ ] Page con cards (stacked)
- [ ] Navigation (sidebar collapsed)
- [ ] Dark mode

### Guardar como:
```
screenshots/
  ├─ tc-{id}-{navegador}-{estado}-{fecha}.png
  ├─ tc-001-chrome-light-2025-12-11.png
  ├─ tc-001-safari-dark-2025-12-11.png
  └─ ...
```

---

## Bug Report Template

```markdown
## BUG-XXX: [Título descriptivo]

**Severidad:** [CRÍTICA / ALTA / MEDIA / BAJA]
**Componente:** [Button / Card / PageWrapper / etc]

### Pasos de Reproducción
1.
2.
3.

### Resultado Esperado
[Descripción]

### Resultado Actual
[Descripción]

### Navegador
- Chrome 120
- Desktop 1440px

### Screenshot
[Adjuntar si aplica]

### Notas
[Observaciones adicionales]
```

---

## Links Útiles

- **Tailwind Docs:** https://tailwindcss.com/docs
- **Lucide Icons:** https://lucide.dev
- **Radix UI:** https://www.radix-ui.com/docs/primitives/overview/introduction
- **WCAG 2.1 AA:** https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM Contrast:** https://webaim.org/resources/contrastchecker/
- **Lighthouse:** https://developers.google.com/web/tools/lighthouse

---

## Testing Workflow Recomendado

### Día 1: Componentes Base
1. Ejecutar TC-ICONS-001 a TC-ICONS-002
2. Ejecutar TC-PADDING-001 a TC-PADDING-003
3. Ejecutar TC-TOKENS-001 a TC-TOKENS-003
4. **Resultado:** Pasar/Fallar en matriz

### Día 2: Componentes Avanzados
1. Ejecutar TC-PAGEWRAPPER-001 a TC-PAGEWRAPPER-005
2. Ejecutar TC-LOADINGBUTTON-001 a TC-LOADINGBUTTON-004
3. Ejecutar TC-BRAND-001 a TC-BRAND-004
4. **Resultado:** Pasar/Fallar en matriz

### Día 3: Accesibilidad & Responsividad
1. Ejecutar TC-ARIA-001 a TC-ARIA-004
2. Ejecutar TC-RESPONSIVE-320-001 a TC-RESPONSIVE-1440-002
3. Ejecutar TC-A11Y-001 a TC-A11Y-006
4. **Resultado:** Pasar/Fallar en matriz

### Día 4: Navegadores & Regresión
1. Ejecutar TC-CHROME-001 a TC-CHROME-003
2. Ejecutar TC-FIREFOX-001 a TC-FIREFOX-002
3. Ejecutar TC-REGRESSION-001 a TC-REGRESSION-012
4. **Resultado:** Reporte final

---

## Success Metrics

### Testing Completado Exitosamente Si:
- [ ] >= 95% de test cases en PASS
- [ ] 0 critical bugs no resueltos
- [ ] WCAG 2.1 AA en 100%
- [ ] Lighthouse score >= 80
- [ ] Cross-browser testing completado
- [ ] Dark mode funcional
- [ ] Responsive design validado

### Criterios de Bloqueo (NO release):
- [ ] Bugs CRÍTICOS abiertos
- [ ] Accesibilidad < AA
- [ ] Dark mode roto
- [ ] Padding no responsivo

---

## Matriz de Ejecución Rápida

```
Ejecutar y marcar:

ICONS
[ ] TC-ICONS-001 (Chrome)    [ ] (Firefox)    [ ] (Safari)    [ ] (Mobile)
[ ] TC-ICONS-002 (Chrome)    [ ] (Firefox)    [ ] (Safari)    [ ] (Mobile)

PADDING
[ ] TC-PADDING-001 (320px)   [ ] (768px)      [ ] (1024px)    [ ] (1440px)
[ ] TC-PADDING-002 (320px)   [ ] (768px)      [ ] (1024px)    [ ] (1440px)
[ ] TC-PADDING-003 (320px)   [ ] (768px)      [ ] (1024px)    [ ] (1440px)

COMPONENTES
[ ] TC-LOADINGBUTTON-001     [ ] TC-BRAND-001 [ ] TC-SKELETON-001
[ ] TC-LOADINGBUTTON-002     [ ] TC-BRAND-002 [ ] TC-SKELETON-002
[ ] TC-LOADINGBUTTON-003     [ ] TC-BRAND-003 [ ] TC-SKELETON-003
[ ] TC-LOADINGBUTTON-004     [ ] TC-BRAND-004 [ ] TC-SKELETON-004

ACCESIBILIDAD
[ ] TC-ARIA-001  [ ] TC-ARIA-002  [ ] TC-ARIA-003  [ ] TC-ARIA-004
[ ] TC-A11Y-001  [ ] TC-A11Y-002  [ ] TC-A11Y-003  [ ] TC-A11Y-004
[ ] TC-A11Y-005  [ ] TC-A11Y-006

REGRESIÓN
[ ] TC-REG-CRITICAL-001  [ ] TC-REG-CRITICAL-002  [ ] TC-REG-CRITICAL-003
[ ] TC-REG-CRITICAL-004  [ ] TC-REG-CRITICAL-005
[ ] TC-REG-COMP-001      [ ] TC-REG-COMP-002      [ ] TC-REG-COMP-003
[ ] TC-REG-COMP-004      [ ] TC-REG-VISUAL-001    [ ] TC-REG-VISUAL-002
[ ] TC-REG-VISUAL-003

RESULTADO FINAL
[ ] PASAR (>= 95%)
[ ] FALLAR (Reportar bugs)
```

---

## Video Testing Quick Tips

Si grabas testing para documentación:

1. **Setup:** 30 segundos intro (que se prueba, ambiente)
2. **Component Test:** 2-3 min por componente (acciones lentas)
3. **Dark Mode:** 1 min mostrar toggle y cambios
4. **Responsive:** 2 min mostrando resize de 320px a 1440px
5. **Accesibilidad:** 2 min navegando con Tab
6. **Summary:** 1 min resultado final

**Total:** ~15 min para testing completo documentado en video

---

**Última actualización:** 11 de Diciembre de 2025
**Versión:** 1.0
**Estado:** LISTO PARA USO
