/**
 * FilterPanel.js
 * Interactive filter panel component for user input
 * 
 * This component provides a UI for users to interact with and apply filters to the mortgage data.
 * It renders filter controls for date range, lenders, LTV, premium bands, and purchase types.
 */

export class FilterPanel {
  /**
   * Create a new FilterPanel instance
   * @param {HTMLElement} container - DOM element to render the filter panel into
   * @param {Object} filterManager - FilterManager instance
   * @param {Object} stateManager - StateManager instance
   */
  constructor(container, filterManager, stateManager) {
    this.container = container;
    this.filterManager = filterManager;
    this.stateManager = stateManager;
    this.elements = {};
    this.isRendering = false;
    
    // Subscribe to filter option changes - but only after initial data load
    this.stateManager.subscribe('data.filtered', () => {
      // Only update if we have data and aren't already rendering
      if (this.stateManager.state.data.filtered && !this.isRendering) {
        this.updateFilterOptions();
      }
    });
    
    // Initial render will happen after data is loaded
    // We don't render immediately to prevent recursion issues
  }
  
  /**
   * Render the filter panel UI
   */
  render() {
    // Set rendering flag to prevent recursion
    this.isRendering = true;
    
    try {
      // Clear container
      this.container.innerHTML = '';
      
      // Create panel wrapper
      const panelWrapper = document.createElement('div');
      panelWrapper.className = 'filters-panel';
      
      // Create header with title and reset button
      const header = document.createElement('div');
      header.className = 'filter-header';
      
      const title = document.createElement('h3');
      title.textContent = 'Filters';
      
      const resetButton = document.createElement('button');
      resetButton.className = 'btn btn-secondary';
      resetButton.textContent = 'Reset Filters';
      resetButton.addEventListener('click', () => this.resetFilters());
      
      header.appendChild(title);
      header.appendChild(resetButton);
      panelWrapper.appendChild(header);
      
      // Get current filter options - safely
      let filterOptions;
      try {
        filterOptions = this.filterManager.getFilterOptions();
      } catch (error) {
        console.error('Error getting filter options:', error);
        filterOptions = this.filterManager.getDefaultFilterOptions();
      }
      
      const currentFilters = this.stateManager.state.filters;
      
      // Create date range filter
      this.createDateRangeFilter(panelWrapper, filterOptions, currentFilters);
      
      // Create lender filter
      this.createLenderFilter(panelWrapper, filterOptions, currentFilters);
      
      // Create LTV range filter
      this.createLTVRangeFilter(panelWrapper, filterOptions, currentFilters);
      
      // Create premium bands filter
      this.createPremiumBandsFilter(panelWrapper, filterOptions, currentFilters);
      
      // Create purchase types filter
      this.createPurchaseTypesFilter(panelWrapper, filterOptions, currentFilters);
      
      // Dynamically create and append Apply Filters button and spinner
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'filter-actions';
      actionsDiv.style.marginTop = '15px';
      actionsDiv.style.paddingTop = '10px';
      actionsDiv.style.borderTop = '1px solid #eee';

      const applyButton = document.createElement('button');
      applyButton.id = 'apply-filters-button';
      applyButton.className = 'btn btn-primary';
      applyButton.textContent = 'Apply Filters';
      actionsDiv.appendChild(applyButton);

      const spinnerDiv = document.createElement('div');
      spinnerDiv.id = 'loading-spinner';
      spinnerDiv.style.display = 'none';
      spinnerDiv.style.marginTop = '10px';
      
      const spinnerText = document.createElement('p');
      spinnerText.textContent = 'Loading data, please wait...';
      spinnerDiv.appendChild(spinnerText);
      
      const spinnerAnimation = document.createElement('div');
      spinnerAnimation.className = 'spinner'; // Assumes .spinner CSS is defined elsewhere (e.g., index.html or styles.css)
      spinnerDiv.appendChild(spinnerAnimation);
      actionsDiv.appendChild(spinnerDiv);

      panelWrapper.appendChild(actionsDiv);
      // --- End of Apply Filters button and spinner creation ---
      console.log('[FilterPanel] Apply Filters button and spinner DIV created and appended to panelWrapper.');

      // Add to container
      this.container.appendChild(panelWrapper);
    } finally {
      // Reset rendering flag when done, regardless of success or failure
      this.isRendering = false;
    }
  }
  
  /**
   * Create date range filter
   * @param {HTMLElement} parent - Parent element to append to
   * @param {Object} filterOptions - Available filter options
   * @param {Object} currentFilters - Current filter values
   * @private
   */
  createDateRangeFilter(parent, filterOptions, currentFilters) {
    const filterGroup = document.createElement('div');
    filterGroup.className = 'filter-group';
    
    const label = document.createElement('label');
    label.textContent = 'Date Range';
    filterGroup.appendChild(label);
    
    const dateContainer = document.createElement('div');
    dateContainer.className = 'date-range-container';
    
    // Start date
    const startDateContainer = document.createElement('div');
    const startDateLabel = document.createElement('span');
    startDateLabel.textContent = 'From:';
    startDateLabel.className = 'date-label';
    
    const startDate = document.createElement('input');
    startDate.type = 'date';
    startDate.className = 'date-input';
    
    if (filterOptions.dateRange && filterOptions.dateRange.min) {
      startDate.min = filterOptions.dateRange.min.toISOString().split('T')[0];
      startDate.max = filterOptions.dateRange.max.toISOString().split('T')[0];
      
      // Set current value if exists
      if (currentFilters.dateRange && currentFilters.dateRange[0]) {
        startDate.value = currentFilters.dateRange[0].toISOString().split('T')[0];
      } else {
        startDate.value = filterOptions.dateRange.min.toISOString().split('T')[0];
      }
    }
    
    startDateContainer.appendChild(startDateLabel);
    startDateContainer.appendChild(startDate);
    
    // End date
    const endDateContainer = document.createElement('div');
    const endDateLabel = document.createElement('span');
    endDateLabel.textContent = 'To:';
    endDateLabel.className = 'date-label';
    
    const endDate = document.createElement('input');
    endDate.type = 'date';
    endDate.className = 'date-input';
    
    if (filterOptions.dateRange && filterOptions.dateRange.max) {
      endDate.min = filterOptions.dateRange.min.toISOString().split('T')[0];
      endDate.max = filterOptions.dateRange.max.toISOString().split('T')[0];
      
      // Set current value if exists
      if (currentFilters.dateRange && currentFilters.dateRange[1]) {
        endDate.value = currentFilters.dateRange[1].toISOString().split('T')[0];
      } else {
        endDate.value = filterOptions.dateRange.max.toISOString().split('T')[0];
      }
    }
    
    endDateContainer.appendChild(endDateLabel);
    endDateContainer.appendChild(endDate);
    
    dateContainer.appendChild(startDateContainer);
    dateContainer.appendChild(endDateContainer);
    filterGroup.appendChild(dateContainer);
    
    // Store references to elements
    this.elements.startDate = startDate;
    this.elements.endDate = endDate;
    
    // Add event listeners
    startDate.addEventListener('change', () => this.updateDateRange());
    endDate.addEventListener('change', () => this.updateDateRange());
    
    parent.appendChild(filterGroup);
  }
  
  /**
   * Create lender filter
   * @param {HTMLElement} parent - Parent element to append to
   * @param {Object} filterOptions - Available filter options
   * @param {Object} currentFilters - Current filter values
   * @private
   */
  createLenderFilter(parent, filterOptions, currentFilters) {
    const filterGroup = document.createElement('div');
    filterGroup.className = 'filter-group';
    
    const label = document.createElement('label');
    label.textContent = 'Lenders';
    filterGroup.appendChild(label);
    
    const select = document.createElement('select');
    select.multiple = true;
    select.className = 'multi-select';
    
    // Add placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.disabled = true;
    placeholderOption.textContent = 'Select lenders...';
    select.appendChild(placeholderOption);
    
    // Add lender options
    if (filterOptions.lenders && filterOptions.lenders.length > 0) {
      filterOptions.lenders.forEach(lender => {
        const option = document.createElement('option');
        option.value = lender;
        option.textContent = lender;
        
        // Check if selected
        if (currentFilters.lenders && currentFilters.lenders.includes(lender)) {
          option.selected = true;
        }
        
        select.appendChild(option);
      });
    }
    
    filterGroup.appendChild(select);
    
    // Store reference to element
    this.elements.lenderSelect = select;
    
    // Add event listener
    select.addEventListener('change', () => {
      const selectedLenders = Array.from(select.selectedOptions).map(option => option.value);
      this.filterManager.updateFilter('lenders', selectedLenders);
    });
    
    parent.appendChild(filterGroup);
  }
  
  /**
   * Create LTV range filter
   * @param {HTMLElement} parent - Parent element to append to
   * @param {Object} filterOptions - Available filter options
   * @param {Object} currentFilters - Current filter values
   * @private
   */
  createLTVRangeFilter(parent, filterOptions, currentFilters) {
    const filterGroup = document.createElement('div');
    filterGroup.className = 'filter-group';
    
    const label = document.createElement('label');
    label.textContent = 'LTV Range';
    filterGroup.appendChild(label);
    
    const select = document.createElement('select');
    select.className = 'select';
    
    // Add LTV range options
    if (filterOptions.ltvRanges && filterOptions.ltvRanges.length > 0) {
      filterOptions.ltvRanges.forEach(range => {
        const option = document.createElement('option');
        option.value = range.value;
        option.textContent = range.label;
        
        // Check if selected
        if (currentFilters.ltvRange === range.value) {
          option.selected = true;
        }
        
        select.appendChild(option);
      });
    }
    
    filterGroup.appendChild(select);
    
    // Store reference to element
    this.elements.ltvRangeSelect = select;
    
    // Add event listener
    select.addEventListener('change', () => {
      this.filterManager.updateFilter('ltvRange', select.value);
    });
    
    parent.appendChild(filterGroup);
  }
  
  /**
   * Create premium bands filter
   * @param {HTMLElement} parent - Parent element to append to
   * @param {Object} filterOptions - Available filter options
   * @param {Object} currentFilters - Current filter values
   * @private
   */
  createPremiumBandsFilter(parent, filterOptions, currentFilters) {
    const filterGroup = document.createElement('div');
    filterGroup.className = 'filter-group';
    
    const label = document.createElement('label');
    label.textContent = 'Premium Bands';
    filterGroup.appendChild(label);
    
    const select = document.createElement('select');
    select.multiple = true;
    select.className = 'multi-select';
    
    // Add placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.disabled = true;
    placeholderOption.textContent = 'Select premium bands...';
    select.appendChild(placeholderOption);
    
    // Add premium band options
    if (filterOptions.premiumBands && filterOptions.premiumBands.length > 0) {
      filterOptions.premiumBands.forEach(band => {
        const option = document.createElement('option');
        option.value = band;
        option.textContent = band;
        
        // Check if selected
        if (currentFilters.premiumBands && currentFilters.premiumBands.includes(band)) {
          option.selected = true;
        }
        
        select.appendChild(option);
      });
    }
    
    filterGroup.appendChild(select);
    
    // Store reference to element
    this.elements.premiumBandsSelect = select;
    
    // Add event listener
    select.addEventListener('change', () => {
      const selectedBands = Array.from(select.selectedOptions).map(option => option.value);
      this.filterManager.updateFilter('premiumBands', selectedBands);
    });
    
    parent.appendChild(filterGroup);
  }
  
  /**
   * Create purchase types filter
   * @param {HTMLElement} parent - Parent element to append to
   * @param {Object} filterOptions - Available filter options
   * @param {Object} currentFilters - Current filter values
   * @private
   */
  createPurchaseTypesFilter(parent, filterOptions, currentFilters) {
    const filterGroup = document.createElement('div');
    filterGroup.className = 'filter-group';
    
    const label = document.createElement('label');
    label.textContent = 'Purchase Types';
    filterGroup.appendChild(label);
    
    const select = document.createElement('select');
    select.multiple = true;
    select.className = 'multi-select';
    
    // Add placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.disabled = true;
    placeholderOption.textContent = 'Select purchase types...';
    select.appendChild(placeholderOption);
    
    // Add purchase type options
    if (filterOptions.purchaseTypes && filterOptions.purchaseTypes.length > 0) {
      filterOptions.purchaseTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        
        // Check if selected
        if (currentFilters.purchaseTypes && currentFilters.purchaseTypes.includes(type)) {
          option.selected = true;
        }
        
        select.appendChild(option);
      });
    }
    
    filterGroup.appendChild(select);
    
    // Store reference to element
    this.elements.purchaseTypesSelect = select;
    
    // Add event listener
    select.addEventListener('change', () => {
      const selectedTypes = Array.from(select.selectedOptions).map(option => option.value);
      this.filterManager.updateFilter('purchaseTypes', selectedTypes);
    });
    
    parent.appendChild(filterGroup);
  }
  
  /**
   * Update date range filter
   * @private
   */
  updateDateRange() {
    const startDate = this.elements.startDate.value ? new Date(this.elements.startDate.value) : null;
    let endDate = this.elements.endDate.value ? new Date(this.elements.endDate.value) : null;
    
    // Ensure end date is not before start date
    if (startDate && endDate && startDate > endDate) {
      this.elements.endDate.value = this.elements.startDate.value;
      endDate = new Date(startDate);
    }
    
    this.filterManager.updateFilter('dateRange', [startDate, endDate]);
  }
  
  /**
   * Reset all filters to default values
   */
  resetFilters() {
    this.filterManager.resetFilters();
    this.render(); // Re-render with default values
  }
  
  /**
   * Update filter options when data changes
   * @private
   */
  updateFilterOptions() {
    // Only re-render if container exists and we're not already rendering
    if (this.container && !this.isRendering) {
      this.render();
    }
  }
}
