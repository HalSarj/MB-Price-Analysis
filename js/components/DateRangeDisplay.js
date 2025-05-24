/**
 * DateRangeDisplay.js
 * Component to display the date range of the loaded data
 */

import { formatDate } from '../data/ColumnMapper.js';

export class DateRangeDisplay {
  /**
   * Create a new DateRangeDisplay instance
   * @param {HTMLElement} container - Container element
   * @param {Object} dataManager - DataManager instance
   */
  constructor(container, dataManager) {
    this.container = container;
    this.dataManager = dataManager;
  }
  
  /**
   * Render the date range display
   * @param {Array} data - Data to display date range for
   */
  render(data) {
    if (!data || data.length === 0) {
      this.container.innerHTML = '<div class="date-range-info">No data available</div>';
      return;
    }
    
    const dates = data.map(r => new Date(r.Timestamp));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    this.container.innerHTML = `
      <div class="date-range-info">
        <span class="label">Data Range:</span>
        <span class="range">${formatDate(minDate)} - ${formatDate(maxDate)}</span>
        <span class="record-count">(${data.length.toLocaleString()} records)</span>
      </div>
    `;
  }
}
