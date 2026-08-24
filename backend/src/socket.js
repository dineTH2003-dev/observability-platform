// src/socket.js
const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  // Allowed origins must match Express CORS config.
  // FRONTEND_URL is set in .env.prod to the Amplify app URL.
  const allowedOrigins = [
    process.env.FRONTEND_URL,       // e.g. https://main.xxxxx.amplifyapp.com
    "http://localhost:5173",        // Vite dev server
    "http://localhost:3000",
    "http://127.0.0.1:5173",
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,            // Required for JWT Authorization header
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Allow clients to subscribe to specific server or service rooms if needed
    socket.on('subscribe_server', (serverId) => {
      socket.join(`server_${serverId}`);
      console.log(`[Socket] Client ${socket.id} subscribed to server_${serverId}`);
    });

    socket.on('subscribe_service', (serviceId) => {
      socket.join(`service_${serviceId}`);
      console.log(`[Socket] Client ${socket.id} subscribed to service_${serviceId}`);
    });

    socket.on('register_user', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`[Socket] Client ${socket.id} registered for user_${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized!");
  }
  return io;
};

/**
 * Broadcast an anomaly lifecycle event to all connected clients.
 * @param {'anomaly_created'|'anomaly_updated'} eventType
 * @param {object} data - anomaly payload
 */
const broadcastAnomalyEvent = (eventType, data) => {
  if (!io) return;
  io.emit(eventType, data);
};

/**
 * Broadcast an incident lifecycle event to all connected clients.
 * @param {'incident_created'|'incident_updated'} eventType
 * @param {object} data - incident payload
 */
const broadcastIncidentEvent = (eventType, data) => {
  if (!io) return;
  io.emit(eventType, data);
};

module.exports = { initSocket, getIO, broadcastAnomalyEvent, broadcastIncidentEvent };
