const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB_NAME || 'retailshop';
let client;
let database;

async function initializePool() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required. Add your MongoDB Atlas connection string to the environment.');
  }

  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    database = client.db(mongoDbName);
    await database.command({ ping: 1 });
    console.log(`✅ MongoDB Atlas connected (database: ${mongoDbName})`);
  } catch (err) {
    console.error('❌ Failed to initialize MongoDB connection:', err.message);
    throw err;
  }
}

function getDb() {
  if (!database) {
    throw new Error('MongoDB is not connected.');
  }
  return database;
}

async function closePool() {
  if (client) await client.close();
  client = undefined;
  database = undefined;
}

module.exports = {
  initializePool,
  getDb,
  closePool
};
