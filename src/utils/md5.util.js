'use strict';

const crypto = require('crypto');

function buildMd5Sign(params, privateKey) {
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

  const sign = crypto.createHash('md5').update(queryString).digest('hex').toLowerCase();

  return { sign, queryString };
}

module.exports = { buildMd5Sign };
