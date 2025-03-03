declare module '@binance/connector' {
  export class Spot {
    constructor(apiKey: string, apiSecret: string);
    
    usdmFutures: {
      ping(): Promise<any>;
      account(): Promise<any>;
      positionRisk(): Promise<any>;
      openOrders(params?: { symbol?: string }): Promise<any>;
      newOrder(params: any): Promise<any>;
      cancelOrder(params: any): Promise<any>;
      leverage(params: any): Promise<any>;
      fundingRate(params: any): Promise<any>;
    };

    newOrder(params: {
      symbol: string;
      side: 'BUY' | 'SELL';
      type: 'LIMIT' | 'MARKET';
      quantity?: string;
      price?: string;
      timeInForce?: 'GTC' | 'IOC' | 'FOK';
    }): Promise<{ data: any }>;

    cancelOrder(symbol: string, params: { orderId: number }): Promise<void>;

    account(): Promise<{
      data: {
        balances: Array<{
          asset: string;
          free: string;
          locked: string;
        }>;
      };
    }>;

    openOrders(params?: { symbol?: string }): Promise<{
      data: Array<{
        symbol: string;
        orderId: number;
        orderListId: number;
        clientOrderId: string;
        price: string;
        origQty: string;
        executedQty: string;
        status: string;
        timeInForce: string;
        type: string;
        side: string;
      }>;
    }>;
  }
}
