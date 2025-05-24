# Mortgage Brain Analysis Tool

An interactive web application for mortgage pricing analysis with data visualization capabilities.

## Overview

This tool allows users to analyze mortgage pricing data with interactive visualizations and filtering capabilities. It provides insights into market share, premium bands, and trends over time.

## Features

- **Data Loading**: Load and process CSV data files with mortgage pricing information
- **Interactive Filtering**: Filter data by date range, lender, and LTV
- **Premium Band Analysis**: Analyze data by premium bands converted to basis points
- **Market Share Analysis**: View market share breakdowns with LTV splits
- **Visualizations**: Heatmaps and trend charts for data analysis
- **Data Export**: Export analysis results to CSV

## Project Structure

```
mortgage-brain-analysis-tool/
├── index.html                # Main HTML entry point
├── css/
│   └── styles.css            # Application styling
├── js/
│   ├── app.js                # Main application entry
│   ├── state/
│   │   └── StateManager.js   # Centralized state management
│   ├── data/
│   │   ├── DataManager.js    # Data loading orchestration
│   │   ├── DataLoader.js     # CSV loading utilities
│   │   ├── DataAggregator.js # Data processing & aggregation
│   │   └── ColumnMapper.js   # Column mapping & conversion
│   ├── filters/
│   │   └── FilterManager.js  # Filter logic & state
│   ├── components/           # UI components
│   ├── charts/               # Visualization components
│   └── export/               # Export functionality
├── data/                     # Data files directory
└── package.json              # Project dependencies
```

## Data Format

The application expects CSV files with the following structure:

- **Provider**: Mortgage provider/lender name
- **Product_Name**: Name of the mortgage product
- **Mortgage_Type**: Type of mortgage
- **Channel**: Distribution channel
- **Rate**: Initial interest rate
- **Product_Description**: Description of the product
- **Period**: Tie-in period
- **First_Time_Buyer**: First-time buyer indicator
- **Second_Time_Buyer**: Second-time buyer indicator
- **Remortgages**: Remortgage indicator
- **Product_Fee_Notes**: Notes about product fees
- **Flat_Fees**: Flat fee amount
- **Percentage_fees**: Percentage-based fees
- **Incentives**: Product incentives
- **Redemption**: Redemption information
- **Revert_Rate**: Revert rate after initial period
- **Timestamp**: Date of the record
- **LTV**: Loan-to-value ratio
- **Loan**: Loan amount
- **GrossMarginBucket**: Gross margin bucket (converted to basis points)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
4. Open your browser and navigate to http://localhost:8080

## Data Files

The application is configured to load data from:
- `../Competitor rates/2 year.csv`
- `../Competitor rates/5 year.csv`

You can update the file paths in `js/data/DataManager.js` if needed.

## Dependencies

- [Chart.js](https://www.chartjs.org/) - For data visualization
- [PapaParse](https://www.papaparse.com/) - For CSV parsing
- [Tabulator](http://tabulator.info/) - For interactive tables

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
