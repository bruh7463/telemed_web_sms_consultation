// File: server/routes/consultations.js
// Description: Handles all consultation-related logic.

const express = require('express');
const router = express.Router();
const { Consultation, Doctor } = require('../models/db'); 
const { sendSms } = require('../services/textbee_sms'); 
const { protect } = require('../middleware/auth');

// Get all consultations for the logged-in doctor
router.get('/', protect, async (req, res) => {
    try {
        const consultations = await Consultation.find({ doctor: req.doctor.id })
            .populate('patient', 'name phoneNumber nrc')
            .sort({ createdAt: -1 });
        res.json(consultations);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Send a message as a doctor
router.post('/:id/messages', protect, async (req, res) => {
    try {
        const consultation = await Consultation.findById(req.params.id).populate('patient');

        if (!consultation || consultation.doctor.toString() !== req.doctor.id) {
            return res.status(404).json({ message: 'Consultation not found or not assigned to you' });
        }

        consultation.messages.push({ sender: 'DOCTOR', content: req.body.content });
        if (consultation.status === 'PENDING') {
            consultation.status = 'ACTIVE';
        }
        await consultation.save();
        
        // Use the TextBee sender ID from environment variables to send the SMS
        const TEXTBEE_SENDER_ID = process.env.TEXTBEE_SENDER_ID; 
        if (!TEXTBEE_SENDER_ID) {
            console.error('TEXTBEE_SENDER_ID environment variable is not set. SMS cannot be sent.');
        } else {
            await sendSms(consultation.patient.phoneNumber, TEXTBEE_SENDER_ID, req.body.content);
        }
        
        res.status(201).json(consultation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Mark a consultation as complete
router.patch('/:id/complete', protect, async (req, res) => {
    try {
        const consultation = await Consultation.findById(req.params.id);

        if (!consultation || consultation.doctor.toString() !== req.doctor.id) {
            return res.status(404).json({ message: 'Consultation not found or not assigned to you' });
        }
        
        consultation.status = 'COMPLETED';
        await consultation.save();

        // Decrement doctor's workload
        await Doctor.findByIdAndUpdate(consultation.doctor, { $inc: { workload: -1 } });
        
        res.json(consultation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
