const db = require('../models');
const logger = require('./logger');

/**
 * Check database health
 * @returns {Promise<Object>} Health status
 */
async function checkDatabaseHealth() {
  try {
    await db.sequelize.authenticate();
    return { status: 'healthy', message: 'Connected' };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return { status: 'unhealthy', message: error.message };
  }
}

module.exports = {
  checkDatabaseHealth
};
