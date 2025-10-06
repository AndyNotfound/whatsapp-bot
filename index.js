// server.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { 
  DisconnectReason, 
  useMultiFileAuthState,
  makeInMemoryStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

// Store for message history
// const store = makeInMemoryStore({ logger: pino().child({ level: 'silent' }) });

let sock;
let qrCode;
let isConnected = false;

// Initialize WhatsApp connection
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
  });

//   store.bind(sock.ev);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrCode = qr;
      io.emit('qr', qr);
    }

    console.log('Connection update:', update);

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      isConnected = false;
      io.emit('connection-status', { connected: false });
      
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('WhatsApp connected');
      isConnected = true;
      qrCode = null;
      io.emit('connection-status', { connected: true });
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const messageData = {
      key: msg.key,
      message: msg.message,
      messageTimestamp: msg.messageTimestamp,
      pushName: msg.pushName
    };

    io.emit('new-message', messageData);
  });
}

// REST API Endpoints
app.get('/status', (req, res) => {
  res.json({ 
    connected: isConnected,
    hasQR: !!qrCode 
  });
});

app.get('/qr', (req, res) => {
  if (qrCode) {
    // res.json({ qr: qrCode });
    res.sendFile("./client/qr.html", {
        root: __dirname,
    });
  } else {
    res.status(404).json({ error: 'No QR code available' });
  }
});

app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;

  if (!isConnected) {
    return res.status(503).json({ error: 'WhatsApp not connected' });
  }

  if (!number || !message) {
    return res.status(400).json({ error: 'Number and message are required' });
  }

  try {
    const jid = number.includes('@s.whatsapp.net') 
      ? number 
      : `${number}@s.whatsapp.net`;
    
    await sock.sendMessage(jid, { text: message });
    res.json({ success: true, message: 'Message sent' });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

app.post('/logout', async (req, res) => {
  try {
    await sock.logout();
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed', details: error.message });
  }
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('connection-status', { connected: isConnected });
  
  if (qrCode) {
    socket.emit('qr', qrCode);
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  socket.on('send-message', async (data) => {
    const { number, message } = data;
    
    if (!isConnected) {
      socket.emit('error', { message: 'WhatsApp not connected' });
      return;
    }

    try {
      const jid = number.includes('@s.whatsapp.net') 
        ? number 
        : `${number}@s.whatsapp.net`;
      
      await sock.sendMessage(jid, { text: message });
      socket.emit('message-sent', { success: true });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectToWhatsApp();
});