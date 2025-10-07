const whatsappService = require('../models/WhatsAppService');

const validateSendMessage = (req, res, next) => {
  const { number, message } = req.body;

  if (!whatsappService.getStatus().connected) {
    return res.status(503).json({ error: 'WhatsApp not connected' });
  }

  if (!number || !message) {
    return res.status(400).json({ error: 'Number and message are required' });
  }

  next();
};

module.exports = {
  validateSendMessage
};