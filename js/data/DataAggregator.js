/**
 * DataAggregator.js
 * Handles data aggregation and transformation for analysis
 */

import { COLUMN_MAP } from './ColumnMapper.js';

export class DataAggregator {
  /**
   * Aggregate data by premium band and month
   * @param {Array} data - Data to aggregate
   * @returns {Object} Aggregated data structure
   */
  static aggregateByPremiumBandAndMonth(data) {
    if (!data || data.length === 0) {
      return {
        premiumBands: [],
        months: [],
        data: {},
        totals: { byPremiumBand: {}, byMonth: {}, overall: 0 }
      };
    }
    
    const result = {
      premiumBands: [],
      months: [],
      data: {},
      totals: { byPremiumBand: {}, byMonth: {}, overall: 0 }
    };
    
    // Get unique premium bands (converted to basis points)
    const bands = [...new Set(data.map(r => r.PremiumBand))]
      .filter(Boolean)
      .sort((a, b) => {
        const aNum = parseInt(a.split('-')[0]);
        const bNum = parseInt(b.split('-')[0]);
        return aNum - bNum;
      });
    
    // Get unique months
    const months = [...new Set(data.map(r => {
      const date = new Date(r[COLUMN_MAP.documentDate]);
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }))].sort();
    
    // Initialize structure
    result.premiumBands = bands;
    result.months = months;
    
    bands.forEach(band => {
      result.data[band] = {};
      result.totals.byPremiumBand[band] = 0;
      months.forEach(month => {
        result.data[band][month] = 0;
      });
    });
    
    // Initialize month totals
    months.forEach(month => {
      result.totals.byMonth[month] = 0;
    });
    
    // Aggregate loan amounts
    data.forEach(record => {
      const band = record.PremiumBand;
      const recordDate = new Date(record[COLUMN_MAP.documentDate]);
      const month = `${recordDate.getFullYear()}-${(recordDate.getMonth() + 1).toString().padStart(2, '0')}`;
      const loanAmount = parseFloat(record[COLUMN_MAP.loanAmount]) || 0;
      
      if (band && months.includes(month)) {
        // Add to band/month total
        result.data[band][month] += loanAmount;
        
        // Add to premium band total
        result.totals.byPremiumBand[band] += loanAmount;
        
        // Add to month total
        result.totals.byMonth[month] += loanAmount;
        
        // Add to overall total
        result.totals.overall += loanAmount;
      }
    });
    
    return result;
  }
  
  /**
   * Calculate market share by lender and premium band
   * @param {Array} data - Data to analyze
   * @param {Array} selectedBands - Selected premium bands
   * @returns {Object} Market share analysis
   */
  static calculateMarketShare(data, selectedBands) {
    if (!data || data.length === 0 || !selectedBands || selectedBands.length === 0) {
      return {
        lenders: [],
        lenderTotals: {},
        bandTotals: {},
        overallTotal: 0
      };
    }
    
    const filteredData = data.filter(record => 
      selectedBands.includes(record.PremiumBand)
    );
    
    const lenderTotals = {};
    const bandTotals = {};
    let overallTotal = 0;
    
    // Initialize structures
    const lenders = [...new Set(filteredData.map(r => r[COLUMN_MAP.lender]))].sort();
    
    lenders.forEach(lender => {
      lenderTotals[lender] = {};
      selectedBands.forEach(band => {
        lenderTotals[lender][band] = 0;
        lenderTotals[lender][band + '_below80'] = 0;
        lenderTotals[lender][band + '_above80'] = 0;
      });
      lenderTotals[lender].total = 0;
    });
    
    selectedBands.forEach(band => {
      bandTotals[band] = 0;
      bandTotals[band + '_below80'] = 0;
      bandTotals[band + '_above80'] = 0;
    });
    
    // Aggregate data
    filteredData.forEach(record => {
      const lender = record[COLUMN_MAP.lender];
      const band = record.PremiumBand;
      const loanAmount = parseFloat(record[COLUMN_MAP.loanAmount]) || 0;
      const ltv = parseFloat(record[COLUMN_MAP.ltv]);
      
      if (lender && selectedBands.includes(band)) {
        // Add to lender/band total
        lenderTotals[lender][band] += loanAmount;
        
        // Add to lender total
        lenderTotals[lender].total += loanAmount;
        
        // Add to band total
        bandTotals[band] += loanAmount;
        
        // Add to overall total
        overallTotal += loanAmount;
        
        // LTV breakdown
        if (ltv < 80) {
          lenderTotals[lender][band + '_below80'] += loanAmount;
          bandTotals[band + '_below80'] += loanAmount;
        } else {
          lenderTotals[lender][band + '_above80'] += loanAmount;
          bandTotals[band + '_above80'] += loanAmount;
        }
      }
    });
    
    // Calculate percentages
    lenders.forEach(lender => {
      lenderTotals[lender].percentage = (lenderTotals[lender].total / overallTotal) * 100;
      
      selectedBands.forEach(band => {
        if (bandTotals[band] > 0) {
          lenderTotals[lender][band + '_pct'] = (lenderTotals[lender][band] / bandTotals[band]) * 100;
        } else {
          lenderTotals[lender][band + '_pct'] = 0;
        }
      });
    });
    
    return {
      lenders,
      lenderTotals,
      bandTotals,
      overallTotal
    };
  }
  
  /**
   * Group data by month and lender for trend analysis
   * @param {Array} data - Data to analyze
   * @param {Array} selectedBands - Selected premium bands
   * @returns {Object} Monthly data by lender
   */
  static groupByMonthAndLender(data, selectedBands) {
    if (!data || data.length === 0) {
      return {
        months: [],
        data: {}
      };
    }
    
    const filteredData = selectedBands && selectedBands.length > 0
      ? data.filter(record => selectedBands.includes(record.PremiumBand))
      : data;
    
    const monthlyData = {};
    const months = [];
    
    filteredData.forEach(record => {
      const date = new Date(record[COLUMN_MAP.documentDate]);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const lender = record[COLUMN_MAP.lender];
      const loanAmount = parseFloat(record[COLUMN_MAP.loanAmount]) || 0;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { lenders: {}, total: 0 };
        months.push({
          key: monthKey,
          label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          date: date
        });
      }
      
      if (!monthlyData[monthKey].lenders[lender]) {
        monthlyData[monthKey].lenders[lender] = 0;
      }
      
      monthlyData[monthKey].lenders[lender] += loanAmount;
      monthlyData[monthKey].total += loanAmount;
    });
    
    // Calculate percentages
    Object.keys(monthlyData).forEach(month => {
      const total = monthlyData[month].total;
      Object.keys(monthlyData[month].lenders).forEach(lender => {
        const amount = monthlyData[month].lenders[lender];
        monthlyData[month].lenders[lender + '_pct'] = (amount / total) * 100;
      });
    });
    
    return {
      months: months.sort((a, b) => a.date - b.date),
      data: monthlyData
    };
  }
}
