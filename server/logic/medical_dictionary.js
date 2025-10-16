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
  },

  // Additional question mappings referenced in disease definitions
  headache_severity: {
    question: 'How severe is your headache?',
    options: ['Mild headache', 'Moderate headache', 'Severe headache', 'No headache'],
    mapping: {
      'Mild headache': 'headache',
      'Moderate headache': 'headache',
      'Severe headache': 'severe_headache',
      'No headache': 'no_headache'
    }
  },

  chills_presence: {
    question: 'Are you experiencing chills or shivering?',
    options: ['Yes, severe chills', 'Yes, mild chills', 'No chills'],
    mapping: {
      'Yes, severe chills': 'chills',
      'Yes, mild chills': 'chills',
      'No chills': 'no_chills'
    }
  },

  recurrent_infections: {
    question: 'Have you had frequent or recurrent infections?',
    options: ['Yes, multiple times this year', 'Yes, occasionally', 'No recurrent infections'],
    mapping: {
      'Yes, multiple times this year': 'recurrent_infections',
      'Yes, occasionally': 'recurrent_infections',
      'No recurrent infections': 'no_recurrent_infections'
    }
  },

  weight_loss_amount: {
    question: 'How much weight have you lost recently?',
    options: ['Significant (>5kg)', 'Moderate (2-5kg)', 'Mild (<2kg)', 'No weight loss'],
    mapping: {
      'Significant (>5kg)': 'significant_weight_loss',
      'Moderate (2-5kg)': 'moderate_weight_loss',
      'Mild (<2kg)': 'mild_weight_loss',
      'No weight loss': 'no_weight_loss'
    }
  },

  chronic_fatigue: {
    question: 'How would you describe your fatigue?',
    options: ['Extreme fatigue (can\'t do daily activities)', 'Moderate fatigue', 'Mild tiredness', 'No fatigue'],
    mapping: {
      'Extreme fatigue (can\'t do daily activities)': 'extreme_fatigue',
      'Moderate fatigue': 'moderate_fatigue',
      'Mild tiredness': 'mild_fatigue',
      'No fatigue': 'no_fatigue'
    }
  },

  risk_factors: {
    question: 'Do you have any risk factors for HIV?',
    options: ['Yes, I have risk factors', 'No specific risk factors'],
    mapping: {
      'Yes, I have risk factors': 'risk_factors_present',
      'No specific risk factors': 'no_risk_factors'
    }
  },

  previous_testing: {
    question: 'Have you previously been tested for HIV?',
    options: ['Yes, I have been tested', 'No, I haven\'t been tested'],
    mapping: {
      'Yes, I have been tested': 'previous_hiv_test',
      'No, I haven\'t been tested': 'no_previous_test'
    }
  },

  cough_duration: {
    question: 'How long have you had this cough?',
    options: ['Less than 2 weeks', '2-4 weeks', 'More than 1 month', 'More than 3 months'],
    mapping: {
      'Less than 2 weeks': 'acute_cough',
      '2-4 weeks': 'subacute_cough',
      'More than 1 month': 'chronic_cough',
      'More than 3 months': 'persistent_cough'
    }
  },

  sputum_production: {
    question: 'Are you producing sputum/phlegm?',
    options: ['Yes, lots of sputum', 'Yes, some sputum', 'Blood stained sputum', 'No sputum'],
    mapping: {
      'Yes, lots of sputum': 'sputum_production',
      'Yes, some sputum': 'sputum_production',
      'Blood stained sputum': 'hemoptysis',
      'No sputum': 'no_sputum'
    }
  },

  night_sweats: {
    question: 'Are you experiencing night sweats?',
    options: ['Yes, severe night sweats', 'Yes, mild night sweats', 'No night sweats'],
    mapping: {
      'Yes, severe night sweats': 'night_sweats',
      'Yes, mild night sweats': 'night_sweats',
      'No night sweats': 'no_night_sweats'
    }
  },

  tb_exposure: {
    question: 'Have you been exposed to someone with tuberculosis?',
    options: ['Yes, close contact with TB patient', 'Yes, possibly exposed', 'No known exposure'],
    mapping: {
      'Yes, close contact with TB patient': 'tb_contact',
      'Yes, possibly exposed': 'possible_tb_contact',
      'No known exposure': 'no_tb_exposure'
    }
  },

  hiv_status: {
    question: 'Are you HIV positive?',
    options: ['Yes, I am HIV positive', 'No, I am HIV negative', 'I don\'t know my status'],
    mapping: {
      'Yes, I am HIV positive': 'hiv_positive',
      'No, I am HIV negative': 'hiv_negative',
      'I don\'t know my status': 'unknown_hiv_status'
    }
  },

  // Additional questions that may be used
  discharge_type: {
    question: 'What type of discharge are you experiencing?',
    options: ['Clear or white discharge', 'Yellow/green discharge', 'Bloody discharge', 'No discharge'],
    mapping: {
      'Clear or white discharge': 'discharge',
      'Yellow/green discharge': 'discharge',
      'Bloody discharge': 'bloody_discharge',
      'No discharge': 'no_discharge'
    }
  },

  ulcer_presence: {
    question: 'Are you experiencing genital ulcers?',
    options: ['Yes, painful ulcers', 'Yes, painless ulcers', 'No ulcers'],
    mapping: {
      'Yes, painful ulcers': 'genital_ulcers',
      'Yes, painless ulcers': 'genital_ulcers',
      'No ulcers': 'no_ulcers'
    }
  },

  pain_location: {
    question: 'Where is the pain located?',
    options: ['Lower abdomen', 'Upper abdomen', 'Back/Bilateral', 'No specific pain'],
    mapping: {
      'Lower abdomen': 'pelvic_pain',
      'Upper abdomen': 'upper_abdominal_pain',
      'Back/Bilateral': 'back_pain',
      'No specific pain': 'no_pain'
    }
  },

  partner_symptoms: {
    question: 'Are your sexual partners experiencing similar symptoms?',
    options: ['Yes, partner has symptoms', 'No partner symptoms', 'Don\'t know'],
    mapping: {
      'Yes, partner has symptoms': 'partner_symptoms',
      'No partner symptoms': 'no_partner_symptoms',
      'Don\'t know': 'unknown_partner_status'
    }
  },

  contraception_use: {
    question: 'Are you using any form of contraception?',
    options: ['Yes, condoms', 'Yes, other methods', 'No contraception used'],
    mapping: {
      'Yes, condoms': 'uses_condoms',
      'Yes, other methods': 'uses_contraception',
      'No contraception used': 'no_contraception'
    }
  },

  frequency: {
    question: 'How frequent is your diarrhea?',
    options: ['More than 10 times/day', '5-10 times/day', '3-4 times/day', 'Less frequent'],
    mapping: {
      'More than 10 times/day': 'frequent_diarrhea',
      '5-10 times/day': 'moderate_diarrhea',
      '3-4 times/day': 'mild_diarrhea',
      'Less frequent': 'rare_diarrhea'
    }
  },

  blood_presence: {
    question: 'Is there blood in your diarrhea?',
    options: ['Yes, bright red blood', 'Yes, dark blood', 'No blood visible'],
    mapping: {
      'Yes, bright red blood': 'blood_in_stool',
      'Yes, dark blood': 'blood_in_stool',
      'No blood visible': 'no_blood_in_stool'
    }
  },

  dehydration_signs: {
    question: 'Are you showing signs of dehydration?',
    options: ['Yes, severe dehydration', 'Yes, mild dehydration', 'No dehydration signs'],
    mapping: {
      'Yes, severe dehydration': 'severe_dehydration',
      'Yes, mild dehydration': 'mild_dehydration',
      'No dehydration signs': 'no_dehydration'
    }
  },

  water_source: {
    question: 'Is your drinking water from a safe source?',
    options: ['Yes, treated/boiled water', 'Possibly contaminated', 'Unsafe water source'],
    mapping: {
      'Yes, treated/boiled water': 'safe_water',
      'Possibly contaminated': 'contaminated_water',
      'Unsafe water source': 'unsafe_water'
    }
  },

  fever_presence: {
    question: 'Are you experiencing a fever?',
    options: ['Yes, high fever (>38°C)', 'Yes, mild fever', 'No fever'],
    mapping: {
      'Yes, high fever (>38°C)': 'high_fever',
      'Yes, mild fever': 'mild_fever',
      'No fever': 'no_fever'
    }
  },

  exposure_history: {
    question: 'Have you been exposed to sick people?',
    options: ['Yes, close contact', 'Yes, in crowded areas', 'No known exposure'],
    mapping: {
      'Yes, close contact': 'close_contact',
      'Yes, in crowded areas': 'crowd_exposure',
      'No known exposure': 'no_exposure'
    }
  },

  vaccination_status: {
    question: 'Are you up to date with vaccinations?',
    options: ['Yes, vaccinated recently', 'Partially vaccinated', 'Not vaccinated'],
    mapping: {
      'Yes, vaccinated recently': 'vaccinated',
      'Partially vaccinated': 'partial_vaccination',
      'Not vaccinated': 'not_vaccinated'
    }
  },

  headache_frequency: {
    question: 'How frequent are your headaches?',
    options: ['Daily headaches', 'Frequent headaches', 'Occasional headaches', 'No headaches'],
    mapping: {
      'Daily headaches': 'daily_headaches',
      'Frequent headaches': 'frequent_headaches',
      'Occasional headaches': 'occasional_headaches',
      'No headaches': 'no_headache'
    }
  },

  dizziness_presence: {
    question: 'Are you experiencing dizziness?',
    options: ['Yes, frequent dizziness', 'Yes, occasional dizziness', 'No dizziness'],
    mapping: {
      'Yes, frequent dizziness': 'frequent_dizziness',
      'Yes, occasional dizziness': 'occasional_dizziness',
      'No dizziness': 'no_dizziness'
    }
  },

  family_history: {
    question: 'Do you have a family history of hypertension?',
    options: ['Yes, immediate family', 'Yes, extended family', 'No family history'],
    mapping: {
      'Yes, immediate family': 'strong_family_history',
      'Yes, extended family': 'weak_family_history',
      'No family history': 'no_family_history'
    }
  },

  lifestyle_factors: {
    question: 'Do you have unhealthy lifestyle factors?',
    options: ['Yes, high salt, no exercise', 'Yes, some unhealthy habits', 'Healthy lifestyle'],
    mapping: {
      'Yes, high salt, no exercise': 'unhealthy_lifestyle',
      'Yes, some unhealthy habits': 'moderate_unhealthy',
      'Healthy lifestyle': 'healthy_lifestyle'
    }
  },

  medication_history: {
    question: 'Are you currently taking medication for blood pressure?',
    options: ['Yes, regularly', 'Yes, sometimes', 'No medication'],
    mapping: {
      'Yes, regularly': 'on_bp_medication',
      'Yes, sometimes': 'partial_medication',
      'No medication': 'no_medication'
    }
  },

  thirst_frequency: {
    question: 'How frequent is your thirst?',
    options: ['Constant thirst', 'Very thirsty', 'Occasionally thirsty', 'Normal thirst'],
    mapping: {
      'Constant thirst': 'constant_thirst',
      'Very thirsty': 'excessive_thirst',
      'Occasionally thirsty': 'frequent_thirst',
      'Normal thirst': 'normal_thirst'
    }
  },

  urination_pattern: {
    question: 'How often are you urinating?',
    options: ['More than 10 times/day', '6-10 times/day', '4-5 times/day', 'Normal frequency'],
    mapping: {
      'More than 10 times/day': 'frequent_urination',
      '6-10 times/day': 'increased_urination',
      '4-5 times/day': 'normal_urination',
      'Normal frequency': 'normal_urination'
    }
  },

  weight_changes: {
    question: 'Have you noticed weight changes?',
    options: ['Significant weight loss', 'Moderate weight loss', 'Weight gain', 'No weight change'],
    mapping: {
      'Significant weight loss': 'significant_weight_loss',
      'Moderate weight loss': 'moderate_weight_loss',
      'Weight gain': 'weight_gain',
      'No weight change': 'no_weight_change'
    }
  },

  mood_changes: {
    question: 'Have you noticed changes in your mood?',
    options: ['Severely depressed/lonely', 'Anxious/worried', 'Some mood changes', 'Normal mood'],
    mapping: {
      'Severely depressed/lonely': 'severe_mood_changes',
      'Anxious/worried': 'anxiety_mood',
      'Some mood changes': 'mild_mood_changes',
      'Normal mood': 'normal_mood'
    }
  },

  sleep_pattern: {
    question: 'How is your sleep pattern?',
    options: ['Can\'t sleep at all', 'Trouble falling asleep', 'Irregular sleep', 'Normal sleep'],
    mapping: {
      'Can\'t sleep at all': 'insomnia',
      'Trouble falling asleep': 'difficult_sleep',
      'Irregular sleep': 'irregular_sleep',
      'Normal sleep': 'normal_sleep'
    }
  },

  suicidal_thoughts: {
    question: 'Have you had thoughts of harming yourself?',
    options: ['Yes, serious thoughts', 'Occasional thoughts', 'No such thoughts'],
    mapping: {
      'Yes, serious thoughts': 'suicidal_thoughts',
      'Occasional thoughts': 'mild_suicidal_thoughts',
      'No such thoughts': 'no_suicidal_thoughts'
    }
  },

  substance_use: {
    question: 'Do you use alcohol or drugs?',
    options: ['Yes, regularly', 'Yes, occasionally', 'No substance use'],
    mapping: {
      'Yes, regularly': 'regular_substance_use',
      'Yes, occasionally': 'occasional_substance_use',
      'No substance use': 'no_substance_use'
    }
  },

  social_support: {
    question: 'Do you have good social support?',
    options: ['Yes, strong support system', 'Limited support', 'No support system'],
    mapping: {
      'Yes, strong support system': 'good_social_support',
      'Limited support': 'limited_support',
      'No support system': 'no_social_support'
    }
  },

  last_menstrual_period: {
    question: 'When was your last menstrual period?',
    instruction: 'Please reply with the date or approximately when (e.g., "2 weeks ago", "last month")',
    mapping: {} // Open-ended response
  },

  pregnancy_symptoms: {
    question: 'Are you experiencing pregnancy symptoms?',
    options: ['Yes, typical symptoms', 'Some symptoms', 'No pregnancy symptoms'],
    mapping: {
      'Yes, typical symptoms': 'pregnancy_symptoms',
      'Some symptoms': 'possible_pregnancy',
      'No pregnancy symptoms': 'no_pregnancy_symptoms'
    }
  },

  bleeding_presence: {
    question: 'Are you experiencing any bleeding?',
    options: ['Heavy bleeding', 'Light spotting', 'No bleeding'],
    mapping: {
      'Heavy bleeding': 'heavy_bleeding',
      'Light spotting': 'light_bleeding',
      'No bleeding': 'no_bleeding'
    }
  },

  fetal_movement: {
    question: 'Can you feel fetal movements?',
    options: ['Yes, active movements', 'Yes, occasional movements', 'No movements felt'],
    mapping: {
      'Yes, active movements': 'fetal_movement',
      'Yes, occasional movements': 'fetal_movement',
      'No movements felt': 'no_fetal_movement'
    }
  },

  symptom_severity: {
    question: 'How severe are your symptoms?',
    options: ['Very severe, can\'t function', 'Moderate, affects daily life', 'Mild, tolerable'],
    mapping: {
      'Very severe, can\'t function': 'severe_symptoms',
      'Moderate, affects daily life': 'moderate_symptoms',
      'Mild, tolerable': 'mild_symptoms'
    }
  },

  onset_time: {
    question: 'When did your symptoms start?',
    instruction: 'Please reply with when symptoms began (e.g., "yesterday", "2 days ago", "this morning")',
    mapping: {} // Open-ended response
  },

  associated_symptoms: {
    question: 'What other symptoms are you experiencing?',
    instruction: 'Please list any additional symptoms you have (e.g., fever, pain, nausea)',
    mapping: {} // Open-ended response
  },

  medical_history: {
    question: 'Do you have any relevant medical history?',
    instruction: 'Please mention any chronic conditions, allergies, or previous illnesses',
    mapping: {} // Open-ended response
  },

  medication_allergies: {
    question: 'Do you have any known medication allergies?',
    options: ['Yes, several allergies', 'Yes, minor allergies', 'No known allergies'],
    mapping: {
      'Yes, several allergies': 'multiple_allergies',
      'Yes, minor allergies': 'minor_allergies',
      'No known allergies': 'no_allergies'
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
 * Get category-specific questions based on selected category ID
 * @param {string} category - Category ID from dialogflow_webhook.js
 * @returns {array} - Array of question keys for this category
 */
function getCategoryQuestions(category) {
  const categoryQuestionMap = {
    '1': ['fever_pattern', 'headache_severity', 'chills_presence', 'travel_history'], // Fever/infections
    '2': ['cough_type', 'breathing_difficulty', 'fever_presence', 'chest_pain'], // Respiratory
    '3': ['diarrhea_type', 'abdominal_pain', 'blood_presence', 'dehydration_signs'], // Digestive
    '4': ['chest_pain', 'breathing_difficulty', 'dizziness_presence', 'headache_frequency'], // Heart - chest_pain is correct first question
    '5': ['fatigue_level', 'weight_change', 'headache_frequency'], // General - reorder for proper priority
    '6': ['fever_pattern', 'cough_type', 'breathing_difficulty', 'chest_pain', 'diarrhea_type', 'abdominal_pain'] // Other
  };

  return categoryQuestionMap[category] || [];
}

/**
 * Find disease object by name
 * @param {string} diseaseName - Name of the disease to find
 * @returns {object|null} - Disease object or null if not found
 */
function findDiseaseByName(diseaseName) {
  for (const [key, disease] of Object.entries(medicalDictionary)) {
    if (disease.name.toLowerCase().includes(diseaseName.toLowerCase()) ||
        diseaseName.toLowerCase().includes(disease.name.toLowerCase())) {
      return disease;
    }
  }
  return null;
}

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

    // Cap confidence at 100%
    matchScore = Math.min(matchScore, 100);

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

  // Determine urgency based on highest confidence condition or provide default if no conditions match
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
  } else {
    // No specific conditions matched - provide general recommendations
    results.urgency_level = 'routine';
    results.possible_conditions.push({
      disease: 'General Medical Evaluation',
      confidence: 30,
      matched_symptoms: Object.keys(userSymptoms).filter(key => userSymptoms[key] === 'present'),
      risk_factors: [],
      description: 'Symptoms require general medical evaluation'
    });

    results.recommendations.push('Schedule a medical consultation');
    results.recommendations.push('Monitor your symptoms closely');
    results.recommendations.push('Seek medical attention if symptoms worsen');
    results.actions.push('Schedule appointment with healthcare provider');
    results.actions.push('Keep track of your symptoms and their progression');
  }

  return results;
}

/**
 * Get next relevant question based on current symptoms and responses
 * @param {object} currentSymptoms - Current symptom data
 * @param {string} lastQuestion - Last question asked
 * @param {string} category - Selected symptom category
 * @returns {object} - Next question object
 */
function getNextQuestion(currentSymptoms, lastQuestion = null, category = null) {
  const answeredQuestions = Object.keys(currentSymptoms).filter(key => currentSymptoms[key] === 'answered');
  const totalAnswered = answeredQuestions.length;

  // If we've asked 7+ questions or have a very confident diagnosis, try to provide assessment
  if (totalAnswered >= 7) {
    return {
      question: 'Thank you for answering your symptom questions. Based on your responses, here is my assessment:',
      options: [],
      completed: true
    };
  }

  // If we have a very confident diagnosis (90%+) with minimal questions, also complete
  const triageResultEarly = enhancedTriage(currentSymptoms);
  if (totalAnswered >= 2 && triageResultEarly.possible_conditions.length > 0 &&
      triageResultEarly.possible_conditions[0].confidence >= 90) {
    return {
      question: 'Thank you for answering your symptom questions. Based on your responses, here is my assessment:',
      options: [],
      completed: true
    };
  }

  // PRIORITY 1: Category-specific questions based on user's selected category
  if (category) {
    const categoryQuestions = getCategoryQuestions(category);

    // Ask category-specific questions first
    for (const questionKey of categoryQuestions) {
      if (!currentSymptoms[questionKey] && questionMappings[questionKey]) {
        return questionMappings[questionKey];
      }
    }
  }

  // PRIORITY 2: Determine most likely condition based on current symptoms
  const triageResult = enhancedTriage(currentSymptoms);

  // If we have a reasonably confident diagnosis, follow that condition's questions
  if (triageResult.possible_conditions.length > 0 && triageResult.possible_conditions[0].confidence >= 40) {
    const topCondition = triageResult.possible_conditions[0];
    const disease = findDiseaseByName(topCondition.disease);

    if (disease && disease.questions) {
    // Find next unanswered question for this condition
    for (const questionKey of disease.questions) {
      if (!currentSymptoms[questionKey] && questionMappings[questionKey]) {
        return questionMappings[questionKey];
      }
    }
    }
  }

  // PRIORITY 3: Fallback: Ask medically relevant questions in priority order based on symptoms present
  const priorityQuestions = [
    'chest_pain',        // Most important first for cardiovascular issues
    'fever_pattern',     // Most common presenting symptom
    'cough_type',        // Common respiratory symptom
    'breathing_difficulty', // Serious symptom
    'diarrhea_type',     // Gastrointestinal symptom
    'abdominal_pain',    // Also GI
    'fatigue_level',     // Common non-specific symptom
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
  getTreatmentRecommendations,
  getCategoryQuestions
};
