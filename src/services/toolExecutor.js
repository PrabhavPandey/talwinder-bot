const ideaService = require('./ideaService');
const logger = require('../utils/logger');
const db = require('../models');
const metaClient = require('../utils/metaClient');

class ToolExecutor {
  async executeTool(name, input, context) {
    const { user, messageId, phoneNumber } = context;

    try {
      switch (name) {
        case 'send_reaction':
          if (!messageId) {
            return { success: false, error: "No messageId available to react to." };
          }
          // Use user's phone number if available in context, otherwise try to fetch from user object
          const recipientPhone = phoneNumber || user.phoneNumber;
          if (!recipientPhone) {
             return { success: false, error: "No phone number available for reaction." };
          }
          
          await metaClient.reactToMessage(recipientPhone, messageId, input.emoji);
          return { success: true, reacted: input.emoji };

        case 'google_search':
          // Placeholder for Google Search - would require SERP API key
          logger.info(`🔍 Mock Search Query: ${input.query}`);
          return {
            success: true,
            results: [
              { title: "Market Trend Report 2025", snippet: "The market is shifting towards AI-driven productivity tools..." },
              { title: "Competitor Analysis", snippet: "Key competitors include..." }
            ],
            note: "Real Google Search requires an API key (e.g., Serper/Google). Using mock data."
          };

        case 'remember_fact':
          const memoryService = require('./memoryService');
          await memoryService.addFact(user.id, input.fact, input.category);
          return { success: true, message: "Fact remembered." };

        case 'submit_idea':
          const idea = await ideaService.createIdea(user.id, input.description, input);
          return {
            success: true,
            message: "Idea submitted successfully!",
            idea: {
              id: idea.id,
              status: idea.status,
              sponsor: idea.sponsorSuggestion,
              category: idea.category,
              priority: idea.priority
            },
            nextStep: "Ask user for execution date if status is sponsored or evaluating."
          };

        case 'set_execution_date':
          const result = await ideaService.setExecutionDate(input.ideaId, user.id, input.targetDate);
          if (result) {
            return {
              success: true,
              message: `Execution date set for ${result.targetExecutionDate}. I will follow up at 11 AM on that day.`,
              ideaId: result.id
            };
          } else {
            return { success: false, error: "Could not find a recent approved idea to schedule." };
          }

        case 'get_my_ideas':
          const ideas = await ideaService.getUserIdeas(user.id);
          return {
            success: true,
            ideas: ideas.map(i => ({
              description: i.description.substring(0, 50) + "...",
              status: i.status,
              date: i.createdAt
            }))
          };

        case 'get_user_stats':
          return {
            success: true,
            stats: {
              totalIdeas: user.totalIdeas,
              averageQuality: user.averageIdeaQuality.toFixed(1),
              frequency: user.ideaFrequencyGrade
            }
          };

        default:
          return { success: false, error: `Tool ${name} not found` };
      }
    } catch (error) {
      logger.error(`Error executing tool ${name}:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ToolExecutor();
