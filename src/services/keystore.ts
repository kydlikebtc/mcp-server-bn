import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const logFile = path.join(process.cwd(), 'logs', 'keystore.log');

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

export async function storeApiKeys(apiKey: string, apiSecret: string): Promise<void> {
  process.env.BINANCE_API_KEY = apiKey;
  process.env.BINANCE_API_SECRET = apiSecret;
  log('API keys stored in environment variables');
}

export async function getApiKeys(): Promise<{ apiKey: string; apiSecret: string } | null> {
  const envApiKey = process.env.BINANCE_API_KEY;
  const envApiSecret = process.env.BINANCE_API_SECRET;

  if (envApiKey && envApiSecret) {
    log('Found API keys in environment variables');
    return { apiKey: envApiKey, apiSecret: envApiSecret };
  }

  log('No API keys found in environment variables');
  return null;
}

export async function deleteApiKeys(): Promise<void> {
  delete process.env.BINANCE_API_KEY;
  delete process.env.BINANCE_API_SECRET;
  log('Cleared API keys from environment variables');
}
