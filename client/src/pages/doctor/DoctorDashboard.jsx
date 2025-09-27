import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { consultationAPI, prescriptionAPI } from '../../services/api';
import { setConsultations } from '../../redux/slices/consultSlice';
import { setPrescriptions } from '../../redux/slices/prescriptionSlice';
import DoctorHeader from '../../components/DoctorHeader';
import DoctorSidebar from '../../components/DoctorSidebar';
import DoctorConsultations from './DoctorConsultations';
import DoctorPrescriptions from './DoctorPrescriptions';
import DoctorChat from './DoctorChat';
import DoctorAvailabilityManager from '../../components/DoctorAvailabilityManager';

const DoctorDashboard = ({ onLogout }) => {
    const [activeView, setActiveView] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [selectedConsultationForChat, setSelectedConsultationForChat] = useState(null);
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);

    useEffect(() => {
        loadDoctorData();
        // Start polling for dashboard updates
        const pollInterval = setInterval(loadDoctorData, 10000); // Poll every 10 seconds

        return () => clearInterval(pollInterval); // Cleanup on unmount
    }, []);

    const loadDoctorData = async () => {
        try {
            // Load consultations silently
            const consultationsRes = await consultationAPI.getDoctorConsultations();
            dispatch(setConsultations(consultationsRes.data));

            // Load prescriptions silently
            const prescriptionsRes = await prescriptionAPI.getDoctorPrescriptions();
            // Handle both direct array and wrapped object response
            const prescriptionsData = prescriptionsRes.data.prescriptions || prescriptionsRes.data || [];
            dispatch(setPrescriptions(prescriptionsData));

            // Set loading to false after initial load
            setLoading(false);

        } catch (err) {
            // Silent error handling - don't interrupt user experience
            console.debug('Background dashboard polling failed:', err.message);
            // Still set loading to false on error to prevent infinite loading
            setLoading(false);
        }
    };

    const handleNavigateToChat = (consultation) => {
        setSelectedConsultationForChat(consultation);
        setActiveView('chat');
    };

    const renderContent = () => {
        switch (activeView) {
            case 'consultations':
                return <DoctorConsultations onNavigateToChat={handleNavigateToChat} />;
            case 'prescriptions':
                return <DoctorPrescriptions />;
            case 'availability':
                return <DoctorAvailabilityManager />;
            case 'chat':
                return <DoctorChat selectedConsultation={selectedConsultationForChat} />;
            default:
                return <DoctorDashboardHome onNavigateToChat={handleNavigateToChat} />;
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
            <DoctorSidebar activeView={activeView} setActiveView={setActiveView} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <DoctorHeader user={user} onLogout={onLogout} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

// Home dashboard component
const DoctorDashboardHome = ({ onNavigateToChat }) => {
    const { consultations } = useSelector(state => state.consult);
    const { prescriptions } = useSelector(state => state.prescription);

    // Ensure data is in array format
    const consultationsArray = Array.isArray(consultations) ? consultations : [];
    const prescriptionsArray = Array.isArray(prescriptions) ? prescriptions : [];

    const pendingConsultations = consultationsArray.filter(c => c.status === 'PENDING');
    const activeConsultations = consultationsArray.filter(c => c.status === 'ACTIVE');
    const completedConsultations = consultationsArray.filter(c => c.status === 'COMPLETED');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900">Pending</h3>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingConsultations.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900">Active</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">{activeConsultations.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900">Completed</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{completedConsultations.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900">Prescriptions Issued</h3>
                    <p className="text-3xl font-bold text-purple-600 mt-2">{prescriptionsArray.length}</p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Consultations */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Consultations</h3>
                    {pendingConsultations.length > 0 ? (
                        <div className="space-y-3">
                            {pendingConsultations.slice(0, 5).map(consultation => (
                                <div key={consultation._id || consultation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                    <div>
                                        <p className="font-medium">{consultation.patient?.name || 'Unknown Patient'}</p>
                                        <p className="text-sm text-gray-600">
                                            {consultation.scheduledStart ? new Date(consultation.scheduledStart).toLocaleDateString() : 'Date not set'}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {consultation.bookingReason || 'No reason provided'}
                                        </p>
                                    </div>
                                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                                        Pending
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No pending consultations</p>
                    )}
                </div>

                {/* Active Consultations */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Consultations</h3>
                    {activeConsultations.length > 0 ? (
                        <div className="space-y-3">
                            {activeConsultations.slice(0, 5).map(consultation => (
                                <div key={consultation._id || consultation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                    <div>
                                        <p className="font-medium">{consultation.patient?.name || 'Unknown Patient'}</p>
                                        <p className="text-sm text-gray-600">
                                            Started {consultation.scheduledStart ? new Date(consultation.scheduledStart).toLocaleDateString() : 'Date not set'}
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                            Active
                                        </span>
                                        <button
                                            onClick={() => onNavigateToChat(consultation)}
                                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                                        >
                                            Chat
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No active consultations</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DoctorDashboard;
