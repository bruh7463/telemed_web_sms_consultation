#!/usr/bin/env node

/**
 * SMS Testing Script
 * This script allows you to test SMS functionality without sending actual SMS messages
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000'; // Your backend URL

// Test phone numbers (use fake numbers for testing)
const TEST_PHONE_NUMBERS = {
    patient1: '+260971234567',
    patient2: '+260981234567',
    unregistered: '+260991234567'
};

// Test scenarios
const TEST_SCENARIOS = {
    // Appointment management
    cancelAppointment: 'cancel my appointment',
    cancelSpecific: 'cancel 1',
    rescheduleAppointment: 'reschedule my appointment',
    rescheduleSpecific: 'reschedule 1',
    viewAppointments: 'my appointments',
    upcomingAppointments: 'upcoming',

    // Registration/booking
    bookConsultation: 'book consultation',
    registerNew: 'I want to register as a new patient',

    // General queries
    help: 'help',
    status: 'status'
};

/**
 * Simulate an SMS webhook call
 */
async function simulateSMS(from, message) {
    try {
        console.log(`\n📱 Simulating SMS from ${from}: "${message}"`);

        const payload = {
            webhookEvent: 'MESSAGE_RECEIVED',
            sender: from,
            message: message,
            timestamp: new Date().toISOString()
        };

        const response = await axios.post(`${BASE_URL}/api/sms/incoming`, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ Response: ${response.status} - ${response.data}`);

    } catch (error) {
        console.error(`❌ Error: ${error.response?.status} - ${error.response?.data || error.message}`);
    }
}

/**
 * Create test patient data via API
 */
async function createTestPatient(phoneNumber, name = 'Test Patient', nrc = '123456789') {
    try {
        console.log(`\n👤 Creating test patient: ${name} (${phoneNumber})`);

        const response = await axios.post(`${BASE_URL}/api/auth/register/patient`, {
            phoneNumber,
            password: 'test123',
            name,
            nrc,
            dateOfBirth: '1990-01-01',
            gender: 'male',
            address: 'Test Address'
        });

        console.log(`✅ Patient created: ${response.data.message}`);
        return true;
    } catch (error) {
        console.log(`ℹ️  Patient may already exist: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

/**
 * Run a specific test scenario
 */
async function runTest(scenario, phoneNumber = TEST_PHONE_NUMBERS.patient1) {
    console.log(`\n🧪 Running test: ${scenario}`);

    switch (scenario) {
        case 'setup':
            await createTestPatient(TEST_PHONE_NUMBERS.patient1, 'John Doe', '111111111');
            await createTestPatient(TEST_PHONE_NUMBERS.patient2, 'Jane Smith', '222222222');
            break;

        case 'cancel':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.cancelAppointment);
            break;

        case 'cancelSpecific':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.cancelSpecific);
            break;

        case 'reschedule':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.rescheduleAppointment);
            break;

        case 'rescheduleSpecific':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.rescheduleSpecific);
            break;

        case 'viewAppointments':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.viewAppointments);
            break;

        case 'book':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.bookConsultation);
            break;

        case 'unregistered':
            await simulateSMS(TEST_PHONE_NUMBERS.unregistered, TEST_SCENARIOS.viewAppointments);
            break;

        case 'all':
            console.log('\n🚀 Running all SMS tests...');
            await runTest('setup');
            await runTest('viewAppointments');
            await runTest('cancel');
            await runTest('reschedule');
            await runTest('unregistered');
            break;

        default:
            console.log('❓ Unknown test scenario. Available tests:');
            console.log('   setup - Create test patients');
            console.log('   cancel - Test appointment cancellation');
            console.log('   cancelSpecific - Test specific appointment cancellation');
            console.log('   reschedule - Test appointment rescheduling');
            console.log('   rescheduleSpecific - Test specific appointment rescheduling');
            console.log('   viewAppointments - Test viewing appointments');
            console.log('   book - Test booking consultation');
            console.log('   unregistered - Test with unregistered phone number');
            console.log('   all - Run all tests');
    }
}

// Command line interface
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log(`
🤖 SMS Testing Script
Usage: node test_sms.js <test_scenario> [phone_number]

Available test scenarios:
  setup              - Create test patients
  cancel             - Test appointment cancellation
  cancelSpecific     - Test specific appointment cancellation
  reschedule         - Test appointment rescheduling
  rescheduleSpecific - Test specific appointment rescheduling
  viewAppointments   - Test viewing appointments
  book               - Test booking consultation
  unregistered       - Test with unregistered phone number
  all                - Run all tests

Examples:
  node test_sms.js setup
  node test_sms.js viewAppointments
  node test_sms.js cancel +260971234567
  node test_sms.js all
`);
} else {
    const scenario = args[0];
    const phoneNumber = args[1] || TEST_PHONE_NUMBERS.patient1;
    runTest(scenario, phoneNumber);
}

module.exports = { simulateSMS, runTest, TEST_PHONE_NUMBERS, TEST_SCENARIOS };
