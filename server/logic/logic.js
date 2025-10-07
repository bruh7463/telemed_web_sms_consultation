// File: server/logic/logic.js
// Description: Contains core business logic.

const { Doctor, Consultation } = require('../models/db');
const { sendSms } = require('../services/textbee_sms');

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
            
            const confirmationMessage = `Your appointment${reasonPhrase} is confirmed with Dr. ${doctor.name} on ${new Date(bookedSlot.startTime).toLocaleString()}.`;

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
        const confirmationMessage = `Your appointment${reasonPhrase} is confirmed with Dr. ${doctor.name} on ${new Date(slot.startTime).toLocaleString()}.`;

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
                const slot = doctor.availability.id(consultation.scheduledStart);
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

        // Free up the old slot if it was scheduled
        if (consultation.status === 'SCHEDULED') {
            const oldDoctor = await Doctor.findById(consultation.doctor);
            if (oldDoctor) {
                const oldSlot = oldDoctor.availability.id(consultation.scheduledStart);
                if (oldSlot) {
                    oldSlot.isBooked = false;
                    await oldDoctor.save();
                }
                // Decrease old doctor's workload
                oldDoctor.workload = Math.max(0, (oldDoctor.workload || 0) - 1);
                await oldDoctor.save();
            }
        }

        // Book the new slot
        newSlot.isBooked = true;
        await newDoctor.save();

        // Update consultation
        consultation.doctor = newDoctor._id;
        consultation.scheduledStart = newSlot.startTime;
        consultation.scheduledEnd = newSlot.endTime;
        consultation.status = 'SCHEDULED';
        await consultation.save();

        // Increase new doctor's workload
        newDoctor.workload = (newDoctor.workload || 0) + 1;
        await newDoctor.save();

        console.log(`Appointment ${appointmentId} rescheduled for patient ${patient.phoneNumber} to ${newSlot.startTime}`);

        const confirmationMessage = `Your appointment has been rescheduled to ${new Date(newSlot.startTime).toLocaleString()} with Dr. ${newDoctor.name}.`;

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
 * @param {object} params - The parameters object from Dialogflow result (fields)
 * @returns {string} - The triage message with recommendation
 */
function evaluateTriage(params) {
    const severityScores = {
        // Lower score = more severe (1 is highest severity)
        'Less than 3 days': 4,
        '3-7 days': 3,
        '1-2 weeks': 2,
        'More than 2 weeks': 1,

        'Dry cough': 4,
        'Cough with phlegm': 3,
        'Coughing up blood': 1,
        'Barking cough': 2,

        'Yes, severe (can\u0027t complete sentences)': 1,
        'Yes, moderate (short of breath with activity)': 2,
        'Mild (only with heavy activity)': 3,
        'No difficulty': 4,

        'Yes, severe crushing pain': 1,
        'Yes, moderate pain': 2,
        'Mild discomfort': 3,
        'No chest pain': 4,

        'Watery diarrhea': 3,
        'Bloody diarrhea': 1,
        'Diarrhea with mucus': 2,
        'No diarrhea': 4,

        'Severe pain': 1,
        'Moderate pain': 2,
        'Mild cramps': 3,
        'No abdominal pain': 4,

        'Extreme fatigue (can\u0027t do daily activities)': 1,
        'Moderate fatigue': 2,
        'Mild tiredness': 3,
        'No fatigue': 4,

        'Significant weight loss (\u003e5kg)': 1,
        'Moderate weight loss (2-5kg)': 2,
        'Slight weight loss': 3,
        'No weight change': 4,
        'Weight gain': 5
    };

    // Extract parameters with defaults
    const fever = params.fever_duration?.stringValue || '3-7 days';
    const cough = params.cough_type?.stringValue || 'Dry cough';
    const breath = params.breathing_difficulty?.stringValue || 'No difficulty';
    const chest = params.chest_pain?.stringValue || 'No chest pain';
    const diarrhea = params.diarrhea_type?.stringValue || 'No diarrhea';
    const abdominal = params.abdominal_pain?.stringValue || 'No abdominal pain';
    const fatigue = params.fatigue_level?.stringValue || 'Mild tiredness';
    const weight = params.weight_change?.stringValue || 'No weight change';

    // Get scores, using 4 for unknown
    const scores = [
        severityScores[fever] || 4,
        severityScores[cough] || 4,
        severityScores[breath] || 4,
        severityScores[chest] || 4,
        severityScores[diarrhea] || 4,
        severityScores[abdominal] || 4,
        severityScores[fatigue] || 4,
        severityScores[weight] || 4
    ];

    // Emergency conditions (highest priority)
    const emergencyScore = Math.min(...scores);
    if (emergencyScore === 1 &&
        scores[2] === 1 || // severe breathing
        scores[3] === 1 || // severe chest pain
        scores[5] === 1 && scores[4] === 1) { // severe abdominal + bloody diarrhea
        return "EMERGENCY: Seek immediate medical attention at the nearest hospital or call emergency services. Do not drive yourself.";
    }

    // Urgent care
    if (emergencyScore === 1 ||
        (scores[2] === 2 && scores[3] === 2)) { // moderate breath + chest
        return "URGENT: Contact the hospital for immediate evaluation. Visit the ER or call emergency services.";
    }

    // Need doctor consultation
    const averageScore = scores.reduce((a, b) => a + b) / scores.length;
    if (averageScore < 3 ||
        scores[2] <= 3 || // breathing issues
        scores[3] <= 2) { // chest pain
        return "SCHEDULE CONSULTATION: Schedule a doctor's appointment immediately for evaluation. In the meantime, rest and monitor your symptoms.";
    }

    // General advice
    return "MONITOR SYMPTOMS: Continue to monitor your symptoms. If they worsen or new symptoms develop, seek medical attention. Consider self-care measures like rest, hydration, and over-the-counter medications as appropriate.";
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
