# Mortgage Analysis Tool - Style Guide

## Design System Overview

This style guide is based on the company's existing design system with a dark theme and red/blue brand colors. The design prioritizes **professional data analysis** with **clean card-based layouts**.

### Brand Colors

| Color | Hex Code | Usage |
|-------|----------|--------|
| `brand.red.50` | `#FFD4D4` | Light red tints, hover states |
| `brand.red.400` | `#FF2626` | Primary buttons, accents |
| `brand.red.900` | `#660F0F` | Dark red, pressed states |
| `brand.blue.400` | `#003399` | Selected states, secondary actions |
| `brand.blue.900` | `#00143D` | Dark blue accents |

### Typography

- **Primary Font**: IBM Plex Sans (with system font fallbacks)
- **Heading Scale**: 32px (titles) → 24px → 20px → 18px → 16px → 14px → 12px
- **Body Text**: 16px base size
- **Design Focus**: Desktop/laptop screens (not mobile-optimized)

## Complete CSS Implementation

```css
/* Mortgage Analysis Tool - Complete Styles */

/* ========== CSS VARIABLES ========== */
:root {
  /* Brand Colors */
  --brand-red-50: #FFD4D4;         /* Light red tint */
  --brand-red-400: #FF2626;        /* Primary red */
  --brand-red-900: #660F0F;        /* Dark red */
  
  --brand-blue-50: #CCD6EB;        /* Light blue tint */
  --brand-blue-400: #003399;       /* Primary blue */
  --brand-blue-900: #00143D;       /* Dark blue */
  
  --brand-cyan-50: #CEF0F9;        /* Light cyan tint */
  --brand-cyan-400: #08B2E3;       /* Primary cyan */
  --brand-cyan-900: #00143D;       /* Dark cyan */
  
  /* Application Colors */
  --bg-primary: #000000;           /* Main background */
  --bg-secondary: #1a1a1a;         /* Secondary backgrounds */
  --bg-card: #ffffff;              /* Card/panel backgrounds */
  --bg-input: #f8f9fa;             /* Input backgrounds */
  
  --text-primary: #ffffff;         /* Primary text on dark */
  --text-secondary: #cccccc;       /* Secondary text on dark */
  --text-dark: #333333;            /* Dark text on light */
  --text-muted: #666666;           /* Muted text */
  --text-hint: #999999;            /* Hint text */
  
  --accent-primary: var(--brand-red-400);    /* Primary accent */
  --accent-hover: var(--brand-red-900);      /* Hover state */
  --accent-selected: var(--brand-blue-400);  /* Selected state */
  --success: #28a745;              /* Success states */
  --warning: #ffc107;              /* Warning states */
  --danger: var(--brand-red-400);  /* Error states */
  
  --border-light: #e9ecef;         /* Light borders */
  --border-dark: #333333;          /* Dark borders */
  
  /* Spacing */
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-xxl: 3rem;     /* 48px */
  
  /* Typography */
  --font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-size-xs: 0.75rem;   /* 12px */
  --font-size-sm: 0.875rem;  /* 14px */
  --font-size-base: 1rem;    /* 16px */
  --font-size-lg: 1.125rem;  /* 18px */
  --font-size-xl: 1.25rem;   /* 20px */
  --font-size-xxl: 1.5rem;   /* 24px */
  --font-size-title: 2rem;   /* 32px */
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

/* ========== BASE STYLES ========== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  min-height: 100vh;
}

/* ========== LAYOUT COMPONENTS ========== */
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-lg);
}

.app-header {
  text-align: center;
  margin-bottom: var(--spacing-xxl);
  padding: var(--spacing-xl) var(--spacing-lg);
}

.app-header h1 {
  font-size: var(--font-size-title);
  font-weight: 700;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.date-range-info {
  background: var(--bg-secondary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  margin-top: var(--spacing-lg);
  display: inline-block;
}

/* ========== CARD COMPONENTS ========== */
.card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}

.card-header {
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
}

.card-header h2 {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-dark);
  margin: 0;
}

.card-body {
  color: var(--text-dark);
}

/* ========== FILTER COMPONENTS ========== */
.filters-panel {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-group label {
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
  color: var(--text-dark);
  font-size: var(--font-size-sm);
}

/* ========== FORM CONTROLS ========== */
.form-control,
input[type="text"],
input[type="email"],
input[type="number"],
input[type="date"],
select,
textarea {
  width: 100%;
  padding: var(--spacing-md);
  border: 2px solid var(--border-light);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  font-family: inherit;
  background-color: var(--bg-input);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-control:focus,
input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(255, 38, 38, 0.1);
}

select[multiple] {
  min-height: 120px;
}

/* ========== BUTTON COMPONENTS ========== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
  min-height: 44px; /* Touch-friendly */
}

.btn-primary {
  background-color: var(--accent-primary);
  color: white;
  border-radius: var(--radius-md);
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background-color: transparent;
  color: var(--text-primary);
  border: 2px solid var(--text-primary);
  border-radius: var(--radius-md);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--text-primary);
  color: var(--bg-primary);
}

/* Loading button states */
.btn-loading {
  background-color: var(--text-muted);
  color: white;
  position: relative;
  pointer-events: none;
}

.btn-loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  margin: auto;
  border: 2px solid transparent;
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Counter buttons (like in your calculator) */
.btn-counter {
  width: 44px;
  height: 44px;
  background: var(--text-dark);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-lg);
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.btn-counter:hover {
  background: var(--text-primary);
}

/* ========== CHECKBOX & RADIO COMPONENTS ========== */
/* Custom checkbox styling matching your design system */
.checkbox-wrapper {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.checkbox-wrapper input[type="checkbox"] {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-light);
  border-radius: 3px;
  margin-right: var(--spacing-md);
  position: relative;
  cursor: pointer;
  background: white;
}

.checkbox-wrapper input[type="checkbox"]:checked {
  background-color: var(--accent-selected);
  border-color: var(--accent-selected);
}

.checkbox-wrapper input[type="checkbox"]:checked::after {
  content: '✓';
  position: absolute;
  color: white;
  font-size: 14px;
  font-weight: bold;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.checkbox-wrapper label {
  cursor: pointer;
  font-weight: 500;
  margin: 0;
}

/* Radio button styling */
.radio-wrapper {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.radio-wrapper input[type="radio"] {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-light);
  border-radius: 50%;
  margin-right: var(--spacing-md);
  position: relative;
  cursor: pointer;
  background: white;
}

.radio-wrapper input[type="radio"]:checked {
  border-color: var(--accent-selected);
}

.radio-wrapper input[type="radio"]:checked::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--accent-selected);
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.radio-wrapper label {
  cursor: pointer;
  font-weight: 500;
  margin: 0;
}

/* ========== PREMIUM BAND SELECTOR ========== */
.premium-band-selector {
  margin: var(--spacing-lg) 0;
}

.band-chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin: var(--spacing-md) 0;
}

.premium-band-chip {
  background: var(--bg-input);
  border: 2px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  position: relative;
  font-size: var(--font-size-sm);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.premium-band-chip:hover {
  background: var(--brand-red-50);
  border-color: var(--accent-primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.premium-band-chip.selected {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-md);
}

.premium-band-chip .checkmark {
  display: none;
  font-size: var(--font-size-sm);
  font-weight: bold;
}

.premium-band-chip.selected .checkmark {
  display: inline;
}

/* ========== TABLE STYLES ========== */
.table-container {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-md);
  overflow-x: auto;
}

/* Tabulator customizations */
.tabulator {
  border: none;
  background: transparent;
}

.tabulator .tabulator-header {
  background: var(--bg-input);
  border-bottom: 2px solid var(--border-light);
}

.tabulator .tabulator-header .tabulator-col {
  background: transparent;
  border-right: 1px solid var(--border-light);
}

.tabulator .tabulator-tableholder .tabulator-table .tabulator-row {
  border-bottom: 1px solid var(--border-light);
}

.tabulator .tabulator-tableholder .tabulator-table .tabulator-row:hover {
  background: var(--bg-input);
}

/* ========== CHART CONTAINERS ========== */
.chart-container {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-md);
  position: relative;
  height: 400px;
}

.heatmap-container {
  overflow-x: auto;
}

.heatmap-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.heatmap-table th,
.heatmap-table td {
  padding: var(--spacing-sm);
  text-align: center;
  border: 1px solid var(--border-light);
}

.heatmap-table th {
  background: var(--bg-input);
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
}

/* ========== LOADING STATES ========== */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-light);
  border-top: 3px solid var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: var(--spacing-md);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ========== UTILITY CLASSES ========== */
.hidden {
  display: none !important;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.text-muted {
  color: var(--text-muted);
}

.mb-0 { margin-bottom: 0; }
.mb-1 { margin-bottom: var(--spacing-sm); }
.mb-2 { margin-bottom: var(--spacing-md); }
.mb-3 { margin-bottom: var(--spacing-lg); }
.mb-4 { margin-bottom: var(--spacing-xl); }

.mt-0 { margin-top: 0; }
.mt-1 { margin-top: var(--spacing-sm); }
.mt-2 { margin-top: var(--spacing-md); }
.mt-3 { margin-top: var(--spacing-lg); }
.mt-4 { margin-top: var(--spacing-xl); }

/* ========== RESPONSIVE DESIGN ========== */
@media (max-width: 1200px) {
  .container {
    max-width: 100%;
    padding: var(--spacing-lg);
  }
  
  .filters-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}

@media (max-width: 768px) {
  .container {
    padding: var(--spacing-md);
  }
  
  .filters-grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }
  
  .card {
    padding: var(--spacing-lg);
  }
  
  .app-header h1 {
    font-size: var(--font-size-xxl);
  }
  
  .band-chips-container {
    gap: var(--spacing-xs);
  }
  
  .premium-band-chip {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-xs);
  }
}
```

## Component Usage Guidelines

### Cards
Use `.card` class for all major content sections. Cards provide visual separation and maintain consistency.

### Buttons
- `.btn-primary` - Main actions (Apply filters, Export data)
- `.btn-secondary` - Secondary actions (Reset, Cancel)
- `.btn-loading` - Use for async operations

### Premium Band Chips
Interactive selection chips that match your design system. Use `selected` class for active state.

### Form Controls
All inputs automatically get focus states matching your brand colors.

## Key Design Principles

1. **Dark background, light cards** - Maintains focus on data
2. **Red primary, blue selected** - Uses your brand colors appropriately  
3. **Desktop-first responsive** - Optimized for analysis workflows
4. **IBM Plex Sans typography** - Professional, readable font choice
5. **Consistent spacing scale** - Uses 4px base unit for harmony