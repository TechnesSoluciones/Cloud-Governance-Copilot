import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'brand';
  size?: 'default' | 'sm' | 'lg';
}

/**
 * Button component with full accessibility support
 *
 * Supports all standard HTML button attributes including:
 * - aria-label: Required for icon-only buttons without visible text
 * - aria-describedby: Links button to descriptive text element
 * - aria-expanded: For buttons that toggle content visibility
 * - aria-pressed: For toggle buttons
 * - aria-disabled: For custom disabled states
 *
 * Example icon-only button:
 * <Button aria-label="Close dialog"><CloseIcon aria-hidden="true" /></Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      default: 'bg-primary text-primary-foreground hover:opacity-90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
      brand: 'bg-brand-orange text-white hover:bg-brand-orange-dark active:bg-brand-orange-dark disabled:opacity-50',
    };

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
