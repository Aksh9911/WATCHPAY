'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getConfig } = require('../config/watchpay.config');
const { validatePayoutCallback } = require('../validators/watchpay.validator');
const { isDuplicatePayout, markPayoutProcessed } = require('../storage/webhookCache');
const { updateWithdrawlStatusByTradeNo } = require('../models/withdrawl.model');
const {
  payoutWebhookLogger,
  payoutErrorLogger,
  systemErrorLogger,
  printPayoutWebhook,
} = require('../utils/logger');

const SEP = '====================================';

function verifyCallbackSign(body, privateKey) {
  const params = { ...body };
  delete params.sign;
  delete params.sign_type;

  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      const val = params[key];
      if (val !== '' && val !== null && val !== undefined) {
        acc[key] = val;
      }
      return acc;
    }, {});

  const queryParts = Object.keys(sorted).map((k) => `${k}=${sorted[k]}`);
  const queryString = queryParts.join('&') + '&key=' + privateKey;

  const expectedSign = crypto.createHash('md5').update(queryString).digest('hex').toLowerCase();
  return { valid: expectedSign === String(body.sign).toLowerCase(), expectedSign, queryString };
}

async function handlePayoutCallback(req, res) {
  const traceId = req.traceId;
  const timestamp = new Date().toISOString();
  const sourceIP = req.ip || req.connection?.remoteAddress;
  const rawBody = req.body;

  console.log(`\n${SEP}`);
  console.log('  WATCHPAY CALLBACK RECEIVED');
  console.log(SEP);
  console.log(`  TraceId   : ${traceId}`);
  console.log(`  Timestamp : ${timestamp}`);
  console.log(`  SourceIP  : ${sourceIP}`);
  console.log(`  RawBody   : ${JSON.stringify(rawBody)}`);
  console.log(`${SEP}\n`);

  payoutWebhookLogger.info('WatchPay callback incoming', {
    timestamp,
    traceId,
    sourceIP,
    headers: JSON.stringify(req.headers),
    rawBody: JSON.stringify(rawBody),
  });

  if (!rawBody || !rawBody.mch_transferId || !rawBody.sign) {
    payoutErrorLogger.error('WatchPay callback missing required fields', {
      traceId,
      timestamp,
      sourceIP,
      rawBody,
    });
    console.error(`[WATCHPAY CALLBACK ERROR] Missing required fields: mch_transferId or sign`);
    return res.status(400).send('FAIL');
  }

  let config;
  try {
    config = getConfig();
  } catch (err) {
    systemErrorLogger.error('Config error in WatchPay callback', { traceId, error: err.message });
    return res.status(500).send('FAIL');
  }

  const { valid, expectedSign, queryString } = verifyCallbackSign(rawBody, config.privateKey);

  console.log(`\n${SEP}`);
  console.log('  WATCHPAY CALLBACK SIGNATURE VERIFY');
  console.log(SEP);
  console.log(`  TraceId      : ${traceId}`);
  console.log(`  MchTransferId: ${rawBody.mch_transferId}`);
  console.log(`  ReceivedSign : ${rawBody.sign}`);
  console.log(`  ExpectedSign : ${expectedSign}`);
  console.log(`  QueryString  : ${queryString}`);
  console.log(`  Result       : ${valid ? 'VALID' : 'INVALID'}`);
  console.log(`${SEP}\n`);

  if (!valid) {
    payoutErrorLogger.error('WatchPay callback invalid signature', {
      timestamp,
      traceId,
      sourceIP,
      mchTransferId: rawBody.mch_transferId,
      receivedSign: rawBody.sign,
      expectedSign,
      queryString,
    });
    return res.status(400).send('FAIL');
  }

  let parsed;
  try {
    parsed = validatePayoutCallback(rawBody);
  } catch (err) {
    payoutErrorLogger.error('WatchPay callback validation failed', {
      timestamp,
      traceId,
      sourceIP,
      rawBody,
      errorMessage: err.message,
      details: err.details,
    });
    return res.status(422).send('FAIL');
  }

  const { mch_transferId, trade_status } = parsed;
  const isDup = isDuplicatePayout(mch_transferId, trade_status);
  const duplicateCheckResult = isDup ? 'DUPLICATE' : 'NEW';

  payoutWebhookLogger.info('WatchPay callback processed', {
    timestamp,
    traceId,
    sourceIP,
    mchTransferId: mch_transferId,
    tradeStatus: trade_status,
    tradeAmount: parsed.transfer_amount,
    receivedSign: rawBody.sign,
    signVerification: 'VALID',
    duplicateCheckResult,
    rawBody: JSON.stringify(rawBody),
    responseReturned: isDup ? 'SUCCESS (duplicate)' : 'SUCCESS',
  });

  printPayoutWebhook({
    traceId,
    timestamp,
    sourceIP,
    mchTransferId: mch_transferId,
    tradeStatus: trade_status,
    duplicateCheckResult,
    rawBody: JSON.stringify(rawBody),
  });

  if (isDup) {
    console.log(`[WATCHPAY CALLBACK] Duplicate callback for mch_transferId: ${mch_transferId}, status: ${trade_status} — skipped`);
    return res.status(200).send('SUCCESS');
  }

  markPayoutProcessed(mch_transferId, trade_status);

  const statusStr = String(trade_status).toUpperCase();
  let dbStatus;
  if (statusStr === 'SUCCESS' || statusStr === '1') {
    dbStatus = 1;
  } else if (statusStr === 'FAILED' || statusStr === 'FAIL' || statusStr === '2') {
    dbStatus = 2;
  } else {
    dbStatus = 0;
  }

  console.log(`\n${SEP}`);
  console.log('  WATCHPAY CALLBACK — DB UPDATE');
  console.log(SEP);
  console.log(`  TraceId       : ${traceId}`);
  console.log(`  MchTransferId : ${mch_transferId}`);
  console.log(`  TradeStatus   : ${trade_status}`);
  console.log(`  DBStatus      : ${dbStatus}`);
  console.log(`  Amount        : ${parsed.transfer_amount}`);
  console.log(`  ErrorMsg      : ${parsed.error_msg || 'N/A'}`);
  console.log(`${SEP}\n`);

  try {
    await updateWithdrawlStatusByTradeNo(mch_transferId, dbStatus);
    payoutWebhookLogger.info('Withdrawl status updated via callback', {
      traceId,
      mchTransferId: mch_transferId,
      dbStatus,
    });
    console.log(`[WATCHPAY CALLBACK] DB updated: mch_transferId=${mch_transferId}, dbStatus=${dbStatus}`);
  } catch (dbErr) {
    payoutErrorLogger.error('Failed to update withdrawl status via callback', {
      traceId,
      mchTransferId: mch_transferId,
      dbStatus,
      error: dbErr.message,
    });
    console.error(`[WATCHPAY CALLBACK DB ERROR] mch_transferId=${mch_transferId} | ${dbErr.message}`);
  }

  return res.status(200).send('SUCCESS');
}

router.post('/payout', handlePayoutCallback);

module.exports = router;
