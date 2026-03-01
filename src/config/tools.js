const tools = [
  {
    name: "submit_idea",
    description: "Submit a new idea for Grapevine. Use this when the user describes an idea they have. Analyze it deeply against the company charter.",
    input_schema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "The full description of the idea."
        },
        category: {
          type: "string",
          enum: ["growth", "engineering", "product", "org", "culture", "operations", "other"],
          description: "The primary category this idea falls into."
        },
        noveltyScore: {
          type: "integer",
          minimum: 1,
          maximum: 5,
          description: "How original is this idea? (1-5)"
        },
        utilityScore: {
          type: "integer",
          minimum: 1,
          maximum: 5,
          description: "How useful/practical is this idea? (1-5)"
        },
        charterAlignmentScore: {
          type: "integer",
          minimum: 1,
          maximum: 5,
          description: "How well does it align with the Grapevine Company Charter? (1-5)"
        },
        alignmentReasoning: {
          type: "string",
          description: "Detailed reasoning on why it aligns or doesn't."
        },
        executorType: {
          type: "string",
          enum: ["user", "someone_else", "group"],
          description: "Who will be primary on executing this?"
        },
        executorDetails: {
          type: "string",
          description: "Names or groups if known."
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Priority based on alignment and impact."
        },
        status: {
          type: "string",
          enum: ["pending", "evaluating", "sponsored", "not_now", "rejected"],
          description: "Initial status based on your analysis."
        },
        sponsorSuggestion: {
          type: "string",
          description: "Who in the company should sponsor this idea?"
        },
        feedback: {
          type: "string",
          description: "Constructive feedback for the user."
        }
      },
      required: ["description", "category", "noveltyScore", "utilityScore", "charterAlignmentScore", "alignmentReasoning"]
    }
  },
  {
    name: "set_execution_date",
    description: "Set a target date for executing an idea. Use this when the user provides a follow-up date for an idea.",
    input_schema: {
      type: "object",
      properties: {
        targetDate: {
          type: "string",
          description: "The target execution date (YYYY-MM-DD or natural language)."
        }
      },
      required: ["targetDate"]
    }
  },
  {
    name: "send_reaction",
    description: "Add an emoji reaction to the user's message. Use this sparingly to show emotion (hype, agreement, etc).",
    input_schema: {
      type: "object",
      properties: {
        emoji: {
          type: "string",
          description: "The emoji to react with (e.g. '🔥', '🙌', '👀')."
        }
      },
      required: ["emoji"]
    }
  },
  {
    name: "set_user_name",
    description: "Set or update the user's name. Use this during onboarding once the user introduces themselves.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The user's full name or preferred name."
        }
      },
      required: ["name"]
    }
  },
  {
    name: "get_my_ideas",
    description: "Get a list of ideas previously submitted by the user.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  }
];

module.exports = tools;
