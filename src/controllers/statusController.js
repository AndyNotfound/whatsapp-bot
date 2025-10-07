const whatsappService = require('../models/WhatsAppService');

class StatusController {
  getStatus(req, res) {
    const status = whatsappService.getStatus();
    res.json(status);
  }
}

module.exports = new StatusController();