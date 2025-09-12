// File: server/routes/doctor_routes.js
// Description: Handles doctor-related API operations

const express = require('express');
const router = express.Router();
const { Doctor } = require('../models/db');
const { protect } = require('../middleware/auth');

// Get all available doctors (for patients to book appointments)
router.get('/available', async (req, res) => {
    try {
        const doctors = await Doctor.find({})
            .select('name specialty workload availability')
            .sort({ workload: 1, name: 1 }); // Sort by workload first, then name

        res.json(doctors);
    } catch (error) {
        console.error('Error fetching available doctors:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get doctor's profile (protected route for doctors)
router.get('/profile', protect, async (req, res) => {
    try {
        if (!req.doctor) {
            return res.status(403).json({ message: 'Only doctors can access this route' });
        }

        const doctor = await Doctor.findById(req.doctor._id).select('-password');
        res.json(doctor);
    } catch (error) {
        console.error('Error fetching doctor profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
