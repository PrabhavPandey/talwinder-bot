const tools = [
  {
    name: "send_reaction",
    description: "React to a user's message with an emoji to show you are listening/vibing. Use this often for good news, funny moments, or acknowledgment.",
    input_schema: {
      type: "object",
      properties: {
        emoji: {
          type: "string",
          description: "The emoji to react with (e.g., '🔥', '😂', '👍', '❤️', '👀', '🚀')."
        }
      },
      required: ["emoji"]
    }
  },
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
        alignmentScore: {
          type: "number",
          description: "Alignment score with company charter (1-10)."
        },
        alignmentReasoning: {
          type: "string",
          description: "Detailed reasoning on why it aligns or doesn't."
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Priority based on alignment and impact."
        },
        status: {
          type: "string",
          enum: ["pending", "evaluating", "sponsored", "not_now", "rejected"],
          description: "Initial status."
        },
        sponsorSuggestion: {
          type: "string",
          description: "Who in the company should sponsor this idea?"
        },
        sponsorReasoning: {
          type: "string",
          description: "Why this person is the right sponsor."
        },
        feedback: {
          type: "string",
          description: "Constructive feedback for the user."
        },
        qualityRating: {
          type: "number",
          description: "Overall quality rating (1-5)."
        }
      },
      required: ["description", "category", "alignmentScore", "alignmentReasoning", "qualityRating"]
    }
  },
  {
    name: "set_execution_date",
    description: "Set a target date for executing an idea. Use this ONLY when the idea is good (sponsored/evaluating) and the user has committed to a date.",
    input_schema: {
      type: "object",
      properties: {
        ideaId: {
          type: "string",
          description: "The ID of the idea (if known/provided in context) or leave empty if referring to the most recent idea."
        },
        targetDate: {
          type: "string",
          description: "The target execution date (YYYY-MM-DD format)."
        }
      },
      required: ["targetDate"]
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
  },
  {
    name: "get_user_stats",
    description: "Get analytics about the user's idea contributions (count, quality, etc).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "google_search",
    description: "Search the web for company news, salaries, or market trends to impress the user. Use this PROACTIVELY when they mention companies or roles.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query (e.g., 'Zepto latest funding 2025', 'Product Manager salary Bangalore')."
        }
      },
      required: ["query"]
    }
  }
];

module.exports = tools;
