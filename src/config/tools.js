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
    name: "remember_fact",
    description: "Store a fact about the user in long-term memory. Use this for their role, team, relationships, preferences, or anything they share. STORE EVERYTHING.",
    input_schema: {
      type: "object",
      properties: {
        fact: {
          type: "string",
          description: "The fact to remember (e.g., 'Works on growth team', 'Manager is Raj', 'Frustrated with onboarding flow')."
        },
        category: {
          type: "string",
          enum: ["work", "personal", "preference", "relationship", "idea_context"],
          description: "Category of the fact."
        }
      },
      required: ["fact", "category"]
    }
  },
  {
    name: "submit_idea",
    description: "Submit and evaluate a new idea for Grapevine. Use this IMMEDIATELY when the user describes an idea. Score it honestly on novelty, utility, and charter alignment (1-5 each). Include who will execute if known.",
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
          type: "number",
          description: "How original/fresh is this idea? (1=common, 5=never seen before)"
        },
        utilityScore: {
          type: "number",
          description: "How useful/impactful would this be? (1=nice-to-have, 5=game-changer)"
        },
        charterAlignmentScore: {
          type: "number",
          description: "How aligned with Grapevine's charter? (1=tangential, 5=core mission). Charter: high impact, scalable, community-driven, solves real pain."
        },
        feedback: {
          type: "string",
          description: "Your honest, constructive feedback for the user. Be motivating but real."
        },
        executor: {
          type: "string",
          description: "Who will execute this idea (name, 'self', or 'tbd' if not yet decided)."
        },
        executorType: {
          type: "string",
          enum: ["self", "team", "other", "tbd"],
          description: "Type of executor: self (user will do it), team (group effort), other (someone else), tbd (not decided)."
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Priority based on scores and impact."
        },
        status: {
          type: "string",
          enum: ["pending", "evaluating", "sponsored", "not_now"],
          description: "Initial status of the idea."
        },
        sponsorSuggestion: {
          type: "string",
          description: "Who in the company should sponsor this idea? Leave empty if unsure."
        }
      },
      required: ["description", "category", "noveltyScore", "utilityScore", "charterAlignmentScore", "feedback"]
    }
  },
  {
    name: "set_execution_date",
    description: "Set a target date for following up on an idea. Use this when the user commits to a date. ALWAYS push for this after a good idea is submitted.",
    input_schema: {
      type: "object",
      properties: {
        ideaId: {
          type: "string",
          description: "The ID of the idea (leave empty for most recent idea)."
        },
        targetDate: {
          type: "string",
          description: "The target date (YYYY-MM-DD format)."
        }
      },
      required: ["targetDate"]
    }
  },
  {
    name: "get_my_ideas",
    description: "Get a list of ideas previously submitted by the user. Use when they ask about their past ideas or want to check status.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "get_user_stats",
    description: "Get analytics about the user's idea contributions (count, average scores, etc).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "google_search",
    description: "Search the web for market data, competitors, or trends to inform idea evaluation. Use PROACTIVELY when they mention specific markets or companies.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query."
        }
      },
      required: ["query"]
    }
  }
];

module.exports = tools;
