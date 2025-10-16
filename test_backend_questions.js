// Quick test to demonstrate category-based questions with category
const { getNextQuestion } = require('./server/logic/medical_dictionary');

console.log('=== Category-Based Question Flow Demo ===\n');

// Test digestive category (category '3')
console.log('Testing Digestive Category (3):');
console.log('Should ask diarrhea_type first, then abdominal_pain, etc.');

const symptomsDigestive = {};
const question1 = getNextQuestion({}, null, '3');
console.log(`First question: ${question1.question}`);
if (question1.options) {
    question1.options.forEach((opt, idx) => console.log(`(${idx+1}) ${opt}`));
}

console.log('\nSimulating user selects "Watery diarrhea":');
const symptomsDg2 = { 'diarrhea_type': 'answered', 'diarrhea': 'present' };
const question2 = getNextQuestion(symptomsDg2, null, '3');
console.log(`Second question: ${question2.question}`);
if (question2.options) {
    question2.options.forEach((opt, idx) => console.log(`(${idx+1}) ${opt}`));
}

console.log('\nSimulating user also has abdominal pain answered:');
const symptomsDg3 = { 'diarrhea_type': 'answered', 'diarrhea': 'present', 'abdominal_pain': 'answered', 'severe_abdominal_pain': 'present' };
const question3 = getNextQuestion(symptomsDg3, null, '3');
console.log(`Third question: ${question3.question}`);
if (question3.options) {
    question3.options.forEach((opt, idx) => console.log(`(${idx+1}) ${opt}`));
}

console.log('\nTesting Respiratory Category (2):');
console.log('Should ask cough_type first, then breathing_difficulty, etc.');

const symptomsResp = {};
const questionResp1 = getNextQuestion({}, null, '2');
console.log(`Respiratory first question: ${questionResp1.question}`);
if (questionResp1.options) {
    questionResp1.options.forEach((opt, idx) => console.log(`(${idx+1}) ${opt}`));
}

console.log('\n=== Testing Heart Category (4) ===');
console.log('Should ask chest_pain first, then breathing_difficulty, etc.');

const symptomsHeart = {};
const questionHeart1 = getNextQuestion({}, null, '4');
console.log(`Heart first question: ${questionHeart1.question}`);
if (questionHeart1.options) {
    questionHeart1.options.forEach((opt, idx) => console.log(`(${idx+1}) ${opt}`));
}

console.log('\n=== Testing General Category (5) ===');
console.log('Should ask fatigue_level first, then weight_change, etc.');

const symptomsGeneral = {};
const questionGeneral1 = getNextQuestion({}, null, '5');
console.log(`General first question: ${questionGeneral1.question}`);
if (questionGeneral1.options) {
    questionGeneral1.options.forEach((opt, idx) => console.log(`(${idx+1}) ${opt}`));
}

console.log('\n=== Testing Other Category (6) ===');
console.log('Should ask a mix of questions, often starting with fever_pattern');

const symptomsOther = {};
const questionOther1 = getNextQuestion({}, null, '6');
console.log(`Other first question: ${questionOther1.question}`);
if (questionOther1.options) {
    questionOther1.options.forEach((opt, idx) => console.log(`(${idx+1}) ${opt}`));
}

console.log('\n=== Testing Normal Flow Without Category (should still prioritize medically relevant questions) ===\n');

const questionNoCat = getNextQuestion({});
console.log(`Normal flow without category: ${questionNoCat.question}`);
if (questionNoCat.options) {
    questionNoCat.options.forEach((opt, idx) => console.log(`(${idx+1}) ${opt}`));
}
