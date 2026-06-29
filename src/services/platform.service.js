'use strict';

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { appLogger, systemErrorLogger, payoutWebhookLogger, payoutErrorLogger } = require('../utils/logger');

const PLATFORM_BASE_URL = process.env.PLATFORM_API_BASE_URL || 'https://api.rollix777.com';
const SEP = '====================================';

function getPlatformHeaders(traceId) {
  return {
    'Content-Type': 'application/json',
    'X-Correlation-ID': traceId || uuidv4(),
  };
}

async function updateWithdrawStatus({ withdrawId, status, traceId }) {
  const url = `${PLATFORM_BASE_URL}/api/user/withdraw/status`;
  const body = {
    withdrawId,
    status,
  };

  appLogger.info('Platform API: updateWithdrawStatus request', {
    traceId,
    url,
    body,
    timestamp: new Date().toISOString(),
  });

  console.log(`\n${SEP}`);
  console.log('  PLATFORM API — UPDATE WITHDRAW STATUS');
  console.log(SEP);
  console.log(`  TraceId    : ${traceId}`);
  console.log(`  WithdrawId : ${withdrawId}`);
  console.log(`  Status     : ${status}`);
  console.log(`  URL        : POST ${url}`);
  console.log(`${SEP}\n`);

  const response = await axios.post(url, body, {
    headers: getPlatformHeaders(traceId),
    timeout: 15000,
  });

  appLogger.info('Platform API: updateWithdrawStatus response', {
    traceId,
    withdrawId,
    httpStatus: response.status,
    data: response.data,
    timestamp: new Date().toISOString(),
  });

  console.log(`\n${SEP}`);
  console.log('  PLATFORM API — WITHDRAW STATUS RAW RESPONSE');
  console.log(SEP);
  console.log(`  TraceId    : ${traceId}`);
  console.log(`  WithdrawId : ${withdrawId}`);
  console.log(`  HttpStatus : ${response.status}`);
  console.log(`  RawData    : ${JSON.stringify(response.data)}`);
  console.log(`${SEP}\n`);

  return response.data;
}

async function processPayoutSuccess({ withdrawId, traceId }) {
  try {
    const result = await updateWithdrawStatus({ withdrawId, status: 'success', traceId });

    console.log(`\n${SEP}`);
    console.log('  PLATFORM API — WITHDRAW STATUS UPDATED ✓');
    console.log(SEP);
    console.log(`  TraceId    : ${traceId}`);
    console.log(`  WithdrawId : ${withdrawId}`);
    console.log(`  Response   : ${JSON.stringify(result)}`);
    console.log(`${SEP}\n`);

    payoutWebhookLogger.info('Platform withdraw status updated to success', {
      traceId,
      withdrawId,
      response: result,
    });

    return { platformUpdated: true };
  } catch (err) {
    systemErrorLogger.error('Platform withdraw status update failed', {
      traceId,
      withdrawId,
      errorType: err.code || 'PLATFORM_API_ERROR',
      errorMessage: err.message,
      stackTrace: err.stack,
      timestamp: new Date().toISOString(),
    });

    console.error(`\n${SEP}`);
    console.error('  [CRITICAL] PLATFORM WITHDRAW STATUS UPDATE FAILED');
    console.error(SEP);
    console.error(`  TraceId    : ${traceId}`);
    console.error(`  WithdrawId : ${withdrawId}`);
    console.error(`  Error      : ${err.message}`);
    console.error(`  *** MANUAL INTERVENTION MAY BE REQUIRED ***`);
    console.error(`${SEP}\n`);

    payoutErrorLogger.error('Platform withdraw status update failed', {
      traceId,
      withdrawId,
      error: err.message,
    });

    return { platformUpdated: false };
  }
}

module.exports = { processPayoutSuccess, updateWithdrawStatus };
