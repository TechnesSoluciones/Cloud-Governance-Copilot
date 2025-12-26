/**
 * Hybrid Icon Component
 * CloudNexus V2 Design System
 *
 * Uses Material Symbols as primary, Lucide React as fallback
 * Automatically falls back if Material Symbols fail to load
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

// Icon mapping: Material Symbol name -> Lucide Icon component
const iconMap: Record<string, React.ComponentType<any>> = {
  // Navigation & UI
  'dashboard': LucideIcons.LayoutDashboard,
  'attach_money': LucideIcons.DollarSign,
  'security': LucideIcons.Shield,
  'dns': LucideIcons.Server,
  'lightbulb': LucideIcons.Lightbulb,
  'warning': LucideIcons.AlertTriangle,
  'inventory_2': LucideIcons.Package,
  'psychology': LucideIcons.Brain,
  'cloud': LucideIcons.Cloud,
  'cloud_queue': LucideIcons.Cloud,
  'list_alt': LucideIcons.List,
  'settings': LucideIcons.Settings,

  // Actions
  'add': LucideIcons.Plus,
  'arrow_forward': LucideIcons.ArrowRight,
  'more_vert': LucideIcons.MoreVertical,
  'expand_more': LucideIcons.ChevronDown,
  'check_circle': LucideIcons.CheckCircle2,
  'calendar_month': LucideIcons.Calendar,
  'search': LucideIcons.Search,
  'notifications': LucideIcons.Bell,
  'dark_mode': LucideIcons.Moon,
  'download': LucideIcons.Download,

  // Status & Indicators
  'trending_up': LucideIcons.TrendingUp,
  'trending_down': LucideIcons.TrendingDown,
  'cloud_done': LucideIcons.CloudCheck,
  'cloud_sync': LucideIcons.CloudCog,
  'savings': LucideIcons.PiggyBank,
  'analytics': LucideIcons.BarChart3,

  // Resources
  'category': LucideIcons.Boxes,
  'location_on': LucideIcons.MapPin,
  'folder': LucideIcons.Folder,
};

export interface IconProps extends React.HTMLAttributes<HTMLElement> {
  /** Icon name (Material Symbol name) */
  name: string;
  /** Size className (e.g., 'text-lg', 'text-2xl') */
  size?: string;
  /** Whether to use filled variant (Material Symbols only) */
  filled?: boolean;
  /** Use Lucide fallback instead of Material Symbols */
  useLucide?: boolean;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'text-xl',
  filled = false,
  useLucide = false,
  className,
  ...props
}) => {
  const [useFallback, setUseFallback] = React.useState(useLucide);

  // Check if Material Symbols font is loaded
  React.useEffect(() => {
    if (!useLucide && typeof document !== 'undefined') {
      // Check if Material Symbols font is available
      document.fonts.ready.then(() => {
        const materialSymbolsLoaded = document.fonts.check('24px "Material Symbols Outlined"');
        if (!materialSymbolsLoaded) {
          setUseFallback(true);
        }
      });
    }
  }, [useLucide]);

  // If using fallback or explicitly requested Lucide
  if (useFallback || useLucide) {
    const LucideIcon = iconMap[name];

    if (!LucideIcon) {
      // Fallback to default icon if mapping not found
      const DefaultIcon = LucideIcons.HelpCircle;
      return (
        <DefaultIcon
          className={cn('inline-block', size, className)}
          size={size === 'text-2xl' ? 24 : size === 'text-lg' ? 20 : 16}
          {...props}
        />
      );
    }

    return (
      <LucideIcon
        className={cn('inline-block', size, className)}
        size={size === 'text-2xl' ? 24 : size === 'text-lg' ? 20 : 16}
        {...props}
      />
    );
  }

  // Use Material Symbols (primary)
  return (
    <span
      className={cn(
        'material-symbols-outlined',
        filled && 'icon-filled',
        size,
        className
      )}
      {...props}
    >
      {name}
    </span>
  );
};

Icon.displayName = 'Icon';
