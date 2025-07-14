import dotenv from 'dotenv';
import path from 'path';

// Load .env file from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.BACKEND_PORT || '3000', 10),
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
  ELEVENLABS_API_KEY: process.env.VITE_ELEVEN_LABS_API_KEY || '',
  ELEVENLABS_VOICE_ID: process.env.VITE_ELEVEN_LABS_VOICE_ID || '',
  ELEVENLABS_AGENT_ID: process.env.VITE_ELEVEN_LABS_AGENT_ID || '',
  
  // AWS Configuration
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || '',
  AWS_SES_FROM_EMAIL: process.env.AWS_SES_FROM_EMAIL || '',
  
  // File upload configuration
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB in bytes
  ALLOWED_FILE_TYPES: ['audio/webm', 'audio/mp3', 'audio/mpeg'],
}; 