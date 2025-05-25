/**
 * FilterManager.js
 * Manages data filtering and filter state
 *
 * This class provides centralized filter management with support for multiple filter types
 * and efficient application of filters to the dataset.
 */

import { COLUMN_MAP, formatDate } from '../data/ColumnMapper.js';

export class FilterManager {
  /**
   * Create a new FilterManager instance
   * @param {Object} stateManager - StateManager instance
   * @param {Object} dataManager - DataManager instance
   */
  constructor(stateManager, dataManager) {
    this.stateManager = stateManager;
    this.dataManager = dataManager;
    this.activeFilters = new Set();
    this.lastFilterTime = 0;
    this._gettingFilterOptions = false;
    
    // Subscribe to filter changes
    this.stateManager.subscribe('filters', () => this.onFiltersChanged());
  }
  
  /**
   * Handle filter changes
   * @private
   */
  onFiltersChanged() {
    // Indicate that filter values have changed and are awaiting manual application
    this.stateManager.setState('ui.filtersChangedPendingApply', true);
    console.debug('[FilterManager] Filters changed, pending manual apply.');
  }
  
  /**
   * Apply filters to data
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered data
   */
  async applyFilters(filters) {
    try {
      // Track start time for performance monitoring
      const startTime = performance.now();
      
      // Update active filters set for performance optimization
      this.updateActiveFilters(filters);
      
      let dataToAggregate;

      // If no active filters, return all data
      if (this.activeFilters.size === 0) {
        const allData = this.stateManager.state.data.raw || [];
        this.stateManager.setState('data.filtered', allData);
        dataToAggregate = allData;
      } else {
        // Apply filters
        const rawData = this.stateManager.state.data.raw;
        const filteredData = this.filterData(rawData, filters);
        
        // Update state with filtered data
        this.stateManager.setState('data.filtered', filteredData);
        dataToAggregate = filteredData;
      }
      
      // Re-aggregate the data to update the table view
      if (this.dataManager && typeof this.dataManager.aggregateData === 'function') {
        await this.dataManager.aggregateData(dataToAggregate); // Await the aggregation
      } else {
        console.error('FilterManager: DataManager or aggregateData method not available.');
      }
      
      // Log performance metrics
      const endTime = performance.now();
      console.debug(`Filtering applied in ${(endTime - startTime).toFixed(2)}ms. Filtered ${this.stateManager.state.data.raw?.length || 0} to ${dataToAggregate.length} records.`);
      
      // Update UI state to reflect filtering is complete
      this.stateManager.setState('ui.filteringComplete', true);
      this.stateManager.setState('ui.filtersChangedPendingApply', false);
      this.stateManager.setState('ui.isApplyingFilters', false);
      
      return dataToAggregate; // Return the data that was aggregated
    } catch (error) {
      console.error('Error applying filters:', error);
      this.stateManager.setState('ui.isApplyingFilters', false); // Ensure spinner is hidden on error
      this.stateManager.setState('ui.filtersChangedPendingApply', false); // Reset pending state on error
      return [];
    }
  }
  
  /**
   * Update the set of active filters
   * @param {Object} filters - Current filter state
   * @private
   */
  updateActiveFilters(filters) {
    this.activeFilters.clear();
    
    // Check which filters are active
    if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
      this.activeFilters.add('dateRange');
    }
    
    if (filters.lenders && filters.lenders.length > 0) {
      this.activeFilters.add('lenders');
    }
    
    if (filters.ltvRange && filters.ltvRange !== 'all') {
      this.activeFilters.add('ltvRange');
    }
    
    if (filters.premiumBands && filters.premiumBands.length > 0) {
      this.activeFilters.add('premiumBands');
    }
    
    if (filters.purchaseTypes && filters.purchaseTypes.length > 0) {
      this.activeFilters.add('purchaseTypes');
    }
    
    // Update filter count in state for UI indicators
    this.stateManager.setState('ui.activeFilterCount', this.activeFilters.size);
  }
  
  /**
   * Filter data based on criteria
   * @param {Array} data - Data to filter
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered data
   * @private
   */
  filterData(data, filters) {
    if (!data || !Array.isArray(data)) return [];
    if (!filters) return data;

    console.debug('[FilterManager.filterData] Entered filterData. Filters object:', JSON.stringify(filters));

    let normalizedStartDate = null;
    let normalizedEndDate = null;

    const dateRangeIsActive = this.activeFilters.has('dateRange');
    console.debug('[FilterManager.filterData] Is dateRange active?', dateRangeIsActive);

    if (dateRangeIsActive && filters.dateRange && filters.dateRange.length === 2) {
      const startDate = filters.dateRange[0];
      const endDate = filters.dateRange[1];

      if (startDate instanceof Date && !isNaN(startDate)) {
        normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      }
      if (endDate instanceof Date && !isNaN(endDate)) {
        normalizedEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
      }

      console.debug('[FilterManager.filterData] Date Range for filtering:', 
        'Start:', normalizedStartDate?.toISOString(), 
        'End:', normalizedEndDate?.toISOString()
      );
    }
    
    return data.filter(record => {
      // Date range filter
      if (this.activeFilters.has('dateRange')) {
        const recordDate = record[COLUMN_MAP.documentDate]; // This is now a Date object (or Invalid Date)

        // Check if recordDate is a valid Date object
        if (!(recordDate instanceof Date) || isNaN(recordDate.getTime())) {
          return false; // Skip if record date is invalid or not a Date object
        }

        // Apply date range filtering if filter dates are valid
        // normalizedStartDate and normalizedEndDate are already Date objects (or null)
        if (normalizedStartDate && recordDate < normalizedStartDate) return false;
        if (normalizedEndDate && recordDate > normalizedEndDate) return false;
        // If normalizedStartDate or normalizedEndDate is null (due to invalid input filter),
        // those specific checks (start or end) won't apply. If both are null,
        // no date range filtering occurs, but the record must still have a valid date.
      }
      
      // Lender filter
      if (this.activeFilters.has('lenders')) {
        const lender = record[COLUMN_MAP.lender];
        if (!lender || !filters.lenders.includes(lender)) {
          return false;
        }
      }
      
      // LTV range filter
      if (this.activeFilters.has('ltvRange')) {
        const ltv = parseFloat(record[COLUMN_MAP.ltv]);
        if (isNaN(ltv)) return false;
        
        switch (filters.ltvRange) {
          case 'below-80':
            if (ltv >= 80) return false;
            break;
          case 'above-80':
            if (ltv < 80) return false;
            break;
          case 'above-85':
            if (ltv < 85) return false;
            break;
          case 'above-90':
            if (ltv < 90) return false;
            break;
          case 'above-95':
            if (ltv < 95) return false;
            break;
          // default 'all' case or unrecognized values will not filter by LTV
        }
      }
      
      // Premium bands filter
      if (this.activeFilters.has('premiumBands')) {
        const premiumBand = record[COLUMN_MAP.premiumBand];
        if (!premiumBand || !filters.premiumBands.includes(premiumBand)) {
          return false;
        }
      }
      
      // Purchase types filter
      if (this.activeFilters.has('purchaseTypes')) {
        const purchaseType = record[COLUMN_MAP.purchaseType];
        if (!purchaseType || !filters.purchaseTypes.includes(purchaseType)) {
          return false;
        }
      }
      
      return true; // Record passes all active filters
    });
  }
  
  /**
   * Get unique filter options from data
   * @param {Array} data - Data to extract options from
   * @param {string} columnKey - Key from COLUMN_MAP
   * @returns {Array} Unique sorted options
   * @private
   */
  getUniqueOptions(data, columnKey) {
    if (this._gettingFilterOptions) return []; // Prevent recursion
    this._gettingFilterOptions = true;
    try {
      if (!data || !Array.isArray(data)) return [];
      const options = new Set();
      data.forEach(record => {
        const value = record[columnKey];
        if (value !== null && value !== undefined && value !== '') {
          options.add(value);
        }
      });
      return Array.from(options).sort();
    } finally {
      this._gettingFilterOptions = false;
    }
  }
  
  /**
   * Get all filter options based on current raw data
   * @returns {Object} Object containing arrays of options for each filter type
   */
  getAllFilterOptions() {
    const rawData = this.stateManager.state.data.raw;
    if (!rawData) {
      return {
        lenders: [],
        premiumBands: [],
        purchaseTypes: []
      };
    }
    return {
      lenders: this.getUniqueOptions(rawData, COLUMN_MAP.lender),
      premiumBands: this.getUniqueOptions(rawData, COLUMN_MAP.premiumBand),
      purchaseTypes: this.getUniqueOptions(rawData, COLUMN_MAP.purchaseType)
    };
  }
}
