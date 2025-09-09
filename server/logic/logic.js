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
                scheduledStart: bookedSlot.startTime,
                scheduledEnd: bookedSlot.endTime,
                messages: [{ sender: 'PATIENT', content: `Booking reason: ${reason}` }],
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
            scheduledStart: new Date(),
            scheduledEnd: new Date(Date.now() + 30 * 60 * 1000), // Default to 30 mins from now
            messages: [{ sender: 'PATIENT', content: `Booking reason: ${reason}` }],
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
            scheduledStart: slot.startTime, // Corrected from scheduledTime
            scheduledEnd: slot.endTime, // Added scheduledEnd
            messages: [{ sender: 'PATIENT', content: `Appointment booked for ${new Date(slot.startTime).toLocaleString()}: ${reason}` }],
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

module.exports = { findAvailableDoctor, createAndScheduleConsultation, bookConsultationSlot };
