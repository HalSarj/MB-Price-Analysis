/**
 * MarketShareTable.js
 * Renders a table displaying market share analysis, segmented by premium bands and LTV.
 */
import { formatCurrency, formatPercentage } from '../utils/formatUtils.js';
import { COLUMN_MAP } from '../data/ColumnMapper.js';
import { TabulatorFull as Tabulator } from 'tabulator-tables';

// Standalone helper sorter function for columns with {amount, percentage} objects
const customAmountSorter = (a, b, aRow, bRow, column, dir, sorterParams) => {
  // a, b are the cell values {amount, percentage} or potentially other types if data is inconsistent
  const valA = a && typeof a.amount === 'number' ? a.amount : (dir === "asc" ? Infinity : -Infinity);
  const valB = b && typeof b.amount === 'number' ? b.amount : (dir === "asc" ? Infinity : -Infinity);
  return valA - valB;
};

/**
 * MarketShareTable.js
 * Renders a table displaying market share analysis, segmented by premium bands and LTV.
 */
export class MarketShareTable {
  constructor(containerId, stateManager) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.table = null;
    this.stateManager = stateManager;
    this.isLoading = false;

    if (!this.container) {
      console.error(`MarketShareTable: Container with ID '${containerId}' not found.`);
      return;
    }
    // Ensure the custom formatter is bound correctly
    this.marketShareCellFormatter = this.marketShareCellFormatter.bind(this);
  }

  /**
   * Calculates market share based on provided data and selected premium bands, segmented by LTV.
   * @param {Array<Object>} data - The dataset to analyze (typically filtered).
   * @param {Array<string>} selectedPremiumBands - Array of premium band strings to include.
   * @returns {Object} Aggregated market share data.
   */
  calculateMarketShare(data, selectedPremiumBands) {
    console.log('[MarketShareTable.calculateMarketShare] Starting calculation with data:', data, 'and bands:', selectedPremiumBands);
    const lenderData = {}; // Stores { lender: { band: { ltv_segment: { amount, count }, total: { amount, count } }, overall_total: { ltv_segment: ..., total: ... } } }
    const bandTotals = {}; // Stores { band: { ltv_segment: { amount, count }, total: { amount, count } } }
    const overallTotals = { // Grand totals across all selected bands and lenders
      total: { amount: 0, count: 0 },
      ltv_under_80: { amount: 0, count: 0 },
      ltv_over_80: { amount: 0, count: 0 },
    };
    const uniqueLenders = new Set();

    if (!data || data.length === 0 || !selectedPremiumBands || selectedPremiumBands.length === 0) {
      return {
        lenderData,
        bandTotals,
        overallTotals,
        uniqueLenders: [],
        selectedPremiumBands: selectedPremiumBands || [],
      };
    }

    data.forEach(record => {
      const lender = record[COLUMN_MAP.lender];
      const premiumBand = record.PremiumBand; // Assuming PremiumBand is already standardized
      const loanAmount = parseFloat(record[COLUMN_MAP.loanAmount]) || 0;
      const ltv = parseFloat(record[COLUMN_MAP.ltv]);

      if (!lender || !premiumBand || !selectedPremiumBands.includes(premiumBand) || isNaN(loanAmount)) {
        return;
      }

      uniqueLenders.add(lender);

      // Initialize structures if not present
      lenderData[lender] = lenderData[lender] || { overall_total: { total: { amount: 0, count: 0 }, ltv_under_80: { amount: 0, count: 0 }, ltv_over_80: { amount: 0, count: 0 } } };
      lenderData[lender][premiumBand] = lenderData[lender][premiumBand] || {
        total: { amount: 0, count: 0 },
        ltv_under_80: { amount: 0, count: 0 },
        ltv_over_80: { amount: 0, count: 0 },
      };
      bandTotals[premiumBand] = bandTotals[premiumBand] || {
        total: { amount: 0, count: 0 },
        ltv_under_80: { amount: 0, count: 0 },
        ltv_over_80: { amount: 0, count: 0 },
      };

      const ltvSegment = !isNaN(ltv) && ltv < 80 ? 'ltv_under_80' : 'ltv_over_80';

      // Aggregate for lender-premiumBand-ltvSegment
      lenderData[lender][premiumBand][ltvSegment].amount += loanAmount;
      lenderData[lender][premiumBand][ltvSegment].count++;

      // Aggregate for lender-premiumBand total
      lenderData[lender][premiumBand].total.amount += loanAmount;
      lenderData[lender][premiumBand].total.count++;
      
      // Aggregate for lender overall total by LTV segment and grand total
      lenderData[lender].overall_total[ltvSegment].amount += loanAmount;
      lenderData[lender].overall_total[ltvSegment].count++;
      lenderData[lender].overall_total.total.amount += loanAmount;
      lenderData[lender].overall_total.total.count++;

      // Aggregate for bandTotals by LTV segment
      bandTotals[premiumBand][ltvSegment].amount += loanAmount;
      bandTotals[premiumBand][ltvSegment].count++;

      // Aggregate for bandTotals total
      bandTotals[premiumBand].total.amount += loanAmount;
      bandTotals[premiumBand].total.count++;

      // Aggregate for overallTotals by LTV segment
      overallTotals[ltvSegment].amount += loanAmount;
      overallTotals[ltvSegment].count++;

      // Aggregate for overallTotals total
      overallTotals.total.amount += loanAmount;
      overallTotals.total.count++;
    });

    console.log('[MarketShareTable.calculateMarketShare] Calculation result:', { lenderData, bandTotals, overallTotals, uniqueLenders: Array.from(uniqueLenders), selectedPremiumBands });
    return {
      lenderData,
      bandTotals,
      overallTotals,
      uniqueLenders: Array.from(uniqueLenders).sort(),
      selectedPremiumBands,
    };
  }

  /**
   * Custom Tabulator cell formatter for market share data.
   * Displays amount, percentage bar, and percentage text.
   * @param {Object} cell - Tabulator cell component.
   * @param {Object} formatterParams - Parameters passed to the formatter.
   * @param {boolean} formatterParams.isTotalColumn - True if the cell is in an overall total column (for different bar color).
   * @returns {string} HTML string for the cell content.
   */
  marketShareCellFormatter(cell, formatterParams = {}) {
    const cellValue = cell.getValue();
    if (!cellValue || typeof cellValue.amount !== 'number' || typeof cellValue.percentage !== 'number') {
      return '<div style="padding: 4px; text-align: right;">-</div>'; // Minimal padding for empty cells
    }

    const amount = cellValue.amount;
    const rawPercentage = cellValue.percentage; // Expected 0 to 1
    const displayPercentage = rawPercentage * 100;

    const formattedAmount = formatCurrency(amount, true);
    const formattedPercentageText = formatPercentage(displayPercentage);

    let barColor = 'var(--brand-blue-400, #003399)'; // Standard bar
    if (formatterParams.isTotalColumn) {
        barColor = 'var(--success, #28a745)'; 
    } else if (formatterParams.isOverallTotalBandColumn) {
        barColor = 'var(--info, #17a2b8)'; 
    }
    const rowData = cell.getRow().getData();
    if (rowData.lenderName === "Total Market") {
        barColor = 'var(--success, #28a745)';
    }

    const barWidthPercentage = Math.min(100, Math.max(0, rawPercentage * 100));

    // Return the HTML structure for the cell
    // The main container 'market-share-cell-inner' uses flexbox to align content.
    // It's set to width: 100% to fill the parent cell's content area.
    // Padding is adjusted for compactness and to accommodate the bar.
    return `
      <div class="market-share-cell-inner" style="width: 100%; position: relative; padding: 3px 8px 8px 8px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center;">
        <div class="data-text-container" style="text-align: right; line-height: 1.1; margin-bottom: 2px;">
          <div class="amount" style="font-weight: 500; font-size: 0.8em;">${formattedAmount}</div>
          <div class="percentage-text" style="font-size: 0.7em; color: #555;">${formattedPercentageText}</div>
        </div>
        <div class="percentage-bar-horizontal-container" style="position: absolute; bottom: 2px; left: 0; width: 100%; height: 3px; background-color: #e9ecef; border-radius: 1.5px; overflow: hidden;">
          <div class="percentage-bar-horizontal" style="width: ${barWidthPercentage}%; height: 100%; background-color: ${barColor};"></div>
        </div>
      </div>
    `;
  }

  /**
   * Generates column definitions for the Tabulator table based on selected premium bands.
   * @param {Array<string>} selectedPremiumBands - Array of premium band strings.
   * @returns {Array<Object>} Tabulator column definitions.
   * @private
   */
  _generateTableColumns(selectedPremiumBands) {
    const columns = [
      {
        title: "Lender",
        field: "lenderName",
        frozen: true, // Keep lender column frozen
        width: 180, // Fixed width
        headerSortStartingDir: "asc",
        cssClass: "lender-cell",
        headerHozAlign: "left",
        hozAlign: "left",
        tooltip: function(cell){
          const data = cell.getData();
          if (data.lenderName === "Total Market") {
            return "Aggregated total for all lenders in the selection.";
          }
          return cell.getValue();
        },
        bottomCalc: "count",
        headerWordWrap: false, // Prevent header text wrapping
      }
    ];

    // Dynamically add columns for each selected premium band
    selectedPremiumBands.forEach(band => {
      const bandColumnGroup = {
        title: band, // e.g., "160-180 bps"
        headerHozAlign: "center", // Center align the group header
        headerWordWrap: false, // Prevent header text wrapping
        cssClass: "premium-band-column-group", // Add class for styling
        columns: [
          {
            title: "Total",
            field: `pb_${band}_total`,
            sorter: customAmountSorter,
            headerSortStartingDir: "desc",
            formatter: this.marketShareCellFormatter,
            formatterParams: { isTotalColumn: false, isOverallTotalBandColumn: false }, // Standard band total
            hozAlign: "right", // Align cell content (the inner div) to the right
            headerHozAlign: "right",
            width: 110, // Fixed width
            tooltip: (e, cell) => `Total for ${band}`,
          },
          {
            title: "<80% LTV",
            field: `pb_${band}_ltv_under_80`,
            sorter: customAmountSorter,
            headerSortStartingDir: "desc",
            formatter: this.marketShareCellFormatter,
            formatterParams: { isTotalColumn: false, isOverallTotalBandColumn: false }, // Standard band LTV
            hozAlign: "right",
            headerHozAlign: "right",
            width: 110, // Fixed width
            tooltip: (e, cell) => `Less than 80% LTV for ${band}`,
          },
          {
            title: ">=80% LTV",
            field: `pb_${band}_ltv_over_80`,
            sorter: customAmountSorter,
            headerSortStartingDir: "desc",
            formatter: this.marketShareCellFormatter,
            formatterParams: { isTotalColumn: false, isOverallTotalBandColumn: false }, // Standard band LTV
            hozAlign: "right",
            headerHozAlign: "right",
            width: 110, // Fixed width
            tooltip: (e, cell) => `Greater than or equal to 80% LTV for ${band}`,
          }
        ]
      };
      columns.push(bandColumnGroup);
    });

    // Add Overall Total columns (Selected Bands)
    columns.push({
      title: "Total Market (Selected Bands)",
      headerHozAlign: "center", // Center align the group header
      headerWordWrap: false, // Prevent header text wrapping
      cssClass: "total-market-column-group", // Add class for styling
      columns: [
        {
          title: "Total",
          field: "overall_total_total",
          sorter: customAmountSorter,
          headerSortStartingDir: "desc",
          formatter: this.marketShareCellFormatter,
          formatterParams: { isTotalColumn: true, isOverallTotalBandColumn: true }, 
          cssClass: "overall-total-column",
          hozAlign: "right",
          headerHozAlign: "right",
          width: 110, // Fixed width
          tooltip: (e, cell) => `Overall total across selected bands`,
        },
        {
          title: "<80% LTV",
          field: "overall_total_ltv_under_80",
          sorter: customAmountSorter,
          headerSortStartingDir: "desc",
          formatter: this.marketShareCellFormatter,
          formatterParams: { isTotalColumn: false, isOverallTotalBandColumn: true }, 
          cssClass: "overall-total-ltv-column",
          hozAlign: "right",
          headerHozAlign: "right",
          width: 110, // Fixed width
          tooltip: (e, cell) => `Overall total for <80% LTV across selected bands`,
        },
        {
          title: ">=80% LTV",
          field: "overall_total_ltv_over_80",
          sorter: customAmountSorter,
          headerSortStartingDir: "desc",
          formatter: this.marketShareCellFormatter,
          formatterParams: { isTotalColumn: false, isOverallTotalBandColumn: true }, 
          cssClass: "overall-total-ltv-column",
          hozAlign: "right",
          headerHozAlign: "right",
          width: 110, // Fixed width
          tooltip: (e, cell) => `Overall total for >=80% LTV across selected bands`,
        }
      ]
    });

    return columns;
  }

  /**
   * Transforms aggregated market share data and renders it in a Tabulator table.
   * @param {Object} marketShareData - The output from calculateMarketShare.
   */
  render(marketShareData) {
    if (!this.container) return;
    if (this.isLoading) {
        console.log('[MarketShareTable] Already loading, render call skipped.');
        return;
    }
    this.isLoading = true;
    console.log('[MarketShareTable.render] Rendering with data:', marketShareData);

    // Define the list of premium bands to display (from the screenshot)
    // Note: Format matches the selectedPremiumBands format (without 'bps' suffix)
    const visiblePremiumBands = [
      '-20-0', '0-20', '20-40', '40-60', '60-80', 
      '80-100', '100-120', '120-140', '140-160', '160-180', '180-200',
      '200-220', '220-240', '240-260', '260-280', '280-300', '300-320',
      '320-340', '340-360', '360-380', '380-400', '400-420', '420-440',
      '440-460', '460-480', '480-500', '500-520', '520-540'
    ];
    
    const { lenderData, bandTotals, overallTotals, uniqueLenders, selectedPremiumBands } = marketShareData;
    
    // Filter the selectedPremiumBands to only include the visible ones
    const filteredPremiumBands = selectedPremiumBands.filter(band => visiblePremiumBands.includes(band));
    console.log('[MarketShareTable.render] Filtered premium bands:', filteredPremiumBands);

    if (!filteredPremiumBands || filteredPremiumBands.length === 0) {
      this.container.innerHTML = '<p class="text-muted p-3">Please select one or more premium bands to see market share.</p>';
      if (this.table) this.table.destroy();
      this.table = null;
      this.isLoading = false;
      return;
    }

    const tableData = [];

    // Process each lender
    uniqueLenders.forEach(lender => {
      const row = { lenderName: lender };
      const lenderSpecificData = lenderData[lender] || {};

      filteredPremiumBands.forEach(band => {
        const lsdBand = lenderSpecificData[band] || {};
        const btBand = bandTotals[band] || { total: {amount:0}, ltv_under_80: {amount:0}, ltv_over_80: {amount:0} }; // Fallback for bandTotals

        row[`pb_${band}_total`] = {
          amount: lsdBand.total?.amount || 0,
          percentage: btBand.total?.amount > 0 ? (lsdBand.total?.amount || 0) / btBand.total.amount : 0,
        };
        row[`pb_${band}_ltv_under_80`] = {
          amount: lsdBand.ltv_under_80?.amount || 0,
          percentage: btBand.ltv_under_80?.amount > 0 ? (lsdBand.ltv_under_80?.amount || 0) / btBand.ltv_under_80.amount : 0,
        };
        row[`pb_${band}_ltv_over_80`] = {
          amount: lsdBand.ltv_over_80?.amount || 0,
          percentage: btBand.ltv_over_80?.amount > 0 ? (lsdBand.ltv_over_80?.amount || 0) / btBand.ltv_over_80.amount : 0,
        };
      });
      
      // Overall totals for the lender
      const lsoOverall = lenderSpecificData.overall_total || {};
      row['overall_total_total'] = {
        amount: lsoOverall.total?.amount || 0,
        percentage: overallTotals.total?.amount > 0 ? (lsoOverall.total?.amount || 0) / overallTotals.total.amount : 0,
      };
      row['overall_total_ltv_under_80'] = {
        amount: lsoOverall.ltv_under_80?.amount || 0,
        percentage: overallTotals.ltv_under_80?.amount > 0 ? (lsoOverall.ltv_under_80?.amount || 0) / overallTotals.ltv_under_80.amount : 0,
      };
      row['overall_total_ltv_over_80'] = {
        amount: lsoOverall.ltv_over_80?.amount || 0,
        percentage: overallTotals.ltv_over_80?.amount > 0 ? (lsoOverall.ltv_over_80?.amount || 0) / overallTotals.ltv_over_80.amount : 0,
      };

      tableData.push(row);
    });

    // Add "Total Market" row
    const totalMarketRow = { lenderName: "Total Market", cssClass: "tabulator-total-row" };
    filteredPremiumBands.forEach(band => {
      const btBand = bandTotals[band] || {};
      totalMarketRow[`pb_${band}_total`] = { amount: btBand.total?.amount || 0, percentage: btBand.total?.amount > 0 ? 1 : 0 };
      totalMarketRow[`pb_${band}_ltv_under_80`] = { amount: btBand.ltv_under_80?.amount || 0, percentage: btBand.ltv_under_80?.amount > 0 ? 1 : 0 };
      totalMarketRow[`pb_${band}_ltv_over_80`] = { amount: btBand.ltv_over_80?.amount || 0, percentage: btBand.ltv_over_80?.amount > 0 ? 1 : 0 };
    });
    totalMarketRow['overall_total_total'] = { amount: overallTotals.total?.amount || 0, percentage: overallTotals.total?.amount > 0 ? 1 : 0 };
    totalMarketRow['overall_total_ltv_under_80'] = { amount: overallTotals.ltv_under_80?.amount || 0, percentage: overallTotals.ltv_under_80?.amount > 0 ? 1 : 0 };
    totalMarketRow['overall_total_ltv_over_80'] = { amount: overallTotals.ltv_over_80?.amount || 0, percentage: overallTotals.ltv_over_80?.amount > 0 ? 1 : 0 };
    tableData.push(totalMarketRow);

    const columns = this._generateTableColumns(filteredPremiumBands);

    if (this.table) {
      // If table exists, update data and columns
      // Tabulator recommends setData before setColumns if columns might change structure significantly
      // However, to avoid flicker or re-render issues, setColumns first if structure is different
      this.table.setColumns(columns); 
      this.table.setData(tableData);
    } else {
      // Clear the container once
      this.container.innerHTML = '';
      
      // Simple approach: use a div with horizontal scrolling
      const scrollContainer = document.createElement('div');
      scrollContainer.style.width = '100%';
      scrollContainer.style.overflowX = 'auto';
      this.container.appendChild(scrollContainer);
      
      // Create a table container with fixed width to prevent layout shifts
      const tableContainer = document.createElement('div');
      tableContainer.style.width = 'max-content'; // Allow table to determine its natural width
      scrollContainer.appendChild(tableContainer);
      
      this.table = new Tabulator(tableContainer, {
        data: tableData,
        columns: columns,
        layout: "fitData", // Use fitData for proper column sizing
        height: "600px", // Fixed height to ensure scrollability
        placeholder: "No market share data to display for the current selection.",
        movableColumns: false, // Disable movable columns
        resizableColumns: false, // Disable column resizing
        headerVisible: true, // Ensure headers are visible
        virtualDomHoz: false, // Disable horizontal virtual DOM
        columnCalcs: false, // Disable column calculations for better performance
        headerSort: true,
        initialSort: [{ column: "overall_total_total", dir: "desc" }],
        frozenRows: 0,
        autoResize: false,
        columnDefaults: {
          headerSort: true, // Enable sorting by default on columns unless specified
          tooltip: true,
          resizable: true,
          headerTooltip: true, // Enable tooltips for headers
          headerHozAlign: "center", // Align header text horizontally
          vertAlign: "middle", // Vertically align cell content
        },
        // Add CSS classes for more granular styling control via external CSS if needed
        classes: {
            table: 'market-share-tabulator-table',
            header: 'market-share-tabulator-header',
            row: 'market-share-tabulator-row',
            headerRow: 'market-share-tabulator-header-row',
            headerColumn: 'market-share-tabulator-header-column',
        },
        responsiveLayout: false, // Disable responsive layout to maintain header alignment
        rowFormatter: function(row){
            const element = row.getElement();
            // Style for the 'Total Market' row
            if(row.getData().lenderName == "Total Market"){
                element.style.fontWeight = "bold";
                element.style.backgroundColor = "var(--table-total-row-bg, #e9ecef)";
                element.style.borderTop = "2px solid var(--table-total-row-border, #dee2e6)";
            }
            // Reduce default cell padding by Tabulator if possible, or rely on cell content's own padding
            // This might be better handled by CSS for .tabulator-cell
            // element.childNodes.forEach(cellElement => {
            //     cellElement.style.padding = '0px'; // Attempt to remove default cell padding
            // });
        }
      });
    }
    this.isLoading = false;
    console.log('[MarketShareTable.render] Table rendered/updated.');
  }

  // Helper to show a loading state (optional, if complex renders take time)
  showLoading() {
    this.isLoading = true;
    // You might want to show a visual loading indicator in the container
    this.container.innerHTML = '<div class="loading-indicator p-5"><div class="spinner"></div> Loading market share table...</div>';
  }

  // Helper to hide loading state
  hideLoading() {
    this.isLoading = false;
    // Remove visual loading indicator if one was added
  }

  destroy() {
    if (this.table) {
      this.table.destroy();
      this.table = null;
    }
    this.container.innerHTML = ''; // Clear container
    console.log('[MarketShareTable] Destroyed.');
  }
}
