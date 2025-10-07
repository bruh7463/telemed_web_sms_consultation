// File: server/services/textbee_sms.js
// Manages sending SMS messages via the TextBee API or simulator for testing.

const axios = require('axios');

let smsLog = []; // In-memory storage for test messages

/**
 * Sends an SMS message using either the TextBee API or a simulator based on TEST mode.
 * @param {string} to - The recipient's phone number (e.g., "+260971234567").
 * @param {string} deviceId - Your TextBee Device ID (this will be the 'from' in your context).
 * @param {string} content - The message content.
 * @returns {object} - Returns the simulated response or actual API response.
 */
async function sendSms(to, deviceId, content) {
    // Check if SMS simulator is enabled (for testing)
    if (process.env.SMS_SIMULATOR === 'true' || process.env.NODE_ENV === 'test') {
        return sendSmsSimulator(to, deviceId, content);
    }

    return sendSmsReal(to, deviceId, content);
}

/**
 * Real SMS sending via TextBee API.
 */
async function sendSmsReal(to, deviceId, content) {
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
        console.log(`[REAL SMS] Sending to ${to} via TextBee (device: ${deviceId}): "${content}"`);
        const response = await axios.post(url, body, { headers });
        console.log('TextBee API response:', response.data);

        if (response.data && response.data.message) {
            console.log(`SMS successfully queued by TextBee. Response: ${response.data.message}`);
        } else {
            console.error('TextBee API reported an unexpected response structure:', response.data);
        }
        return response.data;
    } catch (error) {
        console.error('Error sending SMS via TextBee:', error.response ? error.response.data : error.message);
        throw error;
    }
}

/**
 * SMS Simulator for testing - logs messages instead of sending.
 */
async function sendSmsSimulator(to, deviceId, content) {
    const simulatedResponse = {
        success: true,
        message: 'SMS queued successfully (simulated)',
        timestamp: new Date().toISOString(),
        to,
        deviceId,
        content,
        id: `simulated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Store in memory log
    smsLog.push(simulatedResponse);

    // Console log for debugging
    console.log(`[SIMULATED SMS] To: ${to} | From: ${deviceId} | Content: "${content}"`);
    console.log(`Simulation log entry: ${smsLog.length} total messages stored.`);

    return simulatedResponse;
}

/**
 * Gets the SMS simulation log (for testing/debugging).
 * @returns {Array} - Array of logged simulated SMS messages.
 */
function getSmsLog() {
    return smsLog;
}

/**
 * Clears the SMS simulation log.
 */
function clearSmsLog() {
    smsLog = [];
    console.log('SMS simulation log cleared.');
}

module.exports = {
    sendSms,
    getSmsLog,
    clearSmsLog
};
