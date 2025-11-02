const path = require('path');
const whatsappService = require('../models/WhatsAppService');

class WhatsAppController {
  async sendMessage(req, res) {
    const { number, message } = req.body;

    try {
      await whatsappService.sendMessage(number, message);
      res.json({ success: true, message: 'Message sent' });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ 
        error: 'Failed to send message', 
        details: error.message 
      });
    }
  }

  async logout(req, res) {
    try {
      await whatsappService.logout();
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ 
        error: 'Logout failed', 
        details: error.message 
      });
    }
  }
}

module.exports = new WhatsAppController();