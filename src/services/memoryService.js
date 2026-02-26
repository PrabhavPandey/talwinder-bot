const db = require('../models');
const logger = require('../utils/logger');

class MemoryService {
  async getMemoryContext(userId) {
    const memory = await db.UserMemory.findOne({ where: { userId } });
    if (!memory) return '';

    let context = `Facts about user:\n${memory.facts.map(f => `- ${f.fact}`).join('\n')}`;
    return context;
  }

  async updateMemoryFromConversation(userId, message, intent, entities) {
    // Logic to extract facts can be added here
    logger.debug('Memory update requested for user', { userId });
  }
}

module.exports = new MemoryService();
