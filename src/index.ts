#!/usr/bin/env node

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { SpotOrder } from "./types/binance.js";
import {
  storeApiKeys,
  getApiKeys,
  deleteApiKeys,
} from "./services/keystore.js";
import {
  createSpotOrder,
  cancelOrder,
  getAccountBalances,
  getOpenOrders,
} from "./services/binance.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { initializeBinanceClient } from "./services/binance.js";
import {
  configureApiKeysTool,
  createOrderTool,
  cancelOrderTool,
  getBalancesTool,
  getOpenOrdersTool,
  createFuturesOrderTool,
  cancelFuturesOrderTool,
  getFuturesPositionsTool,
  setFuturesLeverageTool,
  getFuturesAccountTool,
  getFuturesOpenOrdersTool,
  getFundingRateTool,
} from "./services/tools.js";
import {
  createFuturesOrder,
  cancelFuturesOrder,
  getFuturesPositions,
  setFuturesLeverage,
  getFuturesAccountInformation as getFuturesAccount,
  getFuturesOpenOrders,
  getFundingRate,
  initializeFuturesClient,
  changePositionMode,
  changeMarginType,
  getFuturesKlines,
} from "./services/binanceFutures.js";
import { FuturesOrder, LeverageSettings, TimeInForce, PositionSide, WorkingType, MarginType } from "./types/futures.js";
import * as fs from 'fs';
import * as path from 'path';
import { z } from "zod";

// Load environment variables first
dotenv.config();

const logFile = path.join(process.cwd(), 'logs', 'server.log');

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

// 创建高级McpServer实例，而不是低级Server实例
const server = new McpServer({
  name: "mcp-server-binance",
  version: "0.1.0",
});

// 注册工具
server.tool(
  "configure_api_keys",
  {
    apiKey: z.string().describe("Binance API key"),
    apiSecret: z.string().describe("Binance API secret")
  },
  async ({ apiKey, apiSecret }) => {
    await storeApiKeys(apiKey, apiSecret);
    const spotInitialized = await initializeBinanceClient();
    const futuresInitialized = await initializeFuturesClient();
    return {
      content: [
        {
          type: "text",
          text: spotInitialized && futuresInitialized
            ? "API keys configured successfully"
            : "Failed to initialize Binance clients",
        },
      ],
    };
  }
);

server.tool(
  "create_spot_order",
  {
    symbol: z.string().describe("Trading pair symbol (e.g., BTCUSDT)"),
    side: z.enum(["BUY", "SELL"]).describe("Order side"),
    type: z.enum(["LIMIT", "MARKET"]).describe("Order type"),
    quantity: z.string().optional().describe("Order quantity (amount of base asset)"),
    quoteOrderQty: z.string().optional().describe("Quote order quantity (amount of quote asset to spend or receive, e.g. USDT)"),
    price: z.string().optional().describe("Order price (required for LIMIT orders)"),
    timeInForce: z.enum(["GTC", "IOC", "FOK"]).optional().describe("Time in force")
  },
  async (args) => {
    const order: SpotOrder = {
      symbol: args.symbol,
      side: args.side,
      type: args.type,
      quantity: args.quantity,
      quoteOrderQty: args.quoteOrderQty,
      price: args.price,
      timeInForce: args.timeInForce,
    };
    const response = await createSpotOrder(order);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response),
        },
      ],
    };
  }
);

server.tool(
  "cancel_order",
  {
    symbol: z.string().describe("Trading pair symbol (e.g., BTCUSDT)"),
    orderId: z.number().describe("Order ID to cancel")
  },
  async ({ symbol, orderId }) => {
    await cancelOrder(symbol, orderId);
    return {
      content: [
        {
          type: "text",
          text: "Order cancelled successfully",
        },
      ],
    };
  }
);

server.tool(
  "get_balances",
  {},
  async () => {
    const balances = await getAccountBalances();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(balances),
        },
      ],
    };
  }
);

server.tool(
  "get_open_orders",
  {
    symbol: z.string().optional().describe("Trading pair symbol (optional)")
  },
  async ({ symbol }) => {
    const orders = await getOpenOrders(symbol);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(orders),
        },
      ],
    };
  }
);

server.tool(
  "create_futures_order",
  {
    symbol: z.string().describe("Trading pair symbol (e.g., BTCUSDT)"),
    side: z.enum(["BUY", "SELL"]).describe("Order side"),
    type: z.enum([
      "LIMIT", "MARKET", "STOP", "STOP_MARKET", 
      "TAKE_PROFIT", "TAKE_PROFIT_MARKET", "TRAILING_STOP_MARKET"
    ]).describe("Order type"),
    quantity: z.string().describe("Order quantity"),
    price: z.string().optional().describe("Order price (required for LIMIT orders)"),
    stopPrice: z.string().optional().describe("Stop price (required for STOP orders)"),
    timeInForce: z.enum(["GTC", "IOC", "FOK", "GTX"]).optional().describe("Time in force"),
    reduceOnly: z.boolean().optional().describe("Reduce only flag"),
    closePosition: z.boolean().optional().describe("Close position flag"),
    positionSide: z.enum(["BOTH", "LONG", "SHORT"]).optional().describe("Position side"),
    workingType: z.enum(["MARK_PRICE", "CONTRACT_PRICE"]).optional().describe("Working type"),
    priceProtect: z.boolean().optional().describe("Price protect flag"),
    activationPrice: z.string().optional().describe("Activation price for TRAILING_STOP_MARKET orders"),
    callbackRate: z.string().optional().describe("Callback rate for TRAILING_STOP_MARKET orders")
  },
  async (args) => {
    const order: FuturesOrder = {
      symbol: args.symbol,
      side: args.side,
      type: args.type,
      quantity: args.quantity,
      price: args.price,
      stopPrice: args.stopPrice,
      timeInForce: args.timeInForce as TimeInForce,
      reduceOnly: args.reduceOnly,
      closePosition: args.closePosition,
      positionSide: args.positionSide as PositionSide,
      workingType: args.workingType as WorkingType,
      priceProtect: args.priceProtect,
      activationPrice: args.activationPrice,
      callbackRate: args.callbackRate,
    };
    const response = await createFuturesOrder(order);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response),
        },
      ],
    };
  }
);

server.tool(
  "cancel_futures_order",
  {
    symbol: z.string().describe("Trading pair symbol (e.g., BTCUSDT)"),
    orderId: z.number().describe("Order ID to cancel")
  },
  async ({ symbol, orderId }) => {
    await cancelFuturesOrder(symbol, orderId);
    return {
      content: [
        {
          type: "text",
          text: "Futures order cancelled successfully",
        },
      ],
    };
  }
);

server.tool(
  "get_futures_positions",
  {},
  async () => {
    const positions = await getFuturesPositions();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(positions),
        },
      ],
    };
  }
);

server.tool(
  "set_futures_leverage",
  {
    symbol: z.string().describe("Trading pair symbol (e.g., BTCUSDT)"),
    leverage: z.number().describe("Leverage value (1-125)")
  },
  async ({ symbol, leverage }) => {
    const settings: LeverageSettings = {
      symbol: symbol,
      leverage: leverage,
    };
    await setFuturesLeverage(settings);
    return {
      content: [
        {
          type: "text",
          text: "Leverage set successfully",
        },
      ],
    };
  }
);

server.tool(
  "get_futures_account",
  {},
  async () => {
    const account = await getFuturesAccount();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(account),
        },
      ],
    };
  }
);

server.tool(
  "get_futures_open_orders",
  {
    symbol: z.string().optional().describe("Trading pair symbol (optional)")
  },
  async ({ symbol }) => {
    const orders = await getFuturesOpenOrders(symbol);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(orders),
        },
      ],
    };
  }
);

server.tool(
  "get_funding_rate",
  {
    symbol: z.string().describe("Trading pair symbol (e.g., BTCUSDT)")
  },
  async ({ symbol }) => {
    const rate = await getFundingRate(symbol);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(rate),
        },
      ],
    };
  }
);

async function main() {
  try {
    // Initialize Binance clients
    const spotInitialized = await initializeBinanceClient();
    const futuresInitialized = await initializeFuturesClient();
    
    if (!spotInitialized || !futuresInitialized) {
      logError('Binance clients not initialized');
    } else {
      log('Binance clients initialized successfully');
    }

    // 使用stdio传输层
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log('Server started successfully with stdio transport');
  } catch (error) {
    logError('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  logError('Unhandled error:', error);
  process.exit(1);
});
