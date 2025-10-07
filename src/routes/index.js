const express = require('express');
const whatsappRoutes = require('./whatsapp');
const statusRoutes = require('./status');

const router = express.Router();

router.use('/', statusRoutes);
router.use('/', whatsappRoutes);

module.exports = router;