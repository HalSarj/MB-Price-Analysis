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
    
    // Also subscribe to filter changes to update the UI
    this.stateManager.subscribe('filters', () => {
      // Update the UI to reflect the current filter state
      this.updateFilterSelections();
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
      
      // Create header with title
      const header = document.createElement('div');
      header.className = 'filter-header';
      
      const title = document.createElement('h3');
      title.textContent = 'Filters';
      
      header.appendChild(title);
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
      
      // Create filters row for date range
      const dateFilterRow = document.createElement('div');
      dateFilterRow.className = 'filters-row';
      panelWrapper.appendChild(dateFilterRow);
      
      // Create date range filter
      this.createDateRangeFilter(dateFilterRow, filterOptions, currentFilters);
      
      // Create filters row for other filters
      const filtersRow = document.createElement('div');
      filtersRow.className = 'filters-row';
      panelWrapper.appendChild(filtersRow);
      
      // Create lender filter
      this.createLenderFilter(filtersRow, filterOptions, currentFilters);
      
      // Create LTV range filter
      this.createLTVRangeFilter(filtersRow, filterOptions, currentFilters);
      
      // Create purchase types filter
      this.createPurchaseTypesFilter(filtersRow, filterOptions, currentFilters);
      
      // Premium bands filter is hidden as requested
      
      // Dynamically create and append Apply Filters button and spinner
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'filter-actions';

      const applyButton = document.createElement('button');
      applyButton.id = 'apply-filters-button';
      applyButton.className = 'btn btn-primary';
      applyButton.textContent = 'Apply Filters';
      actionsDiv.appendChild(applyButton);
      
      // Add Reset Filters button
      const resetButton = document.createElement('button');
      resetButton.id = 'reset-filters-button';
      resetButton.className = 'btn btn-reset';
      resetButton.textContent = 'Reset Filters';
      resetButton.addEventListener('click', () => this.resetFilters());
      actionsDiv.appendChild(resetButton);

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
    label.innerHTML += ' <span class="filter-hint">(multi-select)</span>';
    filterGroup.appendChild(label);
    
    // Create a custom multi-select container
    const multiSelectContainer = document.createElement('div');
    multiSelectContainer.className = 'custom-multi-select';
    
    // Create a list for options instead of a select element
    const optionsList = document.createElement('div');
    optionsList.className = 'options-list';
    optionsList.id = 'lenders-options-list';
    
    // Add 'All Lenders' option
    const allLendersItem = document.createElement('div');
    allLendersItem.className = 'option-item';
    allLendersItem.dataset.value = 'all_lenders';
    
    const allLendersCheckbox = document.createElement('input');
    allLendersCheckbox.type = 'checkbox';
    allLendersCheckbox.id = 'lender-all_lenders';
    allLendersCheckbox.value = 'all_lenders';
    
    // Check if no lenders are selected or 'all_lenders' is selected
    if (!currentFilters.lenders || currentFilters.lenders.length === 0 || 
        (currentFilters.lenders && currentFilters.lenders.includes('all_lenders'))) {
      allLendersCheckbox.checked = true;
    }
    
    const allLendersLabel = document.createElement('label');
    allLendersLabel.htmlFor = 'lender-all_lenders';
    allLendersLabel.textContent = 'All Lenders';
    
    allLendersItem.appendChild(allLendersCheckbox);
    allLendersItem.appendChild(allLendersLabel);
    optionsList.appendChild(allLendersItem);
    
    // Add lender options
    if (filterOptions.lenders && filterOptions.lenders.length > 0) {
      filterOptions.lenders.forEach(lender => {
        const optionItem = document.createElement('div');
        optionItem.className = 'option-item';
        optionItem.dataset.value = lender;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `lender-${lender.replace(/\s+/g, '-')}`;
        checkbox.value = lender;
        
        // Check if selected
        if (currentFilters.lenders && currentFilters.lenders.includes(lender)) {
          checkbox.checked = true;
        }
        
        const optionLabel = document.createElement('label');
        optionLabel.htmlFor = checkbox.id;
        optionLabel.textContent = lender;
        
        optionItem.appendChild(checkbox);
        optionItem.appendChild(optionLabel);
        optionsList.appendChild(optionItem);
      });
    }
    
    multiSelectContainer.appendChild(optionsList);
    filterGroup.appendChild(multiSelectContainer);
    
    // Store reference to checkboxes
    this.elements.lenderCheckboxes = optionsList.querySelectorAll('input[type="checkbox"]');
    
    // Add event listeners to checkboxes
    this.elements.lenderCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', this.handleLenderCheckboxChange.bind(this));
      
      // Add selected class to initially selected items
      if (checkbox.checked) {
        const optionItem = checkbox.closest('.option-item');
        if (optionItem) {
          optionItem.classList.add('selected');
        }
      }
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
    label.innerHTML += ' <span class="filter-hint">(multi-select)</span>';
    filterGroup.appendChild(label);
    
    // Create a custom multi-select container
    const multiSelectContainer = document.createElement('div');
    multiSelectContainer.className = 'custom-multi-select';
    
    // Create a list for options instead of a select element
    const optionsList = document.createElement('div');
    optionsList.className = 'options-list';
    optionsList.id = 'purchase-types-options-list';
    
    // Add 'All Purchase Types' option
    const allTypesItem = document.createElement('div');
    allTypesItem.className = 'option-item';
    allTypesItem.dataset.value = 'all_purchase_types';
    
    const allTypesCheckbox = document.createElement('input');
    allTypesCheckbox.type = 'checkbox';
    allTypesCheckbox.id = 'purchase-type-all';
    allTypesCheckbox.value = 'all_purchase_types';
    
    // Check if no purchase types are selected or 'all_purchase_types' is selected
    if (!currentFilters.purchaseTypes || currentFilters.purchaseTypes.length === 0 || 
        (currentFilters.purchaseTypes && currentFilters.purchaseTypes.includes('all_purchase_types'))) {
      allTypesCheckbox.checked = true;
    }
    
    const allTypesLabel = document.createElement('label');
    allTypesLabel.htmlFor = 'purchase-type-all';
    allTypesLabel.textContent = 'All Purchase Types';
    
    allTypesItem.appendChild(allTypesCheckbox);
    allTypesItem.appendChild(allTypesLabel);
    optionsList.appendChild(allTypesItem);
    
    // Add purchase type options
    if (filterOptions.purchaseTypes && filterOptions.purchaseTypes.length > 0) {
      filterOptions.purchaseTypes.forEach(type => {
        const optionItem = document.createElement('div');
        optionItem.className = 'option-item';
        optionItem.dataset.value = type;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `purchase-type-${type.replace(/\s+/g, '-')}`;
        checkbox.value = type;
        
        // Check if selected
        if (currentFilters.purchaseTypes && currentFilters.purchaseTypes.includes(type)) {
          checkbox.checked = true;
        }
        
        const optionLabel = document.createElement('label');
        optionLabel.htmlFor = checkbox.id;
        optionLabel.textContent = type;
        
        optionItem.appendChild(checkbox);
        optionItem.appendChild(optionLabel);
        optionsList.appendChild(optionItem);
      });
    }
    
    multiSelectContainer.appendChild(optionsList);
    filterGroup.appendChild(multiSelectContainer);
    
    // Store reference to checkboxes
    this.elements.purchaseTypeCheckboxes = optionsList.querySelectorAll('input[type="checkbox"]');
    
    // Add event listeners to checkboxes
    this.elements.purchaseTypeCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', this.handlePurchaseTypeCheckboxChange.bind(this));
      
      // Add selected class to initially selected items
      if (checkbox.checked) {
        const optionItem = checkbox.closest('.option-item');
        if (optionItem) {
          optionItem.classList.add('selected');
        }
      }
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
    // Get current filter options
    let filterOptions;
    try {
      filterOptions = this.filterManager.getFilterOptions();
    } catch (error) {
      console.error('Error getting filter options:', error);
      filterOptions = this.filterManager.getDefaultFilterOptions();
    }
    
    const currentFilters = this.stateManager.state.filters;
    
    // Update lenders list without full re-render if possible
    if (this.elements.lenderCheckboxes && !this.isRendering) {
      const lendersContainer = document.getElementById('lenders-options-list');
      if (lendersContainer) {
        // Keep the 'All Lenders' option
        const allLendersItem = lendersContainer.querySelector('.option-item[data-value="all_lenders"]');
        
        // Clear existing lender options except 'All Lenders'
        const lenderItems = lendersContainer.querySelectorAll('.option-item:not([data-value="all_lenders"])');
        lenderItems.forEach(item => item.remove());
        
        // Add all available lenders
        if (filterOptions.lenders && filterOptions.lenders.length > 0) {
          filterOptions.lenders.forEach(lender => {
            // Skip if this lender already exists
            if (lendersContainer.querySelector(`.option-item[data-value="${lender}"]`)) {
              return;
            }
            
            const optionItem = document.createElement('div');
            optionItem.className = 'option-item';
            optionItem.dataset.value = lender;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `lender-${lender.replace(/\s+/g, '-')}`;
            checkbox.value = lender;
            
            // Check if selected
            if (currentFilters.lenders && currentFilters.lenders.includes(lender)) {
              checkbox.checked = true;
              optionItem.classList.add('selected');
            }
            
            const optionLabel = document.createElement('label');
            optionLabel.htmlFor = checkbox.id;
            optionLabel.textContent = lender;
            
            optionItem.appendChild(checkbox);
            optionItem.appendChild(optionLabel);
            lendersContainer.appendChild(optionItem);
            
            // Add event listener to the checkbox
            checkbox.addEventListener('change', this.handleLenderCheckboxChange.bind(this));
          });
        }
        
        // Update references to checkboxes
        this.elements.lenderCheckboxes = lendersContainer.querySelectorAll('input[type="checkbox"]');
        return;
      }
    }
    
    // If we can't update just the lenders, do a full re-render
    if (this.container && !this.isRendering) {
      this.render();
    }
  }
  
  /**
   * Handle lender checkbox change event
   * @param {Event} event - The change event
   * @private
   */
  handleLenderCheckboxChange(event) {
    const checkbox = event.target;
    const optionItem = checkbox.closest('.option-item');
    
    // Toggle the selected class based on checkbox state
    if (checkbox.checked) {
      optionItem.classList.add('selected');
    } else {
      optionItem.classList.remove('selected');
    }
    
    // Handle 'All Lenders' selection
    if (checkbox.value === 'all_lenders') {
      if (checkbox.checked) {
        // If 'All Lenders' is selected, uncheck other options
        this.elements.lenderCheckboxes.forEach(cb => {
          if (cb.value !== 'all_lenders') {
            cb.checked = false;
            const item = cb.closest('.option-item');
            if (item) item.classList.remove('selected');
          }
        });
        this.filterManager.updateFilter('lenders', ['all_lenders']);
      } else {
        // If 'All Lenders' is unchecked and there are no other selections, check it again
        const anySelected = Array.from(this.elements.lenderCheckboxes)
          .some(cb => cb.checked && cb.value !== 'all_lenders');
          
        if (!anySelected) {
          checkbox.checked = true;
          optionItem.classList.add('selected');
          this.filterManager.updateFilter('lenders', ['all_lenders']);
        } else {
          // Otherwise, let it be unchecked and update with other selections
          const selectedLenders = Array.from(this.elements.lenderCheckboxes)
            .filter(cb => cb.checked && cb.value !== 'all_lenders')
            .map(cb => cb.value);
          this.filterManager.updateFilter('lenders', selectedLenders);
        }
      }
    } else {
      // If another option is selected/deselected
      const allLendersCheckbox = document.querySelector('input[value="all_lenders"]');
      const allLendersItem = allLendersCheckbox?.closest('.option-item');
      
      if (checkbox.checked) {
        // When a specific lender is checked, uncheck 'All Lenders'
        if (allLendersCheckbox) {
          allLendersCheckbox.checked = false;
          if (allLendersItem) allLendersItem.classList.remove('selected');
        }
        
        // Get all selected lenders
        const selectedLenders = Array.from(this.elements.lenderCheckboxes)
          .filter(cb => cb.checked && cb.value !== 'all_lenders')
          .map(cb => cb.value);
          
        this.filterManager.updateFilter('lenders', selectedLenders);
      } else {
        // When a specific lender is unchecked
        const selectedLenders = Array.from(this.elements.lenderCheckboxes)
          .filter(cb => cb.checked && cb.value !== 'all_lenders')
          .map(cb => cb.value);
        
        // If no lenders are selected, check 'All Lenders'
        if (selectedLenders.length === 0 && allLendersCheckbox) {
          allLendersCheckbox.checked = true;
          if (allLendersItem) allLendersItem.classList.add('selected');
          this.filterManager.updateFilter('lenders', ['all_lenders']);
        } else {
          this.filterManager.updateFilter('lenders', selectedLenders);
        }
      }
    }
  }
  
  /**
   * Handle purchase type checkbox change event
   * @param {Event} event - The change event
   * @private
   */
  handlePurchaseTypeCheckboxChange(event) {
    const checkbox = event.target;
    const optionItem = checkbox.closest('.option-item');
    
    // Toggle the selected class based on checkbox state
    if (checkbox.checked) {
      optionItem.classList.add('selected');
    } else {
      optionItem.classList.remove('selected');
    }
    
    // Handle 'All Purchase Types' selection
    if (checkbox.value === 'all_purchase_types') {
      if (checkbox.checked) {
        // If 'All Purchase Types' is selected, uncheck other options
        this.elements.purchaseTypeCheckboxes.forEach(cb => {
          if (cb.value !== 'all_purchase_types') {
            cb.checked = false;
            const item = cb.closest('.option-item');
            if (item) item.classList.remove('selected');
          }
        });
        this.filterManager.updateFilter('purchaseTypes', ['all_purchase_types']);
      } else {
        // If 'All Purchase Types' is unchecked and there are no other selections, check it again
        const anySelected = Array.from(this.elements.purchaseTypeCheckboxes)
          .some(cb => cb.checked && cb.value !== 'all_purchase_types');
          
        if (!anySelected) {
          checkbox.checked = true;
          optionItem.classList.add('selected');
          this.filterManager.updateFilter('purchaseTypes', ['all_purchase_types']);
        } else {
          // Otherwise, let it be unchecked and update with other selections
          const selectedTypes = Array.from(this.elements.purchaseTypeCheckboxes)
            .filter(cb => cb.checked && cb.value !== 'all_purchase_types')
            .map(cb => cb.value);
          this.filterManager.updateFilter('purchaseTypes', selectedTypes);
        }
      }
    } else {
      // If another option is selected/deselected
      const allTypesCheckbox = document.querySelector('input[value="all_purchase_types"]');
      const allTypesItem = allTypesCheckbox?.closest('.option-item');
      
      if (checkbox.checked) {
        // When a specific purchase type is checked, uncheck 'All Purchase Types'
        if (allTypesCheckbox) {
          allTypesCheckbox.checked = false;
          if (allTypesItem) allTypesItem.classList.remove('selected');
        }
        
        // Get all selected purchase types
        const selectedTypes = Array.from(this.elements.purchaseTypeCheckboxes)
          .filter(cb => cb.checked && cb.value !== 'all_purchase_types')
          .map(cb => cb.value);
          
        this.filterManager.updateFilter('purchaseTypes', selectedTypes);
      } else {
        // When a specific purchase type is unchecked
        const selectedTypes = Array.from(this.elements.purchaseTypeCheckboxes)
          .filter(cb => cb.checked && cb.value !== 'all_purchase_types')
          .map(cb => cb.value);
        
        // If no purchase types are selected, check 'All Purchase Types'
        if (selectedTypes.length === 0 && allTypesCheckbox) {
          allTypesCheckbox.checked = true;
          if (allTypesItem) allTypesItem.classList.add('selected');
          this.filterManager.updateFilter('purchaseTypes', ['all_purchase_types']);
        } else {
          this.filterManager.updateFilter('purchaseTypes', selectedTypes);
        }
      }
    }
  }
  
  /**
   * Update filter selections based on current state
   * @private
   */
  updateFilterSelections() {
    const currentFilters = this.stateManager.state.filters;
    
    // Update lender checkboxes if they exist
    if (this.elements.lenderCheckboxes) {
      // First, determine if we're using 'All Lenders' or specific lenders
      const usingAllLenders = !currentFilters.lenders || 
                             currentFilters.lenders.length === 0 || 
                             currentFilters.lenders.includes('all_lenders');
      
      this.elements.lenderCheckboxes.forEach(checkbox => {
        const optionItem = checkbox.closest('.option-item');
        if (!optionItem) return;
        
        if (checkbox.value === 'all_lenders') {
          // Handle 'All Lenders' option
          checkbox.checked = usingAllLenders;
          optionItem.classList.toggle('selected', usingAllLenders);
        } else {
          // Handle specific lender options
          const isSelected = currentFilters.lenders && 
                            currentFilters.lenders.includes(checkbox.value) && 
                            !usingAllLenders;
          checkbox.checked = isSelected;
          optionItem.classList.toggle('selected', isSelected);
        }
      });
    }
    
    // Update purchase type checkboxes if they exist
    if (this.elements.purchaseTypeCheckboxes) {
      // First, determine if we're using 'All Purchase Types' or specific types
      const usingAllTypes = !currentFilters.purchaseTypes || 
                           currentFilters.purchaseTypes.length === 0 || 
                           currentFilters.purchaseTypes.includes('all_purchase_types');
      
      this.elements.purchaseTypeCheckboxes.forEach(checkbox => {
        const optionItem = checkbox.closest('.option-item');
        if (!optionItem) return;
        
        if (checkbox.value === 'all_purchase_types') {
          // Handle 'All Purchase Types' option
          checkbox.checked = usingAllTypes;
          optionItem.classList.toggle('selected', usingAllTypes);
        } else {
          // Handle specific purchase type options
          const isSelected = currentFilters.purchaseTypes && 
                            currentFilters.purchaseTypes.includes(checkbox.value) && 
                            !usingAllTypes;
          checkbox.checked = isSelected;
          optionItem.classList.toggle('selected', isSelected);
        }
      });
    }
  }
}
