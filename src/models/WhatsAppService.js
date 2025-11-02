const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const pino = require("pino");

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
    try {
      const { state, saveCreds } = await useMultiFileAuthState(
        "auth_info_baileys"
      );

      console.log("Creating WhatsApp socket...");
      this.sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });

      this.sock.ev.on("connection.update", (update) => {
        this.handleConnectionUpdate(update);
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("messages.upsert", async ({ messages }) => {
        this.handleNewMessage(messages);
      });
    } catch (error) {
      console.error("Error connecting to WhatsApp:", error);
      setTimeout(() => this.connect(), 5000);
    }
  }

  handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("QR Code generated");
      this.qrCode = qr;
      if (this.eventEmitter) {
        this.eventEmitter.emit("qr", qr);
      }
    }

    console.log("Connection update:", update);

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log("Connection closed. Reconnecting:", shouldReconnect);
      this.isConnected = false;
      this.qrCode = null;

      if (this.eventEmitter) {
        this.eventEmitter.emit("connection-status", { connected: false });
      }

      if (shouldReconnect) {
        setTimeout(() => this.connect(), 2000);
      }
    } else if (connection === "open") {
      console.log("WhatsApp connected successfully");
      this.isConnected = true;
      this.qrCode = null;

      if (this.eventEmitter) {
        this.eventEmitter.emit("connection-status", { connected: true });
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
      pushName: msg.pushName,
    };

    if (this.eventEmitter) {
      this.eventEmitter.emit("new-message", messageData);
    }
  }

  async sendMessage(number, message) {
    if (!this.isConnected) {
      throw new Error("WhatsApp not connected");
    }

    const jid = number.includes("@s.whatsapp.net")
      ? number
      : `${number}@s.whatsapp.net`;

    try {
      console.log(`Sending message to ${jid}: ${message}`);

      const sendPromise = this.sock.sendMessage(jid, { text: message });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Message send timeout")), 30000)
      );

      await Promise.race([sendPromise, timeoutPromise]);
      console.log("Message sent successfully");
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }

  async logout() {
    if (this.sock) {
      await this.sock.logout();
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      hasQR: !!this.qrCode,
    };
  }

  getQRCode() {
    return this.qrCode;
  }
}

module.exports = new WhatsAppService();
