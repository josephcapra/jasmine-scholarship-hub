/**
 * Test Setup - Mock browser environment for service tests
 */

// Mock localStorage
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
  get length() {
    return Object.keys(this.store).length;
  }
  key(index) {
    return Object.keys(this.store)[index] || null;
  }
}

// Mock window object
globalThis.window = globalThis.window || {};
globalThis.localStorage = new MockStorage();
globalThis.sessionStorage = new MockStorage();

// Mock navigator
globalThis.navigator = {
  clipboard: {
    writeText: async (text) => text,
    readText: async () => ''
  },
  share: async (data) => data
};

// Mock document
globalThis.document = {
  getElementById: (id) => null,
  querySelector: (sel) => null,
  querySelectorAll: (sel) => [],
  createElement: (tag) => ({
    id: '',
    className: '',
    innerHTML: '',
    style: {},
    appendChild: () => {},
    remove: () => {},
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    }
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

// Mock fetch for API tests
globalThis.fetch = async (url, options = {}) => {
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => ''
  };
};

// Mock Date for consistent testing
const RealDate = Date;
globalThis.mockDate = (dateString) => {
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(dateString);
      } else {
        super(...args);
      }
    }
    static now() {
      return new RealDate(dateString).getTime();
    }
  };
};

globalThis.restoreDate = () => {
  globalThis.Date = RealDate;
};

// Export for use in tests
module.exports = {
  MockStorage,
  mockDate: globalThis.mockDate,
  restoreDate: globalThis.restoreDate
};
