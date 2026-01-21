import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config';
import { handleClientConnection } from './websocket/clientHandler';

const app = express();

// Middleware
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Track connected clients
const clients = new Map<string, WebSocket>();

wss.on('connection', (ws, req) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  clients.set(clientId, ws);

  console.log(`Client connected: ${clientId}`);

  // Handle the client connection
  handleClientConnection(ws, clientId);

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${clientId}:`, error);
    clients.delete(clientId);
  });
});

// Start server
server.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`Accepting connections from: ${config.clientUrl}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  wss.clients.forEach((client) => {
    client.close();
  });
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
