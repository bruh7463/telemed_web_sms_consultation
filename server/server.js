// File: server/server.js
// Description: Main entry point. Initializes the server and connects modules.

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // Import cookie-parser
require('dotenv').config();
const { connectDB } = require('./models/db');

// --- INITIALIZATION ---
const app = express();
connectDB(); // Connect to MongoDB

// --- MIDDLEWARE ---
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- API ROUTES ---
app.use('/api/auth', require('./routes/auth_routes'));
app.use('/api/admin', require('./routes/admin_routes'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/sms', require('./routes/sms'));
app.use('/api/doctors', require('./routes/doctor_routes'));
app.use('/api/patients', require('./routes/patient_routes'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/medical-history', require('./routes/medical_history'));
app.use('/api/dialogflow', require('./routes/dialogflow_webhook'));
app.use('/api/test', require('./routes/test_routes'));

// --- REMINDER SERVICE ---
require('./services/reminders');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
