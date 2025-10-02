// File: server/routes/medical_history.js
// Description: Handles medical history-related API operations

const express = require('express');
const router = express.Router();
const { MedicalHistory, MedicalCode, MedicalHistoryAudit, Patient, Doctor, Admin, Consultation } = require('../models/db');
const { protect } = require('../middleware/auth');

// Helper function to create audit log entry
async function createAuditLog(patientId, medicalHistoryId, action, section, field, oldValue, newValue, performedBy, performedByType, req) {
    try {
        const auditEntry = new MedicalHistoryAudit({
            patient: patientId,
            medicalHistory: medicalHistoryId,
            action,
            section,
            field,
            oldValue,
            newValue,
            performedBy,
            performedByType,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            timestamp: new Date()
        });
        await auditEntry.save();
    } catch (error) {
        console.error('Error creating audit log:', error);
        // Don't fail the main operation if audit logging fails
    }
}

// Helper function to get user ID and type from request
function getUserInfo(req) {
    if (req.patient) {
        return { userId: req.patient._id, userType: 'patient' };
    } else if (req.doctor) {
        return { userId: req.doctor._id, userType: 'doctor' };
    } else if (req.admin) {
        return { userId: req.admin._id, userType: 'admin' };
    }
    return { userId: null, userType: null };
}

// @route   GET /api/medical-history
// @desc    Get patient's medical history (Patient) or all medical histories (Doctor/Admin)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let medicalHistories;

        if (req.patient) {
            // Patient viewing their own medical history
            medicalHistories = await MedicalHistory.findOne({ patient: req.patient._id })
                .populate('patient', 'name phoneNumber dateOfBirth gender');

            if (!medicalHistories) {
                // Return empty structure if no medical history exists yet
                return res.json({
                    patient: req.patient,
                    chronicConditions: [],
                    allergies: [],
                    currentMedications: [],
                    pastSurgeries: [],
                    familyHistory: [],
                    socialHistory: {
                        smoking: { status: 'never' },
                        alcohol: { status: 'never' },
                        occupation: '',
                        exercise: '',
                        diet: ''
                    },
                    vitalSigns: {},
                    immunizations: [],
                    emergencyContacts: [],
                    lastUpdated: null,
                    createdBy: null,
                    createdByType: null
                });
            }
        } else if (req.doctor) {
            // Doctor viewing medical histories (could be filtered by their patients)
            const patientIds = await Consultation.distinct('patient', { doctor: req.doctor._id });
            medicalHistories = await MedicalHistory.find({ patient: { $in: patientIds } })
                .populate('patient', 'name phoneNumber dateOfBirth gender')
                .sort({ lastUpdated: -1 });
        } else if (req.admin) {
            // Admin viewing all medical histories
            medicalHistories = await MedicalHistory.find({})
                .populate('patient', 'name phoneNumber dateOfBirth gender')
                .sort({ lastUpdated: -1 });
        } else {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(medicalHistories);
    } catch (error) {
        console.error('Error fetching medical history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/medical-history/:patientId
// @desc    Get specific patient's medical history (Doctor/Admin only)
// @access  Private (Doctor/Admin)
router.get('/:patientId', protect, async (req, res) => {
    try {
        if (!req.doctor && !req.admin) {
            return res.status(403).json({ message: 'Only doctors and admins can access other patients\' medical history' });
        }

        const medicalHistory = await MedicalHistory.findOne({ patient: req.params.patientId })
            .populate('patient', 'name phoneNumber dateOfBirth gender');

        if (!medicalHistory) {
            return res.json({
                patient: { _id: req.params.patientId },
                chronicConditions: [],
                allergies: [],
                currentMedications: [],
                pastSurgeries: [],
                familyHistory: [],
                socialHistory: {
                    smoking: { status: 'never' },
                    alcohol: { status: 'never' },
                    occupation: '',
                    exercise: '',
                    diet: ''
                },
                vitalSigns: {},
                immunizations: [],
                emergencyContacts: [],
                lastUpdated: null,
                createdBy: null,
                createdByType: null
            });
        }

        res.json(medicalHistory);
    } catch (error) {
        console.error('Error fetching medical history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/medical-history
// @desc    Create or update medical history
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { patientId, ...updates } = req.body;
        const { userId, userType } = getUserInfo(req);

        // Debug logging removed

        if (!userId || !userType) {
            console.log('User authentication failed');
            return res.status(400).json({ message: 'User authentication required' });
        }

        // Determine which patient this is for
        let targetPatientId = patientId;
        if (req.patient) {
            // Patients can only update their own medical history
            targetPatientId = req.patient._id;
        } else if (!req.doctor && !req.admin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Find existing medical history or create new one
        let medicalHistory = await MedicalHistory.findOne({ patient: targetPatientId });

        if (!medicalHistory) {
            // Create new medical history
            medicalHistory = new MedicalHistory({
                patient: targetPatientId,
                createdBy: userId,
                createdByType: userType,
                updatedBy: userId,
                updatedByType: userType,
                ...updates
            });

            await medicalHistory.save();
            await createAuditLog(targetPatientId, medicalHistory._id, 'create', 'medicalHistory', null, null, updates, userId, userType, req);
        } else {
            // Update existing medical history
            const oldValues = {};

            // Update each section with audit logging
            Object.keys(updates).forEach(section => {
                if (updates[section] && typeof updates[section] === 'object') {
                    // For array sections, we need to handle additions/updates/deletions
                    if (Array.isArray(updates[section])) {
                        oldValues[section] = medicalHistory[section] || [];
                        medicalHistory[section] = updates[section].map(item => {
                            // Ensure we have the required fields - explicitly set them
                            const updatedItem = {
                                ...item,
                                lastUpdated: new Date(),
                                updatedBy: userId,
                                updatedByType: userType
                            };
                            console.log(`Updating ${section} item with userType ${userType}:`, updatedItem);
                            return updatedItem;
                        });
                    } else {
                        // For object sections
                        oldValues[section] = medicalHistory[section] || {};
                        medicalHistory[section] = {
                            ...updates[section],
                            lastUpdated: new Date(),
                            updatedBy: userId,
                            updatedByType: userType
                        };
                    }

                    createAuditLog(targetPatientId, medicalHistory._id, 'update', section, null, oldValues[section], updates[section], userId, userType, req);
                }
            });

            medicalHistory.updatedBy = userId;
            medicalHistory.updatedByType = userType;
            await medicalHistory.save();
        }

        // Populate patient info for response
        await medicalHistory.populate('patient', 'name phoneNumber dateOfBirth gender');

        res.json({
            message: 'Medical history updated successfully',
            medicalHistory
        });
    } catch (error) {
        console.error('Error updating medical history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/medical-history/:section
// @desc    Update specific section of medical history
// @access  Private
router.put('/:section', protect, async (req, res) => {
    try {
        const { section } = req.params;
        const updates = req.body;
        const { userId, userType } = getUserInfo(req);

        // Determine which patient this is for
        let targetPatientId;
        if (req.patient) {
            targetPatientId = req.patient._id;
        } else if (req.body.patientId) {
            targetPatientId = req.body.patientId;
        } else {
            return res.status(400).json({ message: 'Patient ID required' });
        }

        // Validate section
        const validSections = [
            'chronicConditions', 'allergies', 'currentMedications', 'pastSurgeries',
            'familyHistory', 'socialHistory', 'vitalSigns', 'immunizations', 'emergencyContacts'
        ];

        if (!validSections.includes(section)) {
            return res.status(400).json({ message: 'Invalid section' });
        }

        // Find or create medical history
        let medicalHistory = await MedicalHistory.findOne({ patient: targetPatientId });

        if (!medicalHistory) {
            medicalHistory = new MedicalHistory({
                patient: targetPatientId,
                createdBy: userId,
                createdByType: userType,
                updatedBy: userId,
                updatedByType: userType
            });
        }

        // Store old value for audit
        const oldValue = medicalHistory[section];

        // Update the section
        if (Array.isArray(updates)) {
            // For array sections
            medicalHistory[section] = updates.map(item => ({
                ...item,
                lastUpdated: new Date(),
                updatedBy: userId,
                updatedByType: userType
            }));
        } else {
            // For object sections
            medicalHistory[section] = {
                ...updates,
                lastUpdated: new Date(),
                updatedBy: userId,
                updatedByType: userType
            };
        }

        medicalHistory.updatedBy = userId;
        medicalHistory.updatedByType = userType;

        await medicalHistory.save();

        // Create audit log
        await createAuditLog(targetPatientId, medicalHistory._id, 'update', section, null, oldValue, updates, userId, userType, req);

        // Populate patient info for response
        await medicalHistory.populate('patient', 'name phoneNumber dateOfBirth gender');

        res.json({
            message: `${section} updated successfully`,
            [section]: medicalHistory[section]
        });
    } catch (error) {
        console.error('Error updating medical history section:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/medical-history/codes/:category
// @desc    Get medical codes for controlled vocabulary
// @access  Private
router.get('/codes/:category', protect, async (req, res) => {
    try {
        const { category } = req.params;
        const { search } = req.query;

        let query = { category, isActive: true };

        if (search) {
            query.$or = [
                { displayName: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { synonyms: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        const codes = await MedicalCode.find(query)
            .select('code codeSystem displayName synonyms')
            .sort({ displayName: 1 })
            .limit(50); // Limit results for performance

        res.json({ codes });
    } catch (error) {
        console.error('Error fetching medical codes:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/medical-history/audit/:patientId
// @desc    Get audit log for patient's medical history (Doctor/Admin only)
// @access  Private (Doctor/Admin)
router.get('/audit/:patientId', protect, async (req, res) => {
    try {
        if (!req.doctor && !req.admin) {
            return res.status(403).json({ message: 'Only doctors and admins can access audit logs' });
        }

        const { limit = 50, skip = 0 } = req.query;

        const auditLogs = await MedicalHistoryAudit.find({ patient: req.params.patientId })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await MedicalHistoryAudit.countDocuments({ patient: req.params.patientId });

        res.json({
            auditLogs,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: total > parseInt(skip) + parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
