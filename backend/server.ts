import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { S3Client } from '@aws-sdk/client-s3';
import { SESClient } from '@aws-sdk/client-ses';

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Initialize AWS clients
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

export const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Middleware
app.use(cors());
app.use(express.json());

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    // Handle incoming messages
    console.log('Received:', message);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 