/**
 * Unit tests for Cache Manager
 */

import {
  clearApplicationCache,
  clearSpecificCache,
  shouldClearCache,
  updateLastClearTime,
  addNoCacheHeaders,
  fetchWithNoCache
} from '../cacheManager';

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  store: {},
  getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key, value) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete mockLocalStorage.store[key];
  }),
  clear: jest.fn(() => {
    mockLocalStorage.store = {};
  })
};

const mockSessionStorage = {
  store: {},
  getItem: jest.fn((key) => mockSessionStorage.store[key] || null),
  setItem: jest.fn((key, value) => {
    mockSessionStorage.store[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete mockSessionStorage.store[key];
  }),
  clear: jest.fn(() => {
    mockSessionStorage.store = {};
  })
};

// Mock console methods
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

// Mock window objects
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

// Mock document.head for meta tag tests
Object.defineProperty(document, 'head', {
  value: {
    appendChild: jest.fn(),
    querySelector: jest.fn(() => null)
  },
  writable: true
});

// Mock caches API
Object.defineProperty(window, 'caches', {
  value: {
    keys: jest.fn(() => Promise.resolve(['api-cache-v1', 'app-cache-v2', 'other-cache'])),
    delete: jest.fn(() => Promise.resolve(true))
  },
  writable: true
});

describe('Cache Manager', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockLocalStorage.store = {};
    mockSessionStorage.store = {};
  });

  describe('clearApplicationCache', () => {
    beforeEach(() => {
      // Set up some test data
      mockLocalStorage.store = {
        'projects_cache': 'test_data',
        'tasks_cache': 'test_data',
        'access_token': 'should_not_be_cleared',
        'refresh_token': 'should_not_be_cleared',
        'unrelated_key': 'test_data'
      };
      
      mockSessionStorage.store = {
        'temp_data': 'test_data',
        'search_results': 'test_data'
      };
    });

    test('should clear specified cache keys from localStorage', async () => {
      await clearApplicationCache();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('projects_cache');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('tasks_cache');
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('access_token');
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('refresh_token');
    });

    test('should clear specified keys from sessionStorage', async () => {
      await clearApplicationCache();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('temp_data');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('search_results');
    });

    test('should attempt to clear browser caches', async () => {
      await clearApplicationCache();

      expect(window.caches.keys).toHaveBeenCalled();
      // Wait for promise resolution
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(window.caches.delete).toHaveBeenCalledWith('api-cache-v1');
      expect(window.caches.delete).toHaveBeenCalledWith('app-cache-v2');
      expect(window.caches.delete).not.toHaveBeenCalledWith('other-cache');
    });

    test('should log success message', async () => {
      await clearApplicationCache();
      expect(console.log).toHaveBeenCalledWith('Application cache cleared successfully');
    });

    test('should handle errors gracefully', async () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Test error');
      });

      await clearApplicationCache();
      expect(console.error).toHaveBeenCalledWith('Error clearing application cache:', expect.any(Error));
    });
  });

  describe('clearSpecificCache', () => {
    test('should clear specific key from both storages', () => {
      mockLocalStorage.store['test_key'] = 'test_value';
      mockSessionStorage.store['test_key'] = 'test_value';

      clearSpecificCache('test_key');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test_key');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('test_key');
      expect(console.log).toHaveBeenCalledWith('Cache cleared for key: test_key');
    });

    test('should handle errors when clearing specific cache', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Test error');
      });

      clearSpecificCache('test_key');
      expect(console.error).toHaveBeenCalledWith('Error clearing cache for key test_key:', expect.any(Error));
    });
  });

  describe('shouldClearCache', () => {
    test('should return true if no last clear time is set', () => {
      expect(shouldClearCache()).toBe(true);
    });

    test('should return true if more than 24 hours have passed', () => {
      const twentyFiveHoursAgo = Date.now() - (25 * 60 * 60 * 1000);
      mockLocalStorage.store['last_cache_clear'] = twentyFiveHoursAgo.toString();
      mockLocalStorage.getItem.mockReturnValue(twentyFiveHoursAgo.toString());

      expect(shouldClearCache()).toBe(true);
    });

    test('should return false if less than 24 hours have passed', () => {
      const oneHourAgo = Date.now() - (1 * 60 * 60 * 1000);
      mockLocalStorage.store['last_cache_clear'] = oneHourAgo.toString();
      mockLocalStorage.getItem.mockReturnValue(oneHourAgo.toString());

      expect(shouldClearCache()).toBe(false);
    });
  });

  describe('updateLastClearTime', () => {
    test('should set current timestamp as last clear time', () => {
      const beforeTime = Date.now();
      updateLastClearTime();
      const afterTime = Date.now();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'last_cache_clear',
        expect.stringMatching(/^\d+$/)
      );

      const setTime = parseInt(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(setTime).toBeGreaterThanOrEqual(beforeTime);
      expect(setTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('addNoCacheHeaders', () => {
    test('should add cache control meta tags', () => {
      const mockMeta = {
        setAttribute: jest.fn()
      };
      const mockCreateElement = jest.fn(() => mockMeta);
      
      document.createElement = mockCreateElement;
      document.head.querySelector.mockReturnValue(null);

      addNoCacheHeaders();

      expect(mockCreateElement).toHaveBeenCalledWith('meta');
      expect(mockMeta.setAttribute).toHaveBeenCalledWith('name', 'cache-control');
      expect(mockMeta.setAttribute).toHaveBeenCalledWith('content', 'no-cache, no-store, must-revalidate');
      expect(document.head.appendChild).toHaveBeenCalledWith(mockMeta);
    });

    test('should update existing meta tags', () => {
      const mockExistingMeta = {
        setAttribute: jest.fn()
      };
      
      document.head.querySelector.mockReturnValue(mockExistingMeta);

      addNoCacheHeaders();

      expect(mockExistingMeta.setAttribute).toHaveBeenCalledWith('content', 'no-cache, no-store, must-revalidate');
      expect(document.head.appendChild).not.toHaveBeenCalled();
    });
  });

  describe('fetchWithNoCache', () => {
    test('should add no-cache headers to fetch options', () => {
      const mockFetch = jest.fn(() => Promise.resolve(new Response()));
      global.fetch = mockFetch;

      const testUrl = 'https://example.com/api/test';
      const customOptions = {
        method: 'POST',
        headers: {
          'Custom-Header': 'value'
        }
      };

      fetchWithNoCache(testUrl, customOptions);

      expect(mockFetch).toHaveBeenCalledWith(testUrl, {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Custom-Header': 'value'
        }
      });
    });

    test('should work with no options provided', () => {
      const mockFetch = jest.fn(() => Promise.resolve(new Response()));
      global.fetch = mockFetch;

      const testUrl = 'https://example.com/api/test';

      fetchWithNoCache(testUrl);

      expect(mockFetch).toHaveBeenCalledWith(testUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    });
  });
}); 