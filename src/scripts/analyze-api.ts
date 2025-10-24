import { TradingPlan } from "../types/trading";
import { ConfigManager } from "../services/config-manager";
import { RiskManager, PriceToleranceCheck } from "../services/risk-manager";
import { FuturesCapitalManager, CapitalAllocationResult } from "../services/futures-capital-manager";
import { OrderHistoryManager } from "../services/order-history-manager";
import axios from "axios";

/**
 * 自动计算当前的 lastHourlyMarker
 * 基于固定的初始时间点计算真实的小时数
 */
function getCurrentLastHourlyMarker(): number {
  // 固定的初始时间点：2025-10-17T22:34:28.941Z
  // 这个时间点对应 marker=0，之后每经过一小时，marker 增加 1
  const INITIAL_TIME = new Date('2025-10-17T22:34:28.941Z');

  // 当前时间
  const now = new Date();

  // 计算从固定初始时间到现在经过了多少小时
  const hoursSinceInitial = Math.floor((now.getTime() - INITIAL_TIME.getTime()) / (1000 * 60 * 60));

  // 当前的 marker 就是从初始时间到现在经过的小时数
  const currentMarker = hoursSinceInitial;

  console.log(`📅 Auto-calculated lastHourlyMarker: ${currentMarker}`);
  console.log(`📅 Fixed initial time: ${INITIAL_TIME.toISOString()}`);
  console.log(`📅 Current time: ${now.toISOString()}`);
  console.log(`📅 Hours since initial: ${hoursSinceInitial}`);

  return currentMarker;
}

export interface Position {
  symbol: string;
  entry_price: number;
  quantity: number;
  leverage: number;
  current_price: number;
  unrealized_pnl: number;
  confidence: number;
  entry_oid: number;
  tp_oid: number;
  sl_oid: number;
  margin: number; // 初始保证金
  exit_plan: {
    profit_target: number;
    stop_loss: number;
    invalidation_condition: string;
  };
}

export interface AgentAccount {
  id: string;
  model_id: string;
  since_inception_hourly_marker: number;
  positions: Record<string, Position>;
}

interface Nof1Response {
  accountTotals: AgentAccount[];
}

export interface FollowPlan {
  action: "ENTER" | "EXIT" | "HOLD";
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: number;
  leverage: number;
  entryPrice?: number;
  exitPrice?: number;
  reason: string;
  agent: string;
  timestamp: number;
  position?: Position; // 添加position信息以支持止盈止损设置
  priceTolerance?: PriceToleranceCheck; // 价格容忍度检查结果
  // 资金分配相关字段
  originalMargin?: number; // Agent原始保证金
  allocatedMargin?: number; // 分配的保证金
  notionalValue?: number; // 名义持仓价值
  adjustedQuantity?: number; // 调整后的数量
  allocationRatio?: number; // 分配比例
}

export class ApiAnalyzer {
  private baseUrl: string;
  private lastPositions: Map<string, Position[]> = new Map();
  private configManager: ConfigManager;
  private riskManager: RiskManager;
  private capitalManager: FuturesCapitalManager;
  private orderHistoryManager: OrderHistoryManager;

  constructor(
    baseUrl: string = "https://nof1.ai/api",
    configManager?: ConfigManager
  ) {
    this.baseUrl = baseUrl;
    this.configManager = configManager || new ConfigManager();
    this.riskManager = new RiskManager(this.configManager);
    this.capitalManager = new FuturesCapitalManager();
    this.orderHistoryManager = new OrderHistoryManager();

    // Load configuration from environment
    this.configManager.loadFromEnvironment();
  }

  async analyzeAccountTotals(): Promise<TradingPlan[]> {
    // 自动计算当前的 marker
    const marker = getCurrentLastHourlyMarker();
    const url = `https://nof1.ai/api/account-totals?lastHourlyMarker=${marker}`;

    console.log(`📡 Calling API: ${url}`);
    const response = await axios.get<Nof1Response>(url);

    console.log(`📊 Received data for ${response.data.accountTotals.length} model(s)`);

    // Filter to only get the latest data for each agent
    const latestAccounts = this.getLatestAgentData(response.data.accountTotals);
    console.log(`📊 Using latest data for ${latestAccounts.length} unique agents`);

    const tradingPlans: TradingPlan[] = [];

    // Parse each model's positions into trading plans
    for (const account of latestAccounts) {
      for (const [symbol, position] of Object.entries(account.positions)) {
        if (this.needsAction(position)) {
          const tradingPlan: TradingPlan = {
            id: `${account.model_id}_${symbol}_${account.since_inception_hourly_marker}`,
            symbol: position.symbol,
            side: position.quantity > 0 ? "BUY" : "SELL",
            type: "MARKET",
            quantity: Math.abs(position.quantity),
            leverage: position.leverage,
            timestamp: Date.now()
          };

          tradingPlans.push(tradingPlan);
        }
      }
    }

    console.log(`✅ Generated ${tradingPlans.length} trading plan(s) from API data`);
    return tradingPlans;
  }

  /**
   * 跟单特定AI Agent
   */
  async followAgent(agentId: string, totalMargin?: number): Promise<FollowPlan[]> {
    // 自动计算当前的 marker
    const marker = getCurrentLastHourlyMarker();
    const url = `https://nof1.ai/api/account-totals?lastHourlyMarker=${marker}`;

    console.log(`🤖 Following agent: ${agentId}`);
    console.log(`📡 Calling API: ${url}`);

    const response = await axios.get<Nof1Response>(url);

    // Filter to only get the latest data for each agent
    const latestAccounts = this.getLatestAgentData(response.data.accountTotals);

    // Find the target agent from latest data
    const agentAccount = latestAccounts.find(
      account => account.model_id === agentId
    );

    if (!agentAccount) {
      console.log(`❌ Agent ${agentId} not found`);
      return [];
    }

    console.log(`🎯 Found agent ${agentId} (marker: ${agentAccount.since_inception_hourly_marker}) with ${Object.keys(agentAccount.positions).length} positions`);

    const currentPositions = Object.values(agentAccount.positions);
    const previousPositions = this.lastPositions.get(agentId) || [];

    const followPlans: FollowPlan[] = [];
    const currentPositionsMap = new Map(currentPositions.map(p => [p.symbol, p]));
    const previousPositionsMap = new Map(previousPositions.map(p => [p.symbol, p]));

    // 检查entry_oid变化 (先平仓再开仓)
    for (const position of currentPositions) {
      const prevPosition = previousPositionsMap.get(position.symbol);

      // 如果之前有仓位，且entry_oid发生变化（新入场订单）
      if (prevPosition && prevPosition.entry_oid !== position.entry_oid && position.quantity !== 0) {
        // 先平仓旧仓位
        const exitPlan: FollowPlan = {
          action: "EXIT",
          symbol: position.symbol,
          side: prevPosition.quantity > 0 ? "SELL" : "BUY",
          type: "MARKET",
          quantity: Math.abs(prevPosition.quantity),
          leverage: prevPosition.leverage,
          exitPrice: position.current_price,
          reason: `Entry order changed (old: ${prevPosition.entry_oid} → new: ${position.entry_oid}) - closing old position`,
          agent: agentId,
          timestamp: Date.now()
        };
        followPlans.push(exitPlan);
        console.log(`🔄 ENTRY OID CHANGED: ${position.symbol} - closing old position (${prevPosition.entry_oid} → ${position.entry_oid})`);

        // 再开新仓位
        const entryPlan: FollowPlan = {
          action: "ENTER",
          symbol: position.symbol,
          side: position.quantity > 0 ? "BUY" : "SELL",
          type: "MARKET",
          quantity: Math.abs(position.quantity),
          leverage: position.leverage,
          entryPrice: position.entry_price,
          reason: `New entry order (${position.entry_oid}) by ${agentId}`,
          agent: agentId,
          timestamp: Date.now(),
          position: position // 包含完整的position信息以支持止盈止损设置
        };

        // 检查新订单是否已处理（去重）
        if (this.orderHistoryManager.isOrderProcessed(position.entry_oid, position.symbol)) {
          console.log(`🔄 SKIPPED: ${position.symbol} new entry (OID: ${position.entry_oid}) already processed`);
          // 仍然推送平仓计划，但跳过新开仓计划
        } else {
          // 添加价格容忍度检查
          const priceTolerance = this.riskManager.checkPriceTolerance(
            position.entry_price,
            position.current_price,
            position.symbol
          );
          entryPlan.priceTolerance = priceTolerance;

          followPlans.push(entryPlan);
          console.log(`📈 NEW ENTRY ORDER: ${position.symbol} ${entryPlan.side} ${entryPlan.quantity} @ ${position.entry_price} (OID: ${position.entry_oid})`);
          console.log(`💰 Price Check: Entry $${position.entry_price} vs Current $${position.current_price} - ${priceTolerance.reason}`);
        }
      }
      // 如果没有之前仓位，且数量不为0（新开仓）
      else if (!prevPosition && position.quantity !== 0) {
        const followPlan: FollowPlan = {
          action: "ENTER",
          symbol: position.symbol,
          side: position.quantity > 0 ? "BUY" : "SELL",
          type: "MARKET",
          quantity: Math.abs(position.quantity),
          leverage: position.leverage,
          entryPrice: position.entry_price,
          reason: `New position opened by ${agentId} (OID: ${position.entry_oid})`,
          agent: agentId,
          timestamp: Date.now(),
          position: position // 包含完整的position信息以支持止盈止损设置
        };

        // 检查订单是否已处理（去重）
        if (this.orderHistoryManager.isOrderProcessed(position.entry_oid, position.symbol)) {
          console.log(`🔄 SKIPPED: ${position.symbol} position (OID: ${position.entry_oid}) already processed`);
          continue; // 跳过已处理的订单
        }

        // 添加价格容忍度检查
        const priceTolerance = this.riskManager.checkPriceTolerance(
          position.entry_price,
          position.current_price,
          position.symbol
        );
        followPlan.priceTolerance = priceTolerance;

        followPlans.push(followPlan);
        console.log(`📈 NEW POSITION: ${position.symbol} ${followPlan.side} ${followPlan.quantity} @ ${position.entry_price} (OID: ${position.entry_oid})`);
        console.log(`💰 Price Check: Entry $${position.entry_price} vs Current $${position.current_price} - ${priceTolerance.reason}`);
      }
    }

    // 检查平仓 (需要跟单退出)
    for (const position of currentPositions) {
      const prevPosition = previousPositionsMap.get(position.symbol);
      if (prevPosition && prevPosition.quantity !== 0 && position.quantity === 0) {
        const followPlan: FollowPlan = {
          action: "EXIT",
          symbol: position.symbol,
          side: prevPosition.quantity > 0 ? "SELL" : "BUY", // 平仓方向相反
          type: "MARKET",
          quantity: Math.abs(prevPosition.quantity),
          leverage: prevPosition.leverage,
          exitPrice: position.current_price,
          reason: `Position closed by ${agentId}`,
          agent: agentId,
          timestamp: Date.now()
        };
        followPlans.push(followPlan);
        console.log(`📉 POSITION CLOSED: ${position.symbol} ${followPlan.side} ${followPlan.quantity} @ ${position.current_price}`);
      }
    }

    // 检查止盈止损条件
    for (const position of currentPositions) {
      if (position.quantity !== 0 && this.shouldExitPosition(position)) {
        const followPlan: FollowPlan = {
          action: "EXIT",
          symbol: position.symbol,
          side: position.quantity > 0 ? "SELL" : "BUY",
          type: "MARKET",
          quantity: Math.abs(position.quantity),
          leverage: position.leverage,
          exitPrice: position.current_price,
          reason: this.getExitReason(position),
          agent: agentId,
          timestamp: Date.now()
        };
        followPlans.push(followPlan);
        console.log(`🎯 EXIT SIGNAL: ${position.symbol} - ${followPlan.reason}`);
      }
    }

    // 更新历史持仓记录
    this.lastPositions.set(agentId, currentPositions);

    // 如果提供了总保证金，则对ENTER操作进行资金分配
    if (totalMargin && totalMargin > 0) {
      this.applyCapitalAllocation(followPlans, currentPositions, totalMargin, agentId);
    }

    console.log(`✅ Generated ${followPlans.length} follow plan(s) for agent ${agentId}`);
    return followPlans;
  }

  /**
   * 获取所有可用的AI Agent列表
   */
  async getAvailableAgents(): Promise<string[]> {
    // 自动计算当前的 marker
    const marker = getCurrentLastHourlyMarker();
    const url = `https://nof1.ai/api/account-totals?lastHourlyMarker=${marker}`;
    console.log(`📡 Fetching available agents from: ${url}`);

    const response = await axios.get<Nof1Response>(url);

    // Filter to only get the latest data for each agent
    const latestAccounts = this.getLatestAgentData(response.data.accountTotals);

    const agents = latestAccounts.map(account => account.model_id);
    console.log(`🤖 Available agents: ${agents.join(', ')}`);

    return agents;
  }

  /**
   * 获取配置管理器
   */
  getConfigManager(): ConfigManager {
    return this.configManager;
  }

  private needsAction(position: Position): boolean {
    return position.quantity !== 0 &&
           position.current_price > 0 &&
           position.leverage > 0;
  }

  private shouldExitPosition(position: Position): boolean {
    // 检查是否达到止盈目标
    if (position.quantity > 0) { // 多头仓位
      if (position.current_price >= position.exit_plan.profit_target) {
        return true;
      }
      if (position.current_price <= position.exit_plan.stop_loss) {
        return true;
      }
    } else { // 空头仓位
      if (position.current_price <= position.exit_plan.profit_target) {
        return true;
      }
      if (position.current_price >= position.exit_plan.stop_loss) {
        return true;
      }
    }
    return false;
  }

  private getExitReason(position: Position): string {
    if (position.quantity > 0) { // 多头仓位
      if (position.current_price >= position.exit_plan.profit_target) {
        return `Take profit at ${position.exit_plan.profit_target}`;
      }
      if (position.current_price <= position.exit_plan.stop_loss) {
        return `Stop loss at ${position.exit_plan.stop_loss}`;
      }
    } else { // 空头仓位
      if (position.current_price <= position.exit_plan.profit_target) {
        return `Take profit at ${position.exit_plan.profit_target}`;
      }
      if (position.current_price >= position.exit_plan.stop_loss) {
        return `Stop loss at ${position.exit_plan.stop_loss}`;
      }
    }
    return "Exit condition met";
  }

  /**
   * 应用资金分配到ENTER操作的跟单计划
   */
  private applyCapitalAllocation(
    followPlans: FollowPlan[],
    currentPositions: Position[],
    totalMargin: number,
    agentId: string
  ): void {
    // 筛选出ENTER操作的跟单计划
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

    // 执行资金分配
    const allocationResult = this.capitalManager.allocateMargin(positionsForAllocation, totalMargin);

    // 显示分配信息
    console.log(`\n💰 Capital Allocation for ${agentId}:`);
    console.log('==========================================');
    console.log(`💰 Total Margin: $${allocationResult.totalAllocatedMargin.toFixed(2)}`);
    console.log(`📈 Total Notional Value: $${allocationResult.totalNotionalValue.toFixed(2)}`);
    console.log('');

    // 将分配结果应用到跟单计划
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

        // 显示分配详情
        console.log(`${followPlan.symbol} - ${followPlan.side} (${allocation.leverage}x leverage)`);
        console.log(`   📊 Original Margin: $${allocation.originalMargin.toFixed(2)} (${this.capitalManager.formatPercentage(allocation.allocationRatio)})`);
        console.log(`   💰 Allocated Margin: $${allocation.allocatedMargin.toFixed(2)}`);
        console.log(`   📈 Notional Value: $${allocation.notionalValue.toFixed(2)}`);
        console.log(`   📏 Adjusted Quantity: ${allocation.adjustedQuantity.toFixed(4)}`);
        console.log('');
      }
    }

    console.log('==========================================');
  }

  /**
   * 过滤重复数据，只保留每个agent的最新记录
   */
  private getLatestAgentData(accountTotals: AgentAccount[]): AgentAccount[] {
    const agentMap = new Map<string, AgentAccount>();

    // 遍历所有账户数据，为每个agent保留最新时间点的数据
    for (const account of accountTotals) {
      const existing = agentMap.get(account.model_id);

      // 如果不存在或者当前记录的时间点更新，则替换
      if (!existing || account.since_inception_hourly_marker > existing.since_inception_hourly_marker) {
        agentMap.set(account.model_id, account);
      }
    }

    return Array.from(agentMap.values());
  }
}
