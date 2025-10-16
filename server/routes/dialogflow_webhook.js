// File: server/routes/dialogflow_webhook.js
// Description: Handles Dialogflow webhook requests for custom fulfillment.

const express = require('express');
const router = express.Router();
const { evaluateTriage } = require('../logic/logic');
const { Doctor } = require('../models/db');
const { enhancedTriage, getNextQuestion, questionMappings: medicalQuestionMappings } = require('../logic/medical_dictionary');

// In-memory conversation state storage (in production, use Redis/database)
const conversationStates = new Map();

/**
 * Maps symptom category names to IDs
 */
const categoryNameToId = {
    'fever': '1',
    'respiratory': '2',
    'digestive': '3',
    'heart': '4',
    'general': '5',
    'other': '6'
};

/**
 * Maps symptom categories to relevant parameters
 */
const categoryMappings = {
    '1': ['fever_duration'], // Fever and infections
    '2': ['cough_type', 'breathing_difficulty', 'chest_pain'], // Respiratory problems
    '3': ['diarrhea_type', 'abdominal_pain'], // Digestive issues
    '4': ['chest_pain', 'breathing_difficulty'], // Heart and chest problems
    '5': ['fatigue_level', 'weight_change'], // General symptoms
    '6': ['fever_duration', 'cough_type', 'breathing_difficulty', 'chest_pain', 'diarrhea_type', 'abdominal_pain', 'fatigue_level', 'weight_change'] // Other symptoms
};

/**
 * Maps parameters to questions
 */
const questionMappings = {
    'fever_duration': 'How long have you had the fever? (1) Less than 3 days, (2) 3-7 days, (3) 1-2 weeks, (4) More than 2 weeks',
    'cough_type': 'What type of cough do you have? (1) Dry cough, (2) Cough with phlegm, (3) Coughing up blood, (4) Barking cough',
    'breathing_difficulty': 'Are you having difficulty breathing? (1) Yes, severe (can\'t complete sentences), (2) Yes, moderate (short of breath with activity), (3) Mild (only with heavy activity), (4) No difficulty',
    'chest_pain': 'Are you experiencing chest pain? (1) Yes, severe crushing pain, (2) Yes, moderate pain, (3) Mild discomfort, (4) No chest pain',
    'diarrhea_type': 'What type of diarrhea are you experiencing? (1) Watery diarrhea, (2) Bloody diarrhea, (3) Diarrhea with mucus, (4) No diarrhea',
    'abdominal_pain': 'Are you having abdominal pain? (1) Severe pain, (2) Moderate pain, (3) Mild cramps, (4) No abdominal pain',
    'fatigue_level': 'How severe is your fatigue? (1) Extreme fatigue (can\'t do daily activities), (2) Moderate fatigue, (3) Mild tiredness, (4) No fatigue',
    'weight_change': 'Have you experienced any weight changes? (1) Significant weight loss (>5kg), (2) Moderate weight loss (2-5kg), (3) Slight weight loss, (4) No weight change, (5) Weight gain'
};

/**
 * Maps categories to names
 */
const categoryNames = {
    '1': 'Fever and infections',
    '2': 'Respiratory problems',
    '3': 'Digestive issues',
    '4': 'Heart and chest problems',
    '5': 'General symptoms',
    '6': 'Other symptoms'
};

router.post('/', async (req, res) => {
    try {
        console.log('Dialogflow Webhook Request:', JSON.stringify(req.body, null, 2));

        const { queryResult, session } = req.body;
        if (!queryResult) {
            return res.status(400).json({ error: 'No queryResult in request' });
        }

        const intentName = queryResult.intent.displayName;
        const params = queryResult.parameters || {};
        const contexts = queryResult.outputContexts || [];

        let responseText = '';
        let outputContexts = [];

        // Extract session parts for context names
        const sessionMatch = session.match(/projects\/([^\/]+)\/agent\/sessions\/([^\/]+)/);
        const projectId = sessionMatch ? sessionMatch[1] : 'project_id';
        const sessionId = sessionMatch ? sessionMatch[2] : 'session_id';

        switch (intentName) {
            case 'ShowAvailableAppointments':
                // Fetch and return available appointment slots
                try {
                    const doctors = await Doctor.find({}).sort({ workload: 1 }).limit(5); // Get top 5 least busy doctors
                    let response = "Available appointment slots:\n\n";

                    for (let i = 0; i < doctors.length; i++) {
                        const doctor = doctors[i];
                        if (doctor.availability && doctor.availability.length > 0) {
                            response += `${i + 1}. Dr. ${doctor.name}\n`;
                            doctor.availability.slice(0, 3).forEach((slot, slotIndex) => { // Show only next 3 slots
                                if (!slot.isBooked && new Date(slot.startTime) > new Date()) {
                                    response += `   ${String.fromCharCode(65 + slotIndex)}. ${new Date(slot.startTime).toLocaleString()} (${new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()} min)\n`;
                                }
                            });
                            response += "\n";
                        }
                    }

                    if (response === "Available appointment slots:\n\n") {
                        response = "No appointment slots are currently available. Please try again later or contact us directly.";
                    } else {
                        response += "Reply with 'choose 1' to book with the first doctor, or visit our web portal for full scheduling.";
                    }

                    responseText = response;
                } catch (error) {
                    console.error('Error fetching available appointments:', error);
                    responseText = "Sorry, there was an error retrieving available appointments. Please try again later.";
                }
                break;

            case 'BookAppointmentConfirmation':
                // Handle booking confirmation through webhook
                const bookingReferenceId = params.bookingReferenceId?.numberValue;
                if (bookingReferenceId) {
                    responseText = `Your appointment with reference ${bookingReferenceId} has been confirmed. You will receive a confirmation SMS with details.`;
                } else {
                    responseText = "Please provide a valid booking reference ID to confirm your appointment.";
                }
                break;
            case 'SymptomChecker':
                responseText = "I can help you assess your symptoms and provide health guidance. This will help determine if you need urgent care or can schedule a regular appointment.\nType 'continue' or 'next' to proceed with symptom assessment.";
                break;

            case 'SymptomCategory':
                if (params.symptom_category) {
                    let inputCategory = params.symptom_category.stringValue || params.symptom_category.toString();
                    const category = categoryNameToId[inputCategory.toLowerCase()] || inputCategory;
                    responseText = `You selected: ${categoryNames[category] || 'Unknown category'}.\n\nTo help me assess your situation, I need to ask you a few specific questions about your symptoms. Please answer as accurately as possible.`;

                    // Use medical dictionary with category-specific questions
                    const initialSymptoms = {}; // No symptoms collected yet
                    const nextQuestion = getNextQuestion(initialSymptoms, null, category);

                    if (!nextQuestion.completed) {
                        // Format question with options
                        let formattedQuestion = nextQuestion.question;

                    // Add numbered options if available
                    if (nextQuestion.options && nextQuestion.options.length > 0) {
                        formattedQuestion += '\n\nPlease reply with the number of your choice:\n';
                        nextQuestion.options.forEach((option, index) => {
                            formattedQuestion += `(${index + 1}) ${option}\n`;
                        });
                    }

                        responseText += `\n\n${formattedQuestion}`;

                        // Create conversation state with category tracking
                        const conversationKey = `${sessionId}_symptoms`;
                        const conversationState = {
                            symptoms: {},
                            category: category,
                            step: 0
                        };
                        conversationStates.set(conversationKey, conversationState);
                        conversationStates.set(conversationKey + '_lastquestion', nextQuestion);

                        // Create an empty symptom context to start collecting answers
                        outputContexts.push({
                            name: `projects/${projectId}/agent/sessions/${sessionId}/contexts/symptomanswers`,
                            lifespanCount: 10,
                            parameters: {}
                        });
                    } else {
                        responseText += '\n\nWhat symptoms are you experiencing?';
                    }

                    // Set output context with category for future use
                    outputContexts.push({
                        name: `projects/${projectId}/agent/sessions/${sessionId}/contexts/symptomcategory`,
                        lifespanCount: 5,
                        parameters: {
                            selected_category: category
                        }
                    });
                } else {
                    responseText = "To help me assess your symptoms properly, I need to know what type of symptoms you're experiencing. Please reply with one of these phrases: fever, respiratory, digestive, heart, general, or other.";
                }
                break;

            case 'SymptomQuestions':
                // Backend-driven symptom assessment using medical dictionary
                const conversationKey = `${sessionId}_symptoms`;

                // Get current conversation state
                let conversationState = conversationStates.get(conversationKey) || {
                    symptoms: {},
                    category: null,
                    step: 0
                };

                // Get category from context if not set
                if (!conversationState.category) {
                    const categoryContext = contexts.find(ctx => ctx.name.includes('/symptomcategory'));
                    if (categoryContext?.parameters?.selected_category) {
                        conversationState.category = categoryContext.parameters.selected_category;
                    } else if (categoryContext?.parameters?.fields?.selected_category?.stringValue) {
                        conversationState.category = categoryContext.parameters.fields.selected_category.stringValue;
                    }
                }

                // Process user's response to the LAST question asked
                const userInput = queryResult.queryText?.trim();
                const lastQuestionResponse = conversationStates.get(conversationKey + '_lastquestion');

                if (lastQuestionResponse) {
                    // Find which question key this corresponds to (inverse mapping)
                    let questionKey = null;
                    for (const [key, questionData] of Object.entries(medicalQuestionMappings)) {
                        if (questionData.question === lastQuestionResponse.question) {
                            questionKey = key;
                            break;
                        }
                    }

                    // Map numeric responses to actual symptom parameters
                    if (/^[1-4]$/.test(userInput)) {
                        const numericChoice = parseInt(userInput);
                        if (lastQuestionResponse.mapping && lastQuestionResponse.options) {
                            const selectedOption = lastQuestionResponse.options[numericChoice - 1];
                            const parameterName = lastQuestionResponse.mapping[selectedOption];

                            if (parameterName && typeof parameterName === 'string') {
                                conversationState.symptoms[parameterName] = 'present';
                                // Also mark the question as answered for progression tracking
                                if (questionKey) {
                                    conversationState.symptoms[questionKey] = 'answered';
                                }
                                console.log(`Mapped response "${numericChoice}" to parameter "${parameterName}" for question "${questionKey}"`);
                            }
                        }
                    }
                }

                // Debug logging for symptom tracking
                console.log(`DEBUG: Current conversation symptoms:`, conversationState.symptoms);
                console.log(`DEBUG: Symptom count: ${Object.keys(conversationState.symptoms).length}`);
                console.log(`DEBUG: Answerable count: ${Object.keys(conversationState.symptoms).filter(key => conversationState.symptoms[key] === 'answered').length}`);

                // Get next medical question based on updated symptoms and category
                const nextQuestion = getNextQuestion(conversationState.symptoms, null, conversationState.category);

                if (nextQuestion?.completed || nextQuestion?.question?.includes('assessment')) {
                    // Assessment complete - provide triage
                    console.log('Symptom assessment completed:', conversationState.symptoms);

                    const triageResult = enhancedTriage(conversationState.symptoms);
                    let assessmentText = `Based on your symptoms, you may be experiencing:\n\n`;

                    // Format triage results
                    if (Array.isArray(triageResult.possible_conditions)) {
                        triageResult.possible_conditions.forEach((condition, index) => {
                            if (condition && condition.disease) {
                                assessmentText += `${index + 1}. ${condition.disease} (${condition.confidence || 0}% likelihood)\n`;
                            }
                        });
                    }

                    assessmentText += `\nUrgency Level: ${triageResult.urgency_level ? triageResult.urgency_level.toUpperCase() : 'ROUTINE'}\n\n`;

                    // Handle recommendations and actions with fallbacks
                    if (triageResult.recommendations && Array.isArray(triageResult.recommendations) && triageResult.recommendations.length > 0) {
                        assessmentText += `Recommendations:\n`;
                        triageResult.recommendations.forEach(rec => {
                            assessmentText += `• ${rec}\n`;
                        });
                    }

                    if (triageResult.actions && Array.isArray(triageResult.actions) && triageResult.actions.length > 0) {
                        assessmentText += `\nActions:\n`;
                        triageResult.actions.forEach(action => {
                            assessmentText += `• ${action}\n`;
                        });
                    }

                    // Fallback recommendations if none provided
                    if ((!triageResult.recommendations || !Array.isArray(triageResult.recommendations) || triageResult.recommendations.length === 0) &&
                        (!triageResult.actions || !Array.isArray(triageResult.actions) || triageResult.actions.length === 0)) {
                        assessmentText += `Recommendations:\n• Monitor your symptoms closely\n• Seek medical attention if symptoms worsen\n• Stay hydrated and rest\n• Consult a healthcare professional for proper diagnosis\n`;
                    }

                    responseText = assessmentText +
                        "\n\nIf your condition worsens or you need immediate help, please contact emergency services or go to the nearest hospital." +
                        "\n\nFor follow-up care:" +
                        "\n- Reply 'consultation' to schedule a general consultation" +
                        "\n- Reply 'appointment' to view available appointment slots" +
                        "\n- Reply 'exit' to opt out of this conversation";

                    // Clear conversation state
                    conversationStates.delete(conversationKey);
                    conversationStates.delete(conversationKey + '_lastquestion');

                    // Close symptom contexts
                    outputContexts.push({
                        name: `projects/${projectId}/agent/sessions/${sessionId}/contexts/symptomcategory`,
                        lifespanCount: 0,
                        parameters: {}
                    });
                    outputContexts.push({
                        name: `projects/${projectId}/agent/sessions/${sessionId}/contexts/symptomanswers`,
                        lifespanCount: 0,
                        parameters: {}
                    });

                } else if (nextQuestion && typeof nextQuestion === 'object') {
                    // Ask next question with options
                    let formattedQuestion = nextQuestion.question;

                    // Add numbered options if available
                    if (nextQuestion.options && nextQuestion.options.length > 0) {
                        formattedQuestion += '\n\nPlease reply with the number of your choice:\n';
                        nextQuestion.options.forEach((option, index) => {
                            formattedQuestion += `(${index + 1}) ${option}\n`;
                        });
                    }

                    responseText = formattedQuestion;

                    // Store this question for response mapping
                    conversationStates.set(conversationKey + '_lastquestion', nextQuestion);

                    // Save conversation state
                    conversationStates.set(conversationKey, conversationState);
                }

                break;

            case 'TriageResults':
                const triageContext = contexts.find(ctx => ctx.name.includes('/symptomquestions'));
                const symptomParams = triageContext?.parameters || params;

                responseText = "Based on your symptoms, here is my assessment:\n\n" + evaluateTriage(symptomParams) +
                    "\n\nIf your condition worsens or you need immediate help, please contact emergency services or go to the nearest hospital." +
                    "\n\nFor follow-up care:" +
                    "\n- Reply 'consultation' to schedule a general consultation" +
                    "\n- Reply 'appointment' to view available appointment slots" +
                    "\n- Reply 'exit' to opt out of this conversation";
                break;

            case 'OptOut':
                responseText = "Thank you for using TeleMed. Goodbye!";
                break;

            default:
                responseText = "I'm sorry, I didn't understand that. Please try again or type 'help' for assistance.";
        }

        const response = {
            fulfillmentText: responseText,
            outputContexts: outputContexts
        };

        console.log('Dialogflow Webhook Response:', JSON.stringify(response, null, 2));
        res.json(response);

    } catch (error) {
        console.error('Dialogflow Webhook Error:', error);
        res.status(500).json({
            fulfillmentText: 'Sorry, there was an error processing your request. Please try again.',
            outputContexts: []
        });
    }
});

module.exports = router;
