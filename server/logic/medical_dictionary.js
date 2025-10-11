// File: server/logic/medical_dictionary.js
// Description: Comprehensive medical dictionary based on Zambia Standard Treatment Guidelines
// Contains disease patterns, symptoms, treatments, and triage logic for prevalent diseases

const medicalDictionary = {
  // COMMUNICABLE DISEASES
  malaria: {
    id: 'malaria',
    name: 'Malaria',
    category: 'communicable',
    priority: 'high',
    description: 'Life-threatening infection caused by Plasmodium parasites, most commonly P. falciparum in Zambia',

    // Symptom patterns
    symptoms: {
      primary: ['fever', 'headache', 'chills', 'sweating'],
      secondary: ['body_aches', 'fatigue', 'nausea', 'loss_of_appetite'],
      severe: ['confusion', 'seizures', 'dark_urine', 'jaundice', 'severe_anemia']
    },

    // Risk factors
    riskFactors: [
      'recent_travel',
      'mosquito_exposure',
      'rainy_season',
      'living_in_malaria_area',
      'no_bed_net_usage'
    ],

    // Key questions for diagnosis
    questions: [
      'fever_pattern',
      'travel_history',
      'mosquito_bites',
      'headache_severity',
      'chills_presence'
    ],

    // Triage logic
    triage: {
      emergency: {
        conditions: ['severe_anemia', 'confusion', 'seizures', 'jaundice'],
        action: 'Seek immediate medical attention at nearest hospital',
        urgency: 'emergency'
      },
      urgent: {
        conditions: ['fever_more_than_3_days', 'severe_headache', 'repeated_vomiting'],
        action: 'Contact hospital for immediate evaluation',
        urgency: 'urgent'
      },
      routine: {
        conditions: ['mild_fever', 'body_aches', 'fatigue'],
        action: 'Schedule consultation, monitor symptoms',
        urgency: 'routine'
      }
    },

    // Treatment guidelines (from Zambia STG Section 5.1)
    treatment: {
      uncomplicated: {
        first_line: 'Artemether-Lumefantrine (AL)',
        dosage: 'Weight-based dosing for 3 days',
        alternative: 'Dihydroartemisinin-Piperaquine'
      },
      severe: {
        first_line: 'Injectable Artesunate',
        dosage: '2.4mg/kg IV/IM at 0, 12, 24 hours, then daily',
        alternative: 'Quinine in first trimester of pregnancy'
      },
      prevention: {
        method: 'Intermittent Preventive Treatment (IPT-SP)',
        target: 'Pregnant women from 13 weeks gestation',
        dosage: '3 tablets monthly, up to 6 doses'
      }
    },

    // References to STG sections
    stg_reference: '5.1 MALARIA'
  },

  // HIV/AIDS
  hiv_aids: {
    id: 'hiv_aids',
    name: 'HIV/AIDS',
    category: 'communicable',
    priority: 'high',
    description: 'Chronic viral infection that attacks the immune system, leading to AIDS when untreated',

    symptoms: {
      primary: ['recurrent_infections', 'weight_loss', 'chronic_fatigue'],
      secondary: ['night_sweats', 'persistent_fever', 'chronic_diarrhea'],
      severe: ['opportunistic_infections', 'severe_weight_loss', 'chronic_cough']
    },

    riskFactors: [
      'unprotected_sex',
      'multiple_partners',
      'sharing_needles',
      'blood_transfusion_history',
      'mother_to_child'
    ],

    questions: [
      'recurrent_infections',
      'weight_loss_amount',
      'chronic_fatigue',
      'risk_factors',
      'previous_testing'
    ],

    triage: {
      emergency: {
        conditions: ['opportunistic_infections', 'severe_weight_loss', 'pneumonia'],
        action: 'Seek immediate HIV testing and treatment',
        urgency: 'emergency'
      },
      urgent: {
        conditions: ['recurrent_infections', 'significant_weight_loss'],
        action: 'Get HIV test and schedule consultation',
        urgency: 'urgent'
      },
      routine: {
        conditions: ['chronic_fatigue', 'risk_factors_present'],
        action: 'Get HIV test and regular check-ups',
        urgency: 'routine'
      }
    },

    treatment: {
      art: {
        first_line: 'TDF + XTC + DTG',
        alternative: 'AZT + 3TC + LPV/r',
        when_to_start: 'All HIV positive individuals regardless of CD4 count'
      },
      prevention: {
        prep: 'TDF + FTC for high-risk individuals',
        pep: '28-day course within 72 hours of exposure'
      }
    },

    stg_reference: '5.4 HUMAN IMMUNODEFICIENCY VIRUS (HIV)'
  },

  // TUBERCULOSIS
  tuberculosis: {
    id: 'tuberculosis',
    name: 'Tuberculosis (TB)',
    category: 'communicable',
    priority: 'high',
    description: 'Chronic bacterial infection caused by Mycobacterium tuberculosis, primarily affecting lungs',

    symptoms: {
      primary: ['chronic_cough', 'fever', 'night_sweats'],
      secondary: ['weight_loss', 'fatigue', 'chest_pain'],
      severe: ['hemoptysis', 'severe_weight_loss', 'respiratory_distress']
    },

    riskFactors: [
      'tb_contact',
      'hiv_positive',
      'diabetes',
      'smoking',
      'poor_nutrition'
    ],

    questions: [
      'cough_duration',
      'sputum_production',
      'night_sweats',
      'tb_exposure',
      'hiv_status'
    ],

    triage: {
      emergency: {
        conditions: ['hemoptysis', 'severe_respiratory_distress', 'altered_mental_status'],
        action: 'Seek immediate medical attention - possible TB emergency',
        urgency: 'emergency'
      },
      urgent: {
        conditions: ['chronic_cough_more_than_2_weeks', 'significant_weight_loss'],
        action: 'Get TB testing and schedule consultation',
        urgency: 'urgent'
      },
      routine: {
        conditions: ['persistent_cough', 'tb_contact_history'],
        action: 'Get TB screening and monitor symptoms',
        urgency: 'routine'
      }
    },

    treatment: {
      drug_sensitive: {
        intensive_phase: '2HRZE (2 months)',
        continuation_phase: '4RH (4 months)',
        total_duration: '6 months'
      },
      drug_resistant: {
        regimen: 'Individualized based on resistance pattern',
        duration: '18-20 months'
      }
    },

    stg_reference: '5.2 TUBERCULOSIS'
  },

  // SEXUALLY TRANSMITTED INFECTIONS
  stis: {
    id: 'stis',
    name: 'Sexually Transmitted Infections (STIs)',
    category: 'communicable',
    priority: 'medium',
    description: 'Infections transmitted through sexual contact, including gonorrhea, chlamydia, syphilis',

    symptoms: {
      primary: ['urethral_discharge', 'vaginal_discharge', 'genital_ulcers'],
      secondary: ['dysuria', 'pelvic_pain', 'genital_itching'],
      severe: ['lower_abdominal_pain', 'fever_with_discharge']
    },

    riskFactors: [
      'multiple_partners',
      'unprotected_sex',
      'previous_sti',
      'sex_worker',
      'adolescent'
    ],

    questions: [
      'discharge_type',
      'ulcer_presence',
      'pain_location',
      'partner_symptoms',
      'contraception_use'
    ],

    triage: {
      emergency: {
        conditions: ['severe_pelvic_pain', 'high_fever_with_discharge'],
        action: 'Seek immediate medical attention - possible PID',
        urgency: 'emergency'
      },
      urgent: {
        conditions: ['genital_ulcers', 'abdominal_pain'],
        action: 'Schedule urgent consultation for STI testing',
        urgency: 'urgent'
      },
      routine: {
        conditions: ['discharge', 'itching', 'mild_dysuria'],
        action: 'Schedule consultation for STI screening',
        urgency: 'routine'
      }
    },

    treatment: {
      urethral_discharge: {
        regimen: 'Ceftriaxone 500mg IM + Doxycycline 100mg BD for 7 days',
        alternative: 'Azithromycin 1g single dose'
      },
      genital_ulcers: {
        regimen: 'Benzathine Penicillin 2.4MU IM + Doxycycline 100mg BD for 21 days',
        alternative: 'Erythromycin for penicillin allergy'
      }
    },

    stg_reference: '5.10.1 SEXUALLY TRANSMITTED INFECTIONS (STI)'
  },

  // DIARRHEAL DISEASES
  diarrheal_diseases: {
    id: 'diarrheal_diseases',
    name: 'Diarrheal Diseases',
    category: 'communicable',
    priority: 'high',
    description: 'Infectious diseases causing diarrhea, including cholera and dysentery',

    symptoms: {
      primary: ['diarrhea', 'abdominal_pain', 'dehydration'],
      secondary: ['nausea', 'vomiting', 'fever'],
      severe: ['bloody_diarrhea', 'severe_dehydration', 'shock']
    },

    riskFactors: [
      'poor_sanitation',
      'contaminated_water',
      'poor_hygiene',
      'malnutrition',
      'crowded_living'
    ],

    questions: [
      'diarrhea_type',
      'frequency',
      'blood_presence',
      'dehydration_signs',
      'water_source'
    ],

    triage: {
      emergency: {
        conditions: ['severe_dehydration', 'bloody_diarrhea', 'shock_signs'],
        action: 'Seek immediate medical attention - possible cholera or severe dehydration',
        urgency: 'emergency'
      },
      urgent: {
        conditions: ['frequent_watery_diarrhea', 'moderate_dehydration'],
        action: 'Start ORS immediately and seek medical care',
        urgency: 'urgent'
      },
      routine: {
        conditions: ['mild_diarrhea', 'no_dehydration'],
        action: 'Use ORS, maintain hydration, monitor symptoms',
        urgency: 'routine'
      }
    },

    treatment: {
      cholera: {
        regimen: 'Doxycycline 300mg single dose OR Erythromycin 500mg QID for 3 days',
        hydration: 'Aggressive ORS/IV fluids based on dehydration level'
      },
      dysentery: {
        regimen: 'Ciprofloxacin 500mg BD for 3 days',
        alternative: 'Azithromycin 1g single dose'
      }
    },

    stg_reference: '5.9.2 DIARRHOEA, 5.9.4 CHOLERA'
  },

  // RESPIRATORY TRACT CONDITIONS
  respiratory_conditions: {
    id: 'respiratory_conditions',
    name: 'Respiratory Conditions',
    category: 'mixed',
    priority: 'high',
    description: 'Conditions affecting the respiratory system including COVID-19, pneumonia, asthma',

    symptoms: {
      primary: ['cough', 'breathing_difficulty', 'chest_pain'],
      secondary: ['fever', 'fatigue', 'runny_nose'],
      severe: ['severe_shortness_of_breath', 'cyanosis', 'confusion']
    },

    riskFactors: [
      'smoking',
      'exposure_to_sick',
      'crowded_places',
      'poor_ventilation',
      'asthma_history'
    ],

    questions: [
      'cough_type',
      'breathing_difficulty',
      'fever_presence',
      'exposure_history',
      'vaccination_status'
    ],

    triage: {
      emergency: {
        conditions: ['severe_breathing_difficulty', 'cyanosis', 'cannot_complete_sentences'],
        action: 'Seek immediate emergency care - possible severe COVID-19 or pneumonia',
        urgency: 'emergency'
      },
      urgent: {
        conditions: ['moderate_breathing_difficulty', 'high_fever_with_cough'],
        action: 'Schedule urgent consultation for evaluation',
        urgency: 'urgent'
      },
      routine: {
        conditions: ['mild_cough', 'runny_nose', 'no_fever'],
        action: 'Monitor symptoms, schedule if persists',
        urgency: 'routine'
      }
    },

    treatment: {
      covid19: {
        mild: 'Isolation, symptom management, monitor oxygen saturation',
        severe: 'Hospitalization, oxygen therapy, dexamethasone, remdesivir'
      },
      pneumonia: {
        regimen: 'Amoxicillin 500mg TDS for 5 days',
        severe: 'Ceftriaxone + Azithromycin'
      }
    },

    stg_reference: '5.7 RESPIRATORY TRACT CONDITIONS'
  },

  // NON-COMMUNICABLE DISEASES
  hypertension: {
    id: 'hypertension',
    name: 'Hypertension',
    category: 'non_communicable',
    priority: 'medium',
    description: 'Persistent elevation of blood pressure above normal levels',

    symptoms: {
      primary: ['headache', 'dizziness', 'fatigue'],
      secondary: ['chest_pain', 'shortness_of_breath', 'visual_changes'],
      severe: ['severe_headache', 'confusion', 'chest_pain']
    },

    riskFactors: [
      'family_history',
      'obesity',
      'high_salt_diet',
      'physical_inactivity',
      'smoking',
      'diabetes'
    ],

    questions: [
      'headache_frequency',
      'dizziness_presence',
      'family_history',
      'lifestyle_factors',
      'medication_history'
    ],

    triage: {
      emergency: {
        conditions: ['severe_headache', 'chest_pain', 'visual_disturbances'],
        action: 'Seek immediate medical attention - possible hypertensive crisis',
        urgency: 'emergency'
      },
      urgent: {
        conditions: ['persistent_headache', 'dizziness', 'fatigue'],
        action: 'Schedule consultation for blood pressure check',
        urgency: 'urgent'
      },
      routine: {
        conditions: ['no_symptoms', 'family_history_only'],
        action: 'Schedule routine check-up for screening',
        urgency: 'routine'
      }
    },

    treatment: {
      first_line: 'Lifestyle modification + medication if needed',
      medications: ['Hydrochlorothiazide', 'Amlodipine', 'Enalapril'],
      target: 'BP < 130/80 mmHg'
    },

    stg_reference: '5.6.1 HYPERTENSION'
  },

  diabetes: {
    id: 'diabetes',
    name: 'Diabetes Mellitus',
    category: 'non_communicable',
    priority: 'medium',
    description: 'Chronic metabolic disorder characterized by high blood glucose levels',

    symptoms: {
      primary: ['increased_thirst', 'frequent_urination', 'fatigue'],
      secondary: ['weight_loss', 'blurred_vision', 'slow_healing_wounds'],
      severe: ['confusion', 'fruity_breath', 'rapid_breathing']
    },

    riskFactors: [
      'family_history',
      'obesity',
      'physical_inactivity',
      'poor_diet',
      'age_over_40'
    ],

    questions: [
      'thirst_frequency',
      'urination_pattern',
      'weight_changes',
      'family_history',
      'lifestyle_factors'
    ],

    triage: {
      emergency: {
        conditions: ['confusion', 'fruity_breath', 'rapid_breathing', 'severe_dehydration'],
        action: 'Seek immediate medical attention - possible DKA',
        urgency: 'emergency'
      },
      urgent: {
        conditions: ['excessive_thirst', 'frequent_urination', 'fatigue'],
        action: 'Schedule urgent consultation for diabetes screening',
        urgency: 'urgent'
      },
      routine: {
        conditions: ['family_history', 'risk_factors'],
        action: 'Schedule routine screening',
        urgency: 'routine'
      }
    },

    treatment: {
      type1: {
        regimen: 'Insulin therapy (basal-bolus or premixed)',
        monitoring: 'Regular blood glucose monitoring'
      },
      type2: {
        first_line: 'Metformin + lifestyle modification',
        second_line: 'Add sulphonylurea or DPP4 inhibitor'
      }
    },

    stg_reference: '5.8.1 DIABETES MELLITUS'
  },

  // MENTAL HEALTH CONDITIONS
  mental_health: {
    id: 'mental_health',
    name: 'Mental Health Conditions',
    category: 'mental_health',
    priority: 'medium',
    description: 'Various mental health conditions including depression, anxiety, and psychosis',

    symptoms: {
      primary: ['persistent_sadness', 'anxiety', 'sleep_disturbances'],
      secondary: ['loss_of_interest', 'irritability', 'concentration_difficulty'],
      severe: ['suicidal_thoughts', 'psychotic_symptoms', 'severe_depression']
    },

    riskFactors: [
      'family_history',
      'stress',
      'trauma',
      'substance_abuse',
      'social_isolation'
    ],

    questions: [
      'mood_changes',
      'sleep_pattern',
      'suicidal_thoughts',
      'substance_use',
      'social_support'
    ],

    triage: {
      emergency: {
        conditions: ['suicidal_thoughts', 'psychotic_symptoms', 'severe_agitation'],
        action: 'Seek immediate mental health emergency care',
        urgency: 'emergency'
      },
      urgent: {
        conditions: ['severe_depression', 'panic_attacks', 'severe_anxiety'],
        action: 'Schedule urgent mental health consultation',
        urgency: 'urgent'
      },
      routine: {
        conditions: ['mild_depression', 'stress', 'sleep_issues'],
        action: 'Schedule mental health consultation',
        urgency: 'routine'
      }
    },

    treatment: {
      depression: {
        first_line: 'Fluoxetine or Amitriptyline',
        therapy: 'Cognitive Behavioral Therapy'
      },
      anxiety: {
        first_line: 'SSRIs or Benzodiazepines (short-term)',
        therapy: 'Counseling and relaxation techniques'
      }
    },

    stg_reference: '5.5.1 PSYCHIATRIC CONDITIONS'
  },

  // MATERNAL AND CHILD HEALTH
  maternal_health: {
    id: 'maternal_health',
    name: 'Maternal Health',
    category: 'maternal',
    priority: 'high',
    description: 'Conditions related to pregnancy, childbirth, and postpartum period',

    symptoms: {
      primary: ['missed_period', 'nausea', 'breast_tenderness'],
      secondary: ['fatigue', 'frequent_urination', 'mood_changes'],
      severe: ['severe_abdominal_pain', 'heavy_bleeding', 'severe_headache']
    },

    riskFactors: [
      'previous_pregnancy_complications',
      'chronic_conditions',
      'advanced_maternal_age',
      'multiple_pregnancy'
    ],

    questions: [
      'last_menstrual_period',
      'pregnancy_symptoms',
      'bleeding_presence',
      'pain_location',
      'fetal_movement'
    ],

    triage: {
      emergency: {
        conditions: ['severe_abdominal_pain', 'heavy_bleeding', 'seizures'],
        action: 'Seek immediate obstetric emergency care',
        urgency: 'emergency'
      },
      urgent: {
        conditions: ['moderate_bleeding', 'severe_nausea', 'headache'],
        action: 'Contact antenatal clinic immediately',
        urgency: 'urgent'
      },
      routine: {
        conditions: ['pregnancy_symptoms', 'routine_checkup'],
        action: 'Schedule antenatal consultation',
        urgency: 'routine'
      }
    },

    treatment: {
      antenatal_care: {
        schedule: 'Minimum 8 contacts throughout pregnancy',
        interventions: 'Iron supplementation, malaria prophylaxis, HIV testing'
      },
      complications: {
        pre_eclampsia: 'Magnesium sulphate, antihypertensive medication',
        hemorrhage: 'Oxytocin, tranexamic acid, blood transfusion'
      }
    },

    stg_reference: '6.0 OBSTETRIC AND GYNAECOLOGICAL CONDITIONS'
  },

  // EMERGENCY CONDITIONS
  emergencies: {
    id: 'emergencies',
    name: 'Medical Emergencies',
    category: 'emergency',
    priority: 'critical',
    description: 'Life-threatening conditions requiring immediate medical attention',

    symptoms: {
      primary: ['severe_pain', 'loss_of_consciousness', 'severe_bleeding'],
      secondary: ['chest_pain', 'severe_shortness_of_breath', 'seizures'],
      severe: ['cardiac_arrest', 'severe_trauma', 'anaphylaxis']
    },

    riskFactors: [
      'trauma',
      'severe_allergy',
      'heart_disease',
      'respiratory_conditions'
    ],

    questions: [
      'symptom_severity',
      'onset_time',
      'associated_symptoms',
      'medical_history',
      'medication_allergies'
    ],

    triage: {
      emergency: {
        conditions: ['chest_pain', 'severe_shortness_of_breath', 'seizures', 'severe_bleeding'],
        action: 'CALL EMERGENCY SERVICES IMMEDIATELY - Do not drive to hospital',
        urgency: 'emergency'
      },
      urgent: {
        conditions: ['severe_pain', 'dizziness', 'confusion'],
        action: 'Go to nearest emergency department immediately',
        urgency: 'urgent'
      },
      routine: {
        conditions: ['mild_symptoms', 'chronic_conditions'],
        action: 'Schedule consultation for evaluation',
        urgency: 'routine'
      }
    },

    treatment: {
      cpr: {
        procedure: '30 compressions : 2 breaths, 100-120 compressions/minute',
        depth: '5-6 cm in adults'
      },
      shock: {
        management: 'IV fluids, identify and treat cause',
        monitoring: 'Blood pressure, urine output, mental status'
      }
    },

    stg_reference: '1.0 EMERGENCIES AND POISONS'
  }
};

// Question mappings for Dialogflow
const questionMappings = {
  fever_pattern: {
    question: 'How long have you had the fever?',
    options: ['Less than 3 days', '3-7 days', '1-2 weeks', 'More than 2 weeks'],
    mapping: {
      'Less than 3 days': 'fever', // Directly to symptom name
      '3-7 days': 'fever',
      '1-2 weeks': 'fever',
      'More than 2 weeks': 'fever'
    }
  },

  travel_history: {
    question: 'Have you traveled recently or been in a malaria area?',
    options: ['Yes, recently', 'Yes, within month', 'No travel'],
    mapping: {
      'Yes, recently': 'recent_travel',
      'Yes, within month': 'recent_travel',
      'No travel': 'no_recent_travel'
    }
  },

  mosquito_bites: {
    question: 'Have you been bitten by mosquitoes recently?',
    options: ['Yes, many bites', 'Yes, few bites', 'No bites'],
    mapping: {
      'Yes, many bites': 'mosquito_exposure',
      'Yes, few bites': 'mosquito_exposure',
      'No bites': 'no_mosquito_exposure'
    }
  },

  cough_type: {
    question: 'What type of cough do you have?',
    options: ['Dry cough', 'Cough with phlegm', 'Coughing up blood', 'Barking cough'],
    mapping: {
      'Dry cough': 'cough',
      'Cough with phlegm': 'cough',
      'Coughing up blood': 'hemoptysis',
      'Barking cough': 'cough'
    }
  },

  breathing_difficulty: {
    question: 'Are you having difficulty breathing?',
    options: ['Yes, severe (can\'t complete sentences)', 'Yes, moderate (short of breath with activity)', 'Mild (only with heavy activity)', 'No difficulty'],
    mapping: {
      'Yes, severe (can\'t complete sentences)': 'severe_shortness_of_breath',
      'Yes, moderate (short of breath with activity)': 'breathing_difficulty',
      'Mild (only with heavy activity)': 'breathing_difficulty',
      'No difficulty': 'normal_breathing'
    }
  },

  diarrhea_type: {
    question: 'What type of diarrhea are you experiencing?',
    options: ['Watery diarrhea', 'Bloody diarrhea', 'Diarrhea with mucus', 'No diarrhea'],
    mapping: {
      'Watery diarrhea': 'diarrhea',
      'Bloody diarrhea': 'bloody_diarrhea',
      'Diarrhea with mucus': 'diarrhea',
      'No diarrhea': 'no_diarrhea'
    }
  },

  abdominal_pain: {
    question: 'Are you having abdominal pain?',
    options: ['Severe pain', 'Moderate pain', 'Mild cramps', 'No abdominal pain'],
    mapping: {
      'Severe pain': 'severe_abdominal_pain',
      'Moderate pain': 'abdominal_pain',
      'Mild cramps': 'abdominal_pain',
      'No abdominal pain': 'no_abdominal_pain'
    }
  }
};

// Symptom severity scoring
const severityScores = {
  // Fever
  'fever_acute': 4,
  'fever_subacute': 3,
  'fever_persistent': 2,
  'fever_chronic': 1,

  // Cough
  'cough_dry': 4,
  'cough_productive': 3,
  'cough_bloody': 1,
  'cough_barking': 2,

  // Breathing
  'breathing_severe': 1,
  'breathing_moderate': 2,
  'breathing_mild': 3,
  'breathing_none': 4,

  // Diarrhea
  'diarrhea_watery': 3,
  'diarrhea_bloody': 1,
  'diarrhea_mucoid': 2,
  'diarrhea_none': 4,

  // Pain
  'pain_severe': 1,
  'pain_moderate': 2,
  'pain_mild': 3,
  'pain_none': 4
};

// Disease pattern recognition
const diseasePatterns = {
  malaria_suspected: {
    symptoms: ['fever', 'headache', 'chills'],
    risk_factors: ['travel_high_risk', 'mosquito_high_exposure'],
    confidence: 85
  },

  severe_malaria: {
    symptoms: ['fever', 'confusion', 'seizures'],
    risk_factors: ['travel_high_risk'],
    confidence: 95
  },

  respiratory_infection: {
    symptoms: ['cough', 'fever', 'breathing_difficulty'],
    risk_factors: ['exposure_to_sick'],
    confidence: 75
  },

  gastrointestinal_infection: {
    symptoms: ['diarrhea', 'abdominal_pain', 'nausea'],
    risk_factors: ['poor_sanitation'],
    confidence: 70
  }
};

/**
 * Enhanced triage function using the medical dictionary
 * @param {object} userSymptoms - Object containing user symptom responses
 * @returns {object} - Detailed triage recommendation
 */
function enhancedTriage(userSymptoms) {
  const results = {
    possible_conditions: [],
    urgency_level: 'routine',
    recommendations: [],
    actions: []
  };

  // Pattern matching for each disease
  for (const [diseaseKey, disease] of Object.entries(medicalDictionary)) {
    let matchScore = 0;
    let matchedSymptoms = [];
    let riskFactors = [];

    // Check symptom matches
    for (const symptom of disease.symptoms.primary) {
      if (userSymptoms[symptom]) {
        matchScore += 30;
        matchedSymptoms.push(symptom);
      }
    }

    for (const symptom of disease.symptoms.secondary) {
      if (userSymptoms[symptom]) {
        matchScore += 15;
        matchedSymptoms.push(symptom);
      }
    }

    // Check risk factors
    for (const riskFactor of disease.riskFactors) {
      if (userSymptoms[riskFactor]) {
        matchScore += 20;
        riskFactors.push(riskFactor);
      }
    }

    if (matchScore >= 50) { // Minimum threshold for consideration
      results.possible_conditions.push({
        disease: disease.name,
        confidence: matchScore,
        matched_symptoms: matchedSymptoms,
        risk_factors: riskFactors,
        stg_reference: disease.stg_reference
      });
    }
  }

  // Sort by confidence score
  results.possible_conditions.sort((a, b) => b.confidence - a.confidence);

  // Determine urgency based on highest confidence condition
  if (results.possible_conditions.length > 0) {
    const topCondition = results.possible_conditions[0];

    if (topCondition.confidence >= 80) {
      results.urgency_level = 'emergency';
      results.recommendations.push('Seek immediate medical attention');
      results.actions.push('Go to nearest hospital emergency department');
    } else if (topCondition.confidence >= 60) {
      results.urgency_level = 'urgent';
      results.recommendations.push('Schedule urgent consultation');
      results.actions.push('Contact healthcare provider within 24 hours');
    } else {
      results.urgency_level = 'routine';
      results.recommendations.push('Schedule routine consultation');
      results.actions.push('Monitor symptoms and schedule appointment if they worsen');
    }

    // Add specific recommendations based on condition
    if (topCondition.disease === 'Malaria') {
      results.recommendations.push('Take Artemether-Lumefantrine if available and confirmed malaria');
      results.actions.push('Get malaria test (RDT or microscopy)');
    } else if (topCondition.disease === 'HIV/AIDS') {
      results.recommendations.push('Get HIV test and counseling');
      results.actions.push('Schedule consultation for risk assessment');
    }
  }

  return results;
}

/**
 * Get next relevant question based on current symptoms and responses
 * @param {object} currentSymptoms - Current symptom data
 * @param {string} lastQuestion - Last question asked
 * @returns {object} - Next question object
 */
function getNextQuestion(currentSymptoms, lastQuestion = null) {
  const answeredQuestions = Object.keys(currentSymptoms).filter(key => currentSymptoms[key] === true);
  const totalAnswered = answeredQuestions.length;

  // If we've asked 4+ questions, try to provide assessment
  if (totalAnswered >= 4) {
    return {
      question: 'Thank you for answering your symptom questions. Based on your responses, here is my assessment:',
      options: [],
      completed: true
    };
  }

  // Determine most likely condition based on current symptoms
  const triageResult = enhancedTriage(currentSymptoms);

  // If we have a reasonably confident diagnosis, follow that condition's questions
  if (triageResult.possible_conditions.length > 0 && triageResult.possible_conditions[0].confidence >= 40) {
    const topCondition = triageResult.possible_conditions[0];
    const disease = medicalDictionary[topCondition.disease.toLowerCase().replace(/[^a-z]/g, '')];

    if (disease && disease.questions) {
      // Find next unanswered question for this condition
      for (const questionKey of disease.questions) {
        if (!currentSymptoms[questionKey]) {
          return questionMappings[questionKey];
        }
      }
    }
  }

  // Fallback: Ask medically relevant questions in priority order based on symptoms present
  const priorityQuestions = [
    'fever_pattern',     // Most common presenting symptom
    'cough_type',        // Common respiratory symptom
    'breathing_difficulty', // Serious symptom
    'chest_pain',        // Important cardiovascular symptom
    'diarrhea_type',     // Gastrointestinal symptom
    'abdominal_pain',    // Also GI
    'travel_history',    // Important for infectious diseases
    'headache_severity'  // Common accompanying symptom
  ];

  // Choose the next medically-relevant question that hasn't been asked
  for (const questionKey of priorityQuestions) {
    if (!currentSymptoms[questionKey]) {
      return questionMappings[questionKey];
    }
  }

  // Ultimate fallback - ask about recent travel if everything else is done
  if (!currentSymptoms['travel_history']) {
    return questionMappings.travel_history;
  }

  // If we've reached here, mark as completed
  return {
    question: 'Thank you for providing detailed information about your symptoms. Here is my assessment:',
    options: [],
    completed: true
  };
}

/**
 * Get treatment recommendations based on condition and symptoms
 * @param {string} condition - Suspected condition
 * @param {object} symptoms - Symptom data
 * @returns {object} - Treatment recommendations
 */
function getTreatmentRecommendations(condition, symptoms) {
  const disease = medicalDictionary[condition.toLowerCase().replace(/[^a_z]/g, '')];

  if (!disease || !disease.treatment) {
    return { error: 'No treatment information available' };
  }

  const recommendations = {
    condition: disease.name,
    urgency: disease.priority,
    treatment: disease.treatment,
    stg_reference: disease.stg_reference,
    precautions: []
  };

  // Add specific precautions based on symptoms
  if (symptoms.severe_anemia) {
    recommendations.precautions.push('Monitor for signs of severe anemia');
  }
  if (symptoms.dehydration_signs) {
    recommendations.precautions.push('Maintain hydration with ORS');
  }
  if (symptoms.pregnancy) {
    recommendations.precautions.push('Special considerations for pregnancy');
  }

  return recommendations;
}

module.exports = {
  medicalDictionary,
  questionMappings,
  severityScores,
  diseasePatterns,
  enhancedTriage,
  getNextQuestion,
  getTreatmentRecommendations
};
