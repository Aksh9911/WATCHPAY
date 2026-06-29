'use strict';

const mysql = require('mysql2/promise');
const { appLogger } = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stake',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    appLogger.info('MySQL connected successfully', { database: process.env.DB_NAME || 'stake' });
    conn.release();
  } catch (err) {
    appLogger.error('MySQL connection failed', { error: err.message });
    throw err;
  }
}

module.exports = { pool, testConnection };
