'use strict';

function getConfig() {
  const merchantId = process.env.WATCHPAY_MERCHANT_ID;
  const privateKey = process.env.WATCHPAY_PRIVATE_KEY;
  const baseUrl = process.env.WATCHPAY_BASE_URL;
  const bankCode = process.env.WATCHPAY_BANK_CODE;
  const notifyUrl = process.env.WATCHPAY_NOTIFY_URL;

  if (!merchantId) throw new Error('WATCHPAY_MERCHANT_ID is not set');
  if (!privateKey) throw new Error('WATCHPAY_PRIVATE_KEY is not set');
  if (!baseUrl) throw new Error('WATCHPAY_BASE_URL is not set');
  if (!bankCode) throw new Error('WATCHPAY_BANK_CODE is not set');
  if (!notifyUrl) throw new Error('WATCHPAY_NOTIFY_URL is not set');

  return {
    merchantId,
    privateKey,
    baseUrl,
    bankCode,
    notifyUrl,
    endpoints: {
      payoutCreate: '/pay/transfer',
    },
    timeoutMs: 30000,
  };
}

module.exports = { getConfig };
