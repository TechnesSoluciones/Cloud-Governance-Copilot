import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button, ButtonProps } from './button';
import { cn } from '@/lib/utils';

export interface LoadingButtonProps extends ButtonProps {
  /**
   * Whether the button is in a loading state
   */
  isLoading?: boolean;
  /**
   * Optional text to display while loading
   * If not provided, the button will maintain its original content with a spinner
   */
  loadingText?: string;
}

/**
 * LoadingButton Component
 *
 * An extension of the Button component that displays a loading spinner and
 * automatically disables interaction during loading states.
 *
 * Features:
 * - Maintains button width during loading to prevent layout shift
 * - Automatically disables button when isLoading is true
 * - Shows animated spinner (Loader2 from lucide-react)
 * - Supports all Button variants and sizes
 * - Optional custom loading text
 *
 * @example
 * ```tsx
 * <LoadingButton
 *   isLoading={isSubmitting}
 *   onClick={handleSubmit}
 * >
 *   Submit
 * </LoadingButton>
 *
 * <LoadingButton
 *   isLoading={isSubmitting}
 *   loadingText="Saving..."
 *   variant="default"
 *   size="lg"
 * >
 *   Save Changes
 * </LoadingButton>
 * ```
 */
const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      children,
      isLoading = false,
      loadingText,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    // Use a ref to maintain the button's width during loading
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const [minWidth, setMinWidth] = React.useState<number | undefined>(undefined);

    // Combine refs (forwarded ref and internal ref)
    React.useImperativeHandle(ref, () => buttonRef.current!);

    // Capture button width before loading starts to prevent layout shift
    React.useEffect(() => {
      if (isLoading && buttonRef.current) {
        const width = buttonRef.current.offsetWidth;
        if (width > 0) {
          setMinWidth(width);
        }
      } else {
        // Reset min-width when not loading to allow natural sizing
        setMinWidth(undefined);
      }
    }, [isLoading]);

    return (
      <Button
        ref={buttonRef}
        disabled={isLoading || disabled}
        className={cn(className)}
        style={{
          minWidth: minWidth ? `${minWidth}px` : undefined,
        }}
        {...props}
      >
        {isLoading && (
          <Loader2
            className="mr-2 h-4 w-4 animate-spin"
            aria-hidden="true"
          />
        )}
        {isLoading && loadingText ? loadingText : children}
        {isLoading && (
          <span className="sr-only">Loading...</span>
        )}
      </Button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';

export { LoadingButton };
