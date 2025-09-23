// File: server/routes/doctor_routes.js
// Description: Handles doctor-related API operations

const express = require('express');
const router = express.Router();
const { Doctor } = require('../models/db');
const { protect } = require('../middleware/auth');

// Get all available doctors (for patients to book appointments)
router.get('/available', async (req, res) => {
    try {
        const doctors = await Doctor.find({})
            .select('name specialty workload availability')
            .sort({ workload: 1, name: 1 }); // Sort by workload first, then name

        res.json(doctors);
    } catch (error) {
        console.error('Error fetching available doctors:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get doctor's availability slots
router.get('/:id/availability', async (req, res) => {
    try {
        const doctorId = req.params.id;
        const { date } = req.query; // Optional date filter (YYYY-MM-DD format)

        const doctor = await Doctor.findById(doctorId).select('name specialty availability');

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        let availableSlots = doctor.availability.filter(slot => !slot.isBooked);

        // If date is provided, filter slots for that date
        if (date) {
            const targetDate = new Date(date);
            const targetDateStr = targetDate.toDateString();

            availableSlots = availableSlots.filter(slot => {
                const slotDate = new Date(slot.startTime).toDateString();
                return slotDate === targetDateStr;
            });
        }

        // Format slots for frontend
        const formattedSlots = availableSlots.map(slot => ({
            id: slot._id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            duration: slot.duration,
            displayTime: new Date(slot.startTime).toLocaleString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })
        }));

        res.json({
            doctor: {
                id: doctor._id,
                name: doctor.name,
                specialty: doctor.specialty
            },
            availableSlots: formattedSlots
        });

    } catch (error) {
        console.error('Error fetching doctor availability:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get doctor's availability slots (protected route for doctors)
router.get('/availability', protect, async (req, res) => {
    try {
        if (!req.doctor) {
            return res.status(403).json({ message: 'Only doctors can access this route' });
        }

        const doctor = await Doctor.findById(req.doctor._id).select('name specialty availability');

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Sort availability by start time
        const sortedAvailability = doctor.availability.sort((a, b) =>
            new Date(a.startTime) - new Date(b.startTime)
        );

        res.json(sortedAvailability);
    } catch (error) {
        console.error('Error fetching doctor availability:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add availability slot (protected route for doctors)
router.post('/availability', protect, async (req, res) => {
    try {
        if (!req.doctor) {
            return res.status(403).json({ message: 'Only doctors can access this route' });
        }

        const { startTime, endTime, duration, bufferTime } = req.body;

        // Validate required fields
        if (!startTime || !endTime || !duration || bufferTime === undefined) {
            return res.status(400).json({
                message: 'startTime, endTime, duration, and bufferTime are required'
            });
        }

        // Validate time range
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start >= end) {
            return res.status(400).json({ message: 'End time must be after start time' });
        }

        if (duration <= 0 || bufferTime < 0) {
            return res.status(400).json({ message: 'Duration must be positive and buffer time cannot be negative' });
        }

        const doctor = await Doctor.findById(req.doctor._id);

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Create availability slot
        const availabilitySlot = {
            startTime: start,
            endTime: end,
            duration,
            bufferTime,
            isBooked: false
        };

        doctor.availability.push(availabilitySlot);
        await doctor.save();

        res.status(201).json({
            message: 'Availability slot added successfully',
            slot: availabilitySlot
        });
    } catch (error) {
        console.error('Error adding availability slot:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete availability slot (protected route for doctors)
router.delete('/availability/:slotId', protect, async (req, res) => {
    try {
        if (!req.doctor) {
            return res.status(403).json({ message: 'Only doctors can access this route' });
        }

        const { slotId } = req.params;

        const doctor = await Doctor.findById(req.doctor._id);

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Find the slot
        const slotIndex = doctor.availability.findIndex(slot =>
            slot._id.toString() === slotId
        );

        if (slotIndex === -1) {
            return res.status(404).json({ message: 'Availability slot not found' });
        }

        // Check if slot is booked
        if (doctor.availability[slotIndex].isBooked) {
            return res.status(400).json({ message: 'Cannot delete a booked availability slot' });
        }

        // Remove the slot
        doctor.availability.splice(slotIndex, 1);
        await doctor.save();

        res.json({ message: 'Availability slot deleted successfully' });
    } catch (error) {
        console.error('Error deleting availability slot:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get doctor's profile (protected route for doctors)
router.get('/profile', protect, async (req, res) => {
    try {
        if (!req.doctor) {
            return res.status(403).json({ message: 'Only doctors can access this route' });
        }

        const doctor = await Doctor.findById(req.doctor._id).select('-password');
        res.json(doctor);
    } catch (error) {
        console.error('Error fetching doctor profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
