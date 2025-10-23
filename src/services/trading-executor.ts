import { TradingPlan } from "../types/trading";
import { BinanceService, StopLossOrder, TakeProfitOrder } from "./binance-service";

export interface ExecutionResult {
  success: boolean;
  orderId?: string;
  error?: string;
  takeProfitOrderId?: string;
  stopLossOrderId?: string;
}

export interface StopOrderExecutionResult extends ExecutionResult {
  takeProfitOrder?: TakeProfitOrder;
  stopLossOrder?: StopLossOrder;
}

export class TradingExecutor {
  private binanceService: BinanceService;

  constructor(apiKey?: string, apiSecret?: string) {
    this.binanceService = new BinanceService(apiKey || "", apiSecret || "");
  }

  async executePlan(tradingPlan: TradingPlan): Promise<ExecutionResult> {
    try {
      console.log(`🔄 Executing trade: ${tradingPlan.symbol} ${tradingPlan.side} ${tradingPlan.quantity}`);

      // 模拟执行主订单
      const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        orderId: orderId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * 执行带止盈止损的交易
   */
  async executePlanWithStopOrders(
    tradingPlan: TradingPlan,
    position: any
  ): Promise<StopOrderExecutionResult> {
    try {
      console.log(`🔄 Executing trade with stop orders: ${tradingPlan.symbol} ${tradingPlan.side} ${tradingPlan.quantity}`);

      // 1. 执行主订单
      const mainOrderResult = await this.executePlan(tradingPlan);
      if (!mainOrderResult.success) {
        return mainOrderResult;
      }

      // 2. 创建止盈止损订单
      const stopOrders = this.binanceService.createStopOrdersFromPosition(
        position,
        tradingPlan.side
      );

      console.log(`🛡️ Setting up stop orders for ${tradingPlan.symbol}:`);

      let takeProfitOrderId: string | undefined;
      let stopLossOrderId: string | undefined;

      // 3. 执行止盈订单
      if (stopOrders.takeProfitOrder) {
        console.log(`📈 Take Profit: ${stopOrders.takeProfitOrder.stopPrice}`);
        takeProfitOrderId = `tp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      // 4. 执行止损订单
      if (stopOrders.stopLossOrder) {
        console.log(`📉 Stop Loss: ${stopOrders.stopLossOrder.stopPrice}`);
        stopLossOrderId = `sl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      return {
        success: true,
        orderId: mainOrderResult.orderId,
        takeProfitOrderId,
        stopLossOrderId,
        takeProfitOrder: stopOrders.takeProfitOrder || undefined,
        stopLossOrder: stopOrders.stopLossOrder || undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * 取消止盈止损订单
   */
  async cancelStopOrders(takeProfitOrderId?: string, stopLossOrderId?: string): Promise<{
    success: boolean;
    cancelledOrders: string[];
    errors: string[];
  }> {
    const cancelledOrders: string[] = [];
    const errors: string[] = [];

    try {
      if (takeProfitOrderId) {
        console.log(`❌ Cancelling take profit order: ${takeProfitOrderId}`);
        cancelledOrders.push(takeProfitOrderId);
      }

      if (stopLossOrderId) {
        console.log(`❌ Cancelling stop loss order: ${stopLossOrderId}`);
        cancelledOrders.push(stopLossOrderId);
      }

      return {
        success: true,
        cancelledOrders,
        errors
      };
    } catch (error) {
      return {
        success: false,
        cancelledOrders,
        errors: [error instanceof Error ? error.message : "Unknown error"]
      };
    }
  }
}
