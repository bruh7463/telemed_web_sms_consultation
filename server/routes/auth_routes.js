// File: server/routes/auth.js
// Description: Handles doctor registration and login.

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Doctor } = require('../models/db'); 
const { protect } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new doctor
// @access  Public (should be Admin in a full app)
router.post('/register', async (req, res) => {
    const { name, email, password, specialty } = req.body;
    try {
        let doctor = await Doctor.findOne({ email });
        if (doctor) {
            return res.status(400).json({ message: 'Doctor already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        doctor = new Doctor({ name, email, password: hashedPassword, specialty });
        await doctor.save();

        res.status(201).json({ message: 'Doctor registered successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate doctor & set HTTP-only token cookie
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const doctor = await Doctor.findOne({ email });
        if (!doctor) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, doctor.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const payload = { id: doctor.id };
        // Use a shorter expiresIn, e.g., 1 hour, and rely on refresh tokens or frequent re-login
        // for better security if sessions need to be very long.
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }); // Token valid for 1 hour

        // Set the token as an HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true, // Crucial: Prevents client-side JavaScript access
            secure: process.env.NODE_ENV === 'production', // Send only over HTTPS in production
            sameSite: 'Lax', // Protects against some CSRF attacks. Could be 'Strict' or 'None' (with secure).
            maxAge: 3600000 // Cookie expiry in milliseconds (1 hour)
        });

        // Send a success response. DO NOT send the token in the response body.
        res.json({
            message: 'Logged in successfully',
            doctor: {
                id: doctor.id,
                name: doctor.name,
                email: doctor.email
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/logout
// @desc    Clear token cookie and log out doctor
// @access  Private (though clearing a cookie doesn't strictly need auth, it's good practice)
router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
    });
    res.json({ message: 'Logged out successfully' });
});

// @route   GET /api/auth/status
// @desc    Check authentication status based on cookie
// @access  Private (requires valid cookie)
router.get('/status', protect, (req, res) => {
    // If the 'protect' middleware passed, it means a valid token was found in the cookie,
    // and req.doctor is populated.
    res.json({
        isAuthenticated: true,
        doctor: {
            id: req.doctor.id, // Assuming req.doctor contains the doctor's ID
            name: req.doctor.name,
            email: req.doctor.email
        }
    });
});


module.exports = router;