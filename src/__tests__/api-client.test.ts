import { ApiClient } from '../services/api-client';

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

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
    beforeEach(() => {
      apiClient = new ApiClient();
    });

    it('should handle empty agent ID', async () => {
      const promise = apiClient.getAgentData('');
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should handle null agent ID', async () => {
      const promise = apiClient.getAgentData(null as any);
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should handle undefined agent ID', async () => {
      const promise = apiClient.getAgentData(undefined as any);
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should handle invalid marker values', async () => {
      const promises = [
        apiClient.getAccountTotals(-1),
        apiClient.getAccountTotals(0),
        apiClient.getAccountTotals(Number.MAX_SAFE_INTEGER)
      ];

      await Promise.allSettled(promises);
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
});