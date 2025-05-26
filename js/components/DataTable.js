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
    
    const { premiumBands, months, data, totals } = aggregatedData;
    const tableData = [];
    
    // Create a row for each premium band, filtering out 'Unknown'
    premiumBands.forEach(band => {
      // Skip the 'Unknown' and '-0.4--0.2' premium bands
      if (band === 'Unknown' || band === '-0.4--0.2') return;
      // Standardize premium band format (convert decimal to basis points if needed)
      const standardizedBand = standardizePremiumBand(band);
      
      const row = {
        premiumBand: standardizedBand,
        amount: {},
        count: {},
        total: totals.byPremiumBand[band] || 0,
        marketShare: ((totals.byPremiumBand[band] || 0) / totals.overall) * 100
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
      marketShare: 100
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
    
    try {
      // Get aggregated data from state
      const aggregatedData = this.stateManager.getState('data.aggregated');
      
      if (!aggregatedData || !aggregatedData.premiumBands || !aggregatedData.months) {
        this.container.innerHTML = '<div class="no-data-message">No data available for display</div>';
        this.isRendering = false;
        return;
      }
      
      // Log available months for debugging
      console.info('Rendering table with months:', aggregatedData.months);
      
      // Clear container
      this.container.innerHTML = '';
      
      // Create month selector
      const yearSelector = document.createElement('div');
      yearSelector.className = 'year-selector';
      yearSelector.innerHTML = '<label>Filter by Year: </label>';
      
      // Get unique years from months
      const years = [...new Set(aggregatedData.months.map(month => month.split('-')[0]))].sort();
      
      // Create year buttons
      const allYearsBtn = document.createElement('button');
      allYearsBtn.textContent = 'All Years';
      allYearsBtn.className = 'btn btn-primary year-btn active';
      allYearsBtn.dataset.year = 'all';
      yearSelector.appendChild(allYearsBtn);
      
      years.forEach(year => {
        const yearBtn = document.createElement('button');
        yearBtn.textContent = year;
        yearBtn.className = 'btn btn-secondary year-btn';
        yearBtn.dataset.year = year;
        yearSelector.appendChild(yearBtn);
      });
      
      this.container.appendChild(yearSelector);
      
      // Create table element
      const tableElement = document.createElement('div');
      tableElement.className = 'data-table';
      this.container.appendChild(tableElement);
      
      // Transform data for tabulator
      const tableData = this.transformDataForTable(aggregatedData);
      
      // Create column definitions
      const columns = this.createColumnDefinitions(aggregatedData.months);
      
      // Initialize tabulator
      if (this.table) {
        this.table.destroy();
      }
      
      this.table = new Tabulator(tableElement, {
        data: tableData,
        columns: columns,
        layout: "fitData", // Changed from fitDataTable to fitData
        height: "400px", // Fixed height with scrolling
        responsiveLayout: false, // Disable responsive layout
        pagination: false,
        headerSort: true,
        rowFormatter: function(row) {
          // Highlight total row
          if (row.getData().premiumBand === "Total") {
            row.getElement().classList.add("total-row");
          }
        },
        tooltips: true,
        placeholder: "No Data Available",
        movableColumns: true, // Allow column reordering
        horizontalScrolling: true, // Enable horizontal scrolling
        initialSort: [
          {column: "premiumBand", dir: "asc"} // Sort by premium band initially
        ]
      });
      
      // Add year filter functionality
      const yearBtns = yearSelector.querySelectorAll('.year-btn');
      yearBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          // Update button states
          yearBtns.forEach(b => {
            b.classList.remove('btn-primary', 'active');
            b.classList.add('btn-secondary');
          });
          btn.classList.remove('btn-secondary');
          btn.classList.add('btn-primary', 'active');
          
          const selectedYear = btn.dataset.year;
          
          // Filter columns based on selected year
          if (selectedYear === 'all') {
            // Show all columns
            this.table.getColumns().forEach(column => {
              const field = column.getField();
              if (field && field.startsWith('amount.')) {
                column.show();
              }
            });
          } else {
            // Show only columns for the selected year
            this.table.getColumns().forEach(column => {
              const field = column.getField();
              if (field && field.startsWith('amount.')) {
                const monthYear = field.replace('amount.', '');
                if (monthYear.startsWith(selectedYear)) {
                  column.show();
                } else {
                  column.hide();
                }
              }
            });
          }
        });
      });
      
      // Add download buttons
      this.addExportButtons();
      
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
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'table-actions';
    
    // CSV download button
    const csvButton = document.createElement('button');
    csvButton.className = 'btn btn-secondary';
    csvButton.innerHTML = '<i class="fas fa-file-csv"></i> Export CSV';
    csvButton.addEventListener('click', () => {
      this.table.download("csv", "mortgage_data.csv");
    });
    
    // Excel download button
    const excelButton = document.createElement('button');
    excelButton.className = 'btn btn-secondary';
    excelButton.innerHTML = '<i class="fas fa-file-excel"></i> Export Excel';
    excelButton.addEventListener('click', () => {
      this.table.download("xlsx", "mortgage_data.xlsx");
    });
    
    // Toggle count columns button
    const toggleCountButton = document.createElement('button');
    toggleCountButton.className = 'btn btn-secondary';
    toggleCountButton.innerHTML = '<i class="fas fa-list-ol"></i> Toggle Count Columns';
    toggleCountButton.addEventListener('click', () => {
      // Get all count columns
      const countColumns = this.table.getColumns().filter(column => {
        const field = column.getField();
        return field && field.includes('count.');
      });
      
      // Toggle visibility
      const firstVisible = countColumns.length > 0 ? countColumns[0].isVisible() : false;
      countColumns.forEach(column => {
        column.toggle(!firstVisible);
      });
    });
    
    // Debug button to show data structure
    const debugButton = document.createElement('button');
    debugButton.className = 'btn btn-secondary';
    debugButton.innerHTML = '<i class="fas fa-bug"></i> Debug Data';
    debugButton.addEventListener('click', () => {
      const aggregatedData = this.stateManager.getState('data.aggregated');
      if (aggregatedData) {
        console.log('Aggregated Data Structure:', aggregatedData);
        console.log('Months available:', aggregatedData.months);
        console.log('Premium Bands:', aggregatedData.premiumBands);
        
        // Create a debug panel
        const debugPanel = document.createElement('div');
        debugPanel.className = 'debug-panel';
        debugPanel.innerHTML = `
          <h3>Debug Information</h3>
          <p><strong>Months available:</strong> ${aggregatedData.months.join(', ')}</p>
          <p><strong>Premium Bands:</strong> ${aggregatedData.premiumBands.join(', ')}</p>
          <p>Check browser console for full data structure</p>
          <button class="btn btn-primary close-debug">Close</button>
        `;
        
        // Add close button functionality
        debugPanel.querySelector('.close-debug').addEventListener('click', () => {
          debugPanel.remove();
        });
        
        // Add to document
        document.body.appendChild(debugPanel);
      } else {
        console.error('No aggregated data available');
      }
    });
    
    buttonContainer.appendChild(csvButton);
    buttonContainer.appendChild(excelButton);
    buttonContainer.appendChild(toggleCountButton);
    buttonContainer.appendChild(debugButton);
    
    // Insert before the table
    this.container.insertBefore(buttonContainer, this.container.firstChild);
  }
  
  /**
   * Destroy the table instance and clean up
   */
  destroy() {
    if (this.table) {
      this.table.destroy();
      this.table = null;
    }
  }
}
