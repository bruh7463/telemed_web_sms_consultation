// File: server/services/textbee_sms.js
// Manages sending SMS messages via the TextBee API using a Device ID.

const axios = require('axios');

/**
 * Sends an SMS message using the TextBee API via a specific device.
 * @param {string} to - The recipient's phone number (e.g., "+260971234567").
 * @param {string} deviceId - Your TextBee Device ID (this will be the 'from' in your context).
 * @param {string} content - The message content.
 */
async function sendSms(to, deviceId, content) {
    const TEXTBEE_API_TOKEN = process.env.TEXTBEE_API_TOKEN; // This is the 'x-api-key' for TextBee

    if (!TEXTBEE_API_TOKEN) {
        console.error('Error: TextBee API Token (TEXTBEE_API_TOKEN) environment variable is not set.');
        return;
    }

    const url = `http://localhost:3001/api/v1/gateway/devices/${deviceId}/send-sms`;
    
    const headers = {
        'x-api-key': TEXTBEE_API_TOKEN, 
        'Content-Type': 'application/json'
    };

    const body = {
        recipients: [to],
        message: content
    };

    try {
        console.log(`Sending SMS to ${to} via TextBee (from device: ${deviceId}): "${content}"`);
        const response = await axios.post(url, body, { headers });
        console.log('TextBee API response:', response.data);

        if (response.data && response.data.message) { 
            console.log(`SMS successfully queued by TextBee. Response: ${response.data.message}`);
        } else {
            console.error('TextBee API reported an unexpected response structure:', response.data);
        }

    } catch (error) {
        console.error('Error sending SMS via TextBee:', error.response ? error.response.data : error.message);
    }
}

module.exports = {
    sendSms
};
