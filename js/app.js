/**
 * Main Application Entry Point
 * Mortgage Brain Analysis Tool
 */

import { StateManager } from './state/StateManager.js';
import { DataManager } from './data/DataManager.js';
import { FilterManager } from './filters/FilterManager.js';
import { DateRangeDisplay } from './components/DateRangeDisplay.js';

// Initialize application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
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
    
    // Load data
    await dataManager.loadAllData();
    
    // Initialize view tabs
    initializeViewTabs();
    
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
}

/**
 * Initialize view tab switching functionality
 */
function initializeViewTabs() {
  const viewTabs = document.querySelectorAll('.view-tab');
  const viewPanels = document.querySelectorAll('.view-panel');
  
  viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetView = tab.getAttribute('data-view');
      
      // Update active tab
      viewTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show corresponding panel
      viewPanels.forEach(panel => {
        panel.classList.add('hidden');
        if (panel.id === `${targetView}-view`) {
          panel.classList.remove('hidden');
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
