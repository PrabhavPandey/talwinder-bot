const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const logger = require('./logger');

class GeminiClient {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.AI_MODEL || 'gemini-1.5-pro';

    if (!this.apiKey) {
      logger.warn('GEMINI_API_KEY not configured');
      this.client = null;
    } else {
      this.client = new GoogleGenerativeAI(this.apiKey);
    }
  }

  convertToolsToGeminiFormat(tools) {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }));
  }

  convertMessagesToGeminiFormat(messages) {
    const converted = messages.map(msg => {
      if (msg.role === 'user') {
        return {
          role: 'user',
          parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
        };
      } else if (msg.role === 'assistant') {
        const parts = [];
        if (Array.isArray(msg.content)) {
          msg.content.forEach(block => {
            if (block.type === 'text') {
              parts.push({ text: block.text });
            } else if (block.type === 'tool_use') {
              parts.push({
                functionCall: {
                  name: block.name,
                  args: block.input
                }
              });
            }
          });
        } else if (typeof msg.content === 'string') {
          parts.push({ text: msg.content });
        }
        return {
          role: 'model',
          parts: parts
        };
      }
      return null;
    }).filter(Boolean);

    while (converted.length > 0 && converted[0].role === 'model') {
      converted.shift();
    }
    return converted;
  }

  async chatWithTools(systemPrompt, messages, tools, maxTokens = 2048) {
    if (!this.client) throw new Error('Gemini client not initialized');

    try {
      const geminiTools = this.convertToolsToGeminiFormat(tools);

      const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
      ];

      const model = this.client.getGenerativeModel({
        model: this.modelName,
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: geminiTools }],
        safetySettings
      });

      const history = this.convertMessagesToGeminiFormat(messages.slice(0, -1));
      const lastMessage = messages[messages.length - 1];
      const userMessage = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

      const chat = model.startChat({
        history: history,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
      });

      const result = await chat.sendMessage(userMessage);
      const response = result.response;

      const content = [];
      const functionCalls = response.functionCalls();

      // Always try to extract text, even if tools were called
      try {
        const text = response.text();
        if (text) content.push({ type: 'text', text });
      } catch (e) {
        // text() throws if there is no text part (e.g. only function calls)
      }

      if (functionCalls && functionCalls.length > 0) {
        functionCalls.forEach(call => {
          content.push({
            type: 'tool_use',
            id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: call.name,
            input: call.args
          });
        });
      }

      const stopReason = functionCalls && functionCalls.length > 0 ? 'tool_use' : 'end_turn';

      return {
        content,
        stopReason,
        _chatInstance: chat
      };
    } catch (error) {
      logger.error('Gemini API error:', error);
      throw error;
    }
  }

  async continueWithToolResults(systemPrompt, messages, toolResults, tools, chatInstance) {
    try {
      const functionResponses = toolResults.map(result => ({
        functionResponse: {
          name: result.name,
          response: result.content
        }
      }));

      const result = await chatInstance.sendMessage(functionResponses);
      const response = result.response;

      const content = [];
      const functionCalls = response.functionCalls();

      // Always try to extract text after tool results
      try {
        const text = response.text();
        if (text) content.push({ type: 'text', text });
      } catch (e) {
        // text() throws if empty
      }

      if (functionCalls && functionCalls.length > 0) {
        functionCalls.forEach(call => {
          content.push({
            type: 'tool_use',
            id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: call.name,
            input: call.args
          });
        });
      }

      const stopReason = functionCalls && functionCalls.length > 0 ? 'tool_use' : 'end_turn';

      return {
        content,
        stopReason,
        _chatInstance: chatInstance
      };
    } catch (error) {
      logger.error('Gemini continuation error:', error);
      throw error;
    }
  }
}

module.exports = new GeminiClient();
