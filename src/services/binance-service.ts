import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import CryptoJS from 'crypto-js';
import http from 'http';
import https from 'https';

export interface BinanceOrder {
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET" | "STOP_MARKET";
  quantity: string;
  leverage: number;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  closePosition?: string;
}

export interface StopLossOrder {
  symbol: string;
  side: "BUY" | "SELL";
  type: "STOP_MARKET" | "STOP";
  quantity: string;
  stopPrice: string;
  closePosition?: string;
}

export interface TakeProfitOrder {
  symbol: string;
  side: "BUY" | "SELL";
  type: "TAKE_PROFIT_MARKET" | "TAKE_PROFIT";
  quantity: string;
  stopPrice: string;
  closePosition?: string;
}

export interface BinanceApiResponse<T = any> {
  code?: number;
  msg?: string;
  data?: T;
}

// Binance API通常直接返回数据，不包装在response对象中
export type BinanceDirectResponse<T> = T;

export interface OrderResponse {
  orderId: number;
  symbol: string;
  status: string;
  clientOrderId: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  cumQty: string;
  cumQuote: string;
  timeInForce: string;
  type: string;
  reduceOnly: boolean;
  closePosition: boolean;
  side: string;
  positionSide: string;
  stopPrice: string;
  workingType: string;
  priceProtect: boolean;
  origType: string;
  time: number;
  updateTime: number;
}

export interface PositionResponse {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  maxNotionalValue: string;
  marginType: string;
  isolatedMargin: string;
  isAutoAddMargin: string;
  positionSide: string;
  notional: string;
  isolatedWallet: string;
  updateTime: number;
}

export class BinanceService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private client: AxiosInstance;
  private symbolInfoCache: Map<string, any> = new Map();
  private serverTimeOffset: number = 0; // 服务器时间偏移量(ms)
  private httpAgent: http.Agent;
  private httpsAgent: https.Agent;

  constructor(apiKey: string, apiSecret: string, testnet?: boolean) {
    // 如果没有明确指定，则从环境变量读取
    if (testnet === undefined) {
      testnet = process.env.BINANCE_TESTNET === 'true';
    }
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = testnet
      ? 'https://testnet.binancefuture.com'
      : 'https://fapi.binance.com';

    // 创建自定义 agents 以便稍后清理
    this.httpAgent = new http.Agent({ keepAlive: true });
    this.httpsAgent = new https.Agent({ keepAlive: true });

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      httpAgent: this.httpAgent,
      httpsAgent: this.httpsAgent,
    });

    // 初始化时同步服务器时间
    this.syncServerTime().catch(err => {
      console.warn('⚠️ Failed to sync server time:', err.message);
    });
  }

  /**
   * Convert symbol from nof1 format (BTC) to Binance format (BTCUSDT)
   */
  public convertSymbol(symbol: string): string {
    // If symbol already ends with USDT, return as is
    if (symbol.endsWith('USDT')) {
      return symbol;
    }
    // Otherwise, append USDT
    return `${symbol}USDT`;
  }

  /**
   * Format quantity precision based on symbol
   */
  public formatQuantity(quantity: number | string, symbol: string): string {
    const baseSymbol = this.convertSymbol(symbol);

    // Updated precision map based on actual Binance futures API specifications
    const precisionMap: Record<string, number> = {
      'BTCUSDT': 3,      // BTC futures: 3 decimal places (min 0.001, step 0.001)
      'ETHUSDT': 3,      // ETH futures: 3 decimal places (min 0.001, step 0.001)
      'BNBUSDT': 2,      // BNB futures: 2 decimal places (min 0.01, step 0.01)
      'XRPUSDT': 1,      // XRP futures: 1 decimal place (min 0.1, step 0.1)
      'ADAUSDT': 0,      // ADA futures: 0 decimal places (min 1, step 1)
      'DOGEUSDT': 0,     // DOGE futures: 0 decimal places (min 1, step 1)
      'SOLUSDT': 2,      // SOL futures: 2 decimal places (min 0.01, step 0.01)
      'AVAXUSDT': 2,     // AVAX futures: 2 decimal places (min 0.01, step 0.01)
      'MATICUSDT': 1,    // MATIC futures: 1 decimal place (min 0.1, step 0.1)
      'DOTUSDT': 2,      // DOT futures: 2 decimal places (min 0.01, step 0.01)
      'LINKUSDT': 2,     // LINK futures: 2 decimal places (min 0.01, step 0.01)
      'UNIUSDT': 2,      // UNI futures: 2 decimal places (min 0.01, step 0.01)
    };

    const precision = precisionMap[baseSymbol] || 3; // Default to 3 decimal places

    // Convert to number if it's a string
    const quantityNum = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

    // Define minimum quantities based on actual Binance futures API specifications
    const minQtyMap: Record<string, number> = {
      'BTCUSDT': 0.001,     // BTC futures min: 0.001
      'ETHUSDT': 0.001,     // ETH futures min: 0.001
      'BNBUSDT': 0.01,      // BNB futures min: 0.01
      'XRPUSDT': 0.1,       // XRP futures min: 0.1
      'ADAUSDT': 1,         // ADA futures min: 1
      'DOGEUSDT': 10,       // DOGE futures min: 10
      'SOLUSDT': 0.01,      // SOL futures min: 0.01
      'AVAXUSDT': 0.01,     // AVAX futures min: 0.01
      'MATICUSDT': 0.1,     // MATIC futures min: 0.1
      'DOTUSDT': 0.01,      // DOT futures min: 0.01
      'LINKUSDT': 0.01,     // LINK futures min: 0.01
      'UNIUSDT': 0.01,      // UNI futures min: 0.01
    };

    const minQty = minQtyMap[baseSymbol] || 0.001;

    // If quantity is too small, return minimum quantity
    if (quantityNum < minQty && quantityNum > 0) {
      console.warn(`Quantity ${quantityNum} is below minimum ${minQty} for ${baseSymbol}, using minimum`);
      return minQty.toString();
    }

    // Round to nearest valid step size
    const stepSize = minQty; // Use minQty as step size for simplicity
    const roundedQuantity = Math.floor(quantityNum / stepSize) * stepSize;

    // Ensure we don't go below minimum
    const finalQuantity = Math.max(roundedQuantity, minQty);

    // Format to correct precision - keep trailing zeros for precision requirements
    const formattedQuantity = finalQuantity.toFixed(precision);
    return formattedQuantity;
  }

  /**
   * Format price precision based on symbol
   */
  public formatPrice(price: number | string, symbol: string): string {
    const baseSymbol = this.convertSymbol(symbol);

    // Price precision map for stop prices and regular prices
    const pricePrecisionMap: Record<string, number> = {
      'BTCUSDT': 1,      // BTC: 1 decimal place for prices
      'ETHUSDT': 2,      // ETH: 2 decimal places for prices
      'BNBUSDT': 2,      // BNB: 2 decimal places for prices
      'ADAUSDT': 4,      // ADA: 4 decimal places for prices
      'DOGEUSDT': 5,     // DOGE: 5 decimal places for prices
      'SOLUSDT': 2,      // SOL: 2 decimal places for prices
      'AVAXUSDT': 2,     // AVAX: 2 decimal places for prices
      'MATICUSDT': 3,    // MATIC: 3 decimal places for prices
      'DOTUSDT': 2,      // DOT: 2 decimal places for prices
      'LINKUSDT': 2,     // LINK: 2 decimal places for prices
      'UNIUSDT': 2,      // UNI: 2 decimal places for prices
    };

    const precision = pricePrecisionMap[baseSymbol] || 2; // Default to 2 decimal places for prices

    // Convert to number if it's a string
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;

    // Format to correct precision - keep trailing zeros for precision requirements
    const formattedPrice = priceNum.toFixed(precision);
    return formattedPrice;
  }

  /**
   * 生成币安API签名
   */
  private createSignature(queryString: string): string {
    return CryptoJS.HmacSHA256(queryString, this.apiSecret).toString(CryptoJS.enc.Hex);
  }

  /**
   * 创建带签名的请求
   */
  /**
   * 同步服务器时间
   * 公共方法,允许在遇到时间同步错误时手动重新同步
   */
  public async syncServerTime(): Promise<void> {
    try {
      const localTime = Date.now();
      const response = await this.client.get('/fapi/v1/time');
      const serverTime = response.data.serverTime;
      this.serverTimeOffset = serverTime - localTime;
      console.log(`⏰ Server time synced. Offset: ${this.serverTimeOffset}ms`);
    } catch (error) {
      console.warn('⚠️ Failed to sync server time:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * 清理资源，关闭所有连接
   */
  public destroy(): void {
    // 关闭 HTTP agents
    if (this.httpAgent) {
      this.httpAgent.destroy();
    }
    if (this.httpsAgent) {
      this.httpsAgent.destroy();
    }
  }

  /**
   * 获取调整后的时间戳
   */
  private getAdjustedTimestamp(): number {
    return Date.now() + this.serverTimeOffset;
  }

  private async makeSignedRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    params: Record<string, any> = {}
  ): Promise<T> {
    try {
      const timestamp = this.getAdjustedTimestamp();
      const recvWindow = 60000; // 60秒窗口,避免时间同步问题
      const allParams: Record<string, any> = { ...params, timestamp, recvWindow };

      // 构建查询字符串
      const queryString = Object.keys(allParams)
        .sort()
        .map(key => `${key}=${encodeURIComponent(allParams[key])}`)
        .join('&');

      // 生成签名
      const signature = this.createSignature(queryString);

      const url = `${endpoint}?${queryString}&signature=${signature}`;

      const config: AxiosRequestConfig = {
        method,
        url,
        headers: {
          'X-MBX-APIKEY': this.apiKey,
        },
      };

      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as any;
        const errorCode = errorData?.code;
        const errorMessage = errorData?.msg || errorData?.message || error.message;
        const statusText = error.response.statusText;
        const statusCode = error.response.status;

        // Log error details for debugging
        console.error(`API Error [${errorCode || 'UNKNOWN'}]: ${errorMessage}`);
        
        // 处理时间同步错误 (-1021)
        if (errorCode === -1021) {
          console.warn('⏰ Timestamp error detected, syncing server time and retrying...');
          await this.syncServerTime();
          // 重试一次
          const retryTimestamp = this.getAdjustedTimestamp();
          const retryParams: Record<string, any> = { ...params, timestamp: retryTimestamp, recvWindow: 60000 };
          const retryQueryString = Object.keys(retryParams)
            .sort()
            .map(key => `${key}=${encodeURIComponent(retryParams[key])}`)
            .join('&');
          const retrySignature = this.createSignature(retryQueryString);
          const retryUrl = `${endpoint}?${retryQueryString}&signature=${retrySignature}`;
          const retryConfig: AxiosRequestConfig = {
            method,
            url: retryUrl,
            headers: { 'X-MBX-APIKEY': this.apiKey }
          };
          const retryResponse = await this.client.request<T>(retryConfig);
          return retryResponse.data;
        }
        
        if (errorCode === -2019) {
          console.error('💰 Margin insufficient - check available balance and existing positions');
        }

        // Maintain backward compatibility for tests - don't include error code in the thrown message
        throw new Error(`Binance API Error: ${errorMessage}`);
      }
      throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 创建普通请求（无需签名）
   */
  private async makePublicRequest<T>(
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    try {
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

      const url = queryString ? `${endpoint}?${queryString}` : endpoint;
      const response = await this.client.get<T>(url);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as any;
        const errorCode = errorData?.code;
        const errorMessage = errorData?.msg || errorData?.message || error.message;
        const statusText = error.response.statusText;
        const statusCode = error.response.status;

        // Log error details for debugging
        console.error(`API Error [${errorCode || 'UNKNOWN'}]: ${errorMessage}`);
        if (errorCode === -2019) {
          console.error('💰 Margin insufficient - check available balance and existing positions');
        }

        // Maintain backward compatibility for tests - don't include error code in the thrown message
        throw new Error(`Binance API Error: ${errorMessage}`);
      }
      throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取交易所信息
   */
  async getExchangeInformation(): Promise<any> {
    return await this.makePublicRequest('/fapi/v1/exchangeInfo');
  }

  /**
   * 获取符号信息（带缓存）
   */
  async getSymbolInfo(symbol: string): Promise<any> {
    const baseSymbol = this.convertSymbol(symbol);

    // 如果缓存中有，直接返回
    if (this.symbolInfoCache.has(baseSymbol)) {
      return this.symbolInfoCache.get(baseSymbol);
    }

    // 否则获取交易所信息并找到对应符号
    try {
      const exchangeInfo = await this.getExchangeInformation();
      const symbolInfo = exchangeInfo.symbols.find((s: any) => s.symbol === baseSymbol);

      if (symbolInfo) {
        // 缓存符号信息
        this.symbolInfoCache.set(baseSymbol, symbolInfo);
        return symbolInfo;
      } else {
        throw new Error(`Symbol ${baseSymbol} not found in exchange information`);
      }
    } catch (error) {
      console.warn(`Failed to get symbol info for ${baseSymbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // 返回默认值
      return {
        symbol: baseSymbol,
        filters: [
          {
            filterType: 'LOT_SIZE',
            stepSize: '0.001'
          }
        ]
      };
    }
  }

  /**
   * 获取服务器时间
   */
  async getServerTime(): Promise<number> {
    const response = await this.makePublicRequest<{ serverTime: number }>('/fapi/v1/time');
    return response.serverTime;
  }

  /**
   * 获取账户信息
   */
  async getAccountInfo(): Promise<any> {
    return await this.makeSignedRequest('/fapi/v2/account');
  }

  /**
   * 获取持仓信息
   */
  async getPositions(): Promise<PositionResponse[]> {
    const response = await this.makeSignedRequest<PositionResponse[]>('/fapi/v2/positionRisk');
    return response.filter((pos: PositionResponse) => parseFloat(pos.positionAmt) !== 0);
  }

  /**
   * 获取所有仓位信息(包括零仓位)
   */
  async getAllPositions(): Promise<PositionResponse[]> {
    return await this.makeSignedRequest<PositionResponse[]>('/fapi/v2/positionRisk');
  }

  /**
   * 下单
   */
  async placeOrder(order: BinanceOrder): Promise<OrderResponse> {
    const params: Record<string, any> = {
      symbol: this.convertSymbol(order.symbol),
      side: order.side,
      type: order.type,
    };

    // 如果使用 closePosition，则不需要 quantity
    if (order.closePosition !== "true") {
      params.quantity = this.formatQuantity(order.quantity, order.symbol);
    }

    if (order.price) params.price = this.formatPrice(order.price, order.symbol);
    if (order.stopPrice) params.stopPrice = this.formatPrice(order.stopPrice, order.symbol);
    if (order.timeInForce) params.timeInForce = order.timeInForce;
    if (order.closePosition) params.closePosition = order.closePosition;

    const response = await this.makeSignedRequest<OrderResponse>('/fapi/v1/order', 'POST', params);
    return response;
  }

  /**
   * 设置杠杆
   */
  async setLeverage(symbol: string, leverage: number): Promise<any> {
    return await this.makeSignedRequest('/fapi/v1/leverage', 'POST', {
      symbol: this.convertSymbol(symbol),
      leverage: leverage.toString(),
    });
  }

  /**
   * 设置保证金模式
   * @param symbol 交易对
   * @param marginType ISOLATED(逐仓) 或 CROSSED(全仓)
   */
  async setMarginType(symbol: string, marginType: 'ISOLATED' | 'CROSSED'): Promise<any> {
    return await this.makeSignedRequest('/fapi/v1/marginType', 'POST', {
      symbol: this.convertSymbol(symbol),
      marginType: marginType,
    });
  }

  /**
   * 取消订单
   */
  async cancelOrder(symbol: string, orderId: number): Promise<OrderResponse> {
    return await this.makeSignedRequest<OrderResponse>('/fapi/v1/order', 'DELETE', {
      symbol: this.convertSymbol(symbol),
      orderId: orderId.toString(),
    });
  }

  /**
   * 取消所有订单
   */
  async cancelAllOrders(symbol: string): Promise<any> {
    return await this.makeSignedRequest('/fapi/v1/allOpenOrders', 'DELETE', {
      symbol: this.convertSymbol(symbol)
    });
  }

  /**
   * 获取订单状态
   */
  async getOrderStatus(symbol: string, orderId: number): Promise<OrderResponse> {
    return await this.makeSignedRequest<OrderResponse>('/fapi/v1/order', 'GET', {
      symbol: this.convertSymbol(symbol),
      orderId: orderId.toString(),
    });
  }

  /**
   * 获取开放订单
   */
  async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    const params: Record<string, any> = {};
    if (symbol) params.symbol = this.convertSymbol(symbol);

    return await this.makeSignedRequest<OrderResponse[]>('/fapi/v1/openOrders', 'GET', params);
  }

  /**
   * 获取24小时价格变动统计
   */
  async get24hrTicker(symbol?: string): Promise<any> {
    const params: Record<string, any> = {};
    if (symbol) params.symbol = this.convertSymbol(symbol);

    return await this.makePublicRequest('/fapi/v1/ticker/24hr', params);
  }

  convertToBinanceOrder(tradingPlan: any): BinanceOrder {
    return {
      symbol: tradingPlan.symbol,
      side: tradingPlan.side,
      type: tradingPlan.type,
      quantity: this.formatQuantity(tradingPlan.quantity, tradingPlan.symbol),
      leverage: tradingPlan.leverage
    };
  }

  /**
   * 创建止盈订单
   */
  createTakeProfitOrder(
    symbol: string,
    side: "BUY" | "SELL",
    quantity: number,
    takeProfitPrice: number
  ): TakeProfitOrder {
    return {
      symbol,
      side,
      type: "TAKE_PROFIT_MARKET",
      quantity: this.formatQuantity(quantity, symbol),
      stopPrice: this.formatPrice(takeProfitPrice, symbol),
      closePosition: "true"
    };
  }

  /**
   * 创建止损订单
   */
  createStopLossOrder(
    symbol: string,
    side: "BUY" | "SELL",
    quantity: number,
    stopLossPrice: number
  ): StopLossOrder {
    return {
      symbol,
      side,
      type: "STOP_MARKET",
      quantity: this.formatQuantity(quantity, symbol),
      stopPrice: this.formatPrice(stopLossPrice, symbol),
      closePosition: "true"
    };
  }

  /**
   * 计算止盈止损订单方向
   * 多头仓位：SELL止盈止损
   * 空头仓位：BUY止盈止损
   */
  private calculateStopOrderSide(positionSide: "BUY" | "SELL"): "BUY" | "SELL" {
    return positionSide === "BUY" ? "SELL" : "BUY";
  }

  /**
   * 根据position创建止盈止损订单
   */
  createStopOrdersFromPosition(position: any, positionSide: "BUY" | "SELL") {
    const orders = {
      takeProfitOrder: null as TakeProfitOrder | null,
      stopLossOrder: null as StopLossOrder | null
    };

    if (!position || !position.exit_plan) {
      return orders;
    }

    const orderSide = this.calculateStopOrderSide(positionSide);

    // 创建止盈订单
    if (position.exit_plan.profit_target > 0) {
      orders.takeProfitOrder = this.createTakeProfitOrder(
        position.symbol,
        orderSide,
        Math.abs(position.quantity),
        position.exit_plan.profit_target
      );
    }

    // 创建止损订单
    if (position.exit_plan.stop_loss > 0) {
      orders.stopLossOrder = this.createStopLossOrder(
        position.symbol,
        orderSide,
        Math.abs(position.quantity),
        position.exit_plan.stop_loss
      );
    }

    return orders;
  }
}
