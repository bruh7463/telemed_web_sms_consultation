// File: server/models/db.js
// Description: Handles DB connection and defines Mongoose schemas.

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully.");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
}

// Patient Schema
const patientSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nrc: { type: String, required: true, unique: true, sparse: true },
    password: { type: String },
    dateOfBirth: { type: Date, required: false },
    gender: { type: String, enum: ['male', 'female'], required: false },
    address: { type: String, required: false },
    consultations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' }],
    dialogflowSessionId: { type: String, default: () => uuidv4() },
}, { timestamps: true });
const Patient = mongoose.model('Patient', patientSchema);

// Doctor Schema
const doctorSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    specialty: { type: String, default: 'General Practitioner' },
    workload: { type: Number, default: 0 },
    availability: [{
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        isBooked: { type: Boolean, default: false }, // To mark a slot as booked
        duration: { type: Number, required: true, default: 30 }, // NEW
        bufferTime: { type: Number, default: 10 }
    }],
}, { timestamps: true });
const Doctor = mongoose.model('Doctor', doctorSchema);

// Consultation Schema
const consultationSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    status: { type: String, enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'SCHEDULED', 'CANCELLED'], default: 'PENDING' },
    bookingReason: { type: String },
    bookingChannel: { type: String, enum: ['frontend', 'sms'], default: 'frontend' }, // Track how consultation was booked
    messages: [{
        sender: { type: String, enum: ['PATIENT', 'DOCTOR'] },
        content: String,
        channel: { type: String, enum: ['frontend', 'sms'], default: 'frontend' }, // Track message source
        timestamp: { type: Date, default: Date.now }
    }],
    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    reminderSent: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });
const Consultation = mongoose.model('Consultation', consultationSchema);

// New Schema: TemporaryBookingReference for SMS-based booking flow
const temporaryBookingReferenceSchema = new mongoose.Schema({
    dialogflowSessionId: { type: String, required: true, unique: true }, // Link to the patient's Dialogflow session
    references: [{
        bookingReferenceId: { type: Number, required: true }, // Simple number (1, 2, 3...)
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
        slotId: { type: mongoose.Schema.Types.ObjectId, required: true }, // The _id of the availability subdocument
        expiresAt: { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) } // Expires in 10 minutes
    }]
}, { timestamps: true });
// Add an index for automatic cleanup of expired documents
temporaryBookingReferenceSchema.index({ "references.expiresAt": 1 }, { expireAfterSeconds: 0 });
const TemporaryBookingReference = mongoose.model('TemporaryBookingReference', temporaryBookingReferenceSchema);

// Prescription Schema
const prescriptionSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },

    // Prescription details
    medications: [{
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        duration: { type: String, required: true },
        instructions: { type: String }
    }],

    // Additional prescription info
    diagnosis: { type: String },
    notes: { type: String },
    allergies: { type: String },

    // Status and tracking
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'DRAFT' },
    smsSent: { type: Boolean, default: false },
    smsSentAt: { type: Date },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Update prescription when saved
prescriptionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Prescription = mongoose.model('Prescription', prescriptionSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'admin', 'moderator'], default: 'admin' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    permissions: [{
        resource: { type: String, required: true }, // e.g., 'users', 'doctors', 'patients', 'consultations'
        actions: [{ type: String, enum: ['create', 'read', 'update', 'delete'] }] // CRUD permissions
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Update admin when saved
adminSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Medical History Schema - Separate entity for scalability
const medicalHistorySchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },

    // Modular sub-sections for medical history
    chronicConditions: [{
        condition: { type: String, required: true }, // Reference to MedicalCode or free text
        diagnosisDate: { type: Date },
        status: { type: String, enum: ['active', 'resolved', 'managed'], default: 'active' },
        notes: { type: String },
        lastUpdated: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId }, // Can be patient, doctor, or admin
        updatedByType: { type: String, enum: ['patient', 'doctor', 'admin'] }
    }],

    allergies: [{
        allergen: { type: String, required: true },
        reaction: { type: String },
        severity: { type: String, enum: ['mild', 'moderate', 'severe', 'life-threatening'], default: 'mild' },
        status: { type: String, enum: ['active', 'resolved'], default: 'active' },
        diagnosedDate: { type: Date },
        notes: { type: String },
        lastUpdated: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId }, // Can be patient, doctor, or admin
        updatedByType: { type: String, enum: ['patient', 'doctor', 'admin'] }
    }],

    currentMedications: [{
        medication: { type: String, required: true }, // Reference to MedicalCode or free text
        dosage: { type: String },
        frequency: { type: String },
        startDate: { type: Date },
        prescribedBy: { type: String },
        reason: { type: String },
        status: { type: String, enum: ['active', 'discontinued', 'completed'], default: 'active' },
        lastUpdated: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId }, // Can be patient, doctor, or admin
        updatedByType: { type: String, enum: ['patient', 'doctor', 'admin'], required: true }
    }],

    pastSurgeries: [{
        procedure: { type: String, required: true },
        date: { type: Date, required: true },
        surgeon: { type: String },
        hospital: { type: String },
        complications: { type: String },
        notes: { type: String },
        lastUpdated: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId }, // Can be patient, doctor, or admin
        updatedByType: { type: String, enum: ['patient', 'doctor', 'admin'], required: true }
    }],

    familyHistory: [{
        relation: { type: String, required: true }, // e.g., 'mother', 'father', 'sibling'
        condition: { type: String, required: true },
        ageAtDiagnosis: { type: Number },
        status: { type: String, enum: ['living', 'deceased'], default: 'living' },
        notes: { type: String },
        lastUpdated: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId }, // Can be patient, doctor, or admin
        updatedByType: { type: String, enum: ['patient', 'doctor', 'admin'], required: true }
    }],

    socialHistory: {
        smoking: {
            status: { type: String, enum: ['never', 'former', 'current'], default: 'never' },
            packsPerDay: { type: Number },
            yearsSmoked: { type: Number },
            quitDate: { type: Date },
            lastUpdated: { type: Date, default: Date.now },
            updatedBy: { type: mongoose.Schema.Types.ObjectId }, // Can be patient, doctor, or admin
            updatedByType: { type: String, enum: ['patient', 'doctor', 'admin'] }
        },
        alcohol: {
            status: { type: String, enum: ['never', 'occasional', 'moderate', 'heavy'], default: 'never' },
            drinksPerWeek: { type: Number },
            lastUpdated: { type: Date, default: Date.now },
            updatedBy: { type: mongoose.Schema.Types.ObjectId }, // Can be patient, doctor, or admin
            updatedByType: { type: String, enum: ['patient', 'doctor', 'admin'] }
        },
        occupation: { type: String },
        exercise: { type: String },
        diet: { type: String },
        lastUpdated: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId }, // Can be patient, doctor, or admin
        updatedByType: { type: String, enum: ['patient', 'doctor', 'admin'] }
    },

    vitalSigns: {
        height: { type: Number }, // in cm
        weight: { type: Number }, // in kg
        bmi: { type: Number }, // calculated
        bloodPressure: {
            systolic: { type: Number },
            diastolic: { type: Number },
            measuredDate: { type: Date }
        },
        heartRate: { type: Number },
        temperature: { type: Number },
        lastUpdated: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId }, // Can be patient, doctor, or admin
        updatedByType: { type: String, enum: ['patient', 'doctor', 'admin'] }
    },

    // Immunizations
    immunizations: [{
        vaccine: { type: String, required: true },
        dateGiven: { type: Date, required: true },
        lotNumber: { type: String },
        administeredBy: { type: String },
        notes: { type: String },
        lastUpdated: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId }, // Can be patient, doctor, or admin
        updatedByType: { type: String, enum: ['patient', 'doctor', 'admin'], required: true }
    }],

    // Emergency contacts
    emergencyContacts: [{
        name: { type: String, required: true },
        relationship: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        address: { type: String },
        lastUpdated: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId }, // Can be patient, doctor, or admin
        updatedByType: { type: String, enum: ['patient', 'doctor', 'admin'], required: true }
    }],

    // Overall metadata
    lastUpdated: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true }, // Can reference Patient, Doctor, or Admin
    createdByType: { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, required: true }, // Can reference Patient, Doctor, or Admin
    updatedByType: { type: String, enum: ['patient', 'doctor', 'admin'], required: true }
}, { timestamps: true });

// Update lastUpdated when saved
medicalHistorySchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

const MedicalHistory = mongoose.model('MedicalHistory', medicalHistorySchema);

// Medical Code Reference Schema (for controlled vocabularies)
const medicalCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true }, // ICD-10, SNOMED, etc.
    codeSystem: { type: String, required: true }, // 'ICD-10', 'SNOMED', 'RXNORM', etc.
    displayName: { type: String, required: true },
    category: { type: String, required: true }, // 'condition', 'medication', 'procedure', 'allergen', etc.
    synonyms: [{ type: String }],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const MedicalCode = mongoose.model('MedicalCode', medicalCodeSchema);

// Medical History Audit Log Schema
const medicalHistoryAuditSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    medicalHistory: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalHistory', required: true },
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    section: { type: String, required: true }, // e.g., 'chronicConditions', 'allergies', etc.
    field: { type: String }, // specific field that was changed
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    performedBy: { type: mongoose.Schema.Types.ObjectId, required: true }, // Can reference Patient, Doctor, or Admin
    performedByType: { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for efficient querying
medicalHistoryAuditSchema.index({ patient: 1, timestamp: -1 });
medicalHistoryAuditSchema.index({ medicalHistory: 1, timestamp: -1 });

const MedicalHistoryAudit = mongoose.model('MedicalHistoryAudit', medicalHistoryAuditSchema);

const Admin = mongoose.model('Admin', adminSchema);

module.exports = {
    connectDB,
    Patient,
    Doctor,
    Consultation,
    TemporaryBookingReference,
    Prescription,
    Admin,
    MedicalHistory,
    MedicalCode,
    MedicalHistoryAudit
};
