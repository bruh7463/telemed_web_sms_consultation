// File: server/services/reminders.js
// Description: Handles consultation reminders using cron jobs.

const cron = require('node-cron');
const { Consultation } = require('../models/db');
const { sendSms } = require('./textbee_sms');

// This function will run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    console.log('Running scheduled task to check for upcoming consultations...');

    try {
        const now = new Date();
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000); // Check for consultations in the next 30 minutes

        // Find consultations that are scheduled, haven't had a reminder sent, and are in the next 30 minutes
        const consultations = await Consultation.find({
            status: 'SCHEDULED',
            scheduledStart: { $gte: now, $lte: thirtyMinutesFromNow },
            reminderSent: false
        }).populate('patient', 'phoneNumber name'); // Populate the patient details to get their phone number

        if (consultations.length === 0) {
            console.log('No upcoming consultations found for reminders.');
            return;
        }

        for (const consultation of consultations) {
            const message = `Reminder: You have a consultation scheduled at ${consultation.scheduledStart.toLocaleTimeString()}. Please be ready.`;

            // Using the correct sender ID from logic.js
            const senderId = process.env.TEXTBEE_SENDER_ID;
            if (senderId) {
                await sendSms(consultation.patient.phoneNumber, senderId, message);
            } else {
                console.warn(`SMS confirmation not sent to ${consultation.patient.phoneNumber} because TEXTBEE_SENDER_ID is not configured.`);
            }

            // Mark the reminder as sent to prevent duplicate messages
            consultation.reminderSent = true;
            await consultation.save();

            console.log(`Reminder sent to patient ${consultation.patient.name} for consultation ${consultation._id}`);
        }
    } catch (error) {
        console.error('Error in reminder task:', error);
    }
});

console.log('Consultation reminder service started.');