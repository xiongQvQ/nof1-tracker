import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { OrderHistoryManager, ProcessedOrder, OrderHistoryData } from '../services/order-history-manager';

// Mock logger functions
jest.mock('../utils/logger', () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logVerbose: jest.fn()
}));

// Mock console methods to reduce test noise
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe('OrderHistoryManager', () => {
  let tempDir: string;
  let manager: OrderHistoryManager;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'order-history-test-'));

    // Mock console methods
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    manager = new OrderHistoryManager(tempDir);
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;

    // Clean up temp directory
    fs.removeSync(tempDir);
  });

  describe('constructor', () => {
    it('should create instance with default directory', () => {
      const defaultManager = new OrderHistoryManager();
      expect(defaultManager).toBeInstanceOf(OrderHistoryManager);
    });

    it('should create instance with custom directory', () => {
      const customManager = new OrderHistoryManager(tempDir);
      expect(customManager).toBeInstanceOf(OrderHistoryManager);
    });

    it('should ensure data directory exists', () => {
      expect(fs.existsSync(tempDir)).toBe(true);
    });

    it('should initialize with empty history when no file exists', () => {
      const orders = manager.getProcessedOrders();
      expect(orders).toEqual([]);
    });
  });

  describe('loadOrderHistory', () => {
    it('should load empty history when file does not exist', () => {
      const { logDebug } = require('../utils/logger');
      
      const orders = manager.getProcessedOrders();
      expect(orders).toEqual([]);
      expect(logDebug).toHaveBeenCalledWith('📚 Starting with empty order history');
    });

    it('should load existing history from file', () => {
      // Create a test history file
      const testData: OrderHistoryData = {
        processedOrders: [
          {
            entryOid: 123456,
            symbol: 'BTC',
            agent: 'test-agent',
            timestamp: Date.now(),
            orderId: '789',
            side: 'BUY',
            quantity: 0.001,
            price: 50000
          }
        ],
        lastUpdated: Date.now()
      };

      fs.writeJsonSync(path.join(tempDir, 'order-history.json'), testData);

      const newManager = new OrderHistoryManager(tempDir);
      const orders = newManager.getProcessedOrders();

      expect(orders).toHaveLength(1);
      expect(orders[0]).toMatchObject({
        entryOid: 123456,
        symbol: 'BTC',
        agent: 'test-agent',
        side: 'BUY',
        quantity: 0.001,
        price: 50000
      });
      expect(require('../utils/logger').logDebug).toHaveBeenCalledWith('📚 Loaded 1 processed orders from history');
    });

    it('should handle corrupted JSON file gracefully', () => {
      // Write invalid JSON
      fs.writeFileSync(path.join(tempDir, 'order-history.json'), '{ invalid json }');

      const newManager = new OrderHistoryManager(tempDir);
      const orders = newManager.getProcessedOrders();

      expect(orders).toEqual([]);
      expect(require('../utils/logger').logWarn).toHaveBeenCalledWith(expect.stringContaining('Failed to load order history'));
    });
  });

  describe('isOrderProcessed', () => {
    it('should return false for non-existent order', () => {
      const isProcessed = manager.isOrderProcessed(123456, 'BTC');
      expect(isProcessed).toBe(false);
    });

    it('should return true for existing order', () => {
      manager.saveProcessedOrder(123456, 'BTC', 'test-agent', 'BUY', 0.001, 50000, '789');

      const isProcessed = manager.isOrderProcessed(123456, 'BTC');
      expect(isProcessed).toBe(true);
      expect(require('../utils/logger').logDebug).toHaveBeenCalledWith('🔄 Order already processed: BTC (OID: 123456)');
    });

    it('should return false for same OID but different symbol', () => {
      manager.saveProcessedOrder(123456, 'BTC', 'test-agent', 'BUY', 0.001, 50000, '789');

      const isProcessed = manager.isOrderProcessed(123456, 'ETH');
      expect(isProcessed).toBe(false);
    });

    it('should return false for different OID but same symbol', () => {
      manager.saveProcessedOrder(123456, 'BTC', 'test-agent', 'BUY', 0.001, 50000, '789');

      const isProcessed = manager.isOrderProcessed(789012, 'BTC');
      expect(isProcessed).toBe(false);
    });

    it('should handle multiple orders correctly', () => {
      manager.saveProcessedOrder(123456, 'BTC', 'agent1', 'BUY', 0.001, 50000, '789');
      manager.saveProcessedOrder(789012, 'ETH', 'agent2', 'SELL', 0.1, 3000, '790');

      expect(manager.isOrderProcessed(123456, 'BTC')).toBe(true);
      expect(manager.isOrderProcessed(789012, 'ETH')).toBe(true);
      expect(manager.isOrderProcessed(123456, 'ETH')).toBe(false);
      expect(manager.isOrderProcessed(789012, 'BTC')).toBe(false);
    });
  });

  describe('saveProcessedOrder', () => {
    it('should save new order successfully', () => {
      const { logInfo } = require('../utils/logger');
      
      manager.saveProcessedOrder(123456, 'BTC', 'test-agent', 'BUY', 0.001, 50000, '789');

      const orders = manager.getProcessedOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0]).toMatchObject({
        entryOid: 123456,
        symbol: 'BTC',
        agent: 'test-agent',
        side: 'BUY',
        quantity: 0.001,
        price: 50000,
        orderId: '789'
      });
      expect(typeof orders[0].timestamp).toBe('number');
      expect(logInfo).toHaveBeenCalledWith('✅ Saved processed order: BTC BUY 0.001 (OID: 123456)');
    });

    it('should save order without optional fields', () => {
      manager.saveProcessedOrder(123456, 'BTC', 'test-agent', 'BUY', 0.001);

      const orders = manager.getProcessedOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0]).toMatchObject({
        entryOid: 123456,
        symbol: 'BTC',
        agent: 'test-agent',
        side: 'BUY',
        quantity: 0.001
      });
      expect(orders[0].orderId).toBeUndefined();
      expect(orders[0].price).toBeUndefined();
    });

    it('should not save duplicate orders', () => {
      manager.saveProcessedOrder(123456, 'BTC', 'test-agent', 'BUY', 0.001, 50000, '789');
      manager.saveProcessedOrder(123456, 'BTC', 'test-agent', 'SELL', 0.002, 51000, '790');

      const orders = manager.getProcessedOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0].side).toBe('BUY'); // Original order preserved
      expect(require('../utils/logger').logDebug).toHaveBeenCalledWith('⚠️ Order BTC (OID: 123456) already exists in history');
    });

    it('should save multiple orders', () => {
      manager.saveProcessedOrder(123456, 'BTC', 'agent1', 'BUY', 0.001, 50000, '789');
      manager.saveProcessedOrder(789012, 'ETH', 'agent2', 'SELL', 0.1, 3000, '790');
      manager.saveProcessedOrder(345678, 'BTC', 'agent1', 'SELL', 0.002, 51000, '791');

      const orders = manager.getProcessedOrders();
      expect(orders).toHaveLength(3);
    });

    it('should persist data to file', () => {
      manager.saveProcessedOrder(123456, 'BTC', 'test-agent', 'BUY', 0.001, 50000, '789');

      // Create new manager instance to test persistence
      const newManager = new OrderHistoryManager(tempDir);
      const orders = newManager.getProcessedOrders();

      expect(orders).toHaveLength(1);
      expect(orders[0]).toMatchObject({
        entryOid: 123456,
        symbol: 'BTC',
        agent: 'test-agent',
        side: 'BUY',
        quantity: 0.001,
        price: 50000,
        orderId: '789'
      });
    });
  });

  describe('getProcessedOrders', () => {
    it('should return empty array for no orders', () => {
      const orders = manager.getProcessedOrders();
      expect(orders).toEqual([]);
    });

    it('should return copy of orders array', () => {
      manager.saveProcessedOrder(123456, 'BTC', 'test-agent', 'BUY', 0.001, 50000, '789');

      const orders1 = manager.getProcessedOrders();
      const orders2 = manager.getProcessedOrders();

      expect(orders1).toEqual(orders2);
      expect(orders1).not.toBe(orders2); // Different array instances
    });

    it('should return all orders', () => {
      manager.saveProcessedOrder(123456, 'BTC', 'agent1', 'BUY', 0.001, 50000, '789');
      manager.saveProcessedOrder(789012, 'ETH', 'agent2', 'SELL', 0.1, 3000, '790');

      const orders = manager.getProcessedOrders();
      expect(orders).toHaveLength(2);
    });
  });

  describe('getProcessedOrdersByAgent', () => {
    beforeEach(() => {
      manager.saveProcessedOrder(123456, 'BTC', 'agent1', 'BUY', 0.001, 50000, '789');
      manager.saveProcessedOrder(789012, 'ETH', 'agent2', 'SELL', 0.1, 3000, '790');
      manager.saveProcessedOrder(345678, 'BTC', 'agent1', 'SELL', 0.002, 51000, '791');
    });

    it('should return orders for specific agent', () => {
      const agent1Orders = manager.getProcessedOrdersByAgent('agent1');
      expect(agent1Orders).toHaveLength(2);
      expect(agent1Orders.every(order => order.agent === 'agent1')).toBe(true);
    });

    it('should return empty array for non-existent agent', () => {
      const orders = manager.getProcessedOrdersByAgent('non-existent');
      expect(orders).toEqual([]);
    });

    it('should return orders for different agents separately', () => {
      const agent1Orders = manager.getProcessedOrdersByAgent('agent1');
      const agent2Orders = manager.getProcessedOrdersByAgent('agent2');

      expect(agent1Orders).toHaveLength(2);
      expect(agent2Orders).toHaveLength(1);
      expect(agent1Orders[0].agent).toBe('agent1');
      expect(agent2Orders[0].agent).toBe('agent2');
    });
  });

  describe('getProcessedOrdersBySymbol', () => {
    beforeEach(() => {
      manager.saveProcessedOrder(123456, 'BTC', 'agent1', 'BUY', 0.001, 50000, '789');
      manager.saveProcessedOrder(789012, 'ETH', 'agent2', 'SELL', 0.1, 3000, '790');
      manager.saveProcessedOrder(345678, 'BTC', 'agent1', 'SELL', 0.002, 51000, '791');
    });

    it('should return orders for specific symbol', () => {
      const btcOrders = manager.getProcessedOrdersBySymbol('BTC');
      expect(btcOrders).toHaveLength(2);
      expect(btcOrders.every(order => order.symbol === 'BTC')).toBe(true);
    });

    it('should return empty array for non-existent symbol', () => {
      const orders = manager.getProcessedOrdersBySymbol('DOGE');
      expect(orders).toEqual([]);
    });

    it('should return orders for different symbols separately', () => {
      const btcOrders = manager.getProcessedOrdersBySymbol('BTC');
      const ethOrders = manager.getProcessedOrdersBySymbol('ETH');

      expect(btcOrders).toHaveLength(2);
      expect(ethOrders).toHaveLength(1);
      expect(btcOrders[0].symbol).toBe('BTC');
      expect(ethOrders[0].symbol).toBe('ETH');
    });
  });

  describe('cleanupOldOrders', () => {
    let testManager: OrderHistoryManager;

    beforeEach(() => {
      // Create a fresh manager for cleanup tests
      testManager = new OrderHistoryManager(tempDir);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      // Add orders with different timestamps
      testManager['historyData'].processedOrders = [
        { entryOid: 1, symbol: 'BTC', agent: 'agent1', timestamp: now - (35 * oneDay), side: 'BUY', quantity: 0.001 },
        { entryOid: 2, symbol: 'ETH', agent: 'agent2', timestamp: now - (25 * oneDay), side: 'SELL', quantity: 0.1 },
        { entryOid: 3, symbol: 'BTC', agent: 'agent1', timestamp: now - (15 * oneDay), side: 'BUY', quantity: 0.002 },
        { entryOid: 4, symbol: 'DOGE', agent: 'agent3', timestamp: now - (5 * oneDay), side: 'SELL', quantity: 100 }
      ];
    });

    it('should remove orders older than specified days', () => {
      const { logInfo } = require('../utils/logger');
      
      const initialCount = testManager.getProcessedOrders().length;
      expect(initialCount).toBe(4);

      testManager.cleanupOldOrders(30);

      const remainingOrders = testManager.getProcessedOrders();
      expect(remainingOrders).toHaveLength(3); // Orders from last 30 days: entryOid 2, 3, 4
      expect(remainingOrders.every(order => order.entryOid === 2 || order.entryOid === 3 || order.entryOid === 4)).toBe(true);
      expect(logInfo).toHaveBeenCalledWith('🧹 Cleaned up 1 old order records (kept last 30 days)');
    });

    it('should use default 30 days when not specified', () => {
      testManager.cleanupOldOrders();

      const remainingOrders = testManager.getProcessedOrders();
      expect(remainingOrders).toHaveLength(3); // Default 30 days keeps orders 2, 3, 4
    });

    it('should not remove any orders when all are recent', () => {
      testManager.cleanupOldOrders(40);

      const remainingOrders = testManager.getProcessedOrders();
      expect(remainingOrders).toHaveLength(4);
    });

    it('should remove all orders when cutoff is very recent', () => {
      testManager.cleanupOldOrders(1);

      const remainingOrders = testManager.getProcessedOrders();
      expect(remainingOrders).toHaveLength(0);
    });

    it('should not log message when no orders are removed', () => {
      testManager.cleanupOldOrders(40);

      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Cleaned up'));
    });

    it('should persist cleanup to file', () => {
      testManager.cleanupOldOrders(30);

      // Create new manager instance to test persistence
      const newManager = new OrderHistoryManager(tempDir);
      const orders = newManager.getProcessedOrders();

      expect(orders).toHaveLength(3); // Should persist the cleaned state with 3 orders
    });
  });

  describe('getStats', () => {
    let statsManager: OrderHistoryManager;

    beforeEach(() => {
      statsManager = new OrderHistoryManager(tempDir);
      statsManager.saveProcessedOrder(123456, 'BTC', 'agent1', 'BUY', 0.001, 50000, '789');
      statsManager.saveProcessedOrder(789012, 'ETH', 'agent2', 'SELL', 0.1, 3000, '790');
      statsManager.saveProcessedOrder(345678, 'BTC', 'agent1', 'SELL', 0.002, 51000, '791');
    });

    it('should return correct statistics', () => {
      const stats = statsManager.getStats();

      expect(stats).toMatchObject({
        totalOrders: 3,
        ordersByAgent: {
          'agent1': 2,
          'agent2': 1
        },
        ordersBySymbol: {
          'BTC': 2,
          'ETH': 1
        }
      });
      expect(typeof stats.lastUpdated).toBe('number');
    });

    it('should return empty stats for no orders', () => {
      // Create a separate empty temp directory for this test
      const emptyTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'order-history-empty-test-'));
      const emptyManager = new OrderHistoryManager(emptyTempDir);
      const stats = emptyManager.getStats();

      expect(stats).toMatchObject({
        totalOrders: 0,
        ordersByAgent: {},
        ordersBySymbol: {}
      });
      expect(typeof stats.lastUpdated).toBe('number');

      // Clean up
      fs.rmSync(emptyTempDir, { recursive: true, force: true });
    });
  });

  describe('printStats', () => {
    let printStatsManager: OrderHistoryManager;

    beforeEach(() => {
      printStatsManager = new OrderHistoryManager(tempDir);
      printStatsManager.saveProcessedOrder(123456, 'BTC', 'agent1', 'BUY', 0.001, 50000, '789');
      printStatsManager.saveProcessedOrder(789012, 'ETH', 'agent2', 'SELL', 0.1, 3000, '790');
      printStatsManager.saveProcessedOrder(345678, 'BTC', 'agent1', 'SELL', 0.002, 51000, '791');
    });

    it('should print formatted statistics', () => {
      const { logInfo } = require('../utils/logger');
      
      printStatsManager.printStats();

      expect(logInfo).toHaveBeenCalledWith('\n📊 Order History Statistics:');
      expect(logInfo).toHaveBeenCalledWith('==========================');
      expect(logInfo).toHaveBeenCalledWith('Total Orders: 3');
      expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('Last Updated:'));
      expect(logInfo).toHaveBeenCalledWith('\nOrders by Agent:');
      expect(logInfo).toHaveBeenCalledWith('  agent1: 2');
      expect(logInfo).toHaveBeenCalledWith('  agent2: 1');
      expect(logInfo).toHaveBeenCalledWith('\nOrders by Symbol:');
      expect(logInfo).toHaveBeenCalledWith('  BTC: 2');
      expect(logInfo).toHaveBeenCalledWith('  ETH: 1');
    });

    it('should handle empty stats gracefully', () => {
      const { logInfo } = require('../utils/logger');
      
      // Create a separate empty temp directory for this test
      const emptyTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'order-history-empty-print-test-'));
      const emptyManager = new OrderHistoryManager(emptyTempDir);
      
      // Clear previous mock calls before testing
      jest.clearAllMocks();
      
      emptyManager.printStats();

      expect(logInfo).toHaveBeenCalledWith('\n📊 Order History Statistics:');
      expect(logInfo).toHaveBeenCalledWith('==========================');
      expect(logInfo).toHaveBeenCalledWith('Total Orders: 0');
      expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('Last Updated:'));
      expect(logInfo).not.toHaveBeenCalledWith('\nOrders by Agent:');
      expect(logInfo).not.toHaveBeenCalledWith('\nOrders by Symbol:');

      // Clean up
      fs.rmSync(emptyTempDir, { recursive: true, force: true });
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers', () => {
      const largeOid = Number.MAX_SAFE_INTEGER;
      const largeQuantity = Number.MAX_VALUE;

      manager.saveProcessedOrder(largeOid, 'BTC', 'agent', 'BUY', largeQuantity, 50000, '789');

      const orders = manager.getProcessedOrders();
      expect(orders[0].entryOid).toBe(largeOid);
      expect(orders[0].quantity).toBe(largeQuantity);
    });

    it('should handle zero quantities', () => {
      manager.saveProcessedOrder(123456, 'BTC', 'agent', 'BUY', 0, 50000, '789');

      const orders = manager.getProcessedOrders();
      expect(orders[0].quantity).toBe(0);
    });

    it('should handle negative quantities', () => {
      manager.saveProcessedOrder(123456, 'BTC', 'agent', 'SELL', -0.001, 50000, '789');

      const orders = manager.getProcessedOrders();
      expect(orders[0].quantity).toBe(-0.001);
      expect(orders[0].side).toBe('SELL');
    });

    it('should handle special characters in agent and symbol names', () => {
      const specialAgent = 'agent-with_special.chars';
      const specialSymbol = 'BTC/USDT';

      manager.saveProcessedOrder(123456, specialSymbol, specialAgent, 'BUY', 0.001, 50000, '789');

      const orders = manager.getProcessedOrders();
      expect(orders[0].agent).toBe(specialAgent);
      expect(orders[0].symbol).toBe(specialSymbol);
    });
  });

  describe('createdAt field handling', () => {
    it('should add createdAt based on earliest order when missing', () => {
      const { logInfo } = require('../utils/logger');
      
      const testData: OrderHistoryData = {
        processedOrders: [
          {
            entryOid: 123456,
            symbol: 'BTC',
            agent: 'test-agent',
            timestamp: Date.now() - 10000,
            side: 'BUY',
            quantity: 0.001
          },
          {
            entryOid: 789012,
            symbol: 'ETH',
            agent: 'test-agent',
            timestamp: Date.now() - 5000,
            side: 'SELL',
            quantity: 0.1
          }
        ],
        lastUpdated: Date.now()
      };

      fs.writeJsonSync(path.join(tempDir, 'order-history.json'), testData);

      const newManager = new OrderHistoryManager(tempDir);
      const createdAt = newManager.getCreatedAt();

      expect(createdAt).toBeLessThanOrEqual(Date.now() - 9000);
      expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('Added createdAt field based on earliest order'));
    });

    it('should add createdAt based on file creation time when no orders', () => {
      const { logInfo } = require('../utils/logger');
      
      const testData: OrderHistoryData = {
        processedOrders: [],
        lastUpdated: Date.now()
      };

      fs.writeJsonSync(path.join(tempDir, 'order-history.json'), testData);

      const newManager = new OrderHistoryManager(tempDir);
      const createdAt = newManager.getCreatedAt();

      expect(createdAt).toBeDefined();
      expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('Added createdAt field'));
    });

    it('should return createdAt when it exists', () => {
      const testManager = new OrderHistoryManager(tempDir);
      testManager.saveProcessedOrder(123456, 'BTC', 'agent1', 'BUY', 0.001, 50000, '789');
      testManager.saveProcessedOrder(789012, 'ETH', 'agent2', 'SELL', 0.1, 3000, '790');
      
      const createdAt = testManager.getCreatedAt();

      expect(createdAt).toBeDefined();
      expect(typeof createdAt).toBe('number');
      expect(createdAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('profit exit records', () => {
    it('should add profit exit record', () => {
      const { logInfo } = require('../utils/logger');
      
      manager.addProfitExitRecord({
        symbol: 'BTCUSDT',
        entryOid: 123456,
        exitPrice: 52000,
        profitPercentage: 25.5,
        reason: 'Profit target reached'
      });

      const records = manager.getProfitExitRecords();
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        symbol: 'BTCUSDT',
        entryOid: 123456,
        exitPrice: 52000,
        profitPercentage: 25.5,
        reason: 'Profit target reached'
      });
      expect(records[0].timestamp).toBeDefined();
      expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('Recorded profit exit'));
    });

    it('should check if profit exit record exists', () => {
      manager.addProfitExitRecord({
        symbol: 'BTCUSDT',
        entryOid: 123456,
        exitPrice: 52000,
        profitPercentage: 25.5,
        reason: 'Profit target reached'
      });

      expect(manager.hasProfitExitRecord(123456, 'BTCUSDT')).toBe(true);
      expect(manager.hasProfitExitRecord(999999, 'BTCUSDT')).toBe(false);
      expect(manager.hasProfitExitRecord(123456, 'ETHUSDT')).toBe(false);
    });

    it('should return false when no profit exits exist', () => {
      expect(manager.hasProfitExitRecord(123456, 'BTCUSDT')).toBe(false);
    });

    it('should get profit exit records by symbol', () => {
      manager.addProfitExitRecord({
        symbol: 'BTCUSDT',
        entryOid: 123456,
        exitPrice: 52000,
        profitPercentage: 25.5,
        reason: 'Profit target reached'
      });

      manager.addProfitExitRecord({
        symbol: 'ETHUSDT',
        entryOid: 789012,
        exitPrice: 3500,
        profitPercentage: 15.0,
        reason: 'Profit target reached'
      });

      const btcRecords = manager.getProfitExitRecordsBySymbol('BTCUSDT');
      expect(btcRecords).toHaveLength(1);
      expect(btcRecords[0].symbol).toBe('BTCUSDT');

      const ethRecords = manager.getProfitExitRecordsBySymbol('ETHUSDT');
      expect(ethRecords).toHaveLength(1);
      expect(ethRecords[0].symbol).toBe('ETHUSDT');
    });

    it('should return empty array for symbol with no profit exits', () => {
      const records = manager.getProfitExitRecordsBySymbol('DOGEUSDT');
      expect(records).toEqual([]);
    });

    it('should persist profit exit records to file', () => {
      manager.addProfitExitRecord({
        symbol: 'BTCUSDT',
        entryOid: 123456,
        exitPrice: 52000,
        profitPercentage: 25.5,
        reason: 'Profit target reached'
      });

      // Create new manager instance to test persistence
      const newManager = new OrderHistoryManager(tempDir);
      const records = newManager.getProfitExitRecords();

      expect(records).toHaveLength(1);
      expect(records[0].symbol).toBe('BTCUSDT');
    });
  });

  describe('reset symbol order status', () => {
    beforeEach(() => {
      manager.saveProcessedOrder(123456, 'BTCUSDT', 'agent1', 'BUY', 0.001, 50000, '789');
      manager.saveProcessedOrder(789012, 'BTCUSDT', 'agent1', 'SELL', 0.002, 51000, '790');
      manager.saveProcessedOrder(345678, 'ETHUSDT', 'agent2', 'BUY', 0.1, 3000, '791');
    });

    it('should reset specific order by entryOid', () => {
      const { logInfo } = require('../utils/logger');
      
      manager.resetSymbolOrderStatus('BTCUSDT', 123456);

      expect(manager.isOrderProcessed(123456, 'BTCUSDT')).toBe(false);
      expect(manager.isOrderProcessed(789012, 'BTCUSDT')).toBe(true);
      expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('Reset order status for BTCUSDT: removed 1 processed order'));
    });

    it('should reset all orders for a symbol', () => {
      const { logInfo } = require('../utils/logger');
      
      manager.resetSymbolOrderStatus('BTCUSDT');

      expect(manager.isOrderProcessed(123456, 'BTCUSDT')).toBe(false);
      expect(manager.isOrderProcessed(789012, 'BTCUSDT')).toBe(false);
      expect(manager.isOrderProcessed(345678, 'ETHUSDT')).toBe(true);
      expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('Reset order status for BTCUSDT: removed 2 processed order'));
    });

    it('should log when no orders found to reset', () => {
      const { logDebug } = require('../utils/logger');
      
      manager.resetSymbolOrderStatus('DOGEUSDT');

      expect(logDebug).toHaveBeenCalledWith(expect.stringContaining('No processed orders found to reset'));
    });

    it('should persist reset to file', () => {
      manager.resetSymbolOrderStatus('BTCUSDT');

      // Create new manager instance to test persistence
      const newManager = new OrderHistoryManager(tempDir);
      expect(newManager.isOrderProcessed(123456, 'BTCUSDT')).toBe(false);
      expect(newManager.isOrderProcessed(345678, 'ETHUSDT')).toBe(true);
    });
  });

  describe('reload history', () => {
    it('should reload history from file', () => {
      manager.saveProcessedOrder(123456, 'BTC', 'agent1', 'BUY', 0.001, 50000, '789');

      // Manually modify the file
      const filePath = path.join(tempDir, 'order-history.json');
      const data = fs.readJsonSync(filePath);
      data.processedOrders.push({
        entryOid: 999999,
        symbol: 'ETH',
        agent: 'agent2',
        timestamp: Date.now(),
        side: 'SELL',
        quantity: 0.1
      });
      fs.writeJsonSync(filePath, data);

      // Reload
      manager.reloadHistory();

      const orders = manager.getProcessedOrders();
      expect(orders).toHaveLength(2);
      expect(orders.some(o => o.entryOid === 999999)).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical trading workflow', () => {
      // Simulate a typical trading workflow
      const workflowOrders = [
        { oid: 1001, symbol: 'BTC', agent: 'trader-bot', side: 'BUY' as const, quantity: 0.001, price: 50000 },
        { oid: 1002, symbol: 'ETH', agent: 'trader-bot', side: 'BUY' as const, quantity: 0.1, price: 3000 },
        { oid: 1003, symbol: 'BTC', agent: 'trader-bot', side: 'SELL' as const, quantity: 0.001, price: 51000 },
        { oid: 1004, symbol: 'DOGE', agent: 'another-bot', side: 'BUY' as const, quantity: 100, price: 0.05 }
      ];

      // Process each order
      workflowOrders.forEach(order => {
        if (!manager.isOrderProcessed(order.oid, order.symbol)) {
          manager.saveProcessedOrder(
            order.oid,
            order.symbol,
            order.agent,
            order.side,
            order.quantity,
            order.price
          );
        }
      });

      // Verify workflow results
      expect(manager.getProcessedOrders()).toHaveLength(4);
      expect(manager.getProcessedOrdersByAgent('trader-bot')).toHaveLength(3);
      expect(manager.getProcessedOrdersByAgent('another-bot')).toHaveLength(1);
      expect(manager.getProcessedOrdersBySymbol('BTC')).toHaveLength(2);

      const stats = manager.getStats();
      expect(stats.totalOrders).toBe(4);
      expect(stats.ordersByAgent['trader-bot']).toBe(3);
      expect(stats.ordersBySymbol['BTC']).toBe(2);
    });

    it('should handle deduplication across multiple sessions', () => {
      // First session
      manager.saveProcessedOrder(1001, 'BTC', 'bot1', 'BUY', 0.001, 50000, 'order1');
      manager.saveProcessedOrder(1002, 'ETH', 'bot1', 'BUY', 0.1, 3000, 'order2');

      // Simulate restart - new manager instance
      const session2 = new OrderHistoryManager(tempDir);

      // Try to process same orders again (should be deduplicated)
      session2.saveProcessedOrder(1001, 'BTC', 'bot1', 'BUY', 0.001, 50000, 'order1');
      session2.saveProcessedOrder(1002, 'ETH', 'bot1', 'BUY', 0.1, 3000, 'order2');

      // Add new order
      session2.saveProcessedOrder(1003, 'BTC', 'bot1', 'SELL', 0.001, 51000, 'order3');

      // Verify deduplication worked
      const allOrders = session2.getProcessedOrders();
      expect(allOrders).toHaveLength(3); // Only 3 unique orders, not 5

      // Verify order details are preserved
      const btcOrders = session2.getProcessedOrdersBySymbol('BTC');
      expect(btcOrders).toHaveLength(2);
      expect(btcOrders[0].side).toBe('BUY');
      expect(btcOrders[1].side).toBe('SELL');
    });

    it('should handle complex workflow with profit exits and resets', () => {
      // Initial trade
      manager.saveProcessedOrder(1001, 'BTCUSDT', 'bot1', 'BUY', 0.001, 50000, 'order1');
      
      // Profit exit
      manager.addProfitExitRecord({
        symbol: 'BTCUSDT',
        entryOid: 1001,
        exitPrice: 52000,
        profitPercentage: 20,
        reason: 'Profit target reached'
      });

      // Reset for refollow
      manager.resetSymbolOrderStatus('BTCUSDT', 1001);

      // New trade after reset
      manager.saveProcessedOrder(1002, 'BTCUSDT', 'bot1', 'BUY', 0.001, 52000, 'order2');

      // Verify state
      expect(manager.isOrderProcessed(1001, 'BTCUSDT')).toBe(false);
      expect(manager.isOrderProcessed(1002, 'BTCUSDT')).toBe(true);
      expect(manager.hasProfitExitRecord(1001, 'BTCUSDT')).toBe(true);
      expect(manager.getProcessedOrders()).toHaveLength(1);
      expect(manager.getProfitExitRecords()).toHaveLength(1);
    });
  });
});