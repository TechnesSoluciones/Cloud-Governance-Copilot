# PageWrapper Component - Variants & Visual Guide

Complete visual reference and variant guide for the PageWrapper component.

## Responsive Padding Variants

### Mobile (xs - 320px)
```
┌─────────────────────────────────────────┐
│          p-4 (16px padding)             │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │     Page Content                │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│          p-4 (16px padding)             │
└─────────────────────────────────────────┘
```

### Tablet (sm - 640px)
```
┌──────────────────────────────────────────────────────────┐
│          sm:p-6 (24px padding)                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │                                                  │    │
│  │     Page Content                                 │    │
│  │                                                  │    │
│  └──────────────────────────────────────────────────┘    │
│          sm:p-6 (24px padding)                           │
└──────────────────────────────────────────────────────────┘
```

### Desktop (lg - 1024px+)
```
┌─────────────────────────────────────────────────────────────────┐
│          lg:p-8 (32px padding)                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │     Page Content                                        │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│          lg:p-8 (32px padding)                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Max-Width Variants

### Full Width (maxWidth="full")
```
┌──────────────────────────────────────────────────────────────────────┐
│ p-4 sm:p-6 lg:p-8                                    p-4 sm:p-6 lg:p-8 │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │                    100% Width (max-w-full)                     │  │
│ │                     No centering applied                        │  │
│ │                     Full viewport width                        │  │
│ └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Container Width (maxWidth="container")
```
┌──────────────────────────────────────────────────────────────────────┐
│                  Horizontal padding                                   │
│         ┌─────────────────────────────────────────┐                 │
│         │  1440px max-width (max-w-container)    │                 │
│         │  mx-auto (centered)                    │                 │
│         │  p-4 sm:p-6 lg:p-8                     │                 │
│         │                                         │                 │
│         │  Content aligned with design system    │                 │
│         │  container breakpoint                  │                 │
│         │                                         │                 │
│         └─────────────────────────────────────────┘                 │
│                  Horizontal padding                                   │
└──────────────────────────────────────────────────────────────────────┘
Max 1440px
```

### 4XL Width (maxWidth="4xl")
```
┌──────────────────────────────────────────────────────────────────────┐
│              Horizontal padding                                       │
│              ┌──────────────────────────┐                            │
│              │  896px max-width         │                            │
│              │  (max-w-4xl)             │                            │
│              │  mx-auto (centered)      │                            │
│              │  p-4 sm:p-6 lg:p-8       │                            │
│              │                          │                            │
│              │  Content                 │                            │
│              │                          │                            │
│              └──────────────────────────┘                            │
│              Horizontal padding                                       │
└──────────────────────────────────────────────────────────────────────┘
Max 896px (56rem)
```

### 2XL Width (maxWidth="2xl")
```
┌──────────────────────────────────────────────────────────────────────┐
│                  Horizontal padding                                   │
│                    ┌──────────────────┐                              │
│                    │ 672px max-width  │                              │
│                    │ (max-w-2xl)      │                              │
│                    │ mx-auto          │                              │
│                    │ p-4 sm:p-6 lg:p-8│                              │
│                    │                  │                              │
│                    │  Content         │                              │
│                    │                  │                              │
│                    └──────────────────┘                              │
│                  Horizontal padding                                   │
└──────────────────────────────────────────────────────────────────────┘
Max 672px (42rem)
```

## Spacing Variants

### Small Spacing (spacing="sm")
```
┌────────────────┐
│  Section 1     │  space-y-4
│                │  (16px gap)
├────────────────┤
│  Section 2     │  space-y-4
│                │  (16px gap)
├────────────────┤
│  Section 3     │
└────────────────┘

Use case: Forms, compact layouts, closely related content
```

### Medium Spacing (spacing="md") - DEFAULT
```
┌────────────────┐
│  Section 1     │  space-y-6
│                │  (24px gap)
├────────────────┤
│  Section 2     │  space-y-6
│                │  (24px gap)
├────────────────┤
│  Section 3     │
└────────────────┘

Use case: Standard layouts, most pages, balanced spacing
```

### Large Spacing (spacing="lg")
```
┌────────────────┐
│  Section 1     │  space-y-8
│                │  (32px gap)
├────────────────┤
│  Section 2     │  space-y-8
│                │  (32px gap)
├────────────────┤
│  Section 3     │
└────────────────┘

Use case: Dashboards, open layouts, distinct sections
```

## Breadcrumbs Alignment

### With Breadcrumbs

```
┌─────────────────────────────────────────┐
│          Responsive padding             │
│  ┌────────────────────────────────────┐ │
│  │ Home / Settings                    │ │ (Breadcrumbs nav)
│  │ mb-6 separator                     │ │
│  └────────────────────────────────────┘ │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │ Page Content                       │ │
│  │ (Main element)                     │ │
│  │ space-y-{variant}                  │ │
│  └────────────────────────────────────┘ │
│                                         │
│          Responsive padding             │
└─────────────────────────────────────────┘

Key features:
- Breadcrumbs in semantic <nav> element
- Aligned with main content max-width
- Separated with mb-6 margin
- Same responsive padding as main content
```

## Common Layout Combinations

### Dashboard Layout
```
maxWidth="full"
spacing="lg"
breadcrumbs={optional}

┌──────────────────────────────────────────────────────────┐
│ Dashboard                                   32px padding │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Header                                             │  │
│ └────────────────────────────────────────────────────┘  │
│                         32px gap (space-y-8)            │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Stats Grid (4 cols)                                │  │
│ └────────────────────────────────────────────────────┘  │
│                         32px gap (space-y-8)            │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Charts Section                                     │  │
│ └────────────────────────────────────────────────────┘  │
│                         32px gap (space-y-8)            │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Activity Feed                                      │  │
│ └────────────────────────────────────────────────────┘  │
│ 32px padding                                             │
└──────────────────────────────────────────────────────────┘

Characteristics:
- Full width content
- Large spacing between sections
- Breadcrumbs optional
- Multiple major sections
```

### Settings Layout
```
maxWidth="container"
spacing="md"
breadcrumbs={<Breadcrumbs />}

┌────────────────────────────────────────────────────┐
│          padding                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │ Home / Settings          (24px padding)     │  │
│  ├─────────────────────────────────────────────┤  │
│  │                   24px gap                  │  │
│  │ ┌─────────────────────────────────────────┐│  │
│  │ │ Settings Form                           ││  │
│  │ │ (max-w-container, centered)             ││  │
│  │ │                                         ││  │
│  │ └─────────────────────────────────────────┘│  │
│  │                                             │  │
│  │ 1440px max                                 │  │
│  └─────────────────────────────────────────────┘  │
│          padding                                    │
└────────────────────────────────────────────────────┘

Characteristics:
- Container max-width (1440px)
- Medium spacing
- Breadcrumbs included
- Centered content
```

### Form/Login Layout
```
maxWidth="2xl"
spacing="sm"
minHeight="min-h-screen"

┌──────────────────────────────────────┐
│                                      │
│                                      │
│            padding                   │
│       ┌─────────────────────┐        │
│       │   Login Form        │        │
│       │ (672px max-w-2xl)   │        │
│       │ 16px gaps (space-y-4│        │
│       │                     │        │
│       └─────────────────────┘        │
│            padding                   │
│                                      │
│                                      │
│  Full height (min-h-screen)          │
│                                      │
└──────────────────────────────────────┘

Characteristics:
- Narrow max-width (2xl)
- Tight spacing between form fields
- Full height container
- Centered, focused content
- No breadcrumbs
```

## Padding Breakdown by Breakpoint

### Responsive Padding Scale
```
Breakpoint    Class    Size    Use Case
─────────────────────────────────────────────
Mobile        p-4      16px    Smaller screens
Tablet        sm:p-6   24px    Medium screens
Desktop       lg:p-8   32px    Large screens

Applied to: PageWrapper main element AND breadcrumbs nav (if present)
```

### Padding Values in Different Units
```
p-4:   16px  = 1rem     = 4 * 4px (base unit)
sm:p-6: 24px  = 1.5rem  = 6 * 4px (base unit)
lg:p-8: 32px  = 2rem    = 8 * 4px (base unit)
```

## Spacing Values Comparison

```
Variant  Class      Gap     Use Case
──────────────────────────────────────────────
sm       space-y-4  16px    Compact/Forms
md       space-y-6  24px    Standard/Default
lg       space-y-8  32px    Open/Dashboard

All gaps apply between direct children elements
```

## Max-Width Comparison

```
Variant     Class             Width    Columns  Use Case
────────────────────────────────────────────────────────────
full        max-w-full        100%     4+       Dashboard
container   max-w-container   1440px   3-4      Content
4xl         max-w-4xl         896px    2-3      Articles
2xl         max-w-2xl         672px    1-2      Forms
```

## Color & Theme Variants

### Light Mode (Default)
```
┌─────────────────────────────────────────────┐
│ bg-white (or default background)            │
│ text-gray-900 (default foreground)           │
│ border-gray-200 (borders)                    │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ Content with light mode styling         │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

Default appearance in light mode
```

### Dark Mode
```
┌─────────────────────────────────────────────┐
│ dark:bg-gray-900 (dark background)          │
│ dark:text-white (light foreground)           │
│ dark:border-gray-700 (dark borders)          │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ Content with dark mode styling          │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

Appears when dark mode is enabled
```

## Responsive Behavior Map

```
                Mobile          Tablet          Desktop
              (xs-sm)          (sm-lg)           (lg+)
             320-640px       640-1024px        1024px+
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Padding       p-4             sm:p-6            lg:p-8
              (16px)          (24px)            (32px)

Width         100%            100%              100%

Max-width     Applied         Applied           Applied
              (if set)        (if set)          (if set)

Center        mx-auto         mx-auto           mx-auto
              (if needed)     (if needed)       (if needed)

Spacing       space-y-*       space-y-*         space-y-*
              (responsive)    (responsive)      (responsive)
```

## Complete Element Structure

### With Breadcrumbs
```html
<main class="w-full p-4 sm:p-6 lg:p-8 max-w-{variant} mx-auto space-y-{variant}">
  <nav class="mb-6 max-w-{variant} mx-auto p-4 sm:p-6 lg:p-8" aria-label="Breadcrumb navigation">
    {breadcrumbs}
  </nav>
  {children}
</main>
```

### Without Breadcrumbs
```html
<main class="w-full p-4 sm:p-6 lg:p-8 max-w-{variant} mx-auto space-y-{variant}">
  {children}
</main>
```

## Accessibility Visual Guide

### Semantic Structure
```
<main role="main" aria-label="Main content">
  ├── <nav aria-label="Breadcrumb navigation">
  │   └── Breadcrumb items
  └── Children content
```

### Focus Management
```
┌──────────────────────────┐
│ [Focus here first]       │ → Breadcrumbs
├──────────────────────────┤
│                          │
│ [Then here]              │ → Main content
│                          │
└──────────────────────────┘
```

## Design System Integration

### Spacing Scale (4px base unit)
```
p-4:   16px = 1rem  (4 units)
p-6:   24px = 1.5rem (6 units)
p-8:   32px = 2rem  (8 units)
─────────────────────────────
All values follow the 4px base unit system
```

### Color Integration
```
Design System Colors:
├── Primary: brand-orange (#ff6b35)
├── Secondary: cloud-blue (#0078d4)
├── Status: success/error/warning/info
├── Neutral: gray-50 to gray-900
└── Works with: backgroundColor prop

Typography:
├── Font: Segoe UI, -apple-system, system-ui
├── Sizes: xs (12px) to 5xl (56px)
└── Weights: regular to extrabold
```

### Responsive Breakpoints
```
xs:  320px   (Mobile phones)
sm:  640px   (Tablets)
md:  768px   (Small tablets)
lg:  1024px  (Desktops)
xl:  1280px  (Large desktops)
2xl: 1440px  (Extra large)
3xl: 1920px  (Ultra-wide)
```

## Summary Chart

```
┌─────────────────┬──────────┬───────────┬──────────┐
│    Property     │   Type   │  Default  │ Options  │
├─────────────────┼──────────┼───────────┼──────────┤
│ maxWidth        │ variant  │ 'full'    │ 4 values │
│ spacing         │ variant  │ 'md'      │ 3 values │
│ withPadding     │ boolean  │ true      │ 2 values │
│ className       │ string   │ ''        │ any CSS  │
│ backgroundColor │ string   │ undefined │ any      │
│ minHeight       │ string   │ undefined │ any      │
│ ariaLabel       │ string   │ 'Main...' │ any text │
│ breadcrumbs     │ node     │ undefined │ element  │
└─────────────────┴──────────┴───────────┴──────────┘
```

---

This visual guide provides a complete overview of all PageWrapper variants, combinations, and responsive behaviors. Use these diagrams and charts as reference when implementing page layouts.
