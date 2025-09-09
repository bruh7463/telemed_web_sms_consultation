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
    dateOfBirth: { type: Date, required: false },
    gender: { type: String, enum: ['male', 'female'], required: false },
    address: { type: String, required: false },
    consultations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' }],
    dialogflowSessionId: { type: String, default: () => uuidv4() },
});
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
});
const Doctor = mongoose.model('Doctor', doctorSchema);

// Consultation Schema
const consultationSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    status: { type: String, enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'SCHEDULED'], default: 'PENDING' },
    bookingReason: { type: String },
    messages: [{
        sender: { type: String, enum: ['PATIENT', 'DOCTOR'] },
        content: String,
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


module.exports = { connectDB, Patient, Doctor, Consultation, TemporaryBookingReference };