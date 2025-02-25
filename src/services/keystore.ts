import keytar from 'keytar';
import dotenv from 'dotenv';

const SERVICE_NAME = 'mcp-server-cex-bn';
const ACCOUNT_NAME = 'binance-api';

// Load environment variables
dotenv.config();

export async function storeApiKeys(apiKey: string, apiSecret: string): Promise<void> {
  try {
    console.log('Attempting to store API keys in keychain...');
    await keytar.setPassword(SERVICE_NAME, `${ACCOUNT_NAME}-key`, apiKey);
    await keytar.setPassword(SERVICE_NAME, `${ACCOUNT_NAME}-secret`, apiSecret);
    console.log('Successfully stored API keys in keychain');
  } catch (error) {
    console.warn('Failed to store keys in keychain, falling back to environment variables:', error);
    process.env.BINANCE_API_KEY = apiKey;
    process.env.BINANCE_API_SECRET = apiSecret;
    console.log('API keys stored in environment variables');
  }
}

export async function getApiKeys(): Promise<{ apiKey: string; apiSecret: string } | null> {
  try {
    console.log('Attempting to retrieve API keys from keychain...');
    const apiKey = await keytar.getPassword(SERVICE_NAME, `${ACCOUNT_NAME}-key`);
    const apiSecret = await keytar.getPassword(SERVICE_NAME, `${ACCOUNT_NAME}-secret`);
    
    if (apiKey && apiSecret) {
      console.log('Successfully retrieved API keys from keychain');
      return { apiKey, apiSecret };
    }
  } catch (error) {
    console.warn('Failed to get keys from keychain, falling back to environment variables:', error);
  }

  // Fallback to environment variables
  console.log('Checking environment variables for API keys...');
  const envApiKey = process.env.BINANCE_API_KEY;
  const envApiSecret = process.env.BINANCE_API_SECRET;

  if (envApiKey && envApiSecret) {
    console.log('Found API keys in environment variables');
    return { apiKey: envApiKey, apiSecret: envApiSecret };
  }

  console.warn('No API keys found in keychain or environment variables');
  return null;
}

export async function deleteApiKeys(): Promise<void> {
  try {
    console.log('Attempting to delete API keys from keychain...');
    await keytar.deletePassword(SERVICE_NAME, `${ACCOUNT_NAME}-key`);
    await keytar.deletePassword(SERVICE_NAME, `${ACCOUNT_NAME}-secret`);
    console.log('Successfully deleted API keys from keychain');
  } catch (error) {
    console.warn('Failed to delete keys from keychain:', error);
  }
  // Also clear environment variables
  delete process.env.BINANCE_API_KEY;
  delete process.env.BINANCE_API_SECRET;
  console.log('Cleared API keys from environment variables');
}
