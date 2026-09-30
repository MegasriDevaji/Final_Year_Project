const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializePool } = require('./db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api', apiRoutes);

// Catch-all to serve index.html for SPA client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server & Initialize Oracle DB Connection Pool
async function startServer() {
  try {
    console.log('🔄 Connecting to Oracle Database 23c Free Edition...');
    await initializePool();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 RetailShop E-Commerce App Live on http://localhost:${PORT}`);
      console.log(`📊 Connected to Oracle Database 23c (FREEPDB1)`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('❌ Server failed to start due to Oracle DB error:', err);
    process.exit(1);
  }
}

startServer();
