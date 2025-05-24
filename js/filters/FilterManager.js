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
    const filters = this.stateManager.state.filters;
    
    // Debounce filter changes (prevent rapid consecutive filtering)
    const now = Date.now();
    if (now - this.lastFilterTime < 100) {
      clearTimeout(this._filterTimeout);
    }
    
    this._filterTimeout = setTimeout(() => {
      this.applyFilters(filters);
      this.lastFilterTime = Date.now();
    }, 100);
  }
  
  /**
   * Apply filters to data
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered data
   */
  applyFilters(filters) {
    try {
      // Track start time for performance monitoring
      const startTime = performance.now();
      
      // Update active filters set for performance optimization
      this.updateActiveFilters(filters);
      
      // If no active filters, return all data
      if (this.activeFilters.size === 0) {
        const allData = this.stateManager.state.data.raw || [];
        this.stateManager.setState('data.filtered', allData);
        this.dataManager.aggregateData(allData);
        return allData;
      }
      
      // Apply filters
      const rawData = this.stateManager.state.data.raw;
      const filteredData = this.filterData(rawData, filters);
      
      // Update state with filtered data
      this.stateManager.setState('data.filtered', filteredData);
      
      // Re-aggregate with filtered data
      this.dataManager.aggregateData(filteredData);
      
      // Log performance metrics
      const endTime = performance.now();
      console.debug(`Filtering applied in ${(endTime - startTime).toFixed(2)}ms. Filtered ${rawData?.length || 0} to ${filteredData.length} records.`);
      
      // Update UI state to reflect filtering is complete
      this.stateManager.setState('ui.filteringComplete', true);
      
      return filteredData;
    } catch (error) {
      console.error('Error applying filters:', error);
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
    
    return data.filter(record => {
      // Date range filter
      if (this.activeFilters.has('dateRange')) {
        const recordDate = new Date(record[COLUMN_MAP.documentDate]);
        if (isNaN(recordDate.getTime())) return false;
        
        const startDate = filters.dateRange[0];
        const endDate = filters.dateRange[1];
        
        if (startDate && recordDate < startDate) return false;
        if (endDate && recordDate > endDate) return false;
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
        }
      }
      
      // Premium band filter
      if (this.activeFilters.has('premiumBands')) {
        const band = record.PremiumBand;
        if (!band || !filters.premiumBands.includes(band)) {
          return false;
        }
      }
      
      // Purchase type filter
      if (this.activeFilters.has('purchaseTypes')) {
        const purchaseType = record[COLUMN_MAP.purchaseType];
        if (!purchaseType || !filters.purchaseTypes.includes(purchaseType)) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Update a specific filter
   * @param {string} filterName - Name of the filter to update
   * @param {any} value - New filter value
   * @returns {boolean} Success status
   */
  updateFilter(filterName, value) {
    try {
      if (!this.stateManager.state.filters.hasOwnProperty(filterName)) {
        console.warn(`Unknown filter: ${filterName}`);
        return false;
      }
      
      this.stateManager.setState(`filters.${filterName}`, value);
      return true;
    } catch (error) {
      console.error(`Error updating filter ${filterName}:`, error);
      return false;
    }
  }
  
  /**
   * Reset all filters to default values
   */
  resetFilters() {
    this.stateManager.resetState('filters');
  }
  
  /**
   * Get available filter options based on current data
   * @returns {Object} Filter options
   */
  getFilterOptions() {
    // Use a flag to prevent recursive calls
    if (this._gettingFilterOptions) {
      return this.getDefaultFilterOptions();
    }
    
    this._gettingFilterOptions = true;
    
    try {
      const data = this.stateManager.state.data.filtered || this.stateManager.state.data.raw;
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return this.getDefaultFilterOptions();
      }
      
      // Extract dates for date range - use a sample of data for large datasets
      const maxSampleSize = 10000; // Limit sample size for performance
      const dataSample = data.length > maxSampleSize ? data.slice(0, maxSampleSize) : data;
      
      const dates = dataSample
        .map(r => r[COLUMN_MAP.documentDate])
        .filter(Boolean)
        .map(d => new Date(d))
        .filter(d => !isNaN(d.getTime()));
      
      const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
      const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();
      
      // Get unique lenders - limit to first 100 for performance
      const lenders = [...new Set(dataSample.map(r => r[COLUMN_MAP.lender]))]
        .filter(Boolean)
        .slice(0, 100)
        .sort();
      
      // Get unique purchase types
      const purchaseTypes = [...new Set(dataSample.map(r => r[COLUMN_MAP.purchaseType]))]
        .filter(Boolean)
        .sort();
      
      // Get unique premium bands - with safeguards for invalid data
      const premiumBandsSet = new Set();
      dataSample.forEach(r => {
        if (r.PremiumBand && typeof r.PremiumBand === 'string') {
          premiumBandsSet.add(r.PremiumBand);
        }
      });
      
      const premiumBands = Array.from(premiumBandsSet).sort((a, b) => {
        try {
          const aNum = parseInt(a.split('-')[0]) || 0;
          const bNum = parseInt(b.split('-')[0]) || 0;
          return aNum - bNum;
        } catch (e) {
          return 0; // If parsing fails, don't change order
        }
      });
      
      return {
        lenders,
        purchaseTypes,
        premiumBands,
        ltvRanges: [
          { value: 'all', label: 'All LTV' },
          { value: 'below-80', label: 'Below 80%' },
          { value: 'above-80', label: '80% and above' },
          { value: 'above-85', label: '85% and above' },
          { value: 'above-90', label: '90% and above' }
        ],
        dateRange: {
          min: minDate,
          max: maxDate,
          formatted: {
            min: formatDate(minDate, 'short'),
            max: formatDate(maxDate, 'short')
          }
        }
      };
    } catch (error) {
      console.error('Error getting filter options:', error);
      return this.getDefaultFilterOptions();
    } finally {
      // Reset flag to allow future calls
      this._gettingFilterOptions = false;
    }
  }
  
  /**
   * Get default filter options when no data is available
   * @returns {Object} Default filter options
   * @private
   */
  getDefaultFilterOptions() {
    return {
      lenders: [],
      purchaseTypes: [],
      premiumBands: [],
      ltvRanges: [
        { value: 'all', label: 'All LTV' },
        { value: 'below-80', label: 'Below 80%' },
        { value: 'above-80', label: '80% and above' },
        { value: 'above-85', label: '85% and above' },
        { value: 'above-90', label: '90% and above' }
      ],
      dateRange: {
        min: new Date(),
        max: new Date(),
        formatted: {
          min: '',
          max: ''
        }
      }
    };
  }
  
  /**
   * Get filter summary for display
   * @returns {Object} Filter summary
   */
  getFilterSummary() {
    const filters = this.stateManager.state.filters;
    const summary = {
      activeCount: this.activeFilters.size,
      filters: {}
    };
    
    if (this.activeFilters.has('dateRange')) {
      summary.filters.dateRange = {
        from: formatDate(filters.dateRange[0], 'short'),
        to: formatDate(filters.dateRange[1], 'short')
      };
    }
    
    if (this.activeFilters.has('lenders')) {
      summary.filters.lenders = {
        count: filters.lenders.length,
        values: filters.lenders.slice(0, 3),
        hasMore: filters.lenders.length > 3
      };
    }
    
    if (this.activeFilters.has('ltvRange')) {
      const ltvRangeMap = {
        'all': 'All LTV',
        'below-80': 'Below 80%',
        'above-80': '80% and above',
        'above-85': '85% and above',
        'above-90': '90% and above'
      };
      
      summary.filters.ltvRange = ltvRangeMap[filters.ltvRange] || filters.ltvRange;
    }
    
    if (this.activeFilters.has('premiumBands')) {
      summary.filters.premiumBands = {
        count: filters.premiumBands.length,
        values: filters.premiumBands.slice(0, 3),
        hasMore: filters.premiumBands.length > 3
      };
    }
    
    if (this.activeFilters.has('purchaseTypes')) {
      summary.filters.purchaseTypes = {
        count: filters.purchaseTypes.length,
        values: filters.purchaseTypes.slice(0, 3),
        hasMore: filters.purchaseTypes.length > 3
      };
    }
    
    return summary;
  }
}
