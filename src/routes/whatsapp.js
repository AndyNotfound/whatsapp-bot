const express = require('express');
const whatsappController = require('../controllers/whatsappController');
const { validateSendMessage } = require('../middleware/validation');

const router = express.Router();

router.post('/send-message', validateSendMessage, whatsappController.sendMessage);
router.post('/logout', whatsappController.logout);
router.get('/qr', whatsappController.getQR);

module.exports = router;