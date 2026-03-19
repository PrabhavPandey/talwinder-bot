require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const logger = require('./utils/logger');
const db = require('./models');
const webhooks = require('./api/webhooks');
const dashboard = require('./api/dashboard');
const scheduler = require('./services/scheduler'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve static frontend
app.use(express.static(path.join(__dirname, '../public'))); 

// Routes
app.use('/whatsapp', webhooks);
app.use('/api/dashboard', dashboard);

// Cron trigger for Vercel (since node-cron doesn't work in serverless)
app.get('/api/cron', async (req, res) => {
  // Authentication for cron (can use a secret key)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  logger.info('⏰ Cron API route triggered for daily execution check');
  try {
    await scheduler.checkExecutionFollowUps();
    res.json({ success: true, message: 'Follow-ups checked' });
  } catch (error) {
    logger.error('Error in cron API route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public/dashboard.html'));
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

// Initial Database connection/sync
async function initializeApp() {
  try {
    await db.sequelize.authenticate();
    logger.info('✅ Database connected');

    // Only sync if SYNC_DB is true or if not on Vercel and it's a fresh start
    // This speeds up local development Significantly.
    if (process.env.SYNC_DB === 'true') {
      await db.sequelize.sync({ alter: true });
      logger.info('✅ Database synced successfully');
    }

    // Only run scheduler's internal loop if NOT on Vercel
    if (!process.env.VERCEL) {
      scheduler.init();
      logger.info('✅ Local node-cron initialized');
    }

    return true;
  } catch (error) {
    logger.error('❌ Initialization failed:', error);
    return false;
  }
}

// For local development
if (!process.env.VERCEL) {
  initializeApp().then((ok) => {
    if (ok) {
      app.listen(PORT, () => {
        logger.info(`🚀 Talwinder Bot is running on port ${PORT}`);
      });
    }
  });
} else {
  // On Vercel, we initialize lazily but keep the promise
  // This ensures the DB is connected before handling requests
  let isInitialized = false;
  app.use(async (req, res, next) => {
    if (!isInitialized) {
      isInitialized = await initializeApp();
    }
    next();
  });
}

// Export for Vercel serverless functions
module.exports = app;
