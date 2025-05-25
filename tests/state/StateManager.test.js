/**
 * StateManager.test.js
 * Unit tests for the StateManager class
 */

// Mock implementation of StateManager for testing
class StateManager {
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
  
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    
    this.subscribers.get(key).push(callback);
    
    return () => {
      const callbacks = this.subscribers.get(key);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  
  setState(path, value) {
    this.updateNestedState(this.state, path, value);
    this.notifySubscribers(path);
  }
  
  updateNestedState(obj, path, value) {
    const parts = path.split('.');
    const lastKey = parts.pop();
    let current = obj;
    
    for (const key of parts) {
      if (current[key] === undefined) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
  }
  
  notifySubscribers(changedPath) {
    if (this.subscribers.has(changedPath)) {
      const callbacks = this.subscribers.get(changedPath);
      callbacks.forEach(callback => callback(this.getStateByPath(changedPath)));
    }
    
    const parts = changedPath.split('.');
    while (parts.length > 0) {
      parts.pop();
      const parentPath = parts.join('.');
      
      if (parentPath && this.subscribers.has(parentPath)) {
        const callbacks = this.subscribers.get(parentPath);
        callbacks.forEach(callback => callback(this.getStateByPath(parentPath)));
      }
    }
    
    if (this.subscribers.has('*')) {
      const callbacks = this.subscribers.get('*');
      callbacks.forEach(callback => callback(this.state));
    }
  }
  
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
  
  resetState(path = null) {
    if (!path) {
      this.state = {
        data: {
          raw: this.state.data.raw,
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

describe('StateManager', () => {
  let stateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  test('should initialize with default state', () => {
    expect(stateManager.state).toEqual({
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
    });
  });

  test('should update state with setState', () => {
    stateManager.setState('data.raw', [{ id: 1 }]);
    expect(stateManager.state.data.raw).toEqual([{ id: 1 }]);
  });

  test('should update nested state properties', () => {
    stateManager.setState('filters.lenders', ['HSBC', 'Barclays']);
    expect(stateManager.state.filters.lenders).toEqual(['HSBC', 'Barclays']);
  });

  test('should create nested objects if they do not exist', () => {
    stateManager.setState('data.custom.category', 'test');
    expect(stateManager.state.data.custom.category).toBe('test');
  });

  test('should notify subscribers when state changes', () => {
    const mockCallback = function(data) {
      expect(data).toEqual([{ id: 1 }]);
    };
    stateManager.subscribe('data.raw', mockCallback);
    
    stateManager.setState('data.raw', [{ id: 1 }]);
  });

  test('should notify parent path subscribers', () => {
    let called = false;
    const mockCallback = function() {
      called = true;
    };
    stateManager.subscribe('data', mockCallback);
    
    stateManager.setState('data.raw', [{ id: 1 }]);
    expect(called).toBe(true);
  });

  test('should notify root subscribers for any change', () => {
    let called = false;
    const mockCallback = function() {
      called = true;
    };
    stateManager.subscribe('*', mockCallback);
    
    stateManager.setState('ui.loading', true);
    expect(called).toBe(true);
  });

  test('should allow unsubscribing from state changes', () => {
    let called = false;
    const mockCallback = function() {
      called = true;
    };
    const unsubscribe = stateManager.subscribe('data.raw', mockCallback);
    
    unsubscribe();
    stateManager.setState('data.raw', [{ id: 1 }]);
    expect(called).toBe(false);
  });

  test('should get state by path', () => {
    stateManager.setState('filters.lenders', ['HSBC']);
    const value = stateManager.getStateByPath('filters.lenders');
    expect(value).toEqual(['HSBC']);
  });

  test('should return undefined for non-existent paths', () => {
    const value = stateManager.getStateByPath('nonexistent.path');
    expect(value).toBeUndefined();
  });

  test('should reset entire state', () => {
    stateManager.setState('data.raw', [{ id: 1 }]);
    stateManager.setState('filters.lenders', ['HSBC']);
    stateManager.setState('ui.loading', true);
    
    stateManager.resetState();
    
    expect(stateManager.state.data.raw).toEqual([{ id: 1 }]); // Raw data should be preserved
    expect(stateManager.state.filters.lenders).toEqual([]);
    expect(stateManager.state.ui.loading).toBe(false);
  });

  test('should reset specific path', () => {
    stateManager.setState('filters.lenders', ['HSBC', 'Barclays']);
    stateManager.resetState('filters.lenders');
    expect(stateManager.state.filters.lenders).toEqual([]);
  });
});
