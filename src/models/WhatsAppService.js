const makeWASocket = require('@whiskeysockets/baileys').default;
const { 
  DisconnectReason, 
  useMultiFileAuthState
} = require('@whiskeysockets/baileys');
const pino = require('pino');

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.qrCode = null;
    this.isConnected = false;
    this.eventEmitter = null;
  }

  setEventEmitter(emitter) {
    this.eventEmitter = emitter;
  }

  async connect() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' }),
    });

    this.sock.ev.on('connection.update', (update) => {
      this.handleConnectionUpdate(update);
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      this.handleNewMessage(messages);
    });
  }

  handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      this.qrCode = qr;
      if (this.eventEmitter) {
        this.eventEmitter.emit('qr', qr);
      }
    }

    console.log('Connection update:', update);

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      this.isConnected = false;
      
      if (this.eventEmitter) {
        this.eventEmitter.emit('connection-status', { connected: false });
      }
      
      if (shouldReconnect) {
        this.connect();
      }
    } else if (connection === 'open') {
      console.log('WhatsApp connected');
      this.isConnected = true;
      this.qrCode = null;
      
      if (this.eventEmitter) {
        this.eventEmitter.emit('connection-status', { connected: true });
      }
    }
  }

  handleNewMessage(messages) {
    const msg = messages[0];
    if (!msg.message) return;

    const messageData = {
      key: msg.key,
      message: msg.message,
      messageTimestamp: msg.messageTimestamp,
      pushName: msg.pushName
    };

    if (this.eventEmitter) {
      this.eventEmitter.emit('new-message', messageData);
    }
  }

  async sendMessage(number, message) {
    if (!this.isConnected) {
      throw new Error('WhatsApp not connected');
    }

    const jid = number.includes('@s.whatsapp.net') 
      ? number 
      : `${number}@s.whatsapp.net`;
    
    await this.sock.sendMessage(jid, { text: message });
  }

  async logout() {
    if (this.sock) {
      await this.sock.logout();
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      hasQR: !!this.qrCode
    };
  }

  getQRCode() {
    return this.qrCode;
  }
}

module.exports = new WhatsAppService();