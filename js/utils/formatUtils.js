/**
 * formatUtils.js
 * Utility functions for formatting values consistently across the application
 */

/**
 * Format currency values in millions of pounds with comma separators
 * @param {number} value - Value to format
 * @param {boolean} includeSymbol - Whether to include £ symbol
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, includeSymbol = true) {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  
  // Convert to millions
  const inMillions = value / 1000000;
  
  // Format with 2 decimal places and add commas for thousands
  const formatted = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(inMillions);
  
  // Add symbol if requested
  return includeSymbol ? `£${formatted}m` : `${formatted}m`;
}

/**
 * Format percentage values
 * @param {number} value - Value to format
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  
  return `${value.toFixed(2)}%`;
}

/**
 * Format a number with comma separators
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}
