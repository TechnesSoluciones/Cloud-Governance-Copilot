# PageWrapper Component - Complete Documentation Index

This directory contains the PageWrapper component and comprehensive documentation for integrating consistent layouts across the Cloud Copilot frontend application.

## Quick Navigation

### For First-Time Users
Start here to understand and use the PageWrapper component:
1. Read this file (you are here)
2. Read `PageWrapper.USAGE.md` - Complete usage guide
3. Look at `PageWrapper.examples.tsx` - See practical examples
4. Read `INTEGRATION_GUIDE.md` - Learn how to use in pages

### For Visual Learners
1. `PAGEWRAPPER_VARIANTS.md` - Visual diagrams and variant guide
2. `PageWrapper.examples.tsx` - 8 practical code examples
3. `INTEGRATION_GUIDE.md` - Real page integration patterns

### For Implementation
1. `INTEGRATION_GUIDE.md` - How to integrate into pages
2. `PageWrapper.USAGE.md` - API reference and examples
3. `PageWrapper.tsx` - Component source code

### For Troubleshooting
1. `PageWrapper.USAGE.md` - Troubleshooting section
2. `INTEGRATION_GUIDE.md` - Common issues and solutions

## Files in This Directory

### Component Files

#### `PageWrapper.tsx` (296 lines)
The main component file containing:
- React.memo wrapped component
- Full TypeScript type definitions
- Comprehensive JSDoc documentation
- Responsive padding implementation
- Max-width and spacing variants
- Breadcrumbs support
- Accessibility features (WCAG 2.1 AA)
- Performance optimizations

**Key Exports:**
```typescript
export type MaxWidthVariant = 'full' | 'container' | '4xl' | '2xl';
export type SpacingVariant = 'sm' | 'md' | 'lg';
export interface PageWrapperProps { /* ... */ }
export const PageWrapper = React.memo<PageWrapperProps>(...)
```

#### `index.tsx` (16 lines)
Central export file for the layout components:
```typescript
export { PageWrapper } from './PageWrapper';
export type {
  PageWrapperProps,
  MaxWidthVariant,
  SpacingVariant,
} from './PageWrapper';
```

### Documentation Files

#### `PAGEWRAPPER_SUMMARY.md` (Recommended Start)
**Purpose:** High-level overview of the component

Contains:
- Overview and file structure
- API reference with all props
- Quick start examples (4 variations)
- Implementation details
- Responsive behavior explanation
- Accessibility features
- Performance optimizations
- Design system integration
- Testing information
- Component statistics
- Related components
- Contributing guidelines

**Best For:** Getting a complete picture of what PageWrapper does

#### `PageWrapper.USAGE.md` (Most Comprehensive)
**Purpose:** Complete usage guide and reference

Contains:
- Detailed feature descriptions
- Full API reference with examples
- Max-width and spacing variant charts
- 6+ practical usage examples
- Responsive behavior details
- Accessibility features (WCAG 2.1 AA)
- Performance considerations
- Common patterns
- TypeScript support guide
- Migration guide from old patterns
- Troubleshooting guide
- Browser support information
- Design system integration

**Best For:** Learning how to use PageWrapper in detail

**Examples included:**
1. Basic usage
2. With breadcrumbs
3. Centered form layout
4. Dashboard with stats
5. Dark mode support
6. Full height layout
7. Report page layout

#### `INTEGRATION_GUIDE.md` (Most Practical)
**Purpose:** How to integrate PageWrapper into pages

Contains:
- File organization recommendations
- Import patterns (3 variations)
- 4+ page-level integration examples
- Component integration patterns
- Best practices (6 detailed sections)
- Common layout patterns (5 examples)
- Dark mode support
- Troubleshooting guide
- Performance considerations
- Testing examples
- Resource links

**Page Examples:**
1. Dashboard page (full-width)
2. Settings page (container width)
3. Authentication page (centered)
4. Cloud accounts page (full width with breadcrumbs)

**Best For:** Implementing PageWrapper in your own pages

#### `PAGEWRAPPER_VARIANTS.md` (Visual Reference)
**Purpose:** Visual guide to all component variants

Contains:
- Responsive padding variants (ASCII diagrams)
- Max-width variants (visual diagrams)
- Spacing variants (visual examples)
- Breadcrumbs alignment diagram
- Common layout combinations
- Padding breakdown by breakpoint
- Spacing values comparison
- Max-width comparison
- Color/theme variants
- Responsive behavior map
- Complete element structure
- Design system integration details
- Summary chart

**Best For:** Understanding visual appearance of variants

### Example Files

#### `PageWrapper.examples.tsx` (8 Examples)
Real-world usage examples:
1. Dashboard page
2. Settings page with breadcrumbs
3. Login page (centered form)
4. Cloud accounts page (full width)
5. Anomaly detection page (compact)
6. Dark mode example
7. Setup wizard (full height)
8. Report page (custom styling)

**Best For:** Copy-paste starting points for your pages

### Test Files

#### `PageWrapper.test.tsx` (Comprehensive Test Suite)
Test coverage for:
- Rendering
- Responsive padding
- Max-width variants
- Spacing variants
- Breadcrumbs functionality
- Accessibility attributes
- Custom styling
- Props combinations
- Performance (React.memo)
- Edge cases
- Integration scenarios
- Type safety

**Run with:** `npm test -- PageWrapper.test.tsx`

### Reference Files

#### `PageWrapper.migration-example.tsx`
Examples of migrating from old layout patterns to PageWrapper.
Shows before/after comparisons.

#### `PageWrapper.README.md`
Additional component documentation and reference.

## Component Props

### Required Props
| Prop | Type | Description |
|------|------|-------------|
| `children` | `React.ReactNode` | Page content to render |

### Optional Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxWidth` | `'full' \| 'container' \| '4xl' \| '2xl'` | `'full'` | Maximum width constraint |
| `spacing` | `'sm' \| 'md' \| 'lg'` | `'md'` | Spacing between child sections |
| `breadcrumbs` | `React.ReactNode` | `undefined` | Breadcrumb navigation element |
| `withPadding` | `boolean` | `true` | Apply responsive padding |
| `className` | `string` | `''` | Additional CSS classes |
| `ariaLabel` | `string` | `'Main content'` | Accessibility label |
| `backgroundColor` | `string` | `undefined` | Background color class |
| `minHeight` | `string` | `undefined` | Minimum height class |

## Responsive Padding

The component automatically applies responsive padding:

| Device | Width | Padding | Class |
|--------|-------|---------|-------|
| Mobile | <640px | 16px | `p-4` |
| Tablet | 640-1024px | 24px | `sm:p-6` |
| Desktop | >1024px | 32px | `lg:p-8` |

## Max-Width Variants

| Variant | Width | Use Case |
|---------|-------|----------|
| `full` | 100% | Dashboards, full-width content |
| `container` | 1440px | Standard pages, main content area |
| `4xl` | 896px | Wide single-column content |
| `2xl` | 672px | Forms, centered pages, narrow content |

## Spacing Variants

| Variant | Gap | Use Case |
|---------|-----|----------|
| `sm` | 16px | Forms, compact layouts |
| `md` | 24px | Standard pages (default) |
| `lg` | 32px | Dashboards, open layouts |

## Breadcrumbs Support

Breadcrumbs are automatically:
- Rendered in semantic `<nav>` element
- Aligned with main content max-width
- Separated with `mb-6` margin
- Applied same responsive padding as content

## Accessibility Features

Complies with WCAG 2.1 AA:
- Semantic HTML (`<main>` and `<nav>` elements)
- ARIA labels and roles
- Color contrast compliance
- Keyboard navigation support
- Screen reader compatibility
- Focus management

## Performance Optimizations

- React.memo for component memoization
- useMemo for class name computation
- Minimal DOM structure
- Zero external dependencies
- Lightweight (~2KB unminified)

## Design System Integration

Integrates with Cloud Copilot design system:
- Tailwind CSS (responsive, 4px spacing scale)
- Brand colors (orange, cloud-blue, status colors)
- Responsive breakpoints (xs to 3xl)
- Dark mode support
- Typography system

## Quick Examples

### Basic Dashboard
```tsx
<PageWrapper maxWidth="full" spacing="lg">
  <h1>Dashboard</h1>
  <StatsGrid />
  <Charts />
</PageWrapper>
```

### Settings Page
```tsx
<PageWrapper
  maxWidth="container"
  spacing="md"
  breadcrumbs={<Breadcrumbs />}
>
  <SettingsForm />
</PageWrapper>
```

### Login Form
```tsx
<PageWrapper maxWidth="2xl" spacing="sm" minHeight="min-h-screen">
  <LoginForm />
</PageWrapper>
```

## Getting Started

### Step 1: Import
```tsx
import { PageWrapper } from '@/components/layout';
```

### Step 2: Wrap Content
```tsx
<PageWrapper>
  <YourContent />
</PageWrapper>
```

### Step 3: Customize
```tsx
<PageWrapper
  maxWidth="container"
  spacing="lg"
  breadcrumbs={<Breadcrumbs />}
>
  <YourContent />
</PageWrapper>
```

### Step 4: Reference Docs
- For detailed usage: See `PageWrapper.USAGE.md`
- For integration: See `INTEGRATION_GUIDE.md`
- For examples: See `PageWrapper.examples.tsx`

## Testing

All components are thoroughly tested:
- Unit tests in `PageWrapper.test.tsx`
- Visual testing via examples
- Responsive testing (multiple viewports)
- Accessibility testing (keyboard, screen reader)
- TypeScript strict mode testing

Run tests: `npm test -- PageWrapper.test.tsx`

## Browser Support

Supported browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Troubleshooting

### Content Not Responsive
- Ensure child components use Tailwind responsive classes
- Use grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

### Breadcrumbs Not Visible
- Check breadcrumbs prop is not undefined
- Verify breadcrumbs JSX is valid

### Too Much Padding
- Reduce spacing with `spacing="sm"`
- Or set `withPadding={false}` for custom padding

### Dark Mode Not Working
- Ensure Tailwind dark mode is enabled
- Use classes like `dark:bg-gray-900`

See `PageWrapper.USAGE.md` troubleshooting section for more.

## Support & Resources

### Documentation
- `PAGEWRAPPER_SUMMARY.md` - Component overview
- `PageWrapper.USAGE.md` - Complete usage guide
- `INTEGRATION_GUIDE.md` - Integration patterns
- `PAGEWRAPPER_VARIANTS.md` - Visual reference

### Code Examples
- `PageWrapper.examples.tsx` - 8 real-world examples
- `PageWrapper.test.tsx` - Test examples
- `PageWrapper.migration-example.tsx` - Migration examples

### Type Definitions
- `PageWrapperProps` - Props interface
- `MaxWidthVariant` - Max-width type
- `SpacingVariant` - Spacing type

## Contributing

When modifying PageWrapper:
1. Update JSDoc in `PageWrapper.tsx`
2. Add examples to `PageWrapper.examples.tsx`
3. Add tests to `PageWrapper.test.tsx`
4. Update relevant documentation
5. Test responsive behavior
6. Verify accessibility
7. Build and test

## Related Components

- `TopNav` - Top navigation bar
- `Sidebar` - Left sidebar navigation
- `Breadcrumbs` - Breadcrumb navigation (use with breadcrumbs prop)

## Version & Status

- **Version:** 1.0
- **Status:** Production Ready
- **Last Updated:** December 11, 2024
- **TypeScript:** Full coverage
- **Accessibility:** WCAG 2.1 AA
- **Performance:** Optimized with React.memo + useMemo
- **Testing:** Comprehensive test suite

## Summary

PageWrapper is a production-ready layout component that provides:

✅ Consistent responsive padding (mobile-first)
✅ Flexible max-width options
✅ Configurable spacing between sections
✅ Breadcrumb navigation support
✅ Full accessibility compliance
✅ Complete TypeScript support
✅ Performance optimizations
✅ Comprehensive documentation

Use it as the foundation for all page layouts to ensure visual consistency and maintainability.

---

**Need Help?**
1. Start with `PageWrapper.USAGE.md` for detailed guide
2. Check `INTEGRATION_GUIDE.md` for page examples
3. View `PageWrapper.examples.tsx` for code samples
4. See `PAGEWRAPPER_VARIANTS.md` for visual reference

**Ready to Use?**
Import and start wrapping your pages:
```tsx
import { PageWrapper } from '@/components/layout';

export default function Page() {
  return <PageWrapper>{/* Your content */}</PageWrapper>;
}
```
