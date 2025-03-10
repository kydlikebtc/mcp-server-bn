import { Spot } from '@binance/connector';
import { BinanceCredentials, SpotOrder, OrderResponse, AccountBalance } from '../types/binance.js';
import { BinanceClientError, OrderValidationError } from '../types/errors.js';
import { getApiKeys } from './keystore.js';
import * as fs from 'fs';
import * as path from 'path';

const logFile = path.join(process.cwd(), 'logs', 'binance.log');

// 确保日志目录存在
if (!fs.existsSync(path.dirname(logFile))) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
}

function log(message: string) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} - ${message}\n`);
}

function logError(message: string, error?: unknown) {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  fs.appendFileSync(logFile, `${timestamp} - ERROR: ${message} ${error ? `- ${errorMessage}` : ''}\n`);
}

let client: Spot | null = null;

export async function initializeBinanceClient(): Promise<boolean> {
  log('Initializing Binance spot client...');
  const credentials = await getApiKeys();
  if (!credentials) {
    log('No credentials available for Binance spot client');
    return false;
  }

  try {
    log('Creating Binance spot client...');
    client = new Spot(credentials.apiKey, credentials.apiSecret);
    
    // Test the connection
    log('Testing Binance spot client connection...');
    await client.account();
    log('Successfully connected to Binance spot API');
    return true;
  } catch (error) {
    logError('Failed to initialize Binance spot client:', error);
    client = null;
    return false;
  }
}

export async function createSpotOrder(order: SpotOrder): Promise<OrderResponse> {
  if (!client) {
    throw new BinanceClientError('Binance client not initialized');
  }

  try {
    const params: any = {
      symbol: order.symbol,
      side: order.side,
      type: order.type,
    };

    if (order.quantity) params.quantity = order.quantity;
    if (order.price) params.price = order.price;
    if (order.timeInForce) params.timeInForce = order.timeInForce;

    if (order.type === 'LIMIT' && !order.price) {
      throw new OrderValidationError('Price is required for LIMIT orders');
    }

    const response = await client.newOrder(params);
    return response.data;
  } catch (error) {
    if (error instanceof OrderValidationError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new BinanceClientError(`Failed to create spot order: ${error.message}`);
    }
    throw new BinanceClientError('Failed to create spot order: Unknown error');
  }
}

export async function cancelOrder(symbol: string, orderId: number): Promise<void> {
  if (!client) {
    throw new BinanceClientError('Binance client not initialized');
  }

  try {
    await client.cancelOrder(symbol, { orderId });
  } catch (error) {
    if (error instanceof Error) {
      throw new BinanceClientError(`Failed to cancel order: ${error.message}`);
    }
    throw new BinanceClientError('Failed to cancel order: Unknown error');
  }
}

export async function getAccountBalances(): Promise<AccountBalance[]> {
  if (!client) {
    throw new BinanceClientError('Binance client not initialized');
  }

  try {
    const response = await client.account();
    return response.data.balances;
  } catch (error) {
    if (error instanceof Error) {
      throw new BinanceClientError(`Failed to get account balances: ${error.message}`);
    }
    throw new BinanceClientError('Failed to get account balances: Unknown error');
  }
}

export async function getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
  if (!client) {
    throw new BinanceClientError('Binance client not initialized');
  }

  try {
    const params = symbol ? { symbol } : {};
    const response = await client.openOrders(params);
    return response.data.map(order => ({
      ...order,
      transactTime: Date.now()
    }));
  } catch (error) {
    if (error instanceof Error) {
      throw new BinanceClientError(`Failed to get open orders: ${error.message}`);
    }
    throw new BinanceClientError('Failed to get open orders: Unknown error');
  }
}
