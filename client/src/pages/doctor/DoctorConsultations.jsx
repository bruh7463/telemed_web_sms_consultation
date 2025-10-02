import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { consultationAPI } from '../../services/api';
import { setConsultations } from '../../redux/slices/consultSlice';

const DoctorConsultations = ({ onNavigateToChat }) => {
    const { consultations } = useSelector(state => state.consult);
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [selectedConsultation, setSelectedConsultation] = useState(null);

    // Ensure data is in array format
    const consultationsArray = Array.isArray(consultations) ? consultations : [];

    const loadConsultations = useCallback(async () => {
        try {
            const res = await consultationAPI.getDoctorConsultations();
            dispatch(setConsultations(res.data));
        } catch (err) {
            // Silent error handling - don't interrupt user experience
            console.debug('Background consultation polling failed:', err.message);
        }
    }, [dispatch]);

    useEffect(() => {
        loadConsultations();
        // Start polling for consultation updates
        const pollInterval = setInterval(loadConsultations, 8000); // Poll every 8 seconds

        return () => clearInterval(pollInterval); // Cleanup on unmount
    }, [loadConsultations]);

    const handleCompleteConsultation = async (consultationId) => {
        if (!window.confirm('Mark this consultation as completed?')) return;

        try {
            setLoading(true);
            await consultationAPI.completeConsultation(consultationId);
            await loadConsultations(); // Refresh the list
        } catch (err) {
            console.error('Error completing consultation:', err);
            alert('Failed to complete consultation');
        } finally {
            setLoading(false);
        }
    };

    const handleStartConsultation = async (consultation) => {
        try {
            setLoading(true);

            // First, send a message to activate the consultation (this will change status to ACTIVE)
            await consultationAPI.sendDoctorMessage(consultation._id || consultation.id, "Hello! I've started our consultation. How can I help you today?");

            // Refresh consultations to get updated status
            await loadConsultations();

            // Close the details modal
            setSelectedConsultation(null);

            // Navigate to chat section
            if (onNavigateToChat) {
                onNavigateToChat(consultation);
            }

        } catch (err) {
            console.error('Error starting consultation:', err);
            alert('Failed to start consultation');
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
                <h1 className="text-3xl font-bold text-gray-900">My Consultations</h1>
                <button
                    onClick={loadConsultations}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                    Refresh
                </button>
            </div>

            {/* Consultations List */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold">All Consultations</h2>
                </div>

                <div className="divide-y divide-gray-200">
                    {consultationsArray.length > 0 ? (
                        consultationsArray.map(consultation => (
                            <div key={consultation._id || consultation.id} className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <h3 className="text-lg font-medium text-gray-900">
                                                {consultation.patient?.name || 'Unknown Patient'}
                                            </h3>
                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(consultation.status)}`}>
                                                {consultation.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {consultation.scheduledStart ? new Date(consultation.scheduledStart).toLocaleString('en-GB', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false
                                            }) : 'Date not set'}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Reason: {consultation.bookingReason || 'No reason provided'}
                                        </p>
                                        {consultation.notes && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                Notes: {consultation.notes}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex space-x-3">
                                        {consultation.status === 'ACTIVE' && (
                                            <>
                                                <button
                                                    onClick={() => setSelectedConsultation(consultation)}
                                                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                                                >
                                                    View Details
                                                </button>
                                                <button
                                                    onClick={() => handleCompleteConsultation(consultation._id || consultation.id)}
                                                    disabled={loading}
                                                    className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50"
                                                >
                                                    Complete
                                                </button>
                                            </>
                                        )}
                                        {consultation.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleStartConsultation(consultation)}
                                                disabled={loading}
                                                className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50"
                                            >
                                                Start Consultation
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-6 text-center text-gray-500">
                            No consultations found
                        </div>
                    )}
                </div>
            </div>

            {/* Consultation Details Modal */}
            {selectedConsultation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Consultation Details</h2>
                            <button
                                onClick={() => setSelectedConsultation(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="font-medium text-gray-900">Patient Information</h3>
                                <p className="text-sm text-gray-600">Name: {selectedConsultation.patient?.name || 'Unknown Patient'}</p>
                                <p className="text-sm text-gray-600">Phone: {selectedConsultation.patient?.phoneNumber || 'Not provided'}</p>
                            </div>

                            <div>
                                <h3 className="font-medium text-gray-900">Consultation Details</h3>
                                <p className="text-sm text-gray-600">
                                    Date: {selectedConsultation.scheduledStart ? new Date(selectedConsultation.scheduledStart).toLocaleString('en-GB', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    }) : 'Date not set'}
                                </p>
                                <p className="text-sm text-gray-600">Reason: {selectedConsultation.bookingReason || 'No reason provided'}</p>
                                <p className="text-sm text-gray-600">Status: {selectedConsultation.status}</p>
                            </div>

                            {selectedConsultation.notes && (
                                <div>
                                    <h3 className="font-medium text-gray-900">Notes</h3>
                                    <p className="text-sm text-gray-600">{selectedConsultation.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorConsultations;
