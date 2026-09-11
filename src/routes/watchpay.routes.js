'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/watchpay.controller');
const { payoutRateLimiter, requirePayoutSecret } = require('../middleware/payoutGuard');

router.post('/payout/create', requirePayoutSecret, payoutRateLimiter, controller.payoutCreate);

module.exports = router;
