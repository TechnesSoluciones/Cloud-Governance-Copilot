# Testing Execution Checklist - Frontend Copilot

**Fecha de Ejecución:** _______________
**Ejecutado por:** _______________
**Navegadores Testeados:** [ ] Chrome  [ ] Firefox  [ ] Safari  [ ] Mobile

---

## FASE 1: SETUP & PREPARACIÓN (Tiempo: 5 min)

### Pre-Testing
- [ ] Directorio frontend navegado
- [ ] `npm install` ejecutado
- [ ] `npm run dev` corriendo
- [ ] http://localhost:3000 carga sin errores
- [ ] DevTools abierto (F12)
- [ ] Console limpia (sin errores previos)

**Tiempo de inicio:** _____
**Tiempo de fin:** _____

---

## FASE 2: PRUEBAS DE ICONOS (Tiempo: 10 min)

### TC-ICONS-001: Renderizado de Iconos
**Navegador:** Chrome [ ] Firefox [ ] Safari [ ] Mobile [ ]

```
Pasos:
1. [ ] Página de formulario o tabla cargada
2. [ ] F12 > Console abierto
3. [ ] Buscar elemento con ícono
4. [ ] Ícono visible y nítido
5. [ ] Sin errores en Console

Resultado:
[ ] PASS - Ícono renderizado correctamente
[ ] FAIL - Ícono no visible o con errores
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-ICONS-002: Loader en LoadingButton
**Navegador:** Chrome [ ] Firefox [ ] Safari [ ] Mobile [ ]

```
Pasos:
1. [ ] Formulario con LoadingButton encontrado
2. [ ] Click en botón
3. [ ] Spinner aparece y rota
4. [ ] aria-hidden="true" en ícono (inspeccionar)
5. [ ] Spinner desaparece cuando se completa

Resultado:
[ ] PASS - Spinner anima correctamente
[ ] FAIL - Spinner no visible o no anima
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

---

## FASE 3: PRUEBAS DE PADDING RESPONSIVO (Tiempo: 15 min)

### TC-PADDING-001: Mobile (320px)
**DevTools Emulation:** iPhone SE [ ] Personalizado 320px [ ]

```
Verificaciones:
1. [ ] Padding izquierdo ≈ 16px
2. [ ] Padding derecho ≈ 16px
3. [ ] Padding superior ≈ 16px
4. [ ] Padding inferior ≈ 16px
5. [ ] Sin scroll horizontal
6. [ ] Contenido legible

Medición (DevTools):
- Padding medido: _____ px
- Elemento medido: _____________

Resultado:
[ ] PASS - Padding correcto (16px)
[ ] FAIL - Padding incorrecto
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-PADDING-002: Tablet (768px)
**DevTools Emulation:** iPad [ ] Personalizado 768px [ ]

```
Verificaciones:
1. [ ] Padding izquierdo ≈ 24px
2. [ ] Padding derecho ≈ 24px
3. [ ] Transición suave desde mobile
4. [ ] Layout utilizando espacio horizontal

Medición:
- Padding medido: _____ px

Resultado:
[ ] PASS - Padding correcto (24px)
[ ] FAIL - Padding incorrecto
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-PADDING-003: Desktop (1024px+)
**DevTools Emulation:** Desktop 1024px [ ] 1440px [ ] 1920px [ ]

```
Verificaciones:
1. [ ] Padding izquierdo ≈ 32px
2. [ ] Padding derecho ≈ 32px
3. [ ] Max-width: 1440px respetado
4. [ ] Contenido centrado (mx-auto)

Medición:
- Padding medido: _____ px
- Max-width: _____ px

Resultado:
[ ] PASS - Padding correcto (32px), max-width respetado
[ ] FAIL - Padding incorrecto
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

---

## FASE 4: PRUEBAS DE DESIGN TOKENS (Tiempo: 12 min)

### TC-TOKENS-001: Colores Primarios
**Navegador:** Chrome [ ]

```
Inspeccionar Button default (variant="default"):
1. [ ] Background color = #ff6b35 (Orange)
2. [ ] Text color = #ffffff (White)
3. [ ] Contraste >= 4.5:1 (WCAG AA)

DevTools Inspect:
- Color inspeccionado: _______________
- Valor medido: _______________
- Contraste: _______________:1

Resultado:
[ ] PASS - Orange correcto, contraste WCAG AA
[ ] FAIL - Color incorrecto o bajo contraste
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-TOKENS-002: Colores Secundarios
**Navegador:** Chrome [ ]

```
Buscar y verificar:
1. [ ] Error/Destructive = #dc2626 (Red)
2. [ ] Success = #34a853 (Green)
3. [ ] Warning = #f59e0b (Yellow)
4. [ ] Info = #3b82f6 (Blue)

Colores encontrados:
- Error: _______________
- Success: _______________
- Warning: _______________
- Info: _______________

Resultado:
[ ] PASS - Todos colores status correctos
[ ] FAIL - Color(es) incorrecto(s)
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-TOKENS-003: Grises y Neutrales
**Navegador:** Chrome [ ]

```
Verificar escala de grises:
1. [ ] Input backgrounds = gray-200 o similar
2. [ ] Muted text = gray-500 o similar
3. [ ] Borders = gray-300 o similar
4. [ ] Contraste suficiente entre niveles

Resultado:
[ ] PASS - Escala de grises completa y consistente
[ ] FAIL - Escala incompleta o inconsistente
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

---

## FASE 5: PRUEBAS DE DARK MODE (Tiempo: 10 min)

### TC-DARKMODE-001: Activación
**Navegador:** Chrome [ ]

```
En Console ejecutar:
document.documentElement.classList.add('dark')

Verificaciones:
1. [ ] Interfaz se oscurece inmediatamente
2. [ ] Todos elementos cambian a modo oscuro
3. [ ] Transición suave (sin flash)

Resultado:
[ ] PASS - Dark mode activa correctamente
[ ] FAIL - No activa o hay flash
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-DARKMODE-002: Colores en Dark Mode
**Dark Mode Activado:** Si [ ]

```
Inspeccionar colores oscuros:
1. [ ] Background = #232f3e (Navy oscuro)
2. [ ] Foreground/Text = blanco o gray-100
3. [ ] Cards visibles con contraste
4. [ ] Borders visible contra fondo

Colores medidos:
- Background: _______________
- Foreground: _______________
- Cards: _______________

Resultado:
[ ] PASS - Colores dark mode correctos
[ ] FAIL - Colores incorrectos o bajo contraste
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-DARKMODE-003: Componentes en Dark Mode
**Dark Mode Activado:** Si [ ]

```
Verificar específicos:
1. [ ] Buttons legibles
2. [ ] Cards tienen bordes visibles
3. [ ] Inputs backgrounds apropiados
4. [ ] Selects/Dropdowns funcionales
5. [ ] Alerts visibles

Elemento no visible: _______________

Resultado:
[ ] PASS - Todos componentes funcionales en dark
[ ] FAIL - Componente(s) no visible(s)
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

---

## FASE 6: PRUEBAS DE PAGEWRAPPER (Tiempo: 10 min)

### TC-PAGEWRAPPER-001: Variante 'full'
**Navegador:** Chrome [ ] Desktop [ ]

```
Pasos:
1. [ ] Página con maxWidth="full" abierta
2. [ ] DevTools > Inspect main element
3. [ ] Verify max-width: 100% o none
4. [ ] Verificar width: 100%
5. [ ] En 1440px+, contenido ocupa todo ancho

Resultado:
[ ] PASS - maxWidth='full' funciona
[ ] FAIL - Contenido limitado o no ocupa ancho
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-PAGEWRAPPER-002: Variante 'container'
**Navegador:** Chrome [ ] Desktop 1440px+ [ ]

```
Pasos:
1. [ ] Página con maxWidth="container" abierta
2. [ ] Viewport expandido a 1920px
3. [ ] DevTools > Inspect
4. [ ] Verificar max-width: 1440px
5. [ ] Contenido centrado (mx-auto)

Max-width medido: _________ px
Márgenes izq/der: _________ px

Resultado:
[ ] PASS - Container centrado a 1440px
[ ] FAIL - Max-width no respetado
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-PAGEWRAPPER-004: Spacing
**Navegador:** Chrome [ ]

```
Verificar spacing entre elementos:
1. [ ] spacing="sm" = 16px (space-y-4)
2. [ ] spacing="md" = 24px (space-y-6)
3. [ ] spacing="lg" = 32px (space-y-8)

Espaciado medido (DevTools):
- sm: _____ px
- md: _____ px
- lg: _____ px

Resultado:
[ ] PASS - Spacing correcto en todas variantes
[ ] FAIL - Spacing incorrecto
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

---

## FASE 7: PRUEBAS DE LOADING BUTTON (Tiempo: 15 min)

### TC-LOADINGBUTTON-001: Estado Normal
**Navegador:** Chrome [ ]

```
Verificaciones:
1. [ ] Botón visible y clickeable
2. [ ] No hay spinner
3. [ ] Texto correcto visible
4. [ ] Estilos correctos aplicados

Resultado:
[ ] PASS - LoadingButton normal funciona
[ ] FAIL - Problema en estado normal
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-LOADINGBUTTON-002: Estado Cargando
**Navegador:** Chrome [ ]

```
Pasos:
1. [ ] Encontrar LoadingButton
2. [ ] Click para iniciar carga
3. [ ] Spinner aparece y rota
4. [ ] Botón se disablediza (no clickeable)
5. [ ] Ancho se mantiene constante
6. [ ] Esperar completación

Observaciones visuales:
- Spinner visible: Si [ ] No [ ]
- Rotación suave: Si [ ] No [ ]
- Botón disabled: Si [ ] No [ ]
- Ancho constante: Si [ ] No [ ]

Resultado:
[ ] PASS - Estado cargando funciona
[ ] FAIL - Spinner no visible o cambio de size
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-LOADINGBUTTON-003: Fin de Carga
**Navegador:** Chrome [ ]

```
Después de completar carga:
1. [ ] Spinner desaparece
2. [ ] Botón se habilita nuevamente
3. [ ] Texto vuelve al original
4. [ ] Ancho vuelve a normal
5. [ ] Botón es clickeable de nuevo

Resultado:
[ ] PASS - Limpieza de estado funciona
[ ] FAIL - Spinner permanece o estado incorrecto
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-LOADINGBUTTON-004: Con Variantes
**Navegador:** Chrome [ ]

```
Testear loading en diferentes variantes:
1. [ ] variant="default" - Spinner visible
2. [ ] variant="outline" - Spinner visible
3. [ ] variant="ghost" - Spinner visible
4. [ ] variant="brand" - Spinner visible

Todos visibles: Si [ ] No [ ]
Color spinner apropiado: Si [ ] No [ ]

Resultado:
[ ] PASS - Todas variantes funcionan
[ ] FAIL - Spinner no visible en alguna variante
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

---

## FASE 8: PRUEBAS DE BUTTON BRAND (Tiempo: 8 min)

### TC-BRAND-001: Renderizado
**Navegador:** Chrome [ ]

```
Inspeccionar Button variant="brand":
1. [ ] Background = #ff6b35 (Orange)
2. [ ] Text = Blanco
3. [ ] Contraste >= 4.5:1

Color medido: _______________
Contraste: ________:1

Resultado:
[ ] PASS - Brand button color correcto
[ ] FAIL - Color incorrecto o contraste bajo
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-BRAND-002: Hover State
**Navegador:** Chrome [ ]

```
Pasos:
1. [ ] Mouse over brand button
2. [ ] Color cambia a más oscuro (#e65525)
3. [ ] Texto permanece blanco
4. [ ] Transición es suave

Hover color: _______________
Transición observable: Si [ ] No [ ]

Resultado:
[ ] PASS - Hover state visible y suave
[ ] FAIL - No hay hover o es abrupto
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-BRAND-003: Active State
**Navegador:** Chrome [ ]

```
Pasos:
1. [ ] Click y mantener presionado
2. [ ] Estado "presionado" visible
3. [ ] Diferente del hover

Resultado:
[ ] PASS - Active state diferenciado
[ ] FAIL - No hay active state visible
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-BRAND-004: Disabled State
**Navegador:** Chrome [ ]

```
Encontrar brand button disabled:
1. [ ] Opacity reducida (~50%)
2. [ ] Cursor es "not-allowed"
3. [ ] No responde a hover
4. [ ] No es clickeable

Resultado:
[ ] PASS - Disabled state claro
[ ] FAIL - Button appears enabled
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

---

## FASE 9: PRUEBAS DE SKELETON (Tiempo: 10 min)

### TC-SKELETON-001: CardSkeleton
**Navegador:** Chrome [ ]

```
Encontrar CardSkeleton durante carga:
1. [ ] Animación pulse visible
2. [ ] Estructura similar a card real
3. [ ] Desaparece cuando se carga contenido
4. [ ] Sin errores en Console

Resultado:
[ ] PASS - CardSkeleton anima y desaparece
[ ] FAIL - No anima o no desaparece
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-SKELETON-002: TableSkeleton
**Navegador:** Chrome [ ]

```
Encontrar TableSkeleton durante carga:
1. [ ] Filas de headers visible
2. [ ] Múltiples filas de datos
3. [ ] Columnas correctas
4. [ ] Animación pulse visible

Resultado:
[ ] PASS - TableSkeleton estructura correcta
[ ] FAIL - Estructura incorrecta o no anima
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-SKELETON-003: FormSkeleton
**Navegador:** Chrome [ ]

```
Encontrar FormSkeleton durante carga:
1. [ ] Labels visibles
2. [ ] Campos de input visibles
3. [ ] Botón de submit visible
4. [ ] Animación pulse visible

Resultado:
[ ] PASS - FormSkeleton estructura correcta
[ ] FAIL - Estructura incompleta
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-SKELETON-004: Animación Pulse
**Navegador:** Chrome [ ]

```
Observar animación:
1. [ ] Fade in/out suave
2. [ ] Velocidad apropiada (no demasiado rápida)
3. [ ] Sin flickering
4. [ ] Usa animate-pulse de Tailwind

Resultado:
[ ] PASS - Animación pulse correcta
[ ] FAIL - Animación jerky o ausente
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

---

## FASE 10: PRUEBAS DE ACCESIBILIDAD (Tiempo: 15 min)

### TC-ARIA-001: Aria-labels en Buttons
**Navegador:** Chrome [ ]

```
DevTools > Elements:
1. [ ] Buttons con ícono solo tienen aria-label
2. [ ] aria-label es descriptivo
3. [ ] Buttons con texto no duplican label

Buttons sin label encontrados:
_________________________________________________________

Resultado:
[ ] PASS - Todos buttons tienen labels
[ ] FAIL - Buttons sin aria-label
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-ARIA-002: Aria-hidden en Iconos
**Navegador:** Chrome [ ]

```
Inspeccionar:
1. [ ] Spinner en LoadingButton tiene aria-hidden="true"
2. [ ] Iconos decorativos tienen aria-hidden="true"
3. [ ] Iconos funcionales NO tienen aria-hidden

Elementos sin aria-hidden encontrados:
_________________________________________________________

Resultado:
[ ] PASS - Aria-hidden estructura correcta
[ ] FAIL - Iconos incorrectamente marcados
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-ARIA-003: Form Labels
**Navegador:** Chrome [ ]

```
Abrir formulario:
1. [ ] Cada input tiene <label> o aria-label
2. [ ] Labels htmlFor match input id
3. [ ] Labels descriptivos
4. [ ] Required fields marcados

Inputs sin label encontrados:
_________________________________________________________

Resultado:
[ ] PASS - Todos inputs tienen labels
[ ] FAIL - Inputs sin label
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-ARIA-004: Landmark Roles
**Navegador:** Chrome [ ]

```
DevTools Accessibility:
1. [ ] PageWrapper tiene role="main"
2. [ ] Navegación en <nav>
3. [ ] Estructura semántica correcta

Resultado:
[ ] PASS - Landmarks correctos
[ ] FAIL - Estructura semántica incorrecta
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-A11Y-001: Keyboard Navigation
**Navegador:** Chrome [ ]

```
Navegar solo con Tab:
1. [ ] Tab order es lógico (izq a derecha, arriba a abajo)
2. [ ] Focus indicator visible en cada elemento
3. [ ] Todos elementos interactivos alcanzables
4. [ ] Shift+Tab navega hacia atrás

Elementos con tab order incorrecto:
_________________________________________________________

Resultado:
[ ] PASS - Navegación por teclado completa
[ ] FAIL - Tab order incorrecto o elementos no alcanzables
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-A11Y-002: Color Contrast
**Navegador:** Chrome [ ]

```
Usar WebAIM Contrast Checker para:
1. [ ] Texto normal >= 4.5:1
2. [ ] Texto grande (18pt+) >= 3:1
3. [ ] Botones legibles
4. [ ] Links distinguibles

Elementos con bajo contraste:
_________________________________________________________

Resultado:
[ ] PASS - WCAG AA contrast en todos elementos
[ ] FAIL - Contraste bajo detectado
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

---

## FASE 11: RESPONSIVE DESIGN (Tiempo: 20 min)

### TC-RESPONSIVE-320-001: Mobile Layout
**DevTools:** iPhone SE [ ] Personalizado 320px [ ]

```
Verificar:
1. [ ] Sin scroll horizontal
2. [ ] Contenido ocupa 100%
3. [ ] Padding 16px
4. [ ] Tipografía legible

Resultado:
[ ] PASS - Mobile layout correcto
[ ] FAIL - Scroll horizontal o problemas de layout
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-RESPONSIVE-768-001: Tablet Layout
**DevTools:** iPad [ ] Personalizado 768px [ ]

```
Verificar:
1. [ ] Padding 24px
2. [ ] Layout 2 columnas donde aplica
3. [ ] Sin scroll horizontal
4. [ ] Elementos con espacio

Resultado:
[ ] PASS - Tablet layout correcto
[ ] FAIL - Layout incorrecto o scroll
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-RESPONSIVE-1024-001: Desktop Layout
**DevTools:** Desktop [ ] 1024px [ ]

```
Verificar:
1. [ ] Padding 32px
2. [ ] Layout multi-columna
3. [ ] Sidebar visible
4. [ ] Proporciones correctas

Resultado:
[ ] PASS - Desktop layout correcto
[ ] FAIL - Layout incorrecto
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-RESPONSIVE-1440-001: Large Desktop Max-width
**DevTools:** 1440px+ [ ] 1920px [ ]

```
Verificar:
1. [ ] Max-width 1440px respetado
2. [ ] Contenido centrado
3. [ ] Márgenes simétricos
4. [ ] Proporciones mantienen

Max-width: _____ px
Márgenes: izq: _____ px, der: _____ px

Resultado:
[ ] PASS - Large desktop layout correcto
[ ] FAIL - Max-width no respetado
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

---

## FASE 12: NAVEGADORES (Tiempo: 30 min)

### TC-CHROME-001: Render Completo
**Navegador:** Chrome (v: _____)

```
Verificar:
1. [ ] Página carga completamente
2. [ ] No hay errores rojos en Console
3. [ ] Todos assets cargan (Network tab)
4. [ ] Lighthouse score > 80

Lighthouse scores:
- Performance: _____
- Accessibility: _____
- Best Practices: _____
- SEO: _____

Errores encontrados:
_________________________________________________________

Resultado:
[ ] PASS - Chrome render sin issues
[ ] FAIL - Errores o bajo Lighthouse score
[ ] N/A
```

### TC-FIREFOX-001: Render Completo
**Navegador:** Firefox (v: _____)

```
Verificar:
1. [ ] Página carga sin errores
2. [ ] Console limpia
3. [ ] Todos assets cargan
4. [ ] Mismo resultado que Chrome

Diferencias respecto a Chrome:
_________________________________________________________

Resultado:
[ ] PASS - Firefox render igual a Chrome
[ ] FAIL - Diferencias o errores
[ ] N/A
```

### TC-SAFARI-001: Compatibilidad
**Navegador:** Safari (v: _____)

```
Verificar:
1. [ ] Página carga completamente
2. [ ] Web Inspector sin errores
3. [ ] Funcionalidad completa
4. [ ] CSS variables funcionan

Resultado:
[ ] PASS - Safari compatible
[ ] FAIL - Incompatibilidades encontradas
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-MOBILE-001: iOS Safari
**Device:** iPhone [ ] Simulator [ ]

```
Verificar:
1. [ ] Página carga en mobile
2. [ ] Touch responsiveness
3. [ ] Padding móvil correcto
4. [ ] Botones clickeables (44px min)

Resultado:
[ ] PASS - iOS experience correcta
[ ] FAIL - Problemas en mobile
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-MOBILE-002: Android Chrome
**Device:** Android [ ] Emulator [ ]

```
Verificar:
1. [ ] Página carga
2. [ ] Touch funciona
3. [ ] Layout correcto
4. [ ] Sin scroll horizontal

Resultado:
[ ] PASS - Android experience correcta
[ ] FAIL - Problemas en Android
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

---

## FASE 13: REGRESIÓN (Tiempo: 20 min)

### TC-REGRESSION-001: Flujo de Autenticación
**Navegador:** Chrome [ ]

```
Pasos:
1. [ ] Ir a login
2. [ ] Llenar credenciales
3. [ ] Submit
4. [ ] Redirección a dashboard
5. [ ] Session se mantiene

Resultado:
[ ] PASS - Login flujo sin regresiones
[ ] FAIL - Problema en flujo
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-REGRESSION-002: Navegación Principal
**Navegador:** Chrome [ ]

```
Verificar:
1. [ ] Sidebar/Nav visible
2. [ ] Todos links navegan
3. [ ] URLs correctas
4. [ ] Back button funciona

Links rotos encontrados:
_________________________________________________________

Resultado:
[ ] PASS - Navegación funciona
[ ] FAIL - Links rotos o navegación incorrecta
[ ] N/A
```

### TC-REGRESSION-003: Carga de Datos
**Navegador:** Chrome [ ]

```
Verificar:
1. [ ] Skeleton loaders durante carga
2. [ ] Datos se cargan
3. [ ] Status 200 en Network
4. [ ] Carga < 3 segundos

Tiempo de carga: _____ segundos
Errores API encontrados:
_________________________________________________________

Resultado:
[ ] PASS - Carga de datos sin regresiones
[ ] FAIL - Errores o timeout
[ ] N/A
```

### TC-REGRESSION-004: Formularios
**Navegador:** Chrome [ ]

```
Verificar:
1. [ ] Validación funciona
2. [ ] Submit funciona
3. [ ] Datos se guardan
4. [ ] Confirmación mostrada

Resultado:
[ ] PASS - Formularios funciona
[ ] FAIL - Problema en formulario
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

### TC-REGRESSION-005: Dark Mode Toggle
**Navegador:** Chrome [ ]

```
Verificar:
1. [ ] Toggle activa/desactiva dark
2. [ ] Cambio inmediato
3. [ ] Se mantiene entre páginas
4. [ ] Light mode funciona igual

Resultado:
[ ] PASS - Dark mode toggle sin regresiones
[ ] FAIL - Toggle no funciona
[ ] N/A

Observaciones:
_________________________________________________________
_________________________________________________________
```

---

## RESUMEN FINAL

### Resultado General

**Total de Test Cases:** 65
**Pasados:** _____ (____%)
**Fallidos:** _____ (____%)
**N/A:** _____ (____%)

### Criterio de Éxito

- [ ] >= 95% test cases PASS
- [ ] 0 bugs CRÍTICOS abiertos
- [ ] WCAG 2.1 AA cumplido
- [ ] Lighthouse score >= 80
- [ ] Cross-browser OK

### Status Final

[ ] **APROBADO** - Listo para release
[ ] **FALLO** - Bugs encontrados, ver sección abajo
[ ] **BLOQUEADO** - Datos insuficientes

---

## BUGS ENCONTRADOS

### Bug #1
**ID:** BUG-_____
**Severidad:** [ ] CRÍTICA  [ ] ALTA  [ ] MEDIA  [ ] BAJA
**Componente:** _________________

**Descripción:**
_________________________________________________________
_________________________________________________________

**Pasos de Reproducción:**
1.
2.
3.

**Resultado Esperado:**
_________________________________________________________

**Resultado Actual:**
_________________________________________________________

**Navegador:** _________________ **Versión:** _________

**Screenshot/Video:** _______________

---

### Bug #2
**ID:** BUG-_____
**Severidad:** [ ] CRÍTICA  [ ] ALTA  [ ] MEDIA  [ ] BAJA
**Componente:** _________________

**Descripción:**
_________________________________________________________
_________________________________________________________

**Pasos de Reproducción:**
1.
2.
3.

**Resultado Esperado:**
_________________________________________________________

**Resultado Actual:**
_________________________________________________________

**Navegador:** _________________ **Versión:** _________

---

## OBSERVACIONES GENERALES

Fortalezas encontradas:
- _________________________________________________________
- _________________________________________________________
- _________________________________________________________

Áreas de mejora:
- _________________________________________________________
- _________________________________________________________
- _________________________________________________________

Recomendaciones:
- _________________________________________________________
- _________________________________________________________
- _________________________________________________________

---

## FIRMA Y APROBACIÓN

**Ejecutado por:** _____________________ **Fecha:** _______

**Revisado por:** _____________________ **Fecha:** _______

**Aprobado por:** _____________________ **Fecha:** _______

---

**Fin del Checklist de Ejecución**

Documento de referencia para testing manual en vivo.
Guardar en archivo y completar durante ejecución.
