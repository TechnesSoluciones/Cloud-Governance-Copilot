/**
 * CSV Export Utility
 *
 * Provides functions to export data to CSV format and trigger browser download
 * Handles special characters, escaping, and proper CSV formatting
 */

import { Resource } from '@/types/resources';

/**
 * Escape CSV value
 *
 * Properly escapes values for CSV format:
 * - Wraps in quotes if contains comma, quote, or newline
 * - Doubles internal quotes
 * - Handles null/undefined values
 *
 * @param value - Value to escape
 * @returns Escaped CSV value
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Check if value needs to be quoted
  const needsQuotes =
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r');

  if (needsQuotes) {
    // Double internal quotes and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert array of objects to CSV string
 *
 * @param data - Array of objects to convert
 * @param headers - Array of header objects with key and label
 * @returns CSV string
 */
function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  headers: Array<{ key: keyof T; label: string }>
): string {
  if (data.length === 0) {
    return headers.map((h) => escapeCSVValue(h.label)).join(',');
  }

  // Create header row
  const headerRow = headers.map((h) => escapeCSVValue(h.label)).join(',');

  // Create data rows
  const dataRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header.key];
        return escapeCSVValue(value);
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Trigger browser download of CSV file
 *
 * Creates a Blob with CSV data and triggers download using browser APIs
 * Handles cleanup of created object URLs
 *
 * @param csvContent - CSV string content
 * @param filename - Filename for download (without .csv extension)
 */
function downloadCSV(csvContent: string, filename: string): void {
  // Create Blob with UTF-8 BOM for proper Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  // Append to body, click, and cleanup
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup object URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Export Azure resources to CSV file
 *
 * Exports resources with all visible columns to a CSV file
 * Includes: Name, Type, Location, Resource Group, Tags
 *
 * @param resources - Array of resources to export
 * @param filename - Optional custom filename (defaults to timestamped name)
 *
 * @example
 * ```tsx
 * const handleExport = () => {
 *   exportResourcesToCSV(resources, 'azure-resources-export');
 * };
 * ```
 */
export function exportResourcesToCSV(
  resources: Resource[],
  filename?: string
): void {
  if (resources.length === 0) {
    console.warn('No resources to export');
    return;
  }

  // Transform resources to include formatted tags
  const dataForExport = resources.map((resource) => ({
    name: resource.name,
    type: resource.type,
    location: resource.location,
    resourceGroup: resource.resourceGroup,
    tags: formatTagsForCSV(resource.tags),
  }));

  // Define columns to export (based on transformed data)
  type ExportRow = typeof dataForExport[0];
  const headers: Array<{ key: keyof ExportRow; label: string }> = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'location', label: 'Location' },
    { key: 'resourceGroup', label: 'Resource Group' },
    { key: 'tags', label: 'Tags' },
  ];

  // Generate CSV content
  const csvContent = arrayToCSV(dataForExport, headers);

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `azure-resources-${timestamp}`;

  // Trigger download
  downloadCSV(csvContent, finalFilename);
}

/**
 * Format tags object for CSV export
 *
 * Converts tags object to a readable string format
 * Example: { env: "prod", team: "backend" } -> "env=prod; team=backend"
 *
 * @param tags - Tags object
 * @returns Formatted tags string
 */
function formatTagsForCSV(tags: Record<string, string>): string {
  if (!tags || Object.keys(tags).length === 0) {
    return '';
  }

  return Object.entries(tags)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

/**
 * Export generic data to CSV
 *
 * Generic function to export any array of objects to CSV
 * Useful for exporting custom data structures
 *
 * @param data - Array of objects to export
 * @param headers - Column definitions with keys and labels
 * @param filename - Filename for download
 *
 * @example
 * ```tsx
 * exportToCSV(
 *   users,
 *   [
 *     { key: 'name', label: 'Full Name' },
 *     { key: 'email', label: 'Email Address' },
 *   ],
 *   'users-export'
 * );
 * ```
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  headers: Array<{ key: keyof T; label: string }>,
  filename: string
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const csvContent = arrayToCSV(data, headers);
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = `${filename}-${timestamp}`;

  downloadCSV(csvContent, finalFilename);
}

/**
 * Get formatted timestamp for filename
 *
 * @returns ISO date string (YYYY-MM-DD)
 */
export function getTimestampForFilename(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if browser supports CSV download
 *
 * @returns true if browser supports Blob and download attribute
 */
export function supportsCSVDownload(): boolean {
  return typeof Blob !== 'undefined' && typeof document !== 'undefined';
}
