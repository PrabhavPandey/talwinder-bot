const ideaService = require('./ideaService');
const logger = require('../utils/logger');
const db = require('../models');
const metaClient = require('../utils/metaClient');

class ToolExecutor {
  async executeTool(name, input, context) {
    const { user, messageId, phoneNumber } = context;

    try {
      switch (name) {
        case 'submit_idea':
          // Map scores to service format
          const ideaData = {
            ...input,
            qualityRating: input.utilityScore // Fallback for old code if needed
          };

          const idea = await ideaService.createIdea(user.id, input.description, ideaData);
          return {
            success: true,
            message: "Idea captured and scored.",
            idea: {
              id: idea.id,
              status: idea.status,
              scores: {
                novelty: input.noveltyScore,
                utility: input.utilityScore,
                alignment: input.charterAlignmentScore
              }
            }
          };

        case 'set_execution_date':
          const executionResult = await ideaService.setExecutionDate(null, user.id, input.targetDate);
          if (executionResult) {
            return {
              success: true,
              message: `target date locked for ${executionResult.targetExecutionDate}. i'll check in on that morning.`,
              ideaId: executionResult.id
            };
          } else {
            return { success: false, error: "couldn't find your last idea to set a date for." };
          }

        case 'send_reaction':
          if (messageId && phoneNumber) {
            await metaClient.reactToMessage(phoneNumber, messageId, input.emoji);
            return { success: true, message: `reacted with ${input.emoji}` };
          }
          return { success: false, error: "missing messageId for reaction" };

        case 'set_user_name':
          await user.update({ name: input.name });
          return { success: true, message: `name updated to ${input.name}` };

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
