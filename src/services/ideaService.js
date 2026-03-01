const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

class IdeaService {
  async captureRawIdea(userId, rawDescription) {
    const idea = await db.Idea.create({
      userId,
      title: rawDescription.split(' ').slice(0, 5).join(' ') + '...',
      description: rawDescription, // Use as base
      rawDescription: rawDescription,
      status: 'evaluating'
    });
    return idea;
  }

  async createIdea(userId, description, evaluation) {
    // Check if we have an 'evaluating' idea to update first
    const existing = await db.Idea.findOne({
      where: { userId, status: 'evaluating' },
      order: [['createdAt', 'DESC']]
    });

    const ideaData = {
      userId,
      title: evaluation.title || description.split(' ').slice(0, 5).join(' ') + '...',
      description,
      evolvedDescription: description,
      category: evaluation.category,
      noveltyScore: evaluation.noveltyScore || 0,
      utilityScore: evaluation.utilityScore || 0,
      charterAlignmentScore: evaluation.charterAlignmentScore || 0,
      alignmentReasoning: evaluation.alignmentReasoning,
      executorType: evaluation.executorType || 'user',
      executorDetails: evaluation.executorDetails,
      priority: evaluation.priority,
      status: evaluation.status || 'pending',
      sponsorSuggestion: evaluation.sponsorSuggestion,
      feedback: evaluation.feedback
    };

    let idea;
    if (existing) {
      idea = await existing.update(ideaData);
    } else {
      idea = await db.Idea.create({
        ...ideaData,
        rawDescription: description // If it skipped capture phase
      });
    }

    // Update user stats
    const user = await db.User.findByPk(userId);
    const totalIdeasCount = user.totalIdeas + 1;

    // Simple average of the 3 scores for quality
    const currentQuality = ((evaluation.noveltyScore || 0) + (evaluation.utilityScore || 0) + (evaluation.charterAlignmentScore || 0)) / 3;
    const newAvgQuality = ((user.averageIdeaQuality * user.totalIdeas) + currentQuality) / totalIdeasCount;

    await user.update({
      totalIdeas: totalIdeasCount,
      averageIdeaQuality: newAvgQuality,
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

  async updateIdeaStatus(ideaId, status, feedback) {
    const idea = await db.Idea.findByPk(ideaId);
    if (!idea) return null;

    return await idea.update({ status, feedback });
  }

  async setExecutionDate(ideaId, userId, targetDate) {
    let idea;
    if (ideaId) {
      idea = await db.Idea.findOne({ where: { id: ideaId, userId } });
    } else {
      // Find the most recent 'sponsored' or 'evaluating' idea
      idea = await db.Idea.findOne({
        where: {
          userId,
          status: { [Op.in]: ['sponsored', 'evaluating'] }
        },
        order: [['createdAt', 'DESC']]
      });
    }

    if (!idea) {
      // Try to find ANY most recent idea if none are sponsored/evaluating (user might have just pitched)
      idea = await db.Idea.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });
    }

    if (!idea) return null;

    // Convert natural language date if needed or just save
    return await idea.update({
      targetExecutionDate: targetDate, // Frontend/Service handles conversion if needed
      followUpStatus: 'scheduled'
    });
  }

  async getIdeasDueForFollowUp() {
    const today = new Date().toISOString().split('T')[0];

    return await db.Idea.findAll({
      where: {
        targetExecutionDate: { [Op.lte]: today },
        followUpStatus: 'scheduled'
      },
      include: [{ model: db.User, as: 'user' }]
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
    const sponsoredCount = await db.Idea.count({ where: { status: 'sponsored' } });

    // Onboarded users: name is NOT 'User'
    const totalUsersOnboarded = await db.User.count({
      where: {
        name: { [Op.not]: 'User' }
      }
    });

    // Total messages exchanged
    const totalMessages = await db.Conversation.count();

    // Average Utility
    const avgUtility = await db.Idea.avg('utilityScore');

    // Idea Velocity: Count in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const velocityCount = await db.Idea.count({
      where: {
        createdAt: { [Op.gte]: sevenDaysAgo }
      }
    });

    // Top Contributors
    const topContributors = await db.User.findAll({
      where: {
        name: { [Op.not]: 'User' }
      },
      attributes: ['name', 'totalIdeas', 'averageIdeaQuality'],
      order: [['totalIdeas', 'DESC']],
      limit: 5
    });

    const categories = await db.Idea.findAll({
      attributes: ['category', [db.sequelize.fn('COUNT', db.sequelize.col('category')), 'count']],
      group: ['category']
    });

    return {
      total: totalIdeas,
      sponsored: sponsoredCount,
      usersOnboarded: totalUsersOnboarded,
      messages: totalMessages,
      utility: (avgUtility || 0).toFixed(1),
      velocity: velocityCount,
      successRate: totalIdeas > 0 ? ((sponsoredCount / totalIdeas) * 100).toFixed(0) : 0,
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
      }]
    });

    const priorityMap = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };

    const sortedIdeas = ideas.sort((a, b) => {
      const pA = priorityMap[a.priority] || 0;
      const pB = priorityMap[b.priority] || 0;
      if (pB !== pA) return pB - pA;
      return (b.utilityScore || 0) - (a.utilityScore || 0);
    });

    return {
      generatedAt: new Date(),
      count: sortedIdeas.length,
      metrics: {
        total: sortedIdeas.length,
        avgUtility: (sortedIdeas.reduce((sum, i) => sum + i.utilityScore, 0) / sortedIdeas.length || 0).toFixed(1),
        avgNovelty: (sortedIdeas.reduce((sum, i) => sum + i.noveltyScore, 0) / sortedIdeas.length || 0).toFixed(1)
      },
      ideas: sortedIdeas.map(i => ({
        id: i.id,
        user: i.user?.name || 'Unknown',
        title: i.title,
        description: i.description,
        category: i.category,
        novelty: i.noveltyScore,
        utility: i.utilityScore,
        priority: i.priority,
        status: i.status,
        reasoning: i.alignmentReasoning,
        suggestedSponsor: i.sponsorSuggestion
      }))
    };
  }
}

module.exports = new IdeaService();
