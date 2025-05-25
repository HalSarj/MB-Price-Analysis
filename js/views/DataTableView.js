/**
 * DataTableView.js
 * Renders mortgage data in a tabular format using the DataTable component
 * 
 * This view handles the display of aggregated mortgage data in a table format,
 * showing premium bands as rows and months as columns, with totals and market share.
 */

import { DataTable } from '../components/DataTable.js';
import { COLUMN_MAP, formatDate } from '../data/ColumnMapper.js';

export class DataTableView {
  /**
   * Create a new DataTableView instance
   * @param {HTMLElement} container - Container element for the table
   * @param {Object} dataManager - DataManager instance
   * @param {Object} stateManager - StateManager instance
   */
  constructor(container, dataManager, stateManager) {
    this.container = container;
    this.dataManager = dataManager;
    this.stateManager = stateManager;
    this.dataTable = null;
    this.rawDataTable = null;
    this.isInitialized = false;
    this.currentView = 'aggregated'; // 'aggregated' or 'raw'
    
    // Subscribe to data changes
    this.stateManager.subscribe('data.aggregated', () => {
      if (this.isInitialized) {
        this.updateTable();
      }
    });
    
    // Initialize the table
    this.initTable();
  }
  
  /**
   * Initialize the table view with controls and DataTable component
   */
  initTable() {
    // Create view controls
    this.createViewControls();
    
    // Create container for the data table
    const tableContainer = document.createElement('div');
    tableContainer.className = 'data-table-container';
    this.container.appendChild(tableContainer);
    
    // Initialize DataTable component for aggregated data view
    this.dataTable = new DataTable(tableContainer, this.stateManager);
    
    // Set initialized flag
    this.isInitialized = true;
    
    // Initial render
    this.updateTable();
  }
  
  /**
   * Create view controls for switching between aggregated and raw data views
   * @private
   */
  createViewControls() {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'table-view-controls';
    
    // Create view toggle buttons
    const aggregatedButton = document.createElement('button');
    aggregatedButton.className = 'btn btn-primary active';
    aggregatedButton.textContent = 'Aggregated View';
    aggregatedButton.addEventListener('click', () => this.switchView('aggregated'));
    
    const rawButton = document.createElement('button');
    rawButton.className = 'btn btn-secondary';
    rawButton.textContent = 'Raw Data View';
    rawButton.addEventListener('click', () => this.switchView('raw'));
    
    // Store references to buttons
    this.viewButtons = {
      aggregated: aggregatedButton,
      raw: rawButton
    };
    
    // Add buttons to controls container
    controlsContainer.appendChild(aggregatedButton);
    controlsContainer.appendChild(rawButton);
    
    // Add controls to main container
    this.container.appendChild(controlsContainer);
  }
  
  /**
   * Switch between aggregated and raw data views
   * @param {string} viewType - Type of view ('aggregated' or 'raw')
   * @private
   */
  switchView(viewType) {
    if (viewType === this.currentView) return;
    
    // Update button states
    Object.keys(this.viewButtons).forEach(key => {
      if (key === viewType) {
        this.viewButtons[key].classList.remove('btn-secondary');
        this.viewButtons[key].classList.add('btn-primary', 'active');
      } else {
        this.viewButtons[key].classList.remove('btn-primary', 'active');
        this.viewButtons[key].classList.add('btn-secondary');
      }
    });
    
    // Set current view
    this.currentView = viewType;
    
    // Update table based on view type
    this.updateTable();
  }
  
  /**
   * Update the table with current data based on the selected view
   */
  updateTable() {
    if (!this.isInitialized) return;
    
    if (this.currentView === 'aggregated') {
      // For aggregated view, the DataTable component will handle rendering
      // based on the aggregated data in the state
      if (this.dataTable) {
        this.dataTable.render();
      }
    } else {
      // For raw data view, we would initialize and update the raw data table
      // This would be implemented in a future task
      console.warn('Raw data view not yet implemented');
      
      // Switch back to aggregated view for now
      this.switchView('aggregated');
    }
  }
  
  /**
   * Refresh the table layout (useful after container resize)
   */
  refreshLayout() {
    if (this.currentView === 'aggregated' && this.dataTable) {
      this.dataTable.render();
    }
  }
  
  /**
   * Export current table data to CSV
   */
  exportCSV() {
    if (this.currentView === 'aggregated' && this.dataTable && this.dataTable.table) {
      this.dataTable.table.download("csv", "mortgage_data_aggregated.csv");
    }
  }
}
