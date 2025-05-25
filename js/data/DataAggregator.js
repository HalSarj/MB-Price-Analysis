/**
 * DataAggregator.js
 * Handles data aggregation and transformation for analysis
 */

import { COLUMN_MAP, convertMarginBucketToBps } from './ColumnMapper.js';

// Helper function to generate all months in a date range
function getAllMonthsInRange(startDateString, endDateString) {
  const months = [];
  if (!startDateString || !endDateString) return months;

  const startDate = new Date(startDateString);
  const endDate = new Date(endDateString);

  // Ensure dates are valid
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return months;

  let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (currentDate <= endDate) {
    months.push(`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  return months;
}

export class DataAggregator {
  /**
   * Aggregate data by premium band and month
   * @param {Array} data - Data to aggregate
   * @param {Object} options - Aggregation options
   * @param {number} options.sampleSize - Maximum number of records to process for large datasets
   * @param {boolean} options.includeCountMetrics - Whether to include count metrics in addition to loan amounts
   * @param {Array<string>} options.filterDateRange - Optional: [startDate, endDate] from filters
   * @returns {Object} Aggregated data structure
   */
  static aggregateByPremiumBandAndMonth(data, options = {}) {
    // Default options
    const { 
      sampleSize = 0, // 0 means use all data
      includeCountMetrics = true,
      filterDateRange = null // New option for passing filter's date range
    } = options;
    
    // Validate input
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        premiumBands: [],
        months: [],
        data: {},
        totals: { byPremiumBand: {}, byMonth: {}, overall: 0 },
        counts: { byPremiumBand: {}, byMonth: {}, overall: 0 },
        metrics: {}
      };
    }
    
    // Performance optimization for large datasets
    let dataToProcess;
    let isSampled = false;

    if (sampleSize > 0 && data.length > sampleSize) {
      isSampled = true;
      const halfSampleSize = Math.floor(sampleSize / 2);
      const headSample = data.slice(0, halfSampleSize);
      const tailSample = data.slice(data.length - halfSampleSize, data.length);
      // Combine and remove duplicates if any (though unlikely for distinct records)
      // For simplicity here, we'll just concatenate. If primary keys were available, a Set could ensure uniqueness.
      dataToProcess = headSample.concat(tailSample);
      // If sampleSize is odd, one part might be smaller, ensure we don't exceed sampleSize significantly
      if (dataToProcess.length > sampleSize) {
        dataToProcess = dataToProcess.slice(0, sampleSize);
      }
    } else {
      dataToProcess = data; // Use all data
    }
    
    console.debug(`Aggregating ${dataToProcess.length} records${isSampled ? ' (sampled head & tail)' : ''}`);
    const startTime = performance.now();
    
    const result = {
      premiumBands: [],
      months: [], // This will be populated based on filterDateRange or data
      data: {},
      totals: { byPremiumBand: {}, byMonth: {}, overall: 0 },
      counts: { byPremiumBand: {}, byMonth: {}, overall: 0 },
      metrics: {}
    };
    
    try {
      // Get unique premium bands (converted to basis points)
      const bandSet = new Map();
      
      // Ensure each record has a PremiumBand property
      dataToProcess.forEach(r => {
        // If PremiumBand doesn't exist, create it from GrossMarginBucket
        if (!r.PremiumBand && r[COLUMN_MAP.grossMarginBucket]) {
          r.PremiumBand = convertMarginBucketToBps(r[COLUMN_MAP.grossMarginBucket]);
        }
        
        if (r.PremiumBand) bandSet.set(r.PremiumBand, true);
      });
      
      const bands = Array.from(bandSet.keys())
        .sort((a, b) => {
          try {
            const aNum = parseInt(a.split('-')[0]) || 0;
            const bNum = parseInt(b.split('-')[0]) || 0;
            return aNum - bNum;
          } catch (e) {
            return 0; // If parsing fails, don't change order
          }
        });
      
      // Determine the list of months for the report
      let effectiveMonths;
      if (filterDateRange && filterDateRange.length === 2 && filterDateRange[0] && filterDateRange[1]) {
        console.debug('[DataAggregator] Generating months from provided filterDateRange:', filterDateRange);
        effectiveMonths = getAllMonthsInRange(filterDateRange[0], filterDateRange[1]);
      } else {
        // Fallback: derive months from the data sample if no filter range is given (less ideal)
        console.warn('[DataAggregator] filterDateRange not provided or invalid. Deriving months from data sample.');
        const monthSet = new Map();
        dataToProcess.forEach(r => {
          const dateField = r[COLUMN_MAP.documentDate];
          if (dateField) {
            try {
              const date = new Date(dateField);
              if (!isNaN(date.getTime())) {
                const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                monthSet.set(month, true);
              }
            } catch (e) {
              // Skip invalid dates
            }
          }
        });
        effectiveMonths = Array.from(monthSet.keys()).sort((a, b) => {
          const [yearA, monthA] = a.split('-').map(Number);
          const [yearB, monthB] = b.split('-').map(Number);
          if (yearA !== yearB) return yearA - yearB;
          return monthA - monthB;
        });
      }

      // Log all unique months found in the data (from sample)
      // This is just for comparison/debugging, effectiveMonths is what's used for structure
      const sampleMonthSet = new Map();
      dataToProcess.forEach(r => {
        const dateField = r[COLUMN_MAP.documentDate];
        if (dateField) {
          try {
            const date = new Date(dateField);
            if (!isNaN(date.getTime())) {
              sampleMonthSet.set(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`, true);
            }
          } catch (e) { /* skip */ }
        }
      });
      console.info('Unique months found in *sampled data*:', Array.from(sampleMonthSet.keys()).sort());
      console.info('Effective months for *table structure*:', effectiveMonths);
      
      // Initialize structure
      result.premiumBands = bands;
      result.months = effectiveMonths; // Use months derived from filter range or sample
      
      // Initialize data structures
      bands.forEach(band => {
        result.data[band] = {};
        effectiveMonths.forEach(month => {
          result.data[band][month] = {
            amount: 0,
            count: 0,
            avgLoanSize: 0
          };
        });
        result.totals.byPremiumBand[band] = 0;
        result.counts.byPremiumBand[band] = 0;
      });
      
      effectiveMonths.forEach(month => {
        result.totals.byMonth[month] = 0;
        result.counts.byMonth[month] = 0;
      });
      
      // Debug: Log a sample of records to check date formats
      console.debug('Sample records for date format check:', dataToProcess.slice(0, 5).map(r => ({
        date: r[COLUMN_MAP.documentDate],
        band: r.PremiumBand,
        amount: r[COLUMN_MAP.loanAmount]
      })));
      
      // Aggregate loan amounts and counts
      dataToProcess.forEach(record => {
        try {
          // If PremiumBand doesn't exist, create it from GrossMarginBucket
          if (!record.PremiumBand && record[COLUMN_MAP.grossMarginBucket]) {
            record.PremiumBand = convertMarginBucketToBps(record[COLUMN_MAP.grossMarginBucket]);
          }
          
          const band = record.PremiumBand;
          if (!band || !bands.includes(band)) return;
          
          const dateField = record[COLUMN_MAP.documentDate];
          if (!dateField) return;
          
          // Parse date field - handle different possible formats
          let recordDate;
          if (typeof dateField === 'string') {
            // Try to handle various date formats
            if (dateField.includes('-')) {
              // YYYY-MM-DD format
              recordDate = new Date(dateField);
              // Ensure the date is valid
              if (isNaN(recordDate.getTime())) {
                console.warn('Invalid date despite having correct format:', dateField);
                return;
              }
            } else if (dateField.includes('/')) {
              // DD/MM/YYYY or MM/DD/YYYY format
              const parts = dateField.split('/');
              if (parts.length === 3) {
                // Assume DD/MM/YYYY format first
                recordDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                if (isNaN(recordDate.getTime())) {
                  // Try MM/DD/YYYY format if DD/MM/YYYY failed
                  recordDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
                }
              }
            } else {
              // Try standard parsing
              recordDate = new Date(dateField);
            }
          } else {
            // If it's already a Date object
            recordDate = new Date(dateField);
          }
          
          if (isNaN(recordDate.getTime())) {
            console.warn('Invalid date format:', dateField);
            return;
          }
          
          const year = recordDate.getFullYear();
          const monthNum = recordDate.getMonth() + 1;
          const month = `${year}-${monthNum.toString().padStart(2, '0')}`;
          
          // Debug log for 2025 dates
          if (year === 2025) {
            console.debug(`Processing 2025 date: ${dateField} => ${month}`);
          }
          
          if (!effectiveMonths.includes(month)) {
            console.debug(`Month ${month} not in months list, skipping record. Original date: ${dateField}`);
            return;
          }
          
          const loanAmount = parseFloat(record[COLUMN_MAP.loanAmount]) || 0;
          
          // Add to band/month total
          result.data[band][month].amount += loanAmount;
          result.data[band][month].count += 1;
          
          // Add to premium band total
          result.totals.byPremiumBand[band] += loanAmount;
          result.counts.byPremiumBand[band] += 1;
          
          // Add to month total
          result.totals.byMonth[month] += loanAmount;
          result.counts.byMonth[month] += 1;
          
          // Add to overall total
          result.totals.overall += loanAmount;
          result.counts.overall += 1;
        } catch (e) {
          // Skip records that cause errors
          console.warn('Error processing record for aggregation:', e);
        }
      });
      
      // Calculate average loan sizes
      bands.forEach(band => {
        effectiveMonths.forEach(month => {
          const { amount, count } = result.data[band][month];
          result.data[band][month].avgLoanSize = count > 0 ? amount / count : 0;
        });
      });
      
      // Calculate additional metrics if requested
      if (includeCountMetrics) {
        // Calculate market share percentages
        result.metrics.marketShare = {};
        
        bands.forEach(band => {
          result.metrics.marketShare[band] = {};
          effectiveMonths.forEach(month => {
            const bandMonthAmount = result.data[band][month].amount;
            const monthTotal = result.totals.byMonth[month];
            result.metrics.marketShare[band][month] = monthTotal > 0 ? (bandMonthAmount / monthTotal) * 100 : 0;
          });
        });
        
        // Calculate growth rates month-over-month
        if (effectiveMonths.length > 1) {
          result.metrics.growthRate = {};
          
          bands.forEach(band => {
            result.metrics.growthRate[band] = {};
            
            for (let i = 1; i < effectiveMonths.length; i++) {
              const currentMonth = effectiveMonths[i];
              const previousMonth = effectiveMonths[i - 1];
              
              const currentAmount = result.data[band][currentMonth].amount;
              const previousAmount = result.data[band][previousMonth].amount;
              
              result.metrics.growthRate[band][currentMonth] = 
                previousAmount > 0 ? ((currentAmount - previousAmount) / previousAmount) * 100 : 0;
            }
          });
        }
      }
      
      // Log performance
      const endTime = performance.now();
      console.debug(`Aggregation completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      console.error('Error in aggregateByPremiumBandAndMonth:', error);
      return {
        premiumBands: [],
        months: [],
        data: {},
        totals: { byPremiumBand: {}, byMonth: {}, overall: 0 },
        counts: { byPremiumBand: {}, byMonth: {}, overall: 0 },
        metrics: {},
        error: error.message
      };
    }
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
   * Calculate weighted averages by premium band
   * @param {Array} data - Data to analyze
   * @param {Object} options - Calculation options
   * @param {Array} options.metrics - Metrics to calculate weighted averages for (e.g., 'ltv', 'rate')
   * @param {boolean} options.includeMonthly - Whether to include monthly breakdowns
   * @returns {Object} Weighted averages by premium band
   */
  static calculateWeightedAverages(data, options = {}) {
    // Default options
    const {
      metrics = ['ltv', 'rate', 'term'],
      includeMonthly = false
    } = options;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        premiumBands: [],
        metrics: {},
        monthly: {}
      };
    }
    
    // Get unique premium bands
    const bandSet = new Set();
    data.forEach(r => {
      if (r.PremiumBand) bandSet.add(r.PremiumBand);
    });
    
    const bands = Array.from(bandSet).sort((a, b) => {
      try {
        const aNum = parseInt(a.split('-')[0]) || 0;
        const bNum = parseInt(b.split('-')[0]) || 0;
        return aNum - bNum;
      } catch (e) {
        return 0;
      }
    });
    
    // Initialize result structure
    const result = {
      premiumBands: bands,
      metrics: {},
      monthly: {}
    };
    
    // Initialize metrics for each band
    metrics.forEach(metric => {
      result.metrics[metric] = {};
      
      bands.forEach(band => {
        result.metrics[metric][band] = {
          weightedAvg: 0,
          totalWeight: 0,
          count: 0,
          min: Infinity,
          max: -Infinity
        };
      });
    });
    
    // Get months if needed
    let months = [];
    if (includeMonthly) {
      const monthSet = new Set();
      data.forEach(r => {
        const dateField = r[COLUMN_MAP.documentDate];
        if (dateField) {
          try {
            const date = new Date(dateField);
            if (!isNaN(date.getTime())) {
              const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
              monthSet.add(month);
            }
          } catch (e) {
            // Skip invalid dates
          }
        }
      });
      
      months = Array.from(monthSet).sort();
      
      // Initialize monthly metrics
      metrics.forEach(metric => {
        result.monthly[metric] = {};
        
        bands.forEach(band => {
          result.monthly[metric][band] = {};
          
          months.forEach(month => {
            result.monthly[metric][band][month] = {
              weightedAvg: 0,
              totalWeight: 0,
              count: 0
            };
          });
        });
      });
    }
    
    // Process data
    data.forEach(record => {
      const band = record.PremiumBand;
      if (!band || !bands.includes(band)) return;
      
      const loanAmount = parseFloat(record[COLUMN_MAP.loanAmount]) || 0;
      if (loanAmount <= 0) return; // Skip records with invalid loan amounts
      
      // Process each metric
      metrics.forEach(metric => {
        let value;
        
        // Map metric to column and parse value
        switch (metric) {
          case 'ltv':
            value = parseFloat(record[COLUMN_MAP.ltv]) || 0;
            break;
          case 'rate':
            value = parseFloat(record[COLUMN_MAP.rate]) || 0;
            break;
          case 'term':
            value = parseFloat(record[COLUMN_MAP.term]) || 0;
            break;
          default:
            value = parseFloat(record[metric]) || 0;
        }
        
        // Skip invalid values
        if (isNaN(value) || value <= 0) return;
        
        // Update overall metrics
        const metricData = result.metrics[metric][band];
        metricData.totalWeight += loanAmount;
        metricData.count += 1;
        metricData.weightedSum = (metricData.weightedSum || 0) + (loanAmount * value);
        metricData.min = Math.min(metricData.min, value);
        metricData.max = Math.max(metricData.max, value);
        
        // Update monthly metrics if needed
        if (includeMonthly) {
          const dateField = record[COLUMN_MAP.documentDate];
          if (dateField) {
            try {
              const date = new Date(dateField);
              if (!isNaN(date.getTime())) {
                const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                if (months.includes(month)) {
                  const monthlyMetricData = result.monthly[metric][band][month];
                  monthlyMetricData.totalWeight += loanAmount;
                  monthlyMetricData.count += 1;
                  monthlyMetricData.weightedSum = (monthlyMetricData.weightedSum || 0) + (loanAmount * value);
                }
              }
            } catch (e) {
              // Skip invalid dates
            }
          }
        }
      });
    });
    
    // Calculate weighted averages
    metrics.forEach(metric => {
      bands.forEach(band => {
        const metricData = result.metrics[metric][band];
        if (metricData.totalWeight > 0) {
          metricData.weightedAvg = metricData.weightedSum / metricData.totalWeight;
        }
        
        // Clean up infinite values
        if (metricData.min === Infinity) metricData.min = 0;
        if (metricData.max === -Infinity) metricData.max = 0;
      });
      
      if (includeMonthly) {
        bands.forEach(band => {
          months.forEach(month => {
            const monthlyMetricData = result.monthly[metric][band][month];
            if (monthlyMetricData.totalWeight > 0) {
              monthlyMetricData.weightedAvg = monthlyMetricData.weightedSum / monthlyMetricData.totalWeight;
            }
          });
        });
      }
    });
    
    return result;
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
