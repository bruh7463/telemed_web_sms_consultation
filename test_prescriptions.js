#!/usr/bin/env node

/**
 * Prescription Testing Script
 * This script allows you to test the prescription functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test data
const TEST_DOCTOR = {
    email: 'doctor@test.com',
    password: 'test123'
};

const TEST_PATIENT = {
    phoneNumber: '+260971234567',
    password: 'test123'
};

let doctorToken = '';
let patientToken = '';
let prescriptionId = '';

/**
 * Login as doctor
 */
async function loginAsDoctor() {
    try {
        console.log('🔐 Logging in as doctor...');
        const response = await axios.post(`${BASE_URL}/api/auth/doctor/login`, TEST_DOCTOR);
        doctorToken = response.data.token || 'EXISTS'; // Since we're using cookies
        console.log('✅ Doctor login successful');
        return true;
    } catch (error) {
        console.log('❌ Doctor login failed:', error.response?.data?.message);
        return false;
    }
}

/**
 * Login as patient
 */
async function loginAsPatient() {
    try {
        console.log('🔐 Logging in as patient...');
        const response = await axios.post(`${BASE_URL}/api/auth/login/patient`, TEST_PATIENT);
        patientToken = response.data.token || 'EXISTS';
        console.log('✅ Patient login successful');
        return true;
    } catch (error) {
        console.log('❌ Patient login failed:', error.response?.data?.message);
        return false;
    }
}

/**
 * Create a test prescription
 */
async function createPrescription() {
    try {
        console.log('📝 Creating prescription...');

        const prescriptionData = {
            patientId: '507f1f77bcf86cd799439011', // You'll need to replace this with actual patient ID
            medications: [
                {
                    name: 'Amoxicillin',
                    dosage: '500mg',
                    frequency: '3 times daily',
                    duration: '7 days',
                    instructions: 'Take with food'
                },
                {
                    name: 'Ibuprofen',
                    dosage: '200mg',
                    frequency: 'As needed',
                    duration: '5 days',
                    instructions: 'Take with water'
                }
            ],
            diagnosis: 'Upper Respiratory Infection',
            notes: 'Patient should rest and drink plenty of fluids',
            allergies: 'Penicillin'
        };

        const response = await axios.post(`${BASE_URL}/api/prescriptions`, prescriptionData, {
            headers: {
                'Cookie': `token=${doctorToken}`
            },
            withCredentials: true
        });

        prescriptionId = response.data.prescription._id;
        console.log('✅ Prescription created:', prescriptionId);
        return true;
    } catch (error) {
        console.log('❌ Failed to create prescription:', error.response?.data?.message);
        return false;
    }
}

/**
 * Send prescription via SMS
 */
async function sendPrescriptionSMS() {
    try {
        console.log('📱 Sending prescription via SMS...');

        const response = await axios.post(`${BASE_URL}/api/prescriptions/${prescriptionId}/send-sms`, {}, {
            headers: {
                'Cookie': `token=${doctorToken}`
            },
            withCredentials: true
        });

        console.log('✅ Prescription SMS sent successfully');
        return true;
    } catch (error) {
        console.log('❌ Failed to send prescription SMS:', error.response?.data?.message);
        return false;
    }
}

/**
 * Get prescriptions for patient
 */
async function getPatientPrescriptions() {
    try {
        console.log('📋 Getting patient prescriptions...');

        const response = await axios.get(`${BASE_URL}/api/prescriptions`, {
            headers: {
                'Cookie': `token=${patientToken}`
            },
            withCredentials: true
        });

        console.log(`✅ Found ${response.data.prescriptions.length} prescriptions`);
        return response.data.prescriptions;
    } catch (error) {
        console.log('❌ Failed to get prescriptions:', error.response?.data?.message);
        return [];
    }
}

/**
 * Test SMS prescription commands
 */
async function testSMSCommands() {
    console.log('\n📱 Testing SMS prescription commands...');

    const smsCommands = [
        'my prescriptions',
        'cancel my appointment',
        'reschedule my appointment'
    ];

    for (const command of smsCommands) {
        try {
            console.log(`\n💬 Testing SMS: "${command}"`);

            const payload = {
                webhookEvent: 'MESSAGE_RECEIVED',
                sender: TEST_PATIENT.phoneNumber,
                message: command,
                timestamp: new Date().toISOString()
            };

            const response = await axios.post(`${BASE_URL}/api/sms/incoming`, payload);
            console.log(`✅ SMS processed: ${response.data}`);

        } catch (error) {
            console.log(`❌ SMS failed: ${error.response?.data || error.message}`);
        }
    }
}

/**
 * Run complete prescription test
 */
async function runFullTest() {
    console.log('🚀 Starting complete prescription system test...\n');

    // Setup
    const doctorLogin = await loginAsDoctor();
    if (!doctorLogin) {
        console.log('❌ Cannot proceed without doctor login');
        return;
    }

    const patientLogin = await loginAsPatient();
    if (!patientLogin) {
        console.log('⚠️  Patient login failed, but continuing with doctor tests');
    }

    // Test prescription creation
    const prescriptionCreated = await createPrescription();
    if (!prescriptionCreated) {
        console.log('❌ Cannot proceed without prescription creation');
        return;
    }

    // Test SMS sending
    await sendPrescriptionSMS();

    // Test patient viewing prescriptions
    if (patientLogin) {
        await getPatientPrescriptions();
    }

    // Test SMS commands
    await testSMSCommands();

    console.log('\n🎉 Prescription system test completed!');
}

/**
 * Show usage information
 */
function showUsage() {
    console.log(`
🤖 Prescription Testing Script
Usage: node test_prescriptions.js <command>

Commands:
  full          - Run complete prescription system test
  doctor-login  - Test doctor login only
  patient-login - Test patient login only
  create        - Create a test prescription
  sms           - Send prescription via SMS
  view          - View patient prescriptions
  sms-commands  - Test SMS prescription commands

Examples:
  node test_prescriptions.js full
  node test_prescriptions.js create
  node test_prescriptions.js sms

Note: Make sure your server is running on localhost:5000
      and you have test doctor/patient accounts set up.
`);
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
    showUsage();
} else {
    const command = args[0];

    switch (command) {
        case 'full':
            runFullTest();
            break;
        case 'doctor-login':
            loginAsDoctor();
            break;
        case 'patient-login':
            loginAsPatient();
            break;
        case 'create':
            loginAsDoctor().then(() => createPrescription());
            break;
        case 'sms':
            loginAsDoctor().then(() => {
                if (prescriptionId) {
                    sendPrescriptionSMS();
                } else {
                    console.log('❌ No prescription ID available. Run "create" first.');
                }
            });
            break;
        case 'view':
            loginAsPatient().then(() => getPatientPrescriptions());
            break;
        case 'sms-commands':
            testSMSCommands();
            break;
        default:
            console.log(`❌ Unknown command: ${command}`);
            showUsage();
    }
}

module.exports = {
    loginAsDoctor,
    loginAsPatient,
    createPrescription,
    sendPrescriptionSMS,
    getPatientPrescriptions,
    testSMSCommands,
    runFullTest
};
