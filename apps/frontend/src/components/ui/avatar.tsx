import * as React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className = '', src, alt = '', fallback = '?', size = 'md', ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);

    const sizes = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
    };

    const showFallback = !src || imageError;

    return (
      <div
        ref={ref}
        className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-muted ${sizes[size]} ${className}`}
        {...props}
      >
        {showFallback ? (
          <span className="font-medium text-muted-foreground">{fallback}</span>
        ) : (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar };
