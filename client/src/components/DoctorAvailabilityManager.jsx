import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiTrash2, FiCalendar } from 'react-icons/fi'; // Icons for add, delete, calendar

const DoctorAvailabilityManager = () => {
    const [availability, setAvailability] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Updated newSlot state to include duration and bufferTime
    const [newSlot, setNewSlot] = useState({ 
        startDateTime: '', 
        endDateTime: '', 
        duration: 30, // Default duration in minutes
        bufferTime: 10 // Default buffer time in minutes
    });
    const [addingSlot, setAddingSlot] = useState(false);

    useEffect(() => {
        loadAvailability();
        // Start polling for availability updates (silent)
        const pollInterval = setInterval(pollAvailability, 10000); // Poll every 10 seconds

        return () => clearInterval(pollInterval); // Cleanup on unmount
    }, []);

    const loadAvailability = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/doctors/availability');
            // Sort by start time for better readability
            const sortedAvailability = res.data.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
            setAvailability(sortedAvailability);
        } catch (err) {
            console.error('Failed to fetch doctor availability:', err);
            setError('Failed to load availability. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const pollAvailability = async () => {
        try {
            // Silent polling - no loading states or error messages
            const res = await api.get('/doctors/availability');
            // Sort by start time for better readability
            const sortedAvailability = res.data.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
            setAvailability(sortedAvailability);
        } catch (err) {
            // Silent error handling - don't interrupt user experience
            console.debug('Silent availability polling failed:', err.message);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewSlot(prevSlot => ({
            ...prevSlot,
            [name]: name === 'duration' || name === 'bufferTime' ? parseInt(value, 10) : value
        }));
    };

    const handleAddSlot = async (e) => {
        e.preventDefault();
        setError('');
        setAddingSlot(true);

        const { startDateTime, endDateTime, duration, bufferTime } = newSlot;

        try {
            await api.post('/doctors/availability', {
                startTime: startDateTime,
                endTime: endDateTime,
                duration,
                bufferTime
            });
            // Clear form and reset to default values
            setNewSlot({ startDateTime: '', endDateTime: '', duration: 30, bufferTime: 10 });
            // Immediately refresh data to ensure sync
            await pollAvailability();
        } catch (err) {
            console.error('Failed to add availability slot:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'Failed to add slot. Please check your input.');
        } finally {
            setAddingSlot(false);
        }
    };

    const handleDeleteSlot = async (slotId) => {
        try {
            await api.delete(`/doctors/availability/${slotId}`);
            // Immediately refresh data to ensure sync
            await pollAvailability();
        } catch (err) {
            console.error('Failed to delete slot:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'Failed to delete slot.');
        }
    };

    // Helper to format Date objects for datetime-local input (kept for reference)
    const formatForDateTimeLocal = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const formatDateTimeDisplay = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <FiCalendar className="mr-3 text-green-600" /> Availability Management
                </h1>
            </div>

            {error && <p className="text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold mb-4">Add New Availability Slot</h2>

                <form onSubmit={handleAddSlot} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startDateTime" className="block text-sm font-medium text-gray-700">Start Date & Time</label>
                            <input
                                type="datetime-local"
                                id="startDateTime"
                                name="startDateTime"
                                value={newSlot.startDateTime}
                                onChange={handleInputChange}
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="endDateTime" className="block text-sm font-medium text-gray-700">End Date & Time</label>
                            <input
                                type="datetime-local"
                                id="endDateTime"
                                name="endDateTime"
                                value={newSlot.endDateTime}
                                onChange={handleInputChange}
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Slot Duration (minutes)</label>
                            <input
                                type="number"
                                id="duration"
                                name="duration"
                                value={newSlot.duration}
                                onChange={handleInputChange}
                                required
                                min="1"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="bufferTime" className="block text-sm font-medium text-gray-700">Buffer Time (minutes)</label>
                            <input
                                type="number"
                                id="bufferTime"
                                name="bufferTime"
                                value={newSlot.bufferTime}
                                onChange={handleInputChange}
                                required
                                min="0"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-green-400 flex items-center justify-center"
                        disabled={addingSlot}
                    >
                        <FiPlus className="mr-2" /> {addingSlot ? 'Adding...' : 'Add Slot'}
                    </button>
                </form>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Current Availability</h3>
            {loading ? (
                <p className="text-center text-gray-500">Loading availability...</p>
            ) : availability.length === 0 ? (
                <p className="text-center text-gray-500">No availability slots added yet.</p>
            ) : (
                <ul className="space-y-3">
                    {availability.map((slot) => (
                        <li key={slot._id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-md shadow-sm">
                            <div className="flex-grow">
                                <p className="text-gray-800 font-medium">
                                    {formatDateTimeDisplay(slot.startTime)} - {formatDateTimeDisplay(slot.endTime).split(', ')[2]}
                                </p>
                                {/* Display the new duration and bufferTime fields */}
                                <p className="text-sm text-gray-600">
                                    Duration: {slot.duration} min, Buffer: {slot.bufferTime} min
                                </p>
                                <span className={`text-sm px-2 py-0.5 rounded-full ${slot.isBooked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {slot.isBooked ? 'Booked' : 'Available'}
                                </span>
                            </div>
                            {!slot.isBooked && (
                                <button
                                    onClick={() => handleDeleteSlot(slot._id)}
                                    className="p-2 text-red-500 hover:text-red-700 transition-colors duration-200 rounded-full hover:bg-red-50"
                                    title="Delete slot"
                                >
                                    <FiTrash2 size={20} />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default DoctorAvailabilityManager;
