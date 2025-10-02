import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { consultationAPI, doctorAPI } from '../../services/api';
import { setConsultations, updateConsultation } from '../../redux/slices/consultSlice';

const PatientAppointments = ({ onNavigateToChat }) => {
    const { consultations } = useSelector(state => state.consult);
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [showBookForm, setShowBookForm] = useState(false);
    const [bookingMethod, setBookingMethod] = useState('book'); // 'book' or 'schedule'
    const [bookForm, setBookForm] = useState({
        scheduledDate: '',
        reason: ''
    });
    const [scheduleForm, setScheduleForm] = useState({
        doctorId: '',
        selectedSlot: null,
        reason: ''
    });
    const [availableDoctors, setAvailableDoctors] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);

    const loadAppointments = useCallback(async () => {
        try {
            const response = await consultationAPI.getPatientConsultations();
            dispatch(setConsultations(response.data));
        } catch (error) {
            // Silent error handling - don't interrupt user experience
            console.debug('Background appointment polling failed:', error.message);
        }
    }, [dispatch]);

    // Load appointments on component mount and start polling
    useEffect(() => {
        loadAppointments();
        // Start polling for appointment updates
        const pollInterval = setInterval(loadAppointments, 8000); // Poll every 8 seconds

        return () => clearInterval(pollInterval); // Cleanup on unmount
    }, [loadAppointments]);

    // Fetch available doctors when booking method changes to 'schedule'
    useEffect(() => {
        if (bookingMethod === 'schedule' && showBookForm) {
            fetchAvailableDoctors();
        }
    }, [bookingMethod, showBookForm]);

    // Fetch available slots when doctor is selected
    useEffect(() => {
        if (scheduleForm.doctorId && bookingMethod === 'schedule') {
            fetchDoctorAvailability(scheduleForm.doctorId);
        }
    }, [scheduleForm.doctorId, bookingMethod]);

    const fetchAvailableDoctors = async () => {
        try {
            setLoadingDoctors(true);
            const response = await doctorAPI.getAvailableDoctors();
            setAvailableDoctors(response.data);
        } catch (error) {
            console.error('Error fetching available doctors:', error);
            alert('Failed to load available doctors');
        } finally {
            setLoadingDoctors(false);
        }
    };

    const fetchDoctorAvailability = async (doctorId) => {
        try {
            setLoadingSlots(true);
            const response = await doctorAPI.getDoctorAvailability(doctorId);

            // Filter out past time slots
            const now = new Date();
            const futureSlots = (response.data.availableSlots || []).filter(slot => {
                const slotTime = new Date(slot.startTime);
                return slotTime > now; // Only show slots that are in the future
            });

            setAvailableSlots(futureSlots);
            setSelectedDoctor(response.data.doctor);
        } catch (error) {
            console.error('Error fetching doctor availability:', error);
            alert('Failed to load doctor availability');
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleSlotSelection = (slot) => {
        setScheduleForm({
            ...scheduleForm,
            selectedSlot: slot,
            scheduledDate: new Date(slot.startTime).toISOString().slice(0, 16) // Format for datetime-local input
        });
    };

    const handleCancelAppointment = async (consultationId) => {
        if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

        try {
            setLoading(true);
            await consultationAPI.cancelConsultation(consultationId);

            // Update local state
            dispatch(updateConsultation({
                id: consultationId,
                status: 'CANCELLED'
            }));
        } catch (err) {
            console.error('Error cancelling appointment:', err);
            alert('Failed to cancel appointment');
        } finally {
            setLoading(false);
        }
    };

    const handleRescheduleAppointment = async (consultationId) => {
        const newDateTime = prompt('Enter new date and time (YYYY-MM-DDTHH:mm):');
        if (!newDateTime) return;

        try {
            setLoading(true);
            await consultationAPI.rescheduleConsultation(consultationId, { newDateTime });

            // Update local state
            dispatch(updateConsultation({
                id: consultationId,
                scheduledStart: new Date(newDateTime).toISOString()
            }));
        } catch (err) {
            console.error('Error rescheduling appointment:', err);
            alert('Failed to reschedule appointment');
        } finally {
            setLoading(false);
        }
    };

    const handleBookAppointment = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);

            let res;
            if (bookingMethod === 'book') {
                // Book appointment - backend assigns doctor based on workload
                // For quick book, we don't specify a scheduled date - backend will assign
                res = await consultationAPI.bookConsultation({
                    reason: bookForm.reason
                });
            } else {
                // Schedule appointment - user selects specific doctor and time
                res = await consultationAPI.bookConsultation({
                    doctorId: scheduleForm.doctorId,
                    scheduledDate: scheduleForm.scheduledDate,
                    reason: scheduleForm.reason
                });
            }

            // Show success message with assigned doctor info for quick booking
            if (bookingMethod === 'book' && res.data.bookingType === 'quick') {
                alert(`Appointment booked successfully!\n\nAssigned Doctor: Dr. ${res.data.assignedDoctor.name}\nSpecialty: ${res.data.assignedDoctor.specialty}\n\nYou'll receive a confirmation with the appointment details.`);
            } else {
                alert(res.data.message || 'Appointment booked successfully!');
            }

            // Refresh consultations
            const consultationsRes = await consultationAPI.getPatientConsultations();
            dispatch(setConsultations(consultationsRes.data));

            // Reset forms and close modal
            setShowBookForm(false);
            setBookForm({ scheduledDate: '', reason: '' });
            setScheduleForm({ doctorId: '', scheduledDate: '', reason: '' });
            setBookingMethod('book');
        } catch (err) {
            console.error('Error booking appointment:', err);
            alert('Failed to book appointment');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800';
            case 'ACTIVE':
                return 'bg-green-100 text-green-800';
            case 'COMPLETED':
                return 'bg-blue-100 text-blue-800';
            case 'CANCELLED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
                <button
                    onClick={() => setShowBookForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Book New Appointment
                </button>
            </div>

            {/* Book Appointment Form */}
            {showBookForm && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-xl font-semibold mb-4">Book New Appointment</h2>

                    {/* Booking Method Selection */}
                    <div className="mb-6">
                        <div className="flex space-x-4">
                            <button
                                type="button"
                                onClick={() => setBookingMethod('book')}
                                className={`px-4 py-2 rounded-md font-medium ${
                                    bookingMethod === 'book'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                Quick Book (Auto-assign Doctor)
                            </button>
                            <button
                                type="button"
                                onClick={() => setBookingMethod('schedule')}
                                className={`px-4 py-2 rounded-md font-medium ${
                                    bookingMethod === 'schedule'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                Schedule with Specific Doctor
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleBookAppointment} className="space-y-4">
                        {bookingMethod === 'schedule' && (
                            <>
                                {/* Doctor Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Select Doctor</label>
                                    {loadingDoctors ? (
                                        <div className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50">
                                            Loading doctors...
                                        </div>
                                    ) : (
                                        <select
                                            value={scheduleForm.doctorId}
                                            onChange={(e) => {
                                                setScheduleForm({
                                                    ...scheduleForm,
                                                    doctorId: e.target.value,
                                                    selectedSlot: null,
                                                    scheduledDate: ''
                                                });
                                                setAvailableSlots([]);
                                                setSelectedDoctor(null);
                                            }}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            required
                                        >
                                            <option value="">Choose a doctor...</option>
                                            {availableDoctors.map(doctor => (
                                                <option key={doctor._id || doctor.id} value={doctor._id || doctor.id}>
                                                    Dr. {doctor.name} - {doctor.specialty}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Available Slots */}
                                {scheduleForm.doctorId && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Available Time Slots
                                            {selectedDoctor && (
                                                <span className="text-xs text-gray-500 ml-2">
                                                    for Dr. {selectedDoctor.name}
                                                </span>
                                            )}
                                        </label>
                                        {loadingSlots ? (
                                            <div className="p-4 bg-gray-50 rounded-md text-center">
                                                Loading available slots...
                                            </div>
                                        ) : availableSlots.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                                {availableSlots.map(slot => (
                                                    <button
                                                        key={slot.id}
                                                        type="button"
                                                        onClick={() => handleSlotSelection(slot)}
                                                        className={`p-3 text-sm border rounded-md transition-colors ${
                                                            scheduleForm.selectedSlot?.id === slot.id
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {slot.displayTime}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
                                                No available slots found for this doctor. Try selecting a different date or doctor.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {bookingMethod === 'schedule' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Selected Time Slot
                                </label>
                                <input
                                    type="datetime-local"
                                    value={scheduleForm.scheduledDate}
                                    readOnly
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50"
                                    placeholder="Select a time slot above"
                                />
                            </div>
                        )}

                        {bookingMethod === 'book' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <p className="text-sm text-blue-800 font-medium">
                                        Quick Book - Doctor will be auto-assigned based on availability
                                    </p>
                                </div>
                                <p className="text-xs text-blue-600 mt-1">
                                    You'll receive a confirmation with the assigned doctor and appointment time.
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Reason for Appointment</label>
                            <textarea
                                value={bookingMethod === 'book' ? bookForm.reason : scheduleForm.reason}
                                onChange={(e) => {
                                    if (bookingMethod === 'book') {
                                        setBookForm({...bookForm, reason: e.target.value});
                                    } else {
                                        setScheduleForm({...scheduleForm, reason: e.target.value});
                                    }
                                }}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                rows={3}
                                placeholder="Please describe your symptoms or reason for the appointment"
                                required
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button
                                type="submit"
                                disabled={loading || (bookingMethod === 'schedule' && !scheduleForm.selectedSlot)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                            >
                                {loading ? 'Booking...' : (bookingMethod === 'book' ? 'Book Appointment' : 'Schedule Appointment')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowBookForm(false);
                                    setBookingMethod('book');
                                    setBookForm({ scheduledDate: '', reason: '' });
                                    setScheduleForm({ doctorId: '', selectedSlot: null, scheduledDate: '', reason: '' });
                                    setAvailableDoctors([]);
                                    setAvailableSlots([]);
                                    setSelectedDoctor(null);
                                }}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Appointments List */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold">All Appointments</h2>
                </div>

                <div className="divide-y divide-gray-200">
                    {Array.isArray(consultations) && consultations.length > 0 ? (
                        consultations
                            .filter(appointment => {
                                // Only show appointments that are scheduled for the future or currently active
                                const appointmentTime = new Date(appointment.scheduledStart);
                                const now = new Date();
                                return appointmentTime >= now || appointment.status === 'ACTIVE';
                            })
                            .map(appointment => (
                            <div key={appointment._id || appointment.id} className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <h3 className="text-lg font-medium text-gray-900">
                                                Dr. {appointment.doctor?.name || 'Unknown Doctor'}
                                            </h3>
                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(appointment.status)}`}>
                                                {appointment.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {appointment.scheduledStart ? new Date(appointment.scheduledStart).toLocaleString('en-GB', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false
                                            }) : 'Date not set'}
                                        </p>
                                        {appointment.bookingReason && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                Reason: {appointment.bookingReason}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex space-x-3">
                                        {appointment.status === 'PENDING' && (
                                            <>
                                                <button
                                                    onClick={() => handleRescheduleAppointment(appointment._id || appointment.id)}
                                                    disabled={loading}
                                                    className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 disabled:opacity-50"
                                                >
                                                    Reschedule
                                                </button>
                                                <button
                                                    onClick={() => handleCancelAppointment(appointment._id || appointment.id)}
                                                    disabled={loading}
                                                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                        {appointment.status === 'ACTIVE' && (
                                            <button
                                                onClick={() => onNavigateToChat && onNavigateToChat(appointment)}
                                                className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                                            >
                                                Join Chat
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-6 text-center text-gray-500">
                            No appointments found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PatientAppointments;
