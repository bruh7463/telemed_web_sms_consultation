// File: server/routes/admin_routes.js
// Description: Admin management routes for user administration

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Doctor, Patient, Admin, Consultation, Prescription } = require('../models/db');
const { protect, requireAdmin, requirePermission } = require('../middleware/auth');

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', protect, requireAdmin, async (req, res) => {
    try {
        const [
            totalDoctors,
            totalPatients,
            totalConsultations,
            totalPrescriptions,
            activeConsultations,
            recentConsultations
        ] = await Promise.all([
            Doctor.countDocuments(),
            Patient.countDocuments(),
            Consultation.countDocuments(),
            Prescription.countDocuments(),
            Consultation.countDocuments({ status: { $in: ['PENDING', 'ACTIVE', 'SCHEDULED'] } }),
            Consultation.find()
                .populate('patient', 'name phoneNumber')
                .populate('doctor', 'name specialty')
                .sort({ createdAt: -1 })
                .limit(10)
                .select('status bookingReason scheduledStart scheduledEnd createdAt')
        ]);

        res.json({
            statistics: {
                totalDoctors,
                totalPatients,
                totalConsultations,
                totalPrescriptions,
                activeConsultations
            },
            recentConsultations
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/admin/doctors
// @desc    Get all doctors
// @access  Private (Admin only)
router.get('/doctors', protect, requireAdmin, requirePermission('doctors', 'read'), async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;

        const query = search
            ? {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { specialty: { $regex: search, $options: 'i' } }
                ]
            }
            : {};

        const doctors = await Doctor.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Doctor.countDocuments(query);

        res.json({
            doctors,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/admin/doctors/:id
// @desc    Get doctor by ID
// @access  Private (Admin only)
router.get('/doctors/:id', protect, requireAdmin, requirePermission('doctors', 'read'), async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id).select('-password');
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Get consultation count for this doctor
        const consultationCount = await Consultation.countDocuments({ doctor: req.params.id });

        res.json({
            doctor,
            statistics: {
                totalConsultations: consultationCount
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   PUT /api/admin/doctors/:id
// @desc    Update doctor
// @access  Private (Admin only)
router.put('/doctors/:id', protect, requireAdmin, requirePermission('doctors', 'update'), async (req, res) => {
    try {
        const { name, email, specialty, workload } = req.body;

        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== doctor.email) {
            const existingDoctor = await Doctor.findOne({ email });
            if (existingDoctor) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        doctor.name = name || doctor.name;
        doctor.email = email || doctor.email;
        doctor.specialty = specialty || doctor.specialty;
        doctor.workload = workload !== undefined ? workload : doctor.workload;

        await doctor.save();

        res.json({
            message: 'Doctor updated successfully',
            doctor: {
                id: doctor.id,
                name: doctor.name,
                email: doctor.email,
                specialty: doctor.specialty,
                workload: doctor.workload
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   DELETE /api/admin/doctors/:id
// @desc    Delete doctor
// @access  Private (Admin only)
router.delete('/doctors/:id', protect, requireAdmin, requirePermission('doctors', 'delete'), async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Check if doctor has active consultations
        const activeConsultations = await Consultation.countDocuments({
            doctor: req.params.id,
            status: { $in: ['PENDING', 'ACTIVE', 'SCHEDULED'] }
        });

        if (activeConsultations > 0) {
            return res.status(400).json({
                message: 'Cannot delete doctor with active consultations',
                activeConsultations
            });
        }

        await Doctor.findByIdAndDelete(req.params.id);

        res.json({ message: 'Doctor deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/admin/patients
// @desc    Get all patients
// @access  Private (Admin only)
router.get('/patients', protect, requireAdmin, requirePermission('patients', 'read'), async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;

        const query = search
            ? {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { phoneNumber: { $regex: search, $options: 'i' } },
                    { nrc: { $regex: search, $options: 'i' } }
                ]
            }
            : {};

        const patients = await Patient.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Patient.countDocuments(query);

        res.json({
            patients,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/admin/patients/:id
// @desc    Get patient by ID
// @access  Private (Admin only)
router.get('/patients/:id', protect, requireAdmin, requirePermission('patients', 'read'), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).select('-password');
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Get consultation count for this patient
        const consultationCount = await Consultation.countDocuments({ patient: req.params.id });

        res.json({
            patient,
            statistics: {
                totalConsultations: consultationCount
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   PUT /api/admin/patients/:id
// @desc    Update patient
// @access  Private (Admin only)
router.put('/patients/:id', protect, requireAdmin, requirePermission('patients', 'update'), async (req, res) => {
    try {
        const { name, phoneNumber, nrc, dateOfBirth, gender, address } = req.body;

        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Check if phone number is being changed and if it's already taken
        if (phoneNumber && phoneNumber !== patient.phoneNumber) {
            const existingPatient = await Patient.findOne({ phoneNumber });
            if (existingPatient) {
                return res.status(400).json({ message: 'Phone number already in use' });
            }
        }

        // Check if NRC is being changed and if it's already taken
        if (nrc && nrc !== patient.nrc) {
            const existingPatient = await Patient.findOne({ nrc });
            if (existingPatient) {
                return res.status(400).json({ message: 'NRC already in use' });
            }
        }

        patient.name = name || patient.name;
        patient.phoneNumber = phoneNumber || patient.phoneNumber;
        patient.nrc = nrc || patient.nrc;
        patient.dateOfBirth = dateOfBirth || patient.dateOfBirth;
        patient.gender = gender || patient.gender;
        patient.address = address || patient.address;

        await patient.save();

        res.json({
            message: 'Patient updated successfully',
            patient: {
                id: patient.id,
                name: patient.name,
                phoneNumber: patient.phoneNumber,
                nrc: patient.nrc,
                dateOfBirth: patient.dateOfBirth,
                gender: patient.gender,
                address: patient.address
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   DELETE /api/admin/patients/:id
// @desc    Delete patient
// @access  Private (Admin only)
router.delete('/patients/:id', protect, requireAdmin, requirePermission('patients', 'delete'), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Check if patient has active consultations
        const activeConsultations = await Consultation.countDocuments({
            patient: req.params.id,
            status: { $in: ['PENDING', 'ACTIVE', 'SCHEDULED'] }
        });

        if (activeConsultations > 0) {
            return res.status(400).json({
                message: 'Cannot delete patient with active consultations',
                activeConsultations
            });
        }

        await Patient.findByIdAndDelete(req.params.id);

        res.json({ message: 'Patient deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/admin/admins
// @desc    Get all admins (super admin only)
// @access  Private (Super Admin only)
router.get('/admins', protect, requireAdmin, requirePermission('admins', 'read'), async (req, res) => {
    try {
        const admins = await Admin.find()
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({ admins });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/admin/admins
// @desc    Create new admin (super admin only)
// @access  Private (Super Admin only)
router.post('/admins', protect, requireAdmin, requirePermission('admins', 'create'), async (req, res) => {
    try {
        const { name, email, password, role = 'admin' } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

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

        res.status(201).json({
            message: 'Admin created successfully',
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                isActive: admin.isActive
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   PUT /api/admin/admins/:id
// @desc    Update admin (super admin only)
// @access  Private (Super Admin only)
router.put('/admins/:id', protect, requireAdmin, requirePermission('admins', 'update'), async (req, res) => {
    try {
        const { name, email, role, isActive } = req.body;

        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Prevent super admin from deactivating themselves
        if (req.admin.role !== 'super_admin' && admin.role === 'super_admin') {
            return res.status(403).json({ message: 'Cannot modify super admin' });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== admin.email) {
            const existingAdmin = await Admin.findOne({ email });
            if (existingAdmin) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        admin.name = name || admin.name;
        admin.email = email || admin.email;
        admin.role = role || admin.role;
        admin.isActive = isActive !== undefined ? isActive : admin.isActive;

        await admin.save();

        res.json({
            message: 'Admin updated successfully',
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                isActive: admin.isActive
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   DELETE /api/admin/admins/:id
// @desc    Delete admin (super admin only)
// @access  Private (Super Admin only)
router.delete('/admins/:id', protect, requireAdmin, requirePermission('admins', 'delete'), async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Prevent deleting super admin
        if (admin.role === 'super_admin') {
            return res.status(403).json({ message: 'Cannot delete super admin' });
        }

        // Prevent admin from deleting themselves
        if (admin.id === req.admin.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        await Admin.findByIdAndDelete(req.params.id);

        res.json({ message: 'Admin deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
