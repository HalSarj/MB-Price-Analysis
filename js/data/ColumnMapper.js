/**
 * ColumnMapper.js
 * Standardized column mapping and data conversion utilities
 */

/**
 * Column mapping from standardized fields to actual CSV column names
 */
export const COLUMN_MAP = {
  // Core fields
  documentDate: 'DocumentDate',
  lender: 'BaseLender', 
  loanAmount: 'Loan',
  ltv: 'LTV',
  tieInPeriod: 'Term',
  initialRate: 'InitialRate',
  purchaseType: 'PurchaseType',
  term: 'Term',
  
  // Analysis fields
  ltvBucket: 'LTV_Buckets',
  swapRate: 'SwapRate',
  grossMargin: 'GrossMargin',
  grossMarginBucket: 'GrossMarginBucket',
  
  // Additional fields
  productName: 'Product_Name',
  channel: 'Channel',
  productDescription: 'Product_Description',
  firstTimeBuyer: 'First_Time_Buyer',
  secondTimeBuyer: 'Second_Time_Buyer',
  remortgages: 'Remortgages',
  productFeeNotes: 'Product_Fee_Notes',
  flatFees: 'Flat_Fees',
  percentageFees: 'Percentage_fees',
  incentives: 'Incentives',
  redemption: 'Redemption',
  revertRate: 'Revert_Rate'
};

/**
 * Convert decimal margin buckets to basis points
 * @param {string} bucketString - Margin bucket string (e.g., "0.4-0.6")
 * @returns {string} Basis points representation (e.g., "40-60")
 */
export function convertMarginBucketToBps(bucketString) {
  if (!bucketString || typeof bucketString !== 'string') {
    return 'Unknown';
  }
  
  try {
    const parts = bucketString.split('-');
    if (parts.length !== 2) {
      return bucketString; // Return original if not in expected format
    }
    
    const min = parseFloat(parts[0]);
    const max = parseFloat(parts[1]);
    
    if (isNaN(min) || isNaN(max)) {
      return bucketString; // Return original if parsing fails
    }
    
    // Convert both positive and negative values to basis points
    const minBps = Math.round(min * 100);
    const maxBps = Math.round(max * 100);
    
    // Format as basis points range
    return `${minBps}-${maxBps}`;
  } catch (error) {
    console.error('Error converting margin bucket to BPS:', error);
    return bucketString; // Return original on error
  }
}

/**
 * Format currency value
 * @param {number} value - Value to format
 * @param {boolean} inMillions - Whether to display in millions
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, inMillions = false) {
  if (value === null || value === undefined) {
    return '£0.00';
  }
  
  try {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return '£0.00';
    }
    
    if (inMillions) {
      return `£${(numValue / 1000000).toFixed(2)}m`;
    } else {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
      }).format(numValue);
    }
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '£0.00';
  }
}

/**
 * Format percentage value
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) {
    return '0.0%';
  }
  
  try {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return '0.0%';
    }
    
    return `${numValue.toFixed(decimals)}%`;
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return '0.0%';
  }
}

/**
 * Format date value
 * @param {string|Date} date - Date to format
 * @param {string} format - Format style ('short', 'medium', 'long')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'medium') {
  if (!date) {
    return '';
  }
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'numeric', 
          year: '2-digit' 
        });
      case 'long':
        return dateObj.toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
      case 'month':
        return dateObj.toLocaleDateString('en-GB', { 
          month: 'short', 
          year: 'numeric' 
        });
      default: // medium
        return dateObj.toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}
