import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { consultationAPI, prescriptionAPI } from '../../services/api';
import { setConsultations } from '../../redux/slices/consultSlice';
import { setPrescriptions } from '../../redux/slices/prescriptionSlice';
import PatientHeader from '../../components/PatientHeader';
import PatientSidebar from '../../components/PatientSidebar';
import PatientAppointments from './PatientAppointments';
import PatientPrescriptions from './PatientPrescriptions';
import PatientHistory from './PatientHistory';
import PatientChat from './PatientChat';

const PatientDashboard = ({ onLogout }) => {
    const [activeView, setActiveView] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector(state => state.auth);

    useEffect(() => {
        loadPatientData();
    }, []);

    const loadPatientData = async () => {
        try {
            setLoading(true);
            console.log('Loading patient data...');

            // Load consultations
            console.log('Fetching consultations...');
            const consultationsRes = await consultationAPI.getPatientConsultations();
            console.log('Consultations response:', consultationsRes);
            dispatch(setConsultations(consultationsRes.data));

            // Load prescriptions
            console.log('Fetching prescriptions...');
            const prescriptionsRes = await prescriptionAPI.getPatientPrescriptions();
            console.log('Prescriptions response:', prescriptionsRes);
            // Backend returns { prescriptions: [...] }, so we need to extract the array
            const prescriptionsData = prescriptionsRes.data.prescriptions || prescriptionsRes.data || [];
            dispatch(setPrescriptions(prescriptionsData));

            console.log('Patient data loaded successfully');

        } catch (err) {
            console.error('Error loading patient data:', err);
            console.error('Error details:', {
                message: err.message,
                response: err.response,
                status: err.response?.status,
                data: err.response?.data
            });

            // Show user-friendly error message
            if (err.response?.status === 401) {
                console.error('Authentication error - user may need to login again');
            } else if (err.response?.status === 500) {
                console.error('Server error - backend may not be running');
            } else if (!err.response) {
                console.error('Network error - cannot connect to backend server');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleNavigateToChat = (consultation) => {
        // For now, just navigate to chat view - PatientChat component will handle consultation selection
        setActiveView('chat');
    };

    const renderContent = () => {
        switch (activeView) {
            case 'appointments':
                return <PatientAppointments onNavigateToChat={handleNavigateToChat} />;
            case 'prescriptions':
                return <PatientPrescriptions />;
            case 'history':
                return <PatientHistory />;
            case 'chat':
                return <PatientChat />;
            default:
                return <PatientDashboardHome onNavigateToChat={handleNavigateToChat} />;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <PatientSidebar activeView={activeView} setActiveView={setActiveView} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <PatientHeader user={user} onLogout={onLogout} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

// Home dashboard component
const PatientDashboardHome = ({ onNavigateToChat }) => {
    const { consultations } = useSelector(state => state.consult);
    const { prescriptions } = useSelector(state => state.prescription);

    // Ensure data is in array format
    const consultationsArray = Array.isArray(consultations) ? consultations : [];
    const prescriptionsArray = Array.isArray(prescriptions) ? prescriptions : [];

    const upcomingAppointments = consultationsArray.filter(c => {
        // Only show future appointments or currently active ones
        const appointmentTime = new Date(c.scheduledStart);
        const now = new Date();
        return (appointmentTime >= now || c.status === 'ACTIVE') && (c.status === 'PENDING' || c.status === 'ACTIVE');
    });

    const activeConsultations = consultationsArray.filter(c => c.status === 'ACTIVE');
    const pendingConsultations = consultationsArray.filter(c => c.status === 'PENDING');

    const activePrescriptions = prescriptionsArray.filter(p => p.status === 'ACTIVE');
    const recentPrescriptions = prescriptionsArray.slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{upcomingAppointments.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900">Active Prescriptions</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">{activePrescriptions.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900">Completed Consultations</h3>
                    <p className="text-3xl font-bold text-purple-600 mt-2">
                        {consultationsArray.filter(c => c.status === 'COMPLETED').length}
                    </p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Consultations & Appointments */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Consultations</h3>
                    {activeConsultations.length > 0 ? (
                        <div className="space-y-3">
                            {activeConsultations.slice(0, 3).map(consultation => (
                                <div key={consultation._id || consultation.id} className="flex items-center justify-between p-3 bg-green-50 rounded">
                                    <div>
                                        <p className="font-medium">Dr. {consultation.doctor?.name || 'Unknown Doctor'}</p>
                                        <p className="text-sm text-gray-600">
                                            Started {consultation.scheduledStart ? new Date(consultation.scheduledStart).toLocaleDateString() : 'Date not set'}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                            Active
                                        </span>
                                        <button
                                            onClick={() => onNavigateToChat(consultation)}
                                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                        >
                                            Join Chat
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-gray-500">No active consultations</p>

                            {/* Show pending appointments if no active ones */}
                            {pendingConsultations.length > 0 && (
                                <>
                                    <h4 className="text-md font-medium text-gray-700">Upcoming Appointments</h4>
                                    <div className="space-y-3">
                                        {pendingConsultations.slice(0, 2).map(appointment => (
                                            <div key={appointment._id || appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                                <div>
                                                    <p className="font-medium">Dr. {appointment.doctor?.name || 'Unknown Doctor'}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {appointment.scheduledStart ? new Date(appointment.scheduledStart).toLocaleDateString() : 'Date not set'}
                                                    </p>
                                                </div>
                                                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                                                    Pending
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Recent Prescriptions */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Prescriptions</h3>
                    {recentPrescriptions.length > 0 ? (
                        <div className="space-y-3">
                            {recentPrescriptions.map(prescription => (
                                <div key={prescription._id || prescription.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                    <div>
                                        <p className="font-medium">
                                            {prescription.medications?.[0]?.name || 'Prescription'}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Dr. {prescription.doctor?.name || 'Unknown Doctor'}
                                        </p>
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        {prescription.createdAt ? new Date(prescription.createdAt).toLocaleDateString() : 'Date not set'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No prescriptions yet</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PatientDashboard;
