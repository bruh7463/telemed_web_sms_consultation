// Debug the medical dictionary logic
const { getNextQuestion, enhancedTriage, medicalDictionary } = require('./server/logic/medical_dictionary');

console.log('=== Medical Dictionary Debug ===\n');

// Test 1: No symptoms
const symptoms1 = {};
console.log('1. No symptoms - triage result:', enhancedTriage(symptoms1));
const question1 = getNextQuestion(symptoms1);
console.log('First question:', question1.question);

// Test 2: Fever symptoms (what should've been stored)
const symptoms2 = { fever_pattern: true, fever: 'present' }; // This is what should be stored now
console.log('\n2. With fever answer (correct mapping) - triage result:', enhancedTriage(symptoms2));
console.log('Current symptoms:', symptoms2);
const question2 = getNextQuestion(symptoms2);
console.log('Next question:', question2.question);

// Test 3: Check malaria disease structure
console.log('\n3. Malaria disease config:');
const malariaKey = 'malaria';
console.log('Disease found:', !!medicalDictionary[malariaKey]);
if (medicalDictionary[malariaKey]) {
    console.log('Symptoms:', medicalDictionary[malariaKey].symptoms.primary);
    console.log('Questions:', medicalDictionary[malariaKey].questions);
}

// Test 4: Check what happens with matching symptoms
const symptoms3 = {
    fever_pattern: true,    // Question answered
    fever: 'present',       // Symptom present
    travel_history: true,   // Question answered
    recent_travel: 'present' // Risk factor present
};
console.log('\n4. Symptom + risk factor match - triage result:', enhancedTriage(symptoms3));
const question3 = getNextQuestion(symptoms3);
console.log('Next question:', question3.question);
console.log('Completed:', question3.completed);
