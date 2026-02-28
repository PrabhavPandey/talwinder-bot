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
          const recipientPhone = phoneNumber || user.phoneNumber;
          if (!recipientPhone) {
            return { success: false, error: "No phone number available for reaction." };
          }

          await metaClient.reactToMessage(recipientPhone, messageId, input.emoji);
          return { success: true, reacted: input.emoji };

        case 'google_search':
          // Placeholder for Google Search - requires SERP API key
          logger.info(`Mock Search Query: ${input.query}`);
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
          const idea = await ideaService.createIdea(user.id, input.description, {
            category: input.category,
            noveltyScore: input.noveltyScore,
            utilityScore: input.utilityScore,
            charterAlignmentScore: input.charterAlignmentScore,
            feedback: input.feedback,
            executor: input.executor,
            executorType: input.executorType,
            priority: input.priority,
            status: input.status,
            sponsorSuggestion: input.sponsorSuggestion,
            // Legacy fields computed from new scores
            alignmentScore: (input.charterAlignmentScore || 0) * 2,
            qualityRating: Math.round(
              ((input.noveltyScore || 0) + (input.utilityScore || 0) + (input.charterAlignmentScore || 0)) / 3
            )
          });

          return {
            success: true,
            message: "Idea submitted and scored.",
            idea: {
              id: idea.id,
              status: idea.status,
              category: idea.category,
              priority: idea.priority,
              scores: {
                novelty: idea.noveltyScore,
                utility: idea.utilityScore,
                alignment: idea.charterAlignmentScore,
                overall: idea.qualityRating
              },
              executor: idea.executor,
              executorType: idea.executorType
            },
            nextSteps: [
              idea.executorType === 'tbd' ? "Ask who will execute this idea." : null,
              !idea.targetExecutionDate ? "Ask for a follow-up date." : null
            ].filter(Boolean)
          };

        case 'set_execution_date':
          const result = await ideaService.setExecutionDate(input.ideaId, user.id, input.targetDate);
          if (result) {
            return {
              success: true,
              message: `Follow-up date locked for ${result.targetExecutionDate}. Will check back at 11 AM on that day.`,
              ideaId: result.id
            };
          } else {
            return { success: false, error: "Could not find a recent idea to schedule. Ask user to share one first." };
          }

        case 'get_my_ideas':
          const ideas = await ideaService.getUserIdeas(user.id);
          if (ideas.length === 0) {
            return { success: true, ideas: [], message: "No ideas submitted yet." };
          }
          return {
            success: true,
            ideas: ideas.map(i => ({
              id: i.id,
              description: i.description.substring(0, 60) + (i.description.length > 60 ? "..." : ""),
              status: i.status,
              scores: {
                novelty: i.noveltyScore,
                utility: i.utilityScore,
                alignment: i.charterAlignmentScore,
                overall: i.qualityRating
              },
              executor: i.executor || 'tbd',
              targetDate: i.targetExecutionDate,
              date: i.createdAt
            }))
          };

        case 'get_user_stats':
          const totalIdeas = user.totalIdeas || 0;
          const avgQuality = user.averageIdeaQuality || 0;
          return {
            success: true,
            stats: {
              totalIdeas,
              averageQuality: avgQuality.toFixed ? avgQuality.toFixed(1) : '0',
              frequency: user.ideaFrequencyGrade || 'N/A'
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
