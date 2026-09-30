const oracledb = require('oracledb');
require('dotenv').config();

// Configure default output format to JSON Objects
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/FREEPDB1',
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1
};

let pool;

async function initializePool() {
  try {
    pool = await oracledb.createPool(dbConfig);
    console.log('✅ Oracle Database Connection Pool Initialized (Connected to FREEPDB1)');
  } catch (err) {
    console.error('❌ Failed to initialize Oracle Database Connection Pool:', err.message);
    throw err;
  }
}

async function executeQuery(sql, binds = [], options = {}) {
  let connection;
  try {
    connection = await pool.getConnection();
    const result = await connection.execute(sql, binds, options);
    return result;
  } catch (err) {
    console.error('Oracle Execution Error SQL:', sql);
    console.error('Error Details:', err.message);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing Oracle connection:', err.message);
      }
    }
  }
}

module.exports = {
  initializePool,
  executeQuery,
  oracledb
};
