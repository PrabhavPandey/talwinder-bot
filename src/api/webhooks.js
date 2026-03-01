const express = require('express');
const router = express.Router();
const db = require('../models');
const geminiClient = require('../utils/geminiClient');
const metaClient = require('../utils/metaClient');
const toolExecutor = require('../services/toolExecutor');
const personalityEngine = require('../services/personalityEngine');
const memoryService = require('../services/memoryService');
const tools = require('../config/tools');
const prompts = require('../config/prompts');
const logger = require('../utils/logger');

// Meta Webhook Verification
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    // If visited in browser without params, show a friendly message instead of hanging
    res.status(200).send('Talwinder Webhook is Active! 🚀 (This endpoint is for Meta verification)');
  }
});

// Main Meta Webhook
router.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return res.status(200).json({ success: true });
    }

    const message = messages[0];
    const phoneNumber = message.from;
    const text = message.text?.body;
    const userName = value.contacts?.[0]?.profile?.name || 'User';
    const messageId = message.id;

    if (!text) return res.status(200).json({ success: true });

    // Respond to Meta immediately
    res.status(200).json({ success: true });

    // Process message
    logger.info(`📨 Processing message from ${phoneNumber}: ${text.substring(0, 50)}...`);
    
    // 1. Mark as Read (Blue Ticks)
    await metaClient.markAsRead(messageId);
    
    // 2. Start Typing Indicator
    await metaClient.sendTypingIndicator(phoneNumber);

    await processIncomingMessage(phoneNumber, text, userName, messageId);

  } catch (error) {
    logger.error('❌ Webhook error:', error);
    if (!res.headersSent) res.status(200).json({ success: true });
  }
});

async function processIncomingMessage(phoneNumber, text, userName, messageId) {
  try {
    const formattedPhone = metaClient.constructor.formatPhoneNumber(phoneNumber);
    logger.info(`👤 User: ${userName} (${formattedPhone})`);

    // Get or create user
    let [user, created] = await db.User.findOrCreate({
      where: { phoneNumber: formattedPhone },
      defaults: { name: userName }
    });

    if (!created) {
      await user.update({ lastInteraction: new Date() });
    }

    // Save conversation
    await db.Conversation.create({
      userId: user.id,
      messageType: 'incoming',
      content: text
    });

    // Get context
    logger.info('🧠 Fetching context and memory...');
    const history = await personalityEngine.getConversationHistory(user.id);
    const memoryContext = await memoryService.getMemoryContext(user.id);
    
    const systemPrompt = `${prompts.systemPrompt}\n\nUSER MEMORY:\n${memoryContext}\n\nCURRENT TIME: ${new Date().toLocaleString()}`;

    // Call Gemini
    logger.info('🤖 Calling Gemini AI...');
    let aiResponse = await geminiClient.chatWithTools(
      systemPrompt,
      [...history, { role: 'user', content: text }],
      tools
    );

    // Handle Tool Loop
    while (aiResponse.stopReason === 'tool_use') {
      logger.info('🛠️ AI requested tool execution');
      const toolUses = aiResponse.content.filter(c => c.type === 'tool_use');
      const toolResults = await Promise.all(toolUses.map(async (tu) => {
        logger.info(`🔧 Executing tool: ${tu.name}`);
        const content = await toolExecutor.executeTool(tu.name, tu.input, { user, messageId, phoneNumber: formattedPhone });
        return { name: tu.name, content };
      }));

      aiResponse = await geminiClient.continueWithToolResults(
        systemPrompt,
        [...history, { role: 'user', content: text }, { role: 'assistant', content: aiResponse.content }],
        toolResults,
        tools,
        aiResponse._chatInstance
      );
    }

    let finalMessage = aiResponse.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
    
    // Enforce lowercase (Talwinder Style)
    if (finalMessage) {
      finalMessage = finalMessage.toLowerCase();
    } else {
      logger.warn('⚠️ Empty response from AI');
      return;
    }

    logger.info(`__RAW_RESPONSE__: ${finalMessage}`);

    // Message Splitting & Human-like Delays
    // Split by double newlines to separate "thoughts" or "paragraphs"
    const parts = finalMessage.split(/\n\n+/).filter(p => p.trim().length > 0);

    for (const part of parts) {
      const cleanPart = part.trim();
      if (!cleanPart) continue;

      // Keep typing indicator active during delays
      await metaClient.sendTypingIndicator(phoneNumber);

      // Simulate typing delay: ~30ms per character, min 1s, max 5s
      const delay = Math.min(5000, Math.max(1000, cleanPart.length * 30));
      
      logger.info(`⏳ Typing delay: ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));

      logger.info(`📤 Sending part: ${cleanPart.substring(0, 50)}...`);
      
      // Send back to WhatsApp
      const sendResult = await metaClient.sendTextMessage(phoneNumber, cleanPart);
      
      if (!sendResult.success) {
        logger.error('❌ Failed to send WhatsApp message:', sendResult.error);
      } else {
        logger.info('✅ Message sent successfully');
        
        // Save response part
        await db.Conversation.create({
          userId: user.id,
          messageType: 'outgoing',
          content: cleanPart
        });
      }
    }

  } catch (err) {
    logger.error('❌ Error in processIncomingMessage:', err);
  }
}

module.exports = router;
