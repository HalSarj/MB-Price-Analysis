/**
 * Main Application Entry Point
 * Mortgage Brain Analysis Tool
 */

import { StateManager } from './state/StateManager.js';
import { DataManager } from './data/DataManager.js';
import { FilterManager } from './filters/FilterManager.js';
import { DateRangeDisplay } from './components/DateRangeDisplay.js';
import { FilterPanel } from './components/FilterPanel.js';
import { DataTableView } from './views/DataTableView.js';

// Initialize application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Show loading indicator
  const loadingIndicator = document.getElementById('loading-indicator');
  const appContent = document.getElementById('app-content');
  loadingIndicator.classList.remove('hidden');

  try {
    // Initialize core modules
    const stateManager = new StateManager();
    const dataManager = new DataManager(stateManager);
    const filterManager = new FilterManager(stateManager, dataManager);

    // Initialize UI components
    const dateRangeDisplay = new DateRangeDisplay(
      document.getElementById('date-range-display'),
      dataManager
    );

    // Load data first
    await dataManager.loadAllData();

    // Explicitly set aggregated data to null after initial load to ensure clean state
    stateManager.setState('data.aggregated', null);

    // Initialize filter panel after data is loaded to prevent recursion issues
    const filterPanel = new FilterPanel(
      document.getElementById('filters-panel'),
      filterManager,
      stateManager
    );

    // Trigger initial render of filter panel
    filterPanel.render();

    // Initialize view components
    const dataTableView = new DataTableView(
      document.getElementById('data-table-view'),
      dataManager, // Pass dataManager if DataTableView needs it directly
      stateManager
    );

    // Define initializeViewTabs INSIDE this scope so it has access to dataTableView
    function initializeViewTabs() { 
      const viewTabs = document.querySelectorAll('.view-tab');
      const viewPanels = document.querySelectorAll('.view-panel');

      viewTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const targetView = tab.getAttribute('data-view');
          console.log(`[App] Tab clicked. Target view: ${targetView}`); 

          // Update active tab
          viewTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');

          // Show corresponding panel
          viewPanels.forEach(panel => {
            const wasHidden = panel.classList.contains('hidden'); 
            
            const comparisonTarget = `${targetView}-view`;
            
            if (panel.id === comparisonTarget) {
              panel.classList.remove('hidden');
              console.log(`[App] Panel ${panel.id} activated. Was hidden: ${wasHidden}, Now hidden: ${panel.classList.contains('hidden')}`);

              if (panel.id === 'data-table-view') {
                if (dataTableView) { 
                  if (typeof dataTableView.activateView === 'function') {
                    dataTableView.activateView();
                  } else {
                    console.error(`[App] CRITICAL ERROR: dataTableView exists but activateView is NOT a function!`);
                  }
                } else {
                  console.error(`[App] CRITICAL ERROR: dataTableView is undefined or null! Cannot call activateView.`);
                }
              }
            } else {
              // Only add 'hidden' if it's not the target panel AND it wasn't already hidden
              if (!panel.classList.contains('hidden')) {
                 panel.classList.add('hidden');
              }
            }
          });
          
          // Special case for market share view - show premium band selector
          const premiumBandSelector = document.getElementById('premium-band-selector');
          if (targetView === 'market-share') {
            premiumBandSelector.classList.remove('hidden');
          } else {
            premiumBandSelector.classList.add('hidden');
          }
        });
      });
    }

    // Call the now-locally-defined initializeViewTabs
    initializeViewTabs(); 

    // Add export button functionality
    document.getElementById('export-data').addEventListener('click', () => {
      dataTableView.exportCSV();
    });

    // --- Add Apply Filters Button Logic ---
    const filterPanelEventContainer = document.getElementById('filter-panel-container') || document.body;
    console.log('[App] Setting up event delegation for apply-filters-button.');

    filterPanelEventContainer.addEventListener('click', async (event) => {
        let targetButton = event.target;
        if (targetButton.id !== 'apply-filters-button' && event.target.closest('#apply-filters-button')) {
            targetButton = event.target.closest('#apply-filters-button');
        }

        if (targetButton && targetButton.id === 'apply-filters-button') {
            console.log('[App] Apply Filters button clicked (delegated).');
            const currentSpinner = document.getElementById('loading-spinner'); 

            if (!stateManager || !filterManager) {
                console.error('[App] StateManager or FilterManager not available. Cannot apply filters.');
                if(currentSpinner) currentSpinner.style.display = 'none';
                if(targetButton) targetButton.disabled = false;
                return;
            }

            try {
                stateManager.setState('ui.isApplyingFilters', true);

                const currentFilters = stateManager.state.filters;
                console.log('[App] Calling filterManager.applyFilters with:', currentFilters);
                await filterManager.applyFilters(currentFilters);
                console.log('[App] filterManager.applyFilters completed.');

            } catch (error) {
                console.error('[App] Error during applyFiltersButton click handler (delegated):', error);
                stateManager.setState('ui.isApplyingFilters', false); 
                // Subscription will handle hiding spinner and enabling button
            }
        }
    });

    // Subscribe to loading state changes to show/hide spinner and disable button
    if (stateManager) {
        stateManager.subscribe('ui.isApplyingFilters', (isApplyingFilters) => {
            const currentSpinner = document.getElementById('loading-spinner');
            const currentButton = document.getElementById('apply-filters-button');
            
            if (currentSpinner) {
                currentSpinner.style.display = isApplyingFilters ? 'block' : 'none';
            }
            if (currentButton) {
                currentButton.disabled = isApplyingFilters;
            }
        });
    }
    // --- End Apply Filters Button Logic ---

    // Hide loading indicator and show app content
    loadingIndicator.classList.add('hidden');
    appContent.classList.remove('hidden');
  } catch (error) {
    console.error('Error initializing application:', error);
    loadingIndicator.innerHTML = `
      <div class="error-message">
        <p>Error loading application: ${error.message}</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }
});
