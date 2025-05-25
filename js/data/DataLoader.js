/**
 * DataLoader.js
 * Handles loading and parsing CSV data files
 * 
 * This class provides methods for loading, parsing, and processing CSV data files.
 * It includes optimizations for memory usage and performance, as well as robust error handling.
 */

import { convertMarginBucketToBps } from './ColumnMapper.js';

/**
 * Logger class for consistent logging across the application
 * @private
 */
class Logger {
  static levels = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  };

  static log(level, message, data) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      console[level](`${prefix} ${message}`, data);
    } else {
      console[level](`${prefix} ${message}`);
    }
  }

  static error(message, data) {
    this.log(this.levels.ERROR, message, data);
  }

  static warn(message, data) {
    this.log(this.levels.WARN, message, data);
  }

  static info(message, data) {
    this.log(this.levels.INFO, message, data);
  }

  static debug(message, data) {
    this.log(this.levels.DEBUG, message, data);
  }
}

export class DataLoader {
  // Configuration options for CSV parsing
  static parseConfig = {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    // Chunk size for streaming large files (helps with memory usage)
    chunkSize: 500000, // Process 500KB at a time
    // Fields that should always be treated as strings (even if they look like numbers)
    keepAsString: ['Provider', 'Product_Name', 'Product_Description', 'First_Time_Buyer', 'Second_Time_Buyer', 'Remortgages']
  };

  /**
   * Load and parse a CSV file
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<Array>} Parsed CSV data
   */
  static async loadCSV(filePath) {
    Logger.info(`Loading CSV file: ${filePath}`);
    const startTime = performance.now();
    
    try {
      const response = await fetch(filePath);
      
      if (!response.ok) {
        throw new Error(`Failed to load CSV file: ${filePath} (${response.status} ${response.statusText})`);
      }
      
      const csvText = await response.text();
      Logger.info(`CSV file loaded: ${filePath} (${(csvText.length / 1024 / 1024).toFixed(2)} MB)`);      
      
      return new Promise((resolve) => {
        const parseConfig = {
          ...this.parseConfig,
          complete: (results) => {
            if (results.errors && results.errors.length > 0) {
              if (results.errors.some(e => e.type === 'Fatal')) {
                Logger.error('Fatal CSV parsing errors:', results.errors);
              } else {
                Logger.warn('CSV parsing warnings:', results.errors);
              }
            }
            
            const endTime = performance.now();
            Logger.info(`CSV parsing complete: ${results.data.length} records in ${((endTime - startTime) / 1000).toFixed(2)}s`);
            resolve(results.data);
          },
          error: (error) => {
            Logger.error('CSV parsing error:', error);
            resolve([]);
          }
        };
        
        Papa.parse(csvText, parseConfig);
      });
    } catch (error) {
      Logger.error(`Error loading CSV file ${filePath}:`, error);
      return [];
    }
  }
  
  /**
   * Load all data files
   * @param {Array<string>} filePaths - Array of file paths to load
   * @param {Object} options - Additional options for loading
   * @param {boolean} options.parallel - Whether to load files in parallel (default: true)
   * @param {boolean} options.progressCallback - Callback function for progress updates
   * @returns {Promise<Array>} Combined and processed data
   */
  static async loadAllYears(filePaths, options = {}) {
    const { parallel = true, progressCallback } = options;
    Logger.info(`Loading ${filePaths.length} data files, parallel: ${parallel}`);
    const startTime = performance.now();
    
    try {
      let datasets = [];
      
      if (parallel) {
        // Load all files in parallel
        const loadPromises = filePaths.map(file => this.loadCSV(file));
        datasets = await Promise.all(loadPromises);
      } else {
        // Load files sequentially to reduce memory pressure
        datasets = [];
        for (let i = 0; i < filePaths.length; i++) {
          if (progressCallback) {
            progressCallback({
              current: i,
              total: filePaths.length,
              file: filePaths[i],
              stage: 'loading'
            });
          }
          
          const data = await this.loadCSV(filePaths[i]);
          datasets.push(data);
        }
      }
      
      if (progressCallback) {
        progressCallback({
          current: filePaths.length,
          total: filePaths.length,
          stage: 'processing'
        });
      }
      
      const result = this.combineAndProcess(datasets);
      
      const endTime = performance.now();
      Logger.info(`All data loaded and processed in ${((endTime - startTime) / 1000).toFixed(2)}s`);
      
      return result;
    } catch (error) {
      Logger.error('Error loading all years:', error);
      throw error;
    }
  }
  
  /**
   * Combine and process multiple datasets
   * @param {Array<Array>} datasets - Array of datasets to combine
   * @param {Object} options - Processing options
   * @param {boolean} options.deduplicateRecords - Whether to remove duplicate records (default: false)
   * @param {boolean} options.validateData - Whether to validate data integrity (default: true)
   * @returns {Array} Combined and processed data
   */
  static combineAndProcess(datasets, options = {}) {
    const { deduplicateRecords = false, validateData = true } = options;
    const startTime = performance.now();
    Logger.info(`Combining ${datasets.length} datasets with ${datasets.reduce((sum, dataset) => sum + dataset.length, 0)} total records`);
    
    // Flatten all datasets into a single array using a more memory-efficient approach
    // This avoids creating intermediate arrays with .flat()
    const combined = [];
    for (const dataset of datasets) {
      for (const record of dataset) {
        combined.push(record);
      }
    }
    
    Logger.info(`Combined ${combined.length} records, processing...`);
    
    // Process the combined data
    let invalidRecords = 0;
    let processedRecords = 0;
    
    for (let i = 0; i < combined.length; i++) {
      const record = combined[i];
      
      // Skip invalid records if validation is enabled
      if (validateData && !this.isValidRecord(record)) {
        invalidRecords++;
        continue;
      }
      
      // Convert margin buckets to basis points
      if (record.GrossMarginBucket) {
        try {
          record.PremiumBand = convertMarginBucketToBps(record.GrossMarginBucket);
        } catch (error) {
          Logger.warn(`Failed to convert margin bucket for record ${i}:`, { error, record });
        }
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
      
      processedRecords++;
    }
    
    // Remove invalid records if any were found during processing
    if (invalidRecords > 0) {
      Logger.warn(`Removed ${invalidRecords} invalid records`);
    }
    
    // Deduplicate records if enabled
    let finalRecords = combined;
    if (deduplicateRecords) {
      const beforeCount = finalRecords.length;
      finalRecords = this.deduplicateRecords(finalRecords);
      Logger.info(`Deduplicated ${beforeCount - finalRecords.length} records`);
    }
    
    // Sort by date
    finalRecords.sort((a, b) => new Date(a.DocumentDate) - new Date(b.DocumentDate));
    
    const endTime = performance.now();
    Logger.info(`Processing complete: ${finalRecords.length} records in ${((endTime - startTime) / 1000).toFixed(2)}s`);
    
    return finalRecords;
  }
  
  /**
   * Ensure numeric fields are properly typed
   * @param {Object} record - Data record to process
   * @private
   */
  static ensureNumericFields(record) {
    const numericFields = ['LTV', 'Loan', 'InitialRate', 'SwapRate', 'GrossMargin', 'Flat_Fees', 'Percentage_fees'];
    
    numericFields.forEach(field => {
      if (record[field] !== undefined && record[field] !== null) {
        // If it's a string that represents a number, convert it
        if (typeof record[field] === 'string') {
          // Remove any non-numeric characters except decimal point
          const cleaned = record[field].replace(/[^\d.-]/g, '');
          const parsedValue = parseFloat(cleaned);
          
          // Only assign if it's a valid number
          if (!isNaN(parsedValue)) {
            record[field] = parsedValue;
          }
        }
      }
    });
  }
  
  /**
   * Check if a record is valid
   * @param {Object} record - Data record to validate
   * @returns {boolean} Whether the record is valid
   * @private
   */
  static isValidRecord(record) {
    // Debug: Log a sample record to understand structure
    if (!this._hasLoggedSample) {
      Logger.debug('Sample record structure:', record);
      this._hasLoggedSample = true;
    }
    
    // Check if record is an object
    if (!record || typeof record !== 'object') {
      return false;
    }
    
    // Less strict validation - require at least one of these fields
    const possibleIdentifiers = ['Provider', 'Product_Name', 'Mortgage_Type', 'Rate', 'DocumentDate', 'Timestamp', 'BaseLender'];
    let hasAtLeastOneField = false;
    
    for (const field of possibleIdentifiers) {
      if (record[field] !== undefined && record[field] !== null && record[field] !== '') {
        hasAtLeastOneField = true;
        break;
      }
    }
    
    return hasAtLeastOneField;
  }
  
  /**
   * Remove duplicate records from a dataset
   * @param {Array} records - Array of records to deduplicate
   * @returns {Array} Deduplicated records
   * @private
   */
  static deduplicateRecords(records) {
    // Create a Map to track unique records by a composite key
    const uniqueRecords = new Map();
    
    // Fields to use for generating a unique key
    const keyFields = ['Provider', 'Product_Name', 'Rate', 'DocumentDate'];
    
    for (const record of records) {
      // Generate a unique key for this record
      const key = keyFields.map(field => record[field]).join('|');
      
      // Only keep the record if we haven't seen this key before
      if (!uniqueRecords.has(key)) {
        uniqueRecords.set(key, record);
      }
    }
    
    // Convert the Map values back to an array
    return Array.from(uniqueRecords.values());
  }
  
  /**
   * Stream process a large CSV file to reduce memory usage
   * @param {string} filePath - Path to CSV file
   * @param {Function} processChunk - Function to process each chunk of data
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Processed data
   */
  static async streamProcess(filePath, processChunk, options = {}) {
    Logger.info(`Stream processing file: ${filePath}`);
    const startTime = performance.now();
    
    try {
      const response = await fetch(filePath);
      
      if (!response.ok) {
        throw new Error(`Failed to load CSV file: ${filePath} (${response.status} ${response.statusText})`);
      }
      
      const csvText = await response.text();
      Logger.info(`CSV file loaded: ${filePath} (${(csvText.length / 1024 / 1024).toFixed(2)} MB)`);      
      
      return new Promise((resolve) => {
        const results = [];
        let rowCount = 0;
        
        const parseConfig = {
          ...this.parseConfig,
          chunk: async (chunk, parser) => {
            rowCount += chunk.data.length;
            Logger.debug(`Processing chunk: ${chunk.data.length} rows (total: ${rowCount})`);            
            
            try {
              // Process this chunk of data
              const processedChunk = await processChunk(chunk.data);
              
              // Add processed results to our collection
              if (Array.isArray(processedChunk)) {
                results.push(...processedChunk);
              }
            } catch (error) {
              Logger.error('Error processing chunk:', error);
            }
          },
          complete: () => {
            const endTime = performance.now();
            Logger.info(`Stream processing complete: ${rowCount} rows in ${((endTime - startTime) / 1000).toFixed(2)}s`);
            resolve(results);
          },
          error: (error) => {
            Logger.error('CSV parsing error during streaming:', error);
            resolve(results);
          }
        };
        
        Papa.parse(csvText, parseConfig);
      });
    } catch (error) {
      Logger.error(`Error stream processing CSV file ${filePath}:`, error);
      return [];
    }
  }
}
