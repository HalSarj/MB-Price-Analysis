/**
 * DataManager.js
 * Centralized data management with clean separation of concerns
 *
 * This class manages all data operations including loading, processing, and filtering.
 * It serves as the central point for data access throughout the application.
 */

import { DataLoader } from './DataLoader.js';
import { DataAggregator } from './DataAggregator.js';
import { COLUMN_MAP, convertMarginBucketToBps } from './ColumnMapper.js';
import { sortPremiumBands, standardizePremiumBand } from '../utils/sortUtils.js';

export class DataManager {
  /**
   * Create a new DataManager instance
   * @param {StateManager} stateManager - The application state manager
   */
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.rawData = [];
    this.processedData = null;
    this.isLoading = false;
    this.lastUpdated = null;
  }
  
  /**
   * Data file paths - using files from the data directory
   * These can be updated as new data files become available
   */
  static DATA_FILES = [
    'data/mortgage-data-2024.csv',
    'data/mortgage-data-2025.csv'
  ];
  
  /**
   * Load and process all data files
   * @param {Object} options - Loading options
   * @param {boolean} options.forceReload - Force reload even if data is already loaded
   * @param {Function} options.progressCallback - Callback for loading progress updates
   * @returns {Promise<Array>} Raw data array
   */
  async loadAllData(options = {}) {
    const { forceReload = false, progressCallback } = options;
    
    // Skip loading if already loaded and not forced to reload
    if (this.rawData.length > 0 && !forceReload) {
      console.info('Using cached data. Set forceReload=true to reload from source.');
      return this.rawData;
    }
    
    try {
      this.isLoading = true;
      this.stateManager.setState('ui.loading', true);
      
      // Filter out non-existent files
      const filesToLoad = [];
      for (const file of DataManager.DATA_FILES) {
        try {
          const response = await fetch(file, { method: 'HEAD' });
          if (response.ok) {
            filesToLoad.push(file);
            console.info(`Found data file: ${file}`);
          } else {
            console.warn(`File not found: ${file}`);
          }
        } catch (e) {
          console.warn(`Error checking file ${file}:`, e);
        }
      }
      
      if (filesToLoad.length === 0) {
        throw new Error('No valid data files found to load');
      }
      
      console.info(`Loading ${filesToLoad.length} data files: ${filesToLoad.join(', ')}`);
      
      // Load data from CSV files
      this.rawData = await DataLoader.loadAllYears(filesToLoad, {
        progressCallback,
        parallel: true
      });
      
      console.info(`Loaded ${this.rawData.length} records from ${filesToLoad.length} files`);
      
      // Process data
      this.processData();
      
      // Update last loaded timestamp
      this.lastUpdated = new Date();
      
      this.stateManager.setState('ui.loading', false);
      this.isLoading = false;
      
      return this.rawData;
    } catch (error) {
      this.stateManager.setState('ui.loading', false);
      this.isLoading = false;
      console.error('Error loading data:', error);
      throw error;
    }
  }
  
  /**
   * Process raw data and update state
   * @private
   */
  processData() {
    if (!this.rawData || this.rawData.length === 0) return;
    
    // Ensure all records have PremiumBand field and valid dates
    this.rawData.forEach(record => {
      // Add PremiumBand if missing
      if (record.GrossMarginBucket && !record.PremiumBand) {
        record.PremiumBand = convertMarginBucketToBps(record.GrossMarginBucket);
      }
      
      // Standardize premium band format (convert decimal to basis points)
      if (record.PremiumBand) {
        record.PremiumBand = standardizePremiumBand(record.PremiumBand);
      }
      
      // Validate and normalize date format
      const dateField = record[COLUMN_MAP.documentDate];
      if (dateField) {
        let parsedDate;
        
        // Handle different date formats
        if (typeof dateField === 'string') {
          if (dateField.includes('-')) {
            // YYYY-MM-DD format
            parsedDate = new Date(dateField);
          } else if (dateField.includes('/')) {
            // DD/MM/YYYY or MM/DD/YYYY format
            const parts = dateField.split('/');
            if (parts.length === 3) {
              // Try DD/MM/YYYY format first
              parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              if (isNaN(parsedDate.getTime())) {
                // Try MM/DD/YYYY format if DD/MM/YYYY failed
                parsedDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
              }
            }
          } else {
            // Try standard parsing
            parsedDate = new Date(dateField);
          }
        } else if (typeof dateField === 'number') { // e.g., timestamp
          parsedDate = new Date(dateField);
        } else if (dateField instanceof Date) { // Already a Date object
          parsedDate = dateField; // No change needed
        } else {
          // If it's some other type or unparseable, make it an invalid date
          parsedDate = new Date(NaN); 
        }

        // Store the Date object (or an Invalid Date if parsing failed)
        record[COLUMN_MAP.documentDate] = parsedDate;
      }
    });
    
    // Log a sample of records to verify date processing
    console.info('Sample of processed records:', this.rawData.slice(0, 5).map(r => ({
      date: r[COLUMN_MAP.documentDate],
      band: r.PremiumBand,
      amount: r[COLUMN_MAP.loanAmount]
    })));
    
    // Count records by year to verify data distribution
    const yearCounts = {};
    this.rawData.forEach(record => {
      const dateField = record[COLUMN_MAP.documentDate];
      if (dateField) {
        const year = new Date(dateField).getFullYear();
        if (!isNaN(year)) {
          yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
      }
    });
    console.info('Records by year:', yearCounts);
    
    // Set raw data in state
    this.stateManager.setState('data.raw', this.rawData);
    
    // Set filtered data initially to all data
    this.stateManager.setState('data.filtered', this.rawData);
    
    // Determine date range from data
    this.setDateRangeFromData(this.rawData);
    
    // Aggregate data
    this.aggregateData(this.rawData);
    
    // Extract and set available premium bands
    const premiumBands = [...new Set(this.rawData
      .map(record => record.PremiumBand)
      .filter(Boolean))]
      .sort((a, b) => {
        const aNum = parseInt(a.split('-')[0]);
        const bNum = parseInt(b.split('-')[0]);
        return aNum - bNum;
      });
    
    this.stateManager.setState('data.availablePremiumBands', premiumBands);
  }
  
  /**
   * Set date range in state based on data
   * @param {Array} data - Raw data array
   */
  setDateRangeFromData(data) {
    if (!data || data.length === 0) return;
    
    // Initialize with the first date
    let minTimestamp = Infinity;
    let maxTimestamp = -Infinity;
    
    // Iterate through the data to find min and max dates
    // This is more efficient than using Math.min/max with spread for large datasets
    for (const record of data) {
      const dateField = record[COLUMN_MAP.documentDate];
      if (!dateField) continue;
      
      const timestamp = new Date(dateField).getTime();
      if (!isNaN(timestamp)) {
        if (timestamp < minTimestamp) minTimestamp = timestamp;
        if (timestamp > maxTimestamp) maxTimestamp = timestamp;
      }
    }
    
    // Create Date objects from the timestamps
    const minDate = new Date(minTimestamp);
    const maxDate = new Date(maxTimestamp);
    
    // Set date range in state (only if valid dates were found)
    if (isFinite(minTimestamp) && isFinite(maxTimestamp)) {
      this.stateManager.setState('filters.dateRange', [minDate, maxDate]);
    }
  }
  
  /**
   * Aggregate data and store in state
   * @param {Array} data - Data to aggregate
   * @param {Object} options - Aggregation options
   * @returns {Object} Aggregated data
   */
  aggregateData(data, options = {}) {
    if (!data) {
      console.warn('No data provided to aggregateData. Using rawData from state.');
      data = this.stateManager.state.data.raw || [];
    }
    
    if (data.length === 0) {
      console.warn('Data for aggregation is empty.');
      this.stateManager.setState('data.aggregated', null); // Clear aggregated data
      return null;
    }
    
    // Retrieve current dateRange filter from state
    const currentFilters = this.stateManager.state.filters;
    const filterDateRange = currentFilters && currentFilters.dateRange ? currentFilters.dateRange : null;

    console.debug('[DataManager] Aggregating data with filterDateRange:', filterDateRange);

    // Merge existing options with the filterDateRange
    const aggregationOptions = {
      ...options,
      sampleSize: options.sampleSize !== undefined ? options.sampleSize : 0, // Default to 0 (all data) if not specified
      filterDateRange // Pass the date range from filters
    };
    
    // Log aggregation start
    console.info(`Starting data aggregation with ${data.length} records`);
    const startTime = performance.now();
    
    // Perform aggregation
    const aggregatedData = DataAggregator.aggregateByPremiumBandAndMonth(data, aggregationOptions);
    
    // Update state
    this.stateManager.setState('data.aggregated', aggregatedData);
    
    // Log performance
    const endTime = performance.now();
    console.info(`Data aggregation completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return aggregatedData;
  }
  
  /**
   * Apply filters to data
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered data
   */
  applyFilters(filters) {
    // Ensure processedData is available, otherwise use rawData
    const dataToFilter = this.processedData || this.rawData;
    if (!dataToFilter || dataToFilter.length === 0) {
      // console.warn('No data available to apply filters.'); // Avoid excessive warning
      return [];
    }
    
    // Log the filters being applied
    const loggableFilters = {};
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (key === 'dateRange' && Array.isArray(filters[key]) && filters[key].length === 2) {
          loggableFilters[key] = [
            filters[key][0] instanceof Date ? filters[key][0].toISOString() : String(filters[key][0]),
            filters[key][1] instanceof Date ? filters[key][1].toISOString() : String(filters[key][1])
          ];
        } else {
          loggableFilters[key] = filters[key];
        }
      });
    }
    console.debug('[DataManager.applyFilters] Applying filters:', JSON.stringify(loggableFilters));

    const filteredData = this.filterData(dataToFilter, filters);
    this.stateManager.setState('data.filtered', filteredData);
    
    // Re-aggregate with filtered data
    this.aggregateData(filteredData);
    
    return filteredData;
  }
  
  /**
   * Filter data based on criteria
   * @param {Array} data - Data to filter
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered data
   * @private
   */
  filterData(data, filters) {
    if (!data || !filters) return data || [];
    
    return data.filter(record => {
      // Always filter out Unknown and -0.4--0.2 premium bands
      if (record.PremiumBand === 'Unknown' || record.PremiumBand === '-0.4--0.2') return false;
      
      // Date range filter
      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        const recordDate = record[COLUMN_MAP.documentDate]; // This is now a Date object (or Invalid Date)
        // Check if recordDate is a valid Date object
        if (!(recordDate instanceof Date) || isNaN(recordDate.getTime())) {
          return false; // Skip if record date is invalid or not a Date object
        }
        if (recordDate < filters.dateRange[0] || recordDate > filters.dateRange[1]) {
          return false;
        }
      }
      
      // Lender filter
      if (filters.lenders && filters.lenders.length > 0) {
        if (!filters.lenders.includes(record[COLUMN_MAP.lender])) {
          return false;
        }
      }
      
      // LTV filter
      if (filters.ltvRange && filters.ltvRange !== 'all') {
        const ltv = parseFloat(record[COLUMN_MAP.ltv]);
        if (isNaN(ltv)) return false;
        
        if (filters.ltvRange === 'below-80' && ltv >= 80) return false;
        if (filters.ltvRange === 'above-80' && ltv < 80) return false;
        if (filters.ltvRange === 'above-85' && ltv <= 85) return false;
        if (filters.ltvRange === 'above-90' && ltv <= 90) return false;
      }
      
      // Premium band filter
      if (filters.premiumBands && filters.premiumBands.length > 0) {
        if (!record.PremiumBand || !filters.premiumBands.includes(record.PremiumBand)) {
          return false;
        }
      }
      
      // Purchase type filter
      if (filters.purchaseTypes && filters.purchaseTypes.length > 0) {
        if (!filters.purchaseTypes.includes(record[COLUMN_MAP.purchaseType])) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Get unique values for a specific column
   * @param {string} columnKey - Column key from COLUMN_MAP
   * @returns {Array} Array of unique values
   */
  getUniqueValues(columnKey) {
    if (!this.rawData || !COLUMN_MAP[columnKey]) return [];
    
    const columnName = COLUMN_MAP[columnKey];
    const uniqueValues = [...new Set(this.rawData.map(record => record[columnName]))];
    
    return uniqueValues.filter(Boolean).sort();
  }
  
  /**
   * Get data statistics
   * @returns {Object} Data statistics
   */
  getDataStats() {
    if (!this.rawData || this.rawData.length === 0) {
      return {
        recordCount: 0,
        lenderCount: 0,
        dateRange: [null, null],
        lastUpdated: null
      };
    }
    
    const lenders = this.getUniqueValues('lender');
    const dates = this.rawData.map(record => new Date(record[COLUMN_MAP.documentDate]));
    
    return {
      recordCount: this.rawData.length,
      lenderCount: lenders.length,
      dateRange: [
        new Date(Math.min(...dates)),
        new Date(Math.max(...dates))
      ],
      lastUpdated: this.lastUpdated
    };
  }
  
  /**
   * Reload data from source
   * @param {Function} progressCallback - Callback for loading progress updates
   * @returns {Promise<Array>} Raw data array
   */
  async reloadData(progressCallback) {
    return this.loadAllData({ forceReload: true, progressCallback });
  }
  
  /**
   * Calculate weighted averages for metrics by premium band
   * @param {Array} data - Data to analyze
   * @param {Object} options - Calculation options
   * @param {Array} options.metrics - Metrics to calculate (default: ['ltv', 'rate', 'term'])
   * @param {boolean} options.includeMonthly - Whether to include monthly breakdowns
   * @returns {Object} Weighted averages by premium band
   */
  calculateWeightedAverages(data, options = {}) {
    if (!data || data.length === 0) return null;
    
    // Log calculation start
    console.info(`Starting weighted average calculation for ${options.metrics?.join(', ') || 'default metrics'}`);
    const startTime = performance.now();
    
    // Perform calculation
    const weightedAverages = DataAggregator.calculateWeightedAverages(data, options);
    
    // Update state
    this.stateManager.setState('data.weightedAverages', weightedAverages);
    
    // Log performance
    const endTime = performance.now();
    console.info(`Weighted average calculation completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return weightedAverages;
  }
}
