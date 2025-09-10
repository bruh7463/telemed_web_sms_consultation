import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const PatientDashboard = () => {
    const [profile, setProfile] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
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

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Patient Dashboard</h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                    Logout
                </button>
            </div>
            
            {profile && (
                <div className="bg-white shadow rounded-lg p-4 mb-4">
                    <h2 className="text-xl font-semibold mb-2">Profile</h2>
                    <p><strong>Name:</strong> {profile.name}</p>
                    <p><strong>Phone:</strong> {profile.phoneNumber}</p>
                    <p><strong>NRC:</strong> {profile.nrc}</p>
                    {/* Add other profile fields as needed */}
                </div>
            )}

            <div className="bg-white shadow rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-2">Appointment History</h2>
                {appointments.length > 0 ? (
                    <ul>
                        {appointments.map(app => (
                            <li key={app._id} className="border-b py-2">
                                <p><strong>Doctor:</strong> Dr. {app.doctor.name}</p>
                                <p><strong>Date:</strong> {new Date(app.scheduledStart).toLocaleString()}</p>
                                <p><strong>Status:</strong> {app.status}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No appointments found</p>
                )}
            </div>
        </div>
    );
};

export default PatientDashboard;
