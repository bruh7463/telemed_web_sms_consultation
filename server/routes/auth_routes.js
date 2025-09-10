// File: server/routes/auth_routes.js
// Description: Handles doctor registration and login.

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Doctor, Patient, Admin } = require('../models/db');
const { protect } = require('../middleware/auth');

// @route   POST /api/auth/doctor/register
// @desc    Register a new doctor
// @access  Public (should be Admin in a full app)
router.post('/doctor/register', async (req, res) => {
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

// @route   POST /api/auth/doctor/login
// @desc    Authenticate doctor & set HTTP-only token cookie
// @access  Public
router.post('/doctor/login', async (req, res) => {
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

        const payload = { id: doctor.id, type: 'doctor' };
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
// @access  Private 
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
router.get('/doctor/status', protect, (req, res) => {
    // If the 'protect' middleware passed, it means a valid token was found in the cookie,
    // and req.doctor is populated.
    res.json({
        isAuthenticated: true,
        doctor: {
            id: req.doctor.id,
            name: req.doctor.name,
            email: req.doctor.email
        }
    });
});

// @route   GET /api/auth/patient/status
// @desc    Check patient authentication status based on cookie
// @access  Private (requires valid cookie)
router.get('/patient/status', protect, (req, res) => {
    // If the 'protect' middleware passed, it means a valid token was found in the cookie,
    // and req.patient is populated.
    res.json({
        isAuthenticated: true,
        patient: {
            id: req.patient.id,
            name: req.patient.name,
            phoneNumber: req.patient.phoneNumber
        }
    });
});

// @route   POST /api/auth/register/patient
// @desc    Register a new patient 
// @access  Public 
router.post('/register/patient', async (req, res) => {
    const { phoneNumber, password, name, nrc, dateOfBirth, gender, address } = req.body;
    
    // Validation
    if (!phoneNumber || !password || !name || !nrc) {
        return res.status(400).json({ message: 'Required fields missing' });
    }

    try {
        // Check if patient exists
        let patient = await Patient.findOne({ $or: [{ phoneNumber }, { nrc }] });
        if (patient) {
            return res.status(400).json({ message: 'Patient already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new patient
        patient = new Patient({
            phoneNumber,
            password: hashedPassword,
            name,
            nrc,
            dateOfBirth,
            gender,
            address
        });

        await patient.save();
        res.status(201).json({ message: 'Patient registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/login/patient
// @desc    Authenticate patient & set HTTP-only token cookie
// @access  Public
router.post('/login/patient', async (req, res) => {
    const { phoneNumber, password } = req.body;

    try {
        const patient = await Patient.findOne({ phoneNumber });
        if (!patient) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if patient has a password set (for SMS-registered patients)
        if (!patient.password) {
            return res.status(400).json({
                message: 'Password not set',
                requiresPasswordSetup: true,
                patientId: patient.id
            });
        }

        const isMatch = await bcrypt.compare(password, patient.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const payload = { id: patient.id, type: 'patient' };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 3600000
        });

        res.json({
            message: 'Logged in successfully',
            patient: {
                id: patient.id,
                name: patient.name,
                phoneNumber: patient.phoneNumber
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/patient/set-password
// @desc    Set password for SMS-registered patient
// @access  Public
router.post('/patient/set-password', async (req, res) => {
    const { patientId, password } = req.body;

    if (!patientId || !password) {
        return res.status(400).json({ message: 'Patient ID and password are required' });
    }

    try {
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Check if password is already set
        if (patient.password) {
            return res.status(400).json({ message: 'Password already set' });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update patient with password
        patient.password = hashedPassword;
        await patient.save();

        // Now log them in
        const payload = { id: patient.id, type: 'patient' };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 3600000
        });

        res.json({
            message: 'Password set and logged in successfully',
            patient: {
                id: patient.id,
                name: patient.name,
                phoneNumber: patient.phoneNumber
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/admin/register
// @desc    Register a new admin (should be restricted to super admin in production)
// @access  Public (for development - should be protected)
router.post('/admin/register', async (req, res) => {
    const { name, email, password, role = 'admin' } = req.body;

    // Validation
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    try {
        // Check if admin exists
        let admin = await Admin.findOne({ email });
        if (admin) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Set default permissions based on role
        let permissions = [];
        if (role === 'super_admin') {
            permissions = [
                { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
                { resource: 'doctors', actions: ['create', 'read', 'update', 'delete'] },
                { resource: 'patients', actions: ['create', 'read', 'update', 'delete'] },
                { resource: 'consultations', actions: ['create', 'read', 'update', 'delete'] },
                { resource: 'prescriptions', actions: ['create', 'read', 'update', 'delete'] },
                { resource: 'admins', actions: ['create', 'read', 'update', 'delete'] }
            ];
        } else if (role === 'admin') {
            permissions = [
                { resource: 'users', actions: ['read', 'update'] },
                { resource: 'doctors', actions: ['read', 'update'] },
                { resource: 'patients', actions: ['read', 'update'] },
                { resource: 'consultations', actions: ['read', 'update'] },
                { resource: 'prescriptions', actions: ['read', 'update'] }
            ];
        }

        // Create new admin
        admin = new Admin({
            name,
            email,
            password: hashedPassword,
            role,
            permissions
        });

        await admin.save();
        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/admin/login
// @desc    Authenticate admin & set HTTP-only token cookie
// @access  Public
router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if admin account is active
        if (!admin.isActive) {
            return res.status(400).json({ message: 'Account is deactivated' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        const payload = { id: admin.id, type: 'admin' };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 3600000
        });

        res.json({
            message: 'Logged in successfully',
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/auth/admin/status
// @desc    Check admin authentication status based on cookie
// @access  Private (requires valid cookie)
router.get('/admin/status', protect, (req, res) => {
    // If the 'protect' middleware passed, it means a valid token was found in the cookie,
    // and req.admin is populated.
    res.json({
        isAuthenticated: true,
        admin: {
            id: req.admin.id,
            name: req.admin.name,
            email: req.admin.email,
            role: req.admin.role,
            permissions: req.admin.permissions
        }
    });
});

module.exports = router;
