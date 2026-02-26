require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const logger = require('./utils/logger');
const db = require('./models');
const webhooks = require('./api/webhooks');
const dashboard = require('./api/dashboard');
const scheduler = require('./services/scheduler'); // Load scheduler

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../public'))); // Serve static frontend

// Routes
app.use('/whatsapp', webhooks); // Changed from /webhooks to /whatsapp
app.use('/api/dashboard', dashboard);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Health Check
app.get('/health', async (req, res) => {
  const { checkDatabaseHealth } = require('./utils/database');
  const dbHealth = await checkDatabaseHealth();
  res.json({
    status: dbHealth.status === 'healthy' ? 'UP' : 'DOWN',
    database: dbHealth,
    uptime: process.uptime()
  });
});

// Start Server
async function startServer() {
  try {
    // Sync Database
    await db.sequelize.authenticate();
    logger.info('✅ Database connected successfully');
    
    // Init Scheduler
    scheduler.init();
    logger.info('✅ Scheduler started');

    app.listen(PORT, () => {
      logger.info(`🚀 Talwinder Bot is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('❌ Unable to start server:', error);
    process.exit(1);
  }
}

startServer();
