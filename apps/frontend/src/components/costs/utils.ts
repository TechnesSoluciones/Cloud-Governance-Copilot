/**
 * Cost Utility Functions
 *
 * Helper functions for formatting and manipulating cost data.
 */

/**
 * Format a number as currency
 * @param amount - The numeric amount to format
 * @param currency - Currency code (default: "USD")
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  decimals: number = 2
): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `$${amount.toFixed(decimals)}`;
  }
};

/**
 * Format a number as percentage
 * @param value - The numeric value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "45.2%")
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format a date string for display
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @param format - Format type ('short' | 'long')
 * @returns Formatted date string
 */
export const formatDate = (
  dateString: string,
  format: 'short' | 'long' = 'short'
): string => {
  try {
    const date = new Date(dateString);
    if (format === 'long') {
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    return dateString;
  }
};

/**
 * Get provider color based on design system
 * @param provider - Cloud provider name
 * @returns Hex color code
 */
export const getProviderColor = (provider: 'AWS' | 'Azure'): string => {
  const colors = {
    AWS: '#0078d4', // secondary-blue
    Azure: '#50e6ff', // secondary-blue-light
  };
  return colors[provider] || '#9e9e9e';
};

/**
 * Get provider badge variant
 * @param provider - Cloud provider name
 * @returns Badge variant class names
 */
export const getProviderBadgeClasses = (provider: 'AWS' | 'Azure'): string => {
  const variants = {
    AWS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    Azure: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  };
  return variants[provider] || 'bg-gray-100 text-gray-800';
};
