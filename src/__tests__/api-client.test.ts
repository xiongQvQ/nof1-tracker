import { ApiClient } from '../services/api-client';
import axios from 'axios';
import { API_CONFIG } from '../config/constants';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('ApiClient - Simple Tests', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    // Suppress console output for cleaner test output
    console.log = jest.fn();
    console.error = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  describe('Constructor', () => {
    it('should create instance with default parameters', () => {
      apiClient = new ApiClient();
      expect(apiClient).toBeInstanceOf(ApiClient);
    });

    it('should create instance with custom parameters', () => {
      apiClient = new ApiClient('https://custom-api.com', 5000);
      expect(apiClient).toBeInstanceOf(ApiClient);
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      apiClient = new ApiClient();
    });

    it('should clear cache', () => {
      expect(() => apiClient.clearCache()).not.toThrow();
    });

    it('should return cache stats', () => {
      const stats = apiClient.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(typeof stats.size).toBe('number');
      expect(Array.isArray(stats.entries)).toBe(true);
      expect(stats.size).toBeGreaterThanOrEqual(0);
    });

    it('should track cache entries correctly', async () => {
      // This test doesn't make real HTTP calls, just tests the cache structure
      const stats = apiClient.getCacheStats();

      expect(stats.size).toBe(0); // Initially empty
      expect(stats.entries).toHaveLength(0);
    });
  });

  describe('Method Existence', () => {
    beforeEach(() => {
      apiClient = new ApiClient();
    });

    it('should have all required methods', () => {
      expect(typeof apiClient.getAccountTotals).toBe('function');
      expect(typeof apiClient.getAvailableAgents).toBe('function');
      expect(typeof apiClient.getAgentData).toBe('function');
      expect(typeof apiClient.clearCache).toBe('function');
      expect(typeof apiClient.getCacheStats).toBe('function');
    });

    it('should have correct method signatures', async () => {
      // Test that methods exist and can be called (even if they fail due to no network)
      expect(apiClient.getAccountTotals).toBeDefined();
      expect(apiClient.getAvailableAgents).toBeDefined();
      expect(apiClient.getAgentData).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      apiClient = new ApiClient();
    });

    it('should handle method calls gracefully', async () => {
      // These will likely fail due to no real network, but should not crash
      const getAccountTotalsPromise = apiClient.getAccountTotals();
      const getAvailableAgentsPromise = apiClient.getAvailableAgents();
      const getAgentDataPromise = apiClient.getAgentData('test-agent');

      // Should not throw synchronously
      expect(getAccountTotalsPromise).toBeInstanceOf(Promise);
      expect(getAvailableAgentsPromise).toBeInstanceOf(Promise);
      expect(getAgentDataPromise).toBeInstanceOf(Promise);

      // They may reject, but that's expected without proper mocking
      await Promise.allSettled([
        getAccountTotalsPromise,
        getAvailableAgentsPromise,
        getAgentDataPromise
      ]);
    }, 60000);
  });

  describe('Edge Cases', () => {
    let mockAxiosInstance: any;

    beforeEach(() => {
      mockAxiosInstance = {
        get: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
      apiClient = new ApiClient();
    });

    it('should handle empty agent ID', async () => {
      const mockResponse = {
        data: {
          accountTotals: []
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getAgentData('');
      expect(result).toBeNull();
    });

    it('should handle null agent ID', async () => {
      const mockResponse = {
        data: {
          accountTotals: []
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getAgentData(null as any);
      expect(result).toBeNull();
    });

    it('should handle undefined agent ID', async () => {
      const mockResponse = {
        data: {
          accountTotals: []
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getAgentData(undefined as any);
      expect(result).toBeNull();
    });

    it('should handle invalid marker values', async () => {
      const mockResponse = {
        data: {
          accountTotals: []
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const results = await Promise.allSettled([
        apiClient.getAccountTotals(-1),
        apiClient.getAccountTotals(0),
        apiClient.getAccountTotals(Number.MAX_SAFE_INTEGER)
      ]);

      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    }, 120000);
  });

  describe('Configuration', () => {
    it('should handle different base URLs', () => {
      const client1 = new ApiClient();
      const client2 = new ApiClient('https://test.com');
      const client3 = new ApiClient('https://api.example.com', 30000);

      expect(client1).toBeInstanceOf(ApiClient);
      expect(client2).toBeInstanceOf(ApiClient);
      expect(client3).toBeInstanceOf(ApiClient);
    });

    it('should handle different timeout values', () => {
      const client1 = new ApiClient(undefined, 1000);
      const client2 = new ApiClient(undefined, 30000);
      const client3 = new ApiClient(undefined, 0);

      expect(client1).toBeInstanceOf(ApiClient);
      expect(client2).toBeInstanceOf(ApiClient);
      expect(client3).toBeInstanceOf(ApiClient);
    });
  });

  describe('Performance', () => {
    it('should create instances quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        new ApiClient();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple cache operations quickly', () => {
      apiClient = new ApiClient();
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        apiClient.getCacheStats();
        apiClient.clearCache();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 50ms)
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Network Requests with Mocked Axios', () => {
    let mockAxiosInstance: any;

    beforeEach(() => {
      // Create a mock axios instance
      mockAxiosInstance = {
        get: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
      apiClient = new ApiClient();
    });

    it('should successfully fetch account totals', async () => {
      const mockResponse = {
        data: {
          accountTotals: [
            {
              model_id: 'agent-1',
              since_inception_hourly_marker: 100,
              positions: {}
            }
          ]
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getAccountTotals();

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalled();
    });

    it('should use cached data on second request', async () => {
      const mockResponse = {
        data: {
          accountTotals: [
            {
              model_id: 'agent-1',
              since_inception_hourly_marker: 100,
              positions: {}
            }
          ]
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // First call
      await apiClient.getAccountTotals();
      // Second call should use cache
      await apiClient.getAccountTotals();

      // Should only call API once
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      await expect(apiClient.getAccountTotals()).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('timeout of 30000ms exceeded'));

      await expect(apiClient.getAccountTotals()).rejects.toThrow();
    });

    it('should retry on failure', async () => {
      // First call fails, second succeeds (test environment uses 2 retries)
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          data: {
            accountTotals: []
          }
        });

      const result = await apiClient.getAccountTotals();

      expect(result).toEqual({ accountTotals: [] });
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Management Advanced', () => {
    let mockAxiosInstance: any;

    beforeEach(() => {
      mockAxiosInstance = {
        get: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
      apiClient = new ApiClient();
    });

    it('should expire old cache entries', async () => {
      const mockResponse = {
        data: {
          accountTotals: []
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // First call
      await apiClient.getAccountTotals();

      // Mock time passing beyond cache timeout
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + API_CONFIG.TIMEOUT + 1000);

      // Second call should fetch again
      await apiClient.getAccountTotals();

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should limit cache size to 100 entries', async () => {
      const mockResponse = {
        data: {
          accountTotals: []
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Fill cache with 101 entries
      for (let i = 0; i <= 100; i++) {
        await apiClient.getAccountTotals(i);
      }

      const stats = apiClient.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(100);
    });

    it('should track cache entry age', async () => {
      const mockResponse = {
        data: {
          accountTotals: []
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await apiClient.getAccountTotals();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const stats = apiClient.getCacheStats();
      expect(stats.entries.length).toBeGreaterThan(0);
      expect(stats.entries[0].age).toBeGreaterThan(0);
    });
  });

  describe('Agent Data Methods', () => {
    let mockAxiosInstance: any;

    beforeEach(() => {
      mockAxiosInstance = {
        get: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
      apiClient = new ApiClient();
    });

    it('should get available agents', async () => {
      const mockResponse = {
        data: {
          accountTotals: [
            {
              model_id: 'agent-1',
              since_inception_hourly_marker: 100,
              positions: {}
            },
            {
              model_id: 'agent-2',
              since_inception_hourly_marker: 101,
              positions: {}
            },
            {
              model_id: 'agent-1',
              since_inception_hourly_marker: 102,
              positions: {}
            }
          ]
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const agents = await apiClient.getAvailableAgents();

      expect(agents).toHaveLength(2);
      expect(agents).toContain('agent-1');
      expect(agents).toContain('agent-2');
    });

    it('should get specific agent data', async () => {
      const mockResponse = {
        data: {
          accountTotals: [
            {
              model_id: 'agent-1',
              since_inception_hourly_marker: 100,
              positions: { 'BTCUSDT': {} }
            },
            {
              model_id: 'agent-2',
              since_inception_hourly_marker: 101,
              positions: {}
            }
          ]
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const agentData = await apiClient.getAgentData('agent-1');

      expect(agentData).not.toBeNull();
      expect(agentData?.model_id).toBe('agent-1');
      expect(agentData?.since_inception_hourly_marker).toBe(100);
    });

    it('should return null for non-existent agent', async () => {
      const mockResponse = {
        data: {
          accountTotals: [
            {
              model_id: 'agent-1',
              since_inception_hourly_marker: 100,
              positions: {}
            }
          ]
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const agentData = await apiClient.getAgentData('non-existent-agent');

      expect(agentData).toBeNull();
    });

    it('should return latest data for agent with multiple entries', async () => {
      const mockResponse = {
        data: {
          accountTotals: [
            {
              model_id: 'agent-1',
              since_inception_hourly_marker: 100,
              positions: { 'BTCUSDT': {} }
            },
            {
              model_id: 'agent-1',
              since_inception_hourly_marker: 105,
              positions: { 'ETHUSDT': {} }
            },
            {
              model_id: 'agent-1',
              since_inception_hourly_marker: 102,
              positions: { 'ADAUSDT': {} }
            }
          ]
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const agentData = await apiClient.getAgentData('agent-1');

      expect(agentData).not.toBeNull();
      expect(agentData?.since_inception_hourly_marker).toBe(105);
      expect(agentData?.positions).toHaveProperty('ETHUSDT');
    });
  });

  describe('Error Decorator and Retry Logic', () => {
    let mockAxiosInstance: any;

    beforeEach(() => {
      mockAxiosInstance = {
        get: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
      apiClient = new ApiClient();
    });

    it('should handle API errors with proper error messages', async () => {
      const apiError = {
        response: {
          status: 429,
          data: {
            message: 'Rate limit exceeded'
          }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(apiError);

      await expect(apiClient.getAccountTotals()).rejects.toThrow();
    });

    it('should handle 404 errors', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: {
            message: 'Not found'
          }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(notFoundError);

      await expect(apiClient.getAccountTotals()).rejects.toThrow();
    });

    it('should handle 500 server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            message: 'Internal server error'
          }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(serverError);

      await expect(apiClient.getAccountTotals()).rejects.toThrow();
    });

    it('should eventually fail after max retries', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Persistent error'));

      await expect(apiClient.getAccountTotals()).rejects.toThrow();
      // Should retry 2 times in test environment
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });
});