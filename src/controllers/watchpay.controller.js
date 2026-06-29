'use strict';

const service = require('../services/watchpay.service');
const { validatePayoutCreate } = require('../validators/watchpay.validator');
const { successResponse, errorResponse } = require('../utils/response.util');
const { appLogger, payoutErrorLogger } = require('../utils/logger');

async function payoutCreate(req, res, next) {
  const traceId = req.traceId;
  try {
    const validated = validatePayoutCreate(req.body);
    const result = await service.createPayout(validated, traceId);
    return successResponse(res, result, traceId);
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') {
      payoutErrorLogger.error('Payout create validation error', {
        traceId,
        errorType: err.code,
        errorMessage: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
      });
      return res.status(422).json({
        status: 'error',
        message: 'Validation failed',
        traceId,
        errors: err.details,
      });
    }
    appLogger.error('payoutCreate error', { traceId, error: err.message });
    return next(err);
  }
}

module.exports = { payoutCreate };
