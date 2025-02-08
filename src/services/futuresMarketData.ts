import { WebSocketMessage, StreamSubscription, StreamResponse, BookTickerEvent } from '../types/websocket.js';
import { BinanceClientError } from '../types/errors.js';

export class FuturesMarketDataClient {
  private ws: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private pingInterval: number | null = null;
  private readonly maxStreamsPerConnection = 200;

  async connect(): Promise<void> {
    try {
      this.ws = new WebSocket('wss://fstream.binance.com/ws');
      
      this.ws.onopen = () => {
        this.startPingInterval();
        // Resubscribe to previous streams
        if (this.subscriptions.size > 0) {
          this.subscribe([...this.subscriptions]);
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.id) {
            // Handle subscription responses
            if (data.result === null) {
              console.log('Successfully subscribed to streams');
            } else {
              throw new BinanceClientError(`Failed to subscribe to streams: ${JSON.stringify(data)}`);
            }
          } else {
            // Handle market data updates
            this.handleMarketData(data as StreamResponse);
          }
        } catch (error) {
          throw new BinanceClientError(`Failed to parse market data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      this.ws.onerror = (event: Event) => {
        throw new BinanceClientError(`Market data WebSocket error: ${event instanceof ErrorEvent ? event.message : 'Unknown error'}`);
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
      throw new BinanceClientError(`Failed to establish market data WebSocket connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: 'ping' }));
      }
    }, 3 * 60 * 1000); // 3 minutes
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

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
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before reconnecting
    await this.connect();
  }

  private handleMarketData(data: StreamResponse): void {
    // Handle different types of market data
    if ('stream' in data) {
      // Combined stream data
      const streamData = data.data;
      if ('e' in streamData) {
        switch (streamData.e) {
          case 'bookTicker':
            this.handleBookTicker(streamData as BookTickerEvent);
            break;
          // Add handlers for other event types
        }
      }
    }
  }

  private handleBookTicker(data: BookTickerEvent): void {
    // Process book ticker updates
    // This can be extended to emit events or update internal state
  }

  subscribe(streams: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new BinanceClientError('Market data WebSocket not connected');
    }

    if (this.subscriptions.size + streams.length > this.maxStreamsPerConnection) {
      throw new BinanceClientError(`Maximum number of streams per connection (${this.maxStreamsPerConnection}) exceeded`);
    }

    const message: StreamSubscription = {
      method: 'SUBSCRIBE',
      params: streams,
      id: Date.now()
    };

    streams.forEach(stream => this.subscriptions.add(stream));
    this.ws.send(JSON.stringify(message));
  }

  unsubscribe(streams: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new BinanceClientError('Market data WebSocket not connected');
    }

    const message: StreamSubscription = {
      method: 'UNSUBSCRIBE',
      params: streams,
      id: Date.now()
    };

    streams.forEach(stream => this.subscriptions.delete(stream));
    this.ws.send(JSON.stringify(message));
  }

  async disconnect(): Promise<void> {
    this.cleanup();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getActiveSubscriptions(): string[] {
    return [...this.subscriptions];
  }
}
