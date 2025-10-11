#!/usr/bin/env node

/**
 * Prescription Testing Script
 * This script allows you to test the prescription functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Create separate axios instances for doctor and patient requests
const doctorAxios = axios.create({
    baseURL: BASE_URL,
    withCredentials: true
});

const patientAxios = axios.create({
    baseURL: BASE_URL,
    withCredentials: true
});

// Test data
const TEST_DOCTOR = {
    email: 'kay@telemed.com',
    password: 'password'
};

const TEST_PATIENT = {
    phoneNumber: '+260971234567',
    password: 'test123'
};

let doctorToken = '';
let patientToken = '';
let prescriptionId = '';
let patientId = '';

/**
 * Login as doctor
 */
async function loginAsDoctor() {
    try {
        console.log('🔐 Logging in as doctor...');
        const response = await axios.post(`${BASE_URL}/api/auth/doctor/login`, TEST_DOCTOR, {
            withCredentials: true
        });

        // Store the session cookies
        const cookies = response.headers['set-cookie'];
        if (cookies) {
            // Store cookies for subsequent requests
            axios.defaults.headers.common['Cookie'] = cookies.join('; ');
        }

        console.log('✅ Doctor login successful');
        return true;
    } catch (error) {
        console.log('❌ Doctor login failed:', error.response?.data?.message);

        // Try to create the test doctor account
        console.log('👨‍⚕️ Creating test doctor account...');
        try {
            await axios.post(`${BASE_URL}/api/auth/doctor/register`, {
                name: 'Test Doctor',
                email: TEST_DOCTOR.email,
                password: TEST_DOCTOR.password,
                specialty: 'General Practice'
            }, { withCredentials: true });

            console.log('✅ Test doctor created, retrying login...');

            // Retry login
            const retryResponse = await axios.post(`${BASE_URL}/api/auth/doctor/login`, TEST_DOCTOR, {
                withCredentials: true
            });

            // Store the session cookies
            const cookies = retryResponse.headers['set-cookie'];
            if (cookies) {
                axios.defaults.headers.common['Cookie'] = cookies.join('; ');
            }

            console.log('✅ Doctor login successful');
            return true;
        } catch (createError) {
            console.log('❌ Failed to create test doctor:', createError.response?.data?.message);
            return false;
        }
    }
}

/**
 * Login as patient
 */
async function loginAsPatient() {
    try {
        console.log('🔐 Logging in as patient...');
        const response = await patientAxios.post('/api/auth/login/patient', TEST_PATIENT);

        // Extract and set cookies for the patientAxios instance
        const cookies = response.headers['set-cookie'];
        if (cookies) {
            // Set cookies in the patientAxios instance
            patientAxios.defaults.headers.common['Cookie'] = cookies.join('; ');
        }

        // Store the authenticated patient ID for prescription creation
        if (response.data.patient && response.data.patient.id) {
            patientId = response.data.patient.id;
            console.log('🔍 Authenticated patient ID stored:', patientId);
        }

        console.log('✅ Patient login successful');
        console.log('🔍 Patient login response:', response.data);
        return true;
    } catch (error) {
        console.log('❌ Patient login failed:', error.response?.data?.message);

        // Try to create the test patient account
        console.log(' Creating test patient account...');
        try {
            const createResponse = await axios.post(`${BASE_URL}/api/auth/register/patient`, {
                phoneNumber: TEST_PATIENT.phoneNumber,
                password: TEST_PATIENT.password,
                name: 'Test Patient',
                nrc: '123456789',
                dateOfBirth: '1990-01-01',
                gender: 'male',
                address: 'Test Address'
            });

            console.log('✅ Test patient created:', createResponse.data);
            console.log('🔍 Test patient created, retrying login...');

            // Retry login using patientAxios
            const retryResponse = await patientAxios.post('/api/auth/login/patient', TEST_PATIENT);

            // Extract and set cookies for the patientAxios instance
            const cookies = retryResponse.headers['set-cookie'];
            if (cookies) {
                patientAxios.defaults.headers.common['Cookie'] = cookies.join('; ');
            }

            // Store the authenticated patient ID for prescription creation
            if (retryResponse.data.patient && retryResponse.data.patient.id) {
                patientId = retryResponse.data.patient.id;
                console.log('🔍 Authenticated patient ID stored:', patientId);
            }

            console.log('✅ Patient login successful');
            console.log('🔍 Patient login response:', retryResponse.data);
            return true;
        } catch (createError) {
            console.log('❌ Failed to create test patient:', createError.response?.data?.message);
            return false;
        }
    }
}

/**
 * Get available patients for prescription creation
 */
async function getPatients() {
    try {
        console.log('👥 Getting available patients...');

        const response = await axios.get(`${BASE_URL}/api/patients`, {
            withCredentials: true
        });

        const patients = response.data.patients || [];
        console.log(`✅ Found ${patients.length} patients`);

        if (patients.length > 0) {
            patientId = patients[0]._id;
            console.log(`📋 Using patient: ${patients[0].name} (${patientId})`);
        }

        return patients;
    } catch (error) {
        console.log('❌ Failed to get patients:', error.response?.data?.message);
        return [];
    }
}

/**
 * Create a test prescription
 */
async function createPrescription() {
    try {
        console.log('📝 Creating prescription...');

        // Check if we have an authenticated patient ID
        if (!patientId) {
            console.log('❌ No authenticated patient available for prescription creation');
            console.log('🔍 Make sure patient login was successful first');
            return false;
        }

        console.log('🔍 Creating prescription for patient ID:', patientId);

        const prescriptionData = {
            patientId: patientId,
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
            withCredentials: true
        });

        prescriptionId = response.data.prescription._id;
        console.log('✅ Prescription created:', prescriptionId);
        console.log('🔍 Prescription response:', response.data);
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
        console.log('🔍 Patient ID used for prescription:', patientId);

        // Use patientAxios instance which should have the patient session cookies
        const response = await patientAxios.get('/api/prescriptions');

        console.log(`✅ Found ${response.data.prescriptions.length} prescriptions`);
        if (response.data.prescriptions.length > 0) {
            console.log('📋 Prescription details:', response.data.prescriptions.map(p => ({
                id: p._id,
                patient: p.patient,
                diagnosis: p.diagnosis,
                medications: p.medications.length
            })));
        }
        return response.data.prescriptions;
    } catch (error) {
        console.log('❌ Failed to get prescriptions:', error.response?.data?.message);
        console.log('🔍 Full error:', error.response?.data);
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
