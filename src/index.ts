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
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
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
} from "./services/binanceFutures.js";
import { FuturesOrder, LeverageSettings, TimeInForce, PositionSide, WorkingType } from "./types/futures.js";
import * as fs from 'fs';
import * as path from 'path';

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

const server = new Server(
  {
    name: "mcp-server-binance",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
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
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  log(`Call tool request: ${JSON.stringify(request)}`);
  switch (request.params.name) {
    case "configure_api_keys": {
      const args = request.params.arguments as { apiKey: string; apiSecret: string };
      await storeApiKeys(args.apiKey, args.apiSecret);
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

    case "create_spot_order": {
      const args = request.params.arguments as unknown as {
        symbol: string;
        side: "BUY" | "SELL";
        type: "LIMIT" | "MARKET";
        quantity?: string;
        price?: string;
        timeInForce?: "GTC" | "IOC" | "FOK";
      };
      const order: SpotOrder = {
        symbol: args.symbol,
        side: args.side,
        type: args.type,
        quantity: args.quantity,
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

    case "cancel_order": {
      const args = request.params.arguments as { symbol: string; orderId: number };
      await cancelOrder(args.symbol, args.orderId);
      return {
        content: [
          {
            type: "text",
            text: "Order cancelled successfully",
          },
        ],
      };
    }

    case "get_balances": {
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

    case "get_open_orders": {
      const args = request.params.arguments as { symbol?: string };
      const orders = await getOpenOrders(args?.symbol);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(orders),
          },
        ],
      };
    }

    case "create_futures_order": {
      const args = request.params.arguments as unknown as {
        symbol: string;
        side: "BUY" | "SELL";
        type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET" | "TRAILING_STOP_MARKET";
        quantity: string;
        price?: string;
        stopPrice?: string;
        timeInForce?: keyof typeof TimeInForce;
        reduceOnly?: boolean;
        closePosition?: boolean;
        positionSide?: keyof typeof PositionSide;
        workingType?: keyof typeof WorkingType;
        priceProtect?: boolean;
        activationPrice?: string;
        callbackRate?: string;
      };
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

    case "cancel_futures_order": {
      const args = request.params.arguments as { symbol: string; orderId: number };
      await cancelFuturesOrder(args.symbol, args.orderId);
      return {
        content: [
          {
            type: "text",
            text: "Futures order cancelled successfully",
          },
        ],
      };
    }

    case "get_futures_positions": {
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

    case "set_futures_leverage": {
      const args = request.params.arguments as { symbol: string; leverage: number };
      const settings: LeverageSettings = {
        symbol: args.symbol,
        leverage: args.leverage,
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

    case "get_futures_account": {
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

    case "get_futures_open_orders": {
      const args = request.params.arguments as { symbol?: string };
      const orders = await getFuturesOpenOrders(args?.symbol);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(orders),
          },
        ],
      };
    }

    case "get_funding_rate": {
      const args = request.params.arguments as { symbol: string };
      const rate = await getFundingRate(args.symbol);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rate),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

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

    // 只使用 stdio 传输层
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log('Server started successfully');
  } catch (error) {
    logError('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  logError('Unhandled error:', error);
  process.exit(1);
});
