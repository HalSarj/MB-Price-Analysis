/**
 * FilterManager.js
 * Manages data filtering and filter state
 */

import { COLUMN_MAP } from '../data/ColumnMapper.js';

export class FilterManager {
  /**
   * Create a new FilterManager instance
   * @param {Object} stateManager - StateManager instance
   * @param {Object} dataManager - DataManager instance
   */
  constructor(stateManager, dataManager) {
    this.stateManager = stateManager;
    this.dataManager = dataManager;
    
    // Subscribe to filter changes
    this.stateManager.subscribe('filters', () => this.onFiltersChanged());
  }
  
  /**
   * Handle filter changes
   * @private
   */
  onFiltersChanged() {
    const filters = this.stateManager.state.filters;
    this.applyFilters(filters);
  }
  
  /**
   * Apply filters to data
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered data
   */
  applyFilters(filters) {
    const filteredData = this.filterData(this.stateManager.state.data.raw, filters);
    this.stateManager.setState('data.filtered', filteredData);
    
    // Re-aggregate with filtered data
    this.dataManager.aggregateData(filteredData);
    
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
    if (!data) return [];
    
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
        if (isNaN(ltv)) return false;
        
        if (filters.ltvRange === 'below-80' && ltv >= 80) return false;
        if (filters.ltvRange === 'above-80' && ltv < 80) return false;
        if (filters.ltvRange === 'above-85' && ltv <= 85) return false;
        if (filters.ltvRange === 'above-90' && ltv <= 90) return false;
      }
      
      return true;
    });
  }
  
  /**
   * Update a specific filter
   * @param {string} filterName - Name of the filter to update
   * @param {any} value - New filter value
   */
  updateFilter(filterName, value) {
    this.stateManager.setState(`filters.${filterName}`, value);
  }
  
  /**
   * Reset all filters to default values
   */
  resetFilters() {
    this.stateManager.resetState('filters');
  }
  
  /**
   * Get available filter options
   * @returns {Object} Filter options
   */
  getFilterOptions() {
    const data = this.stateManager.state.data.raw;
    if (!data) return {};
    
    return {
      lenders: [...new Set(data.map(r => r[COLUMN_MAP.lender]))].filter(Boolean).sort(),
      ltvRanges: [
        { value: 'all', label: 'All LTV' },
        { value: 'below-80', label: 'Below 80%' },
        { value: 'above-80', label: '80% and above' },
        { value: 'above-85', label: '85% and above' },
        { value: 'above-90', label: '90% and above' }
      ],
      dateRange: {
        min: new Date(Math.min(...data.map(r => new Date(r[COLUMN_MAP.documentDate])))),
        max: new Date(Math.max(...data.map(r => new Date(r[COLUMN_MAP.documentDate]))))
      }
    };
  }
}
