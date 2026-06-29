'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/watchpay.controller');
const { payoutRateLimiter } = require('../middleware/payoutGuard');

router.post('/payout/create', payoutRateLimiter, controller.payoutCreate);

module.exports = router;
