import { Spot } from '@binance/connector';
import { BinanceClientError, ApiKeyError, OrderValidationError, InsufficientMarginError, InvalidPositionModeError } from '../types/errors.js';
import { getApiKeys } from './keystore.js';
import {
  FuturesOrder,
  FuturesPosition,
  FuturesAccountInformation,
  LeverageSettings,
  FundingRate,
  PositionSide,
  MarginType,
  WorkingType
} from '../types/futures.js';

// Define futures client type with raw request methods
interface FuturesClient extends Spot {
  request(method: string, path: string, params?: any): Promise<{ data: any }>;
  signRequest(method: string, path: string, params?: any): Promise<{ data: any }>;
}

let futuresClient: FuturesClient | null = null;
const FUTURES_BASE_URL = 'https://fapi.binance.com';

export async function initializeFuturesClient(): Promise<boolean> {
  console.log('Initializing Binance futures client...');
  try {
    const keys = await getApiKeys();
    if (!keys) {
      console.warn('No credentials available for Binance futures client');
      throw new ApiKeyError('Futures API keys not found');
    }
    const { apiKey, apiSecret } = keys;
    
    console.log('Creating Binance futures client...');
    // Initialize client for USDⓈ-M Futures
    futuresClient = new Spot(apiKey, apiSecret) as FuturesClient;

    // Test the connection
    console.log('Testing Binance futures client connection...');
    await futuresClient.request('GET', `${FUTURES_BASE_URL}/fapi/v1/ping`);
    console.log('Successfully connected to Binance futures API');
    return true;
  } catch (error) {
    console.error('Failed to initialize futures client:', error instanceof Error ? error.message : String(error));
    futuresClient = null;
    if (error instanceof ApiKeyError) {
      throw error;
    }
    throw new BinanceClientError(`Failed to initialize futures client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createFuturesOrder(order: FuturesOrder): Promise<any> {
  if (!futuresClient) {
    console.error('Attempted to create futures order without initialized client');
    throw new BinanceClientError('Futures client not initialized');
  }

  try {
    console.log('Creating futures order:', JSON.stringify(order, null, 2));
    const params: Record<string, any> = {
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
    };

    if (order.positionSide) params.positionSide = order.positionSide;
    if (order.price) params.price = order.price;
    if (order.stopPrice) params.stopPrice = order.stopPrice;
    if (order.reduceOnly !== undefined) params.reduceOnly = order.reduceOnly;
    if (order.workingType) params.workingType = order.workingType;
    if (order.timeInForce) params.timeInForce = order.timeInForce;
    if (order.activationPrice) params.activationPrice = order.activationPrice;
    if (order.callbackRate) params.callbackRate = order.callbackRate;
    if (order.closePosition !== undefined) params.closePosition = order.closePosition;
    if (order.priceProtect !== undefined) params.priceProtect = order.priceProtect;

    // Validate required parameters based on order type
    if (['LIMIT', 'STOP', 'TAKE_PROFIT'].includes(order.type) && !order.price) {
      throw new OrderValidationError(`Price is required for ${order.type} orders`);
    }
    if (['STOP', 'STOP_MARKET', 'TAKE_PROFIT', 'TAKE_PROFIT_MARKET'].includes(order.type) && !order.stopPrice) {
      throw new OrderValidationError(`Stop price is required for ${order.type} orders`);
    }
    if (order.type === 'TRAILING_STOP_MARKET' && !order.callbackRate) {
      throw new OrderValidationError('Callback rate is required for TRAILING_STOP_MARKET orders');
    }

    console.log('Sending futures order request with params:', JSON.stringify(params, null, 2));
    const response = await futuresClient.signRequest('POST', `${FUTURES_BASE_URL}/fapi/v1/order`, params);
    console.log('Futures order created successfully:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error creating futures order:', error instanceof Error ? error.message : String(error));
    if (error instanceof OrderValidationError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('insufficient margin')) {
      console.error('Insufficient margin for futures order');
      throw new InsufficientMarginError(`Insufficient margin to create futures order: ${errorMessage}`);
    }
    if (errorMessage.includes('invalid position mode')) {
      console.error('Invalid position mode for futures order');
      throw new InvalidPositionModeError(`Invalid position mode for futures order: ${errorMessage}`);
    }
    throw new BinanceClientError(`Failed to create futures order: ${errorMessage}`);
  }
}

export async function getFuturesAccountInformation(): Promise<FuturesAccountInformation> {
  if (!futuresClient) {
    console.error('Attempted to get futures account information without initialized client');
    throw new BinanceClientError('Futures client not initialized');
  }

  try {
    console.log('Fetching futures account information...');
    const response = await futuresClient.signRequest('GET', `${FUTURES_BASE_URL}/fapi/v1/account`);
    console.log('Successfully retrieved futures account information');
    return response.data;
  } catch (error) {
    console.error('Error getting futures account information:', error instanceof Error ? error.message : String(error));
    throw new BinanceClientError(`Failed to get futures account information: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getFuturesPositions(): Promise<FuturesPosition[]> {
  if (!futuresClient) {
    throw new BinanceClientError('Futures client not initialized');
  }

  try {
    const response = await futuresClient.signRequest('GET', `${FUTURES_BASE_URL}/fapi/v1/positionRisk`);
    return response.data;
  } catch (error) {
    throw new BinanceClientError(`Failed to get futures positions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function setFuturesLeverage(settings: LeverageSettings): Promise<boolean> {
  if (!futuresClient) {
    throw new BinanceClientError('Futures client not initialized');
  }

  try {
    await futuresClient.signRequest('POST', `${FUTURES_BASE_URL}/fapi/v1/leverage`, {
      symbol: settings.symbol,
      leverage: settings.leverage
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('insufficient margin')) {
      throw new InsufficientMarginError(`Insufficient margin to change leverage: ${errorMessage}`);
    }
    if (errorMessage.includes('invalid position mode')) {
      throw new InvalidPositionModeError(`Invalid position mode when changing leverage: ${errorMessage}`);
    }
    throw new BinanceClientError(`Failed to set futures leverage: ${errorMessage}`);
  }
}

export async function getFundingRate(symbol: string): Promise<FundingRate> {
  if (!futuresClient) {
    throw new BinanceClientError('Futures client not initialized');
  }

  try {
    const response = await futuresClient.request('GET', `${FUTURES_BASE_URL}/fapi/v1/fundingRate`, { symbol });
    return response.data[0]; // Return the latest funding rate
  } catch (error) {
    throw new BinanceClientError(`Failed to get funding rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function cancelFuturesOrder(symbol: string, orderId: number): Promise<void> {
  if (!futuresClient) {
    throw new BinanceClientError('Futures client not initialized');
  }

  try {
    await futuresClient.signRequest('DELETE', `${FUTURES_BASE_URL}/fapi/v1/order`, {
      symbol,
      orderId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('invalid position mode')) {
      throw new InvalidPositionModeError(`Invalid position mode when canceling futures order: ${errorMessage}`);
    }
    throw new BinanceClientError(`Failed to cancel futures order: ${errorMessage}`);
  }
}

export async function getFuturesOpenOrders(symbol?: string): Promise<FuturesOrder[]> {
  if (!futuresClient) {
    throw new BinanceClientError('Futures client not initialized');
  }

  try {
    const params = symbol ? { symbol } : {};
    const response = await futuresClient.signRequest('GET', `${FUTURES_BASE_URL}/fapi/v1/openOrders`, params);
    return response.data;
  } catch (error) {
    throw new BinanceClientError(`Failed to get open futures orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
