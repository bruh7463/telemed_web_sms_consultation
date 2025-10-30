// File: server/routes/sms_textbee.js
// Description: Handles the incoming SMS webhook from TextBee.

const express = require('express');
const router = express.Router();
const { Patient, Consultation, TemporaryBookingReference, Prescription, Doctor } = require('../models/db');
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
                // Show available slots for rescheduling the single appointment
                const appointment = upcomingAppointments[0];
                const doctor = await Doctor.findById(appointment.doctor);
                if (doctor && doctor.availability && doctor.availability.length > 0) {
                    // Show doctor's available slots for rescheduling
                    let message = `Select a new slot to reschedule your appointment with Dr. ${doctor.name}:\n\n`;
                    let slotNumber = 1;
                    doctor.availability.slice(0, 5).forEach((slot, slotIndex) => { // Show max 5 slots
                        if (!slot.isBooked && new Date(slot.startTime) > new Date()) {
                            const timeString = new Date(slot.startTime).toLocaleString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            });
                            const dateString = new Date(slot.startTime).toLocaleDateString('en-GB');
                            message += `${slotNumber}. ${timeString} on ${dateString}\n`;
                            slotNumber++;
                        }
                    });

                    if (slotNumber === 1) {
                        await sendSms(from, TEXTBEE_SENDER_ID, 'No slots are currently available for rescheduling. Please contact us directly or cancel and book a new appointment.');
                        return res.status(200).send('SMS processed: No available slots.');
                    }

                    message += '\nReply with "move 1", "move 2", etc. to select a new slot.';
                    await sendSms(from, TEXTBEE_SENDER_ID, message);
                    return res.status(200).send('SMS processed: Reschedule slots shown.');
                } else {
                    await sendSms(from, TEXTBEE_SENDER_ID, 'To reschedule your appointment, please visit our web portal or contact us directly. You can also cancel and book a new appointment.');
                    return res.status(200).send('SMS processed: Reschedule request noted.');
                }
            } else {
                // Multiple appointments - ask which one
                let message = 'You have multiple upcoming appointments:\n';
                upcomingAppointments.forEach((appt, index) => {
                    const timeString = new Date(appt.scheduledStart).toLocaleString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                    const dateString = new Date(appt.scheduledStart).toLocaleDateString('en-GB');
                    message += `${index + 1}. ${timeString} on ${dateString} with Dr. ${appt.doctor.name}\n`;
                });
                message += 'Please specify which appointment you want to reschedule by replying with "reschedule 1", "reschedule 2", etc.';
                await sendSms(from, TEXTBEE_SENDER_ID, message);
                return res.status(200).send('SMS processed: Multiple appointments found.');
            }
        }

        // Handle specific reschedule by number (selecting which appointment)
        const rescheduleMatch = lowerContent.match(/reschedule\s+(\d+)/);
        if (rescheduleMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const appointmentIndex = parseInt(rescheduleMatch[1]) - 1;
            const upcomingAppointments = await getUpcomingAppointments(patient);

            if (appointmentIndex >= 0 && appointmentIndex < upcomingAppointments.length) {
                const appointment = upcomingAppointments[appointmentIndex];
                const doctor = await Doctor.findById(appointment.doctor);
                if (doctor && doctor.availability && doctor.availability.length > 0) {
                    // Show doctor's available slots for rescheduling
                    let message = `Select a new slot to reschedule your appointment with Dr. ${doctor.name}:\n\n`;
                    let slotNumber = 1;
                    doctor.availability.slice(0, 5).forEach((slot, slotIndex) => { // Show max 5 slots
                        if (!slot.isBooked && new Date(slot.startTime) > new Date()) {
                            const timeString = new Date(slot.startTime).toLocaleString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            });
                            const dateString = new Date(slot.startTime).toLocaleDateString('en-GB');
                            message += `${slotNumber}. ${timeString} on ${dateString}\n`;
                            slotNumber++;
                        }
                    });

                    if (slotNumber === 1) {
                        await sendSms(from, TEXTBEE_SENDER_ID, 'No slots are currently available for rescheduling. Please contact us directly or cancel and book a new appointment.');
                        return res.status(200).send('SMS processed: No available slots.');
                    }

                    message += '\nReply with "move 1", "move 2", etc. to select a new slot.';
                    await sendSms(from, TEXTBEE_SENDER_ID, message);
                    return res.status(200).send('SMS processed: Reschedule slots shown.');
                } else {
                    await sendSms(from, TEXTBEE_SENDER_ID, 'To reschedule your appointment, please visit our web portal or contact us directly. You can also cancel this appointment and book a new one.');
                    return res.status(200).send('SMS processed: Reschedule request noted.');
                }
            } else {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Invalid appointment number. Please check your upcoming appointments.');
                return res.status(200).send('SMS processed: Invalid appointment number.');
            }
        }

        // Handle moving appointment to new slot
        const moveMatch = lowerContent.match(/move\s+(\d+)/);
        if (moveMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            const moveNumber = parseInt(moveMatch[1]) - 1; // Convert to 0-based
            const upcomingAppointments = await getUpcomingAppointments(patient);

            if (upcomingAppointments.length === 1) {
                // Single appointment - use it
                const appointment = upcomingAppointments[0];
                const doctor = await Doctor.findById(appointment.doctor);

                if (doctor && moveNumber >= 0) {
                    // Collect available slots into array to reference by move number
                    const availableSlots = [];
                    doctor.availability.slice(0, 10).forEach((slot) => { // Check more slots for availability
                        if (!slot.isBooked && new Date(slot.startTime) > new Date()) {
                            availableSlots.push(slot);
                        }
                    });

                    if (moveNumber < availableSlots.length) {
                        const newSlot = availableSlots[moveNumber];
                        // Reschedule to new slot
                        await rescheduleAppointment(patient, appointment._id, newSlot._id);
                        return res.status(200).send('SMS processed: Appointment rescheduled.');
                    } else {
                        await sendSms(from, TEXTBEE_SENDER_ID, 'Invalid slot number. Please choose a different slot.');
                        return res.status(200).send('SMS processed: Invalid slot.');
                    }
                } else {
                    await sendSms(from, TEXTBEE_SENDER_ID, 'No doctor information available. Please try again.');
                    return res.status(200).send('SMS processed: No doctor info.');
                }
            } else {
                // Multiple appointments - need to specify which one first
                await sendSms(from, TEXTBEE_SENDER_ID, 'You have multiple appointments. Please first specify which appointment to reschedule with "reschedule 1", "reschedule 2", etc., then select a new slot.');
                return res.status(200).send('SMS processed: Multiple appointments - need to specify first.');
            }
        }

        // Handle help commands
        if (lowerContent.includes('/help') || lowerContent.includes('how to use') || lowerContent.includes('what can i do')) {
            let helpMessage = `TELEMED HELP GUIDE\n\n`;

            helpMessage += `ACCOUNT REGISTRATION:\n`;
            helpMessage += `\"book consultation\" - Start registration process\n\n`;

            helpMessage += `HEALTH SYMPTOMS:\n`;
            helpMessage += `\"fever\", \"respiratory\", \"digestive\", \"heart\" - Assessment by category\n`;
            helpMessage += `\"continue\" - Proceed with symptom questions\n\n`;

            helpMessage += `APPOINTMENTS:\n`;
            helpMessage += `\"book 1\", \"book 2\" - Book available slots\n`;
            helpMessage += `\"my appointments\" - View upcoming appointments\n`;
            helpMessage += `\"cancel 1\", \"cancel 2\" - Cancel specific appointments\n`;
            helpMessage += `\"reschedule 1\" - Start rescheduling process\n`;
            helpMessage += `\"move 1\", \"move 2\" - Select new slots when rescheduling\n\n`;

            helpMessage += `PRESCRIPTIONS:\n`;
            helpMessage += `\"my prescriptions\" - View your prescriptions\n`;
            helpMessage += `\"view 1\", \"prescription 2\" - See specific prescription details\n\n`;

            helpMessage += `MEDICAL HISTORY:\n`;
            helpMessage += `\"update medical\" - Update your health records\n`;
            helpMessage += `\"add aspirin 100mg daily\" - Add medication\n`;
            helpMessage += `\"remove med 1\" - Remove medication\n`;
            helpMessage += `\"add allergy penicillin rash moderate\" - Add allergy\n`;
            helpMessage += `\"weight 70\", \"bp 120/80\", \"temp 36.5\" - Update vitals\n`;
            helpMessage += `\"smoking former\", \"alcohol moderate\" - Update lifestyle\n\n`;

            helpMessage += `SUPPORT:\n`;
            helpMessage += `\"help\" - Show this help guide\n\n`;

            helpMessage += `EMERGENCY:\n`;
            helpMessage += `If you have a medical emergency, please contact emergency services immediately or go to the nearest hospital.`;

            // Truncate if too long for SMS (SMS has character limits)
            if (helpMessage.length > 1400) {
                helpMessage = helpMessage.substring(0, 1350) + '...\n\nSend "help" for full guide via dashboard.';
            }

            await sendSms(from, TEXTBEE_SENDER_ID, helpMessage);
            return res.status(200).send('SMS processed: Help guide sent.');
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
                const prescriptions = await Prescription.find({
                    patient: patient._id,
                    status: 'ACTIVE'
                })
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
            const message = `Update Medical History\n\nSelect field to update:\n1. Current Medications\n2. Allergies\n3. Vital Signs (Weight, BP, etc.)\n4. Social History (Smoking/Alcohol)\n\nReply with "history 1", "history 2", etc.`;
            await sendSms(from, TEXTBEE_SENDER_ID, message);
            return res.status(200).send('SMS processed: Medical history options sent.');
        }

        // Handle medical history field selection (e.g., "history 1", "history 2", etc.) - only for medical update context
        // This should only trigger if the user has recently requested to update medical history
        const medicalFieldMatch = lowerContent.match(/history\s+(\d)/);
        if (medicalFieldMatch) {
            const fieldNumber = parseInt(medicalFieldMatch[1]);

            if (patient.nrc.startsWith('TEMP-')) {
                // Check if this might be part of chatbot flow - don't intercept medical history commands if temp patient
                // Skip medical field processing for temp patients and let it go to Dialogflow
                console.log('Skipping medical history match for temp patient:', patient.nrc);
            } else {
                // Only process if patient is registered
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
                message += '\nTo ADD a medication, reply with: "add medication_name dosage frequency"\n';
                message += 'Examples:\n"add aspirin 100mg daily"\n"add panadol 500mg twice daily"\n"add amoxicillin 250mg every 8 hours"\n\n';
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
        }

        // Handle medication updates: adding and removing
        const addMedMatch = lowerContent.match(/add\s+(?:med|medication|meds)?\s*(.+?)\s+(\d+(?:\.\d+)?\s*[a-z]+(?:\s*[a-z]+)*|\d+(?:\.\d+)?\s*[a-z]+)\s+(.+)/i);
        if (addMedMatch) {
            if (patient.nrc.startsWith('TEMP-')) {
                await sendSms(from, TEXTBEE_SENDER_ID, 'Please register or verify your account first. Type "book consultation" to get started.');
                return res.status(200).send('SMS processed: Patient needs to register first.');
            }

            let medication, dosage, frequency;

            if (addMedMatch[1] && addMedMatch[2] && addMedMatch[3]) {
                medication = addMedMatch[1].trim();
                dosage = addMedMatch[2].trim();
                frequency = addMedMatch[3].trim();
            } else {
                // Fallback parsing for edge cases
                const medDetails = addMedMatch[1]?.trim();
                if (!medDetails) {
                    await sendSms(from, TEXTBEE_SENDER_ID, 'Please provide medication in format: "add medication_name dosage frequency"\nExamples:\n"add aspirin 100mg daily"\n"add panadol 500mg twice daily"\n"add amoxicillin 250mg every 8 hours"');
                    return res.status(200).send('SMS processed: Invalid medication format.');
                }

                const words = medDetails.split(/\s+/);
                if (words.length < 3) {
                    await sendSms(from, TEXTBEE_SENDER_ID, 'Please provide medication in format: "add medication_name dosage frequency"\nExamples:\n"add aspirin 100mg daily"\n"add panadol 500mg twice daily"\n"add amoxicillin 250mg every 8 hours"');
                    return res.status(200).send('SMS processed: Incomplete medication information.');
                }

                medication = words[0];
                dosage = words[1];
                frequency = words.slice(2).join(' ');
            }

            // Common frequency patterns
            const commonFrequencies = [
                'once daily', 'twice daily', 'three times daily', 'four times daily',
                'daily', 'every 6 hours', 'every 8 hours', 'every 12 hours',
                'as needed', 'prn', 'morning', 'evening', 'night', 'twice weekly',
                'once weekly', 'every morning', 'every evening'
            ];

            // Check if frequency matches common patterns
            const lowerFreq = frequency.toLowerCase();
            const isValidFrequency = commonFrequencies.some(freq =>
                lowerFreq.includes(freq) ||
                freq.includes(lowerFreq) ||
                lowerFreq.includes('daily') ||
                lowerFreq.includes('hourly') ||
                lowerFreq.includes('weekly') ||
                lowerFreq.includes('prn') ||
                lowerFreq.includes('as needed')
            );

            if (!isValidFrequency && lowerFreq.length < 20) { // Allow longer custom frequencies
                await sendSms(from, TEXTBEE_SENDER_ID, `Please specify a valid frequency.\nCommon examples:\n• daily, twice daily, three times daily\n• every 6 hours, every 8 hours, every 12 hours\n• as needed (prn)\n• once weekly, twice weekly\n\nExample: "add aspirin 100mg twice daily"`);
                return res.status(200).send('SMS processed: Invalid frequency.');
            }

            try {
                const { MedicalHistory } = require('../models/db');
                let medicalHistory = await MedicalHistory.findOne({ patient: patient._id });

                if (!medicalHistory) {
                    medicalHistory = new MedicalHistory({
                        patient: patient._id,
                        createdBy: patient._id,
                        createdByType: 'patient',
                        updatedBy: patient._id,
                        updatedByType: 'patient'
                    });
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
                const prescriptions = await Prescription.find({
                    patient: patient._id,
                    status: 'ACTIVE'
                })
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
                        const bookingReferenceId = parseInt(params.bookingReferenceId?.numberValue);

                if (!patient || patient.nrc.startsWith('TEMP-')) {
                    await sendSms(from, TEXTBEE_SENDER_ID, "Please register or verify your account first before booking an appointment. Type 'book consultation' and use the 'New Patient' option to register.");
                    return;
                }

                if (dialogflowResult.allRequiredParamsPresent && bookingReferenceId && typeof bookingReferenceId === 'number') {
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
