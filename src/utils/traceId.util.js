'use strict';

function generateTraceId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const random = Math.floor(100000000 + Math.random() * 900000000);
  return `WP-${dateStr}-${random}`;
}

module.exports = { generateTraceId };
