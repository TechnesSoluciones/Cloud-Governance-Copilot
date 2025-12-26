/**
 * Layout Components
 *
 * Centralized exports for all layout-related components.
 * These components provide the structural foundation for the application's UI.
 */

// Legacy Layout Components (deprecated - use V2 components)
export { Sidebar } from './Sidebar';
export { TopNav } from './TopNav';

// CloudNexus V2 Layout Components (recommended)
export { SidebarV2 } from './SidebarV2';
export { HeaderV2 } from './HeaderV2';
export { DashboardLayoutV2 } from './DashboardLayoutV2';
export { DashboardLayoutWrapper } from './DashboardLayoutWrapper';

// Utility Components
export { PageWrapper } from './PageWrapper';
export type {
  PageWrapperProps,
  MaxWidthVariant,
  SpacingVariant,
} from './PageWrapper';
