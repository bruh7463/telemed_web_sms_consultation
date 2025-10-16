// File: server/routes/sms_textbee.js
// Description: Handles the incoming SMS webhook from TextBee.

const express = require('express');
const router = express.Router();
const { Patient, Consultation, TemporaryBookingReference, Prescription } = require('../models/db');
const { detectIntent } = require('../services/dialogflow');
const { sendSms } = require('../services/textbee_sms')
const { createAndScheduleConsultation, bookConsultationSlot, cancelAppointment, rescheduleAppointment, getUpcomingAppointments, evaluateTriage } = require('../logic/logic');
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

        // Add test mode logging
        if (process.env.NODE_ENV === 'test' || process.env.SMS_TEST_MODE === 'true') {
            console.log('TEST MODE: Processing SMS without actual sending');
        }

        let patient = await Patient.findOne({ phoneNumber: from });
        if (!patient) {
            console.log(`Creating new temporary patient record for ${from}`);
            patient = new Patient({ phoneNumber: from, name: `Guest_${from.replace(/\+/g, '')}`, nrc: `TEMP-${Date.now()}` });
            await patient.save();
        }
        
        if (!patient.dialogflowSessionId) {
            patient.dialogflowSessionId = `${patient._id}`; // Store only session name, not full path
            await patient.save();
        }

        // --- CHECK FOR APPOINTMENT MANAGEMENT KEYWORDS FIRST ---
        const lowerContent = content.toLowerCase().trim();
        const TEXTBEE_SENDER_ID = process.env.TEXTBEE_SENDER_ID;

        // Handle appointment management keywords (these should work even during active consultations)
        if (lowerContent.includes('cancel appointment') || lowerContent.includes('cancel my appointment')) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const upcomingAppointments = await getUpcomingAppointments(patient);
            if (upcomingAppointments.length === 0) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'You have no upcoming appointments to cancel.');
                return res.status(200).send('SMS processed: No appointments to cancel.');
            }

            if (upcomingAppointments.length === 1) {
                // Cancel the only appointment
                await cancelAppointment(patient, upcomingAppointments[0]._id);
                return res.status(200).send('SMS processed: Appointment cancelled.');
            } else {
                // Multiple appointments - ask which one
                let message = 'You have multiple upcoming appointments:\n';
                upcomingAppointments.forEach((appt, index) => {
                    message += `${index + 1}. ${new Date(appt.scheduledStart).toLocaleString()} with Dr. ${appt.doctor.name}\n`;
                });
                message += 'Reply with "cancel 1", "cancel 2", etc. to cancel a specific appointment.';
                await sendSms(from, TEXTBEE_SENDER_ID, message);
                return res.status(200).send('SMS processed: Multiple appointments found.');
            }
        }

        // Handle specific cancellation by number
        const cancelMatch = lowerContent.match(/cancel\s+(\d+)/);
        if (cancelMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const appointmentIndex = parseInt(cancelMatch[1]) - 1;
            const upcomingAppointments = await getUpcomingAppointments(patient);

            if (appointmentIndex >= 0 && appointmentIndex < upcomingAppointments.length) {
                await cancelAppointment(patient, upcomingAppointments[appointmentIndex]._id);
                return res.status(200).send('SMS processed: Appointment cancelled.');
            } else {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Invalid appointment number. Please check your upcoming appointments.');
                return res.status(200).send('SMS processed: Invalid appointment number.');
            }
        }

        // Handle reschedule requests
        if (lowerContent.includes('reschedule') || lowerContent.includes('change') || lowerContent.includes('move appointment')) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const upcomingAppointments = await getUpcomingAppointments(patient);
            if (upcomingAppointments.length === 0) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'You have no upcoming appointments to reschedule.');
                return res.status(200).send('SMS processed: No appointments to reschedule.');
            }

            if (upcomingAppointments.length === 1) {
                // Show available slots for rescheduling
                await sendSms(from, TEXTBEE_SENDER_ID, 'To reschedule your appointment, please visit our web portal or contact us directly. You can also cancel and book a new appointment.');
                return res.status(200).send('SMS processed: Reschedule request noted.');
            } else {
                // Multiple appointments - ask which one
                let message = 'You have multiple upcoming appointments:\n';
                upcomingAppointments.forEach((appt, index) => {
                    message += `${index + 1}. ${new Date(appt.scheduledStart).toLocaleString()} with Dr. ${appt.doctor.name}\n`;
                });
                message += 'Please specify which appointment you want to reschedule by replying with "reschedule 1", "reschedule 2", etc.';
                await sendSms(from, TEXTBEE_SENDER_ID, message);
                return res.status(200).send('SMS processed: Multiple appointments found.');
            }
        }

        // Handle specific reschedule by number
        const rescheduleMatch = lowerContent.match(/reschedule\s+(\d+)/);
        if (rescheduleMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const appointmentIndex = parseInt(rescheduleMatch[1]) - 1;
            const upcomingAppointments = await getUpcomingAppointments(patient);

            if (appointmentIndex >= 0 && appointmentIndex < upcomingAppointments.length) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'To reschedule your appointment, please visit our web portal or contact us directly. You can also cancel this appointment and book a new one.');
                return res.status(200).send('SMS processed: Reschedule request noted.');
            } else {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Invalid appointment number. Please check your upcoming appointments.');
                return res.status(200).send('SMS processed: Invalid appointment number.');
            }
        }

        // Handle appointment status queries
        if (lowerContent.includes('my appointments') || lowerContent.includes('upcoming') || lowerContent.includes('appointments')) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const upcomingAppointments = await getUpcomingAppointments(patient);
            if (upcomingAppointments.length === 0) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'You have no upcoming appointments.');
                return res.status(200).send('SMS processed: No upcoming appointments.');
            }

            let message = 'Your upcoming appointments:\n';
            upcomingAppointments.forEach((appt, index) => {
                message += `${index + 1}. ${new Date(appt.scheduledStart).toLocaleString()} with Dr. ${appt.doctor.name}\n`;
            });
            message += 'Reply with "cancel 1" or "reschedule 1" to manage specific appointments.';
            await sendSms(from, TEXTBEE_SENDER_ID, message);
            return res.status(200).send('SMS processed: Appointments listed.');
        }

        // Handle prescription queries with selection capability
        if (lowerContent.includes('my prescriptions') || lowerContent.includes('prescriptions') || lowerContent.includes('medication')) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            try {
                const prescriptions = await Prescription.find({ patient: patient._id })
                    .populate('doctor', 'name specialty')
                    .sort({ createdAt: -1 })
                    .limit(10); // Show up to 10 prescriptions

                if (prescriptions.length === 0) {
                    await sendSms(from, TEXTBEE_SENDER_ID, 'You have no prescriptions on record. Please consult with a doctor to get prescriptions.');
                    return res.status(200).send('SMS processed: No prescriptions found.');
                }

                // If there's only one prescription, show it in detail immediately
                if (prescriptions.length === 1) {
                    const prescription = prescriptions[0];
                    let message = `Your Prescription\nfrom Dr. ${prescription.doctor.name}\n\n`;

                    if (prescription.diagnosis) {
                        message += `Diagnosis: ${prescription.diagnosis}\n\n`;
                    }

                    message += `MEDICATIONS:\n`;
                    prescription.medications.forEach((med, medIndex) => {
                        message += `${medIndex + 1}. ${med.name}\n`;
                        message += `   Dosage: ${med.dosage}\n`;
                        message += `   Frequency: ${med.frequency}\n`;
                        message += `   Duration: ${med.duration}\n`;
                        if (med.instructions) {
                            message += `   Instructions: ${med.instructions}\n`;
                        }
                        message += `\n`;
                    });

                    if (prescription.notes) {
                        message += `Notes: ${prescription.notes}\n\n`;
                    }

                    if (prescription.allergies) {
                        message += `Allergies: ${prescription.allergies}\n\n`;
                    }

                    message += `Date: ${new Date(prescription.createdAt).toLocaleDateString()}`;

                    // Truncate if too long for SMS
                    if (message.length > 1400) {
                        message = message.substring(0, 1350) + '...\n\nFor full details, please check your patient dashboard.';
                    }

                    await sendSms(from, TEXTBEE_SENDER_ID, message);
                    return res.status(200).send('SMS processed: Single prescription sent.');
                }

                // Multiple prescriptions - show numbered list for selection
                let message = `Your Prescriptions (${prescriptions.length} total):\n\n`;
                prescriptions.forEach((prescription, index) => {
                    message += `${index + 1}. Date: ${new Date(prescription.createdAt).toLocaleDateString()}\n`;
                    message += `   Dr. ${prescription.doctor.name || 'Unknown'}\n`;
                    message += `   ${prescription.medications.length} medication${prescription.medications.length > 1 ? 's' : ''}\n`;
                    if (prescription.diagnosis) {
                        message += `   Diagnosis: ${prescription.diagnosis.substring(0, 30)}${prescription.diagnosis.length > 30 ? '...' : ''}\n`;
                    }
                    message += `\n`;
                });

                message += `Reply with "view 1", "view 2", etc. to see prescription details.\nOr "prescription 1", "prescription 2", etc.`;

                // Truncate if too long for SMS
                if (message.length > 1400) {
                    message = message.substring(0, 1350) + '...\n\nFor full list, please check your patient dashboard.';
                }

                await sendSms(from, TEXTBEE_SENDER_ID, message);
                return res.status(200).send('SMS processed: Prescription list sent.');

            } catch (error) {
                console.error('Error fetching prescriptions:', error);
                await sendSms(from, TEXTBEE_SENDER_ID, 'Sorry, there was an error retrieving your prescriptions. Please try again later.');
                return res.status(200).send('SMS processed: Error fetching prescriptions.');
            }
        }

        // Handle prescription selection requests (e.g., "view 1", "prescription 2")
        const prescriptionSelectMatch = lowerContent.match(/\b(?:view|prescription|select)\s+(\d+)\b/);

        // Handle medical history update requests
        if (lowerContent.includes('update medical') || lowerContent.includes('update history') ||
            lowerContent.includes('medical update') || lowerContent.includes('update meds') ||
            lowerContent.includes('update medication') || lowerContent.includes('update allergies') ||
            lowerContent.includes('update vitals') || lowerContent.includes('update vital signs')) {

            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            // Present options for medical history fields that can be updated via SMS
            const message = `Update Medical History\n\nSelect field to update:\n1. Current Medications\n2. Allergies\n3. Vital Signs (Weight, BP, etc.)\n4. Social History (Smoking/Alcohol)\n\nReply with the number (e.g., "1" for medications)`;
            await sendSms(from, TEXTBEE_SENDER_ID, message);
            return res.status(200).send('SMS processed: Medical history options sent.');
        }

        // Handle medical history field selection (e.g., "1", "2", etc.)
        const medicalFieldMatch = lowerContent.match(/^(?:update\s+)?(?:field\s+)?(\d+)$/);
        if (medicalFieldMatch) {
            const fieldNumber = parseInt(medicalFieldMatch[1]);

            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const fieldMap = {
                1: 'currentMedications',
                2: 'allergies',
                3: 'vitalSigns',
                4: 'socialHistory'
            };

            const selectedField = fieldMap[fieldNumber];
            if (!selectedField) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Invalid option. Please select 1-4 for medical history fields.');
                return res.status(200).send('SMS processed: Invalid selection.');
            }

            if (selectedField === 'currentMedications') {
                // List current medications first
                const { MedicalHistory } = require('../models/db');
                const medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                let message = 'Current Medications:\n';
                if (medicalHistory && medicalHistory.currentMedications && medicalHistory.currentMedications.length > 0) {
                    medicalHistory.currentMedications.forEach((med, index) => {
                        message += `${index + 1}. ${med.medication} - ${med.dosage} ${med.frequency}\n`;
                    });
                } else {
                    message += 'No current medications recorded.\n';
                }
                message += '\nTo ADD a medication, reply with: "add med [name] [dosage] [frequency]"\n';
                message += 'Example: "add med aspirin 100mg daily"\n\n';
                message += 'To REMOVE a medication, reply with: "remove med [number]"\n';
                message += 'Example: "remove med 1"';

                await sendSms(from, TEXTBEE_SENDER_ID, message);
                return res.status(200).send('SMS processed: Current medications listed.');
            }

            if (selectedField === 'allergies') {
                // List current allergies first
                const { MedicalHistory } = require('../models/db');
                const medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                let message = 'Current Allergies:\n';
                if (medicalHistory && medicalHistory.allergies && medicalHistory.allergies.length > 0) {
                    medicalHistory.allergies.forEach((allergy, index) => {
                        message += `${index + 1}. ${allergy.allergen} - ${allergy.reaction} (${allergy.severity})\n`;
                    });
                } else {
                    message += 'No allergies recorded.\n';
                }
                message += '\nTo ADD an allergy, reply with: "add allergy [allergen] [reaction] [severity]"\n';
                message += 'Example: "add allergy penicillin rash moderate"\n\n';
                message += 'To REMOVE an allergy, reply with: "remove allergy [number]"\n';
                message += 'Example: "remove allergy 1"';

                await sendSms(from, TEXTBEE_SENDER_ID, message);
                return res.status(200).send('SMS processed: Current allergies listed.');
            }

            if (selectedField === 'vitalSigns') {
                // Show current vitals and options for update
                const { MedicalHistory } = require('../models/db');
                const medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                let message = 'Current Vital Signs:\n';
                if (medicalHistory && medicalHistory.vitalSigns) {
                    const vitals = medicalHistory.vitalSigns;
                    if (vitals.weight) message += `Weight: ${vitals.weight} kg\n`;
                    if (vitals.bloodPressure && vitals.bloodPressure.systolic) {
                        message += `BP: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}\n`;
                    }
                    if (vitals.heartRate) message += `Heart Rate: ${vitals.heartRate} bpm\n`;
                    if (vitals.temperature) message += `Temperature: ${vitals.temperature}°C\n`;
                    if (vitals.height) message += `Height: ${vitals.height} cm\n`;
                    if (vitals.bmi) message += `BMI: ${vitals.bmi}\n`;
                } else {
                    message += 'No vital signs recorded.\n';
                }
                message += '\nReply with vitals to update:\n';
                message += 'Example: "weight 70" or "bp 120/80" or "temp 36.5"';

                await sendSms(from, TEXTBEE_SENDER_ID, message);
                return res.status(200).send('SMS processed: Current vitals shown.');
            }

            if (selectedField === 'socialHistory') {
                // Show social history options
                const { MedicalHistory } = require('../models/db');
                const medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                let message = 'Social History:\n';
                if (medicalHistory && medicalHistory.socialHistory) {
                    const social = medicalHistory.socialHistory;
                    message += `Smoking: ${social.smoking.status}\n`;
                    message += `Alcohol: ${social.alcohol.status}\n`;
                } else {
                    message += 'No social history recorded.\n';
                }
                message += '\nUpdate smoking: "smoking never/former/current"\n';
                message += 'Update alcohol: "alcohol never/occasional/moderate/heavy"\n';
                message += 'Example: "smoking former" or "alcohol moderate"';

                await sendSms(from, TEXTBEE_SENDER_ID, message);
                return res.status(200).send('SMS processed: Social history options shown.');
            }
        }

        // Handle medication updates: adding and removing
        const addMedMatch = lowerContent.match(/add med(?:ication)?\s+(.+)/i);
        if (addMedMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const medDetails = addMedMatch[1].trim();
            // Simple parsing: assume format "name dosage frequency"
            const parts = medDetails.split(/\s+/);
            if (parts.length < 3) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please provide medication in format: "add med [name] [dosage] [frequency]"\nExample: "add med aspirin 100mg daily"');
                return res.status(200).send('SMS processed: Invalid medication format.');
            }

            const medication = parts[0];
            const dosage = parts[1];
            const frequency = parts.slice(2).join(' ');

            try {
                const { MedicalHistory } = require('../models/db');
                let medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                if (!medicalHistory) {
                    medicalHistory = new MedicalHistory({ patient: patient._id });
                }

                medicalHistory.currentMedications.push({
                    medication,
                    dosage,
                    frequency,
                    status: 'active',
                    lastUpdated: new Date(),
                    updatedBy: patient._id,
                    updatedByType: 'patient'
                });

                await medicalHistory.save();

                await sendSms(from, TEXTBEE_SENDER_ID, `Added medication: ${medication} ${dosage} ${frequency}\n\nReply "update medical" to continue updating.`);
                return res.status(200).send('SMS processed: Medication added.');
            } catch (error) {
                console.error('Error adding medication:', error);
                await sendSms(from, TEXTBEE_SENDER_ID, 'Sorry, there was an error updating your medication. Please try again.');
                return res.status(200).send('SMS processed: Error adding medication.');
            }
        }

        const removeMedMatch = lowerContent.match(/remove med(?:ication)?\s+(\d+)/i);
        if (removeMedMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const medIndex = parseInt(removeMedMatch[1]) - 1; // Convert to 0-based

            try {
                const { MedicalHistory } = require('../models/db');
                const medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                if (!medicalHistory || !medicalHistory.currentMedications || medIndex < 0 || medIndex >= medicalHistory.currentMedications.length) {
                    await sendSms(from, TEXTBEE_SENDER_ID, 'Invalid medication number. Please check your current medications first.');
                    return res.status(200).send('SMS processed: Invalid medication selection.');
                }

                const removedMed = medicalHistory.currentMedications.splice(medIndex, 1)[0];
                medicalHistory.currentMedications = medicalHistory.currentMedications.map(med => ({
                    ...med,
                    lastUpdated: new Date(),
                    updatedBy: patient._id,
                    updatedByType: 'patient'
                }));

                await medicalHistory.save();

                await sendSms(from, TEXTBEE_SENDER_ID, `Removed medication: ${removedMed.medication}\n\nReply "update medical" to continue updating.`);
                return res.status(200).send('SMS processed: Medication removed.');
            } catch (error) {
                console.error('Error removing medication:', error);
                await sendSms(from, TEXTBEE_SENDER_ID, 'Sorry, there was an error updating your medication. Please try again.');
                return res.status(200).send('SMS processed: Error removing medication.');
            }
        }

        // Handle allergy updates: adding and removing
        const addAllergyMatch = lowerContent.match(/add allergy\s+(.+)/i);
        if (addAllergyMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const allergyDetails = addAllergyMatch[1].trim();
            // Simple parsing: assume format "allergen reaction severity"
            const parts = allergyDetails.split(/\s+/);
            if (parts.length < 2) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please provide allergy in format: "add allergy [allergen] [reaction] [severity]"\nExample: "add allergy penicillin rash moderate"');
                return res.status(200).send('SMS processed: Invalid allergy format.');
            }

            const allergen = parts[0];
            const reaction = parts[1];
            const severity = parts[2] || 'mild';

            try {
                const { MedicalHistory } = require('../models/db');
                let medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                if (!medicalHistory) {
                    medicalHistory = new MedicalHistory({ patient: patient._id });
                }

                medicalHistory.allergies.push({
                    allergen,
                    reaction,
                    severity: severity.toLowerCase(),
                    status: 'active',
                    lastUpdated: new Date(),
                    updatedBy: patient._id,
                    updatedByType: 'patient'
                });

                await medicalHistory.save();

                await sendSms(from, TEXTBEE_SENDER_ID, `Added allergy: ${allergen} - ${reaction} (${severity})\n\nReply "update medical" to continue updating.`);
                return res.status(200).send('SMS processed: Allergy added.');
            } catch (error) {
                console.error('Error adding allergy:', error);
                await sendSms(from, TEXTBEE_SENDER_ID, 'Sorry, there was an error updating your allergy. Please try again.');
                return res.status(200).send('SMS processed: Error adding allergy.');
            }
        }

        const removeAllergyMatch = lowerContent.match(/remove allergy\s+(\d+)/i);
        if (removeAllergyMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const allergyIndex = parseInt(removeAllergyMatch[1]) - 1; // Convert to 0-based

            try {
                const { MedicalHistory } = require('../models/db');
                const medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                if (!medicalHistory || !medicalHistory.allergies || allergyIndex < 0 || allergyIndex >= medicalHistory.allergies.length) {
                    await sendSms(from, TEXTBEE_SENDER_ID, 'Invalid allergy number. Please check your current allergies first.');
                    return res.status(200).send('SMS processed: Invalid allergy selection.');
                }

                const removedAllergy = medicalHistory.allergies.splice(allergyIndex, 1)[0];
                medicalHistory.allergies = medicalHistory.allergies.map(allergy => ({
                    ...allergy,
                    lastUpdated: new Date(),
                    updatedBy: patient._id,
                    updatedByType: 'patient'
                }));

                await medicalHistory.save();

                await sendSms(from, TEXTBEE_SENDER_ID, `Removed allergy: ${removedAllergy.allergen}\n\nReply "update medical" to continue updating.`);
                return res.status(200).send('SMS processed: Allergy removed.');
            } catch (error) {
                console.error('Error removing allergy:', error);
                await sendSms(from, TEXTBEE_SENDER_ID, 'Sorry, there was an error updating your allergy. Please try again.');
                return res.status(200).send('SMS processed: Error removing allergy.');
            }
        }

        // Handle vital signs updates
        const weightMatch = lowerContent.match(/weight\s+(\d+(?:\.\d+)?)/i);
        if (weightMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const weight = parseFloat(weightMatch[1]);
            try {
                const { MedicalHistory } = require('../models/db');
                let medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                if (!medicalHistory) {
                    medicalHistory = new MedicalHistory({ patient: patient._id });
                }

                if (!medicalHistory.vitalSigns) {
                    medicalHistory.vitalSigns = {};
                }

                medicalHistory.vitalSigns.weight = weight;
                medicalHistory.vitalSigns.lastUpdated = new Date();
                medicalHistory.vitalSigns.updatedBy = patient._id;
                medicalHistory.vitalSigns.updatedByType = 'patient';

                // Recalculate BMI if height exists
                if (medicalHistory.vitalSigns.height) {
                    medicalHistory.vitalSigns.bmi = (weight / Math.pow(medicalHistory.vitalSigns.height / 100, 2)).toFixed(1);
                }

                await medicalHistory.save();
                await sendSms(from, TEXTBEE_SENDER_ID, `Updated weight to ${weight} kg\n\nReply "update medical" to continue updating.`);
                return res.status(200).send('SMS processed: Weight updated.');
            } catch (error) {
                console.error('Error updating weight:', error);
                await sendSms(from, TEXTBEE_SENDER_ID, 'Sorry, there was an error updating your weight. Please try again.');
                return res.status(200).send('SMS processed: Error updating weight.');
            }
        }

        const bpMatch = lowerContent.match(/bp\s+(\d+)\/(\d+)/i);
        if (bpMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const systolic = parseInt(bpMatch[1]);
            const diastolic = parseInt(bpMatch[2]);

            try {
                const { MedicalHistory } = require('../models/db');
                let medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                if (!medicalHistory) {
                    medicalHistory = new MedicalHistory({ patient: patient._id });
                }

                if (!medicalHistory.vitalSigns) {
                    medicalHistory.vitalSigns = {};
                }

                medicalHistory.vitalSigns.bloodPressure = {
                    systolic,
                    diastolic,
                    measuredDate: new Date()
                };
                medicalHistory.vitalSigns.lastUpdated = new Date();
                medicalHistory.vitalSigns.updatedBy = patient._id;
                medicalHistory.vitalSigns.updatedByType = 'patient';

                await medicalHistory.save();
                await sendSms(from, TEXTBEE_SENDER_ID, `Updated blood pressure to ${systolic}/${diastolic}\n\nReply "update medical" to continue updating.`);
                return res.status(200).send('SMS processed: Blood pressure updated.');
            } catch (error) {
                console.error('Error updating blood pressure:', error);
                await sendSms(from, TEXTBEE_SENDER_ID, 'Sorry, there was an error updating your blood pressure. Please try again.');
                return res.status(200).send('SMS processed: Error updating blood pressure.');
            }
        }

        const tempMatch = lowerContent.match(/temp(?:erature)?\s+(\d+(?:\.\d+)?)/i);
        if (tempMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const temperature = parseFloat(tempMatch[1]);
            try {
                const { MedicalHistory } = require('../models/db');
                let medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                if (!medicalHistory) {
                    medicalHistory = new MedicalHistory({ patient: patient._id });
                }

                if (!medicalHistory.vitalSigns) {
                    medicalHistory.vitalSigns = {};
                }

                medicalHistory.vitalSigns.temperature = temperature;
                medicalHistory.vitalSigns.lastUpdated = new Date();
                medicalHistory.vitalSigns.updatedBy = patient._id;
                medicalHistory.vitalSigns.updatedByType = 'patient';

                await medicalHistory.save();
                await sendSms(from, TEXTBEE_SENDER_ID, `Updated temperature to ${temperature}°C\n\nReply "update medical" to continue updating.`);
                return res.status(200).send('SMS processed: Temperature updated.');
            } catch (error) {
                console.error('Error updating temperature:', error);
                await sendSms(from, TEXTBEE_SENDER_ID, 'Sorry, there was an error updating your temperature. Please try again.');
                return res.status(200).send('SMS processed: Error updating temperature.');
            }
        }

        // Handle social history updates
        const smokingMatch = lowerContent.match(/smoking\s+(never|former|current)/i);
        if (smokingMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const status = smokingMatch[1].toLowerCase();
            try {
                const { MedicalHistory } = require('../models/db');
                let medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                const isNew = !medicalHistory;
                if (!medicalHistory) {
                    medicalHistory = new MedicalHistory({
                        patient: patient._id,
                        createdBy: patient._id,
                        createdByType: 'patient',
                        updatedBy: patient._id,
                        updatedByType: 'patient'
                    });
                }

                if (!medicalHistory.socialHistory) {
                    medicalHistory.socialHistory = {};
                }

                if (!medicalHistory.socialHistory.smoking) {
                    medicalHistory.socialHistory.smoking = {};
                }

                medicalHistory.socialHistory.smoking.status = status;
                medicalHistory.socialHistory.smoking.lastUpdated = new Date();
                medicalHistory.socialHistory.smoking.updatedBy = patient._id;
                medicalHistory.socialHistory.smoking.updatedByType = 'patient';
                medicalHistory.socialHistory.lastUpdated = new Date();
                medicalHistory.socialHistory.updatedBy = patient._id;
                medicalHistory.socialHistory.updatedByType = 'patient';

                // Always update main document metadata
                medicalHistory.updatedBy = patient._id;
                medicalHistory.updatedByType = 'patient';

                await medicalHistory.save();
                await sendSms(from, TEXTBEE_SENDER_ID, `Updated smoking status to "${status}"\n\nReply "update medical" to continue updating.`);
                return res.status(200).send('SMS processed: Smoking status updated.');
            } catch (error) {
                console.error('Error updating smoking status:', error);
                await sendSms(from, TEXTBEE_SENDER_ID, 'Sorry, there was an error updating your smoking status. Please try again.');
                return res.status(200).send('SMS processed: Error updating smoking status.');
            }
        }

        const alcoholMatch = lowerContent.match(/alcohol\s+(never|occasional|moderate|heavy)/i);
        if (alcoholMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const status = alcoholMatch[1].toLowerCase();
            try {
                const { MedicalHistory } = require('../models/db');
                let medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                const isNew = !medicalHistory;
                if (!medicalHistory) {
                    medicalHistory = new MedicalHistory({
                        patient: patient._id,
                        createdBy: patient._id,
                        createdByType: 'patient',
                        updatedBy: patient._id,
                        updatedByType: 'patient'
                    });
                }

                if (!medicalHistory.socialHistory) {
                    medicalHistory.socialHistory = {};
                }

                if (!medicalHistory.socialHistory.alcohol) {
                    medicalHistory.socialHistory.alcohol = {};
                }

                medicalHistory.socialHistory.alcohol.status = status;
                medicalHistory.socialHistory.alcohol.lastUpdated = new Date();
                medicalHistory.socialHistory.alcohol.updatedBy = patient._id;
                medicalHistory.socialHistory.alcohol.updatedByType = 'patient';
                medicalHistory.socialHistory.lastUpdated = new Date();
                medicalHistory.socialHistory.updatedBy = patient._id;
                medicalHistory.socialHistory.updatedByType = 'patient';

                // Always update main document metadata
                medicalHistory.updatedBy = patient._id;
                medicalHistory.updatedByType = 'patient';

                await medicalHistory.save();
                await sendSms(from, TEXTBEE_SENDER_ID, `Updated alcohol status to "${status}"\n\nReply "update medical" to continue updating.`);
                return res.status(200).send('SMS processed: Alcohol status updated.');
            } catch (error) {
                console.error('Error updating alcohol status:', error);
                await sendSms(from, TEXTBEE_SENDER_ID, 'Sorry, there was an error updating your alcohol status. Please try again.');
                return res.status(200).send('SMS processed: Error updating alcohol status.');
            }
        }
        if (prescriptionSelectMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const prescriptionIndex = parseInt(prescriptionSelectMatch[1]) - 1; // Convert to 0-based index

            try {
                const prescriptions = await Prescription.find({ patient: patient._id })
                    .populate('doctor', 'name specialty')
                    .sort({ createdAt: -1 })
                    .limit(10);

                if (prescriptionIndex < 0 || prescriptionIndex >= prescriptions.length) {
                    await sendSms(from, TEXTBEE_SENDER_ID, `Invalid prescription number. You have ${prescriptions.length} prescriptions. Reply with "view 1" to view the most recent prescription.`);
                    return res.status(200).send('SMS processed: Invalid prescription selection.');
                }

                const prescription = prescriptions[prescriptionIndex];
                let message = `PRESCRIPTION DETAILS\nfrom Dr. ${prescription.doctor.name}\n\n`;

                if (prescription.diagnosis) {
                    message += `Diagnosis: ${prescription.diagnosis}\n\n`;
                }

                message += `MEDICATIONS:\n`;
                prescription.medications.forEach((med, medIndex) => {
                    message += `${medIndex + 1}. ${med.name}\n`;
                    message += `   Dosage: ${med.dosage}\n`;
                    message += `   Frequency: ${med.frequency}\n`;
                    message += `   Duration: ${med.duration}\n`;
                    if (med.instructions) {
                        message += `   Instructions: ${med.instructions}\n`;
                    }
                    message += `\n`;
                });

                if (prescription.notes) {
                    message += `Notes: ${prescription.notes}\n\n`;
                }

                if (prescription.allergies) {
                    message += `Allergies: ${prescription.allergies}\n\n`;
                }

                message += `Status: ${prescription.status}\n`;
                message += `Date: ${new Date(prescription.createdAt).toLocaleDateString()}`;

                if (prescription.status !== 'ACTIVE') {
                    message += `\n\nTo get a new prescription, type "book consultation".`;
                }

                // Truncate if too long for SMS
                if (message.length > 1400) {
                    message = message.substring(0, 1350) + '...\n\nFor full details, please check your patient dashboard.';
                }

                await sendSms(from, TEXTBEE_SENDER_ID, message);
                return res.status(200).send('SMS processed: Prescription details sent.');

            } catch (error) {
                console.error('Error fetching prescription details:', error);
                await sendSms(from, TEXTBEE_SENDER_ID, 'Sorry, there was an error retrieving prescription details. Please try again later.');
                return res.status(200).send('SMS processed: Error fetching prescription details.');
            }
        }

        const existingConsultation = await Consultation.findOne({
            patient: patient._id,
            status: { $in: ['PENDING', 'ACTIVE'] }
        });

        if (existingConsultation) {
            // --- ROUTE TO DOCTOR ---
            console.log(`Message is part of existing consultation ${existingConsultation._id}`);
            existingConsultation.messages.push({
                sender: 'PATIENT',
                content,
                channel: 'sms'  // Mark as coming from SMS
            });
            if (existingConsultation.status === 'PENDING') {
                existingConsultation.status = 'ACTIVE';
            }
            await existingConsultation.save();
            // No automated response when routing to doctor, typically a human will reply.
        } else {
        // --- ROUTE TO CHATBOT ---
            console.log(`Routing message to Dialogflow for patient ${patient._id}`);

            // Ensure sessionId is just the session name, not full path (migrate old data)
            let sessionId = patient.dialogflowSessionId;
            if (sessionId && sessionId.startsWith('projects/')) {
                const parts = sessionId.split('/');
                sessionId = parts[parts.length - 1]; // Get last part (session name)
                patient.dialogflowSessionId = sessionId; // Update in database
                await patient.save();
            }

            const dialogflowResult = await detectIntent(process.env.DIALOGFLOW_PROJECT_ID, sessionId, content);
            const intentName = dialogflowResult.intent.displayName;
            const params = dialogflowResult.parameters.fields;

            // TEXTBEE_SENDER_ID is already declared above
            if (!TEXTBEE_SENDER_ID) {
                console.error('TEXTBEE_SENDER_ID environment variable is not set. Outgoing SMS cannot be sent.');
                // Decide how to handle this gracefully: send generic error, log, etc.
                return res.status(500).send('Server configuration error: Outgoing SMS sender ID missing.');
            }

            if (intentName === 'RegisterNewPatient' && dialogflowResult.allRequiredParamsPresent) {
                
                let firstName = params.first_name?.stringValue;
                if (typeof firstName === 'string' && firstName.length > 0) {
                    firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
                } else {
                    firstName = 'NULL';
                }

                let lastName = params.last_name?.stringValue;
                if (typeof lastName === 'string' && lastName.length > 0) {
                    lastName = lastName.charAt(0).toUpperCase() + lastName.slice(1);
                } else {
                    lastName = 'NULL';
                }

                const nrc = params.nrc?.stringValue || params.nrc?.numberValue?.toString();
                const dateOfBirth = params.dateOfBirth?.stringValue ? new Date(params.dateOfBirth.stringValue) : undefined;
                const gender = params.gender?.stringValue;
                const address = params.address?.stringValue;

                if (!firstName || !lastName || !nrc || !dateOfBirth || !gender || !address) {
                    console.error("Missing required parameters (first_name, last_name, or nrc) from Dialogflow.");
                    await sendSms(from, TEXTBEE_SENDER_ID, 'Please must sure you enter all required details. Type "book consultation" to restart the process.');
                    await clearContexts(patient.dialogflowSessionId);
                    patient.dialogflowSessionId = `${patient._id}_${Date.now()}`;
                    return res.status(400).send("Missing parameters from Dialogflow.");
                }
                
                const name = (firstName !== 'NULL' || lastName !== 'NULL') ? `${firstName} ${lastName}` : 'Unnamed Patient';
                let existingPatientNRC = await Patient.findOne({ nrc });
                let existingPatientPhone = await Patient.findOne({ from });

                if (existingPatientNRC) {

                    await sendSms(from, TEXTBEE_SENDER_ID, `A patient with NRC ${nrc} already exists. Type 'book consultation' and use the 'Returning Patient' option.`);
                    await clearContexts(patient.dialogflowSessionId); 
                    patient.dialogflowSessionId = `${patient._id}_${Date.now()}`;

                } else if (existingPatientNRC && existingPatientNRC.phoneNumber !== from) {
                    
                    // NRC exists but phone number is different
                    await sendSms(from, TEXTBEE_SENDER_ID, `A patient with NRC ${nrc} is already registered with a different phone number. Please ensure you are using the correct number or register with a unique NRC. Type 'book consultation' to restart the process.`);
                    await clearContexts(patient.dialogflowSessionId); 
                    patient.dialogflowSessionId = `${patient._id}_${Date.now()}`;

                } else if (existingPatientPhone) {

                    await sendSms(from, TEXTBEE_SENDER_ID, `A patient with phone number ${from} already exists. Type 'book consultation' and use the 'Returning Patient' option.`);
                    await clearContexts(patient.dialogflowSessionId);
                    patient.dialogflowSessionId = `${patient._id}_${Date.now()}`;

                } else if (nrc.length < 9 || nrc.length > 9) {

                    await sendSms(from, TEXTBEE_SENDER_ID, `The NRC number ${nrc} is invalid. Please ensure it is exactly 9 characters long. Type 'book consultation' to restart the process.`);
                    await clearContexts(patient.dialogflowSessionId); 
                    patient.dialogflowSessionId = `${patient._id}_${Date.now()}`;
                
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
                    await clearContexts(patient.dialogflowSessionId); 
                    patient.dialogflowSessionId = `${patient._id}_${Date.now()}`;
                    return res.status(400).send("Missing NRC from Dialogflow.");

                } else if (existingPatientPhone ==! from) {
                    await sendSms(from, TEXTBEE_SENDER_ID, `A patient with phone number ${from} already exists. Type 'book consultation' and use the 'Returning Patient' option.`);
                    await clearContexts(patient.dialogflowSessionId); 
                    patient.dialogflowSessionId = `${patient._id}_${Date.now()}`;
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
                            // Linking the session to the found patient (store only session name)
                            patient.dialogflowSessionId = `${foundPatient._id}`;
                            await patient.save();
                        }
                        await sendSms(from, TEXTBEE_SENDER_ID, dialogflowResult.fulfillmentText);
                    } else {
                        await sendSms(from, TEXTBEE_SENDER_ID, `Sorry, we couldn't find a patient with NRC ${nrc} and this phone number. Type 'book consultation' and use the 'New Patient' option to register.`);
                        await clearContexts(patient.dialogflowSessionId); 
                        patient.dialogflowSessionId = `${patient._id}_${Date.now()}`;
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

                    if (reason && reason.toLowerCase() !== "book consultation") {
                        // Book with the provided reason
                        await createAndScheduleConsultation(patient, reason);
                    } else {
                        // If reason is "book consultation", it means Dialogflow extracted the phrase incorrectly
                        // Clear contexts and reset the session by generating a new session ID
                        await clearContexts(patient.dialogflowSessionId);
                        patient.dialogflowSessionId = `${patient._id}_${Date.now()}`; 
                        await patient.save();
                        console.log(`Reset Dialogflow session for patient ${patient._id} to ${patient.dialogflowSessionId}`);
                    }
                }
            } else if (intentName === 'TriageResults') {
                const triageMessage = evaluateTriage(params);
                await sendSms(from, TEXTBEE_SENDER_ID, triageMessage);

                // Optionally clear contexts after triage to reset
                await clearContexts(patient._id);
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
