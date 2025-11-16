import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  WORKER_URL: string;
  NODE_ENV: string;
}

function validateEnv(): EnvConfig {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const DATABASE_URL = process.env.DATABASE_URL;
  const WORKER_URL = process.env.WORKER_URL;
  const NODE_ENV = process.env.NODE_ENV || 'development';

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (!WORKER_URL) {
    throw new Error('WORKER_URL environment variable is required');
  }

  return {
    PORT,
    DATABASE_URL,
    WORKER_URL,
    NODE_ENV,
  };
}

export const config = validateEnv();
