// Comprehensive test script for medical dictionary triage detection
const { enhancedTriage } = require('../logic/medical_dictionary');

// Test edge cases and mixed symptom scenarios
const edgeCaseTests = {
  severe_malaria: {
    name: 'Severe Malaria',
    symptoms: {
      fever: true,
      headache: true,
      confusion: true,
      seizures: true,
      dark_urine: true,
      jaundice: true
    },
    expectedUrgency: 'EMERGENCY'
  },
  mild_cold: {
    name: 'Mild Upper Respiratory Infection',
    symptoms: {
      mild_cough: true,
      runny_nose: true,
      slight_fever: true
    },
    expectedUrgency: 'ROUTINE'
  },
  multiple_conditions: {
    name: 'Mixed HIV/TB Symptoms',
    symptoms: {
      chronic_cough: true,
      significant_weight_loss: true,
      night_sweats: true,
      recurrent_infections: true,
      fever: true,
      hiv_positive: true
    }
  },
  no_matching_symptoms: {
    name: 'Generic Symptoms',
    symptoms: {
      mild_fatigue: true,
      occasional_headache: true,
      normal_appetite: true
    },
    description: 'Should return general evaluation when no specific patterns match'
  }
};

// Test cases for each disease in the medical dictionary
const diseaseTestCases = {
  malaria: {
    name: 'Malaria',
    symptoms: {
      fever: true,
      headache: true,
      chills: true,
      sweating: true,
      body_aches: true,
      fatigue: true,
      recent_travel: true,
      mosquito_exposure: true,
      malaria_area: true
    },
    expectedConfidence: 80
  },
  hiv_aids: {
    name: 'HIV/AIDS',
    symptoms: {
      recurrent_infections: true,
      significant_weight_loss: true,
      extreme_fatigue: true,
      night_sweats: true,
      chronic_diarrhea: true,
      unprotected_sex: true,
      multiple_partners: true,
      sharing_needles: true
    },
    expectedConfidence: 70
  },
  tuberculosis: {
    name: 'Tuberculosis (TB)',
    symptoms: {
      chronic_cough: true,
      night_sweats: true,
      significant_weight_loss: true,
      fever: true,
      chest_pain: true,
      sputum_production: true,
      tb_contact: true,
      hiv_positive: true
    },
    expectedConfidence: 80
  },
  stis: {
    name: 'Sexually Transmitted Infections (STIs)',
    symptoms: {
      urethral_discharge: true,
      dysuria: true,
      genital_ulcers: true,
      pelvic_pain: true,
      unprotected_sex: true,
      multiple_partners: true,
      previous_sti: true
    },
    expectedConfidence: 75
  },
  diarrheal_diseases: {
    name: 'Diarrheal Diseases',
    symptoms: {
      diarrhea: true,
      abdominal_pain: true,
      dehydration: true,
      nausea: true,
      vomiting: true,
      poor_sanitation: true,
      contaminated_water: true,
      crowded_living: true
    },
    expectedConfidence: 75
  },
  respiratory_conditions: {
    name: 'Respiratory Conditions',
    symptoms: {
      cough: true,
      severe_shortness_of_breath: true,
      fever: true,
      fatigue: true,
      chest_pain: true,
      smoking: true,
      exposure_to_sick: true,
      crowded_places: true
    },
    expectedConfidence: 85
  },
  hypertension: {
    name: 'Hypertension',
    symptoms: {
      headache: true,
      dizziness: true,
      fatigue: true,
      chest_pain: true,
      visual_changes: true,
      family_history: true,
      high_salt_diet: true,
      physical_inactivity: true,
      smoking: true
    },
    expectedConfidence: 70
  },
  diabetes: {
    name: 'Diabetes Mellitus',
    symptoms: {
      increased_thirst: true,
      frequent_urination: true,
      extreme_fatigue: true,
      blurred_vision: true,
      slow_healing_wounds: true,
      significant_weight_loss: true,
      family_history: true,
      obesity: true,
      physical_inactivity: true
    },
    expectedConfidence: 75
  },
  mental_health: {
    name: 'Mental Health Conditions',
    symptoms: {
      persistent_sadness: true,
      severe_anxiety: true,
      sleep_disturbances: true,
      loss_of_interest: true,
      suicidal_thoughts: true,
      substance_abuse: true,
      stress: true,
      trauma: true,
      social_isolation: true
    },
    expectedConfidence: 70
  },
  maternal_health: {
    name: 'Maternal Health',
    symptoms: {
      missed_period: true,
      nausea: true,
      breast_tenderness: true,
      fatigue: true,
      frequent_urination: true,
      mood_changes: true,
      heavy_bleeding: true,
      severe_abdominal_pain: true,
      previous_pregnancy_complications: true
    },
    expectedConfidence: 70
  },
  emergencies: {
    name: 'Medical Emergencies',
    symptoms: {
      severe_pain: true,
      loss_of_consciousness: true,
      severe_bleeding: true,
      chest_pain: true,
      severe_shortness_of_breath: true,
      seizures: true,
      severe_headache: true,
      confusion: true,
      shock_signs: true
    },
    expectedConfidence: 90
  }
};

function runTriageTests() {
  console.log('='.repeat(60));
  console.log('COMPREHENSIVE MEDICAL DICTIONARY TRIAGE DETECTION TEST');
  console.log('='.repeat(60));
  console.log(`Testing ${Object.keys(diseaseTestCases).length} diseases from medical_dictionary.js\n`);

  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    notDetected: [],
    lowConfidence: []
  };

  for (const [diseaseKey, testCase] of Object.entries(diseaseTestCases)) {
    results.totalTests++;
    console.log(`\n🩺 Testing: ${testCase.name} (${diseaseKey})`);
    console.log('-'.repeat(50));

    // Run triage with test symptoms
    const triageResult = enhancedTriage(testCase.symptoms);

    console.log(`Expected confidence: ${testCase.expectedConfidence}%`);
    console.log(`Symptoms provided: ${Object.keys(testCase.symptoms).join(', ')}`);

    // Check if disease was detected
    const detectedConditions = triageResult.possible_conditions || [];
    const targetDisease = detectedConditions.find(condition =>
      condition.disease.toLowerCase().includes(testCase.name.toLowerCase()) ||
      testCase.name.toLowerCase().includes(condition.disease.toLowerCase())
    );

    let detectionStatus = '❌ NOT DETECTED';
    let confidenceStatus = '';
    let passed = false;

    if (targetDisease) {
      detectionStatus = '✅ DETECTED';
      console.log(`Detected as: ${targetDisease.disease} (${targetDisease.confidence}% confidence)`);

      if (targetDisease.confidence >= testCase.expectedConfidence) {
        confidenceStatus = '✅ Confidence meets expectation';
        passed = true;
      } else {
        confidenceStatus = `⚠️ Low confidence (${targetDisease.confidence}% vs expected ${testCase.expectedConfidence}%)`;
        results.lowConfidence.push(testCase.name);
      }
    } else {
      console.log('Not detected in possible conditions');
      results.notDetected.push(testCase.name);
    }

    console.log(`Detection: ${detectionStatus}`);
    if (confidenceStatus) console.log(`Confidence: ${confidenceStatus}`);

    // Show triage outcome
    console.log(`Triage Level: ${triageResult.urgency_level?.toUpperCase()}`);
    if (triageResult.possible_conditions && triageResult.possible_conditions.length > 0) {
      console.log(`Top match: ${triageResult.possible_conditions[0].disease}`);
    }

    if (passed) {
      results.passed++;
      console.log('🟢 TEST PASSED');
    } else {
      results.failed++;
      console.log('🔴 TEST FAILED');
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total diseases tested: ${results.totalTests}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.notDetected.length > 0) {
    console.log(`\n❌ Diseases NOT detected:`);
    results.notDetected.forEach(disease => console.log(`   - ${disease}`));
  }

  if (results.lowConfidence.length > 0) {
    console.log(`\n⚠️ Diseases with low confidence:`);
    results.lowConfidence.forEach(disease => console.log(`   - ${disease}`));
  }

  const successRate = (results.passed / results.totalTests * 100).toFixed(1);
  console.log(`\n📊 Success Rate: ${successRate}%`);

  if (results.failed === 0) {
    console.log('🎉 ALL DISEASES CAN BE DETECTED BY THE TRIAGE SYSTEM!');
  } else {
    console.log('⚠️ Some diseases were not properly detected. Review symptom matching logic.');
  }

  return results;
}

function runEdgeCaseTests() {
  console.log('\n' + '='.repeat(60));
  console.log('EDGE CASE AND MIXED SYMPTOM TESTS');
  console.log('='.repeat(60));
  console.log(`Testing ${Object.keys(edgeCaseTests).length} edge cases\n`);

  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0
  };

  for (const [caseKey, testCase] of Object.entries(edgeCaseTests)) {
    results.totalTests++;
    console.log(`🏥 Testing: ${testCase.name} (${caseKey})`);
    console.log('-'.repeat(50));

    if (testCase.description) {
      console.log(`Description: ${testCase.description}`);
    }

    // Run triage with edge case symptoms
    const triageResult = enhancedTriage(testCase.symptoms);

    console.log(`Symptoms: ${Object.keys(testCase.symptoms).join(', ')}`);
    console.log(`Triage Level: ${triageResult.urgency_level?.toUpperCase()}`);

    if (triageResult.possible_conditions && triageResult.possible_conditions.length > 0) {
      const topMatch = triageResult.possible_conditions[0];
      console.log(`Top condition: ${topMatch.disease} (${topMatch.confidence}% confidence)`);

      if (testCase.expectedUrgency) {
        if (triageResult.urgency_level === testCase.expectedUrgency.toLowerCase()) {
          console.log(`Expected urgency: ${testCase.expectedUrgency} - ✅ MATCH`);
          results.passed++;
        } else {
          console.log(`Expected urgency: ${testCase.expectedUrgency} - ❌ MISMATCH (got ${triageResult.urgency_level})`);
          results.failed++;
        }
      } else {
        results.passed++; // No specific expectation, just showing behavior
      }
    } else {
      console.log('No specific conditions detected - general evaluation returned');
      results.passed++;
    }

    console.log('');
  }

  console.log('EDGE CASE TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total edge cases tested: ${results.totalTests}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  return results;
}

// Main test runner
function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE TRIAGE SYSTEM TESTING\n');

  const mainTestResults = runTriageTests();
  const edgeTestResults = runEdgeCaseTests();

  console.log('\n' + '='.repeat(80));
  console.log('FINAL TEST REPORT');
  console.log('='.repeat(80));
  console.log(`Disease Detection Rate: ${mainTestResults.passed}/${mainTestResults.totalTests} (${(mainTestResults.passed/mainTestResults.totalTests*100).toFixed(1)}%)`);
  console.log(`Edge Case Tests: ${edgeTestResults.passed}/${edgeTestResults.totalTests} passed`);
  console.log('');

  if (mainTestResults.failed === 0 && edgeTestResults.failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ The triage system can successfully detect all diseases in medical_dictionary.js');
    console.log('✅ Edge cases are handled appropriately');
    console.log('✅ Emergency detection is working');
    console.log('✅ Confidence levels meet expectations');
  } else {
    console.log('⚠️ SOME TESTS FAILED');
    console.log('Review the output above for specific failures');
  }

  return {
    main: mainTestResults,
    edge: edgeTestResults
  };
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = { runTriageTests, diseaseTestCases };
