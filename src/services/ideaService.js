const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

class IdeaService {
  async createIdea(userId, description, evaluation) {
    // Calculate overall quality as average of 3 scores
    const novelty = evaluation.noveltyScore || 0;
    const utility = evaluation.utilityScore || 0;
    const charter = evaluation.charterAlignmentScore || 0;
    const overallQuality = Math.round((novelty + utility + charter) / 3);

    const idea = await db.Idea.create({
      userId,
      title: evaluation.title || description.split(' ').slice(0, 8).join(' ') + '...',
      description,
      category: evaluation.category,
      // New 3-dimensional scoring
      noveltyScore: novelty,
      utilityScore: utility,
      charterAlignmentScore: charter,
      qualityRating: overallQuality,
      // Legacy (compute from new scores)
      alignmentScore: charter * 2, // Map 1-5 to 2-10
      alignmentReasoning: evaluation.alignmentReasoning || evaluation.feedback || '',
      priority: evaluation.priority || 'medium',
      status: evaluation.status || 'evaluating',
      sponsorSuggestion: evaluation.sponsorSuggestion,
      sponsorReasoning: evaluation.sponsorReasoning,
      feedback: evaluation.feedback,
      // Execution
      executor: evaluation.executor || null,
      executorType: evaluation.executorType || 'tbd'
    });

    // Update user stats
    const user = await db.User.findByPk(userId);
    const totalIdeas = user.totalIdeas + 1;
    const newAvgQuality = ((user.averageIdeaQuality * user.totalIdeas) + overallQuality) / totalIdeas;

    await user.update({
      totalIdeas,
      averageIdeaQuality: newAvgQuality,
      lastInteraction: new Date()
    });

    return idea;
  }

  async getUserIdeas(userId, limit = 10) {
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
      // Find the most recent idea (any status except rejected)
      idea = await db.Idea.findOne({
        where: {
          userId,
          status: { [Op.notIn]: ['rejected'] }
        },
        order: [['createdAt', 'DESC']]
      });
    }

    if (!idea) return null;

    return await idea.update({
      targetExecutionDate: targetDate,
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
    if (filters.userId) where.userId = filters.userId;
    if (filters.priority) where.priority = filters.priority;
    if (filters.executorType) where.executorType = filters.executorType;

    // Score filters
    if (filters.minNovelty) {
      where.noveltyScore = { [Op.gte]: parseInt(filters.minNovelty) };
    }
    if (filters.minUtility) {
      where.utilityScore = { [Op.gte]: parseInt(filters.minUtility) };
    }
    if (filters.minAlignment) {
      where.charterAlignmentScore = { [Op.gte]: parseInt(filters.minAlignment) };
    }

    return await db.Idea.findAll({
      where,
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['id', 'name', 'phoneNumber']
      }],
      order: [['createdAt', 'DESC']]
    });
  }

  async getStats() {
    const totalIdeas = await db.Idea.count();
    const statusCounts = await db.Idea.findAll({
      attributes: ['status', [db.sequelize.fn('COUNT', db.sequelize.col('status')), 'count']],
      group: ['status'],
      raw: true
    });
    const categoryCounts = await db.Idea.findAll({
      attributes: ['category', [db.sequelize.fn('COUNT', db.sequelize.col('category')), 'count']],
      group: ['category'],
      raw: true
    });
    const avgScores = await db.Idea.findOne({
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('novelty_score')), 'avgNovelty'],
        [db.sequelize.fn('AVG', db.sequelize.col('utility_score')), 'avgUtility'],
        [db.sequelize.fn('AVG', db.sequelize.col('charter_alignment_score')), 'avgAlignment'],
        [db.sequelize.fn('AVG', db.sequelize.col('quality_rating')), 'avgOverall']
      ],
      raw: true
    });

    // User-level stats
    const userStats = await db.Idea.findAll({
      attributes: [
        'userId',
        [db.sequelize.fn('COUNT', db.sequelize.col('Idea.id')), 'ideaCount'],
        [db.sequelize.fn('AVG', db.sequelize.col('quality_rating')), 'avgQuality']
      ],
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['name', 'phoneNumber']
      }],
      group: ['Idea.userId', 'user.id'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('Idea.id')), 'DESC']],
      raw: true,
      nest: true
    });

    // Ideas with follow-ups due
    const pendingFollowUps = await db.Idea.count({
      where: { followUpStatus: 'scheduled' }
    });

    return {
      total: totalIdeas,
      byStatus: statusCounts.reduce((acc, s) => { acc[s.status] = parseInt(s.count); return acc; }, {}),
      byCategory: categoryCounts.reduce((acc, c) => { acc[c.category] = parseInt(c.count); return acc; }, {}),
      avgScores: {
        novelty: parseFloat(avgScores?.avgNovelty || 0).toFixed(1),
        utility: parseFloat(avgScores?.avgUtility || 0).toFixed(1),
        alignment: parseFloat(avgScores?.avgAlignment || 0).toFixed(1),
        overall: parseFloat(avgScores?.avgOverall || 0).toFixed(1)
      },
      userLeaderboard: userStats,
      pendingFollowUps
    };
  }
}

module.exports = new IdeaService();
