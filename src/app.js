'use strict';

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const traceIdMiddleware = require('./middleware/traceId');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const watchpayRoutes = require('./routes/watchpay.routes');
const webhookRoutes = require('./webhooks/watchpay.webhook');

app.use(traceIdMiddleware);
app.use(requestLogger);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'watchpay-gateway',
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
  });
});

app.use('/api/watchpay', watchpayRoutes);
app.use('/webhooks/watchpay', webhookRoutes);

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    traceId: req.traceId,
  });
});

app.use(errorHandler);

module.exports = app;
