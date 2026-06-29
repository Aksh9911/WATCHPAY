'use strict';

const rateLimit = require('express-rate-limit');
const { appLogger, payoutErrorLogger } = require('../utils/logger');

const payoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  skip: (req) => req.method !== 'POST',
  handler: (req, res, next, options) => {
    appLogger.warn('Payout rate limit exceeded', {
      withdrawId: req.body?.withdrawId,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
    return res.status(429).json({
      status: 'error',
      message: 'Too many payout requests. Please try again later.',
      traceId: req.traceId || 'UNKNOWN',
    });
  },
});

module.exports = { payoutRateLimiter };
