import * as React from 'react';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
  maxHeight?: string;
}

/**
 * ScrollArea Component
 * A scrollable container with custom styling
 * Provides smooth scrolling with native browser support
 */
const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className = '', orientation = 'vertical', maxHeight, children, style, ...props }, ref) => {
    const getOverflowClass = () => {
      switch (orientation) {
        case 'horizontal':
          return 'overflow-x-auto overflow-y-hidden';
        case 'both':
          return 'overflow-auto';
        default:
          return 'overflow-y-auto overflow-x-hidden';
      }
    };

    const scrollAreaStyles: React.CSSProperties = {
      maxHeight,
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(156, 163, 175, 0.3) transparent',
      ...style,
    };

    return (
      <div
        ref={ref}
        className={`relative ${getOverflowClass()} scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:dark:bg-slate-600 ${className}`}
        style={scrollAreaStyles}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
