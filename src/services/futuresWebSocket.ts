import { getApiKeys } from './keystore.js';
import { WebSocketMessage, WebSocketResponse } from '../types/websocket.js';
import { BinanceClientError, OrderValidationError } from '../types/errors.js';
import { FuturesOrder } from '../types/futures.js';

export class FuturesWebSocketClient {
  private ws: WebSocket | null = null;
  private pingInterval: number | null = null;
  private messageHandlers: Map<string, (response: WebSocketResponse) => void>;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private readonly reconnectDelay: number = 1000; // Start with 1 second
  
  constructor() {
    this.messageHandlers = new Map();
  }

  async connect(): Promise<void> {
    try {
      const keys = await getApiKeys();
      if (!keys) {
        throw new BinanceClientError('API keys not found');
      }

      this.ws = new WebSocket('wss://ws-fapi.binance.com/ws-fapi/v1');
      
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startPingInterval();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const response: WebSocketResponse = JSON.parse(event.data as string);
          if (response.id === 'pong') {
            return; // Ignore pong responses
          }
          
          const handler = this.messageHandlers.get(response.id);
          if (handler) {
            handler(response);
            this.messageHandlers.delete(response.id);
          }
        } catch (error) {
          throw new BinanceClientError(`Failed to parse WebSocket message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      this.ws.onerror = (event: Event) => {
        throw new BinanceClientError(`WebSocket error: ${event instanceof ErrorEvent ? event.message : 'Unknown error'}`);
      };

      this.ws.onclose = () => {
        this.cleanup();
        this.handleReconnect();
      };

      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        if (!this.ws) {
          reject(new BinanceClientError('WebSocket initialization failed'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new BinanceClientError('WebSocket connection timeout'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        this.ws.onerror = (event: Event) => {
          clearTimeout(timeout);
          reject(new BinanceClientError(`WebSocket connection failed: ${event instanceof ErrorEvent ? event.message : 'Unknown error'}`));
        };
      });
    } catch (error) {
      throw new BinanceClientError(`Failed to establish WebSocket connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const pingMessage: WebSocketMessage = {
          id: 'ping',
          method: 'ping',
          params: {}
        };
        this.ws.send(JSON.stringify(pingMessage));
      }
    }, 3 * 60 * 1000); // 3 minutes
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.messageHandlers.clear();
    if (this.ws) {
      // Reset all event handlers
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new BinanceClientError('Maximum WebSocket reconnection attempts reached');
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    await new Promise(resolve => setTimeout(resolve, delay));
    await this.connect();
  }

  private async generateSignature(params: Record<string, any>, apiSecret: string): Promise<string> {
    const queryString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiSecret);
    const messageData = encoder.encode(queryString);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageData
    );

    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async placeOrder(order: FuturesOrder): Promise<any> {
    const keys = await getApiKeys();
    if (!keys) {
      throw new BinanceClientError('API keys not found');
    }

    const { apiKey, apiSecret } = keys;
    const timestamp = Date.now();
    const params: Record<string, any> = {
      apiKey,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      timestamp,
    };

    // Add optional parameters
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

    // Generate signature
    const signature = await this.generateSignature(params, apiSecret);
    params.signature = signature;

    return this.sendMessage('order.place', params);
  }

  private async sendMessage(method: string, params: any): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new BinanceClientError('WebSocket not connected');
    }

    const id = crypto.randomUUID();
    const message: WebSocketMessage = {
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(id);
        reject(new BinanceClientError('WebSocket request timeout'));
      }, 10000);

      this.messageHandlers.set(id, (response) => {
        clearTimeout(timeout);
        if (response.status === 200) {
          resolve(response.result);
        } else {
          reject(new BinanceClientError(`WebSocket error: ${JSON.stringify(response)}`));
        }
      });

      if (!this.ws) {
        throw new BinanceClientError('WebSocket connection lost while sending message');
      }
      this.ws.send(JSON.stringify(message));
    });
  }

  async disconnect(): Promise<void> {
    this.cleanup();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async cancelOrder(symbol: string, orderId: number): Promise<any> {
    const keys = await getApiKeys();
    if (!keys) {
      throw new BinanceClientError('API keys not found');
    }

    const { apiKey, apiSecret } = keys;
    const timestamp = Date.now();
    const params: Record<string, any> = {
      apiKey,
      symbol,
      orderId,
      timestamp,
    };

    // Generate signature
    const signature = await this.generateSignature(params, apiSecret);
    params.signature = signature;

    return this.sendMessage('order.cancel', params);
  }
}
