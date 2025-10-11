// Quick test for enhanced triage integration
const { evaluateTriage } = require('../logic/logic');

// Test malaria-like symptoms
const malariaSymptoms = {
    fever_duration: { stringValue: 'Less than 3 days' },
    cough_type: { stringValue: 'Dry cough' },
    breathing_difficulty: { stringValue: 'Mild (only with heavy activity)' }
};

console.log('Testing enhanced triage with malaria-like symptoms:');
console.log('====================================');
const result = evaluateTriage(malariaSymptoms);
console.log(result);
console.log('====================================');

// Test respiratory symptoms
const respiratorySymptoms = {
    cough_type: { stringValue: 'Cough with phlegm' },
    breathing_difficulty: { stringValue: 'Yes, moderate (short of breath with activity)' },
    fever_duration: { stringValue: '3-7 days' },
    fatigue_level: { stringValue: 'Moderate fatigue' }
};

console.log('\nTesting with respiratory symptoms:');
console.log('====================================');
const result2 = evaluateTriage(respiratorySymptoms);
console.log(result2);
console.log('====================================');
