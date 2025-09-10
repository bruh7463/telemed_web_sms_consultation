// File: server/routes/patient_routes.js
// Description: Handles patient-related API logic, including registration.

const express = require('express');
const router = express.Router();
const { Patient, Consultation } = require('../models/db');
const { sendSms } = require('../services/textbee_sms');
const { protect } = require('../middleware/auth');


router.get('/profile', protect, async (req, res) => {
    try {
        const patient = await Patient.findById(req.patient.id).select('-password');
        res.json(patient);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/appointments', protect, async (req, res) => {
    try {
        const appointments = await Consultation.find({ patient: req.patient.id })
            .populate('doctor', 'name specialty')
            .sort({ createdAt: -1 });
        res.json(appointments);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Get all patients (for doctors to create prescriptions)
router.get('/', protect, async (req, res) => {
    try {
        // Only doctors can list patients
        if (!req.doctor) {
            return res.status(403).json({ message: 'Only doctors can view patient list' });
        }

        const patients = await Patient.find({})
            .select('name phoneNumber nrc dateOfBirth gender')
            .sort({ name: 1 });

        res.json({ patients });
    } catch (err) {
        console.error('Error fetching patients:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
