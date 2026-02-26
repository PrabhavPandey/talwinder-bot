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

    if (!text) return res.status(200).json({ success: true });

    // Respond to Meta immediately
    res.status(200).json({ success: true });

    // Process message
    await processIncomingMessage(phoneNumber, text, userName);

  } catch (error) {
    logger.error('Webhook error:', error);
    if (!res.headersSent) res.status(200).json({ success: true });
  }
});

async function processIncomingMessage(phoneNumber, text, userName) {
  const formattedPhone = metaClient.constructor.formatPhoneNumber(phoneNumber);

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
  const history = await personalityEngine.getConversationHistory(user.id);
  const memoryContext = await memoryService.getMemoryContext(user.id);
  
  const systemPrompt = `${prompts.systemPrompt}\n\nUSER MEMORY:\n${memoryContext}\n\nCURRENT TIME: ${new Date().toLocaleString()}`;

  // Call Gemini
  let aiResponse = await geminiClient.chatWithTools(
    systemPrompt,
    [...history, { role: 'user', content: text }],
    tools
  );

  // Handle Tool Loop
  while (aiResponse.stopReason === 'tool_use') {
    const toolUses = aiResponse.content.filter(c => c.type === 'tool_use');
    const toolResults = await Promise.all(toolUses.map(async (tu) => {
      const content = await toolExecutor.executeTool(tu.name, tu.input, { user });
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

  const finalMessage = aiResponse.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
  
  // Send back to WhatsApp
  await metaClient.sendTextMessage(phoneNumber, finalMessage);

  // Save response
  await db.Conversation.create({
    userId: user.id,
    messageType: 'outgoing',
    content: finalMessage
  });
}

module.exports = router;
