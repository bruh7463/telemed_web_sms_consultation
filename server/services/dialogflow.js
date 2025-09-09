// dialogflow.js
// Contains the logic for interacting with the Dialogflow API.

const { SessionsClient } = require('@google-cloud/dialogflow');

/**
 * Sends a query to the Dialogflow agent.
 * @param {string} projectId - Dialogflow project ID.
 * @param {string} sessionId - A unique session ID for the conversation.
 * @param {string} query - The text query from the user (the SMS message).
 * @returns {Promise<object>} - The Dialogflow response's queryResult.
 */
async function detectIntent(projectId, sessionId, query) {
    const sessionClient = new SessionsClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: query,
                languageCode: 'en-US',
            },
        },
    };

    try {
        const responses = await sessionClient.detectIntent(request);
        console.log('Dialogflow Response:', JSON.stringify(responses[0].queryResult, null, 2));
        return responses[0].queryResult;
    } catch (error) {
        console.error('ERROR in Dialogflow detectIntent:', error);
        throw error;
    }
}

module.exports = {
    detectIntent
};
