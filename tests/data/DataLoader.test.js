/**
 * DataLoader.test.js
 * Tests for the DataLoader class
 */

import { DataLoader } from '../../js/data/DataLoader.js';
import { convertMarginBucketToBps } from '../../js/data/ColumnMapper.js';

// Mock the fetch API
global.fetch = jest.fn();

// Mock PapaParse
global.Papa = {
  parse: jest.fn((csvText, config) => {
    // Simulate successful parsing
    config.complete({
      data: mockParsedData,
      errors: []
    });
  })
};

// Sample mock data
const mockParsedData = [
  {
    Provider: 'Bank A',
    Product_Name: '2 Year Fixed',
    Mortgage_Type: 'Fixed',
    Channel: 'Direct',
    Rate: 4.25,
    Product_Description: '2 Year Fixed Rate',
    Period: 24,
    First_Time_Buyer: 'Yes',
    Second_Time_Buyer: 'Yes',
    Remortgages: 'Yes',
    Product_Fee_Notes: 'Fee: £995',
    Flat_Fees: 995,
    Percentage_fees: 0,
    Incentives: 'Free valuation',
    Redemption: '3% in year 1, 2% in year 2',
    Revert_Rate: 'SVR + 0%',
    DocumentDate: '2025-03-01',
    GrossMarginBucket: '100-150',
    LTV: '75',
    Loan: '250000'
  },
  {
    Provider: 'Bank B',
    Product_Name: '5 Year Fixed',
    Mortgage_Type: 'Fixed',
    Channel: 'Broker',
    Rate: 3.95,
    Product_Description: '5 Year Fixed Rate',
    Period: 60,
    First_Time_Buyer: 'Yes',
    Second_Time_Buyer: 'Yes',
    Remortgages: 'Yes',
    Product_Fee_Notes: 'Fee: £1,295',
    Flat_Fees: 1295,
    Percentage_fees: 0,
    Incentives: 'Free valuation, £500 cashback',
    Redemption: '5% in year 1, 4% in year 2, 3% in year 3, 2% in year 4, 1% in year 5',
    Revert_Rate: 'SVR + 0%',
    DocumentDate: '2025-02-15',
    GrossMarginBucket: '150-200',
    LTV: '80',
    Loan: '300000'
  }
];

describe('DataLoader', () => {
  beforeEach(() => {
    // Reset mocks
    fetch.mockReset();
    jest.clearAllMocks();
    
    // Mock successful fetch response
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve('mock,csv,data')
    });
  });

  describe('loadCSV', () => {
    test('should load and parse a CSV file correctly', async () => {
      const filePath = '/path/to/test.csv';
      const result = await DataLoader.loadCSV(filePath);
      
      // Check that fetch was called with the correct path
      expect(fetch).toHaveBeenCalledWith(filePath);
      
      // Check that Papa.parse was called
      expect(Papa.parse).toHaveBeenCalled();
      
      // Check that the result is the parsed data
      expect(result).toEqual(mockParsedData);
    });

    test('should handle fetch errors gracefully', async () => {
      // Mock a failed fetch
      fetch.mockRejectedValue(new Error('Network error'));
      
      const filePath = '/path/to/test.csv';
      const result = await DataLoader.loadCSV(filePath);
      
      // Should return empty array on error
      expect(result).toEqual([]);
    });

    test('should handle HTTP errors gracefully', async () => {
      // Mock a failed HTTP response
      fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      
      const filePath = '/path/to/test.csv';
      const result = await DataLoader.loadCSV(filePath);
      
      // Should return empty array on error
      expect(result).toEqual([]);
    });
  });

  describe('loadAllYears', () => {
    test('should load multiple files and combine them', async () => {
      const filePaths = ['/path/to/2year.csv', '/path/to/5year.csv'];
      
      // Spy on combineAndProcess
      jest.spyOn(DataLoader, 'combineAndProcess');
      
      const result = await DataLoader.loadAllYears(filePaths);
      
      // Check that loadCSV was called for each file
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenCalledWith(filePaths[0]);
      expect(fetch).toHaveBeenCalledWith(filePaths[1]);
      
      // Check that combineAndProcess was called with the datasets
      expect(DataLoader.combineAndProcess).toHaveBeenCalled();
      
      // Result should be the combined and processed data
      expect(result).toBeDefined();
    });
  });

  describe('combineAndProcess', () => {
    test('should combine datasets and process them correctly', () => {
      // Create test datasets with different dates
      const dataset1 = [
        { ...mockParsedData[0], DocumentDate: '2025-03-01', GrossMarginBucket: '100-150' }
      ];
      
      const dataset2 = [
        { ...mockParsedData[1], DocumentDate: '2025-02-15', GrossMarginBucket: '150-200' }
      ];
      
      const result = DataLoader.combineAndProcess([dataset1, dataset2]);
      
      // Check that the result is sorted by date (oldest first)
      expect(result[0].DocumentDate).toBe('2025-02-15');
      expect(result[1].DocumentDate).toBe('2025-03-01');
      
      // Check that GrossMarginBucket was converted to basis points
      expect(result[0].PremiumBand).toBe(convertMarginBucketToBps('150-200'));
      expect(result[1].PremiumBand).toBe(convertMarginBucketToBps('100-150'));
    });

    test('should handle numeric field conversion correctly', () => {
      // Create test data with string numeric fields
      const dataset = [
        { 
          LTV: '75%', 
          Loan: '£250,000', 
          InitialRate: '4.25%',
          SwapRate: '3.5%',
          GrossMargin: '0.75%',
          DocumentDate: '2025-03-01'
        }
      ];
      
      const result = DataLoader.combineAndProcess([dataset]);
      
      // Check that numeric fields were converted correctly
      expect(typeof result[0].LTV).toBe('number');
      expect(result[0].LTV).toBe(75);
      
      expect(typeof result[0].Loan).toBe('number');
      expect(result[0].Loan).toBe(250000);
      
      expect(typeof result[0].InitialRate).toBe('number');
      expect(result[0].InitialRate).toBe(4.25);
      
      expect(typeof result[0].SwapRate).toBe('number');
      expect(result[0].SwapRate).toBe(3.5);
      
      expect(typeof result[0].GrossMargin).toBe('number');
      expect(result[0].GrossMargin).toBe(0.75);
    });
  });
});
