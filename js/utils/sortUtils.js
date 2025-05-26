/**
 * sortUtils.js
 * Utility functions for sorting and standardizing data consistently across the application
 */

/**
 * Parse a premium band range string into min and max values
 * @param {string} rangeStr - Range string (e.g., "0-20", "-0.4--0.2", "1040-1060")
 * @returns {Object} Object with min and max values
 */
export function parsePremiumBandRange(rangeStr) {
  if (!rangeStr) return { min: NaN, max: NaN };
  
  // Match patterns like "0-20", "-0.4--0.2", "1040-1060"
  const match = String(rangeStr).match(/^(-?\d*\.?\d+)(?:-(-?\d*\.?\d+))?/);
  if (!match) return { min: NaN, max: NaN };
  
  const min = parseFloat(match[1]);
  const max = match[2] ? parseFloat(match[2]) : NaN;
  return { min, max };
}

/**
 * Compare function for sorting premium bands
 * @param {string} a - First premium band
 * @param {string} b - Second premium band
 * @returns {number} Comparison result (-1, 0, 1)
 */
export function comparePremiumBands(a, b) {
  const rangeA = parsePremiumBandRange(a);
  const rangeB = parsePremiumBandRange(b);
  
  // If both are NaN, maintain original order
  if (isNaN(rangeA.min) && isNaN(rangeB.min)) return 0;
  if (isNaN(rangeA.min)) return -1;
  if (isNaN(rangeB.min)) return 1;
  
  // Compare by the minimum values of the ranges
  return rangeA.min - rangeB.min;
}

/**
 * Sort an array of premium bands
 * @param {Array<string>} bands - Array of premium band strings
 * @returns {Array<string>} Sorted array
 */
export function sortPremiumBands(bands) {
  return [...bands].sort(comparePremiumBands);
}

/**
 * Standardize premium band format to ensure consistent display
 * Converts decimal ranges to basis points (e.g., "-0.2-0.0" to "-20-0")
 * @param {string} band - Premium band string
 * @returns {string} Standardized premium band
 */
export function standardizePremiumBand(band) {
  if (!band || band === 'Unknown') return band;
  
  try {
    // Special case for the problematic "-0.2-0.0" band
    if (band === '-0.2-0.0') {
      return '-20-0';
    }
    
    // Check if the band is in a format we can process
    if (band.includes('-')) {
      const parts = band.split('-');
      if (parts.length === 2) {
        // Try to parse as numbers
        const min = parseFloat(parts[0]);
        const max = parseFloat(parts[1]);
        
        if (!isNaN(min) && !isNaN(max)) {
          // More robust detection of decimal format bands
          // Check if either value is between -1 and 1 (exclusive of -1 and 1)
          // and has a decimal representation
          if ((min > -1 && min < 1) || (max > -1 && max < 1)) {
            // Check if the original strings have decimal points or are very small numbers
            const minStr = parts[0].trim();
            const maxStr = parts[1].trim();
            
            if (minStr.includes('.') || maxStr.includes('.') || 
                (min !== 0 && Math.abs(min) < 1) || 
                (max !== 0 && Math.abs(max) < 1)) {
              // Convert to basis points
              const minBps = Math.round(min * 100);
              const maxBps = Math.round(max * 100);
              return `${minBps}-${maxBps}`;
            }
          }
        }
      }
    }
    
    return band; // Return original if already in basis points or not in expected format
  } catch (error) {
    console.error('Error standardizing premium band:', error);
    return band; // Return original on error
  }
}
