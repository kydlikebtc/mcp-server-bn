import { FuturesAccountBalance, FuturesPosition } from './futures.js';

export interface WebSocketMessage {
  id: string;
  method: string;
  params: Record<string, any>;
}

export interface WebSocketResponse {
  id: string;
  status: number;
  result: Record<string, any>;
  rateLimits?: RateLimit[];
}

export interface RateLimit {
  rateLimitType: string;
  interval: string;
  intervalNum: number;
  limit: number;
  count: number;
}

// Market data types
export interface BookTickerEvent {
  e: string;  // Event type
  E: number;  // Event time
  s: string;  // Symbol
  b: string;  // Best bid price
  B: string;  // Best bid qty
  a: string;  // Best ask price
  A: string;  // Best ask qty
  T: number;  // Transaction time
}

// User data types
export interface AccountUpdate {
  e: string;  // Event type
  E: number;  // Event time
  T: number;  // Transaction time
  a: AccountBalance[];
  p: Position[];
}

export interface AccountBalance {
  a: string;   // Asset
  wb: string;  // Wallet Balance
  cw: string;  // Cross Wallet Balance
  bc: string;  // Balance Change
}

export interface Position {
  s: string;   // Symbol
  pa: string;  // Position Amount
  ep: string;  // Entry Price
  cr: string;  // (Pre-fee) Accumulated Realized
  up: string;  // Unrealized PnL
  mt: string;  // Margin Type
  iw: string;  // Isolated Wallet (if isolated position)
  ps: string;  // Position Side
}

export interface OrderUpdate {
  e: string;  // Event type
  E: number;  // Event time
  T: number;  // Transaction time
  o: OrderExecution;
}

export interface OrderExecution {
  s: string;   // Symbol
  c: string;   // Client Order Id
  S: string;   // Side
  o: string;   // Order Type
  f: string;   // Time in Force
  q: string;   // Original Quantity
  p: string;   // Original Price
  ap: string;  // Average Price
  X: string;   // Current Order Status
  l: string;   // Last Filled Quantity
  z: string;   // Cumulative Filled Quantity
  Y: string;   // Last Filled Price
  n: string;   // Commission Amount
  N: string;   // Commission Asset
  T: number;   // Order Trade Time
  t: number;   // Trade Id
  rp: string;  // Realized Profit
  wt: string;  // Working Type
  ps: string;  // Position Side
  V: string;   // Self-Trade Prevention Mode
}

// WebSocket stream subscription types
export interface StreamSubscription {
  method: string;
  params: string[];
  id: number;
}

export interface StreamResponse {
  stream: string;
  data: BookTickerEvent | AccountUpdate | OrderUpdate;
}
