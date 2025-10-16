// Test script to verify category-to-question mappings are correct
const { getCategoryQuestions, questionMappings, getNextQuestion } = require('../logic/medical_dictionary');

function testCategoryMappings() {
  console.log('='.repeat(80));
  console.log('CATEGORY TO QUESTION MAPPING VERIFICATION');
  console.log('='.repeat(80));

  const categoryMap = {
    '1': {
      name: 'Fever and Infections',
      expectedQuestions: ['fever_pattern', 'headache_severity', 'chills_presence', 'travel_history'],
      relatedDiseases: ['malaria', 'hiv_aids']
    },
    '2': {
      name: 'Respiratory Symptoms',
      expectedQuestions: ['cough_type', 'breathing_difficulty', 'fever_presence', 'chest_pain'],
      relatedDiseases: ['tuberculosis', 'respiratory_conditions']
    },
    '3': {
      name: 'Digestive Issues',
      expectedQuestions: ['diarrhea_type', 'abdominal_pain', 'blood_presence', 'dehydration_signs'],
      relatedDiseases: ['diarrheal_diseases']
    },
    '4': {
      name: 'Heart/Cardiovascular',
      expectedQuestions: ['chest_pain', 'breathing_difficulty', 'dizziness_presence', 'headache_frequency'],
      relatedDiseases: ['hypertension', 'emergencies']
    },
    '5': {
      name: 'General Symptoms',
      expectedQuestions: ['fatigue_level', 'weight_change', 'headache_frequency'],
      relatedDiseases: ['diabetes', 'mental_health']
    },
    '6': {
      name: 'Other Symptoms',
      expectedQuestions: ['fever_pattern', 'cough_type', 'breathing_difficulty', 'chest_pain', 'diarrhea_type', 'abdominal_pain'],
      relatedDiseases: ['stis', 'maternal_health']
    }
  };

  let allTestsPassed = true;

  console.log('Testing category question mappings...\n');

  for (const [categoryId, categoryInfo] of Object.entries(categoryMap)) {
    console.log(`🧩 Testing Category ${categoryId}: ${categoryInfo.name}`);
    console.log('-'.repeat(60));

    // Get actual questions for this category
    const actualQuestions = getCategoryQuestions(categoryId);
    console.log(`Expected questions: ${categoryInfo.expectedQuestions.join(', ')}`);
    console.log(`Actual questions:   ${actualQuestions.join(', ')}`);

    // Check if matches
    const mapped = categoryInfo.expectedQuestions.length === actualQuestions.length &&
                   categoryInfo.expectedQuestions.every(q => actualQuestions.includes(q));

    if (mapped) {
      console.log('✅ QUESTION MAPPING CORRECT');
    } else {
      console.log('❌ QUESTION MAPPING MISMATCH');
      allTestsPassed = false;
    }

    // Test conversation flow for this category
    console.log('\n📞 Testing conversation flow:');
    const emptySymptoms = {};
    const firstQuestion = getNextQuestion(emptySymptoms, null, categoryId);

    if (firstQuestion && !firstQuestion.completed) {
      const expectedFirstQuestion = categoryInfo.expectedQuestions[0];
      const actualFirstQuestion = firstQuestion.question;

      console.log(`Expected first question: "${questionMappings[expectedFirstQuestion]?.question}"`);
      console.log(`Actual first question:   "${actualFirstQuestion}"`);

      // Check if the question text matches expected
      const expectedQuestionText = questionMappings[expectedFirstQuestion]?.question;
      if (actualFirstQuestion === expectedQuestionText) {
        console.log('✅ FIRST QUESTION CORRECT');
      } else {
        console.log('❌ FIRST QUESTION MISMATCH');
        console.log(`   Expected: "${expectedQuestionText}"`);
        console.log(`   Got:      "${actualFirstQuestion}"`);
        allTestsPassed = false;
      }

      // Verify question exists in questionMappings based on the question text
      let questionKeyFound = null;
      for (const [key, q] of Object.entries(questionMappings)) {
        if (q.question === actualFirstQuestion) {
          questionKeyFound = key;
          break;
        }
      }

      if (questionKeyFound) {
        console.log('✅ QUESTION EXISTS IN MAPPINGS');
        console.log(`   Question key: "${questionKeyFound}"`);
        console.log(`   Options: [${questionMappings[questionKeyFound].options.join(', ')}]`);
      } else {
        console.log('❌ QUESTION NOT FOUND IN MAPPINGS');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ NO FIRST QUESTION GENERATED');
      allTestsPassed = false;
    }

    // Test related diseases use these questions
    console.log('\n🩺 Testing disease relevance:');
    if (categoryInfo.relatedDiseases && categoryInfo.relatedDiseases.length > 0) {
      console.log(`Diseases that should use Category ${categoryId}: ${categoryInfo.relatedDiseases.join(', ')}`);

      for (const diseaseKey of categoryInfo.relatedDiseases) {
        const disease = require('../logic/medical_dictionary').medicalDictionary[diseaseKey];
        if (disease && disease.questions) {
          const diseaseUsesCategoryQuestions = disease.questions.some(q =>
            categoryInfo.expectedQuestions.includes(q)
          );

          if (diseaseUsesCategoryQuestions) {
            console.log(`   ✅ ${disease.name} uses category questions`);
          } else {
            console.log(`   ❌ ${disease.name} does NOT use category questions`);
            console.log(`   Disease questions: ${disease.questions.join(', ')}`);
            allTestsPassed = false;
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
  }

  // Overall results
  console.log('\n🎯 FINAL RESULTS');
  console.log('='.repeat(30));

  if (allTestsPassed) {
    console.log('🎉 ALL CATEGORY MAPPINGS ARE CORRECT!');
    console.log('✅ Category questions are properly mapped');
    console.log('✅ Conversation flow starts with correct questions');
    console.log('✅ Diseases use appropriate category questions');
    console.log('✅ Questions exist in questionMappings');
  } else {
    console.log('⚠️ SOME CATEGORY MAPPINGS ARE INCORRECT');
    console.log('Review the output above for specific issues');
  }

  return allTestsPassed;
}

// Run the test
if (require.main === module) {
  console.log('🧪 Starting Category Mapping Verification...\n');
  const success = testCategoryMappings();

  if (success) {
    console.log('\n✅ CATEGORY MAPPING VERIFICATION PASSED');
  } else {
    console.log('\n❌ CATEGORY MAPPING VERIFICATION FAILED');
  }
}

module.exports = { testCategoryMappings };
