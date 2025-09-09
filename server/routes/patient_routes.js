// File: server/routes/patient_routes.js
// Description: Handles patient-related API logic, including registration.

const express = require('express');
const router = express.Router();
const { Patient } = require('../models/db');
const { sendSms } = require('../services/textbee_sms'); 
const { protect } = require('../middleware/auth');

// @route   POST /api/patients/register
// @desc    Register a new patient via web (or other non-SMS channel)
// @access  Public (for patient self-registration)
router.post('/register', async (req, res) => {
    const { phoneNumber, name, nrc, dateOfBirth, gender, address } = req.body;

    // Basic validation
    if (!phoneNumber || !name || !nrc) {
        return res.status(400).json({ message: 'Please enter all required fields: phoneNumber, name, and nrc.' });
    }

    try {
        let patient = await Patient.findOne({ $or: [{ phoneNumber }, { nrc }] });

        if (patient) {
            if (patient.phoneNumber === phoneNumber) {
                return res.status(400).json({ message: 'A patient with this phone number already exists.' });
            }
            if (patient.nrc === nrc) {
                return res.status(400).json({ message: 'A patient with this NRC already exists.' });
            }
        }

        // Create new patient
        patient = new Patient({
            phoneNumber,
            name,
            nrc,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined, // Convert to Date object
            gender,
            address
        });

        await patient.save();

        // Optionally send a confirmation SMS
        const AT_OUTGOING_SENDER_ID = process.env.AT_OUTGOING_SENDER_ID;
        if (AT_OUTGOING_SENDER_ID) {
            await sendSms(phoneNumber, AT_OUTGOING_SENDER_ID, `Welcome, ${name}! You have successfully registered for telemedicine services.`);
        } else {
            console.warn(`SMS confirmation not sent to ${phoneNumber} because AT_OUTGOING_SENDER_ID is not configured.`);
        }

        res.status(201).json({ message: 'Patient registered successfully', patient: { id: patient._id, name: patient.name, phoneNumber: patient.phoneNumber } });

    } catch (err) {
        console.error('Error registering patient:', err.message);
        res.status(500).send('Server error during patient registration.');
    }
});

// @route   GET /api/patients/:id
// @desc    Get patient details by ID (for doctor dashboard to view full patient profile)
// @access  Private (protected, only accessible by authenticated doctors)
// You would need to import 'protect' middleware here if you want to protect this route
// const { protect } = require('../middleware/auth');
// router.get('/:id', protect, async (req, res) => { ... });
// For now, leaving it public for simplicity if not explicitly requested to be protected.
router.get('/:id', protect, async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).select('-dialogflowSessionId'); // Exclude sensitive/internal fields
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }
        res.json(patient);
    } catch (err) {
        console.error('Error fetching patient details:', err.message);
        res.status(500).send('Server error fetching patient details.');
    }
});


module.exports = router;
