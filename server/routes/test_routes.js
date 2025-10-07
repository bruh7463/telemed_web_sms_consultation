// File: server/routes/test_routes.js
// Test routes for development and debugging (only active when SMS_SIMULATOR=true)

const express = require('express');
const router = express.Router();
const { getSmsLog, clearSmsLog } = require('../services/textbee_sms');

// Only expose test routes if simulator is enabled
const isSimulatorEnabled = process.env.SMS_SIMULATOR === 'true' || process.env.NODE_ENV === 'test';

if (!isSimulatorEnabled) {
    console.log('SMS Simulator not enabled. Test routes are disabled.');
} else {
    console.log('SMS Simulator enabled. Test routes active.');

    /**
     * GET /api/test/sms-log
     * Returns the current SMS log for debugging
     */
    router.get('/sms-log', (req, res) => {
        try {
            const log = getSmsLog();
            res.json({
                success: true,
                count: log.length,
                messages: log
            });
        } catch (error) {
            console.error('Error getting SMS log:', error);
            res.status(500).json({ error: 'Failed to retrieve SMS log' });
        }
    });

    /**
     * DELETE /api/test/sms-log
     * Clears the SMS simulation log
     */
    router.delete('/sms-log', (req, res) => {
        try {
            clearSmsLog();
            res.json({
                success: true,
                message: 'SMS simulation log cleared'
            });
        } catch (error) {
            console.error('Error clearing SMS log:', error);
            res.status(500).json({ error: 'Failed to clear SMS log' });
        }
    });

    /**
     * GET /api/test/sms-count
     * Returns the count of simulated SMS messages
     */
    router.get('/sms-count', (req, res) => {
        try {
            const log = getSmsLog();
            res.json({
                success: true,
                count: log.length,
                lastMessage: log.length > 0 ? log[log.length - 1] : null
            });
        } catch (error) {
            console.error('Error getting SMS count:', error);
            res.status(500).json({ error: 'Failed to get SMS count' });
        }
    });
}

module.exports = router;
