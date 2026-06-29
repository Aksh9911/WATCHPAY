'use strict';

const payoutCache = new Map();

const TTL_MS = 24 * 60 * 60 * 1000;

function buildKey(mchTransferId, tradeStatus) {
  return `${mchTransferId}:${tradeStatus}`;
}

function isDuplicatePayout(mchTransferId, tradeStatus) {
  const key = buildKey(mchTransferId, tradeStatus);
  const entry = payoutCache.get(key);
  if (entry && Date.now() - entry.timestamp < TTL_MS) {
    return true;
  }
  return false;
}

function markPayoutProcessed(mchTransferId, tradeStatus) {
  const key = buildKey(mchTransferId, tradeStatus);
  payoutCache.set(key, { timestamp: Date.now() });
}

function getPayoutCacheSize() {
  return payoutCache.size;
}

module.exports = {
  isDuplicatePayout,
  markPayoutProcessed,
  getPayoutCacheSize,
};
