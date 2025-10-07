const { Server } = require('socket.io');
const whatsappService = require('../models/WhatsAppService');

let io;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Set the event emitter for WhatsApp service
  whatsappService.setEventEmitter(io);

  // Initialize WhatsApp connection
  whatsappService.connect();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    const status = whatsappService.getStatus();
    socket.emit('connection-status', { connected: status.connected });
    
    const qrCode = whatsappService.getQRCode();
    if (qrCode) {
      socket.emit('qr', qrCode);
    }

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    socket.on('send-message', async (data) => {
      const { number, message } = data;
      
      if (!whatsappService.getStatus().connected) {
        socket.emit('error', { message: 'WhatsApp not connected' });
        return;
      }

      try {
        await whatsappService.sendMessage(number, message);
        socket.emit('message-sent', { success: true });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO
};