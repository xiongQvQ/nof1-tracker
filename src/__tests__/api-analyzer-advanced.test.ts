import { ApiAnalyzer } from '../scripts/analyze-api';
import { ConfigManager } from '../services/config-manager';

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('ApiAnalyzer - Comprehensive Unit Tests', () => {
  let analyzer: ApiAnalyzer;

  beforeEach(() => {
    analyzer = new ApiAnalyzer();

    // Suppress console output for cleaner test output
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    // Clean up resources
    if (analyzer) {
      analyzer.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Constructor and Basic Functionality', () => {
    it('should create ApiAnalyzer instance with default base URL', () => {
      expect(analyzer).toBeInstanceOf(ApiAnalyzer);
      expect(analyzer.getConfigManager).toBeDefined();
      expect(analyzer.clearCache).toBeDefined();
      expect(analyzer.getCacheStats).toBeDefined();
      expect(analyzer.clearAgentHistory).toBeDefined();
      expect(analyzer.clearAllAgentHistory).toBeDefined();
    });

    it('should create an instance with custom base URL', () => {
      const customAnalyzer = new ApiAnalyzer('https://custom.api.com');
      expect(customAnalyzer).toBeInstanceOf(ApiAnalyzer);
      customAnalyzer.destroy();
    });

    it('should return ConfigManager instance', () => {
      const configManager = analyzer.getConfigManager();
      expect(configManager).toBeInstanceOf(ConfigManager);
      expect(configManager.getPriceTolerance).toBeDefined();
      expect(configManager.setPriceTolerance).toBeDefined();
      expect(configManager.setSymbolTolerance).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should allow configuration updates', () => {
      const configManager = analyzer.getConfigManager();

      // Test default value
      expect(configManager.getPriceTolerance()).toBe(1.0);

      // Test setting default tolerance
      configManager.setPriceTolerance(2.0);
      expect(configManager.getPriceTolerance()).toBe(2.0);

      // Test symbol-specific tolerance
      configManager.setSymbolTolerance('BTCUSDT', 1.5);
      expect(configManager.getPriceTolerance('BTCUSDT')).toBe(1.5);
      expect(configManager.getPriceTolerance('ETHUSDT')).toBe(2.0); // fallback to default

      // Test multiple symbols
      configManager.setSymbolTolerance('ETHUSDT', 1.0);
      expect(configManager.getPriceTolerance('ETHUSDT')).toBe(1.0);
    });

    it('should handle invalid tolerance values', () => {
      const configManager = analyzer.getConfigManager();

      expect(() => configManager.setPriceTolerance(0)).toThrow('Price tolerance must be positive');
      expect(() => configManager.setPriceTolerance(-1)).toThrow('Price tolerance must be positive');

      expect(() => configManager.setSymbolTolerance('BTCUSDT', 0)).toThrow('Price tolerance must be positive');
      expect(() => configManager.setSymbolTolerance('BTCUSDT', -0.5)).toThrow('Price tolerance must be positive');
    });

    it('should handle edge cases', () => {
      const configManager = analyzer.getConfigManager();

      // Very small positive numbers should work
      configManager.setPriceTolerance(0.001);
      expect(configManager.getPriceTolerance()).toBe(0.001);

      // Large numbers should work
      configManager.setPriceTolerance(100);
      expect(configManager.getPriceTolerance()).toBe(100);

      // Empty symbol falls back to default tolerance (currently set to 100)
      configManager.setSymbolTolerance('', 5.0);
      expect(configManager.getPriceTolerance('')).toBe(100); // Falls back to default
    });
  });

  describe('Cache Management', () => {
    it('should clear cache without errors', () => {
      expect(() => analyzer.clearCache()).not.toThrow();
    });

    it('should return valid cache stats structure', () => {
      const stats = analyzer.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(typeof stats.size).toBe('number');
      expect(Array.isArray(stats.entries)).toBe(true);
      expect(stats.size).toBeGreaterThanOrEqual(0);
    });

    it('should return consistent cache stats', () => {
      const stats1 = analyzer.getCacheStats();
      const stats2 = analyzer.getCacheStats();

      // Should return same structure
      expect(typeof stats1.size).toBe(typeof stats2.size);
      expect(Array.isArray(stats1.entries)).toBe(Array.isArray(stats2.entries));
    });
  });

  describe('Agent History Management', () => {
    it('should clear specific agent history', () => {
      expect(() => analyzer.clearAgentHistory('test-agent')).not.toThrow();
      expect(() => analyzer.clearAgentHistory('gpt-5')).not.toThrow();
      expect(() => analyzer.clearAgentHistory('claude-sonnet-4-5')).not.toThrow();
    });

    it('should clear all agent history', () => {
      expect(() => analyzer.clearAllAgentHistory()).not.toThrow();
    });

    it('should handle invalid agent IDs gracefully', () => {
      expect(() => analyzer.clearAgentHistory('')).not.toThrow();
      expect(() => analyzer.clearAgentHistory(null as any)).not.toThrow();
      expect(() => analyzer.clearAgentHistory(undefined as any)).not.toThrow();
      expect(() => analyzer.clearAgentHistory(123 as any)).not.toThrow();
      expect(() => analyzer.clearAgentHistory({} as any)).not.toThrow();
    });

    it('should handle special characters in agent IDs', () => {
      expect(() => analyzer.clearAgentHistory('agent-with-dashes')).not.toThrow();
      expect(() => analyzer.clearAgentHistory('agent_with_underscores')).not.toThrow();
      expect(() => analyzer.clearAgentHistory('agent.with.dots')).not.toThrow();
      expect(() => analyzer.clearAgentHistory('agent with spaces')).not.toThrow();
      expect(() => analyzer.clearAgentHistory('agent@with$symbols#')).not.toThrow();
    });
  });

  describe('Method Existence and Types', () => {
    it('should have all expected public methods', () => {
      // Test specific methods directly
      expect(analyzer.getConfigManager).toBeDefined();
      expect(typeof analyzer.getConfigManager).toBe('function');

      expect(analyzer.clearCache).toBeDefined();
      expect(typeof analyzer.clearCache).toBe('function');

      expect(analyzer.getCacheStats).toBeDefined();
      expect(typeof analyzer.getCacheStats).toBe('function');

      expect(analyzer.clearAgentHistory).toBeDefined();
      expect(typeof analyzer.clearAgentHistory).toBe('function');

      expect(analyzer.clearAllAgentHistory).toBeDefined();
      expect(typeof analyzer.clearAllAgentHistory).toBe('function');

      expect(analyzer.getAvailableAgents).toBeDefined();
      expect(typeof analyzer.getAvailableAgents).toBe('function');

      expect(analyzer.followAgent).toBeDefined();
      expect(typeof analyzer.followAgent).toBe('function');

      expect(analyzer.analyzeAccountTotals).toBeDefined();
      expect(typeof analyzer.analyzeAccountTotals).toBe('function');
    });

    it('should return expected types from public methods', () => {
      expect(analyzer.getConfigManager()).toBeInstanceOf(ConfigManager);
      expect(typeof analyzer.getCacheStats()).toBe('object');

      // Methods that should return void
      expect(typeof analyzer.clearCache()).toBe('undefined');
      expect(typeof analyzer.clearAgentHistory('test')).toBe('undefined');
      expect(typeof analyzer.clearAllAgentHistory()).toBe('undefined');
    });
  });

  describe('Error Resilience', () => {
    it('should handle multiple rapid cache operations', () => {
      for (let i = 0; i < 10; i++) {
        expect(() => analyzer.clearCache()).not.toThrow();
        const stats = analyzer.getCacheStats();
        expect(typeof stats.size).toBe('number');
      }
    });

    it('should handle multiple rapid history clearing operations', () => {
      const agentIds = ['agent1', 'agent2', 'agent3', '', null, undefined];

      agentIds.forEach(id => {
        expect(() => analyzer.clearAgentHistory(id as any)).not.toThrow();
      });

      expect(() => analyzer.clearAllAgentHistory()).not.toThrow();
    });

    it('should handle configuration operations under stress', () => {
      const configManager = analyzer.getConfigManager();

      for (let i = 0; i < 50; i++) {
        const tolerance = Math.random() * 10 + 0.1; // Random between 0.1 and 10.1
        configManager.setPriceTolerance(tolerance);
        expect(configManager.getPriceTolerance()).toBe(tolerance);
      }
    });
  });

  describe('Performance and Efficiency', () => {
    it('should perform basic operations quickly', () => {
      const startTime = Date.now();

      // Perform basic operations
      analyzer.getConfigManager();
      analyzer.clearCache();
      analyzer.getCacheStats();
      analyzer.clearAgentHistory('test');
      analyzer.clearAllAgentHistory();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle large configuration operations efficiently', () => {
      const configManager = analyzer.getConfigManager();
      const startTime = Date.now();

      // Set many symbol tolerances
      for (let i = 0; i < 100; i++) {
        configManager.setSymbolTolerance(`SYMBOL${i}`, Math.random() * 5 + 0.1);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 50ms)
      expect(duration).toBeLessThan(50);
    });
  });
});