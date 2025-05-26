/**
 * FilterManager.js
 * Manages data filtering and filter state
 *
 * This class provides centralized filter management with support for multiple filter types
 * and efficient application of filters to the dataset.
 */

import { COLUMN_MAP, formatDate } from '../data/ColumnMapper.js';
import { sortPremiumBands } from '../utils/sortUtils.js';

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
      
      return dataToAggregate; // Return the data that was aggregated
    } catch (error) {
      console.error('Error applying filters:', error);
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
    
    // Only consider lenders filter active if there are selected lenders and 'all_lenders' is not among them
    if (filters.lenders && filters.lenders.length > 0 && !filters.lenders.includes('all_lenders')) {
      this.activeFilters.add('lenders');
    }
    
    if (filters.ltvRange && filters.ltvRange !== 'all') {
      this.activeFilters.add('ltvRange');
    }
    
    // Premium bands filter is no longer used
    
    // Only consider purchase types filter active if there are selected types and 'all_purchase_types' is not among them
    if (filters.purchaseTypes && filters.purchaseTypes.length > 0 && !filters.purchaseTypes.includes('all_purchase_types')) {
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

    // Apply each filter in sequence
    let filteredData = [...data]; // Create a copy to avoid modifying original
    
    // Date range filter
    if (this.activeFilters.has('dateRange') && filters.dateRange && 
        filters.dateRange[0] && filters.dateRange[1]) {
      const startDate = new Date(filters.dateRange[0]);
      const endDate = new Date(filters.dateRange[1]);
      
      // Set time to include the entire day
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      filteredData = filteredData.filter(record => {
        const recordDate = new Date(record[COLUMN_MAP.documentDate]);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }
    
    // Lender filter - only apply if 'all_lenders' is not selected
    if (this.activeFilters.has('lenders') && filters.lenders && 
        filters.lenders.length > 0 && !filters.lenders.includes('all_lenders')) {
      filteredData = filteredData.filter(record => {
        return filters.lenders.includes(record[COLUMN_MAP.lender]);
      });
    }
    
    // LTV range filter
    if (this.activeFilters.has('ltvRange') && filters.ltvRange && filters.ltvRange !== 'all') {
      filteredData = filteredData.filter(record => {
        const ltv = parseFloat(record[COLUMN_MAP.ltv]);
        
        if (isNaN(ltv)) return false;
        
        switch (filters.ltvRange) {
          case 'below-80':
            return ltv < 80;
          case 'above-80':
            return ltv >= 80;
          case 'above-85':
            return ltv >= 85;
          case 'above-90':
            return ltv >= 90;
          default:
            return true;
        }
      });
    }
    
    // Purchase types filter - only apply if 'all_purchase_types' is not selected
    if (this.activeFilters.has('purchaseTypes') && filters.purchaseTypes && 
        filters.purchaseTypes.length > 0 && !filters.purchaseTypes.includes('all_purchase_types')) {
      console.log(`[FilterManager.filterData] Applying purchase type filter with values:`, filters.purchaseTypes);
      
      // Log the first few unique purchase types found in the data for debugging
      const uniquePurchaseTypes = new Set();
      filteredData.slice(0, 100).forEach(record => {
        if (record[COLUMN_MAP.purchaseType]) {
          uniquePurchaseTypes.add(record[COLUMN_MAP.purchaseType]);
        }
      });
      console.log(`[FilterManager.filterData] Unique purchase types in data:`, Array.from(uniquePurchaseTypes));
      
      filteredData = filteredData.filter(record => {
        const purchaseType = record[COLUMN_MAP.purchaseType];
        const included = filters.purchaseTypes.includes(purchaseType);
        
        // Log some sample records for debugging
        if (record.id && record.id < 5) {
          console.log(`[FilterManager.filterData] Record ${record.id} purchase type '${purchaseType}' ${included ? 'matches' : 'does not match'} filter`);
        }
        
        return included;
      });
      
      console.log(`[FilterManager.filterData] After purchase type filter: ${filteredData.length} records remain`);
    }
    
    return filteredData;
  }
  
  /**
   * Update the filter
   * @param {string} filterName - Name of the filter to update
   * @param {*} value - New value for the filter
   * @returns {boolean} True if the filter was updated successfully, false otherwise
   */
  updateFilter(filterName, value) {
    try {
      console.debug(`[FilterManager.updateFilter] Received update for filter: '${filterName}', Value:`, value);

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
    const defaultOptions = this.getDefaultFilterOptions();
    
    this.stateManager.setState('filters', {
      dateRange: [defaultOptions.dateRange.min, defaultOptions.dateRange.max],
      lenders: ['all_lenders'], // Select 'All Lenders' by default
      ltvRange: 'all',
      purchaseTypes: ['all_purchase_types'] // Select 'All Purchase Types' by default
    });
    
    // Reset the UI state for filters
    this.stateManager.setState('ui.filtersChangedPendingApply', true);
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
    try {
      const data = this.stateManager.state.data.filtered || this.stateManager.state.data.raw;
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return this.getDefaultFilterOptions();
      }
      
      // Extract dates for date range - use a sample of data for large datasets
      const maxSampleSize = 10000; // Limit sample size for performance
      const dataSample = data.length > maxSampleSize ? data.slice(0, maxSampleSize) : data;
      
      // Debug log to check date values in the data
      console.debug('Date range calculation - sample data:', dataSample.slice(0, 5).map(r => ({
        date: r[COLUMN_MAP.documentDate],
        parsed: new Date(r[COLUMN_MAP.documentDate])
      })));
      
      const dates = dataSample
        .map(r => {
          const dateStr = r[COLUMN_MAP.documentDate];
          if (!dateStr) return null;
          
          // Try different date formats
          let date;
          if (typeof dateStr === 'string') {
            if (dateStr.includes('-')) {
              // YYYY-MM-DD format
              date = new Date(dateStr);
            } else if (dateStr.includes('/')) {
              // DD/MM/YYYY or MM/DD/YYYY format
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                // Try DD/MM/YYYY format first
                date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                if (isNaN(date.getTime())) {
                  // Try MM/DD/YYYY format if DD/MM/YYYY failed
                  date = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
                }
              }
            } else {
              // Try standard parsing
              date = new Date(dateStr);
            }
          } else {
            date = new Date(dateStr);
          }
          
          return isNaN(date.getTime()) ? null : date;
        })
        .filter(Boolean);
      
      // Ensure we include 2025 in the date range even if no records have 2025 dates
      const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date('2024-01-01');
      let maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();
      
      // Force maxDate to include at least May 2025
      const may2025 = new Date('2025-05-31');
      if (maxDate < may2025) {
        maxDate = may2025;
      }
      
      console.debug(`Date range calculated: ${minDate.toISOString()} to ${maxDate.toISOString()}`);
      
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
      return {
        lenders: Array.from(lenders).sort(),
        purchaseTypes: Array.from(purchaseTypes).sort(),
        premiumBands: sortPremiumBands(Array.from(premiumBandsSet)),
        ltvRanges: this.getDefaultFilterOptions().ltvRanges,
        dateRange: this.getDefaultFilterOptions().dateRange
      };
    } catch (error) {
      console.error('Error getting filter options:', error);
      return this.getDefaultFilterOptions(); // Fallback to defaults on error
    } finally {
      this._gettingFilterOptions = false;
    }
  }
  
  /**
   * Get default filter options.
   * This can be used as a fallback or for initializing filters.
   * @returns {Object} Default filter options
   */
  getDefaultFilterOptions() {
    // Set default date range to include all of 2024 and 2025 data
    const minDate = new Date('2024-01-01');
    const maxDate = new Date('2025-05-31');
    
    return {
      lenders: ['all_lenders'],
      purchaseTypes: ['all_purchase_types'],
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
  }
} // Closes the FilterManager class
