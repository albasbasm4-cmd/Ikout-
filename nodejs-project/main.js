/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Embedded Node.js WebSocket relay server for iKout
 * Listens on 0.0.0.0:8080 and relays all traffic to/from the app webview.
 */

const http = require('http');
let WebSocketServer;
try {
  WebSocketServer = require('ws').WebSocketServer;
} catch {
  try {
    WebSocketServer = require('ws').Server;
  } catch (err) {
    console.error('[NodeJS Server] ws package not found:', err);
  }
}

// Locate Capacitor / nodejs-mobile bridge
let bridge = null;
try {
  bridge = require('nodejs-mobile-react-native');
} catch {
  try {
    bridge = require('rn-bridge');
  } catch {
    bridge = null;
  }
}

function sendToApp(message) {
  if (bridge && bridge.channel) {
    bridge.channel.send(JSON.stringify(message));
  } else if (process.send) {
    process.send(message);
  } else {
    // Console fallback for testing
    // console.log('[NodeJS -> App]', message);
  }
}

if (!WebSocketServer) {
  console.warn('[NodeJS Server] WebSocketServer unavailable. Relay inactive.');
  sendToApp({ type: 'SERVER_ERROR', message: 'WebSocket module not available' });
  return;
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'iKout Local Server Running', port: 8080 }));
});

const wss = new WebSocketServer({ server });

// Map of connected client WebSockets: clientId -> ws
const clients = new Map();
let clientIdCounter = 0;

wss.on('connection', (ws, req) => {
  const clientId = `client_${++clientIdCounter}_${Date.now()}`;
  ws.clientId = clientId;
  ws.isAlive = true;
  clients.set(clientId, ws);

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Notify app of new client connection
  sendToApp({
    type: 'CLIENT_CONNECTED',
    clientId,
    remoteAddress: req.socket.remoteAddress,
  });

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      sendToApp({
        type: 'CLIENT_MESSAGE',
        clientId,
        data: parsed,
      });
    } catch {
      sendToApp({
        type: 'CLIENT_MESSAGE',
        clientId,
        data: data.toString(),
      });
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    sendToApp({
      type: 'CLIENT_DISCONNECTED',
      clientId,
    });
  });

  ws.on('error', (err) => {
    console.error(`[NodeJS WS] Error on ${clientId}:`, err.message);
  });
});

// Ping / Pong heartbeat every 5s to detect dead connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      clients.delete(ws.clientId);
      sendToApp({
        type: 'CLIENT_DISCONNECTED',
        clientId: ws.clientId,
      });
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 5000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Handle incoming messages from the App (App -> NodeJS -> Clients)
function handleAppMessage(rawMessage) {
  let message = rawMessage;
  if (typeof rawMessage === 'string') {
    try {
      message = JSON.parse(rawMessage);
    } catch {
      return;
    }
  }

  if (!message || !message.type) return;

  switch (message.type) {
    case 'SEND_TO_CLIENT': {
      const client = clients.get(message.clientId);
      if (client && client.readyState === 1 /* OPEN */) {
        client.send(
          typeof message.data === 'string'
            ? message.data
            : JSON.stringify(message.data)
        );
      }
      break;
    }

    case 'BROADCAST': {
      const payload =
        typeof message.data === 'string'
          ? message.data
          : JSON.stringify(message.data);
      wss.clients.forEach((client) => {
        if (client.readyState === 1 /* OPEN */) {
          client.send(payload);
        }
      });
      break;
    }

    case 'DISCONNECT_CLIENT': {
      const client = clients.get(message.clientId);
      if (client) {
        client.close();
        clients.delete(message.clientId);
      }
      break;
    }

    default:
      break;
  }
}

// Register app channel listener
if (bridge && bridge.channel) {
  bridge.channel.on('message', handleAppMessage);
} else if (process.on) {
  process.on('message', handleAppMessage);
}

const PORT = 8080;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`[iKout Node Server] WebSocket relay listening on ${HOST}:${PORT}`);
  sendToApp({ type: 'SERVER_READY', port: PORT, host: HOST });
});
