// src/socket.js
const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // allow frontend access
      methods: ["GET", "POST"]
    }
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

module.exports = { initSocket, getIO };
