import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export async function storeApiKeys(apiKey: string, apiSecret: string): Promise<void> {
  process.env.BINANCE_API_KEY = apiKey;
  process.env.BINANCE_API_SECRET = apiSecret;
  console.log('API keys stored in environment variables');
}

export async function getApiKeys(): Promise<{ apiKey: string; apiSecret: string } | null> {
  const envApiKey = process.env.BINANCE_API_KEY;
  const envApiSecret = process.env.BINANCE_API_SECRET;

  if (envApiKey && envApiSecret) {
    console.log('Found API keys in environment variables');
    return { apiKey: envApiKey, apiSecret: envApiSecret };
  }

  console.warn('No API keys found in environment variables');
  return null;
}

export async function deleteApiKeys(): Promise<void> {
  delete process.env.BINANCE_API_KEY;
  delete process.env.BINANCE_API_SECRET;
  console.log('Cleared API keys from environment variables');
}
