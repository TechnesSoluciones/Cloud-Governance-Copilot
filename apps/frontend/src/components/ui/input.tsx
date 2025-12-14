import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input component with full accessibility support
 *
 * Best practices for accessibility:
 * 1. Always associate with a label element:
 *    <label htmlFor="email">Email</label>
 *    <Input id="email" type="email" />
 *
 * 2. Use aria-describedby for validation/helper messages:
 *    <Input aria-describedby="error-message" />
 *    <span id="error-message">Email is required</span>
 *
 * 3. Use aria-invalid for invalid inputs:
 *    <Input aria-invalid="true" aria-describedby="error-message" />
 *
 * 4. Use aria-label only when label element cannot be used:
 *    <Input aria-label="Search" placeholder="Search..." />
 *
 * The component properly supports all standard HTML input attributes
 * and ARIA attributes via spread props.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
