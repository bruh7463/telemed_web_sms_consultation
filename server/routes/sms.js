// File: server/routes/sms_textbee.js
// Description: Handles the incoming SMS webhook from TextBee.

const express = require('express');
const router = express.Router();
const { Patient, Consultation, TemporaryBookingReference } = require('../models/db');
const { detectIntent } = require('../services/dialogflow');
const { sendSms } = require('../services/textbee_sms')
const { createAndScheduleConsultation, bookConsultationSlot } = require('../logic/logic');
const dialogflow = require('@google-cloud/dialogflow');
const client = new dialogflow.ContextsClient();

async function clearContexts(sessionId) {
  const sessionPath = `projects/${process.env.DIALOGFLOW_PROJECT_ID}/agent/sessions/${sessionId}`;

  await client.deleteAllContexts({ parent: sessionPath });
  console.log(`Cleared contexts for session: ${sessionId}`);
}

router.post('/incoming', async (req, res) => {
    try {
        console.log('Received TextBee webhook body:', JSON.stringify(req.body, null, 2));

        const webhookEvent = req.body.webhookEvent; 
        const from = req.body.sender;     
        const content = req.body.message; 

        // Check if the webhook event type indicates a received message
        if (webhookEvent !== 'MESSAGE_RECEIVED') {
            console.log(`Ignoring webhook of type '${webhookEvent}': Not an incoming SMS message.`);
            return res.status(200).send('Webhook ignored: Not a MESSAGE_RECEIVED event.');
        }

        if (!from || !content || content.trim() === '') {
            console.log(`Ignoring message from ${from} due to missing or empty content.`);
            return res.status(200).send('Empty or invalid message ignored.');
        }

        console.log(`Incoming SMS from ${from}: "${content}"`); 

        let patient = await Patient.findOne({ phoneNumber: from });
        if (!patient) {
            console.log(`Creating new temporary patient record for ${from}`);
            patient = new Patient({ phoneNumber: from, name: `Guest_${from.replace(/\+/g, '')}`, nrc: `TEMP-${Date.now()}` });
            await patient.save();
        }
        
        if (!patient.dialogflowSessionId) {
            patient.dialogflowSessionId = `projects/${process.env.DIALOGFLOW_PROJECT_ID}/agent/sessions/${patient._id}`;
            await patient.save();
        }

        const existingConsultation = await Consultation.findOne({
            patient: patient._id,
            status: { $in: ['PENDING', 'ACTIVE'] }
        });

        if (existingConsultation) {
            // --- ROUTE TO DOCTOR ---
            console.log(`Message is part of existing consultation ${existingConsultation._id}`);
            existingConsultation.messages.push({ sender: 'PATIENT', content });
            if (existingConsultation.status === 'PENDING') {
                existingConsultation.status = 'ACTIVE';
            }
            await existingConsultation.save();
            // No automated response when routing to doctor, typically a human will reply.
        } else {
            // --- ROUTE TO CHATBOT ---
            console.log(`Routing message to Dialogflow for patient ${patient._id}`);
            const dialogflowResult = await detectIntent(process.env.DIALOGFLOW_PROJECT_ID, patient.dialogflowSessionId, content);
            const intentName = dialogflowResult.intent.displayName;
            const params = dialogflowResult.parameters.fields;

            // Retrieve the TextBee sender ID for outgoing messages
            const TEXTBEE_SENDER_ID = process.env.TEXTBEE_SENDER_ID;
            if (!TEXTBEE_SENDER_ID) {
                console.error('TEXTBEE_SENDER_ID environment variable is not set. Outgoing SMS cannot be sent.');
                // Decide how to handle this gracefully: send generic error, log, etc.
                return res.status(500).send('Server configuration error: Outgoing SMS sender ID missing.');
            }

            if (intentName === 'RegisterNewPatient' && dialogflowResult.allRequiredParamsPresent) {
                
                const firstName = params.first_name?.stringValue;
                const lastName = params.last_name?.stringValue;
                const nrc = params.nrc?.stringValue || params.nrc?.numberValue?.toString();
                const dateOfBirth = params.dateOfBirth?.stringValue ? new Date(params.dateOfBirth.stringValue) : undefined;
                const gender = params.gender?.stringValue;
                const address = params.address?.stringValue;

                if (!firstName || !lastName || !nrc || !dateOfBirth || !gender || !address) {
                    console.error("Missing required parameters (first_name, last_name, or nrc) from Dialogflow.");
                    await sendSms(from, TEXTBEE_SENDER_ID, 'Please must sure you enter all required details. Type "book consultation" to restart the process.');
                    await clearContexts(patient._id);
                    return res.status(400).send("Missing parameters from Dialogflow.");
                }
                
                const name = `${firstName} ${lastName}`;
                let existingPatientNRC = await Patient.findOne({ nrc });
                let existingPatientPhone = await Patient.findOne({ from });

                if (existingPatientNRC) {

                    await sendSms(from, TEXTBEE_SENDER_ID, `A patient with NRC ${nrc} already exists. Type 'book consultation' and use the 'Returning Patient' option.`);
                    await clearContexts(patient._id);

                } else if (existingPatientNRC && existingPatientNRC.phoneNumber !== from) {
                    
                    // NRC exists but phone number is different
                    await sendSms(from, TEXTBEE_SENDER_ID, `A patient with NRC ${nrc} is already registered with a different phone number. Please ensure you are using the correct number or register with a unique NRC. Type 'book consultation' to restart the process.`);
                    await clearContexts(patient._id);

                } else if (existingPatientPhone) {

                    await sendSms(from, TEXTBEE_SENDER_ID, `A patient with phone number ${from} already exists. Type 'book consultation' and use the 'Returning Patient' option.`);
                    await clearContexts(patient._id);

                } else if (nrc.length < 9 || nrc.length > 9) {

                    await sendSms(from, TEXTBEE_SENDER_ID, `The NRC number ${nrc} is invalid. Please ensure it is exactly 9 characters long. Type 'book consultation' to restart the process.`);
                    await clearContexts(patient._id);
                
                } else {
                    patient.name = name;
                    patient.nrc = nrc;
                    if (dateOfBirth) patient.dateOfBirth = dateOfBirth;
                    if (gender) patient.gender = gender;
                    if (address) patient.address = address;
                    await patient.save();
                    await sendSms(from, TEXTBEE_SENDER_ID, dialogflowResult.fulfillmentText);
                }

            } else if (intentName === 'VerifyReturningPatient' && dialogflowResult.allRequiredParamsPresent) {
                const nrc = params.nrc?.stringValue || params.nrc?.numberValue?.toString();
                let existingPatientPhone = await Patient.findOne({ from });
                
                if (!nrc) {
                    await sendSms(from, TEXTBEE_SENDER_ID, "I'm sorry, I didn't catch your NRC number. Please provide it again by typing 'book consultation' to restart the process.");
                    await clearContexts(patient._id);
                    await patient.save();
                    return res.status(400).send("Missing NRC from Dialogflow.");

                } else if (existingPatientPhone ==! from) {
                    await sendSms(from, TEXTBEE_SENDER_ID, `A patient with phone number ${from} already exists. Type 'book consultation' and use the 'Returning Patient' option.`);
                    await clearContexts(patient._id);
                    await patient.save();
                    return res.status(400).send("Phone number already associated with another patient.");
                } else {

                    const foundPatient = await Patient.findOne({ nrc, phoneNumber: from });
                    
                    if (foundPatient) {
                        if (patient.nrc.startsWith('TEMP-')) {
                            patient.name = foundPatient.name;
                            patient.nrc = foundPatient.nrc;
                            patient.dateOfBirth = foundPatient.dateOfBirth;
                            patient.gender = foundPatient.gender;
                            patient.address = foundPatient.address;
                            // Linking the session to the found patient
                            patient.dialogflowSessionId = `projects/${process.env.DIALOGFLOW_PROJECT_ID}/agent/sessions/${foundPatient._id}`;
                            await patient.save(); 
                        }
                        await sendSms(from, TEXTBEE_SENDER_ID, dialogflowResult.fulfillmentText);
                    } else {
                        await sendSms(from, TEXTBEE_SENDER_ID, `Sorry, we couldn't find a patient with NRC ${nrc} and this phone number. Type 'book consultation' and use the 'New Patient' option to register.`);
                        await clearContexts(patient._id);
                        await patient.save();
                    }
                }

            } else if (intentName === 'ShowAvailableAppointments') {
                if (dialogflowResult.fulfillmentText) {
                    await sendSms(from, TEXTBEE_SENDER_ID, dialogflowResult.fulfillmentText);
                } else {
                    console.warn('No fulfillmentText from Dialogflow for ShowAvailableAppointments intent, or TEXTBEE_SENDER_ID not set. Not sending SMS.');
                }
                console.log(`Dialogflow webhook for RequestAppointmentOptions will handle sending SMS.`);

                // Send a 200 OK to TextBee SMS gateway. Dialogflow will send the actual SMS.
                return res.status(200).send('SMS received, Dialogflow webhook initiated.');

            } else if (intentName === 'BookAppointmentConfirmation') {
                const bookingReferenceId = params.bookingReferenceId?.numberValue;

                if (!patient || patient.nrc.startsWith('TEMP-')) { 
                    await sendSms(from, TEXTBEE_SENDER_ID, "Please register or verify your account first before booking an appointment. Type 'book consultation' and use the 'New Patient' option to register.");
                    return; 
                }

                if (dialogflowResult.allRequiredParamsPresent && bookingReferenceId) {
                    try {
                        const tempRefs = await TemporaryBookingReference.findOne({ dialogflowSessionId: patient.dialogflowSessionId });
                        const bookingRef = tempRefs?.references.find(ref => ref.bookingReferenceId === bookingReferenceId);

                        if (bookingRef) {
                            await bookConsultationSlot(patient, bookingRef.doctorId, bookingRef.slotId);
                            // The `bookConsultationSlot` function should send the confirmation SMS
                            // to avoid sending a generic Dialogflow fulfillment message here.
                        } else {
                            console.error(`Booking failed: Invalid booking reference ID ${bookingReferenceId} for session ${patient.dialogflowSessionId}`);
                            await sendSms(from, TEXTBEE_SENDER_ID, "Sorry, that booking reference is invalid or has expired. Please request available appointments again.");
                            await clearContexts(patient._id);
                        }
                    } catch (bookingError) {
                        console.error(`Error booking slot for reference ${bookingReferenceId}:`, bookingError);
                        await sendSms(from, TEXTBEE_SENDER_ID, "Apologies, there was an issue booking your appointment. The slot might no longer be available. Please check available appointments again.");
                        await clearContexts(patient._id);
                    }
                } else {
                    // Dialogflow will prompt for bookingReferenceId if not present
                    await sendSms(from, TEXTBEE_SENDER_ID, dialogflowResult.fulfillmentText);
                }
            } else if (intentName === 'BookConsultation' && dialogflowResult.allRequiredParamsPresent) {
                if (patient.nrc.startsWith('TEMP-')){
                    // Backend validation before booking.
                    await sendSms(from, TEXTBEE_SENDER_ID, 'Please register as a new patient or verify as a returning patient before booking.');
                } else {
                    const reason = params.reason.stringValue;

                    if (reason) { 
                        await createAndScheduleConsultation(patient, reason);
                    } else {
                        // This case might occur if allRequiredParamsPresent is true but reason is somehow empty,
                        // or if Dialogflow provided a fulfillmentText without a specific action.
                        await sendSms(from, TEXTBEE_SENDER_ID, dialogflowResult.fulfillmentText);
                    }
                }
            } else {
                await sendSms(from, TEXTBEE_SENDER_ID, dialogflowResult.fulfillmentText);
            }
        }

        res.status(200).send('SMS received and processed by TextBee webhook.');
    } catch (error) {
        console.error('FATAL ERROR in /api/sms/incoming:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;