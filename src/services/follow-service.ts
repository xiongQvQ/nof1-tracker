import { Position, FollowPlan, AgentAccount } from '../scripts/analyze-api';
import { PriceToleranceCheck } from './risk-manager';
import { CapitalAllocationResult } from './futures-capital-manager';
import { PositionManager } from './position-manager';
import { OrderHistoryManager } from './order-history-manager';
import { RiskManager } from './risk-manager';
import { FuturesCapitalManager } from './futures-capital-manager';
import { TradingExecutor } from './trading-executor';
import {
  LOGGING_CONFIG,
  TIME_CONFIG
} from '../config/constants';
import {
  handleErrors,
  safeExecute
} from '../utils/errors';

/**
 * 仓位变化检测结果
 */
interface PositionChange {
  symbol: string;
  type: 'entry_changed' | 'new_position' | 'position_closed' | 'no_change';
  currentPosition?: Position;
  previousPosition?: Position;
}

/**
 * 跟单服务
 * 负责处理跟单逻辑，包括仓位变化检测、资金分配等
 */
export class FollowService {
  private lastPositions: Map<string, Position[]> = new Map();

  constructor(
    private positionManager: PositionManager,
    private orderHistoryManager: OrderHistoryManager,
    private riskManager: RiskManager,
    private capitalManager: FuturesCapitalManager,
    private tradingExecutor: TradingExecutor
  ) {}

  /**
   * 跟单特定 AI Agent
   */
  @handleErrors(Error, 'FollowService.followAgent')
  async followAgent(
    agentId: string,
    currentPositions: Position[],
    totalMargin?: number
  ): Promise<FollowPlan[]> {
    console.log(`${LOGGING_CONFIG.EMOJIS.ROBOT} Following agent: ${agentId}`);

    // 0. 清理孤立的挂单 (没有对应仓位的止盈止损单)
    await this.positionManager.cleanOrphanedOrders();

    const previousPositions = this.lastPositions.get(agentId) || [];
    const followPlans: FollowPlan[] = [];

    // 1. 检测仓位变化
    const changes = this.detectPositionChanges(currentPositions, previousPositions);

    // 2. 处理每种变化
    for (const change of changes) {
      const plans = await this.handlePositionChange(change, agentId);
      followPlans.push(...plans);
    }

    // 3. 检查止盈止损条件
    const exitPlans = this.checkExitConditions(currentPositions, agentId);
    followPlans.push(...exitPlans);

    // 4. 更新历史持仓记录
    this.lastPositions.set(agentId, currentPositions);

    // 5. 应用资金分配
    if (totalMargin && totalMargin > 0) {
      await this.applyCapitalAllocation(followPlans, currentPositions, totalMargin, agentId);
    }

    console.log(`${LOGGING_CONFIG.EMOJIS.SUCCESS} Generated ${followPlans.length} follow plan(s) for agent ${agentId}`);
    return followPlans;
  }

  /**
   * 检测仓位变化
   */
  private detectPositionChanges(
    currentPositions: Position[],
    previousPositions: Position[]
  ): PositionChange[] {
    const changes: PositionChange[] = [];
    const currentPositionsMap = new Map(currentPositions.map(p => [p.symbol, p]));
    const previousPositionsMap = new Map(previousPositions.map(p => [p.symbol, p]));

    // 检查当前所有仓位
    for (const [symbol, currentPosition] of currentPositionsMap) {
      const previousPosition = previousPositionsMap.get(symbol);

      if (!previousPosition) {
        // 新仓位
        if (currentPosition.quantity !== 0) {
          changes.push({
            symbol,
            type: 'new_position',
            currentPosition,
            previousPosition
          });
        }
      } else {
        // 检查 entry_oid 变化（先平仓再开仓）
        if (previousPosition.entry_oid !== currentPosition.entry_oid && currentPosition.quantity !== 0) {
          changes.push({
            symbol,
            type: 'entry_changed',
            currentPosition,
            previousPosition
          });
        } else if (previousPosition.quantity !== 0 && currentPosition.quantity === 0) {
          // 仓位已平
          changes.push({
            symbol,
            type: 'position_closed',
            currentPosition,
            previousPosition
          });
        }
      }
    }

    return changes;
  }

  /**
   * 处理仓位变化
   */
  private async handlePositionChange(
    change: PositionChange,
    agentId: string
  ): Promise<FollowPlan[]> {
    const plans: FollowPlan[] = [];

    switch (change.type) {
      case 'entry_changed':
        await this.handleEntryChanged(change, agentId, plans);
        break;

      case 'new_position':
        this.handleNewPosition(change, agentId, plans);
        break;

      case 'position_closed':
        this.handlePositionClosed(change, agentId, plans);
        break;

      case 'no_change':
        // 不处理
        break;
    }

    return plans;
  }

  /**
   * 处理 entry_oid 变化（先平仓再开仓）
   */
  private async handleEntryChanged(
    change: PositionChange,
    agentId: string,
    plans: FollowPlan[]
  ): Promise<void> {
    const { previousPosition, currentPosition } = change;
    if (!previousPosition || !currentPosition) return;

    const closeReason = `Entry order changed (old: ${previousPosition.entry_oid} → new: ${currentPosition.entry_oid}) - closing old position`;

    // 先平仓旧仓位
    const closeResult = await this.positionManager.closePosition(previousPosition.symbol, closeReason);

    if (closeResult.success) {
      // 等待一小段时间确保平仓完成
      await new Promise(resolve => setTimeout(resolve, TIME_CONFIG.BETWEEN_OPERATIONS_DELAY));

      // 检查新订单是否已处理（去重）
      if (this.orderHistoryManager.isOrderProcessed(currentPosition.entry_oid, currentPosition.symbol)) {
        console.log(`${LOGGING_CONFIG.EMOJIS.INFO} SKIPPED: ${currentPosition.symbol} new entry (OID: ${currentPosition.entry_oid}) already processed`);
        return;
      }

      // 添加价格容忍度检查
      const priceTolerance = this.riskManager.checkPriceTolerance(
        currentPosition.entry_price,
        currentPosition.current_price,
        currentPosition.symbol
      );

      if (priceTolerance.shouldExecute) {
        // 再开新仓位
        const openReason = `New entry order (${currentPosition.entry_oid}) by ${agentId}`;
        const openResult = await this.positionManager.openPosition(currentPosition, openReason, agentId);

        if (openResult.success) {
          console.log(`${LOGGING_CONFIG.EMOJIS.TREND_UP} POSITION CHANGE COMPLETED: ${currentPosition.symbol} ${currentPosition.quantity > 0 ? 'BUY' : 'SELL'} ${Math.abs(currentPosition.quantity)} @ ${currentPosition.entry_price} (OID: ${currentPosition.entry_oid})`);
          console.log(`${LOGGING_CONFIG.EMOJIS.MONEY} Price Check: Entry $${currentPosition.entry_price} vs Current $${currentPosition.current_price} - ${priceTolerance.reason}`);
        } else {
          console.error(`${LOGGING_CONFIG.EMOJIS.ERROR} Failed to open new position for ${currentPosition.symbol}`);
        }
      } else {
        console.log(`${LOGGING_CONFIG.EMOJIS.WARNING} SKIPPED: ${currentPosition.symbol} - Price not acceptable: ${priceTolerance.reason}`);
      }
    } else {
      console.error(`${LOGGING_CONFIG.EMOJIS.ERROR} Failed to close old position for ${currentPosition.symbol}, skipping new position opening`);
    }
  }

  /**
   * 处理新仓位
   */
  private handleNewPosition(
    change: PositionChange,
    agentId: string,
    plans: FollowPlan[]
  ): void {
    const { currentPosition } = change;
    if (!currentPosition) return;

    // 检查订单是否已处理（去重）
    if (this.orderHistoryManager.isOrderProcessed(currentPosition.entry_oid, currentPosition.symbol)) {
      console.log(`${LOGGING_CONFIG.EMOJIS.INFO} SKIPPED: ${currentPosition.symbol} position (OID: ${currentPosition.entry_oid}) already processed`);
      return;
    }

    // 添加价格容忍度检查
    const priceTolerance = this.riskManager.checkPriceTolerance(
      currentPosition.entry_price,
      currentPosition.current_price,
      currentPosition.symbol
    );

    const followPlan: FollowPlan = {
      action: "ENTER",
      symbol: currentPosition.symbol,
      side: currentPosition.quantity > 0 ? "BUY" : "SELL",
      type: "MARKET",
      quantity: Math.abs(currentPosition.quantity),
      leverage: currentPosition.leverage,
      entryPrice: currentPosition.entry_price,
      reason: `New position opened by ${agentId} (OID: ${currentPosition.entry_oid})`,
      agent: agentId,
      timestamp: Date.now(),
      position: currentPosition,
      priceTolerance
    };

    plans.push(followPlan);
    console.log(`${LOGGING_CONFIG.EMOJIS.TREND_UP} NEW POSITION: ${currentPosition.symbol} ${followPlan.side} ${followPlan.quantity} @ ${currentPosition.entry_price} (OID: ${currentPosition.entry_oid})`);
    console.log(`${LOGGING_CONFIG.EMOJIS.MONEY} Price Check: Entry $${currentPosition.entry_price} vs Current $${currentPosition.current_price} - ${priceTolerance.reason}`);
  }

  /**
   * 处理仓位关闭
   */
  private handlePositionClosed(
    change: PositionChange,
    agentId: string,
    plans: FollowPlan[]
  ): void {
    const { previousPosition, currentPosition } = change;
    if (!previousPosition || !currentPosition) return;

    const followPlan: FollowPlan = {
      action: "EXIT",
      symbol: currentPosition.symbol,
      side: previousPosition.quantity > 0 ? "SELL" : "BUY", // 平仓方向相反
      type: "MARKET",
      quantity: Math.abs(previousPosition.quantity),
      leverage: previousPosition.leverage,
      exitPrice: currentPosition.current_price,
      reason: `Position closed by ${agentId}`,
      agent: agentId,
      timestamp: Date.now()
    };

    plans.push(followPlan);
    console.log(`${LOGGING_CONFIG.EMOJIS.TREND_DOWN} POSITION CLOSED: ${currentPosition.symbol} ${followPlan.side} ${followPlan.quantity} @ ${currentPosition.current_price}`);
  }

  /**
   * 检查止盈止损条件
   */
  private checkExitConditions(
    currentPositions: Position[],
    agentId: string
  ): FollowPlan[] {
    const plans: FollowPlan[] = [];

    for (const position of currentPositions) {
      if (position.quantity !== 0 && this.positionManager.shouldExitPosition(position)) {
        const followPlan: FollowPlan = {
          action: "EXIT",
          symbol: position.symbol,
          side: position.quantity > 0 ? "SELL" : "BUY",
          type: "MARKET",
          quantity: Math.abs(position.quantity),
          leverage: position.leverage,
          exitPrice: position.current_price,
          reason: this.positionManager.getExitReason(position),
          agent: agentId,
          timestamp: Date.now()
        };
        plans.push(followPlan);
        console.log(`${LOGGING_CONFIG.EMOJIS.TARGET} EXIT SIGNAL: ${position.symbol} - ${followPlan.reason}`);
      }
    }

    return plans;
  }

  /**
   * 应用资金分配到 ENTER 操作的跟单计划
   */
  private async applyCapitalAllocation(
    followPlans: FollowPlan[],
    currentPositions: Position[],
    totalMargin: number,
    agentId: string
  ): Promise<void> {
    const enterPlans = followPlans.filter(plan => plan.action === "ENTER");

    if (enterPlans.length === 0) {
      return;
    }

    // 获取对应的仓位信息
    const positionsForAllocation: Position[] = [];
    for (const plan of enterPlans) {
      const position = currentPositions.find(p => p.symbol === plan.symbol);
      if (position && position.margin > 0) {
        positionsForAllocation.push(position);
      }
    }

    if (positionsForAllocation.length === 0) {
      return;
    }

    // 获取可用余额
    let availableBalance: number | undefined;
    try {
      const accountInfo = await this.tradingExecutor.getAccountInfo();
      availableBalance = parseFloat(accountInfo.availableBalance);
      console.log(`${LOGGING_CONFIG.EMOJIS.INFO} Available account balance: ${availableBalance.toFixed(2)} USDT`);
    } catch (balanceError) {
      console.warn(`${LOGGING_CONFIG.EMOJIS.WARNING} Failed to get account balance: ${balanceError instanceof Error ? balanceError.message : 'Unknown error'}`);
    }

    // 执行资金分配
    const allocationResult = this.capitalManager.allocateMargin(positionsForAllocation, totalMargin, availableBalance);

    // 显示分配信息
    this.displayCapitalAllocation(allocationResult, agentId);

    // 将分配结果应用到跟单计划
    this.applyAllocationToPlans(allocationResult, enterPlans);
  }

  /**
   * 显示资金分配信息
   */
  private displayCapitalAllocation(allocationResult: CapitalAllocationResult, agentId: string): void {
    console.log(`\n${LOGGING_CONFIG.EMOJIS.MONEY} Capital Allocation for ${agentId}:`);
    console.log('==========================================');
    console.log(`${LOGGING_CONFIG.EMOJIS.MONEY} Total Margin: $${allocationResult.totalAllocatedMargin.toFixed(2)}`);
    console.log(`${LOGGING_CONFIG.EMOJIS.TREND_UP} Total Notional Value: $${allocationResult.totalNotionalValue.toFixed(2)}`);
    console.log('');

    for (const allocation of allocationResult.allocations) {
      console.log(`${allocation.symbol} - ${allocation.leverage}x leverage`);
      console.log(`   ${LOGGING_CONFIG.EMOJIS.CHART} Original Margin: $${allocation.originalMargin.toFixed(2)} (${this.capitalManager.formatPercentage(allocation.allocationRatio)})`);
      console.log(`   ${LOGGING_CONFIG.EMOJIS.MONEY} Allocated Margin: $${allocation.allocatedMargin.toFixed(2)}`);
      console.log(`   ${LOGGING_CONFIG.EMOJIS.TREND_UP} Notional Value: $${allocation.notionalValue.toFixed(2)}`);
      console.log(`   ${LOGGING_CONFIG.EMOJIS.INFO} Adjusted Quantity: ${allocation.adjustedQuantity.toFixed(4)}`);
      console.log('');
    }

    console.log('==========================================');
  }

  /**
   * 将分配结果应用到跟单计划
   */
  private applyAllocationToPlans(
    allocationResult: CapitalAllocationResult,
    enterPlans: FollowPlan[]
  ): void {
    for (const allocation of allocationResult.allocations) {
      const followPlan = enterPlans.find(plan => plan.symbol === allocation.symbol);
      if (followPlan) {
        // 更新资金分配信息
        followPlan.originalMargin = allocation.originalMargin;
        followPlan.allocatedMargin = allocation.allocatedMargin;
        followPlan.notionalValue = allocation.notionalValue;
        followPlan.adjustedQuantity = allocation.adjustedQuantity;
        followPlan.allocationRatio = allocation.allocationRatio;

        // 更新交易数量为调整后的数量
        followPlan.quantity = allocation.adjustedQuantity;
      }
    }
  }

  /**
   * 获取指定 agent 的历史仓位
   */
  getLastPositions(agentId: string): Position[] {
    return this.lastPositions.get(agentId) || [];
  }

  /**
   * 清除指定 agent 的历史仓位
   */
  clearLastPositions(agentId: string): void {
    this.lastPositions.delete(agentId);
  }

  /**
   * 清除所有历史仓位
   */
  clearAllLastPositions(): void {
    this.lastPositions.clear();
  }
}