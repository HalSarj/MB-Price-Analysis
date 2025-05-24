/**
 * DataManager.js
 * Centralized data management with clean separation of concerns
 */

import { DataLoader } from './DataLoader.js';
import { DataAggregator } from './DataAggregator.js';
import { COLUMN_MAP } from './ColumnMapper.js';

export class DataManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.rawData = [];
    this.processedData = null;
  }
  
  /**
   * Data file paths - using files from the data directory
   */
  static DATA_FILES = [
    'data/mortgage-data-2024.csv',
    'data/mortgage-data-2025.csv'
  ];
  
  /**
   * Load and process all data files
   */
  async loadAllData() {
    try {
      this.stateManager.setState('ui.loading', true);
      
      // Load data from CSV files
      this.rawData = await DataLoader.loadAllYears(DataManager.DATA_FILES);
      
      // Set raw data in state
      this.stateManager.setState('data.raw', this.rawData);
      
      // Set filtered data initially to all data
      this.stateManager.setState('data.filtered', this.rawData);
      
      // Determine date range from data
      this.setDateRangeFromData(this.rawData);
      
      // Aggregate data
      this.aggregateData(this.rawData);
      
      this.stateManager.setState('ui.loading', false);
      return this.rawData;
    } catch (error) {
      this.stateManager.setState('ui.loading', false);
      console.error('Error loading data:', error);
      throw error;
    }
  }
  
  /**
   * Set date range in state based on data
   * @param {Array} data - Raw data array
   */
  setDateRangeFromData(data) {
    if (!data || data.length === 0) return;
    
    // Extract dates from data
    const dates = data.map(record => new Date(record[COLUMN_MAP.documentDate]));
    
    // Find min and max dates
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    // Set date range in state
    this.stateManager.setState('filters.dateRange', [minDate, maxDate]);
  }
  
  /**
   * Aggregate data and store in state
   * @param {Array} data - Data to aggregate
   */
  aggregateData(data) {
    if (!data) return;
    
    const aggregatedData = DataAggregator.aggregateByPremiumBandAndMonth(data);
    this.stateManager.setState('data.aggregated', aggregatedData);
    
    return aggregatedData;
  }
  
  /**
   * Apply filters to data
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered data
   */
  applyFilters(filters) {
    const filteredData = this.filterData(this.rawData, filters);
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
    return data.filter(record => {
      // Date range filter
      if (filters.dateRange[0] && filters.dateRange[1]) {
        const recordDate = new Date(record[COLUMN_MAP.documentDate]);
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
        if (filters.ltvRange === 'below-80' && ltv >= 80) return false;
        if (filters.ltvRange === 'above-80' && ltv < 80) return false;
        if (filters.ltvRange === 'above-85' && ltv <= 85) return false;
        if (filters.ltvRange === 'above-90' && ltv <= 90) return false;
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
}
