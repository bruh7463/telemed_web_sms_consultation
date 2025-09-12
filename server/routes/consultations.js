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
router.post('/:id/doctor/messages', protect, async (req, res) => {
    try {
        if (!req.doctor) {
            return res.status(403).json({ message: 'Only doctors can send messages from this endpoint' });
        }

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

// Book a new consultation (Patient)
router.post('/book', protect, async (req, res) => {
    try {
        if (!req.patient) {
            return res.status(403).json({ message: 'Only patients can book appointments' });
        }

        const { doctorId, reason, preferredDate, preferredTime } = req.body;

        // Validate required fields
        if (!doctorId || !reason || !preferredDate || !preferredTime) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Verify doctor exists
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Create scheduled date/time
        const scheduledStart = new Date(`${preferredDate}T${preferredTime}`);
        const scheduledEnd = new Date(scheduledStart.getTime() + 30 * 60 * 1000); // 30 minutes

        // Create consultation
        const consultation = new Consultation({
            patient: req.patient._id,
            doctor: doctorId,
            status: 'SCHEDULED',
            bookingReason: reason,
            scheduledStart,
            scheduledEnd
        });

        await consultation.save();

        // Increment doctor's workload
        await Doctor.findByIdAndUpdate(doctorId, { $inc: { workload: 1 } });

        // Populate doctor info for response
        await consultation.populate('doctor', 'name specialty');

        res.status(201).json({
            message: 'Appointment booked successfully',
            consultation
        });

    } catch (error) {
        console.error('Error booking appointment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Cancel appointment (Patient)
router.patch('/:id/cancel', protect, async (req, res) => {
    try {
        if (!req.patient) {
            return res.status(403).json({ message: 'Only patients can cancel appointments' });
        }

        const consultation = await Consultation.findOne({
            _id: req.params.id,
            patient: req.patient._id
        });

        if (!consultation) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (consultation.status === 'COMPLETED' || consultation.status === 'CANCELLED') {
            return res.status(400).json({ message: 'Cannot cancel completed or already cancelled appointment' });
        }

        consultation.status = 'CANCELLED';
        await consultation.save();

        // Decrement doctor's workload
        await Doctor.findByIdAndUpdate(consultation.doctor, { $inc: { workload: -1 } });

        res.json({ message: 'Appointment cancelled successfully' });

    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reschedule appointment (Patient)
router.patch('/:id/reschedule', protect, async (req, res) => {
    try {
        if (!req.patient) {
            return res.status(403).json({ message: 'Only patients can reschedule appointments' });
        }

        const { newDateTime } = req.body;

        if (!newDateTime) {
            return res.status(400).json({ message: 'New date and time are required' });
        }

        const consultation = await Consultation.findOne({
            _id: req.params.id,
            patient: req.patient._id
        });

        if (!consultation) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (consultation.status === 'COMPLETED' || consultation.status === 'CANCELLED') {
            return res.status(400).json({ message: 'Cannot reschedule completed or cancelled appointment' });
        }

        const newScheduledStart = new Date(newDateTime);
        const newScheduledEnd = new Date(newScheduledStart.getTime() + 30 * 60 * 1000); // 30 minutes

        consultation.scheduledStart = newScheduledStart;
        consultation.scheduledEnd = newScheduledEnd;
        await consultation.save();

        res.json({
            message: 'Appointment rescheduled successfully',
            consultation
        });

    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Send message as patient
router.post('/:id/messages', protect, async (req, res) => {
    try {
        if (!req.patient) {
            return res.status(403).json({ message: 'Only patients can send messages from this endpoint' });
        }

        const consultation = await Consultation.findById(req.params.id);

        if (!consultation || consultation.patient.toString() !== req.patient.id) {
            return res.status(404).json({ message: 'Consultation not found or not assigned to you' });
        }

        consultation.messages.push({ sender: 'PATIENT', content: req.body.content });
        if (consultation.status === 'PENDING') {
            consultation.status = 'ACTIVE';
        }
        await consultation.save();

        // Send SMS to doctor (if configured)
        const TEXTBEE_SENDER_ID = process.env.TEXTBEE_SENDER_ID;
        if (TEXTBEE_SENDER_ID) {
            const doctor = await Doctor.findById(consultation.doctor);
            if (doctor) {
                // Note: This would require storing doctor's phone number in the database
                // For now, we'll skip SMS to doctor as it's not in the current schema
            }
        }

        res.status(201).json(consultation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
