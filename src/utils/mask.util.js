'use strict';

function maskAccountNumber(value) {
  if (!value || typeof value !== 'string') return value;
  if (value.length <= 4) return '****';
  return '*'.repeat(value.length - 4) + value.slice(-4);
}

function maskIfsc(value) {
  if (!value || typeof value !== 'string') return value;
  if (value.length <= 4) return '****';
  return value.slice(0, 4) + '*'.repeat(value.length - 4);
}

function maskSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const masked = Array.isArray(obj) ? [] : {};

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const keyLower = key.toLowerCase();

    if (keyLower === 'private_key' || keyLower === 'privatekey' || keyLower === 'key') {
      masked[key] = '[REDACTED]';
    } else if ((keyLower.includes('account') || keyLower.includes('receive_account')) && typeof val === 'string') {
      masked[key] = maskAccountNumber(val);
    } else if ((keyLower.includes('ifsc') || keyLower === 'remark') && typeof val === 'string') {
      masked[key] = maskIfsc(val);
    } else if (val && typeof val === 'object') {
      masked[key] = maskSensitiveData(val);
    } else {
      masked[key] = val;
    }
  }

  return masked;
}

module.exports = { maskAccountNumber, maskIfsc, maskSensitiveData };
