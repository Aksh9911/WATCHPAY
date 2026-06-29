'use strict';

const axios = require('axios');
const { getConfig } = require('../config/watchpay.config');
const { insertWithdrawl } = require('../models/withdrawl.model');
const { buildMd5Sign } = require('../utils/md5.util');
const { generateTradeNo } = require('../utils/tradeNo.util');
const { maskSensitiveData } = require('../utils/mask.util');
const {
  appLogger,
  payoutRequestLogger,
  payoutResponseLogger,
  payoutErrorLogger,
  systemErrorLogger,
  printPayoutRequest,
  printPayoutResponse,
} = require('../utils/logger');

const SEP = '====================================';

async function createPayout(input, traceId) {
  const config = getConfig();

  const applyDate = new Date()
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  const mchTransferId = generateTradeNo();
  const bankCode = config.bankCode;
  const notifyUrl = config.notifyUrl;

  const params = {
    apply_date: applyDate,
    bank_code: bankCode,
    mch_id: config.merchantId,
    mch_transferId: mchTransferId,
    receive_account: input.accountNumber,
    receive_name: input.accountHolder,
    remark: input.ifscCode,
    transfer_amount: String(input.amount),
    back_url: notifyUrl,
  };

  const { sign, queryString } = buildMd5Sign(params, config.privateKey);

  const requestBody = {
    ...params,
    sign,
    sign_type: 'MD5',
  };

  const endpoint = config.endpoints.payoutCreate;
  const url = `${config.baseUrl}${endpoint}`;
  const timestamp = new Date().toISOString();

  const maskedParams = maskSensitiveData({ ...params });

  payoutRequestLogger.info('WatchPay payout request', {
    timestamp,
    traceId,
    withdrawId: input.withdrawId,
    mchTransferId,
    amount: input.amount,
    endpoint,
    url,
    params: maskedParams,
    generatedSign: sign,
    queryString,
  });

  printPayoutRequest({
    traceId,
    timestamp,
    endpoint,
    withdrawId: input.withdrawId,
    mchTransferId,
    amount: input.amount,
    accountNumber: maskSensitiveData({ v: input.accountNumber }).v,
    accountName: input.accountHolder,
    ifsc: input.ifscCode,
    bankCode,
    generatedSign: sign,
    queryString,
  });

  console.log(`\n${SEP}`);
  console.log('  WATCHPAY API REQUEST');
  console.log(SEP);
  console.log(`  TraceId       : ${traceId}`);
  console.log(`  URL           : POST ${url}`);
  console.log(`  WithdrawId    : ${input.withdrawId}`);
  console.log(`  MchTransferId : ${mchTransferId}`);
  console.log(`  Amount        : ${input.amount}`);
  console.log(`  AccountNumber : ${maskSensitiveData({ v: input.accountNumber }).v}`);
  console.log(`  AccountHolder : ${input.accountHolder}`);
  console.log(`  IFSC          : ${input.ifscCode}`);
  console.log(`  BankCode      : ${bankCode}`);
  console.log(`  Sign          : ${sign}`);
  console.log(`${SEP}\n`);

  const startTime = Date.now();
  let axiosResponse;

  try {
    axiosResponse = await axios.post(url, new URLSearchParams(requestBody).toString(), {
      timeout: config.timeoutMs,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch (axiosErr) {
    const isTimeout = axiosErr.code === 'ECONNABORTED' || axiosErr.message.includes('timeout');
    const errorResponseData = axiosErr.response?.data || null;
    const httpStatus = axiosErr.response?.status || null;

    console.error(`\n${SEP}`);
    console.error('  WATCHPAY API ERROR RESPONSE');
    console.error(SEP);
    console.error(`  TraceId    : ${traceId}`);
    console.error(`  Endpoint   : ${endpoint}`);
    console.error(`  HttpStatus : ${httpStatus}`);
    console.error(`  Error      : ${axiosErr.message}`);
    console.error(`  RawResp    : ${JSON.stringify(errorResponseData)}`);
    console.error(`${SEP}\n`);

    const errEntry = {
      timestamp: new Date().toISOString(),
      traceId,
      module: 'PAYOUT',
      endpoint,
      withdrawId: input.withdrawId,
      mchTransferId,
      errorType: isTimeout ? 'REMOTE_TIMEOUT' : 'REMOTE_API_ERROR',
      errorMessage: axiosErr.message,
      stackTrace: axiosErr.stack,
      responsePayload: errorResponseData,
      httpStatus,
    };
    payoutErrorLogger.error('WatchPay payout request failed', errEntry);
    systemErrorLogger.error('API call failed', errEntry);

    const err = new Error(isTimeout ? `Request timeout: ${endpoint}` : `Remote API call failed: ${axiosErr.message}`);
    err.code = isTimeout ? 'REMOTE_TIMEOUT' : 'REMOTE_API_ERROR';
    err.original = axiosErr;
    throw err;
  }

  const processingTime = Date.now() - startTime;
  const responseData = axiosResponse.data;

  console.log(`\n${SEP}`);
  console.log('  WATCHPAY RAW RESPONSE DATA');
  console.log(SEP);
  console.log(`  TraceId       : ${traceId}`);
  console.log(`  MchTransferId : ${mchTransferId}`);
  console.log(`  HttpStatus    : ${axiosResponse.status}`);
  console.log(`  RawData       : ${JSON.stringify(responseData)}`);
  console.log(`  ProcessingTime: ${processingTime}ms`);
  console.log(`${SEP}\n`);

  let status;
  let tradeResult = null;

  if (responseData.respCode === 'SUCCESS') {
    tradeResult = String(responseData.tradeResult);
    if (tradeResult === '1') {
      status = 'success';
    } else if (tradeResult === '2') {
      status = 'failed';
    } else {
      status = 'processing';
    }
  } else {
    status = 'failed';
  }

  const resLogEntry = {
    timestamp: new Date().toISOString(),
    traceId,
    withdrawId: input.withdrawId,
    mchTransferId,
    httpStatus: axiosResponse.status,
    respCode: responseData.respCode,
    tradeResult,
    status,
    errorMsg: responseData.errorMsg || null,
    processingTime,
    rawResponse: JSON.stringify(responseData),
  };

  payoutResponseLogger.info('WatchPay payout response', resLogEntry);

  if (responseData.respCode === 'SUCCESS') {
    try {
      await insertWithdrawl({
        withdrawId: input.withdrawId,
        tradeNo: mchTransferId,
      });
      console.log(`\n${SEP}`);
      console.log('  WITHDRAWL TABLE INSERT SUCCESS');
      console.log(SEP);
      console.log(`  TraceId       : ${traceId}`);
      console.log(`  WithdrawId    : ${input.withdrawId}`);
      console.log(`  MchTransferId : ${mchTransferId}  →  stored in morder_id`);
      console.log(`  RespCode      : ${responseData.respCode}`);
      console.log(`  Timestamp     : ${new Date().toISOString()}`);
      console.log(`${SEP}\n`);
      appLogger.info('Withdrawl record inserted after successful API call', {
        traceId,
        withdrawId: input.withdrawId,
        mchTransferId,
        table: 'withdrawl',
        column: 'morder_id',
      });
    } catch (dbErr) {
      console.error(`[DB ERROR] Withdrawl insert failed for WithdrawId: ${input.withdrawId} | ${dbErr.message}`);
      appLogger.error('DB insert failed after API call', {
        traceId,
        withdrawId: input.withdrawId,
        mchTransferId,
        error: dbErr.message,
      });
    }
  }

  printPayoutResponse({
    traceId,
    timestamp: resLogEntry.timestamp,
    withdrawId: input.withdrawId,
    mchTransferId,
    httpStatus: axiosResponse.status,
    respCode: responseData.respCode,
    tradeResult,
    status,
    rawResponse: JSON.stringify(responseData),
  });

  return {
    withdrawId: input.withdrawId,
    mchTransferId,
    respCode: responseData.respCode,
    tradeResult,
    status,
    errorMsg: responseData.errorMsg || null,
    rawResponse: responseData,
  };
}

module.exports = { createPayout };
