/**
 * DataTable.js
 * Table component for displaying aggregated mortgage data
 * 
 * This component uses the Tabulator library to render interactive data tables
 * with support for sorting, filtering, and formatting of mortgage data.
 */

import { comparePremiumBands, standardizePremiumBand } from '../utils/sortUtils.js';
import { formatCurrency, formatPercentage } from '../utils/formatUtils.js';

export class DataTable {
  /**
   * Create a new DataTable instance
   * @param {HTMLElement} container - DOM element to render the table into
   * @param {Object} stateManager - StateManager instance
   */
  constructor(container, stateManager) {
    this.container = container;
    this.stateManager = stateManager;
    this.table = null;
    this.isRendering = false;
    this.isTabulatorBuilt = false; // New property
    
    // Subscribe to relevant state changes
    this.stateManager.subscribe('data.aggregated', () => this.render());
    this.stateManager.subscribe('ui.selectedPremiumBands', () => this.render());
  }
  
  // Using centralized formatUtils.js instead of local formatting methods
  
  /**
   * Create column definitions for the table
   * @param {Array} months - Array of month strings
   * @param {boolean} includeCount - Whether to include count columns
   * @returns {Array} Column definitions
   * @private
   */
  createColumnDefinitions(months, includeCount = true) {
    const columns = [
      {
        title: "Premium Band",
        field: "premiumBand",
        headerSort: true,
        frozen: true,
        headerFilter: true,
        sorter: comparePremiumBands
      }
    ];
    
    // Add month columns
    months.forEach(month => {
      // Format month for display (e.g., "2025-01" to "Jan 25")
      const displayMonth = this.formatMonthLabel(month);
      
      columns.push({
        title: displayMonth,
        field: `amount.${month}`,
        headerSort: true,
        formatter: cell => formatCurrency(cell.getValue()),
        sorter: "number",
        hozAlign: "right"
      });
      
      // Add count columns if requested
      if (includeCount) {
        columns.push({
          title: `${displayMonth} (Count)`,
          field: `count.${month}`,
          headerSort: true,
          formatter: cell => cell.getValue() || "-",
          sorter: "number",
          visible: false, // Hidden by default
          hozAlign: "right"
        });
      }
    });
    
    // Add totals column
    columns.push({
      title: "Total",
      field: "total",
      headerSort: true,
      formatter: cell => formatCurrency(cell.getValue()),
      sorter: "number",
      hozAlign: "right",
      headerFilter: true
    });
    
    // Add market share column
    columns.push({
      title: "Market Share",
      field: "marketShare",
      headerSort: true,
      formatter: cell => formatPercentage(cell.getValue()),
      sorter: "number",
      hozAlign: "right"
    });
    
    return columns;
  }
  
  /**
   * Format month label for display
   * @param {string} monthStr - Month string in format YYYY-MM
   * @returns {string} Formatted month label (e.g., "Jan 25")
   * @private
   */
  formatMonthLabel(monthStr) {
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    } catch (e) {
      return monthStr; // Return original if parsing fails
    }
  }
  
  /**
   * Transform aggregated data into tabulator-compatible format
   * @param {Object} aggregatedData - Aggregated data from DataAggregator
   * @returns {Array} Transformed data for tabulator
   * @private
   */
  transformDataForTable(aggregatedData) {
    if (!aggregatedData) return [];
    
    const { premiumBands, months, data, totals, unfilteredTotals } = aggregatedData;
    const tableData = [];
    
    // Create a row for each premium band, filtering out 'Unknown'
    premiumBands.forEach(band => {
      // Skip the 'Unknown' and '-0.4--0.2' premium bands
      if (band === 'Unknown' || band === '-0.4--0.2') return;
      // Standardize premium band format (convert decimal to basis points if needed)
      const standardizedBand = standardizePremiumBand(band);
      
      // Calculate market share as percentage of total lending in this price premium bucket
      let marketShare = 100; // Default to 100% if no unfiltered totals available
      
      if (unfilteredTotals && unfilteredTotals.byPremiumBand && unfilteredTotals.byPremiumBand[band] > 0) {
        // Market share = (filtered amount for this band / unfiltered amount for this band) * 100
        marketShare = ((totals.byPremiumBand[band] || 0) / unfilteredTotals.byPremiumBand[band]) * 100;
      } else if (totals.overall > 0) {
        // Fallback to old calculation if unfiltered totals not available
        marketShare = ((totals.byPremiumBand[band] || 0) / totals.overall) * 100;
      }
      
      const row = {
        premiumBand: standardizedBand,
        amount: {},
        count: {},
        total: totals.byPremiumBand[band] || 0,
        marketShare: marketShare
      };
      
      // Add data for each month
      months.forEach(month => {
        if (data[band] && data[band][month]) {
          row.amount[month] = data[band][month].amount;
          row.count[month] = data[band][month].count;
        } else {
          row.amount[month] = 0;
          row.count[month] = 0;
        }
      });
      
      tableData.push(row);
    });
    
    // Add a total row
    const totalRow = {
      premiumBand: "Total",
      amount: {},
      count: {},
      total: totals.overall,
      marketShare: unfilteredTotals && unfilteredTotals.overall > 0 ? 
        (totals.overall / unfilteredTotals.overall) * 100 : 100
    };
    
    months.forEach(month => {
      totalRow.amount[month] = totals.byMonth[month] || 0;
      totalRow.count[month] = aggregatedData.counts?.byMonth[month] || 0;
    });
    
    tableData.push(totalRow);
    
    return tableData;
  }
  
  /**
   * Render the data table
   */
  render() {
    // Prevent rendering if already in progress
    if (this.isRendering) return;
    this.isRendering = true;
    
    console.log('[DataTable] render called.'); // New Log
    try {
      // Get aggregated data from state
      const aggregatedData = this.stateManager.getState('data.aggregated');
      
      if (!aggregatedData || !aggregatedData.premiumBands || !aggregatedData.months) {
        console.log('[DataTable] render: No aggregated data or missing properties. Displaying "No data" message.'); // New Log
        this.container.innerHTML = '<div class="no-data-message">No data available for display</div>';
        this.isRendering = false;
        return;
      }
      
      // If an old table instance exists, destroy it.
      // Tabulator's destroy method should clean up its own DOM elements within this.container.
      if (this.table) {
        this.table.destroy();
        this.table = null;
        this.isTabulatorBuilt = false;
      }

      // Clear the container's content *before* initializing the new table directly into it.
      this.container.innerHTML = ''; 

      // Re-check for data after clearing, in case the "No data" message was the only thing.
      if (!aggregatedData || !aggregatedData.premiumBands || !aggregatedData.months) {
          this.container.innerHTML = '<div class="no-data-message">No data available for display</div>';
          this.isRendering = false;
          return;
      }

      const tableData = this.transformDataForTable(aggregatedData);
      console.log('Rendering table with months:', aggregatedData.months); // Keep this log for now
      const columnDefinitions = this.createColumnDefinitions(aggregatedData.months);

      // Initialize Tabulator directly on this.container
      this.table = new Tabulator(this.container, { // Changed from tableElement
        data: tableData,
        columns: columnDefinitions,
        layout: "fitData",  // Changed from fitColumns
        placeholder: "No data available",
        initialSort: [
          { column: "premiumBand", dir: "asc" }
        ],
        rowFormatter: function(row){
          if(row.getData().premiumBand === "Total"){
            row.getElement().style.backgroundColor = "#CCE5FF"; 
            row.getElement().style.fontWeight = "bold";
          }
        },
      });
      
      this.isTabulatorBuilt = true; 
      
    } catch (error) {
      console.error('Error rendering data table:', error);
      this.container.innerHTML = `<div class="error-message">Error rendering table: ${error.message}</div>`;
    } finally {
      this.isRendering = false;
    }
  }
  
  /**
   * Add export buttons for CSV and Excel download
   * @private
   */
  addExportButtons() {
    // This method has been modified to not add buttons to the UI
    // while preserving the functionality for potential future use
    
    // Export functionality is still available programmatically via:
    // - this.table.download("csv", "mortgage_data.csv");
    // - this.table.download("xlsx", "mortgage_data.xlsx");
    
    // Count column toggling is still available programmatically via:
    // const countColumns = this.table.getColumns().filter(column => {
    //   const field = column.getField();
    //   return field && field.includes('count.');
    // });
    // countColumns.forEach(column => column.toggle());
  }
  
  /**
   * Forces a redraw of the Tabulator table.
   * Useful when the table becomes visible after being hidden.
   */
  forceRedraw() {
    console.log(`[DataTable] forceRedraw called. Tabulator instance (this.table) exists: ${!!this.table}, isTabulatorBuilt: ${this.isTabulatorBuilt}`);
    if (this.table && this.isTabulatorBuilt) { 
      try {
        this.table.redraw(true);
        console.log('[DataTable] this.table.redraw(true) executed.'); // New Log
      } catch (error) {
        console.error('Error forcing redraw:', error);
      }
    }
  }

  /**
   * Destroy the table instance and clean up
   */
  destroy() {
    if (this.table) {
      this.table.destroy();
      this.table = null;
      this.isTabulatorBuilt = false; // Reset isTabulatorBuilt
    }
  }
}
