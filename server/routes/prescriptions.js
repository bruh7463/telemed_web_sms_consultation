// File: server/routes/prescriptions.js
// Description: Handles prescription-related API operations

const express = require('express');
const router = express.Router();
const { Prescription, Patient, Doctor, Consultation } = require('../models/db');
const { sendSms } = require('../services/textbee_sms');
const { protect } = require('../middleware/auth');

// @route   POST /api/prescriptions
// @desc    Create a new prescription (Doctor only)
// @access  Private (Doctor)
router.post('/', protect, async (req, res) => {
    try {
        // Only doctors can create prescriptions
        if (!req.doctor) {
            return res.status(403).json({ message: 'Only doctors can create prescriptions' });
        }

        const { patientId, consultationId, medications, diagnosis, notes, allergies } = req.body;

        // Validate required fields
        if (!patientId || !medications || medications.length === 0) {
            return res.status(400).json({
                message: 'Patient ID and at least one medication are required'
            });
        }

        // Validate medications structure
        for (const med of medications) {
            if (!med.name || !med.dosage || !med.frequency || !med.duration) {
                return res.status(400).json({
                    message: 'Each medication must have name, dosage, frequency, and duration'
                });
            }
        }

        // Verify patient exists
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Verify consultation exists and belongs to this doctor-patient pair
        let consultation = null;
        if (consultationId) {
            consultation = await Consultation.findOne({
                _id: consultationId,
                patient: patientId,
                doctor: req.doctor._id
            });
            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found or access denied' });
            }
        }

        // Create prescription
        const prescription = new Prescription({
            patient: patientId,
            doctor: req.doctor._id,
            consultation: consultationId,
            medications,
            diagnosis,
            notes,
            allergies,
            status: 'ACTIVE'
        });

        await prescription.save();

        // Populate references for response
        await prescription.populate('patient', 'name phoneNumber');
        await prescription.populate('doctor', 'name specialty');

        res.status(201).json({
            message: 'Prescription created successfully',
            prescription
        });

    } catch (error) {
        console.error('Error creating prescription:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/prescriptions
// @desc    Get prescriptions for a patient (Patient) or doctor's prescriptions (Doctor)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let prescriptions;

        if (req.patient) {
            // Patient viewing their own prescriptions
            prescriptions = await Prescription.find({
                patient: req.patient._id
            })
            .populate('doctor', 'name specialty')
            .sort({ createdAt: -1 });
        } else if (req.doctor) {
            // Doctor viewing their prescriptions
            prescriptions = await Prescription.find({
                doctor: req.doctor._id
            })
            .populate('patient', 'name phoneNumber')
            .sort({ createdAt: -1 });
        } else {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json({ prescriptions });

    } catch (error) {
        console.error('Error fetching prescriptions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/prescriptions/:id
// @desc    Get a specific prescription
// @access  Private (Patient can view their own, Doctor can view their own)
router.get('/:id', protect, async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id)
            .populate('patient', 'name phoneNumber')
            .populate('doctor', 'name specialty')
            .populate('consultation');

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        // Check access permissions
        if (req.patient && prescription.patient._id.toString() !== req.patient._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (req.doctor && prescription.doctor._id.toString() !== req.doctor._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json({ prescription });

    } catch (error) {
        console.error('Error fetching prescription:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/prescriptions/:id
// @desc    Update a prescription (Doctor only)
// @access  Private (Doctor)
router.put('/:id', protect, async (req, res) => {
    try {
        if (!req.doctor) {
            return res.status(403).json({ message: 'Only doctors can update prescriptions' });
        }

        const prescription = await Prescription.findOne({
            _id: req.params.id,
            doctor: req.doctor._id
        });

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found or access denied' });
        }

        const { medications, diagnosis, notes, allergies, status } = req.body;

        // Update fields
        if (medications) prescription.medications = medications;
        if (diagnosis !== undefined) prescription.diagnosis = diagnosis;
        if (notes !== undefined) prescription.notes = notes;
        if (allergies !== undefined) prescription.allergies = allergies;
        if (status) prescription.status = status;

        await prescription.save();

        // Populate references for response
        await prescription.populate('patient', 'name phoneNumber');
        await prescription.populate('doctor', 'name specialty');

        res.json({
            message: 'Prescription updated successfully',
            prescription
        });

    } catch (error) {
        console.error('Error updating prescription:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/prescriptions/:id/send-sms
// @desc    Send prescription via SMS to patient
// @access  Private (Doctor)
router.post('/:id/send-sms', protect, async (req, res) => {
    try {
        if (!req.doctor) {
            return res.status(403).json({ message: 'Only doctors can send prescriptions via SMS' });
        }

        const prescription = await Prescription.findOne({
            _id: req.params.id,
            doctor: req.doctor._id
        })
        .populate('patient', 'name phoneNumber')
        .populate('doctor', 'name specialty');

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found or access denied' });
        }

        // Format prescription for SMS
        let smsMessage = `PRESCRIPTION from Dr. ${prescription.doctor.name}\n\n`;

        if (prescription.diagnosis) {
            smsMessage += `Diagnosis: ${prescription.diagnosis}\n\n`;
        }

        smsMessage += `MEDICATIONS:\n`;
        prescription.medications.forEach((med, index) => {
            smsMessage += `${index + 1}. ${med.name}\n`;
            smsMessage += `   Dosage: ${med.dosage}\n`;
            smsMessage += `   Frequency: ${med.frequency}\n`;
            smsMessage += `   Duration: ${med.duration}\n`;
            if (med.instructions) {
                smsMessage += `   Instructions: ${med.instructions}\n`;
            }
            smsMessage += `\n`;
        });

        if (prescription.notes) {
            smsMessage += `Notes: ${prescription.notes}\n\n`;
        }

        if (prescription.allergies) {
            smsMessage += `Allergies: ${prescription.allergies}\n\n`;
        }

        smsMessage += `Please follow the instructions carefully.\n`;
        smsMessage += `Date: ${new Date(prescription.createdAt).toLocaleDateString()}`;

        // Truncate if too long for SMS (most SMS gateways have 160 char limit per message)
        if (smsMessage.length > 1500) {
            smsMessage = smsMessage.substring(0, 1490) + '...\n\n[Message truncated]';
        }

        const TEXTBEE_SENDER_ID = process.env.TEXTBEE_SENDER_ID;
        if (!TEXTBEE_SENDER_ID) {
            return res.status(500).json({ message: 'SMS service not configured' });
        }

        // Send SMS
        await sendSms(prescription.patient.phoneNumber, TEXTBEE_SENDER_ID, smsMessage);

        // Update prescription record
        prescription.smsSent = true;
        prescription.smsSentAt = new Date();
        await prescription.save();

        res.json({
            message: 'Prescription sent via SMS successfully',
            smsSent: true,
            smsSentAt: prescription.smsSentAt
        });

    } catch (error) {
        console.error('Error sending prescription via SMS:', error);
        res.status(500).json({ message: 'Failed to send prescription via SMS' });
    }
});

// @route   DELETE /api/prescriptions/:id
// @desc    Cancel/delete a prescription (Doctor only)
// @access  Private (Doctor)
router.delete('/:id', protect, async (req, res) => {
    try {
        if (!req.doctor) {
            return res.status(403).json({ message: 'Only doctors can delete prescriptions' });
        }

        const prescription = await Prescription.findOne({
            _id: req.params.id,
            doctor: req.doctor._id
        });

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found or access denied' });
        }

        prescription.status = 'CANCELLED';
        await prescription.save();

        res.json({ message: 'Prescription cancelled successfully' });

    } catch (error) {
        console.error('Error cancelling prescription:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
