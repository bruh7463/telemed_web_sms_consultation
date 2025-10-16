// Test script to verify triage completion and results
const { enhancedTriage, getNextQuestion } = require('./server/logic/medical_dictionary');

console.log('=== Testing Triage Completion Flow ===\n');

// Simulate a digestive assessment flow
console.log('Simulating Digestive Symptom Assessment:');
const digestiveSymptoms = {
  'diarrhea': 'present',
  'diarrhea_type': 'answered',
  'abdominal_pain': 'answered',
  'severe_abdominal_pain': 'present',
  'blood_presence': 'answered',
  'dehydration_signs': 'answered',
  'six_times_daily': 'present', // User reports frequent diarrhea
  'mild_dehydration': 'present',
  'no_blood_in_stool': 'present'
};

console.log('1. Symptoms collected:', digestiveSymptoms);

const nextQuestion = getNextQuestion(digestiveSymptoms, null, '3'); // Category 3 = digestive
console.log('2. Next question check:', nextQuestion.completed ? 'COMPLETED' : 'Not completed yet');
if (nextQuestion.completed) {
    console.log('✓ Assessment completed after 5 answered questions');
}

if (nextQuestion.completed) {
    console.log('\n3. Triage Results:');
    const triageResult = enhancedTriage(digestiveSymptoms);
    console.log('Severity Level:', triageResult.urgency_level.toUpperCase());
    console.log('\nPossible Conditions:');
    triageResult.possible_conditions.forEach((condition, index) => {
        console.log(`${index + 1}. ${condition.disease} (${condition.confidence}% confidence)`);
        console.log(`   Matched symptoms: ${condition.matched_symptoms.join(', ')}`);
        console.log(`   STG Reference: ${condition.stg_reference}`);
    });

    console.log('\nRecommendations:');
    if (triageResult.recommendations && triageResult.recommendations.length > 0) {
        triageResult.recommendations.forEach(rec => console.log(`• ${rec}`));
    } else {
        console.log('• No specific recommendations (using fallbacks)');
    }

    console.log('\nActions:');
    if (triageResult.actions && triageResult.actions.length > 0) {
        triageResult.actions.forEach(action => console.log(`• ${action}`));
    } else {
        console.log('• No specific actions (using fallbacks)');
    }
}

// Test another scenario - respiratory symptoms
console.log('\n=== Testing Respiratory Symptom Assessment ===');
const respiratorySymptoms = {
  'cough': 'present',
  'cough_type': 'answered',
  'breathing_difficulty': 'answered',
  'breathing_difficulty_type': 'answered',
  'fever': 'present',
  'fever_presence': 'answered',
  'chest_pain': 'answered',
  'dry_cough': 'present',
  'severe_breathing_difficulty': 'present',
  'high_fever': 'present',
  'mild_chest_pain': 'present'
};

const respNextQuestion = getNextQuestion(respiratorySymptoms, null, '2');
console.log('Respiratory assessment completed:', respNextQuestion.completed);

if (respNextQuestion.completed) {
    console.log('\nRespiratory Triage Results:');
    const respTriage = enhancedTriage(respiratorySymptoms);
    console.log('Severity Level:', respTriage.urgency_level.toUpperCase());
    console.log('Top Condition:', respTriage.possible_conditions[0]?.disease || 'None matched');
    console.log('Confidence:', respTriage.possible_conditions[0]?.confidence || 0);
    if (respTriage.possible_conditions[0]?.stg_reference) {
        console.log('STG Reference:', respTriage.possible_conditions[0].stg_reference);
    }
}
