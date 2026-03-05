const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const logger = require('./logger');

class GeminiClient {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = 'gemini-1.5-pro';

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
        const textContent = typeof msg.content === 'string' ? msg.content :
          (Array.isArray(msg.content) ? msg.content.filter(p => p.type === 'text').map(p => p.text).join('\n') : JSON.stringify(msg.content));
        return {
          role: 'user',
          parts: [{ text: textContent }]
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

  _extractResponseParts(response) {
    const content = [];
    let hasFunctionCalls = false;

    const candidates = response.candidates || [];
    if (candidates.length > 0 && candidates[0].content) {
      const parts = candidates[0].content.parts || [];
      for (const part of parts) {
        if (part.thought) continue;
        if (part.text && part.text.trim()) {
          content.push({ type: 'text', text: part.text });
        }
        if (part.functionCall) {
          hasFunctionCalls = true;
          content.push({
            type: 'tool_use',
            id: `call_${Date.now()}`,
            name: part.functionCall.name,
            input: part.functionCall.args || {}
          });
        }
      }
    }

    // Secondary fallback
    if (content.length === 0) {
      try {
        const text = response.text();
        if (text) content.push({ type: 'text', text });
      } catch (e) { }

      try {
        const fCalls = response.functionCalls();
        if (fCalls && fCalls.length > 0) {
          hasFunctionCalls = true;
          fCalls.forEach(call => {
            content.push({ type: 'tool_use', name: call.name, input: call.args || {} });
          });
        }
      } catch (e) { }
    }

    // Safety refusal fallback: if model returns NOTHING but stopped normally, check for safety
    if (content.length === 0 && candidates[0]?.finishReason === 'SAFETY') {
      logger.warn('Gemini safety filter triggered - refusal detected.');
    }

    return { content, stopReason: hasFunctionCalls ? 'tool_use' : 'end_turn' };
  }

  async chatWithTools(systemPrompt, messages, tools, maxTokens = 2048) {
    if (!this.client) throw new Error('Gemini client not initialized');

    try {
      const geminiTools = this.convertToolsToGeminiFormat(tools);
      const safetySettings = [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }];

      const model = this.client.getGenerativeModel({
        model: this.modelName,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ functionDeclarations: geminiTools }],
        safetySettings
      });

      const history = this.convertMessagesToGeminiFormat(messages.slice(0, -1));
      const lastMessage = messages[messages.length - 1];
      const lastText = typeof lastMessage.content === 'string' ? lastMessage.content :
        (Array.isArray(lastMessage.content) ? lastMessage.content.find(p => p.type === 'text')?.text || "" : "");

      const chat = model.startChat({ history, generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 } });
      const result = await chat.sendMessage(lastText || "hello");

      const { content, stopReason } = this._extractResponseParts(result.response);
      return { content, stopReason, _chatInstance: chat };
    } catch (error) {
      logger.error('Gemini API error:', error);
      throw error;
    }
  }

  async continueWithToolResults(systemPrompt, messages, toolResults, tools, chatInstance) {
    try {
      const functionResponses = toolResults.map(result => ({
        functionResponse: { name: result.name, response: result.content }
      }));
      const result = await chatInstance.sendMessage(functionResponses);
      const { content, stopReason } = this._extractResponseParts(result.response);
      return { content, stopReason, _chatInstance: chatInstance };
    } catch (error) {
      logger.error('Gemini continuation error:', error);
      throw error;
    }
  }
}

module.exports = new GeminiClient();
