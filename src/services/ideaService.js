const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

class IdeaService {
  async createIdea(userId, description, evaluation) {
    const idea = await db.Idea.create({
      userId,
      title: evaluation.title || description.split(' ').slice(0, 5).join(' ') + '...', // Generate title
      description,
      category: evaluation.category,
      alignmentScore: evaluation.alignmentScore,
      alignmentReasoning: evaluation.alignmentReasoning,
      priority: evaluation.priority,
      status: evaluation.status || 'pending',
      sponsorSuggestion: evaluation.sponsorSuggestion,
      sponsorReasoning: evaluation.sponsorReasoning,
      feedback: evaluation.feedback,
      qualityRating: evaluation.qualityRating
    });

    // Update user stats
    const user = await db.User.findByPk(userId);
    const totalIdeas = user.totalIdeas + 1;
    const newAvgQuality = ((user.averageIdeaQuality * user.totalIdeas) + evaluation.qualityRating) / totalIdeas;

    await user.update({
      totalIdeas,
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

    if (!idea) return null;

    return await idea.update({ 
      targetExecutionDate: targetDate,
      followUpStatus: 'scheduled'
    });
  }

  async getIdeasDueForFollowUp() {
    // Return ideas where execution date is TODAY (or past) and follow-up not yet sent
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
    // For Dashboard
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
}

module.exports = new IdeaService();
