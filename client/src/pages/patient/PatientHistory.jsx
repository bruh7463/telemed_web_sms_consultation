import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { consultationAPI } from '../../services/api';
import { Calendar, Clock, User, FileText, MessageCircle } from 'lucide-react';

const PatientHistory = () => {
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadConsultationHistory();
    }, []);

    const loadConsultationHistory = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await consultationAPI.getPatientConsultations();
            const allConsultations = Array.isArray(response.data) ? response.data : [];

            // Filter for completed consultations and sort by most recent first
            const completedConsultations = allConsultations
                .filter(consultation => consultation.status === 'COMPLETED')
                .sort((a, b) => new Date(b.scheduledStart) - new Date(a.scheduledStart));

            setConsultations(completedConsultations);
        } catch (err) {
            console.error('Error loading consultation history:', err);
            setError('Failed to load consultation history. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Date not set';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 text-green-800';
            case 'CANCELLED':
                return 'bg-red-100 text-red-800';
            case 'ACTIVE':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg text-gray-600">Loading consultation history...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                        <div className="mt-2 text-sm text-red-700">{error}</div>
                        <div className="mt-4">
                            <button
                                onClick={loadConsultationHistory}
                                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Calendar className="mr-3 text-blue-600" />
                    Consultation History
                </h1>
                <div className="text-sm text-gray-500">
                    {consultations.length} completed consultation{consultations.length !== 1 ? 's' : ''}
                </div>
            </div>

            {consultations.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border p-8">
                    <div className="text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No consultation history</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            You haven't completed any consultations yet.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {consultations.map((consultation) => (
                        <div key={consultation._id || consultation.id} className="bg-white rounded-lg shadow-sm border p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-3">
                                        <div className="flex items-center space-x-2">
                                            <User className="w-5 h-5 text-gray-400" />
                                            <span className="font-medium text-gray-900">
                                                Dr. {consultation.doctor?.name || 'Unknown Doctor'}
                                            </span>
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(consultation.status)}`}>
                                            {consultation.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center space-x-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                {formatDate(consultation.scheduledStart)}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                {formatTime(consultation.scheduledStart)} - {formatTime(consultation.scheduledEnd)}
                                            </span>
                                        </div>
                                    </div>

                                    {consultation.bookingReason && (
                                        <div className="mb-4">
                                            <div className="flex items-start space-x-2">
                                                <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Reason for visit:</p>
                                                    <p className="text-sm text-gray-600 mt-1">{consultation.bookingReason}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {consultation.messages && consultation.messages.length > 0 && (
                                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                                            <MessageCircle className="w-4 h-4" />
                                            <span>{consultation.messages.length} message{consultation.messages.length !== 1 ? 's' : ''} exchanged</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PatientHistory;
