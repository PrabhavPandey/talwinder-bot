require('dotenv').config();
const geminiClient = require('./src/utils/geminiClient');
const prompts = require('./src/config/prompts');
const tools = require('./src/config/tools');
const logger = require('./src/utils/logger');

// Force model to something valid in the user's region
geminiClient.modelName = 'gemini-1.5-flash-latest-latest';

async function test(useTools) {
    const systemPrompt = `${prompts.systemPrompt}\n\nUSER NAME: User\nUSER MEMORY:\n\nCURRENT TIME: ${new Date().toLocaleString()}`;

    const messages = [
        { role: 'user', content: 'hey' },
        { role: 'assistant', content: "hey! i'm talwinder\n\nmy job is simple - no banger idea should die or go unheard. i exist for that.\n\nso. what's your name?" },
        { role: 'user', content: 'prabhav' }
    ];

    logger.info(`Running isolated Gemini test (useTools=${useTools})...`);
    try {
        const geminiTools = useTools ? geminiClient.convertToolsToGeminiFormat(tools) : [];

        // Manual model setup to bypass class if needed for isolation
        const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
        const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = client.getGenerativeModel({
            model: geminiClient.modelName,
            systemInstruction: systemPrompt,
            tools: useTools ? [{ functionDeclarations: geminiTools }] : [],
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
        });

        const history = geminiClient.convertMessagesToGeminiFormat(messages.slice(0, -1));
        const chat = model.startChat({ history });
        const result = await chat.sendMessage('prabhav');

        logger.info(`Turn 2 Response: ${JSON.stringify(result.response)}`);
    } catch (err) {
        logger.error('Error in test', err);
    }
}

async function runAll() {
    await test(true);
    logger.info('-------------------');
    await test(false);
}

runAll();
