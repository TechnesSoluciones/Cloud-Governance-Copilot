import * as React from 'react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className = '', size = 'md', ...props }, ref) => {
    const sizes = {
      sm: 'h-4 w-4 border-2',
      md: 'h-8 w-8 border-2',
      lg: 'h-12 w-12 border-3',
    };

    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading"
        className={`inline-block animate-spin rounded-full border-solid border-primary border-r-transparent ${sizes[size]} ${className}`}
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

export { Spinner };
