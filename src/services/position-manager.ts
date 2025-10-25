import { Position } from '../scripts/analyze-api';
import { BinanceService } from './binance-service';
import { TradingExecutor } from './trading-executor';
import { OrderHistoryManager } from './order-history-manager';
import { TradingPlan } from '../types/trading';
import {
  LOGGING_CONFIG,
  TIME_CONFIG,
  TRADING_CONFIG
} from '../config/constants';
import {
  PositionError,
  TradingError,
  handleErrors,
  safeExecute
} from '../utils/errors';

/**
 * 仓位操作结果
 */
export interface PositionOperationResult {
  success: boolean;
  orderId?: number;
  error?: string;
  symbol: string;
  operation: 'open' | 'close';
}

/**
 * 仓位验证结果
 */
export interface PositionValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * 仓位管理器
 * 负责处理所有与仓位相关的操作
 */
export class PositionManager {
  constructor(
    private binanceService: BinanceService,
    private tradingExecutor: TradingExecutor,
    private orderHistoryManager: OrderHistoryManager
  ) {}

  /**
   * 执行平仓操作 - 清理指定币种的所有仓位和挂单
   */
  @handleErrors(PositionError, 'PositionManager.closePosition')
  async closePosition(symbol: string, reason: string): Promise<PositionOperationResult> {
    try {
      console.log(`${LOGGING_CONFIG.EMOJIS.CLOSING} CLOSING ALL POSITIONS: ${symbol} - ${reason}`);

      // 1. 获取该币种的所有仓位和挂单
      const [positions, openOrders] = await Promise.all([
        this.binanceService.getPositions(),
        this.binanceService.getOpenOrders(symbol)
      ]);

      const symbolPositions = positions.filter(p => p.symbol === this.binanceService.convertSymbol(symbol));

      console.log(`${LOGGING_CONFIG.EMOJIS.DATA} Found ${symbolPositions.length} position(s) and ${openOrders.length} open order(s) for ${symbol}`);

      // 2. 如果有挂单，先取消所有挂单
      if (openOrders.length > 0) {
        const cancelSuccess = await this.cancelAllOrders(symbol, openOrders.length);
        if (!cancelSuccess) {
          return {
            success: false,
            error: 'Failed to cancel open orders',
            symbol,
            operation: 'close'
          };
        }
      }

      // 3. 如果有仓位，逐一平掉
      const closeResults = await this.closeAllPositions(symbolPositions);
      const successCount = closeResults.filter(r => r.success).length;

      // 4. 验证平仓是否成功
      if (symbolPositions.length > 0) {
        const verificationSuccess = await this.verifyPositionsClosed(symbol);

        if (verificationSuccess) {
          console.log(`${LOGGING_CONFIG.EMOJIS.SUCCESS} All positions successfully closed for ${symbol} (${successCount}/${symbolPositions.length})`);
          return {
            success: true,
            symbol,
            operation: 'close'
          };
        } else {
          return {
            success: false,
            error: `Some positions still remain open for ${symbol}`,
            symbol,
            operation: 'close'
          };
        }
      } else {
        console.log(`${LOGGING_CONFIG.EMOJIS.SUCCESS} No positions to close for ${symbol}`);
        return {
          success: true,
          symbol,
          operation: 'close'
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${LOGGING_CONFIG.EMOJIS.ERROR} Error in closePosition for ${symbol}: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        symbol,
        operation: 'close'
      };
    }
  }

  /**
   * 执行开仓操作
   * @param position Agent的仓位信息
   * @param reason 开仓原因
   * @param agentId Agent ID
   * @param allocatedMargin 可选,指定用于此仓位的保证金(用于换仓时复用平仓资金)
   */
  @handleErrors(PositionError, 'PositionManager.openPosition')
  async openPosition(
    position: Position,
    reason: string,
    agentId: string,
    allocatedMargin?: number
  ): Promise<PositionOperationResult> {
    try {
      console.log(`${LOGGING_CONFIG.EMOJIS.TREND_UP} OPENING POSITION: ${position.symbol} ${position.quantity > 0 ? 'BUY' : 'SELL'} ${Math.abs(position.quantity)} @ ${position.entry_price} - ${reason}`);

      // 验证仓位参数
      const validation = this.validatePosition(position);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error || 'Position validation failed',
          symbol: position.symbol,
          operation: 'open'
        };
      }

      // 如果指定了保证金,根据保证金计算交易数量
      let quantity = Math.abs(position.quantity);
      if (allocatedMargin !== undefined && allocatedMargin > 0) {
        // 计算名义价值: 保证金 × 杠杆
        const notionalValue = allocatedMargin * position.leverage;
        // 计算数量: 名义价值 / 当前价格
        quantity = notionalValue / position.current_price;
        console.log(`${LOGGING_CONFIG.EMOJIS.MONEY} Using allocated margin: $${allocatedMargin.toFixed(2)} (${position.leverage}x leverage) → Quantity: ${quantity.toFixed(4)}`);
      }

      const tradingPlan: TradingPlan = {
        id: `open_${position.symbol}_${Date.now()}`,
        symbol: position.symbol,
        side: position.quantity > 0 ? "BUY" : "SELL",
        type: "MARKET",
        quantity: quantity,
        leverage: position.leverage,
        timestamp: Date.now()
      };

      const result = await this.tradingExecutor.executePlan(tradingPlan);

      if (result.success) {
        console.log(`${LOGGING_CONFIG.EMOJIS.SUCCESS} Position opened successfully: ${position.symbol} (Order ID: ${result.orderId})`);

        // 标记订单已处理
        this.orderHistoryManager.saveProcessedOrder(
          position.entry_oid,
          position.symbol,
          agentId,
          position.quantity > 0 ? "BUY" : "SELL",
          Math.abs(position.quantity),
          position.entry_price
        );

        return {
          success: true,
          orderId: result.orderId ? parseInt(result.orderId.toString()) : undefined,
          symbol: position.symbol,
          operation: 'open'
        };
      } else {
        return {
          success: false,
          error: result.error || 'Unknown trading error',
          symbol: position.symbol,
          operation: 'open'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${LOGGING_CONFIG.EMOJIS.ERROR} Error opening position ${position.symbol}: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        symbol: position.symbol,
        operation: 'open'
      };
    }
  }

  /**
   * 检查仓位是否需要平仓
   */
  shouldExitPosition(position: Position): boolean {
    if (position.quantity === 0) {
      return false;
    }

    const { current_price, exit_plan } = position;

    if (position.quantity > 0) { // 多头仓位
      return current_price >= exit_plan.profit_target ||
             current_price <= exit_plan.stop_loss;
    } else { // 空头仓位
      return current_price <= exit_plan.profit_target ||
             current_price >= exit_plan.stop_loss;
    }
  }

  /**
   * 获取平仓原因
   */
  getExitReason(position: Position): string {
    const { current_price, exit_plan } = position;

    if (position.quantity > 0) { // 多头仓位
      if (current_price >= exit_plan.profit_target) {
        return `Take profit at ${exit_plan.profit_target}`;
      }
      if (current_price <= exit_plan.stop_loss) {
        return `Stop loss at ${exit_plan.stop_loss}`;
      }
    } else { // 空头仓位
      if (current_price <= exit_plan.profit_target) {
        return `Take profit at ${exit_plan.profit_target}`;
      }
      if (current_price >= exit_plan.stop_loss) {
        return `Stop loss at ${exit_plan.stop_loss}`;
      }
    }

    return "Exit condition met";
  }

  /**
   * 验证仓位参数
   */
  private validatePosition(position: Position): PositionValidationResult {
    const warnings: string[] = [];

    // 检查基本参数
    if (position.quantity === 0) {
      return {
        isValid: false,
        error: 'Position quantity cannot be zero'
      };
    }

    if (position.leverage <= 0) {
      return {
        isValid: false,
        error: 'Leverage must be greater than zero'
      };
    }

    if (position.entry_price <= 0) {
      return {
        isValid: false,
        error: 'Entry price must be greater than zero'
      };
    }

    // 检查止盈止损设置
    const { profit_target, stop_loss } = position.exit_plan;
    if (position.quantity > 0) { // 多头
      if (profit_target <= position.entry_price) {
        warnings.push('Profit target should be higher than entry price for long positions');
      }
      if (stop_loss >= position.entry_price) {
        warnings.push('Stop loss should be lower than entry price for long positions');
      }
    } else { // 空头
      if (profit_target >= position.entry_price) {
        warnings.push('Profit target should be lower than entry price for short positions');
      }
      if (stop_loss <= position.entry_price) {
        warnings.push('Stop loss should be higher than entry price for short positions');
      }
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * 取消所有挂单
   */
  private async cancelAllOrders(symbol: string, orderCount: number): Promise<boolean> {
    console.log(`${LOGGING_CONFIG.EMOJIS.ERROR} Canceling ${orderCount} open orders for ${symbol}...`);

    try {
      await this.binanceService.cancelAllOrders(symbol);
      console.log(`${LOGGING_CONFIG.EMOJIS.SUCCESS} All open orders cancelled for ${symbol}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${LOGGING_CONFIG.EMOJIS.ERROR} Failed to cancel orders for ${symbol}: ${errorMessage}`);
      return false;
    }
  }

  /**
   * 平掉所有指定仓位
   */
  private async closeAllPositions(positions: any[]): Promise<PositionOperationResult[]> {
    const results: PositionOperationResult[] = [];

    for (const position of positions) {
      const positionSize = parseFloat(position.positionAmt);
      if (Math.abs(positionSize) > 0) {
        const result = await this.closeSinglePosition(position);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 平掉单个仓位
   */
  private async closeSinglePosition(position: any): Promise<PositionOperationResult> {
    const positionSize = parseFloat(position.positionAmt);

    console.log(`${LOGGING_CONFIG.EMOJIS.TREND_DOWN} Closing position: ${position.symbol} ${positionSize > 0 ? 'SELL' : 'BUY'} ${Math.abs(positionSize)}`);

    const closePlan: TradingPlan = {
      id: `close_${position.symbol}_${Date.now()}`,
      symbol: position.symbol,
      side: positionSize > 0 ? "SELL" : "BUY",
      type: "MARKET",
      quantity: Math.abs(positionSize),
      leverage: parseInt(position.leverage),
      timestamp: Date.now()
    };

    try {
      const result = await this.tradingExecutor.executePlan(closePlan);

      if (result.success) {
        console.log(`${LOGGING_CONFIG.EMOJIS.SUCCESS} Position closed successfully: ${position.symbol} (Order ID: ${result.orderId})`);
        return {
          success: true,
          orderId: result.orderId ? parseInt(result.orderId.toString()) : undefined,
          symbol: position.symbol,
          operation: 'close'
        };
      } else {
        console.error(`${LOGGING_CONFIG.EMOJIS.ERROR} Failed to close position: ${position.symbol} - ${result.error}`);
        return {
          success: false,
          error: result.error,
          symbol: position.symbol,
          operation: 'close'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${LOGGING_CONFIG.EMOJIS.ERROR} Error closing position ${position.symbol}: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        symbol: position.symbol,
        operation: 'close'
      };
    }
  }

  /**
   * 验证所有仓位是否已平仓
   */
  private async verifyPositionsClosed(symbol: string): Promise<boolean> {
    console.log(`${LOGGING_CONFIG.EMOJIS.SEARCH} Verifying all positions are closed for ${symbol}...`);

    // 等待一段时间让交易确认
    await new Promise(resolve => setTimeout(resolve, TIME_CONFIG.VERIFICATION_DELAY));

    const finalPositions = await this.binanceService.getPositions();
    const remainingPositions = finalPositions.filter(p =>
      p.symbol === this.binanceService.convertSymbol(symbol) &&
      parseFloat(p.positionAmt) !== 0
    );

    return remainingPositions.length === 0;
  }

  /**
   * 清理孤立的挂单 - 没有对应仓位的止盈止损单
   * 在轮询时调用,确保不会有遗留的挂单意外触发
   */
  @handleErrors(PositionError, 'PositionManager.cleanOrphanedOrders')
  async cleanOrphanedOrders(): Promise<{
    success: boolean;
    cancelledOrders: number;
    errors: string[];
  }> {
    try {
      console.log(`${LOGGING_CONFIG.EMOJIS.SEARCH} Checking for orphaned orders...`);

      // 1. 获取所有开放订单
      const allOpenOrders = await this.binanceService.getOpenOrders();
      
      if (allOpenOrders.length === 0) {
        console.log(`${LOGGING_CONFIG.EMOJIS.SUCCESS} No open orders found`);
        return {
          success: true,
          cancelledOrders: 0,
          errors: []
        };
      }

      console.log(`${LOGGING_CONFIG.EMOJIS.DATA} Found ${allOpenOrders.length} open order(s)`);

      // 2. 获取所有仓位(包括零仓位)
      const allPositions = await this.binanceService.getAllPositions();
      
      // 创建仓位映射 - symbol -> 是否有仓位
      const positionMap = new Map<string, boolean>();
      for (const position of allPositions) {
        const positionAmt = parseFloat(position.positionAmt);
        positionMap.set(position.symbol, Math.abs(positionAmt) > 0);
      }

      // 3. 找出孤立的挂单 (止盈止损单但没有对应仓位)
      const orphanedOrders = allOpenOrders.filter(order => {
        // 只检查止盈止损单
        const isStopOrder = order.type === 'TAKE_PROFIT_MARKET' || 
                           order.type === 'STOP_MARKET' ||
                           order.type === 'TAKE_PROFIT' ||
                           order.type === 'STOP';
        
        if (!isStopOrder) {
          return false;
        }

        // 检查是否有对应的仓位
        const hasPosition = positionMap.get(order.symbol) || false;
        return !hasPosition;
      });

      if (orphanedOrders.length === 0) {
        console.log(`${LOGGING_CONFIG.EMOJIS.SUCCESS} No orphaned orders found`);
        return {
          success: true,
          cancelledOrders: 0,
          errors: []
        };
      }

      console.log(`${LOGGING_CONFIG.EMOJIS.WARNING} Found ${orphanedOrders.length} orphaned order(s)`);

      // 4. 取消孤立的挂单
      const errors: string[] = [];
      let cancelledCount = 0;

      for (const order of orphanedOrders) {
        try {
          console.log(`${LOGGING_CONFIG.EMOJIS.ERROR} Cancelling orphaned ${order.type} order: ${order.symbol} (Order ID: ${order.orderId})`);
          
          // 从symbol中提取基础币种名称
          const baseSymbol = order.symbol.replace('USDT', '');
          await this.binanceService.cancelOrder(baseSymbol, order.orderId);
          
          cancelledCount++;
          console.log(`${LOGGING_CONFIG.EMOJIS.SUCCESS} Cancelled order ${order.orderId} for ${order.symbol}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorMsg = `Failed to cancel order ${order.orderId} for ${order.symbol}: ${errorMessage}`;
          console.error(`${LOGGING_CONFIG.EMOJIS.ERROR} ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`${LOGGING_CONFIG.EMOJIS.SUCCESS} Orphaned orders cleanup complete: ${cancelledCount}/${orphanedOrders.length} cancelled`);

      return {
        success: errors.length === 0,
        cancelledOrders: cancelledCount,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${LOGGING_CONFIG.EMOJIS.ERROR} Error cleaning orphaned orders: ${errorMessage}`);
      return {
        success: false,
        cancelledOrders: 0,
        errors: [errorMessage]
      };
    }
  }
}