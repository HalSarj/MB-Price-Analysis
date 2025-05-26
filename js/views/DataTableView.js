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
    this.spinnerElement = null; // Add a property to hold the spinner
    this.viewContainer = this.container; // Assign this.viewContainer to the main container element
    
    // Subscribe to data changes
    this.stateManager.subscribe('data.aggregated', (aggregatedData) => {
      if (this.isInitialized) {
        if (aggregatedData) {
          console.log('[DataTableView] Received new aggregated data, calling this.dataTable.render().');
          this.dataTable.render(aggregatedData); // This renders the new table
          // DataTable's renderComplete event will now handle setting ui.isApplyingFilters to false.
        } else {
          // Handle case where aggregatedData is null (e.g., no data message)
          console.log('[DataTableView] Received null aggregated data, calling this.dataTable.render(null).');
          this.dataTable.render(null); // Or some method to clear/show 'no data'
          // If there's no data to render, Tabulator might not fire renderComplete, so hide spinner directly.
          this.stateManager.setState('ui.isApplyingFilters', false);
          console.log('[DataTableView] Set ui.isApplyingFilters to false directly due to null aggregatedData.');
        }
      }
    });
    
    // Subscribe to filter application state
    this.stateManager.subscribe('ui.isApplyingFilters', (isApplyingFilters) => {
      console.log('[DataTableView] ui.isApplyingFilters state changed:', isApplyingFilters);
      this.toggleSpinner(isApplyingFilters);
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

    // Set initial spinner state
    this.toggleSpinner(this.stateManager.state.ui.isApplyingFilters || false);
  }

  /**
   * Shows or hides a loading spinner within the data table view.
   * @param {boolean} show - True to show the spinner, false to hide it.
   */
  ensureSpinnerElement() {
    // Check if the spinner element exists and is in the document body
    if (!this.spinnerElement || !document.body.contains(this.spinnerElement)) {
      console.log('[DataTableView.ensureSpinnerElement] Spinner element needs creation or re-appending.');
      
      this.spinnerElement = document.createElement('div');
      this.spinnerElement.className = 'data-view-spinner-overlay';
      this.spinnerElement.innerHTML = '<div class="spinner"></div>';
      this.spinnerElement.style.display = 'none'; // Ensure it's initially hidden if re-created
      console.log('[DataTableView.ensureSpinnerElement] Spinner element created.');

      if (this.viewContainer) {
        this.viewContainer.appendChild(this.spinnerElement);
        console.log('[DataTableView.ensureSpinnerElement] Spinner appended to viewContainer:', this.viewContainer);
      } else {
        console.error('[DataTableView.ensureSpinnerElement] viewContainer is null. Appending to document.body as fallback.');
        document.body.appendChild(this.spinnerElement);
      }
    } else {
      console.log('[DataTableView.ensureSpinnerElement] Spinner element already exists and is in DOM.');
    }
  }

  toggleSpinner(show) {
    console.log(`[DataTableView.toggleSpinner] Called with show: ${show}`);
    this.ensureSpinnerElement();

    if (!this.spinnerElement) {
      console.error('[DataTableView.toggleSpinner] CRITICAL: this.spinnerElement is NULL after ensureSpinnerElement. Cannot proceed.');
      return;
    }
    console.log('[DataTableView.toggleSpinner] this.spinnerElement is valid.');

    if (!this.viewContainer || !this.viewContainer.contains(this.spinnerElement)) {
      console.warn(`[DataTableView.toggleSpinner] Spinner not in designated viewContainer or viewContainer missing. Spinner in DOM: ${document.body.contains(this.spinnerElement)}. Attempting to fix.`);
      if (this.viewContainer && document.body.contains(this.spinnerElement) && this.spinnerElement.parentElement !== this.viewContainer) {
        console.log('[DataTableView.toggleSpinner] Moving spinner to viewContainer.');
        this.viewContainer.appendChild(this.spinnerElement); // This moves it if it's elsewhere
      } else if (this.viewContainer && !document.body.contains(this.spinnerElement)) {
         console.log('[DataTableView.toggleSpinner] Spinner not in DOM, re-appending to viewContainer.');
         this.viewContainer.appendChild(this.spinnerElement);
      } else if (!this.viewContainer && document.body.contains(this.spinnerElement)) {
        console.log('[DataTableView.toggleSpinner] viewContainer missing, spinner is on document.body (fallback).');
      } else if (!this.viewContainer && !document.body.contains(this.spinnerElement)){
        console.error('[DataTableView.toggleSpinner] viewContainer missing AND spinner not in DOM. Appending to body.');
        document.body.appendChild(this.spinnerElement);
      }
    }

    if (show) {
      console.log('[DataTableView.toggleSpinner] Attempting to show spinner.');
      this.spinnerElement.style.display = 'flex';
      console.log(`[DataTableView.toggleSpinner] Spinner style.display SET TO: '${this.spinnerElement.style.display}'.`);
      
      const computedDisplay = window.getComputedStyle(this.spinnerElement).display;
      console.log(`[DataTableView.toggleSpinner] Spinner COMPUTED display: '${computedDisplay}'.`);

      if (this.spinnerElement.offsetParent !== null) {
        console.log('[DataTableView.toggleSpinner] Spinner IS VISIBLE on page (offsetParent is not null).');
      } else {
        console.warn('[DataTableView.toggleSpinner] Spinner offsetParent is NULL - IT IS LIKELY NOT VISIBLE.');
        if (this.viewContainer) {
             const vcStyle = window.getComputedStyle(this.viewContainer);
             console.warn(`[DataTableView.toggleSpinner] viewContainer details: offsetParent: ${this.viewContainer.offsetParent}, display: ${vcStyle.display}, visibility: ${vcStyle.visibility}, opacity: ${vcStyle.opacity}`);
        } else {
            console.warn('[DataTableView.toggleSpinner] viewContainer is null, cannot check its visibility details.');
        }
      }
    } else {
      console.log('[DataTableView.toggleSpinner] Attempting to hide spinner.');
      this.spinnerElement.style.display = 'none';
      console.log(`[DataTableView.toggleSpinner] Spinner style.display SET TO: '${this.spinnerElement.style.display}'.`);
      const computedDisplay = window.getComputedStyle(this.spinnerElement).display;
      console.log(`[DataTableView.toggleSpinner] Spinner COMPUTED display (after hide): '${computedDisplay}'.`);
    }
  }

  /**
   * Activates the view, ensuring the table is rendered.
   * Called when the tab for this view becomes active.
   */
  activateView() {
    console.log(`[DataTableView] activateView called. isInitialized: ${this.isInitialized}`);
    if (this.isInitialized) {
      this.updateTable(); // This will call DataTable.render()
      
      if (this.dataTable) {
        console.log(`[DataTableView] Scheduling forceRedraw. DataTable component exists.`);
        // Defer the forceRedraw to allow the browser to update the layout
        // and for Tabulator to fully initialize in the now-visible container.
        requestAnimationFrame(() => {
          const isPanelHidden = this.container ? this.container.classList.contains('hidden') : 'N/A_container_null';
          const dataTableExists = !!this.dataTable;
          console.log(`[DataTableView] rAF callback. dataTable exists: ${dataTableExists}, panel hidden: ${isPanelHidden}`);
          // Check if the component is still mounted and the panel is visible,
          // as the user might have quickly navigated away again.
          if (this.dataTable && this.container && !this.container.classList.contains('hidden')) {
            console.log('[DataTableView] rAF: Conditions met, calling forceRedraw.');
            this.dataTable.forceRedraw();
          } else {
            console.log('[DataTableView] rAF: Conditions NOT met for forceRedraw.');
          }
        });
      } else {
        console.log(`[DataTableView] activateView: this.dataTable is null.`);
      }
    }
  }

  /**
   * Create view controls for switching between aggregated and raw data views
   * @private
   */
  createViewControls() {
    // View controls have been removed as requested
    // The view is now permanently set to 'aggregated'
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
    
    // Hide spinner before attempting to render table, 
    // as render might be called when isApplyingFilters is still true from a previous op,
    // but new data has arrived.
    // The 'ui.isApplyingFilters' subscription will manage the spinner visibility during active aggregation.
    if (this.spinnerElement && this.spinnerElement.style.display !== 'none' && !this.stateManager.state.ui.isApplyingFilters) {
        this.toggleSpinner(false);
    }

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
