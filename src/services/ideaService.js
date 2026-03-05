const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

class IdeaService {
  async captureRawIdea(userId, rawDescription) {
    const idea = await db.Idea.create({
      userId,
      rawDescription,
      status: 'evaluating'
    });
    return idea;
  }

  async createIdea(userId, { rawDescription, refinedDescription, imageContext, imageBase64, category }) {
    // Find latest raw idea from this user if it exists and is still in 'evaluating' status
    const existing = await db.Idea.findOne({
      where: { userId, status: 'evaluating' },
      order: [['createdAt', 'DESC']]
    });

    const ideaData = {
      userId,
      rawDescription: rawDescription || refinedDescription,
      refinedDescription: refinedDescription || rawDescription,
      imageContext: imageContext || null,
      imageBase64: imageBase64 || null,
      category: category || 'other',
      status: 'captured'
    };

    let idea;
    if (existing) {
      idea = await existing.update(ideaData);
    } else {
      idea = await db.Idea.create(ideaData);
    }

    // Update user stats
    const user = await db.User.findByPk(userId);
    await user.update({
      totalIdeas: user.totalIdeas + 1,
      lastInteraction: new Date()
    });

    return idea;
  }

  async getUserIdeas(userId, limit = 5) {
    return await db.Idea.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  async getAllIdeas(filters = {}) {
    const where = {};
    if (filters.category) where.category = filters.category;
    if (filters.status) where.status = filters.status;

    return await db.Idea.findAll({
      where,
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['name', 'phoneNumber']
      }],
      order: [['createdAt', 'DESC']]
    });
  }

  async getStats() {
    const totalIdeas = await db.Idea.count();
    const capturedCount = await db.Idea.count({ where: { status: 'captured' } });
    const totalUsersOnboarded = await db.User.count({
      where: { name: { [Op.not]: 'User' } }
    });
    const totalMessages = await db.Conversation.count();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const velocityCount = await db.Idea.count({
      where: { createdAt: { [Op.gte]: sevenDaysAgo } }
    });

    const topContributors = await db.User.findAll({
      where: { name: { [Op.not]: 'User' } },
      attributes: ['name', 'totalIdeas'],
      order: [['totalIdeas', 'DESC']],
      limit: 5
    });

    const categories = await db.Idea.findAll({
      attributes: ['category', [db.sequelize.fn('COUNT', db.sequelize.col('category')), 'count']],
      group: ['category']
    });

    return {
      total: totalIdeas,
      captured: capturedCount,
      usersOnboarded: totalUsersOnboarded,
      messages: totalMessages,
      velocity: velocityCount,
      topContributors,
      categories
    };
  }

  async getReport() {
    const ideas = await db.Idea.findAll({
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['name', 'phoneNumber']
      }],
      order: [['createdAt', 'DESC']]
    });

    return {
      generatedAt: new Date(),
      count: ideas.length,
      ideas: ideas.map(i => ({
        id: i.id,
        user: i.user?.name || 'Unknown',
        rawDescription: i.rawDescription,
        refinedDescription: i.refinedDescription,
        imageContext: i.imageContext,
        hasImage: !!i.imageBase64,
        category: i.category,
        status: i.status,
        createdAt: i.createdAt
      }))
    };
  }
}

module.exports = new IdeaService();
