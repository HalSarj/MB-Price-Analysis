/**
 * StateManager.js
 * Centralized state management using Observable pattern
 */

export class StateManager {
  constructor() {
    this.state = {
      data: {
        raw: null,
        filtered: null,
        aggregated: null
      },
      filters: {
        dateRange: [null, null],
        lenders: [],
        ltvRange: 'all'
      },
      ui: {
        loading: false,
        selectedView: 'table',
        selectedPremiumBands: []
      }
    };
    this.subscribers = new Map();
  }
  
  /**
   * Subscribe to state changes
   * @param {string} key - State path to subscribe to
   * @param {Function} callback - Function to call when state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    
    this.subscribers.get(key).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * Set state at a specific path
   * @param {string} path - Dot notation path to state property
   * @param {any} value - New value to set
   */
  setState(path, value) {
    this.updateNestedState(this.state, path, value);
    this.notifySubscribers(path);
  }
  
  /**
   * Update nested state based on dot notation path
   * @param {Object} obj - Current state object
   * @param {string} path - Dot notation path
   * @param {any} value - New value
   * @private
   */
  updateNestedState(obj, path, value) {
    const parts = path.split('.');
    const lastKey = parts.pop();
    let current = obj;
    
    // Navigate to the correct object
    for (const key of parts) {
      if (current[key] === undefined) {
        current[key] = {};
      }
      current = current[key];
    }
    
    // Set the value
    current[lastKey] = value;
  }
  
  /**
   * Notify subscribers of state changes
   * @param {string} changedPath - Path that changed
   * @private
   */
  notifySubscribers(changedPath) {
    // Notify direct subscribers
    if (this.subscribers.has(changedPath)) {
      const callbacks = this.subscribers.get(changedPath);
      callbacks.forEach(callback => callback(this.getStateByPath(changedPath)));
    }
    
    // Notify parent path subscribers
    const parts = changedPath.split('.');
    while (parts.length > 0) {
      parts.pop();
      const parentPath = parts.join('.');
      
      if (parentPath && this.subscribers.has(parentPath)) {
        const callbacks = this.subscribers.get(parentPath);
        callbacks.forEach(callback => callback(this.getStateByPath(parentPath)));
      }
    }
    
    // Notify root subscribers
    if (this.subscribers.has('*')) {
      const callbacks = this.subscribers.get('*');
      callbacks.forEach(callback => callback(this.state));
    }
  }
  
  /**
   * Get state value by path (public method)
   * @param {string} path - Dot notation path
   * @returns {any} State value at path
   */
  getState(path) {
    return this.getStateByPath(path);
  }
  
  /**
   * Get state value by path
   * @param {string} path - Dot notation path
   * @returns {any} State value at path
   * @private
   */
  getStateByPath(path) {
    if (!path || path === '*') return this.state;
    
    const parts = path.split('.');
    let current = this.state;
    
    for (const key of parts) {
      if (current[key] === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }
  
  /**
   * Reset state to initial values
   * @param {string} [path] - Optional path to reset (defaults to entire state)
   */
  resetState(path = null) {
    if (!path) {
      this.state = {
        data: {
          raw: this.state.data.raw, // Keep raw data
          filtered: this.state.data.raw,
          aggregated: null
        },
        filters: {
          dateRange: [null, null],
          lenders: [],
          ltvRange: 'all'
        },
        ui: {
          loading: false,
          selectedView: 'table',
          selectedPremiumBands: []
        }
      };
      this.notifySubscribers('*');
    } else {
      // Reset specific path
      const initialState = {
        'filters': {
          dateRange: [null, null],
          lenders: [],
          ltvRange: 'all'
        },
        'ui': {
          loading: false,
          selectedView: 'table',
          selectedPremiumBands: []
        }
      };
      
      const defaultValue = this.getDefaultValueByPath(path, initialState);
      if (defaultValue !== undefined) {
        this.setState(path, defaultValue);
      }
    }
  }
  
  /**
   * Get default value for a path
   * @param {string} path - Dot notation path
   * @param {Object} initialState - Initial state object
   * @returns {any} Default value
   * @private
   */
  getDefaultValueByPath(path, initialState) {
    const parts = path.split('.');
    let current = initialState;
    
    for (const key of parts) {
      if (current[key] === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }
}
