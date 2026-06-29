'use strict';

function successResponse(res, data, traceId, message = 'success') {
  return res.status(200).json({
    status: 'success',
    message,
    traceId,
    data,
  });
}

function errorResponse(res, statusCode, message, traceId, details = null) {
  const body = {
    status: 'error',
    message,
    traceId,
  };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

function validationErrorResponse(res, errors, traceId) {
  return res.status(422).json({
    status: 'error',
    message: 'Validation failed',
    traceId,
    errors,
  });
}

module.exports = { successResponse, errorResponse, validationErrorResponse };
