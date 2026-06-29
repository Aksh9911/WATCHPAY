'use strict';

const { appLogger } = require('../utils/logger');
const { maskSensitiveData } = require('../utils/mask.util');

function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl, ip, traceId } = req;

  const body = req.body ? maskSensitiveData({ ...req.body }) : {};

  appLogger.info('Incoming request', {
    traceId,
    method,
    url: originalUrl,
    ip,
    body,
    timestamp: new Date().toISOString(),
  });

  console.log(`\n====================================`);
  console.log(`  WATCHPAY INCOMING REQUEST`);
  console.log(`====================================`);
  console.log(`  TraceId   : ${traceId}`);
  console.log(`  Method    : ${method}`);
  console.log(`  URL       : ${originalUrl}`);
  console.log(`  IP        : ${ip}`);
  console.log(`  Timestamp : ${new Date().toISOString()}`);
  console.log(`====================================\n`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    appLogger.info('Request completed', {
      traceId,
      method,
      url: originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });

    console.log(`\n====================================`);
    console.log(`  WATCHPAY REQUEST COMPLETED`);
    console.log(`====================================`);
    console.log(`  TraceId    : ${traceId}`);
    console.log(`  Method     : ${method}`);
    console.log(`  URL        : ${originalUrl}`);
    console.log(`  StatusCode : ${res.statusCode}`);
    console.log(`  Duration   : ${duration}ms`);
    console.log(`====================================\n`);
  });

  next();
}

module.exports = requestLogger;
