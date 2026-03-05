const ideaService = require('./ideaService');
const logger = require('../utils/logger');
const metaClient = require('../utils/metaClient');

class ToolExecutor {
  constructor() {
    // Temporarily store image context from the same incoming message batch
    this._pendingImageBase64 = null;
  }

  setPendingImage(base64) {
    this._pendingImageBase64 = base64;
  }

  clearPendingImage() {
    this._pendingImageBase64 = null;
  }

  async executeTool(name, input, context) {
    const { user, messageId, phoneNumber } = context;

    try {
      switch (name) {
        case 'capture_raw_idea': {
          const rawIdea = await ideaService.captureRawIdea(user.id, input.rawDescription);
          return { success: true, message: "raw idea captured.", ideaId: rawIdea.id };
        }

        case 'submit_idea': {
          const ideaData = {
            rawDescription: input.rawDescription,
            refinedDescription: input.refinedDescription,
            imageContext: input.imageContext || null,
            imageBase64: this._pendingImageBase64 || null,
            category: input.category
          };

          const idea = await ideaService.createIdea(user.id, ideaData);

          // Clear image once consumed
          this.clearPendingImage();

          return {
            success: true,
            message: "idea locked in.",
            ideaId: idea.id
          };
        }

        case 'send_reaction': {
          if (messageId && phoneNumber) {
            await metaClient.reactToMessage(phoneNumber, messageId, input.emoji);
            return { success: true, message: `reacted with ${input.emoji}` };
          }
          return { success: false, error: "missing messageId for reaction" };
        }

        case 'set_user_name': {
          await user.update({ name: input.name });
          return { success: true, message: `name updated to ${input.name}` };
        }

        case 'get_my_ideas': {
          const ideas = await ideaService.getUserIdeas(user.id);
          return {
            success: true,
            ideas: ideas.map(i => ({
              description: (i.refinedDescription || i.rawDescription || "").substring(0, 100) + "...",
              status: i.status,
              date: i.createdAt
            }))
          };
        }

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
