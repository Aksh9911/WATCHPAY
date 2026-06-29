'use strict';

const { generateTraceId } = require('../utils/traceId.util');

function traceIdMiddleware(req, res, next) {
  const traceId = generateTraceId();
  req.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);
  next();
}

module.exports = traceIdMiddleware;
