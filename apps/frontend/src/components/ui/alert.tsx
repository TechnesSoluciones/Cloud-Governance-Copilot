import * as React from 'react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', variant = 'default', dismissible, onDismiss, children, ...props }, ref) => {
    const variants = {
      default: 'bg-gray-50 border-gray-200 text-gray-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={`relative w-full rounded-md border p-4 text-sm ${variants[variant]} ${className}`}
        {...props}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">{children}</div>
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="inline-flex shrink-0 items-center justify-center rounded-md hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2"
              aria-label="Dismiss"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h5 ref={ref} className={`mb-1 font-semibold leading-none tracking-tight ${className}`} {...props} />
  )
);

AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`text-sm opacity-90 ${className}`} {...props} />
));

AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
