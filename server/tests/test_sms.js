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

    // Medical history updates
    updateMedical: 'update medical',
    updateMeds: 'update meds',
    updateMedsKeyword: 'update medication',
    selectMedications: '1',
    addMedication: 'add med aspirin 100mg daily',
    removeMedication: 'remove med 1',
    selectAllergies: '2',
    addAllergy: 'add allergy penicillin rash moderate',
    removeAllergy: 'remove allergy 1',
    selectVitals: '3',
    updateWeight: 'weight 75',
    updateBP: 'bp 120/80',
    updateTemp: 'temp 36.5',
    selectSocial: '4',
    updateSmoking: 'smoking never',
    updateAlcohol: 'alcohol moderate',

    // General queries
    help: 'help',
    status: 'status'
};

/**
 * Simulate an SMS webhook call
 */
async function simulateSMS(from, message) {
    try {
        console.log(`\nSimulating SMS from ${from}: "${message}"`);

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

        console.log(`Response: ${response.status} - ${response.data}`);

    } catch (error) {
        console.error(`Error: ${error.response?.status} - ${error.response?.data || error.message}`);
    }
}

/**
 * Create test patient data via API
 */
async function createTestPatient(phoneNumber, name = 'Test Patient', nrc = '123456789') {
    try {
        console.log(`\nCreating test patient: ${name} (${phoneNumber})`);

        const response = await axios.post(`${BASE_URL}/api/auth/register/patient`, {
            phoneNumber,
            password: 'test123',
            name,
            nrc,
            dateOfBirth: '1990-01-01',
            gender: 'male',
            address: 'Test Address'
        });

        console.log(`Patient created: ${response.data.message}`);
        return true;
    } catch (error) {
        console.log(`Patient may already exist: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

/**
 * Run a specific test scenario
 */
async function runTest(scenario, phoneNumber = TEST_PHONE_NUMBERS.patient1) {
    console.log(`\nRunning test: ${scenario}`);

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

        // Medical history update tests
        case 'medicalUpdate':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.updateMedical);
            break;

        case 'selectMeds':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.selectMedications);
            break;

        case 'addMed':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.addMedication);
            break;

        case 'removeMed':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.removeMedication);
            break;

        case 'selectAllergies':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.selectAllergies);
            break;

        case 'addAllergy':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.addAllergy);
            break;

        case 'selectVitals':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.selectVitals);
            break;

        case 'updateWeight':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.updateWeight);
            break;

        case 'updateBP':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.updateBP);
            break;

        case 'updateTemp':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.updateTemp);
            break;

        case 'selectSocial':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.selectSocial);
            break;

        case 'updateSmoking':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.updateSmoking);
            break;

        case 'updateAlcohol':
            await simulateSMS(phoneNumber, TEST_SCENARIOS.updateAlcohol);
            break;

        case 'medicalScenario':
            console.log('\nRunning medical history update scenario...');
            await simulateSMS(phoneNumber, TEST_SCENARIOS.updateMedical);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await simulateSMS(phoneNumber, TEST_SCENARIOS.selectMedications);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await simulateSMS(phoneNumber, TEST_SCENARIOS.addMedication);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await simulateSMS(phoneNumber, TEST_SCENARIOS.updateMedical);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await simulateSMS(phoneNumber, TEST_SCENARIOS.selectVitals);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await simulateSMS(phoneNumber, TEST_SCENARIOS.updateWeight);
            break;

        case 'all':
            console.log('\nRunning all SMS tests...');
            await runTest('setup');
            await runTest('viewAppointments');
            await runTest('cancel');
            await runTest('reschedule');
            await runTest('unregistered');
            await runTest('medicalScenario');
            break;

        default:
            console.log('Unknown test scenario. Available tests:');
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
SMS Testing Script
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

  // Medical history update tests
  medicalUpdate      - Test initiating medical history update
  selectMeds         - Test selecting medications for update
  addMed            - Test adding a medication
  removeMed         - Test removing a medication
  selectAllergies    - Test selecting allergies for update
  addAllergy        - Test adding an allergy
  selectVitals       - Test selecting vitals for update
  updateWeight      - Test updating weight
  updateBP          - Test updating blood pressure
  updateTemp        - Test updating temperature
  selectSocial       - Test selecting social history for update
  updateSmoking     - Test updating smoking status
  updateAlcohol     - Test updating alcohol status
  medicalScenario   - Run a complete medical history update scenario
  all                - Run all tests

Examples:
  node test_sms.js setup
  node test_sms.js viewAppointments
  node test_sms.js cancel +260971234567
  node test_sms.js medicalScenario
  node test_sms.js all
`);
} else {
    const scenario = args[0];
    const phoneNumber = args[1] || TEST_PHONE_NUMBERS.patient1;
    runTest(scenario, phoneNumber);
}

module.exports = { simulateSMS, runTest, TEST_PHONE_NUMBERS, TEST_SCENARIOS };
