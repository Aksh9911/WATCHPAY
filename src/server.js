'use strict';

require('dotenv').config();

const app = require('./app');
const { appLogger, systemErrorLogger } = require('./utils/logger');

const PORT = process.env.PORT || 3003;
const NODE_ENV = process.env.NODE_ENV || 'development';

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message);
  console.error(err.stack);
  systemErrorLogger.error('Uncaught exception', {
    errorType: 'UncaughtException',
    errorMessage: err.message,
    stackTrace: err.stack,
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  systemErrorLogger.error('Unhandled promise rejection', {
    errorType: 'UnhandledRejection',
    errorMessage: reason instanceof Error ? reason.message : String(reason),
    stackTrace: reason instanceof Error ? reason.stack : null,
    timestamp: new Date().toISOString(),
  });
});

async function start() {
  try {
    const { getConfig } = require('./config/watchpay.config');
    getConfig();

    const { testConnection } = require('./config/db.config');
    await testConnection();

    const server = app.listen(PORT, () => {
      appLogger.info(`WatchPay Gateway started`, {
        port: PORT,
        env: NODE_ENV,
        timestamp: new Date().toISOString(),
      });

      const SEP = '====================================';
      console.log(`\n${SEP}`);
      console.log('  WATCHPAY GATEWAY STARTED');
      console.log(SEP);
      console.log(`  Port        : ${PORT}`);
      console.log(`  Environment : ${NODE_ENV}`);
      console.log(`  Health      : http://localhost:${PORT}/health`);
      console.log(SEP);
      console.log('  PAYOUT ENDPOINT');
      console.log(`    POST /api/watchpay/payout/create`);
      console.log(SEP);
      console.log('  CALLBACK ENDPOINT');
      console.log(`    POST /webhooks/watchpay/payout`);
      console.log(`${SEP}\n`);
    });

    const shutdown = async (signal) => {
      appLogger.info(`Received ${signal}. Graceful shutdown initiated.`);
      server.close(() => {
        appLogger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    systemErrorLogger.error('Failed to start server', {
      errorType: 'StartupError',
      errorMessage: err.message,
      stackTrace: err.stack,
      timestamp: new Date().toISOString(),
    });
    console.error(`\n[FATAL] Server failed to start: ${err.message}\n`);
    process.exit(1);
  }
}

start();
