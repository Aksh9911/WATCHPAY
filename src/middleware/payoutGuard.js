'use strict';

const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { appLogger, payoutErrorLogger } = require('../utils/logger');

const payoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
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

function requirePayoutSecret(req, res, next) {
  const expected = process.env.PAYOUT_SECRET_KEY;
  if (!expected || !String(expected).trim()) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: 'PAYOUT_SECRET_KEY is not configured',
    });
  }

  const provided =
    (req.body && req.body.payoutSecret) ||
    req.headers['x-payout-secret'] ||
    (req.query && req.query.payoutSecret);

  if (provided == null || typeof provided !== 'string' || !provided.trim()) {
    return res.status(403).json({
      success: false,
      status: 'error',
      message: 'Invalid or missing payout secret',
    });
  }

  const a = Buffer.from(provided.trim(), 'utf8');
  const b = Buffer.from(String(expected).trim(), 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({
      success: false,
      status: 'error',
      message: 'Invalid or missing payout secret',
    });
  }

  if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'payoutSecret')) {
    delete req.body.payoutSecret;
  }

  return next();
}

module.exports = { payoutRateLimiter, requirePayoutSecret };
