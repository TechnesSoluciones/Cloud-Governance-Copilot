/**
 * Resources Components Barrel Export
 *
 * Centralized exports for all Azure resource-related components
 * Simplifies imports across the application
 *
 * @example
 * ```tsx
 * import {
 *   ResourceTable,
 *   ResourceFilters,
 *   ResourceDetailModal
 * } from '@/components/resources';
 * ```
 */

export { ResourceTable } from './ResourceTable';
export type { ResourceTableProps } from './ResourceTable';

export { ResourceFilters } from './ResourceFilters';
export type { ResourceFiltersProps } from './ResourceFilters';

export { ResourceDetailModal } from './ResourceDetailModal';
export type { ResourceDetailModalProps } from './ResourceDetailModal';
