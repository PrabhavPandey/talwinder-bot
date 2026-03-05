const tools = [
  {
    name: "capture_raw_idea",
    description: "Use this immediately when a user shares a raw, initial idea. This ensures the spark is never lost before brainstorming starts.",
    input_schema: {
      type: "object",
      properties: {
        rawDescription: {
          type: "string",
          description: "The raw, unrefined idea as shared by the user."
        }
      },
      required: ["rawDescription"]
    }
  },
  {
    name: "submit_idea",
    description: "Finalize and push the idea to the dashboard. Use this ONLY after confirmation from the user.",
    input_schema: {
      type: "object",
      properties: {
        rawDescription: {
          type: "string",
          description: "The original raw idea (for reference)."
        },
        refinedDescription: {
          type: "string",
          description: "A short, refined, human-readable version of the idea (2-3 sentences max)."
        },
        imageContext: {
          type: "string",
          description: "A description of what is in the image or screenshot shared by the user. Only include this if an image was shared."
        },
        category: {
          type: "string",
          enum: ["growth", "engineering", "product", "org", "culture", "other"],
          description: "The primary category this idea falls into."
        }
      },
      required: ["refinedDescription", "category"]
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
