const db = require('../models');
const logger = require('../utils/logger');

class MemoryService {
  async getMemoryContext(userId) {
    const memory = await db.UserMemory.findOne({ where: { userId } });
    if (!memory || !memory.facts || memory.facts.length === 0) return '';

    return `Facts about user:\n${memory.facts.map(f => `- [${f.category}] ${f.fact}`).join('\n')}`;
  }

  async addFact(userId, fact, category = 'general') {
    try {
      let memory = await db.UserMemory.findOne({ where: { userId } });
      
      if (!memory) {
        memory = await db.UserMemory.create({
          userId,
          facts: []
        });
      }

      const facts = memory.facts || [];
      facts.push({ fact, category, timestamp: new Date() });
      
      // Limit to 50 facts
      if (facts.length > 50) facts.shift();

      await memory.update({ facts });
      logger.info('🧠 Fact remembered:', { userId, fact, category });
      return true;
    } catch (error) {
      logger.error('Error adding fact:', error);
      return false;
    }
  }

  async updateMemoryFromConversation(userId, message, intent, entities) {
    // Logic to extract facts can be added here
    logger.debug('Memory update requested for user', { userId });
  }
}

module.exports = new MemoryService();
