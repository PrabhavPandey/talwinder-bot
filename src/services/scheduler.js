const cron = require('node-cron');
const db = require('../models');
const { Op } = require('sequelize');
const metaClient = require('../utils/metaClient');
const logger = require('../utils/logger');
const ideaService = require('./ideaService');

class SchedulerService {
  constructor() {
    this.cronSchedule = '0 11 * * *'; // Every day at 11:00 AM
  }

  init() {
    logger.info(`Scheduler initialized: ${this.cronSchedule}`);

    cron.schedule(this.cronSchedule, async () => {
      logger.info('Running daily execution check...');
      await this.checkExecutionFollowUps();
    });
  }

  async checkExecutionFollowUps() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const dueIdeas = await db.Idea.findAll({
        where: {
          targetExecutionDate: { [Op.lte]: today },
          followUpStatus: 'scheduled'
        },
        include: [{ model: db.User, as: 'user' }]
      });

      if (dueIdeas.length === 0) {
        logger.info('No follow-ups due today.');
        return;
      }

      logger.info(`Found ${dueIdeas.length} ideas due for execution follow-up.`);

      for (const idea of dueIdeas) {
        await this.sendFollowUp(idea);
      }

    } catch (error) {
      logger.error('Error in checkExecutionFollowUps:', error);
    }
  }

  async sendFollowUp(idea) {
    const user = idea.user;
    if (!user || !user.phoneNumber) return;

    const userName = (user.name || 'homie').toLowerCase();
    const ideaSnippet = idea.description.substring(0, 50);

    // Talwinder personality: lowercase, no emojis, punchy, hook at end
    const message = 'yo ' + userName + ', today was the day\n\n"' + ideaSnippet + '..."\n\ndid we ship it or what';

    try {
      const result = await metaClient.sendTextMessage(user.phoneNumber, message);

      if (result.success) {
        await idea.update({ followUpStatus: 'sent' });

        await db.Conversation.create({
          userId: user.id,
          messageType: 'outgoing',
          content: message,
          metadata: { type: 'execution_followup', ideaId: idea.id }
        });

        logger.info(`Follow-up sent for idea ${idea.id}`);
      }
    } catch (err) {
      logger.error(`Failed to send follow-up for idea ${idea.id}`, err);
    }
  }
}

module.exports = new SchedulerService();
