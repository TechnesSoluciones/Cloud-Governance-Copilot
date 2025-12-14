import * as React from 'react';

export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

/**
 * Visually hides content while keeping it accessible to screen readers
 * Useful for adding context for assistive technologies
 */
export const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ children, className = '', ...props }, ref) => (
    <span
      ref={ref}
      className={`absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0 ${className}`}
      style={{ clip: 'rect(0, 0, 0, 0)' }}
      {...props}
    >
      {children}
    </span>
  )
);

VisuallyHidden.displayName = 'VisuallyHidden';
