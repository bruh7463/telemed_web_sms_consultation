import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PrescriptionViewer from '../components/PrescriptionViewer';

const PatientDashboard = () => {
    const [profile, setProfile] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [bookingForm, setBookingForm] = useState({
        doctorId: '',
        reason: '',
        preferredDate: '',
        preferredTime: ''
    });
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [activeConsultation, setActiveConsultation] = useState(null);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        checkAuthAndFetchData();
    }, []);

    const checkAuthAndFetchData = async () => {
        try {
            // Check if authenticated
            await api.get('/auth/patient/status');
            // If successful, fetch data
            await Promise.all([fetchProfile(), fetchAppointments()]);
        } catch (error) {
            // Not authenticated, redirect to auth
            navigate('/patient/auth');
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async () => {
        try {
            const response = await api.get('/patients/profile');
            setProfile(response.data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const fetchAppointments = async () => {
        try {
            const response = await api.get('/patients/appointments');
            setAppointments(response.data);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        }
    };

    const fetchPrescriptions = async () => {
        try {
            const response = await api.get('/prescriptions');
            setPrescriptions(response.data.prescriptions);
        } catch (error) {
            console.error('Error fetching prescriptions:', error);
        }
    };

    const fetchDoctors = async () => {
        try {
            // This endpoint might need to be added to the backend
            const response = await api.get('/doctors/available');
            setDoctors(response.data);
        } catch (error) {
            console.error('Error fetching doctors:', error);
        }
    };

    const handleBookAppointment = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/consultations/book', bookingForm);
            alert('Appointment booked successfully!');
            setShowBookingForm(false);
            setBookingForm({ doctorId: '', reason: '', preferredDate: '', preferredTime: '' });
            fetchAppointments();
        } catch (error) {
            alert('Failed to book appointment: ' + (error.response?.data?.message || 'Unknown error'));
        }
    };

    const handleCancelAppointment = async (appointmentId) => {
        if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

        try {
            await api.patch(`/consultations/${appointmentId}/cancel`);
            alert('Appointment cancelled successfully!');
            fetchAppointments();
        } catch (error) {
            alert('Failed to cancel appointment');
        }
    };

    const handleRescheduleAppointment = async (appointmentId, newDateTime) => {
        try {
            await api.patch(`/consultations/${appointmentId}/reschedule`, { newDateTime });
            alert('Appointment rescheduled successfully!');
            fetchAppointments();
        } catch (error) {
            alert('Failed to reschedule appointment');
        }
    };

    const handleSendMessage = async (consultationId, content) => {
        try {
            await api.post(`/consultations/${consultationId}/messages`, { content });
            setMessage('');
            fetchAppointments(); // Refresh to get updated messages
        } catch (error) {
            alert('Failed to send message');
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
            navigate('/patient/auth');
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout on client side
            navigate('/patient/auth');
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto p-4">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    // Separate appointments into upcoming and history
    const now = new Date();
    const upcomingAppointments = appointments.filter(app =>
        new Date(app.scheduledStart) > now && app.status !== 'COMPLETED' && app.status !== 'CANCELLED'
    );
    const appointmentHistory = appointments.filter(app =>
        new Date(app.scheduledStart) <= now || app.status === 'COMPLETED' || app.status === 'CANCELLED'
    );

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Patient Dashboard</h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                    Logout
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="mb-6">
                <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    {['dashboard', 'prescriptions', 'appointments', 'messages'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                if (tab === 'prescriptions') fetchPrescriptions();
                                if (tab === 'appointments') fetchDoctors();
                            }}
                            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                                activeTab === tab
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {profile && (
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Profile</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p><strong>Name:</strong> {profile.name}</p>
                                    <p><strong>Phone:</strong> {profile.phoneNumber}</p>
                                    <p><strong>NRC:</strong> {profile.nrc}</p>
                                </div>
                                <div>
                                    <p><strong>Upcoming Appointments:</strong> {upcomingAppointments.length}</p>
                                    <p><strong>Active Prescriptions:</strong> {prescriptions.filter(p => p.status === 'ACTIVE').length}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => {
                                    setActiveTab('appointments');
                                    setShowBookingForm(true);
                                    fetchDoctors();
                                }}
                                className="bg-blue-500 text-white px-4 py-3 rounded hover:bg-blue-600 transition-colors"
                            >
                                Book Appointment
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('prescriptions');
                                    fetchPrescriptions();
                                }}
                                className="bg-green-500 text-white px-4 py-3 rounded hover:bg-green-600 transition-colors"
                            >
                                View Prescriptions
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('messages');
                                    // Find active consultation
                                    const active = appointments.find(app => app.status === 'ACTIVE');
                                    if (active) setActiveConsultation(active);
                                }}
                                className="bg-purple-500 text-white px-4 py-3 rounded hover:bg-purple-600 transition-colors"
                            >
                                Send Message
                            </button>
                        </div>
                    </div>

                    {/* Upcoming Appointments Preview */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
                        {upcomingAppointments.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingAppointments.slice(0, 3).map(app => (
                                    <div key={app._id} className="border rounded-lg p-4 bg-blue-50">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">Dr. {app.doctor.name}</p>
                                                <p className="text-sm text-gray-600">{new Date(app.scheduledStart).toLocaleString()}</p>
                                                <p className="text-sm text-gray-600">Status: {app.status}</p>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleCancelAppointment(app._id)}
                                                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600">No upcoming appointments</p>
                        )}
                    </div>
                </div>
            )}

            {/* Prescriptions Tab */}
            {activeTab === 'prescriptions' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-semibold">My Prescriptions</h2>
                    </div>

                    {selectedPrescription ? (
                        <div>
                            <button
                                onClick={() => setSelectedPrescription(null)}
                                className="mb-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                                ← Back to List
                            </button>
                            <PrescriptionViewer prescriptionId={selectedPrescription} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {prescriptions.length > 0 ? (
                                prescriptions.map(prescription => (
                                    <div key={prescription._id} className="bg-white shadow rounded-lg p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-semibold text-lg">Dr. {prescription.doctor.name}</h3>
                                                <p className="text-sm text-gray-600">{new Date(prescription.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                prescription.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                                prescription.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {prescription.status}
                                            </span>
                                        </div>

                                        <div className="mb-4">
                                            <p className="text-sm text-gray-600 mb-2">Medications:</p>
                                            <ul className="text-sm space-y-1">
                                                {prescription.medications.slice(0, 2).map((med, idx) => (
                                                    <li key={idx} className="flex justify-between">
                                                        <span>{med.name}</span>
                                                        <span className="text-gray-500">{med.dosage}</span>
                                                    </li>
                                                ))}
                                                {prescription.medications.length > 2 && (
                                                    <li className="text-gray-500">+{prescription.medications.length - 2} more</li>
                                                )}
                                            </ul>
                                        </div>

                                        <button
                                            onClick={() => setSelectedPrescription(prescription._id)}
                                            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <p className="text-gray-600">No prescriptions found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-semibold">My Appointments</h2>
                        <button
                            onClick={() => setShowBookingForm(!showBookingForm)}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            {showBookingForm ? 'Cancel' : 'Book New Appointment'}
                        </button>
                    </div>

                    {/* Booking Form */}
                    {showBookingForm && (
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-xl font-semibold mb-4">Book New Appointment</h3>
                            <form onSubmit={handleBookAppointment} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Select Doctor</label>
                                    <select
                                        value={bookingForm.doctorId}
                                        onChange={(e) => setBookingForm({...bookingForm, doctorId: e.target.value})}
                                        className="w-full p-2 border rounded"
                                        required
                                    >
                                        <option value="">Choose a doctor...</option>
                                        {doctors.map(doctor => (
                                            <option key={doctor._id} value={doctor._id}>
                                                Dr. {doctor.name} - {doctor.specialty}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Reason for Visit</label>
                                    <textarea
                                        value={bookingForm.reason}
                                        onChange={(e) => setBookingForm({...bookingForm, reason: e.target.value})}
                                        className="w-full p-2 border rounded"
                                        rows="3"
                                        placeholder="Please describe your symptoms or reason for visit..."
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Preferred Date</label>
                                        <input
                                            type="date"
                                            value={bookingForm.preferredDate}
                                            onChange={(e) => setBookingForm({...bookingForm, preferredDate: e.target.value})}
                                            className="w-full p-2 border rounded"
                                            min={new Date().toISOString().split('T')[0]}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Preferred Time</label>
                                        <input
                                            type="time"
                                            value={bookingForm.preferredTime}
                                            onChange={(e) => setBookingForm({...bookingForm, preferredTime: e.target.value})}
                                            className="w-full p-2 border rounded"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex space-x-4">
                                    <button
                                        type="submit"
                                        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                                    >
                                        Book Appointment
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowBookingForm(false)}
                                        className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Upcoming Appointments */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-xl font-semibold mb-4">Upcoming Appointments</h3>
                        {upcomingAppointments.length > 0 ? (
                            <div className="space-y-4">
                                {upcomingAppointments.map(app => (
                                    <div key={app._id} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">Dr. {app.doctor.name}</p>
                                                <p className="text-sm text-gray-600">{app.doctor.specialty}</p>
                                                <p className="text-sm text-gray-600">{new Date(app.scheduledStart).toLocaleString()}</p>
                                                <p className="text-sm text-gray-600">Reason: {app.bookingReason}</p>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleCancelAppointment(app._id)}
                                                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const newDateTime = prompt('Enter new date and time (YYYY-MM-DD HH:MM):');
                                                        if (newDateTime) handleRescheduleAppointment(app._id, newDateTime);
                                                    }}
                                                    className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                                                >
                                                    Reschedule
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600">No upcoming appointments</p>
                        )}
                    </div>

                    {/* Appointment History */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-xl font-semibold mb-4">Appointment History</h3>
                        {appointmentHistory.length > 0 ? (
                            <div className="space-y-4">
                                {appointmentHistory.map(app => (
                                    <div key={app._id} className="border rounded-lg p-4 bg-gray-50">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">Dr. {app.doctor.name}</p>
                                                <p className="text-sm text-gray-600">{new Date(app.scheduledStart).toLocaleString()}</p>
                                                <p className="text-sm text-gray-600">Status: <span className={`font-medium ${
                                                    app.status === 'COMPLETED' ? 'text-green-600' :
                                                    app.status === 'CANCELLED' ? 'text-red-600' : 'text-blue-600'
                                                }`}>{app.status}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600">No appointment history</p>
                        )}
                    </div>
                </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Messages</h2>

                    {!activeConsultation ? (
                        <div className="bg-white shadow rounded-lg p-6">
                            <p className="text-gray-600 mb-4">Select an active consultation to send messages:</p>
                            <div className="space-y-3">
                                {appointments.filter(app => app.status === 'ACTIVE').map(app => (
                                    <div key={app._id} className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                                         onClick={() => setActiveConsultation(app)}>
                                        <p className="font-semibold">Dr. {app.doctor.name}</p>
                                        <p className="text-sm text-gray-600">{new Date(app.scheduledStart).toLocaleString()}</p>
                                    </div>
                                ))}
                                {appointments.filter(app => app.status === 'ACTIVE').length === 0 && (
                                    <p className="text-gray-600">No active consultations</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">Chat with Dr. {activeConsultation.doctor.name}</h3>
                                <button
                                    onClick={() => setActiveConsultation(null)}
                                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                >
                                    Close Chat
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="border rounded-lg p-4 mb-4 h-96 overflow-y-auto bg-gray-50">
                                {activeConsultation.messages && activeConsultation.messages.length > 0 ? (
                                    <div className="space-y-3">
                                        {activeConsultation.messages.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.sender === 'PATIENT' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                                    msg.sender === 'PATIENT'
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-white text-gray-800 border'
                                                }`}>
                                                    <p>{msg.content}</p>
                                                    <p className={`text-xs mt-1 ${
                                                        msg.sender === 'PATIENT' ? 'text-blue-100' : 'text-gray-500'
                                                    }`}>
                                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-600 text-center">No messages yet. Start the conversation!</p>
                                )}
                            </div>

                            {/* Message Input */}
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                if (message.trim()) {
                                    handleSendMessage(activeConsultation._id, message);
                                }
                            }} className="flex space-x-2">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 p-2 border rounded"
                                />
                                <button
                                    type="submit"
                                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                >
                                    Send
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PatientDashboard;
