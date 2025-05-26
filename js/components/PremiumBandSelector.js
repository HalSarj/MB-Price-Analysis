/**
 * PremiumBandSelector.js
 * Component for selecting premium bands for market share analysis.
 */

export class PremiumBandSelector {
  constructor(container, stateManager) {
    this.container = container;
    this.stateManager = stateManager;
    this.selectedBands = [];
    this.applyAnalysisButton = null; // Initialize property
    // The PRD doesn't specify initial availableBands, 
    // assuming they will be passed during the first render call.
  }

  render(availableBands) {
    if (!availableBands || availableBands.length === 0) {
      this.container.innerHTML = '<p>No premium bands available for selection.</p>';
      return;
    }
    
    // Define the list of premium bands to display (only up to 540bps as requested)
    const visiblePremiumBands = [
      '-20-0', '0-20', '20-40', '40-60', '60-80', 
      '80-100', '100-120', '120-140', '140-160', '160-180', '180-200',
      '200-220', '220-240', '240-260', '260-280', '280-300', '300-320',
      '320-340', '340-360', '360-380', '380-400', '400-420', '420-440',
      '440-460', '460-480', '480-500', '500-520', '520-540'
    ];
    
    // Filter the available bands to only include the visible ones
    const filteredBands = availableBands.filter(band => visiblePremiumBands.includes(band));
    console.log('[PremiumBandSelector.render] Filtered bands:', filteredBands);
    
    // Store filtered bands for other methods if needed
    this.filteredBands = filteredBands;

    this.container.innerHTML = `
      <div class="premium-band-selector">
        <h3>Select Premium Bands for Market Share Analysis</h3>
        <div class="band-chips-container">
          ${this.filteredBands.map(band => `
            <div class="premium-band-chip" data-band="${band}">
              <span class="checkmark">✓</span>
              ${band}bps
            </div>
          `).join('')}
        </div>
        <div class="selection-info">
          <span class="selected-count">0 selected</span>
          <button id="apply-market-share" class="btn btn-primary">Apply Analysis</button>
        </div>
      </div>
    `;
    
    // Store the button as an instance property
    this.applyAnalysisButton = this.container.querySelector('#apply-market-share');

    this.attachChipListeners();
    // Initialize selection state based on current this.selectedBands (e.g., if re-rendering with existing selection)
    this.updateChipsFromSelection(); 
  }

  attachChipListeners() {
    this.container.querySelectorAll('.premium-band-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
        this.updateSelection();
      });
    });

    // The main logic for this button is now handled by MarketShareAnalysisView.
    // This component just ensures the button exists and can be accessed.
    // If the component itself needed to react to the click, it would be done here.
    // For example, if it were to emit a custom event:
    // if (this.applyAnalysisButton) {
    //   this.applyAnalysisButton.addEventListener('click', () => {
    //     // this.container.dispatchEvent(new CustomEvent('applyAnalysis', { detail: { selectedBands: this.selectedBands } }));
    //   });
    // }
  }

  updateSelection() {
    this.selectedBands = [];
    this.container.querySelectorAll('.premium-band-chip.selected').forEach(chip => {
      this.selectedBands.push(chip.dataset.band);
    });

    const countDisplay = this.container.querySelector('.selected-count');
    if (countDisplay) {
      countDisplay.textContent = `${this.selectedBands.length} selected`;
    }

    // TODO: Update global state if necessary, e.g., for live filtering or other components to react.
    // For now, selection is local until 'Apply Analysis' is clicked.
    // Example: this.stateManager.setState('filters.selectedPremiumBands', [...this.selectedBands]);
    console.log('Selected premium bands updated:', this.selectedBands);
  }
  
  updateChipsFromSelection() {
    const chips = this.container.querySelectorAll('.premium-band-chip');
    chips.forEach(chip => {
      if (this.selectedBands.includes(chip.dataset.band)) {
        chip.classList.add('selected');
      }
      else {
        chip.classList.remove('selected');
      }
    });
    // Ensure the count is also updated
    const countDisplay = this.container.querySelector('.selected-count');
    if (countDisplay) {
      countDisplay.textContent = `${this.selectedBands.length} selected`;
    }
  }

  // Method to get currently selected bands, might be useful for other components
  getSelectedBands() {
    return [...this.selectedBands];
  }

  destroy() {
    // Remove any event listeners attached by this component specifically.
    // In this case, if attachChipListeners added a listener to applyAnalysisButton directly,
    // it would be removed here. However, the primary listener is now attached by the View.
    // Chip listeners are on elements that get replaced by render, so they are implicitly cleaned up.
    // If applyAnalysisButton had an internal listener attached in attachChipListeners:
    // if (this.applyAnalysisButton && this._internalApplyListener) { // Assuming _internalApplyListener stored the function
    //   this.applyAnalysisButton.removeEventListener('click', this._internalApplyListener);
    // }
    this.container.innerHTML = '';
  }
}
