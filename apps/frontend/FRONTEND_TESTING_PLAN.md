# Plan de Pruebas Completo - Frontend Copilot

**Fecha de Creación:** 11 de Diciembre de 2025
**Alcance:** Validación integral de mejoras frontend implementadas
**Versión del Plan:** 1.0

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Alcance de Pruebas](#alcance-de-pruebas)
3. [Checklist de Pruebas Manuales](#checklist-de-pruebas-manuales)
4. [Test Cases por Navegador](#test-cases-por-navegador)
5. [Test Cases de Accesibilidad](#test-cases-de-accesibilidad)
6. [Test Cases de Responsive Design](#test-cases-de-responsive-design)
7. [Escenarios de Regresión](#escenarios-de-regresión)
8. [Comandos para Ejecutar Tests](#comandos-para-ejecutar-tests)
9. [Criterios de Aceptación](#criterios-de-aceptación)
10. [Reportes de Ejecución](#reportes-de-ejecución)

---

## Resumen Ejecutivo

### Mejoras a Validar

| # | Mejora | Componentes Afectados | Prioridad |
|---|--------|----------------------|-----------|
| 1 | Iconos Lucide React | Button, Card, LoadingButton | ALTA |
| 2 | Padding Responsivo | PageWrapper, Layout Components | ALTA |
| 3 | Design Tokens | Tailwind Config, CSS Variables | ALTA |
| 4 | PageWrapper Component | Layout System | ALTA |
| 5 | Tipografía Estandarizada | All Text Components | MEDIA |
| 6 | Transiciones en Cards | Card Component | MEDIA |
| 7 | LoadingButton Component | Form Submission | ALTA |
| 8 | Variante 'brand' en Button | Button Component | MEDIA |
| 9 | Skeleton Loaders | Loading States | MEDIA |
| 10 | Aria-labels | All Interactive Elements | ALTA |

### Objetivos de Pruebas

- Validar que todos los componentes se renderizan correctamente
- Asegurar responsividad en múltiples dispositivos (320px a 1440px+)
- Verificar accesibilidad WCAG 2.1 AA
- Confirmar consistencia visual y de comportamiento
- Detectar regresiones en funcionalidad existente
- Validar dark mode en todas las mejoras

---

## Alcance de Pruebas

### Incluido

- Componentes UI principales: Button, LoadingButton, Card, Skeleton, etc.
- Sistema de diseño completo (colores, tipografía, espaciado)
- PageWrapper con todas sus variantes
- Navegación y estructura general
- Dark mode
- Accesibilidad básica (keyboard, screen readers)
- Responsive design (4 breakpoints principales)
- Transiciones y animaciones

### No Incluido

- Tests unitarios automatizados (cubiertos por playwright e2e)
- Tests de rendimiento avanzado
- Tests de SEO
- Pruebas en navegadores desactualizados (IE11, Firefox < 60)

---

## Checklist de Pruebas Manuales

### 1. ICONOS LUCIDE REACT

#### Test 1.1: Renderizado de Iconos
**ID:** TC-ICONS-001
**Descripción:** Validar que todos los iconos Lucide se renderizan correctamente
**Precondiciones:** Proyecto iniciado localmente (npm run dev)

**Pasos:**
1. Abrir navegador en http://localhost:3000
2. Navegar a página que contenga buttons (ej: formularios, tablas)
3. Inspeccionar elementos que tengan iconos
4. Verificar que no hay errores en la consola (F12 > Console)
5. Verificar que los iconos son visibles y se renderizan correctamente

**Criterios de Aceptación:**
- [ ] Todos los iconos se renderizan sin errores
- [ ] No hay advertencias de "failed to load" en la consola
- [ ] Los iconos tienen el tamaño correcto (h-4 w-4, h-5 w-5, etc.)
- [ ] Color de iconos coincide con el diseño esperado

**Resultado Esperado:**
Iconos visibles, nítidos y con colores correctos en botones, cards y otros componentes.

---

#### Test 1.2: Iconos en LoadingButton
**ID:** TC-ICONS-002
**Descripción:** Validar que el ícono de carga (Loader2) anima correctamente

**Pasos:**
1. Encontrar un formulario con LoadingButton
2. Hacer click en el botón "Enviar" o similar
3. Observar que aparece un ícono de loader rotante
4. Verificar que el loader desaparece cuando se completa la acción
5. Inspeccionar el HTML para confirmar que tiene aria-hidden="true"

**Criterios de Aceptación:**
- [ ] Loader rota suavemente (no jerky)
- [ ] El ícono está correctamente centrado en el botón
- [ ] Desaparece cuando se completa la acción
- [ ] aria-hidden="true" está presente para accesibilidad

**Resultado Esperado:**
Animación suave del loader, apropiada para estados de carga en formularios.

---

### 2. PADDING RESPONSIVO

#### Test 2.1: Padding Mobile (320px)
**ID:** TC-PADDING-001
**Descripción:** Validar padding responsivo en viewport móvil

**Pasos:**
1. Abrir DevTools (F12)
2. Activar Device Emulation (Ctrl+Shift+M)
3. Seleccionar iPhone SE (375px) o personalizado 320px
4. Navegar a diferentes páginas (Dashboard, Settings, etc.)
5. Medir el espacio de padding en los bordes

**Criterios de Aceptación:**
- [ ] Padding mínimo de 16px (p-4) en mobile
- [ ] Contenido no se toca con los bordes de la pantalla
- [ ] El contenido es legible y cómodo de leer
- [ ] Sin scroll horizontal

**Resultado Esperado:**
Padding de 16px en todos los lados en mobile (p-4).

---

#### Test 2.2: Padding Tablet (768px)
**ID:** TC-PADDING-002
**Descripción:** Validar padding responsivo en viewport tablet

**Pasos:**
1. En DevTools, seleccionar iPad (768px) o personalizado
2. Navegar a diferentes páginas
3. Verificar el padding en los bordes
4. Comparar visualmente con mobile y desktop

**Criterios de Aceptación:**
- [ ] Padding incrementa a 24px (sm:p-6)
- [ ] Aumento de padding es suave y proporcional
- [ ] Contenido está bien distribuido

**Resultado Esperado:**
Padding de 24px en tablet (sm:p-6), transición suave desde mobile.

---

#### Test 2.3: Padding Desktop (1024px+)
**ID:** TC-PADDING-003
**Descripción:** Validar padding responsivo en viewport desktop

**Pasos:**
1. En DevTools, seleccionar Desktop estándar (1024px+)
2. Cambiar a pantalla full (1440px)
3. Verificar el padding en los bordes
4. Verificar max-width del contenedor (1440px)

**Criterios de Aceptación:**
- [ ] Padding es de 32px (lg:p-8) en desktop
- [ ] Contenedor respeta max-width de 1440px
- [ ] Contenido está centrado cuando es menor que max-width

**Resultado Esperado:**
Padding de 32px en desktop (lg:p-8), contenedor centrado y con max-width correcto.

---

### 3. DESIGN TOKENS

#### Test 3.1: Colores Primarios
**ID:** TC-TOKENS-001
**Descripción:** Validar que los colores primarios del sistema se aplican correctamente

**Pasos:**
1. Abrir DevTools > Inspect un Button con variant="default"
2. Verificar los colores computados (Computed tab)
3. Comparar con valores esperados:
   - Background: Orange (#ff6b35)
   - Text: White (#ffffff)
4. Inspeccionar un Button con variant="brand"
5. Verificar que usa brand-orange color

**Criterios de Aceptación:**
- [ ] Button default usa color primario orange (#ff6b35)
- [ ] Button brand usa brand-orange (#ff6b35)
- [ ] Contraste de color cumple WCAG AA (ratio >= 4.5:1)
- [ ] Text es legible sobre el fondo

**Resultado Esperado:**
Colores primarios aplicados correctamente, cumpliendo estándares de contraste.

---

#### Test 3.2: Colores Secundarios y Estados
**ID:** TC-TOKENS-002
**Descripción:** Validar colores para estados de error, éxito, warning e info

**Pasos:**
1. Buscar componentes con estados:
   - Error: Badge destructive o Alert
   - Success: Badge success o Toast
   - Warning: Alert warning
   - Info: Alert info
2. Verificar que los colores coinciden con el design token
3. Verificar contraste de texto sobre fondo

**Criterios de Aceptación:**
- [ ] Error rojo (#dc2626) se usa consistentemente
- [ ] Success verde (#34a853) se usa consistentemente
- [ ] Warning amarillo (#f59e0b) se usa consistentemente
- [ ] Info azul (#3b82f6) se usa consistentemente
- [ ] Todos cumplen WCAG AA

**Resultado Esperado:**
Paleta de colores consistente y accesible en toda la aplicación.

---

#### Test 3.3: Grises y Neutrales
**ID:** TC-TOKENS-003
**Descripción:** Validar escala de grises está implementada correctamente

**Pasos:**
1. Abrir una página con múltiples elementos (cards, borders, backgrounds)
2. Inspeccionar backgrounds de:
   - Input fields (debería ser gray-200 o similar)
   - Muted text (debería ser gray-500 o similar)
   - Borders (debería ser gray-300 o similar)
3. Comparar con diseño esperado

**Criterios de Aceptación:**
- [ ] Gray-50 a gray-900 escala disponible
- [ ] Contraste adecuado entre niveles
- [ ] Inputs usan color apropiado de entrada
- [ ] Muted text es legible pero diferenciado

**Resultado Esperado:**
Escala de grises completa y consistente para interfaces neutral.

---

### 4. DARK MODE

#### Test 4.1: Activación de Dark Mode
**ID:** TC-DARKMODE-001
**Descripción:** Validar que dark mode se activa correctamente

**Pasos:**
1. Abrir el navegador en http://localhost:3000
2. Abrir DevTools Console y ejecutar:
   ```javascript
   document.documentElement.classList.add('dark')
   ```
3. O si hay toggle: hacer click en dark mode toggle (si está disponible)
4. Observar que toda la interfaz cambia a modo oscuro
5. Recargar página (F5) y verificar que se mantiene el modo

**Criterios de Aceptación:**
- [ ] Dark mode se activa inmediatamente
- [ ] Todos los colores cambian a variantes oscuras
- [ ] Texto permanece legible (blanco o gris claro)
- [ ] El modo persiste tras reload

**Resultado Esperado:**
Dark mode se activa correctamente con transición suave de colores.

---

#### Test 4.2: Colores en Dark Mode
**ID:** TC-DARKMODE-002
**Descripción:** Validar que los colores en dark mode son correctos

**Pasos:**
1. Activar dark mode
2. Abrir DevTools y inspeccionar elementos:
   - Background debe cambiar a navy oscuro (#232f3e)
   - Foreground debe cambiar a blanco/gris claro
   - Cards deben tener fondo más claro que background
   - Borders deben ser visibles

**Criterios de Aceptación:**
- [ ] Background: #232f3e (navy oscuro)
- [ ] Foreground: blanco o gray-100
- [ ] Cards tienen contraste suficiente
- [ ] Todos los colores secundarios están disponibles

**Resultado Esperado:**
Dark mode con colores apropiados y contraste WCAG AA.

---

#### Test 4.3: Componentes Específicos en Dark Mode
**ID:** TC-DARKMODE-003
**Descripción:** Validar componentes específicos en dark mode

**Pasos:**
1. Activar dark mode
2. Inspeccionar y verificar:
   - Buttons: están visibles, textos legibles
   - Cards: bordes visibles, contraste correcto
   - Inputs: backgrounds claros sobre fondo oscuro
   - Selects/Dropdowns: opciones legibles
   - Alerts/Badges: colores status visibles

**Criterios de Aceptación:**
- [ ] Buttons son legibles en dark mode
- [ ] Cards tienen bordes visibles
- [ ] Inputs tienen backgrounds apropiados
- [ ] Todos los estados (hover, focus, disabled) funcionan
- [ ] Transiciones de color son suaves

**Resultado Esperado:**
Todos los componentes completamente funcionales y accesibles en dark mode.

---

### 5. PAGE WRAPPER COMPONENT

#### Test 5.1: Variante 'full' (max-width: 100%)
**ID:** TC-PAGEWRAPPER-001
**Descripción:** Validar PageWrapper con maxWidth='full'

**Pasos:**
1. Navegar a una página que use PageWrapper con maxWidth="full"
2. Abrir DevTools > Inspect el elemento main
3. Verificar computed styles:
   - max-width debería ser 100% o none
   - width debería ser 100%
4. Expandir viewport a 1440px+ y verificar contenido ocupa todo ancho

**Criterios de Aceptación:**
- [ ] max-width-full clase aplicada
- [ ] Contenido se expande a 100% de ancho
- [ ] Responsive padding aún aplicado
- [ ] Sin márgenes horizontales

**Resultado Esperado:**
PageWrapper con maxWidth='full' ocupa 100% del ancho disponible.

---

#### Test 5.2: Variante 'container' (max-width: 1440px)
**ID:** TC-PAGEWRAPPER-002
**Descripción:** Validar PageWrapper con maxWidth='container'

**Pasos:**
1. Navegar a una página con maxWidth="container"
2. Abrir DevTools e inspeccionar el main
3. Cambiar viewport a 1920px
4. Verificar que:
   - max-width es 1440px
   - Contenido está centrado (mx-auto)
   - Hay padding igual en ambos lados

**Criterios de Aceptación:**
- [ ] max-width-container clase aplicada
- [ ] Contenido centrado en viewport grande
- [ ] Máximo ancho de 1440px
- [ ] Responsive padding funcionando

**Resultado Esperado:**
PageWrapper con maxWidth='container' limita a 1440px y centra contenido.

---

#### Test 5.3: Variante '2xl' (max-width: 672px)
**ID:** TC-PAGEWRAPPER-003
**Descripción:** Validar PageWrapper con maxWidth='2xl'

**Pasos:**
1. Encontrar página con maxWidth="2xl" (ej: formularios)
2. Aumentar viewport a 1440px
3. Inspeccionar elemento main
4. Verificar max-width es 672px y contenido centrado

**Criterios de Aceptación:**
- [ ] max-width-2xl clase aplicada
- [ ] Contenido limitado a 672px
- [ ] Centrado horizontalmente
- [ ] Padding responsive aún funciona

**Resultado Esperado:**
Formularios y vistas estrechas están limitadas a 672px y centradas.

---

#### Test 5.4: Variantes de Spacing
**ID:** TC-PAGEWRAPPER-004
**Descripción:** Validar spacing entre secciones del PageWrapper

**Pasos:**
1. Navegar a página con PageWrapper spacing="sm"
2. Medir espacio vertical entre elementos hijos
3. Debería ser 16px (space-y-4)
4. Cambiar a spacing="md" (24px, space-y-6)
5. Cambiar a spacing="lg" (32px, space-y-8)

**Criterios de Aceptación:**
- [ ] spacing="sm" aplica space-y-4 (16px)
- [ ] spacing="md" aplica space-y-6 (24px)
- [ ] spacing="lg" aplica space-y-8 (32px)
- [ ] El espaciado es consistente

**Resultado Esperado:**
Spacing entre secciones es correcto y consistente con variantes.

---

#### Test 5.5: Breadcrumbs en PageWrapper
**ID:** TC-PAGEWRAPPER-005
**Descripción:** Validar renderizado de breadcrumbs

**Pasos:**
1. Navegar a página que tenga breadcrumbs
2. Inspeccionar elemento <nav> con aria-label="Breadcrumb navigation"
3. Verificar que está dentro de PageWrapper
4. Verificar que está alineado con contenido principal

**Criterios de Aceptación:**
- [ ] Breadcrumbs están dentro de <nav> semántico
- [ ] aria-label correcta
- [ ] Alineados con max-width del contenido
- [ ] Separados del contenido con mb-6

**Resultado Esperado:**
Breadcrumbs se renderizan correctamente dentro del PageWrapper.

---

### 6. TIPOGRAFÍA ESTANDARIZADA

#### Test 6.1: Escalas de Tamaño
**ID:** TC-TYPOGRAPHY-001
**Descripción:** Validar que los tamaños de fuente siguen la escala definida

**Pasos:**
1. Abrir DevTools e inspeccionar diferentes elementos de texto:
   - Headings (h1, h2, h3, h4, h5, h6)
   - Body text (p, spans)
   - Small text (labels, helper text)
2. Verificar computed font-size:
   - h1: 40px (text-4xl)
   - h2: 32px (text-3xl)
   - h3: 24px (text-2xl)
   - p: 16px (text-base)
   - small: 14px (text-sm) o 12px (text-xs)

**Criterios de Aceptación:**
- [ ] Font-size sigue escala de Tailwind
- [ ] Headings usan tamaños apropiados
- [ ] Body text es 16px base
- [ ] Pequeño texto es legible

**Resultado Esperado:**
Tipografía sigue escala estandarizada y es consistente.

---

#### Test 6.2: Font Weights
**ID:** TC-TYPOGRAPHY-002
**Descripción:** Validar que font-weights son correctos

**Pasos:**
1. Inspeccionar diferentes elementos:
   - Headings (deberían ser bold: 700)
   - Body text (regular: 400)
   - Strong/important (semibold: 600 o bold: 700)
2. Verificar computed font-weight

**Criterios de Aceptación:**
- [ ] Headings usan weight 700 (bold)
- [ ] Body text usa weight 400 (regular)
- [ ] Emphasis usa weight 600 (semibold)
- [ ] Jerarquía visual es clara

**Resultado Esperado:**
Font weights crean jerarquía visual clara y apropiada.

---

#### Test 6.3: Line Heights
**ID:** TC-TYPOGRAPHY-003
**Descripción:** Validar que line-height es apropiado para cada tamaño

**Pasos:**
1. Inspeccionar elementos de texto
2. Verificar line-height:
   - xs/sm: 1.5
   - base/md: 1.6
   - lg/xl: 1.6
   - 2xl+: 1.4 a 1.2 (más pequeño para headings)

**Criterios de Aceptación:**
- [ ] Line-height es 1.5+ para body text
- [ ] Headings tienen line-height apropiado
- [ ] Texto es cómodo de leer
- [ ] Sin espaciado excesivo

**Resultado Esperado:**
Line-heights crean buena legibilidad sin exceso de espaciado.

---

### 7. TRANSICIONES EN CARDS

#### Test 7.1: Hover Effect en Cards
**ID:** TC-TRANSITIONS-001
**Descripción:** Validar que cards tienen transición de hover suave

**Pasos:**
1. Navegar a página con cards (ej: dashboard con KPI cards)
2. Pasar mouse sobre una card
3. Observar la transición:
   - Debería haber un cambio sutil en shadow o escala
   - La transición debería ser suave (200-300ms)
   - No debería ser jerky o abrupta
4. Inspeccionar con DevTools para ver transition properties

**Criterios de Aceptación:**
- [ ] Hover effect es visible
- [ ] Transición es suave (cubic-bezier correcta)
- [ ] Duration es 200-300ms
- [ ] Shadow o elevación aumenta en hover

**Resultado Esperado:**
Cards tienen transición de hover suave y visual.

---

#### Test 7.2: Hover en Cards Clickeables
**ID:** TC-TRANSITIONS-002
**Descripción:** Validar transiciones en cards con cursor pointer

**Pasos:**
1. Encontrar una card que sea clickeable (con onClick handler)
2. Verificar que cursor cambia a pointer
3. Pasar mouse sobre ella
4. Observar visual feedback (cambio de color, shadow, etc.)
5. Click en la card y verificar que se navega o abre

**Criterios de Aceptación:**
- [ ] Cursor es pointer en cards clickeables
- [ ] Hover visual feedback es claro
- [ ] Click funciona correctamente
- [ ] Transición es suave

**Resultado Esperado:**
Interactividad clara en cards clickeables con transiciones suaves.

---

### 8. LOADING BUTTON COMPONENT

#### Test 8.1: Estado Normal
**ID:** TC-LOADINGBUTTON-001
**Descripción:** Validar LoadingButton en estado normal (no cargando)

**Pasos:**
1. Encontrar un formulario con LoadingButton
2. Verificar que el botón se ve como un Button normal
3. Inspeccionar con DevTools
4. Verificar que:
   - No tiene spinner
   - Es clickeable
   - Tiene el texto esperado

**Criterios de Aceptación:**
- [ ] El botón está clickeable
- [ ] No hay spinner visible
- [ ] Texto es visible correctamente
- [ ] Estilos son correctos

**Resultado Esperado:**
LoadingButton en estado normal parece un botón normal.

---

#### Test 8.2: Estado Cargando
**ID:** TC-LOADINGBUTTON-002
**Descripción:** Validar LoadingButton en estado cargando

**Pasos:**
1. Abrir formulario con LoadingButton
2. Hacer click en el botón
3. Mientras carga, observar:
   - Spinner (Loader2 icon) aparece
   - Spinner está animado (rotación suave)
   - Botón está disabled
   - No se puede hacer click
   - Ancho del botón se mantiene constante (no cambia tamaño)
4. Esperar a que se complete o cancele la carga

**Criterios de Aceptación:**
- [ ] Spinner aparece antes del texto
- [ ] Spinner rota suavemente
- [ ] Botón se disablediza inmediatamente
- [ ] Ancho no cambia
- [ ] loadingText se muestra si se proporciona
- [ ] sr-only "Loading..." presente para screen readers

**Resultado Esperado:**
LoadingButton muestra estado de carga claro sin cambiar tamaño.

---

#### Test 8.3: Desaparición de Estado Cargando
**ID:** TC-LOADINGBUTTON-003
**Descripción:** Validar que estado cargando se limpia correctamente

**Pasos:**
1. Enviar un formulario con LoadingButton
2. Esperar a que respuesta llegue
3. Verificar que:
   - Spinner desaparece
   - Botón vuelve a estar enabled
   - Texto original se muestra
   - Se puede hacer click nuevamente

**Criterios de Aceptación:**
- [ ] Spinner desaparece
- [ ] Botón se habilita
- [ ] Texto vuelve a normal
- [ ] Ancho vuelve a natural
- [ ] Puede ser clickeado de nuevo

**Resultado Esperado:**
Estado de carga se limpia correctamente cuando se completa.

---

#### Test 8.4: LoadingButton con Variantes
**ID:** TC-LOADINGBUTTON-004
**Descripción:** Validar LoadingButton con diferentes variantes y tamaños

**Pasos:**
1. Encontrar buttons con diferentes variantes:
   - variant="default"
   - variant="outline"
   - variant="ghost"
   - variant="brand"
2. Para cada uno, activar loading y verificar:
   - Spinner es visible
   - Color de spinner es apropiado
   - Spinner no se confunde con el fondo

**Criterios de Aceptación:**
- [ ] Spinner visible en todas variantes
- [ ] Color del spinner es apropiado (blanco, negro, etc.)
- [ ] Contraste es suficiente
- [ ] Tamaño de spinner es consistente

**Resultado Esperado:**
LoadingButton funciona correctamente con todas las variantes.

---

### 9. VARIANTE 'BRAND' EN BUTTON

#### Test 9.1: Renderizado de Brand Button
**ID:** TC-BRAND-001
**Descripción:** Validar que Button variant="brand" se renderiza correctamente

**Pasos:**
1. Encontrar un button con variant="brand"
2. Inspeccionar con DevTools
3. Verificar estilos:
   - Background: brand-orange (#ff6b35)
   - Text color: white
   - Contraste legible

**Criterios de Aceptación:**
- [ ] Fondo es orange (#ff6b35)
- [ ] Texto es blanco
- [ ] Contraste WCAG AA
- [ ] Sin espaciado extraño

**Resultado Esperado:**
Brand button tiene color naranja distintivo y es legible.

---

#### Test 9.2: Hover State en Brand Button
**ID:** TC-BRAND-002
**Descripción:** Validar que Brand button tiene hover state apropiado

**Pasos:**
1. Pasar mouse sobre brand button
2. Observar cambio visual:
   - Debería oscurecer (bg-brand-orange-dark)
   - O aumentar opacity/shadow
3. Inspeccionar computed styles

**Criterios de Aceptación:**
- [ ] Hover state es visible
- [ ] Fondo cambia a más oscuro (#e65525)
- [ ] Texto permanece blanco y legible
- [ ] Transición es suave

**Resultado Esperado:**
Brand button tiene hover state claro con color más oscuro.

---

#### Test 9.3: Active/Pressed State
**ID:** TC-BRAND-003
**Descripción:** Validar active state en brand button

**Pasos:**
1. Hacer click y mantener presionado en brand button
2. Observar que se vea "presionado"
3. O inspeccionar con DevTools :active pseudo-clase

**Criterios de Aceptación:**
- [ ] Active state es visible diferente del hover
- [ ] Parece "presionado" (más oscuro o recesivo)
- [ ] Transición es instantánea

**Resultado Esperado:**
Brand button tiene active state diferenciado.

---

#### Test 9.4: Disabled State en Brand Button
**ID:** TC-BRAND-004
**Descripción:** Validar que brand button disabled es claramente inactivo

**Pasos:**
1. Encontrar brand button deshabilitado
2. Verificar visual:
   - Opacity reducida (50%)
   - Cursor es not-allowed
   - No responde a hover
3. Intentar hacer click (no debería funcionar)

**Criterios de Aceptación:**
- [ ] Opacity es 50%
- [ ] Cursor es not-allowed
- [ ] No tiene hover effect
- [ ] No es clickeable

**Resultado Esperado:**
Brand button deshabilitado es claramente inactivo e ininteractuable.

---

### 10. SKELETON LOADERS

#### Test 10.1: CardSkeleton
**ID:** TC-SKELETON-001
**Descripción:** Validar CardSkeleton se renderiza correctamente

**Pasos:**
1. Encontrar página con CardSkeleton (loading states)
2. Inspeccionar elementos:
   - Debe tener borde redondeado
   - Debe tener animación pulse
   - Estructura: 1 para título, múltiples para contenido
3. Esperar a que se cargue el contenido real
4. Verificar que desaparece cuando se carga

**Criterios de Aceptación:**
- [ ] CardSkeleton tiene estructura correcta
- [ ] Animación pulse es visible
- [ ] Desaparece cuando carga contenido
- [ ] Sin errores en consola
- [ ] Tamaño es similar al contenido final

**Resultado Esperado:**
CardSkeleton muestra placeholder apropiado durante la carga.

---

#### Test 10.2: TableSkeleton
**ID:** TC-SKELETON-002
**Descripción:** Validar TableSkeleton para tablas cargando

**Pasos:**
1. Encontrar tabla con TableSkeleton
2. Verificar que:
   - Tiene filas de headers
   - Tiene múltiples filas de datos
   - Tiene el número correcto de columnas
3. Esperar carga y verificar desaparición

**Criterios de Aceptación:**
- [ ] Filas y columnas correctas
- [ ] Animación pulse visible
- [ ] Proporciones similares a tabla real
- [ ] Desaparece cuando tabla carga

**Resultado Esperado:**
TableSkeleton proporciona placeholder apropiado para tablas.

---

#### Test 10.3: FormSkeleton
**ID:** TC-SKELETON-003
**Descripción:** Validar FormSkeleton para formularios cargando

**Pasos:**
1. Encontrar formulario con FormSkeleton
2. Verificar estructura:
   - Labels (placeholders)
   - Campos de input
   - Botón de submit
3. Esperar carga del form real

**Criterios de Aceptación:**
- [ ] Estructura de form visible
- [ ] Labels y campos están dispuestos correctamente
- [ ] Animación pulse es visible
- [ ] Desaparece cuando form carga

**Resultado Esperado:**
FormSkeleton muestra estructura de formulario durante carga.

---

#### Test 10.4: Animación Pulse
**ID:** TC-SKELETON-004
**Descripción:** Validar que animación pulse es suave y apropiada

**Pasos:**
1. Abrir cualquier skeleton
2. Observar la animación:
   - Debería ser un fade in/out suave
   - Velocidad: 2 segundos aproximadamente
   - Efecto ondulante o gradient moving (si implementado)
3. Inspeccionar con DevTools para ver animation property

**Criterios de Aceptación:**
- [ ] Animación es suave
- [ ] No es demasiado rápida o lenta
- [ ] No hay flickering
- [ ] Usa animate-pulse de Tailwind

**Resultado Esperado:**
Skeleton animación pulse es suave e hipnotizante.

---

### 11. ARIA-LABELS (ACCESIBILIDAD)

#### Test 11.1: Aria-labels en Buttons
**ID:** TC-ARIA-001
**Descripción:** Validar que buttons tienen aria-labels apropiados

**Pasos:**
1. Abrir DevTools Elements
2. Inspeccionar todos los buttons
3. Verificar:
   - Buttons con texto: aria-label no necesario (el texto es label)
   - Buttons con solo ícono: aria-label presente
   - Aria-label es descriptivo (ej: "Close dialog" no "X")

**Criterios de Aceptación:**
- [ ] Icon-only buttons tienen aria-label
- [ ] Aria-labels son descriptivos
- [ ] Aria-label no duplicado si hay texto visible
- [ ] Label es único y claro

**Resultado Esperado:**
Todos los buttons tienen labels accesibles para screen readers.

---

#### Test 11.2: Aria-hidden en Iconos Decorativos
**ID:** TC-ARIA-002
**Descripción:** Validar que iconos decorativos tienen aria-hidden="true"

**Pasos:**
1. Inspeccionar elementos con iconos:
   - Loader en LoadingButton: debería tener aria-hidden
   - Iconos decorativos: debería tener aria-hidden
   - Iconos funcionales (trash, edit): NO debería tener aria-hidden
2. Inspeccionar HTML en DevTools

**Criterios de Aceptación:**
- [ ] Spinner en LoadingButton tiene aria-hidden="true"
- [ ] Iconos decorativos tienen aria-hidden="true"
- [ ] Iconos funcionales NO tienen aria-hidden
- [ ] Sin conflictos de label/hidden

**Resultado Esperado:**
Estructura ARIA es correcta para screen reader users.

---

#### Test 11.3: Form Labels
**ID:** TC-ARIA-003
**Descripción:** Validar que form fields tienen labels asociados

**Pasos:**
1. Abrir un formulario
2. Inspeccionar cada input:
   - Debería tener <label> elemento
   - Label debería tener htmlFor que match con input id
   - O aria-label si no hay label visual
3. Usar DevTools Accessibility tab para verificar

**Criterios de Aceptación:**
- [ ] Cada input tiene label o aria-label
- [ ] Labels están correctamente asociados
- [ ] Labels son descriptivos
- [ ] Required fields están marcados

**Resultado Esperado:**
Todos los form fields tienen labels accesibles.

---

#### Test 11.4: Landmark Roles
**ID:** TC-ARIA-004
**Descripción:** Validar que se usan landmark roles (main, nav, etc.)

**Pasos:**
1. Abrir DevTools Accessibility tree
2. Verificar estructura:
   - <main> role="main" para PageWrapper
   - <nav> para navegación
   - <section>, <article> si aplica
3. Navegar con Accessibility Inspector

**Criterios de Aceptación:**
- [ ] PageWrapper tiene role="main"
- [ ] Breadcrumbs en <nav>
- [ ] Estructura semántica correcta
- [ ] No hay roles conflictivos

**Resultado Esperado:**
Estructura ARIA con landmarks es correcta para navegación por screen reader.

---

## Test Cases por Navegador

### CHROME (DESKTOP)

#### TC-CHROME-001: Render Completo
**Descripción:** Validar que la aplicación se renderiza completamente en Chrome

**Pasos:**
1. Abrir Chrome (versión actual: 120+)
2. Navegar a http://localhost:3000
3. Cargar página completamente (esperar 3 segundos)
4. Abrir DevTools (F12)
5. Console: verificar que no hay errores rojos
6. Network: verificar que todos los assets cargan (status 200)

**Criterios de Aceptación:**
- [ ] Página carga completamente
- [ ] No hay errores de JavaScript
- [ ] No hay 404 en assets
- [ ] Lighthouse score > 80

**Evidencia esperada:**
Console limpia sin errores críticos.

---

#### TC-CHROME-002: Responsive Design
**Descripción:** Validar responsive design en Chrome

**Pasos:**
1. Presionar Ctrl+Shift+M para Device Emulation
2. Testear en:
   - iPhone SE (375px)
   - iPad (768px)
   - Laptop (1440px)
3. Para cada breakpoint, verificar:
   - Padding responsivo
   - Elementos se reordenan apropiadamente
   - Sin scroll horizontal

**Criterios de Aceptación:**
- [ ] Mobile layout es correcto
- [ ] Tablet layout es correcto
- [ ] Desktop layout es correcto
- [ ] Sin scroll horizontal

**Evidencia esperada:**
Layouts se ajustan correctamente en cada breakpoint.

---

#### TC-CHROME-003: Dark Mode
**Descripción:** Validar dark mode en Chrome

**Pasos:**
1. Ejecutar en Console: `document.documentElement.classList.add('dark')`
2. Observar que interfaz cambia a modo oscuro
3. Inspeccionar colores (DevTools > Styles)
4. Verificar que:
   - Background es navy oscuro
   - Text es blanco/gris claro
   - Contrastes son legibles

**Criterios de Aceptación:**
- [ ] Dark mode activa
- [ ] Todos los colores cambian
- [ ] Legibilidad mantenida
- [ ] Sin colores blancos sobre fondo claro

**Evidencia esperada:**
Interfaz completa en modo oscuro accesible.

---

### FIREFOX (DESKTOP)

#### TC-FIREFOX-001: Render Completo
**Descripción:** Validar render en Firefox

**Pasos:**
1. Abrir Firefox (versión actual: 121+)
2. Navegar a http://localhost:3000
3. Esperar carga completa
4. Abrir DevTools (F12)
5. Verificar Console

**Criterios de Aceptación:**
- [ ] Página carga sin errores
- [ ] Console sin errores críticos
- [ ] Todos los assets cargan

**Evidencia esperada:**
Misma experiencia que Chrome.

---

#### TC-FIREFOX-002: Animaciones CSS
**Descripción:** Validar que animaciones funcionan en Firefox

**Pasos:**
1. Pasar mouse sobre card (hover effect)
2. Activar loading button
3. Inspeccionar animación pulse en skeleton
4. Verificar que todas son suaves

**Criterios de Aceptación:**
- [ ] Hover transitions suaves
- [ ] Loading spinner rota suavemente
- [ ] Pulse animation visible
- [ ] Sin flickering

**Evidencia esperada:**
Animaciones CSS funcionan correctamente.

---

### SAFARI (DESKTOP)

#### TC-SAFARI-001: Compatibilidad
**Descripción:** Validar que la app funciona en Safari

**Pasos:**
1. Abrir Safari (versión actual: 17+)
2. Navegar a http://localhost:3000
3. Completar carga
4. Abrir Web Inspector (Cmd+Opt+I)

**Criterios de Aceptación:**
- [ ] Página carga completamente
- [ ] Web Inspector sin errores
- [ ] Funcionalidad completa

**Evidencia esperada:**
Funcionalidad completa sin diferencias respecto a Chrome.

---

#### TC-SAFARI-002: CSS Variables
**Descripción:** Validar que CSS variables funcionan en Safari

**Pasos:**
1. Abrir DevTools
2. Inspeccionar elemento que use CSS variable
3. Verificar que valor se resuelve correctamente
4. Cambiar a dark mode y verificar que CSS variable cambia

**Criterios de Aceptación:**
- [ ] CSS variables se resuelven
- [ ] Dark mode actualiza variables
- [ ] Colores son correctos

**Evidencia esperada:**
CSS variables funcionan correctamente.

---

### MOBILE DEVICES

#### TC-MOBILE-001: iPhone Safari
**Descripción:** Validar en iPhone real o simulado

**Pasos:**
1. Conectar iPhone o abrir simulador (Xcode)
2. Abrir Safari
3. Navegar a aplicación
4. Verificar:
   - Touch responsiveness
   - Padding es apropiado
   - Botones son clickeables

**Criterios de Aceptación:**
- [ ] Página carga en mobile
- [ ] Touch funciona
- [ ] Padding móvil es correcto
- [ ] Sin pinch-zoom necesario

**Evidencia esperada:**
Experiencia móvil fluida en iPhone.

---

#### TC-MOBILE-002: Android Chrome
**Descripción:** Validar en Android

**Pasos:**
1. Abrir Android device o emulador
2. Abrir Chrome
3. Navegar a aplicación
4. Verificar mismos criterios que iPhone

**Criterios de Aceptación:**
- [ ] Página carga
- [ ] Touch funciona
- [ ] Layout es correcto
- [ ] Sin scroll horizontal

**Evidencia esperada:**
Experiencia móvil consistente entre iOS y Android.

---

## Test Cases de Accesibilidad

### WCAG 2.1 AA Compliance

#### TC-A11Y-001: Keyboard Navigation
**Descripción:** Validar navegación completa con teclado

**Pasos:**
1. Abrir la aplicación
2. Pulsar Tab para navegar
3. Verificar:
   - Focus indicator visible (outline)
   - Orden de tabulación lógico (left-to-right, top-to-bottom)
   - Skip link presente si es necesario
   - Shift+Tab va en dirección contraria
4. Navegar por todo flujo sin ratón

**Criterios de Aceptación:**
- [ ] Tab order es lógico
- [ ] Focus indicator visible
- [ ] Todos elementos interactivos alcanzables
- [ ] Sin traps de keyboard

**Evidencia esperada:**
Navegación completa posible solo con teclado.

---

#### TC-A11Y-002: Color Contrast
**Descripción:** Validar WCAG AA contrast ratios (4.5:1 normal, 3:1 large)

**Pasos:**
1. Usar WebAIM Contrast Checker
2. Inspeccionar colores de:
   - Text on background
   - Buttons
   - Links
   - Form inputs
3. Verificar ratio >= 4.5:1 para texto normal

**Criterios de Aceptación:**
- [ ] Texto normal >= 4.5:1
- [ ] Texto grande (18pt+) >= 3:1
- [ ] Botones legibles
- [ ] Links distinguibles

**Evidencia esperada:**
Todos elementos cumplen WCAG AA contrast.

---

#### TC-A11Y-003: Focus Indicators
**Descripción:** Validar que focus indicators son visibles

**Pasos:**
1. Presionar Tab para navegar
2. Verificar que cada elemento tiene focus indicator:
   - Ring visible
   - Color contrasta con fondo
   - No es muy tenue
3. Inspeccionar con DevTools :focus pseudo-clase

**Criterios de Aceptación:**
- [ ] Todos elementos focusables tienen indicator
- [ ] Indicator es visible (no muy tenue)
- [ ] Contrasta con fondo
- [ ] No es oscurecido por otros elementos

**Evidencia esperada:**
Focus indicators claros y consistentes.

---

#### TC-A11Y-004: Form Accessibility
**Descripción:** Validar accesibilidad de formularios

**Pasos:**
1. Encontrar formulario
2. Verificar:
   - Cada input tiene label <label>
   - Label htmlFor match con input id
   - Required fields están marcados (*)
   - Error messages están asociados (aria-describedby)
   - Placeholders no son labels (solo helper text)
3. Testear con screen reader

**Criterios de Aceptación:**
- [ ] Todos inputs tienen labels
- [ ] Labels claramente asociados
- [ ] Required está marcado
- [ ] Errores son anunciados
- [ ] Helper text es anunciado

**Evidencia esperada:**
Formularios completamente accesibles para screen reader users.

---

#### TC-A11Y-005: Screen Reader Testing (NVDA o JAWS)
**Descripción:** Validar con screen reader actual

**Pasos:**
1. Descargar NVDA (gratuito para Windows)
2. Abrir navegador con NVDA activado
3. Navegar página:
   - Escuchar que heading structure es correcto
   - Escuchar labels de form
   - Escuchar aria-labels en buttons
   - Escuchar alerts y status messages
4. Navegar por estructura de árbol

**Criterios de Aceptación:**
- [ ] Headings anunciados correctamente
- [ ] Labels de form audibles
- [ ] Buttons tienen nombres accesibles
- [ ] Landmarks anunciados
- [ ] Alerts/status anunciados

**Evidencia esperada:**
Experiencia completa y clara con screen reader.

---

#### TC-A11Y-006: Motion/Animation
**Descripción:** Validar que animaciones respetan prefers-reduced-motion

**Pasos:**
1. Activar "Reduce motion" en OS:
   - Windows: Settings > Ease of Access > Display > Show animations
   - macOS: System Preferences > Accessibility > Display > Reduce motion
2. Navegación página
3. Verificar que transiciones son mínimas

**Criterios de Aceptación:**
- [ ] Aplicación respeta prefers-reduced-motion
- [ ] Animaciones se desactivan o minimizan
- [ ] Funcionalidad no afectada

**Evidencia esperada:**
Aplicación accesible para usuarios sensibles a movimiento.

---

## Test Cases de Responsive Design

### BREAKPOINT 320px (Mobile Small)

#### TC-RESPONSIVE-320-001: Layout
**Descripción:** Validar layout en 320px (iPhone SE)

**Pasos:**
1. En DevTools, seleccionar iPhone SE (375px) o personalizado 320px
2. Navegar a diferentes páginas
3. Verificar:
   - Sin scroll horizontal
   - Contenido ocupa 100% de ancho
   - Padding de 16px (p-4)
   - Tipografía legible

**Criterios de Aceptación:**
- [ ] Sin scroll horizontal
- [ ] Contenido visible sin zoom
- [ ] Padding mínimo apropiado
- [ ] Tipografía legible

**Resultado Esperado:**
Diseño móvil optimizado para pantallas pequeñas.

---

#### TC-RESPONSIVE-320-002: Componentes
**Descripción:** Validar que componentes se adaptan a 320px

**Pasos:**
1. Verificar en 320px:
   - Buttons son clickeables (min 44x44px)
   - Cards se apilan verticalmente
   - Tablas se convierten en cards (si responsive)
   - Navegación es accesible (hamburger menu)

**Criterios de Aceptación:**
- [ ] Buttons son tappables (44px mínimo)
- [ ] Layout vertical
- [ ] Navegación accesible
- [ ] Sin elementos superpuestos

**Resultado Esperado:**
Componentes se adaptan a viewport pequeño.

---

### BREAKPOINT 768px (Tablet)

#### TC-RESPONSIVE-768-001: Layout
**Descripción:** Validar layout en 768px (iPad)

**Pasos:**
1. En DevTools, seleccionar iPad (768px)
2. Navegar páginas
3. Verificar:
   - Padding 24px (sm:p-6)
   - Contenido puede estar en columnas
   - Máximo ancho no alcanzado aún
   - Elementos tienen más espacio

**Criterios de Aceptación:**
- [ ] Padding aumenta a 24px
- [ ] Layout utiliza espacio horizontal
- [ ] Sin scroll horizontal
- [ ] Separación entre elementos clara

**Resultado Esperado:**
Diseño tablet optimizado con más espacio.

---

#### TC-RESPONSIVE-768-002: Componentes
**Descripción:** Validar componentes en tablet

**Pasos:**
1. Verificar en 768px:
   - Grillas de 2 columnas (si aplica)
   - Tabs en lugar de accordion (si responsive)
   - Más elementos en sidebar
   - Navegación puede ser expandida

**Criterios de Aceptación:**
- [ ] Layout multi-columna
- [ ] Elementos menos compactados
- [ ] Navegación optimizada
- [ ] Sin cambios abruptos desde mobile

**Resultado Esperado:**
Componentes se adaptan al espacio tablet.

---

### BREAKPOINT 1024px (Desktop)

#### TC-RESPONSIVE-1024-001: Layout
**Descripción:** Validar layout en 1024px (laptop)

**Pasos:**
1. En DevTools, seleccionar Desktop estándar (1024px)
2. Navegar páginas
3. Verificar:
   - Padding 32px (lg:p-8)
   - Múltiples columnas
   - Sidebar visible (si existe)
   - Layout completo visible

**Criterios de Aceptación:**
- [ ] Padding es 32px
- [ ] Layout de desktop visible
- [ ] Todos elementos accesibles
- [ ] Proporciones correctas

**Resultado Esperado:**
Diseño desktop completo funcional.

---

#### TC-RESPONSIVE-1024-002: Componentes
**Descripción:** Validar componentes en desktop

**Pasos:**
1. Verificar en 1024px:
   - Grillas de 3-4 columnas
   - Sidebars expandidas
   - Múltiples paneles de navegación
   - Tooltips visibles

**Criterios de Aceptación:**
- [ ] Layout multi-columna
- [ ] Sidebar visible y funcional
   - Elementos distribuidos horizontalmente
   - Tooltips y popovers funcionales

**Resultado Esperado:**
Desktop experience completa y optimizada.

---

### BREAKPOINT 1440px (Large Desktop)

#### TC-RESPONSIVE-1440-001: Max-width
**Descripción:** Validar max-width en pantallas grandes

**Pasos:**
1. En DevTools, seleccionar 1440px+ o expandir ventana
2. Navegar PageWrapper
3. Verificar:
   - Contenido limitado a max-width-container (1440px)
   - Contenido centrado (mx-auto)
   - Espacios iguales a ambos lados

**Criterios de Aceptación:**
- [ ] Max-width respetado
- [ ] Contenido centrado
- [ ] Espacios simétricos
- [ ] Margen visible en ambos lados

**Resultado Esperado:**
Contenido no se expande a infinito en pantallas grandes.

---

#### TC-RESPONSIVE-1440-002: Proporción
**Descripción:** Validar proporciones en pantalla grande

**Pasos:**
1. Expandir ventana a 1920px si es posible
2. Verificar:
   - Margen izquierdo aprox. 240px (1920-1440)/2
   - Contenido ocupa 1440px
   - Diseño mantiene proporciones
   - Usar DevTools para medir

**Criterios de Aceptación:**
- [ ] Margen simétrico
- [ ] Max-width: 1440px
- [ ] Proporciones mantienen
- [ ] Centrado con mx-auto

**Resultado Esperado:**
Contenido centrado y proporcional en pantallas grandes.

---

### Transiciones de Breakpoints

#### TC-RESPONSIVE-TRANSITIONS-001: Suavidad
**Descripción:** Validar transiciones suaves entre breakpoints

**Pasos:**
1. Redimensionar ventana lentamente de 320px a 1440px
2. Observar cambios:
   - Padding aumenta gradualmente (p-4 > sm:p-6 > lg:p-8)
   - Layout cambia suavemente
   - Sin saltos abruptos
   - Sin reorden brusco de elementos

**Criterios de Aceptación:**
- [ ] Padding transiciones suaves
- [ ] Layout responde dinámicamente
- [ ] Sin saltos abruptos
- [ ] Transición en puntos correctos

**Resultado Esperado:**
Transiciones suaves al redimensionar ventana.

---

## Escenarios de Regresión

### Critical Path Testing

#### TC-REGRESSION-001: Flujo de Autenticación
**ID:** TC-REG-CRITICAL-001
**Descripción:** Validar que flujo de login no está roto

**Pasos:**
1. Ir a página de login
2. Llenar credenciales válidas
3. Hacer click en "Iniciar Sesión"
4. Esperar redirección a dashboard
5. Verificar que está autenticado

**Criterios de Aceptación:**
- [ ] Login formulario se carga
- [ ] Validación funciona
- [ ] Submit funciona
- [ ] Redirección a dashboard correcta
- [ ] Session se mantiene

**Resultado Esperado:**
Autenticación funciona sin cambios.

---

#### TC-REGRESSION-002: Navegación Principal
**ID:** TC-REG-CRITICAL-002
**Descripción:** Validar que navegación principal funciona

**Pasos:**
1. Verificar sidebar/nav principal está visible
2. Click en cada link de navegación
3. Verificar que página carga
4. Verificar que URL cambia correctamente
5. Regresar a página anterior (browser back button)

**Criterios de Aceptación:**
- [ ] Todos links navegan correctamente
- [ ] URLs son correctas
- [ ] Páginas cargan completamente
- [ ] Back button funciona

**Resultado Esperado:**
Navegación sin cambios, todos links funcionan.

---

#### TC-REGRESSION-003: Carga de Datos
**ID:** TC-REG-CRITICAL-003
**Descripción:** Validar que datos se cargan correctamente

**Pasos:**
1. Navegar a página con datos (ej: dashboard, tablas)
2. Esperar carga (verificar skeleton loaders)
3. Verificar que datos se muestran
4. Abrir DevTools Network tab
5. Verificar que API calls tienen status 200

**Criterios de Aceptación:**
- [ ] Skeleton loaders muestra durante carga
- [ ] Datos se cargan y muestran
- [ ] No hay errores 404 o 500
- [ ] Performance es aceptable (< 3 segundos)

**Resultado Esperado:**
Carga de datos sin regresiones.

---

#### TC-REGRESSION-004: Formularios
**ID:** TC-REG-CRITICAL-004
**Descripción:** Validar que formularios funcionan

**Pasos:**
1. Encontrar formulario (Settings, creación, edición)
2. Llenar campos
3. Validar que validación funciona (requerido, formato, etc.)
4. Submit formulario
5. Verificar que se guarden cambios

**Criterios de Aceptación:**
- [ ] Validación frontend funciona
- [ ] Submit funciona
- [ ] Datos se guardan
- [ ] Confirmación mostrada (toast, redirect)
- [ ] Errores de servidor manejados

**Resultado Esperado:**
Formularios funcionan sin cambios.

---

#### TC-REGRESSION-005: Dark Mode Toggle
**ID:** TC-REG-CRITICAL-005
**Descripción:** Validar que dark mode toggle funciona si existe

**Pasos:**
1. Encontrar dark mode toggle (usualmente en header/settings)
2. Hacer click para activar dark mode
3. Verificar que interfaz cambia a oscuro
4. Navegar a diferentes páginas
5. Verificar que dark mode se mantiene
6. Toggle de nuevo para light mode
7. Verificar que vuelve a light

**Criterios de Aceptación:**
- [ ] Toggle activa/desactiva dark mode
- [ ] Cambio es inmediato
- [ ] Se mantiene entre páginas
- [ ] Se persiste en localStorage/session
- [ ] Light mode funciona igual

**Resultado Esperado:**
Dark mode toggle funciona correctamente.

---

### Component-Level Regression

#### TC-REGRESSION-006: Button Funcionality
**ID:** TC-REG-COMP-001
**Descripción:** Validar que botones funcionan correctamente

**Pasos:**
1. Encontrar botones diferentes (primary, outline, ghost, brand)
2. Para cada uno:
   - Verificar que es clickeable
   - Verificar que tiene cursor pointer
   - Hacer click y verificar acción
   - Verificar en mobile también

**Criterios de Aceptación:**
- [ ] Todos botones son clickeables
- [ ] Cursor es pointer
- [ ] Click trigger acción correcta
- [ ] Disabled buttons no funcionan

**Resultado Esperado:**
Funcionalidad de botones sin cambios.

---

#### TC-REGRESSION-007: Form Controls
**ID:** TC-REG-COMP-002
**Descripción:** Validar inputs, selects, textareas

**Pasos:**
1. Encontrar cada tipo de control en formularios
2. Para cada uno:
   - Tipear en inputs
   - Seleccionar opciones en selects
   - Escribir en textareas
   - Verificar que valores se capturan
   - Verificar validación

**Criterios de Aceptación:**
- [ ] Inputs reciben input
- [ ] Selects funcionan
- [ ] Textareas funcionan
- [ ] Valores se capturan
- [ ] Validación funciona

**Resultado Esperado:**
Form controls funcionan sin regresiones.

---

#### TC-REGRESSION-008: Tables (si existen)
**ID:** TC-REG-COMP-003
**Descripción:** Validar que tablas funcionan

**Pasos:**
1. Encontrar tabla con datos
2. Verificar:
   - Headers están visibles
   - Datos se cargan completamente
   - Sorting funciona (si existe)
   - Paginación funciona (si existe)
   - Responsive en mobile (stacks o scrollable)

**Criterios de Aceptación:**
- [ ] Tabla se carga
- [ ] Datos visibles
- [ ] Sorting funciona
- [ ] Paginación funciona
- [ ] Responsive funciona

**Resultado Esperado:**
Tablas funcionan sin cambios.

---

#### TC-REGRESSION-009: Modals/Dialogs
**ID:** TC-REG-COMP-004
**Descripción:** Validar modals funcionan

**Pasos:**
1. Encontrar modal (confirmación, editar, etc.)
2. Abrirlo
3. Verificar:
   - Se abre modal
   - Backdrop es visible
   - Modal está centrado
   - Contenido es legible
4. Cerrar con botón o ESC
5. Verificar que se cierra

**Criterios de Aceptación:**
- [ ] Modal se abre
- [ ] Se centra correctamente
- [ ] Contenido visible
- [ ] Se cierra con botón
- [ ] Se cierra con ESC
- [ ] Backdrop clickeable si configurado

**Resultado Esperado:**
Modals funcionan sin cambios.

---

### Visual Regression

#### TC-REGRESSION-010: Color Consistency
**ID:** TC-REG-VISUAL-001
**Descripción:** Validar que colores no han cambiado accidentalmente

**Pasos:**
1. Tomar screenshots de páginas principales (desktop y mobile)
2. Comparar con versión anterior (si tiene)
3. Verificar:
   - Colores primarios iguales
   - Backgrounds consistentes
   - Bordes del mismo color
   - Gradientes si existen

**Criterios de Aceptación:**
- [ ] Colores primarios (#ff6b35) consistentes
- [ ] Backgrounds consistentes
- [ ] Sin cambios de color inesperados
- [ ] Dark mode colores correctos

**Resultado Esperado:**
Colores sin cambios respecto a diseño original.

---

#### TC-REGRESSION-011: Layout Consistency
**ID:** TC-REG-VISUAL-002
**Descripción:** Validar que layout no cambió

**Pasos:**
1. Comparar screenshots antes/después
2. Verificar:
   - Posición de elementos
   - Espaciado entre elementos
   - Alineamiento
   - Tamaño de elementos

**Criterios de Aceptación:**
- [ ] Elementos en posiciones correctas
- [ ] Espaciado consistente
- [ ] Alineamiento correcto
- [ ] Sin elementos que se desplacen

**Resultado Esperado:**
Layout sin cambios no intencionales.

---

#### TC-REGRESSION-012: Typography
**ID:** TC-REG-VISUAL-003
**Descripción:** Validar que tipografía no cambió

**Pasos:**
1. Inspeccionar diferentes textos
2. Verificar:
   - Font families iguales
   - Tamaños consistentes
   - Weights correctos
   - Line-heights apropiados

**Criterios de Aceptación:**
- [ ] Font families: Segoe UI, sans-serif
- [ ] Tamaños siguen escala
- [ ] Weights correctos (regular, medium, bold)
- [ ] Line-heights apropiados

**Resultado Esperado:**
Tipografía sin cambios.

---

## Comandos para Ejecutar Tests

### Desarrollo Local

```bash
# Iniciar servidor de desarrollo
npm run dev
# Accesible en http://localhost:3000

# Build para producción
npm run build

# Iniciar servidor de producción
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### E2E Tests (Playwright)

```bash
# Ejecutar todos los tests e2e
npm run test:e2e

# Ejecutar con UI (visual)
npm run test:e2e:ui

# Ejecutar con navegador visible
npm run test:e2e:headed

# Debug mode (paso a paso)
npm run test:e2e:debug

# Ver reporte de última ejecución
npm run test:e2e:report

# Ejecutar solo tests críticos
npm run test:e2e:critical

# Tests críticos con UI
npm run test:e2e:critical:ui

# Tests críticos con navegador visible
npm run test:e2e:critical:headed

# Reporte de tests críticos
npm run test:e2e:critical:report
```

### Verificación de Accesibilidad

```bash
# Instalar lighthouse globalmente (si no está)
npm install -g @lhci/cli@

# Auditoría con Lighthouse
lighthouse http://localhost:3000 --view

# Auditoría en modo CI
lighthouse http://localhost:3000 --output-path=./lighthouse-report.html
```

### Inspección de Estilos

```bash
# En DevTools
# 1. Abrir F12
# 2. Elements > Inspect cualquier elemento
# 3. Ver Computed styles en panel derecho
# 4. Verificar CSS variables en :root en Console:
document.documentElement.style.cssText
```

---

## Criterios de Aceptación

### Criterios Globales

Todas las pruebas DEBEN cumplir:

1. **Funcionalidad**
   - Componentes se renderizan sin errores
   - Todas acciones esperadas funcionan
   - No hay errores en Console (F12)

2. **Accesibilidad**
   - WCAG 2.1 AA compliance
   - Keyboard navigation funciona
   - Screen readers pueden navegar
   - Focus indicators visibles

3. **Responsividad**
   - Funciona en 320px, 768px, 1024px, 1440px+
   - Sin scroll horizontal
   - Padding responsivo correcto
   - Componentes adaptan apropiadamente

4. **Performance**
   - Carga < 3 segundos
   - Lighthouse score > 80
   - Animaciones suaves (60fps)
   - Transiciones sin jank

5. **Cross-Browser**
   - Chrome 120+
   - Firefox 121+
   - Safari 17+
   - Funcionalidad idéntica

6. **Dark Mode**
   - Funciona cuando activado
   - Colores correctos
   - Legibilidad mantenida
   - Accesibilidad WCAG AA

---

## Reportes de Ejecución

### Template de Reporte por Test Case

```
TEST CASE: [ID] - [Nombre]
Descripción: [Descripción breve]
Ejecutado por: [Nombre]
Fecha: [YYYY-MM-DD]
Navegador: [Chrome 120, Firefox 121, Safari 17, Mobile iOS, Mobile Android]
Versión: [1.0]

RESULTADO: [PASS / FAIL / BLOCKED]

DETALLES:
[ ] Criterio 1
[ ] Criterio 2
[ ] Criterio 3

OBSERVACIONES:
[Notas sobre la ejecución, comportamiento inesperado, etc.]

BUGS ENCONTRADOS:
[Si aplica, listar bugs con severidad y pasos de reproducción]

CAPTURAS:
[URLs o descripción de screenshots si es relevante]
```

### Matriz de Ejecución

| Test Case | Chrome | Firefox | Safari | Mobile | Resultado | Observaciones |
|-----------|--------|---------|--------|--------|-----------|---------------|
| TC-ICONS-001 | PASS | PASS | PASS | PASS | PASS | Sin issues |
| TC-PADDING-001 | PASS | PASS | PASS | PASS | PASS | - |
| ... | ... | ... | ... | ... | ... | - |

### Criterios de Salida

**PRUEBAS COMPLETADAS** cuando:
- Todos los test cases tienen estado (PASS/FAIL/BLOCKED)
- No hay issues críticos bloqueadores
- Cobertura >= 95%
- Accesibilidad WCAG AA en 100%

**PRUEBAS FALLIDAS** cuando:
- Existen issues críticos no resueltos
- Cobertura < 95%
- Accesibilidad < WCAG AA
- Regresiones encontradas

---

## Checklist Final

### Pre-Testing

- [ ] Entorno local configurado (npm install completado)
- [ ] npm run dev ejecutándose
- [ ] DevTools disponibles para inspección
- [ ] Navegadores actualizados (Chrome, Firefox, Safari)
- [ ] Test plan impreso/disponible

### Durante Testing

- [ ] Ejecutar test cases en orden
- [ ] Documentar resultados
- [ ] Capturar screenshots de issues
- [ ] Reportar bugs inmediatamente
- [ ] No asumir, verificar cada criterio

### Post-Testing

- [ ] Completar matriz de ejecución
- [ ] Consolidar reporte de bugs
- [ ] Crear summary de resultados
- [ ] Identificar tendencias (si hay)
- [ ] Documentar lecciones aprendidas

---

## Glosario

| Término | Definición |
|---------|-----------|
| WCAG 2.1 AA | Web Content Accessibility Guidelines nivel AA |
| Screen Reader | Software que lee contenido en voz para usuarios ciegos |
| Breakpoint | Punto en el que el diseño cambia (320px, 768px, 1024px, 1440px) |
| Dark Mode | Tema oscuro de interfaz (fondo oscuro, texto claro) |
| Skeleton Loader | Placeholder durante carga de contenido |
| Aria-label | Etiqueta accesible para screen readers |
| Focus Indicator | Anillo/borde que muestra dónde está el foco del teclado |
| Regression | Bug o funcionalidad rota que antes funcionaba |
| Critical Path | Flujo más importante de la aplicación (ej: login) |
| Lighthouse | Herramienta de auditoría de Google para performance y accesibilidad |

---

## Contacto y Escalación

Para reportar bugs o issues encontrados durante testing:

1. **Documentar completamente:**
   - ID del test case
   - Pasos exactos de reproducción
   - Resultado esperado vs actual
   - Screenshots/videos si es posible
   - Navegador y versión

2. **Severidad:**
   - CRÍTICA: Bloquea funcionalidad principal
   - ALTA: Afecta experiencia de usuario
   - MEDIA: Funciona pero con inconvenientes
   - BAJA: Mejora menor o estética

3. **Escalación:**
   - Issues CRÍTICAS: Resolver inmediatamente
   - Issues ALTAS: Resolver antes de release
   - Issues MEDIA: Considerar para próxima versión
   - Issues BAJAS: Backlog

---

**Fin del Plan de Pruebas**

Versión: 1.0
Última actualización: 11 de Diciembre de 2025
Estado: LISTO PARA EJECUCIÓN
