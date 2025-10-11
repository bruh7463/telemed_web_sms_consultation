// Quick test to demonstrate backend-driven questions with options
const { getNextQuestion } = require('./server/logic/medical_dictionary');

console.log('=== Backend-Driven Question Flow Demo ===\n');

// Start with no symptoms
console.log('1. Starting assessment with no symptoms:');
const question1 = getNextQuestion({});
console.log(`Question: ${question1.question}`);
if (question1.options) {
    console.log('Options:');
    question1.options.forEach((opt, idx) => console.log(`(${idx+1}) ${opt}`));
}

// Simulate user choosing option 1 (Less than 3 days fever)
console.log('\n2. User selects option 1 ("Less than 3 days" for fever):');
const symptoms1 = { 'fever_acute': 'present' };
const question2 = getNextQuestion(symptoms1);
console.log(`Question: ${question2.question}`);
if (question2.options) {
    console.log('Options:');
    question2.options.forEach((opt, idx) => console.log(`(${idx+1}) ${opt}`));
}

// Simulate user choosing option 1 (Dry cough)
console.log('\n3. User selects option 1 ("Dry cough"):');
const symptoms2 = { 'fever_acute': 'present', 'cough_dry': 'present' };
const question3 = getNextQuestion(symptoms2);
console.log(`Question: ${question3.question}`);
if (question3.options) {
    console.log('Options:');
    question3.options.forEach((opt, idx) => console.log(`(${idx+1}) ${opt}`));
}

console.log('\n4. With more symptoms, assessment might complete:');
const symptoms3 = {
    'fever_acute': 'present',
    'cough_dry': 'present',
    'malaria': 'possible',
    'travel_high_risk': 'present'
};
const question4 = getNextQuestion(symptoms3);
if (question4.completed) {
    console.log('Assessment completed - ready for triage!');
} else {
    console.log(`Next Question: ${question4.question}`);
}
