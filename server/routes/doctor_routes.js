// File: server/routes/doctor_routes.js
// Description: Handles doctor-specific API logic, including availability management.

const express = require('express');
const router = express.Router();
const { Doctor, TemporaryBookingReference } = require('../models/db');
const { protect } = require('../middleware/auth');

// @route   POST /api/doctors/availability
// @desc    Add a new availability slot for the logged-in doctor
// @access  Private (Doctor)
router.post('/availability', protect, async (req, res) => {
    const { startTime, endTime, duration = 30, bufferTime = 10 } = req.body;

    const newStartTime = new Date(startTime);
    const newEndTime = new Date(endTime);

    // Basic validation
    if (!startTime || !endTime) {
        return res.status(400).json({ message: 'Please provide both startTime and endTime for the availability slot.' });
    }
    if (isNaN(newStartTime.getTime()) || isNaN(newEndTime.getTime())) {
        return res.status(400).json({ message: 'Invalid date format for startTime or endTime.' });
    }
    if (newStartTime >= newEndTime) {
        return res.status(400).json({ message: 'startTime must be before endTime.' });
    }
    if (newStartTime < new Date()) {
        return res.status(400).json({ message: 'Cannot add availability in the past.' });
    }
    if (duration <= 0) {
        return res.status(400).json({ message: 'Duration must be a positive number.' });
    }

    try {
        const doctor = await Doctor.findById(req.doctor.id);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found.' });
        }

        const newSlots = [];
        let currentSlotStart = newStartTime;

        while (currentSlotStart < newEndTime) {
            const slotEnd = new Date(currentSlotStart.getTime() + duration * 60 * 1000);
            if (slotEnd <= newEndTime) {
                newSlots.push({
                    startTime: currentSlotStart,
                    endTime: slotEnd,
                    duration: duration,
                    bufferTime: bufferTime,
                    isBooked: false
                });
                currentSlotStart = new Date(slotEnd.getTime() + bufferTime * 60 * 1000);
            } else {
                break;
            }
        }

        // Check for overlapping availability slots
        const hasOverlap = doctor.availability.some(slot => {
            const existingStartTime = new Date(slot.startTime);
            const existingEndTime = new Date(slot.endTime);
            return newSlots.some(newSlot => {
                const newSlotStart = new Date(newSlot.startTime);
                const newSlotEnd = new Date(newSlot.endTime);
                return (newSlotStart < existingEndTime && newSlotEnd > existingStartTime);
            });
        });

        if (hasOverlap) {
            return res.status(400).json({ message: 'New slot overlaps with existing availability.' });
        }

        // Use $push with $each to add multiple new slots at once
        await Doctor.findByIdAndUpdate(
            req.doctor.id,
            { $push: { availability: { $each: newSlots } } },
            { new: true, runValidators: true }
        );

        res.status(201).json({ message: 'Availability slots added successfully.' });

    } catch (err) {
        console.error('Error adding availability:', err.message);
        res.status(500).send('Server error adding availability.');
    }
});

// @route   GET /api/doctors/availability
// @desc    Get all availability slots for the logged-in doctor
// @access  Private (Doctor)
router.get('/availability', protect, async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.doctor.id).select('availability');
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found.' });
        }
        const futureAvailability = doctor.availability
            .filter(slot => new Date(slot.endTime) > new Date())
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

        res.json(futureAvailability);
    } catch (err) {
        console.error('Error fetching availability:', err.message);
        res.status(500).send('Server error fetching availability.');
    }
});

// @route   DELETE /api/doctors/availability/:slotId
// @desc    Delete an availability slot for the logged-in doctor
// @access  Private (Doctor)
router.delete('/availability/:slotId', protect, async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.doctor.id);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found.' });
        }

        const slotId = req.params.slotId;
        const slotIndex = doctor.availability.findIndex(slot => slot._id.toString() === slotId);

        if (slotIndex === -1) {
            return res.status(404).json({ message: 'Availability slot not found.' });
        }

        if (doctor.availability[slotIndex].isBooked) {
            return res.status(400).json({ message: 'Cannot delete a booked slot.' });
        }

        doctor.availability.splice(slotIndex, 1);
        await doctor.save();

        res.json({ message: 'Availability slot deleted successfully', availability: doctor.availability });

    } catch (err) {
        console.error('Error deleting availability:', err.message);
        res.status(500).send('Server error deleting availability.');
    }
});

// @route   POST /api/doctors/available-for-booking
// @desc    Get all available (unbooked, future) slots across all doctors
// @access  Public (for patients to view available slots via Dialogflow webhook)
router.post('/available-for-booking', async (req, res) => {
    console.log('--- /api/doctors/available-for-booking endpoint hit (POST) ---');
    const dialogflowSessionPath = req.body.session;
    const dialogflowSessionId = dialogflowSessionPath ? dialogflowSessionPath.split('/').pop() : null;

    console.log('Received Dialogflow Session Path:', dialogflowSessionPath);
    console.log('Extracted Dialogflow Session ID:', dialogflowSessionId);

    try {
        if (!dialogflowSessionId) {
            console.error('Error: Dialogflow Session ID is missing from webhook body.');
            return res.status(400).json({ fulfillmentText: 'An internal error occurred: session ID missing.', payload: { google: { expectUserResponse: false } } });
        }

        const doctors = await Doctor.find({
            'availability.isBooked': false,
            'availability.endTime': { $gt: new Date() }
        }).select('name specialty availability');

        let availableSlots = [];
        let tempReferences = [];
        let bookingReferenceCounter = 1;

        doctors.forEach(doctor => {
            doctor.availability.forEach(slot => {
                if (!slot.isBooked && new Date(slot.endTime) > new Date()) {
                    const bookingReferenceId = bookingReferenceCounter++;
                    availableSlots.push({
                        bookingReferenceId: bookingReferenceId,
                        doctorName: doctor.name,
                        doctorSpecialty: doctor.specialty,
                        startTime: slot.startTime,
                        endTime: slot.endTime
                    });
                    tempReferences.push({
                        bookingReferenceId: bookingReferenceId,
                        doctorId: doctor._id,
                        slotId: slot._id,
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
                    });
                }
            });
        });

        availableSlots.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

        await TemporaryBookingReference.findOneAndUpdate(
            { dialogflowSessionId: dialogflowSessionId },
            { $set: { references: tempReferences, createdAt: new Date() } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('Temporary booking references saved/updated for session:', dialogflowSessionId);
        console.log('Generated availableSlots:', JSON.stringify(availableSlots, null, 2));

        let smsResponse = "Available appointments:\n";
        if (availableSlots.length === 0) {
            smsResponse = "Sorry, no appointments are currently available. Please check back later.";
        } else {
            availableSlots.forEach(slot => {
                smsResponse += `${slot.bookingReferenceId}. Dr. ${slot.doctorName} (${slot.doctorSpecialty}) on ${new Date(slot.startTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}\n`;
            });
            smsResponse += "Reply 'Book <number>' to confirm.";
        }
        console.log('Generated SMS Response:', smsResponse);

        // Explicitly include an empty fulfillmentMessages array
        res.json({
            fulfillmentText: smsResponse,
            fulfillmentMessages: [], // Ensure this is explicitly empty
            payload: {
                google: {
                    expectUserResponse: true,
                    richResponse: {
                        items: [{
                            simpleResponse: {
                                textToSpeech: smsResponse,
                                displayText: smsResponse
                            }
                        }]
                    }
                }
            }
        });

    } catch (err) {
        console.error('FATAL ERROR in /api/doctors/available-for-booking:', err);
        res.status(500).json({ fulfillmentText: 'An internal server error occurred while fetching appointments. Please try again later.', payload: { google: { expectUserResponse: false } } });
    }
});


module.exports = router;
