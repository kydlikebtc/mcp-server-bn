# mcp-server-cex-bn

[![smithery badge](https://smithery.ai/badge/mcp-server-cex-bn)](https://smithery.ai/server/mcp-server-cex-bn)

This MCP Server provides comprehensive integration with Binance's spot and futures trading operations.

[中文说明](README_CN.md)

## Features

### Spot Trading Operations
- Execute spot trading operations (LIMIT/MARKET orders)
- Monitor account balances
- Track and manage open orders
- Cancel existing orders

### Futures Trading Operations
- Create various types of futures orders (LIMIT, MARKET, STOP, TAKE_PROFIT, etc.)
- Manage leverage settings (1-125x)
- Monitor futures positions and account information
- Track funding rates
- Support for both one-way and hedge mode positions
- Advanced order types including trailing stops and reduce-only orders

### Tools

#### API Configuration

##### `configure_api_keys`
Securely store your Binance API credentials:
```typescript
await configureBinanceApiKeys({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret'
});
```

#### Spot Trading Tools

##### `create_spot_order`
Create LIMIT or MARKET orders:
```typescript
// LIMIT order
await createSpotOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  quantity: '0.001',
  price: '40000'
});

// MARKET order
await createSpotOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'MARKET',
  quantity: '0.001'
});
```

##### `cancel_order`
Cancel an existing order:
```typescript
await cancelOrder({
  symbol: 'BTCUSDT',
  orderId: '12345678'
});
```

##### `get_balances`
Check your account balances:
```typescript
const balances = await getBalances();
// Returns: { BTC: '0.1', USDT: '1000', ... }
```

##### `get_open_orders`
List all open orders:
```typescript
const orders = await getOpenOrders({
  symbol: 'BTCUSDT' // Optional: specify symbol
});
```

#### Futures Trading Tools

##### `create_futures_order`
Create various types of futures orders:
```typescript
// LIMIT order
await createFuturesOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  quantity: '0.001',
  price: '40000',
  timeInForce: 'GTC'
});

// STOP MARKET order
await createFuturesOrder({
  symbol: 'BTCUSDT',
  side: 'SELL',
  type: 'STOP_MARKET',
  quantity: '0.001',
  stopPrice: '38000'
});

// TRAILING STOP order
await createFuturesOrder({
  symbol: 'BTCUSDT',
  side: 'SELL',
  type: 'TRAILING_STOP_MARKET',
  quantity: '0.001',
  callbackRate: '1.0' // 1% callback rate
});
```

##### `set_futures_leverage`
Adjust leverage for a trading pair:
```typescript
await setFuturesLeverage({
  symbol: 'BTCUSDT',
  leverage: 10  // 1-125x
});
```

##### `get_futures_positions`
Get all open futures positions:
```typescript
const positions = await getFuturesPositions();
```

##### `get_futures_account`
Get detailed futures account information:
```typescript
const account = await getFuturesAccount();
```

##### `get_funding_rate`
Get funding rate for a futures symbol:
```typescript
const fundingRate = await getFundingRate({
  symbol: 'BTCUSDT'
});
```

##### `cancel_futures_order`
Cancel an existing futures order:
```typescript
await cancelFuturesOrder({
  symbol: 'BTCUSDT',
  orderId: '12345678'
});
```

## Futures Trading Details

### Position Modes
- One-way Mode: Single position per symbol
  * Default mode, simpler position management
  * Total position size is the sum of all orders
- Hedge Mode: Separate long and short positions
  * Allows holding both long and short positions simultaneously
  * Each position has independent margin requirements

### Margin Types
- Isolated Margin: Fixed margin per position
  * Risk is limited to the allocated margin
  * Each position has its own leverage setting
- Cross Margin: Shared margin across positions
  * Higher capital efficiency
  * Shared risk across all positions

### Funding Rate
Perpetual futures contracts use funding rates to keep futures prices aligned with spot prices:
- Positive rate: Longs pay shorts
- Negative rate: Shorts pay longs
- Payments occur every 8 hours

## Security Considerations

### Spot Trading Security
- Never commit API keys to version control
- Use environment variables or secure key storage
- Restrict API key permissions to only required operations
- Regularly rotate your API keys

### Futures Trading Security
- Set appropriate leverage limits based on risk tolerance
- Always use stop-loss orders to limit potential losses
- Monitor liquidation prices carefully
- Regularly check position risks and margin ratios
- Consider using reduce-only orders for risk management
- Be cautious with cross-margin due to shared risk

## Rate Limits

- Respect Binance API rate limits
- Default rate limits:
  - 1200 requests per minute for order operations
  - 100 requests per second for market data
- Implement proper error handling for rate limit errors

## Error Handling

### Common Error Scenarios
- Invalid API credentials
- Insufficient balance or margin
- Invalid order parameters
- Rate limit exceeded
- Network connectivity issues

### Futures-Specific Errors
- InsufficientMarginError: Not enough margin for operation
- InvalidPositionModeError: Wrong position mode setting
- OrderValidationError: Invalid futures order parameters

Example error handling:
```typescript
try {
  await createFuturesOrder({
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'LIMIT',
    quantity: '0.001',
    price: '40000',
    timeInForce: 'GTC'
  });
} catch (error) {
  if (error instanceof InsufficientMarginError) {
    console.error('Insufficient margin available');
  } else if (error instanceof InvalidPositionModeError) {
    console.error('Invalid position mode');
  } else if (error instanceof OrderValidationError) {
    console.error('Invalid order parameters');
  }
}
```

## Project Structure

```
.
├── src/
│   ├── index.ts                 # Server entry point
│   ├── services/
│   │   ├── binance.ts          # Binance API integration
│   │   ├── keystore.ts         # API key management
│   │   └── tools.ts            # Trading tools implementation
│   └── types/
│       ├── binance.ts          # Binance types
│       └── binance-connector.d.ts  # API client types
├── README.md
├── README_CN.md
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

## Development

1. Set up environment variables:

create `.env` file in the root directory, and set your Binance API credentials:

```txt
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_secret_key_here
```

2. Install dependencies:

```bash
pnpm install
```

Build the server:

```bash
pnpm build
```

For development with auto-rebuild:

```bash
pnpm watch
```

## Installation

### Installing via Smithery

To install Binance Trading Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/mcp-server-cex-bn):

```bash
npx -y @smithery/cli install mcp-server-cex-bn --client claude
```

### Installing manually
1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```
3. Configure your Binance API credentials in `.env`
4. Build and start the server:
```bash
pnpm build
pnpm start
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
pnpm inspector
```

The Inspector will provide a URL to access debugging tools in your browser.


# mcp-server-bn
