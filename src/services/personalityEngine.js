const db = require('../models');

class PersonalityEngine {
  enforceLowercase(text) {
    if (!text) return '';
    return text.toLowerCase();
  }

  async getConversationHistory(userId, limit = 25) {
    const conversations = await db.Conversation.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });

    return conversations.reverse().map(c => ({
      role: c.messageType === 'incoming' ? 'user' : 'assistant',
      content: c.content
    }));
  }
}

module.exports = new PersonalityEngine();
