require('dotenv').config();
const geminiClient = require('./src/utils/geminiClient');
const prompts = require('./src/config/prompts');
const tools = require('./src/config/tools');
const logger = require('./src/utils/logger');

// Let's test with gemini-1.5-flash
geminiClient.modelName = 'gemini-1.5-flash';

async function test() {
    const systemPrompt = `${prompts.systemPrompt}\n\nUSER NAME: User\nUSER MEMORY:\n\nCURRENT TIME: ${new Date().toLocaleString()}`;

    const messages = [
        { role: 'user', content: 'hey' },
        { role: 'assistant', content: "hey! i'm talwinder\n\nmy job is simple - no banger idea should die or go unheard. i exist for that.\n\nso. what's your name?" },
        { role: 'user', content: 'prabhav' }
    ];

    logger.info(`Running isolated Gemini test... with ${geminiClient.modelName}`);
    try {
        const result = await geminiClient.chatWithTools(systemPrompt, messages, tools);
        logger.info(`Final Content Length: ${result.content.length}`);
        logger.info(`Stop Reason: ${result.stopReason}`);
        logger.info(`Content Items: ${JSON.stringify(result.content)}`);
    } catch (err) {
        logger.error('Error in test', err);
    }
}

test();
