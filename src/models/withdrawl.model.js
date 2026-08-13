'use strict';

const { pool } = require('../config/db.config');
const { appLogger } = require('../utils/logger');

async function insertWithdrawl({ withdrawId, tradeNo }) {
  const sql = `UPDATE withdrawl SET morder_id = ? WHERE id = ?`;
  const params = [tradeNo, withdrawId];

  try {
    const [result] = await pool.execute(sql, params);
    appLogger.info('Withdrawl morder_id updated', { withdrawId, morder_id: tradeNo, affectedRows: result.affectedRows });
    return result;
  } catch (err) {
    appLogger.error('Failed to update withdrawl morder_id', { error: err.message, withdrawId, tradeNo });
    throw err;
  }
}

async function getWithdrawlByWithdrawId(withdrawId) {
  const sql = `SELECT * FROM withdrawl WHERE id = ? LIMIT 1`;
  try {
    const [rows] = await pool.execute(sql, [withdrawId]);
    return rows[0] || null;
  } catch (err) {
    appLogger.error('Failed to fetch withdrawl record', { error: err.message, withdrawId });
    throw err;
  }
}

async function getWithdrawlByMorderId(morderId) {
  const sql = `SELECT * FROM withdrawl WHERE morder_id = ? LIMIT 1`;
  try {
    const [rows] = await pool.execute(sql, [morderId]);
    return rows[0] || null;
  } catch (err) {
    appLogger.error('Failed to fetch withdrawl record by morder_id', { error: err.message, morderId });
    throw err;
  }
}

async function updateWithdrawlStatusByTradeNo(tradeNo, status) {
  const sql =
    Number(status) === 2
      ? `UPDATE withdrawl SET status = ?, rejected_by = 2 WHERE morder_id = ?`
      : `UPDATE withdrawl SET status = ? WHERE morder_id = ?`;
  try {
    const [result] = await pool.execute(sql, [status, tradeNo]);
    appLogger.info('Withdrawl status updated', { tradeNo, status, rejected_by: Number(status) === 2 ? 2 : undefined });
    return result;
  } catch (err) {
    appLogger.error('Failed to update withdrawl status', { error: err.message, tradeNo, status });
    throw err;
  }
}

module.exports = { insertWithdrawl, getWithdrawlByWithdrawId, getWithdrawlByMorderId, updateWithdrawlStatusByTradeNo };
