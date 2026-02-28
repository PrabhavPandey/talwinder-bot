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

// ============================================================
// MESSAGE CHUNKING: Batch multiple back-to-back user messages
// ============================================================
const pendingMessages = new Map(); // phoneNumber -> { messages: [], timeout: TimeoutId, createdAt: Date }
const MESSAGE_BATCH_DELAY = 3000; // 3 seconds — wait for user to finish typing

const MESSAGE_BATCH_CONFIG = {
  maxBatches: 200,           // Max concurrent batches
  maxMessagesPerBatch: 15,   // Max messages per user batch
  batchTTL: 60000,           // 60 seconds TTL - auto-cleanup abandoned batches
  cleanupInterval: 30000     // Run cleanup every 30 seconds
};

// ============================================================
// DEDUPLICATION: Prevent processing duplicate Meta webhooks
// ============================================================
const processedMessageIds = new Map(); // dedupKey -> timestamp
const DEDUP_TTL = 120000; // 2 minutes

// Clean up old dedup entries every minute
setInterval(() => {
  const now = Date.now();
  const cutoff = now - DEDUP_TTL;
  let cleaned = 0;
  for (const [key, timestamp] of processedMessageIds.entries()) {
    if (timestamp < cutoff) {
      processedMessageIds.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug(`Dedup cleanup: removed ${cleaned} entries, ${processedMessageIds.size} remaining`);
  }
}, 60000);

// ============================================================
// PROCESSING LOCK: Prevent race conditions per user
// ============================================================
const activeProcessing = new Map(); // phoneNumber -> { isProcessing: bool, startTime: Date, queuedMessages: [] }
const PROCESSING_LOCK_CONFIG = {
  maxQueueSize: 10,
  processingTimeout: 45000,  // 45 seconds max per processing
  requeuDelay: 2000          // 2 second delay for re-queued messages
};

// Cleanup stale batches
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [phone, batch] of pendingMessages.entries()) {
    if (now - batch.createdAt > MESSAGE_BATCH_CONFIG.batchTTL) {
      clearTimeout(batch.timeout);
      pendingMessages.delete(phone);
      cleaned++;
      logger.warn('Cleaned stale message batch', { phone });
    }
  }
  if (cleaned > 0) logger.info(`Batch cleanup: removed ${cleaned} stale batches`);
}, MESSAGE_BATCH_CONFIG.cleanupInterval);

// Cleanup stale processing locks
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [phone, lock] of activeProcessing.entries()) {
    if (now - lock.startTime > PROCESSING_LOCK_CONFIG.processingTimeout) {
      activeProcessing.delete(phone);
      cleaned++;
      logger.warn('Released stale processing lock', { phone });
    }
  }
  if (cleaned > 0) logger.info(`Lock cleanup: released ${cleaned} stale locks`);
}, 30000);

// ============================================================
// META WEBHOOK VERIFICATION (GET)
// ============================================================
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
    res.status(200).send('Talwinder Webhook is Active!');
  }
});

// ============================================================
// MAIN META WEBHOOK (POST) — with chunking + dedup + locking
// ============================================================
router.post('/webhook', async (req, res) => {
  const startTime = Date.now();

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

    if (!text || text.trim() === '') {
      return res.status(200).json({ success: true });
    }

    // DEDUPLICATION: Skip duplicate webhooks
    const dedupKey = `${phoneNumber}_${messageId}`;
    if (processedMessageIds.has(dedupKey)) {
      logger.debug('Skipping duplicate webhook', { phoneNumber, messageId });
      return res.status(200).json({ success: true });
    }
    processedMessageIds.set(dedupKey, Date.now());

    // Respond to Meta immediately (they require fast 200)
    res.status(200).json({ success: true });

    // Mark as Read (Blue Ticks)
    await metaClient.markAsRead(messageId);

    // Start Typing Indicator
    await metaClient.sendTypingIndicator(phoneNumber);

    // Build message data for batching
    const messageData = {
      phoneNumber,
      message: text,
      name: userName,
      messageId,
      startTime
    };

    // PROCESSING LOCK: If already processing for this user, queue instead
    const lockInfo = activeProcessing.get(phoneNumber);
    if (lockInfo && lockInfo.isProcessing) {
      if (lockInfo.queuedMessages.length < PROCESSING_LOCK_CONFIG.maxQueueSize) {
        lockInfo.queuedMessages.push(messageData);
        logger.info('Message queued (bot is processing)', {
          phoneNumber,
          queueSize: lockInfo.queuedMessages.length,
          preview: text.substring(0, 30)
        });
      } else {
        logger.warn('Queue full, dropping message', { phoneNumber });
      }
      return;
    }

    // MESSAGE BATCHING: Combine rapid messages
    if (pendingMessages.has(phoneNumber)) {
      const batch = pendingMessages.get(phoneNumber);

      if (batch.messages.length >= MESSAGE_BATCH_CONFIG.maxMessagesPerBatch) {
        // Batch full — process immediately and start new batch
        clearTimeout(batch.timeout);
        await processBatchedMessages(phoneNumber);
        const timeout = setTimeout(() => processBatchedMessages(phoneNumber), MESSAGE_BATCH_DELAY);
        pendingMessages.set(phoneNumber, { messages: [messageData], timeout, createdAt: Date.now() });
      } else {
        // Add to existing batch, reset timer
        batch.messages.push(messageData);
        clearTimeout(batch.timeout);
        batch.timeout = setTimeout(() => processBatchedMessages(phoneNumber), MESSAGE_BATCH_DELAY);
        logger.debug('Added to batch', { phoneNumber, batchSize: batch.messages.length });
      }
    } else {
      // Enforce max concurrent batches
      if (pendingMessages.size >= MESSAGE_BATCH_CONFIG.maxBatches) {
        const oldestPhone = pendingMessages.keys().next().value;
        if (oldestPhone) {
          clearTimeout(pendingMessages.get(oldestPhone).timeout);
          await processBatchedMessages(oldestPhone);
        }
      }

      // Start new batch
      const timeout = setTimeout(() => processBatchedMessages(phoneNumber), MESSAGE_BATCH_DELAY);
      pendingMessages.set(phoneNumber, { messages: [messageData], timeout, createdAt: Date.now() });
      logger.debug('Started new message batch', { phoneNumber });
    }

  } catch (error) {
    logger.error('Webhook error:', error);
    if (!res.headersSent) res.status(200).json({ success: true });
  }
});

// ============================================================
// PROCESS BATCHED MESSAGES
// ============================================================
async function processBatchedMessages(phoneNumber) {
  const batch = pendingMessages.get(phoneNumber);
  if (!batch) return;

  // Check if already processing
  const lockInfo = activeProcessing.get(phoneNumber);
  if (lockInfo && lockInfo.isProcessing) {
    logger.debug('Already processing, skipping duplicate call', { phoneNumber });
    return;
  }

  // Remove from pending
  pendingMessages.delete(phoneNumber);

  const messages = batch.messages;
  const firstMessage = messages[0];

  // SET PROCESSING LOCK
  activeProcessing.set(phoneNumber, {
    isProcessing: true,
    startTime: Date.now(),
    queuedMessages: []
  });

  logger.info(`Processing ${messages.length} batched message(s)`, {
    phoneNumber,
    messageCount: messages.length
  });

  // Combine all messages with newlines (like the reference codebase)
  const combinedMessage = messages.map(m => m.message).join('\n\n');

  try {
    await processIncomingMessage(
      phoneNumber,
      combinedMessage,
      firstMessage.name,
      firstMessage.messageId
    );

    // Check for messages that arrived during processing
    const lockInfoAfter = activeProcessing.get(phoneNumber);
    if (lockInfoAfter && lockInfoAfter.queuedMessages.length > 0) {
      logger.info(`Re-batching ${lockInfoAfter.queuedMessages.length} queued message(s)`, { phoneNumber });

      const queuedMessages = lockInfoAfter.queuedMessages;
      lockInfoAfter.queuedMessages = [];

      // Start a new batch with queued messages (shorter delay)
      if (!pendingMessages.has(phoneNumber)) {
        const timeout = setTimeout(() => processBatchedMessages(phoneNumber), PROCESSING_LOCK_CONFIG.requeuDelay);
        pendingMessages.set(phoneNumber, {
          messages: queuedMessages,
          timeout,
          createdAt: Date.now()
        });
      }
    }
  } catch (error) {
    logger.error('Batched processing failed:', { phoneNumber, error: error.message });
  } finally {
    // RELEASE PROCESSING LOCK
    activeProcessing.delete(phoneNumber);
  }
}

// ============================================================
// CORE MESSAGE PROCESSING (AI + Tools + Response Sending)
// ============================================================
async function processIncomingMessage(phoneNumber, text, userName, messageId) {
  try {
    const formattedPhone = metaClient.constructor.formatPhoneNumber(phoneNumber);
    logger.info(`Processing: ${userName} (${formattedPhone}): ${text.substring(0, 50)}...`);

    // Get or create user
    let [user, created] = await db.User.findOrCreate({
      where: { phoneNumber: formattedPhone },
      defaults: { name: userName }
    });

    if (!created) {
      await user.update({ lastInteraction: new Date() });
    }

    // Save incoming conversation
    await db.Conversation.create({
      userId: user.id,
      messageType: 'incoming',
      content: text
    });

    // Get context
    logger.info('Fetching context and memory...');
    const history = await personalityEngine.getConversationHistory(user.id);
    const memoryContext = await memoryService.getMemoryContext(user.id);

    const systemPrompt = `${prompts.systemPrompt}\n\nUSER NAME: ${userName}\nUSER MEMORY:\n${memoryContext}\n\nCURRENT TIME: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

    // Call Gemini
    logger.info('Calling Gemini AI...');
    let aiResponse;
    try {
      aiResponse = await geminiClient.chatWithTools(
        systemPrompt,
        [...history, { role: 'user', content: text }],
        tools
      );
    } catch (aiError) {
      logger.error('Gemini API failed:', aiError);
      // Send fallback error message
      await metaClient.sendTextMessage(formattedPhone, "something went wrong on my end. hit me again?");
      return;
    }

    // Handle Tool Loop (max 5 iterations for safety)
    let toolIterations = 0;
    const MAX_TOOL_ITERATIONS = 5;

    while (aiResponse.stopReason === 'tool_use' && toolIterations < MAX_TOOL_ITERATIONS) {
      toolIterations++;
      logger.info(`Tool iteration ${toolIterations}`);
      const toolUses = aiResponse.content.filter(c => c.type === 'tool_use');
      const toolResults = await Promise.all(toolUses.map(async (tu) => {
        logger.info(`Executing tool: ${tu.name}`);
        const content = await toolExecutor.executeTool(tu.name, tu.input, { user, messageId, phoneNumber: formattedPhone });
        return { name: tu.name, content };
      }));

      try {
        aiResponse = await geminiClient.continueWithToolResults(
          systemPrompt,
          [...history, { role: 'user', content: text }, { role: 'assistant', content: aiResponse.content }],
          toolResults,
          tools,
          aiResponse._chatInstance
        );
      } catch (continueError) {
        logger.error('Tool continuation failed:', continueError);
        await metaClient.sendTextMessage(formattedPhone, "got it");
        return;
      }
    }

    if (toolIterations >= MAX_TOOL_ITERATIONS) {
      logger.warn('Hit max tool iterations, forcing response');
    }

    let finalMessage = aiResponse.content.filter(c => c.type === 'text').map(c => c.text).join('\n');

    // Safety check for empty response
    if (!finalMessage || finalMessage.trim() === '') {
      logger.warn('Empty response from AI, falling back to default', { toolIterations });
      if (toolIterations > 0) {
        finalMessage = "got it"; // Simple acknowledgment that tools were executed
      } else {
        return;
      }
    }

    // Enforce lowercase (Talwinder personality)
    finalMessage = finalMessage.toLowerCase();

    // Strip any emojis (personality rule: no emojis in text)
    finalMessage = stripEmojis(finalMessage);

    logger.info(`__RAW_RESPONSE__: ${finalMessage}`);

    // ============================================================
    // INTELLIGENT RESPONSE SPLITTING
    // Split into separate WhatsApp bubbles (max 4 bubbles)
    // ============================================================
    let parts = finalMessage
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    // Enforce max 4 message bubbles
    if (parts.length > 4) {
      // Merge excess parts into the last message
      const kept = parts.slice(0, 3);
      const merged = parts.slice(3).join('\n');
      kept.push(merged);
      parts = kept;
    }

    // If there's only 1 part but it's very long, try to split it smarter
    if (parts.length === 1 && parts[0].length > 200) {
      const sentences = parts[0].split(/(?<=[.!?])\s+/);
      if (sentences.length >= 2) {
        const mid = Math.ceil(sentences.length / 2);
        parts = [
          sentences.slice(0, mid).join(' '),
          sentences.slice(mid).join(' ')
        ];
      }
    }

    // Send each part as a separate WhatsApp message with human-like delays
    for (let i = 0; i < parts.length; i++) {
      const cleanPart = parts[i].trim();
      if (!cleanPart) continue;

      // Typing indicator before each message
      await metaClient.sendTypingIndicator(phoneNumber);

      // Human-like typing delay: ~40ms per character, min 800ms, max 4s
      // First message has shorter delay (they're already waiting)
      const baseDelay = i === 0 ? 500 : Math.min(4000, Math.max(800, cleanPart.length * 40));

      // Add some randomness (±20%) to feel more human
      const jitter = baseDelay * (0.8 + Math.random() * 0.4);
      const delay = Math.round(jitter);

      logger.info(`Typing delay: ${delay}ms for part ${i + 1}/${parts.length}`);
      await new Promise(resolve => setTimeout(resolve, delay));

      logger.info(`Sending part ${i + 1}/${parts.length}: ${cleanPart.substring(0, 50)}...`);

      const sendResult = await metaClient.sendTextMessage(phoneNumber, cleanPart);

      if (!sendResult.success) {
        logger.error('Failed to send WhatsApp message:', sendResult.error);
      } else {
        logger.info('Message sent successfully');

        // Save each response part
        await db.Conversation.create({
          userId: user.id,
          messageType: 'outgoing',
          content: cleanPart
        });
      }
    }

  } catch (err) {
    logger.error('Error in processIncomingMessage:', err);

    // Best-effort error message to user
    try {
      await metaClient.sendTextMessage(phoneNumber, "something went wrong. try again?");
    } catch (sendErr) {
      logger.error('Failed to send error message:', sendErr);
    }
  }
}

// ============================================================
// UTILITY: Strip emojis from text (personality rule)
// ============================================================
function stripEmojis(text) {
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{FE0F}]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

module.exports = router;
