const express = require('express');
const statusController = require('../controllers/statusController');

const router = express.Router();

router.get('/status', statusController.getStatus);

module.exports = router;