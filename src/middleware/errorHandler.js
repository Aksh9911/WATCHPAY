'use strict';

const { systemErrorLogger, payoutErrorLogger } = require('../utils/logger');
const { errorResponse } = require('../utils/response.util');

const ERROR_MAP = {
  VALIDATION_ERROR: { status: 422, message: 'Validation failed' },
  REMOTE_API_ERROR: { status: 502, message: 'Remote API error' },
  REMOTE_TIMEOUT: { status: 504, message: 'Remote API timeout' },
  INVALID_PAYLOAD: { status: 400, message: 'Invalid payload' },
  WEBHOOK_ERROR: { status: 400, message: 'Webhook processing error' },
  MD5_SIGN_ERROR: { status: 500, message: 'Signature generation failure' },
};

function errorHandler(err, req, res, next) {
  const traceId = req.traceId || 'UNKNOWN';
  const url = req.originalUrl || '';
  const isPayout = url.includes('payout');

  const code = err.code || 'INTERNAL_ERROR';
  const mapped = ERROR_MAP[code] || { status: 500, message: 'Internal server error' };

  const logEntry = {
    timestamp: new Date().toISOString(),
    traceId,
    module: isPayout ? 'PAYOUT' : 'SYSTEM',
    endpoint: url,
    withdrawId: req.body?.withdrawId || 'N/A',
    errorType: code,
    errorMessage: err.message,
    stackTrace: err.stack,
    requestPayload: req.body || null,
    responsePayload: null,
  };

  systemErrorLogger.error('Unhandled error', logEntry);

  if (isPayout) {
    payoutErrorLogger.error('Payout error', logEntry);
  }

  return errorResponse(res, mapped.status, mapped.message, traceId, err.message);
}

module.exports = errorHandler;
