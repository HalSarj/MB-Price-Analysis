/**
 * DateRangeDisplay.js
 * Component to display the date range of the loaded data
 */

import { formatDate } from '../data/ColumnMapper.js';
import { COLUMN_MAP } from '../data/ColumnMapper.js';

export class DateRangeDisplay {
  /**
   * Create a new DateRangeDisplay instance
   * @param {HTMLElement} container - Container element
   * @param {Object} dataManager - DataManager instance
   */
  constructor(container, dataManager) {
    this.container = container;
    this.dataManager = dataManager;
    this.isUpdating = false;
    
    // Initialize the component
    this.init();
  }
  
  /**
   * Initialize the component and set up state subscriptions
   * @private
   */
  init() {
    // Don't render immediately, wait for data to be loaded
    // This prevents circular dependencies during initialization
    
    // Subscribe to data changes
    if (this.dataManager.stateManager) {
      // Listen for when data loading is complete
      this.dataManager.stateManager.subscribe('ui.loading', (isLoading) => {
        if (!isLoading) {
          // Data loading is complete, now we can safely update the display
          setTimeout(() => this.updateDisplay(), 0);
        }
      });
    }
  }
  
  /**
   * Update the display based on current data
   * @private
   */
  updateDisplay() {
    // Prevent recursive calls
    if (this.isUpdating) return;
    
    try {
      this.isUpdating = true;
      
      // Check if we have access to the state manager
      if (!this.dataManager || !this.dataManager.stateManager) {
        this.container.innerHTML = '<div class="date-range-info">Loading...</div>';
        return;
      }
      
      // Get raw data count
      const rawData = this.dataManager.rawData || [];
      const recordCount = rawData.length;
      
      // Get date range from filters
      const dateRange = this.dataManager.stateManager.getStateByPath('filters.dateRange');
      let minDate, maxDate;
      
      if (dateRange && Array.isArray(dateRange) && dateRange.length >= 2) {
        [minDate, maxDate] = dateRange;
      }
      
      if (!minDate || !maxDate) {
        this.container.innerHTML = '<div class="date-range-info">No date range available</div>';
        return;
      }
      
      this.render(minDate, maxDate, recordCount);
    } finally {
      this.isUpdating = false;
    }
  }
  
  /**
   * Render the date range display
   * @param {Date} minDate - Minimum date in the data
   * @param {Date} maxDate - Maximum date in the data
   * @param {number} recordCount - Number of records in the data
   */
  render(minDate, maxDate, recordCount) {
    if (!minDate || !maxDate) {
      this.container.innerHTML = '<div class="date-range-info">No date range available</div>';
      return;
    }
    
    this.container.innerHTML = `
      <div class="date-range-info">
        <span class="label">Data Range:</span>
        <span class="range">${formatDate(minDate)} - ${formatDate(maxDate)}</span>
        <span class="record-count">(${recordCount.toLocaleString()} records)</span>
      </div>
    `;
  }
}
