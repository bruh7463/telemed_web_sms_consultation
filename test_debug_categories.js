// Debug script to check why categories aren't mapping correctly
const { getCategoryQuestions } = require('./server/logic/medical_dictionary');

// Manually test the getCategoryQuestions function
console.log('=== Debugging Category Mapping ===\n');

const categories = [
  { id: '1', name: 'Fever/infections', expected: 'fever_pattern' },
  { id: '2', name: 'Respiratory', expected: 'cough_type' },
  { id: '3', name: 'Digestive', expected: 'diarrhea_type' },
  { id: '4', name: 'Heart', expected: 'chest_pain' },
  { id: '5', name: 'General', expected: 'fatigue_level' },
  { id: '6', name: 'Other', expected: 'fever_pattern' }
];

categories.forEach(cat => {
  const questions = getCategoryQuestions(cat.id);
  console.log(`Category ${cat.id} (${cat.name}):`);
  console.log(`  Questions: [${questions.join(', ')}]`);
  console.log(`  First question: "${questions[0]}" (expected: "${cat.expected}")`);
  console.log(`  ✓ MATCH: ${questions[0] === cat.expected ? 'YES' : 'NO - PROBLEM!'}\n`);
});
