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

interface SpotExtended extends Spot {
  changeLeverage: (params: { symbol: string; leverage: number }) => Promise<any>;
  premiumIndex: (params: { symbol: string }) => Promise<any>;
}

let futuresClient: SpotExtended | null = null;

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
    futuresClient = new Spot(apiKey, apiSecret) as SpotExtended;

    // Test the connection
    console.log('Testing Binance futures client connection...');
    await futuresClient.account();
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
    const params = {
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      timeInForce: order.timeInForce || 'GTC'
    } as any;

    if (order.positionSide) params.positionSide = order.positionSide;
    if (order.price) params.price = order.price;
    if (order.stopPrice) params.stopPrice = order.stopPrice;
    if (order.reduceOnly !== undefined) params.reduceOnly = order.reduceOnly;
    if (order.workingType) params.workingType = order.workingType;
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
    const response = await futuresClient.newOrder(params);
    console.log('Futures order created successfully:', JSON.stringify(response, null, 2));
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
    const response = await futuresClient.account();
    console.log('Successfully retrieved futures account information');
    const accountInfo = {
      feeTier: 0,
      canTrade: true,
      canDeposit: true,
      canWithdraw: true,
      updateTime: Date.now(),
      totalInitialMargin: '0',
      totalMaintMargin: '0',
      totalWalletBalance: '0',
      totalUnrealizedProfit: '0',
      totalMarginBalance: '0',
      totalPositionInitialMargin: '0',
      totalOpenOrderInitialMargin: '0',
      totalCrossWalletBalance: '0',
      totalCrossUnPnl: '0',
      availableBalance: '0',
      maxWithdrawAmount: '0',
      assets: response.data.balances.map((balance: any) => ({
        asset: balance.asset,
        walletBalance: balance.free,
        unrealizedProfit: '0',
        marginBalance: balance.locked,
        maintMargin: '0',
        initialMargin: '0',
        positionInitialMargin: '0',
        openOrderInitialMargin: '0',
        maxWithdrawAmount: balance.free,
        crossWalletBalance: '0',
        crossUnPnl: '0',
        availableBalance: balance.free
      })),
      positions: []
    };
    return accountInfo;
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
    const response = await futuresClient.account();
    const accountData = response.data as any;
    const positions = accountData.positions || [];
    return positions.map((pos: any) => ({
      symbol: pos.symbol || '',
      positionAmt: pos.positionAmt || '0',
      entryPrice: pos.entryPrice || '0',
      markPrice: pos.markPrice || '0',
      unRealizedProfit: pos.unrealizedProfit || '0',
      liquidationPrice: pos.liquidationPrice || '0',
      leverage: parseInt(pos.leverage || '1'),
      marginType: pos.marginType || MarginType.CROSSED,
      isolatedMargin: pos.isolatedMargin || '0',
      positionSide: pos.positionSide || PositionSide.BOTH,
      updateTime: pos.updateTime || Date.now()
    }));
  } catch (error) {
    throw new BinanceClientError(`Failed to get futures positions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function setFuturesLeverage(settings: LeverageSettings): Promise<boolean> {
  if (!futuresClient) {
    throw new BinanceClientError('Futures client not initialized');
  }

  try {
    await futuresClient.changeLeverage({
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
    const response = await futuresClient.premiumIndex({ symbol });
    const data = response.data[0] || {};
    return {
      symbol: data.symbol || symbol,
      fundingRate: data.lastFundingRate || '0',
      fundingTime: data.nextFundingTime || Date.now(),
      nextFundingTime: data.nextFundingTime || Date.now()
    };
  } catch (error) {
    throw new BinanceClientError(`Failed to get funding rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function cancelFuturesOrder(symbol: string, orderId: number): Promise<void> {
  if (!futuresClient) {
    throw new BinanceClientError('Futures client not initialized');
  }

  try {
    await futuresClient.cancelOrder(symbol, { orderId });
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
    const response = await futuresClient.openOrders(params);
    return response.data.map((order: any) => ({
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.origQty,
      price: order.price,
      timeInForce: order.timeInForce,
      positionSide: order.positionSide,
      stopPrice: order.stopPrice,
      workingType: order.workingType,
      closePosition: order.closePosition,
      activationPrice: order.activationPrice,
      callbackRate: order.callbackRate,
      priceProtect: order.priceProtect,
      reduceOnly: order.reduceOnly
    }));
  } catch (error) {
    throw new BinanceClientError(`Failed to get open futures orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
