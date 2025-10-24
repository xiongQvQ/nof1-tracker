/**
 * 统一的错误处理工具
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class TradingError extends Error {
  constructor(
    message: string,
    public symbol?: string,
    public orderId?: number
  ) {
    super(message);
    this.name = 'TradingError';
  }
}

export class PositionError extends Error {
  constructor(
    message: string,
    public symbol: string,
    public operation: 'open' | 'close' | 'modify'
  ) {
    super(message);
    this.name = 'PositionError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public configKey?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * 错误处理装饰器
 */
export function handleErrors(
  errorType: new (message: string, ...args: any[]) => Error = Error,
  context?: string
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const fullContext = context ? `${context} - ${propertyName}` : propertyName;

        console.error(`❌ Error in ${fullContext}: ${errorMessage}`);

        if (error instanceof errorType) {
          throw error;
        }

        throw new errorType(`${fullContext}: ${errorMessage}`);
      }
    };

    return descriptor;
  };
}

/**
 * 安全执行函数，捕获并记录错误但不抛出
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  fallback: T,
  context?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const contextMsg = context ? ` in ${context}` : '';
    console.warn(`⚠️ Safe execution failed${contextMsg}: ${errorMessage}`);
    return fallback;
  }
}

/**
 * 重试机制
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context?: string
): Promise<T> {
  // 在测试环境中减少重试次数和延迟
  const isTestEnvironment = process.env.NODE_ENV === 'test';
  const testMaxRetries = isTestEnvironment ? 2 : maxRetries;
  const testBaseDelay = isTestEnvironment ? 10 : baseDelay;

  let lastError: Error;

  for (let attempt = 1; attempt <= testMaxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === testMaxRetries) {
        const contextMsg = context ? ` in ${context}` : '';
        throw new Error(`Failed after ${testMaxRetries} attempts${contextMsg}: ${lastError.message}`);
      }

      const delay = testBaseDelay * Math.pow(2, attempt - 1);
      const contextMsg = context ? ` (${context})` : '';

      if (!isTestEnvironment) {
        console.warn(`⚠️ Attempt ${attempt} failed${contextMsg}, retrying in ${delay}ms: ${lastError.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}