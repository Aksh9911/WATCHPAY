'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOGS_ROOT = path.join(process.cwd(), 'logs');

const DIRS = [
  path.join(LOGS_ROOT, 'payout'),
  path.join(LOGS_ROOT, 'system'),
];

for (const dir of DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`)
);

function createDailyTransport(filePath, level = 'debug') {
  return new DailyRotateFile({
    filename: filePath,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxFiles: '30d',
    level,
    format: jsonFormat,
  });
}

const payoutRequestLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'payout', 'payout-requests-%DATE%.log')),
  ],
});

const payoutResponseLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'payout', 'payout-responses-%DATE%.log')),
  ],
});

const payoutWebhookLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'payout', 'payout-webhooks-%DATE%.log')),
  ],
});

const payoutErrorLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'payout', 'payout-errors-%DATE%.log'), 'error'),
  ],
});

const appLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'system', 'application-%DATE%.log')),
    new winston.transports.Console({ format: consoleFormat }),
  ],
});

const systemErrorLogger = winston.createLogger({
  level: 'error',
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'system', 'errors-%DATE%.log'), 'error'),
    new winston.transports.Console({ format: consoleFormat }),
  ],
});

const SEP = '====================================';

function printPayoutRequest(ctx) {
  const lines = [
    SEP,
    'WATCHPAY PAYOUT REQUEST',
    SEP,
    `TraceId        : ${ctx.traceId}`,
    `Timestamp      : ${ctx.timestamp}`,
    `Endpoint       : ${ctx.endpoint}`,
    `WithdrawId     : ${ctx.withdrawId}`,
    `MchTransferId  : ${ctx.mchTransferId}`,
    `Amount         : ${ctx.amount}`,
    `AccountNumber  : ${ctx.accountNumber}`,
    `AccountName    : ${ctx.accountName}`,
    `IFSC           : ${ctx.ifsc}`,
    `BankCode       : ${ctx.bankCode}`,
    `GeneratedSign  : ${ctx.generatedSign}`,
    `QueryString    : ${ctx.queryString}`,
    SEP,
  ];
  appLogger.info(lines.join('\n'));
}

function printPayoutResponse(ctx) {
  const lines = [
    SEP,
    'WATCHPAY PAYOUT RESPONSE',
    SEP,
    `TraceId        : ${ctx.traceId}`,
    `Timestamp      : ${ctx.timestamp}`,
    `WithdrawId     : ${ctx.withdrawId}`,
    `MchTransferId  : ${ctx.mchTransferId}`,
    `HttpStatus     : ${ctx.httpStatus}`,
    `RespCode       : ${ctx.respCode}`,
    `TradeResult    : ${ctx.tradeResult}`,
    `Status         : ${ctx.status}`,
    `RawResponse    : ${ctx.rawResponse}`,
    SEP,
  ];
  appLogger.info(lines.join('\n'));
}

function printPayoutWebhook(ctx) {
  const lines = [
    SEP,
    'WATCHPAY PAYOUT CALLBACK',
    SEP,
    `TraceId             : ${ctx.traceId}`,
    `Timestamp           : ${ctx.timestamp}`,
    `SourceIP            : ${ctx.sourceIP}`,
    `MchTransferId       : ${ctx.mchTransferId}`,
    `TradeStatus         : ${ctx.tradeStatus}`,
    `DuplicateCheckResult: ${ctx.duplicateCheckResult}`,
    `RawBody             : ${ctx.rawBody}`,
    SEP,
  ];
  appLogger.info(lines.join('\n'));
}

function printError(ctx) {
  const lines = [
    SEP,
    'WATCHPAY ERROR',
    SEP,
    `TraceId     : ${ctx.traceId}`,
    `Timestamp   : ${ctx.timestamp}`,
    `Module      : ${ctx.module}`,
    `Endpoint    : ${ctx.endpoint}`,
    `WithdrawId  : ${ctx.withdrawId}`,
    `ErrorType   : ${ctx.errorType}`,
    `ErrorMessage: ${ctx.errorMessage}`,
    SEP,
  ];
  systemErrorLogger.error(lines.join('\n'));
}

module.exports = {
  appLogger,
  systemErrorLogger,
  payoutRequestLogger,
  payoutResponseLogger,
  payoutWebhookLogger,
  payoutErrorLogger,
  printPayoutRequest,
  printPayoutResponse,
  printPayoutWebhook,
  printError,
};
