/**
 * DataLoader.js
 * Handles loading and parsing CSV data files
 */

import { convertMarginBucketToBps } from './ColumnMapper.js';

export class DataLoader {
  /**
   * Load and parse a CSV file
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<Array>} Parsed CSV data
   */
  static async loadCSV(filePath) {
    try {
      const response = await fetch(filePath);
      
      if (!response.ok) {
        throw new Error(`Failed to load CSV file: ${filePath} (${response.status} ${response.statusText})`);
      }
      
      const csvText = await response.text();
      
      return new Promise((resolve) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors && results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }
            resolve(results.data);
          },
          error: (error) => {
            console.error('CSV parsing error:', error);
            resolve([]);
          }
        });
      });
    } catch (error) {
      console.error(`Error loading CSV file ${filePath}:`, error);
      return [];
    }
  }
  
  /**
   * Load all data files
   * @param {Array<string>} filePaths - Array of file paths to load
   * @returns {Promise<Array>} Combined and processed data
   */
  static async loadAllYears(filePaths) {
    try {
      const loadPromises = filePaths.map(file => this.loadCSV(file));
      const datasets = await Promise.all(loadPromises);
      
      return this.combineAndProcess(datasets);
    } catch (error) {
      console.error('Error loading all years:', error);
      throw error;
    }
  }
  
  /**
   * Combine and process multiple datasets
   * @param {Array<Array>} datasets - Array of datasets to combine
   * @returns {Array} Combined and processed data
   */
  static combineAndProcess(datasets) {
    // Flatten all datasets into a single array
    const combined = datasets.flat();
    
    // Process the combined data
    combined.forEach(record => {
      // Convert margin buckets to basis points
      if (record.GrossMarginBucket) {
        record.PremiumBand = convertMarginBucketToBps(record.GrossMarginBucket);
      }
      
      // Convert date strings to consistent format if needed
      if (record.DocumentDate) {
        const date = new Date(record.DocumentDate);
        if (!isNaN(date.getTime())) {
          record.DocumentDate = date.toISOString().split('T')[0];
        }
      }
      
      // Ensure numeric fields are properly typed
      this.ensureNumericFields(record);
    });
    
    // Sort by date
    return combined.sort((a, b) => new Date(a.DocumentDate) - new Date(b.DocumentDate));
  }
  
  /**
   * Ensure numeric fields are properly typed
   * @param {Object} record - Data record to process
   * @private
   */
  static ensureNumericFields(record) {
    const numericFields = ['LTV', 'Loan', 'InitialRate', 'SwapRate', 'GrossMargin'];
    
    numericFields.forEach(field => {
      if (record[field] !== undefined && record[field] !== null) {
        // If it's a string that represents a number, convert it
        if (typeof record[field] === 'string') {
          // Remove any non-numeric characters except decimal point
          const cleaned = record[field].replace(/[^\d.-]/g, '');
          record[field] = parseFloat(cleaned);
        }
      }
    });
  }
}
