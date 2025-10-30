// File: server/logic/logic.js
// Description: Contains core business logic.
// Updated: Now uses enhanced triage system with comprehensive medical dictionary
// following Zambia Standard Treatment Guidelines (STG)

const { Doctor, Consultation } = require('../models/db');
const { sendSms } = require('../services/textbee_sms');
const { enhancedTriage } = require('./medical_dictionary');

async function findAvailableDoctor() {
    return await Doctor.findOne().sort({ workload: 1 });
}

/**
 * Creates and schedules a consultation for immediate attention (not a pre-booked slot).
 * This is typically used when a patient initiates contact without a specific appointment.
 * @param {object} patient - The patient Mongoose object.
 * @param {string} reason - The reason for booking.
 * @param {string} slotId - (Optional) The ID of the availability slot being booked.
 */
async function createAndScheduleConsultation(patient, reason, slotId) {
    
    // Check if the reason is provided. If not, use a default reason for SMS bookings.
    const reasonPhrase = reason && reason.trim() !== '' ? ` for "${reason}"` : '';

    const TEXTBEE_SENDER_ID = process.env.TEXTBEE_SENDER_ID; 
    

    if (slotId) {
        // --- Logic for Scheduled Appointment (slotId is provided) ---
        try {
            const doctor = await Doctor.findOne({ 'availability._id': slotId });
            if (!doctor) {
                console.error(`Booking failed: Doctor with slot ID ${slotId} not found.`);
                if (TEXTBEE_SENDER_ID) {
                    await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, "We apologize, but the selected slot is no longer available. Please try again.");
                }
                return null;
            }

            const bookedSlot = doctor.availability.id(slotId);
            if (!bookedSlot || bookedSlot.isBooked) {
                console.error(`Booking failed: Slot ${slotId} is invalid or already booked.`);
                if (TEXTBEE_SENDER_ID) {
                    await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, "We apologize, but the selected slot is no longer available. Please try again.");
                }
                return null;
            }

            bookedSlot.isBooked = true;
            await doctor.save();

            const consultation = new Consultation({
                patient: patient._id,
                doctor: doctor._id,
                bookingReason: reason,
                bookingChannel: 'sms', // Track that this was booked via SMS
                scheduledStart: bookedSlot.startTime,
                scheduledEnd: bookedSlot.endTime,
                messages: [{ sender: 'PATIENT', content: `Booking reason: ${reason}`, channel: 'sms' }],
                status: 'SCHEDULED'
            });
            await consultation.save();

            if (!patient.consultations) patient.consultations = [];
            patient.consultations.push(consultation._id);
            await patient.save();

            doctor.workload = (doctor.workload || 0) + 1;
            await doctor.save();

            console.log(`Consultation ${consultation._id} created for patient ${patient.phoneNumber} and assigned to Dr. ${doctor.name} at ${bookedSlot.startTime}.`);

            const dateObj = new Date(bookedSlot.startTime);
            const timeString = dateObj.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            const dateString = dateObj.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const confirmationMessage = `Your appointment${reasonPhrase} is confirmed with Dr. ${doctor.name} on ${dateString} at ${timeString}.`;

            if (TEXTBEE_SENDER_ID) {
                await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, confirmationMessage);
            } else {
                console.warn(`SMS confirmation not sent to ${patient.phoneNumber} because TEXTBEE_SENDER_ID is not configured.`);
            }
            return consultation;
        } catch (error) {
            console.error('Error booking consultation slot:', error);
            if (TEXTBEE_SENDER_ID) {
                await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, "An error occurred while trying to book your appointment. Please try again.");
            }
            return null;
        }
    } else {
        // --- Logic for General Consultation (no slotId) ---
        const doctor = await findAvailableDoctor();

        if (!doctor) {
            console.error("Scheduling failed: No doctors available for immediate consultation.");
            if (TEXTBEE_SENDER_ID) {
                await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, "We apologize, but no doctors are available for immediate consultation. Please try again later or book a specific appointment.");
            }
            return null;
        }

        const consultation = new Consultation({
            patient: patient._id,
            doctor: doctor._id,
            bookingReason: reason,
            bookingChannel: 'sms', // Track that this was booked via SMS
            scheduledStart: new Date(),
            scheduledEnd: new Date(Date.now() + 30 * 60 * 1000), // Default to 30 mins from now
            messages: [{ sender: 'PATIENT', content: `Booking reason: ${reason}`, channel: 'sms' }],
            status: 'PENDING'
        });
        await consultation.save();

        if (!patient.consultations) patient.consultations = [];
        patient.consultations.push(consultation._id);
        await patient.save();

        doctor.workload = (doctor.workload || 0) + 1;
        await doctor.save();

        console.log(`Consultation ${consultation._id} created for patient ${patient.phoneNumber} and assigned to Dr. ${doctor.name}.`);

        const confirmationMessage = `Thank you for your inquiry. A doctor will be with you shortly.`;

        if (TEXTBEE_SENDER_ID) {
            await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, confirmationMessage);
        } else {
            console.warn(`SMS confirmation not sent to ${patient.phoneNumber} because TEXTBEE_SENDER_ID is not configured.`);
        }
        return consultation;
    }
}

/**
 * Books a specific consultation slot for a patient.
 * @param {object} patient - The patient Mongoose object.
 * @param {string} doctorId - The ID of the doctor whose slot is being booked.
 * @param {string} slotId - The ID of the availability slot being booked.
 * @param {string} reason - The reason for booking.
 * @returns {Promise<object|null>} The created consultation object or null if booking fails.
 */
async function bookConsultationSlot(patient, doctorId, slotId, reason) {
    const TEXTBEE_SENDER_ID = process.env.TEXTBEE_SENDER_ID;

    try {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            console.error(`Booking failed: Doctor with ID ${doctorId} not found.`);
            if (TEXTBEE_SENDER_ID) {
                await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, "Sorry, the doctor you selected is not available.");
            }
            return null;
        }

        const slot = doctor.availability.id(slotId); // Mongoose subdocument .id() method
        if (!slot || slot.isBooked || new Date(slot.endTime) < new Date()) {
            console.error(`Booking failed: Slot ${slotId} is invalid, already booked, or in the past.`);
            if (TEXTBEE_SENDER_ID) {
                await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, "Sorry, that appointment slot is no longer available or invalid. Please choose another.");
            }
            return null;
        }

        // Mark the slot as booked
        slot.isBooked = true;
        await doctor.save();

        const consultation = new Consultation({
            patient: patient._id,
            doctor: doctor._id,
            bookingReason: reason,
            bookingChannel: 'sms', // Track that this was booked via SMS
            scheduledStart: slot.startTime, // Corrected from scheduledTime
            scheduledEnd: slot.endTime, // Added scheduledEnd
            messages: [{ sender: 'PATIENT', content: `Appointment booked for ${new Date(slot.startTime).toLocaleString()}: ${reason}`, channel: 'sms' }],
            status: 'SCHEDULED' // New status for pre-booked appointments
        });
        await consultation.save();

        if (!patient.consultations) {
            patient.consultations = [];
        }
        patient.consultations.push(consultation._id);
        await patient.save();

        doctor.workload = (doctor.workload || 0) + 1; // Increment workload for booked appointment
        await doctor.save();

        console.log(`Consultation ${consultation._id} created for patient ${patient.phoneNumber} and assigned to Dr. ${doctor.name} at ${slot.startTime}.`);

        const reasonPhrase = reason && reason.trim() !== '' ? ` for "${reason}"` : '';
        const dateObj = new Date(slot.startTime);
        const timeString = dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const dateString = dateObj.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const confirmationMessage = `Your appointment${reasonPhrase} is confirmed with Dr. ${doctor.name} on ${dateString} at ${timeString}.`;

        if (TEXTBEE_SENDER_ID) {
            await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, confirmationMessage);
        } else {
            console.warn(`SMS confirmation not sent to ${patient.phoneNumber} because TEXTBEE_SENDER_ID is not configured.`);
        }
        return consultation; // Return the created consultation
    } catch (error) {
        console.error('Error booking consultation slot:', error);
        if (TEXTBEE_SENDER_ID) {
            await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, "An error occurred while trying to book your appointment. Please try again.");
        }
        return null;
    }
}

/**
 * Cancels an existing appointment for a patient.
 * @param {object} patient - The patient Mongoose object.
 * @param {string} appointmentId - The ID of the appointment to cancel.
 * @returns {Promise<boolean>} True if cancelled successfully, false otherwise.
 */
async function cancelAppointment(patient, appointmentId) {
    const TEXTBEE_SENDER_ID = process.env.TEXTBEE_SENDER_ID;

    try {
        const consultation = await Consultation.findOne({
            _id: appointmentId,
            patient: patient._id,
            status: { $in: ['PENDING', 'ACTIVE', 'SCHEDULED'] }
        });

        if (!consultation) {
            if (TEXTBEE_SENDER_ID) {
                await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, "Sorry, we couldn't find the appointment you're trying to cancel. Please check your appointment details.");
            }
            return false;
        }

        // Update consultation status to cancelled
        consultation.status = 'CANCELLED';
        await consultation.save();

        // Free up the doctor's slot if it was a scheduled appointment
        if (consultation.status === 'SCHEDULED') {
            const doctor = await Doctor.findById(consultation.doctor);
            if (doctor) {
                const slot = doctor.availability.find(s =>
                    new Date(s.startTime).getTime() === new Date(consultation.scheduledStart).getTime()
                );
                if (slot) {
                    slot.isBooked = false;
                    await doctor.save();
                }
                // Decrease doctor's workload
                doctor.workload = Math.max(0, (doctor.workload || 0) - 1);
                await doctor.save();
            }
        }

        console.log(`Appointment ${appointmentId} cancelled for patient ${patient.phoneNumber}`);

        const confirmationMessage = `Your appointment with Dr. ${consultation.doctor.name || 'your doctor'} on ${new Date(consultation.scheduledStart).toLocaleString()} has been cancelled.`;

        if (TEXTBEE_SENDER_ID) {
            await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, confirmationMessage);
        }

        return true;
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        if (TEXTBEE_SENDER_ID) {
            await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, "An error occurred while trying to cancel your appointment. Please try again.");
        }
        return false;
    }
}

/**
 * Reschedules an existing appointment for a patient.
 * @param {object} patient - The patient Mongoose object.
 * @param {string} appointmentId - The ID of the appointment to reschedule.
 * @param {string} newSlotId - The ID of the new availability slot.
 * @returns {Promise<boolean>} True if rescheduled successfully, false otherwise.
 */
async function rescheduleAppointment(patient, appointmentId, newSlotId) {
    const TEXTBEE_SENDER_ID = process.env.TEXTBEE_SENDER_ID;

    try {
        const consultation = await Consultation.findOne({
            _id: appointmentId,
            patient: patient._id,
            status: { $in: ['PENDING', 'ACTIVE', 'SCHEDULED'] }
        });

        if (!consultation) {
            if (TEXTBEE_SENDER_ID) {
                await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, "Sorry, we couldn't find the appointment you're trying to reschedule. Please check your appointment details.");
            }
            return false;
        }

        // Find the new slot
        const newDoctor = await Doctor.findOne({ 'availability._id': newSlotId });
        if (!newDoctor) {
            if (TEXTBEE_SENDER_ID) {
                await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, "Sorry, the selected time slot is not available. Please choose another.");
            }
            return false;
        }

        const newSlot = newDoctor.availability.id(newSlotId);
        if (!newSlot || newSlot.isBooked) {
            if (TEXTBEE_SENDER_ID) {
                await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, "Sorry, that time slot is no longer available. Please choose another.");
            }
            return false;
        }

        // Free up the old slot - since we're rescheduling to available slots of the same doctor,
        // find the slot that matches the current consultation time and free it
        if (consultation.status === 'SCHEDULED') {
            const oldDoctor = await Doctor.findById(consultation.doctor);
            if (oldDoctor) {
                const oldScheduledTime = new Date(consultation.scheduledStart);
                const oldSlotIndex = oldDoctor.availability.findIndex(s => new Date(s.startTime).getTime() === oldScheduledTime.getTime());

                if (oldSlotIndex !== -1) {
                    const oldSlot = oldDoctor.availability[oldSlotIndex];
                    console.log(`Found old slot at index ${oldSlotIndex}, isBooked: ${oldSlot.isBooked}, setting to false`);

                    oldSlot.isBooked = false; // Free the old slot
                    oldDoctor.markModified(`availability.${oldSlotIndex}.isBooked`); // Ensure Mongoose knows it changed

                    try {
                        await oldDoctor.save();
                        console.log(`Old slot freed successfully at index ${oldSlotIndex}, isBooked: ${oldDoctor.availability[oldSlotIndex].isBooked}`);
                    } catch (saveError) {
                        console.error('Failed to save doctor with freed slot:', saveError);
                        return false; // Exit with error
                    }
                } else {
                    console.log(`No matching slot found for time: ${oldScheduledTime.toISOString()}`);
                }
            } else {
                console.log(`Doctor not found with ID: ${consultation.doctor}`);
            }
        }

        // Book the new slot - mark it as booked
        newSlot.isBooked = true;
        await newDoctor.save(); // Since it's the same doctor, we save here

        // Update consultation - change to the new slot's time, doctor stays the same
        consultation.scheduledStart = newSlot.startTime;
        consultation.scheduledEnd = newSlot.endTime;
        consultation.status = 'SCHEDULED';
        await consultation.save();

        console.log(`Appointment ${appointmentId} rescheduled for patient ${patient.phoneNumber} to ${newSlot.startTime}`);

        const dateObj = new Date(newSlot.startTime);
        const timeString = dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const dateString = dateObj.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const confirmationMessage = `Your appointment has been rescheduled to ${dateString} at ${timeString} with Dr. ${newDoctor.name}.`;

        if (TEXTBEE_SENDER_ID) {
            await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, confirmationMessage);
        }

        return true;
    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        if (TEXTBEE_SENDER_ID) {
            await sendSms(patient.phoneNumber, TEXTBEE_SENDER_ID, "An error occurred while trying to reschedule your appointment. Please try again.");
        }
        return false;
    }
}

/**
 * Gets upcoming appointments for a patient.
 * @param {object} patient - The patient Mongoose object.
 * @returns {Promise<Array>} Array of upcoming appointments.
 */
async function getUpcomingAppointments(patient) {
    try {
        const appointments = await Consultation.find({
            patient: patient._id,
            status: { $in: ['PENDING', 'ACTIVE', 'SCHEDULED'] },
            scheduledStart: { $gte: new Date() }
        })
        .populate('doctor', 'name specialty')
        .sort({ scheduledStart: 1 })
        .limit(5); // Limit to next 5 appointments

        return appointments;
    } catch (error) {
        console.error('Error getting upcoming appointments:', error);
        return [];
    }
}

/**
 * Evaluates symptom parameters from Dialogflow and determines triage level and recommendation.
 * Uses enhanced pattern recognition from comprehensive medical dictionary following Zambia STG.
 * @param {object} params - The parameters object from Dialogflow result (fields)
 * @returns {string} - The triage message with recommendation
 */
function evaluateTriage(params) {
    // Map Dialogflow parameters to symptom format expected by medical dictionary
    const userSymptoms = {};

    // Extract Dialogflow parameters
    const feverDuration = params.fever_duration?.stringValue;
    const coughType = params.cough_type?.stringValue;
    const breathingDifficulty = params.breathing_difficulty?.stringValue;
    const chestPain = params.chest_pain?.stringValue;
    const diarrheaType = params.diarrhea_type?.stringValue;
    const abdominalPain = params.abdominal_pain?.stringValue;
    const fatigueLevel = params.fatigue_level?.stringValue;
    const weightChange = params.weight_change?.stringValue;

    // Map fever duration to pattern
    if (feverDuration) {
        userSymptoms.fever = true;
        if (feverDuration === 'Less than 3 days') {
            userSymptoms.fever_pattern = 'fever_acute';
        } else if (feverDuration === '3-7 days') {
            userSymptoms.fever_pattern = 'fever_subacute';
        } else if (feverDuration === '1-2 weeks') {
            userSymptoms.fever_pattern = 'fever_persistent';
        } else if (feverDuration === 'More than 2 weeks') {
            userSymptoms.fever_pattern = 'fever_chronic';
        }
    }

    // Map cough type
    if (coughType) {
        userSymptoms.cough = true;
        if (coughType === 'Dry cough') {
            userSymptoms.cough_pattern = 'cough_dry';
        } else if (coughType === 'Cough with phlegm') {
            userSymptoms.cough_pattern = 'cough_productive';
        } else if (coughType === 'Coughing up blood') {
            userSymptoms.cough_pattern = 'cough_bloody';
            userSymptoms.hemoptysis = true;
        } else if (coughType === 'Barking cough') {
            userSymptoms.cough_pattern = 'cough_barking';
        }
    }

    // Map breathing difficulty
    if (breathingDifficulty) {
        if (breathingDifficulty === 'Yes, severe (can\'t complete sentences)') {
            userSymptoms.severe_shortness_of_breath = true;
            userSymptoms.breathing_pattern = 'breathing_severe';
        } else if (breathingDifficulty === 'Yes, moderate (short of breath with activity)') {
            userSymptoms.breathing_difficulty = true;
            userSymptoms.breathing_pattern = 'breathing_moderate';
        } else if (breathingDifficulty === 'Mild (only with heavy activity)') {
            userSymptoms.breathing_difficulty = true;
            userSymptoms.breathing_pattern = 'breathing_mild';
        }
        // 'No difficulty' means no symptom
    }

    // Map chest pain
    if (chestPain) {
        if (chestPain === 'Yes, severe crushing pain' || chestPain === 'Yes, moderate pain') {
            userSymptoms.chest_pain = true;
        } else if (chestPain === 'Mild discomfort') {
            userSymptoms.chest_pain = true;
        }
        // 'No chest pain' means no symptom
    }

    // Map diarrhea
    if (diarrheaType) {
        if (diarrheaType === 'Watery diarrhea') {
            userSymptoms.diarrhea = true;
            userSymptoms.diarrhea_type = 'diarrhea_watery';
        } else if (diarrheaType === 'Bloody diarrhea') {
            userSymptoms.diarrhea = true;
            userSymptoms.diarrhea_type = 'diarrhea_bloody';
            userSymptoms.bloody_diarrhea = true;
        } else if (diarrheaType === 'Diarrhea with mucus') {
            userSymptoms.diarrhea = true;
            userSymptoms.diarrhea_type = 'diarrhea_mucoid';
        }
        // 'No diarrhea' means no symptom
    }

    // Map abdominal pain
    if (abdominalPain) {
        if (abdominalPain === 'Severe pain') {
            userSymptoms.abdominal_pain = true;
            userSymptoms.severe_abdominal_pain = true;
        } else if (abdominalPain === 'Moderate pain') {
            userSymptoms.abdominal_pain = true;
        } else if (abdominalPain === 'Mild cramps') {
            userSymptoms.abdominal_pain = true;
        }
        // 'No abdominal pain' means no symptom
    }

    // Map fatigue
    if (fatigueLevel) {
        if (fatigueLevel === 'Extreme fatigue (can\'t do daily activities)') {
            userSymptoms.extreme_fatigue = true;
        } else if (fatigueLevel === 'Moderate fatigue') {
            userSymptoms.fatigue = true;
        } else if (fatigueLevel === 'Mild tiredness') {
            userSymptoms.fatigue = true;
        }
        // 'No fatigue' means no symptom
    }

    // Map weight change
    if (weightChange) {
        if (weightChange === 'Significant weight loss (>5kg)') {
            userSymptoms.significant_weight_loss = true;
            userSymptoms.weight_loss = true;
        } else if (weightChange === 'Moderate weight loss (2-5kg)') {
            userSymptoms.weight_loss = true;
        } else if (weightChange === 'Slight weight loss') {
            userSymptoms.weight_loss = true;
        } else if (weightChange === 'Weight gain') {
            userSymptoms.weight_gain = true;
        }
        // 'No weight change' means no symptom
    }

    // Add common symptoms that might be missing but are key for diagnosis
    if (feverDuration && feverDuration.includes('fever')) {
        userSymptoms.fever = true;
    }

    // Call enhanced triage with comprehensive medical dictionary
    const triageResult = enhancedTriage(userSymptoms);
    console.log('Enhanced triage result:', triageResult);

    // Format result into user-friendly message
    let triageMessage = '';

    // Add disease-specific recommendations
    if (triageResult.possible_conditions && triageResult.possible_conditions.length > 0) {
        const topCondition = triageResult.possible_conditions[0];
        triageMessage += `Based on your symptoms, the most likely condition is ${topCondition.disease}. `;
        triageMessage += `Confidence: ${Math.round(topCondition.confidence)}%\n\n`;
    }

    // Add urgency level and recommendations
    if (triageResult.urgency_level === 'emergency') {
        triageMessage += "🚨 EMERGENCY: " + triageResult.recommendations[0] +
            "\n\nImmediate actions:\n" + triageResult.actions.join('\n');
    } else if (triageResult.urgency_level === 'urgent') {
        triageMessage += "⚠️ URGENT: " + triageResult.recommendations[0] +
            "\n\nRecommended actions:\n" + triageResult.actions.join('\n');
    } else {
        triageMessage += "📋 " + triageResult.recommendations[0] +
            "\n\nRecommended actions:\n" + triageResult.actions.join('\n');
    }

    // Add general advice
    triageMessage += "\n\n⚕️ Medical advice: This assessment follows Zambia Standard Treatment Guidelines. " +
                     "Please seek care at your nearest health facility. If symptoms worsen, seek immediate attention.";

    return triageMessage;
}

module.exports = {
    findAvailableDoctor,
    createAndScheduleConsultation,
    bookConsultationSlot,
    cancelAppointment,
    rescheduleAppointment,
    getUpcomingAppointments,
    evaluateTriage
};
