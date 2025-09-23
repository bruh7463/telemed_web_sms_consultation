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

// Get all consultations for the logged-in patient
router.get('/patient', protect, async (req, res) => {
    try {
        if (!req.patient) {
            return res.status(403).json({ message: 'Only patients can access this endpoint' });
        }

        const consultations = await Consultation.find({ patient: req.patient.id })
            .populate('doctor', 'name specialty')
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

        // Determine response channel based on patient message history and booking channel
        const patientMessages = consultation.messages.filter(msg => msg.sender === 'PATIENT');

        // Check if patient has EVER sent an SMS in this consultation
        const hasPatientSentSMS = patientMessages.some(msg => msg.channel === 'sms');

        let responseChannel = 'frontend'; // Default to frontend
        if (hasPatientSentSMS) {
            // If patient has sent SMS, respond via SMS
            responseChannel = 'sms';
            console.log('Patient has SMS history - responding via SMS');
        } else if (patientMessages.length > 0) {
            // If patient has sent messages but no SMS, use last message channel
            const lastPatientMessage = patientMessages[patientMessages.length - 1];
            if (lastPatientMessage && lastPatientMessage.channel) {
                responseChannel = lastPatientMessage.channel;
            }
            console.log(`Patient has message history - responding via ${responseChannel}`);
        } else if (consultation.bookingChannel === 'sms') {
            // If no message history but consultation was booked via SMS, respond via SMS
            responseChannel = 'sms';
            console.log('Consultation booked via SMS - responding via SMS');
        } else {
            // Default to frontend for consultations booked via frontend
            responseChannel = 'frontend';
            console.log('Consultation booked via frontend - responding via frontend');
        }

        // Add doctor message with response channel info
        consultation.messages.push({
            sender: 'DOCTOR',
            content: req.body.content,
            channel: responseChannel, // Track which channel this response goes to
            timestamp: new Date()
        });

        if (consultation.status === 'PENDING') {
            consultation.status = 'ACTIVE';
        }
        await consultation.save();

        // Route response based on the determined channel
        if (responseChannel === 'sms') {
            // Send SMS response if patient has SMS history
            const TEXTBEE_SENDER_ID = process.env.TEXTBEE_SENDER_ID;
            if (!TEXTBEE_SENDER_ID) {
                console.error('TEXTBEE_SENDER_ID environment variable is not set. SMS cannot be sent.');
                console.log('Doctor response stored in database (SMS failed due to missing config)');
            } else {
                console.log(`📱 Sending SMS response to patient ${consultation.patient.phoneNumber}: "${req.body.content}"`);
                try {
                    await sendSms(consultation.patient.phoneNumber, TEXTBEE_SENDER_ID, req.body.content);
                    console.log('✅ SMS response sent successfully');
                } catch (smsError) {
                    console.error('❌ Failed to send SMS response:', smsError.message);
                }
            }
        } else {
            // For frontend messages, only store in database - no SMS
            console.log('💻 Doctor response to frontend message - stored in database only');
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

        // Decrement doctor's workload (ensure it doesn't go below 0)
        await Doctor.findByIdAndUpdate(consultation.doctor, {
            $inc: { workload: -1 },
            $max: { workload: 0 }
        });

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

        const { doctorId, reason, preferredDate, preferredTime, scheduledDate } = req.body;

        // Validate required fields - support both quick book and scheduled book
        if (!reason) {
            return res.status(400).json({ message: 'Reason is required' });
        }

        let selectedDoctor;
        let scheduledStart;
        let scheduledEnd;

        if (doctorId && (preferredDate || scheduledDate)) {
            // Scheduled booking with specific doctor and time
            selectedDoctor = await Doctor.findById(doctorId);
            if (!selectedDoctor) {
                return res.status(404).json({ message: 'Doctor not found' });
            }

            // Handle both old format (preferredDate + preferredTime) and new format (scheduledDate)
            if (scheduledDate) {
                scheduledStart = new Date(scheduledDate);
            } else if (preferredDate && preferredTime) {
                scheduledStart = new Date(`${preferredDate}T${preferredTime}`);
            } else {
                return res.status(400).json({ message: 'Date and time are required for scheduled booking' });
            }

            scheduledEnd = new Date(scheduledStart.getTime() + 30 * 60 * 1000); // 30 minutes
        } else {
            // Quick booking - auto-assign doctor and time
            // Find doctor with lowest workload
            const doctors = await Doctor.find({}).sort({ workload: 1 });
            if (doctors.length === 0) {
                return res.status(404).json({ message: 'No doctors available' });
            }

            selectedDoctor = doctors[0]; // Doctor with lowest workload

            // Schedule for next available slot (next hour from now)
            const now = new Date();
            scheduledStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
            scheduledEnd = new Date(scheduledStart.getTime() + 30 * 60 * 1000); // 30 minutes
        }

        // Create consultation
        const consultation = new Consultation({
            patient: req.patient._id,
            doctor: selectedDoctor._id,
            status: doctorId ? 'SCHEDULED' : 'PENDING', // SCHEDULED for specific doctor/time, PENDING for quick book
            bookingReason: reason,
            bookingChannel: 'frontend', // Track that this was booked via frontend
            scheduledStart,
            scheduledEnd
        });

        await consultation.save();

        // Increment doctor's workload
        await Doctor.findByIdAndUpdate(selectedDoctor._id, { $inc: { workload: 1 } });

        // Populate doctor info for response
        await consultation.populate('doctor', 'name specialty');

        const bookingType = doctorId ? 'scheduled' : 'quick';
        res.status(201).json({
            message: `Appointment ${bookingType === 'quick' ? 'booked' : 'scheduled'} successfully`,
            consultation,
            bookingType,
            assignedDoctor: {
                name: selectedDoctor.name,
                specialty: selectedDoctor.specialty
            }
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

        // Decrement doctor's workload (ensure it doesn't go below 0)
        await Doctor.findByIdAndUpdate(consultation.doctor, {
            $inc: { workload: -1 },
            $max: { workload: 0 }
        });

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

// Get messages for a consultation
router.get('/:id/messages', protect, async (req, res) => {
    try {
        const consultation = await Consultation.findById(req.params.id);

        if (!consultation) {
            return res.status(404).json({ message: 'Consultation not found' });
        }

        // Check if user has access to this consultation
        const isPatient = req.patient && consultation.patient.toString() === req.patient.id;
        const isDoctor = req.doctor && consultation.doctor.toString() === req.doctor.id;

        if (!isPatient && !isDoctor) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json({
            consultationId: consultation._id,
            messages: consultation.messages || []
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
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

        consultation.messages.push({
            sender: 'PATIENT',
            content: req.body.content,
            channel: 'frontend', // Mark as coming from frontend
            timestamp: new Date()
        });
        if (consultation.status === 'PENDING') {
            consultation.status = 'ACTIVE';
        }
        await consultation.save();

        // IMPORTANT: Patient messages sent through the frontend should NOT trigger SMS
        // SMS should only be sent for doctor messages or in specific notification scenarios
        // This prevents spam and ensures patients use the in-app chat system
        console.log('Patient message sent through frontend - SMS notification skipped');

        res.status(201).json(consultation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Handle incoming SMS messages from patients (for SMS gateway integration)
router.post('/sms/incoming', async (req, res) => {
    try {
        const { from, message, consultationId } = req.body;

        // Find patient by phone number
        const { Patient } = require('../models/db');
        const patient = await Patient.findOne({ phoneNumber: from });

        if (!patient) {
            console.log(`SMS received from unknown number: ${from}`);
            return res.status(404).json({ message: 'Patient not found' });
        }

        let consultation;

        if (consultationId) {
            // Use provided consultation ID
            consultation = await Consultation.findById(consultationId);
            if (!consultation || consultation.patient.toString() !== patient._id.toString()) {
                return res.status(404).json({ message: 'Invalid consultation' });
            }
        } else {
            // Find active consultation for this patient
            consultation = await Consultation.findOne({
                patient: patient._id,
                status: 'ACTIVE'
            });

            if (!consultation) {
                console.log(`No active consultation found for patient ${patient.name}`);
                return res.status(404).json({ message: 'No active consultation found' });
            }
        }

        // Store SMS message with channel tracking
        consultation.messages.push({
            sender: 'PATIENT',
            content: message,
            channel: 'sms', // Mark as coming from SMS
            timestamp: new Date()
        });

        if (consultation.status === 'PENDING') {
            consultation.status = 'ACTIVE';
        }

        await consultation.save();

        console.log(`SMS message stored from patient ${patient.name}: ${message}`);

        res.status(200).json({
            message: 'SMS message processed successfully',
            consultationId: consultation._id
        });

    } catch (error) {
        console.error('Error processing incoming SMS:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
