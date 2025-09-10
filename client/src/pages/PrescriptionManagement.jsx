import { useState, useEffect } from 'react';
import api from '../services/api';
import PrescriptionForm from '../components/PrescriptionForm';
import PrescriptionViewer from '../components/PrescriptionViewer';

const PrescriptionManagement = ({ isDoctor = false }) => {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list', 'view', 'create'

    useEffect(() => {
        fetchPrescriptions();
    }, []);

    const fetchPrescriptions = async () => {
        try {
            setLoading(true);
            const response = await api.get('/prescriptions');
            setPrescriptions(response.data.prescriptions);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to load prescriptions');
            console.error('Error fetching prescriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSuccess = (newPrescription) => {
        setPrescriptions([newPrescription, ...prescriptions]);
        setShowForm(false);
        setViewMode('list');
    };

    const handleViewPrescription = (prescription) => {
        setSelectedPrescription(prescription);
        setViewMode('view');
    };

    const handleBackToList = () => {
        setViewMode('list');
        setSelectedPrescription(null);
        setShowForm(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
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

    if (viewMode === 'view' && selectedPrescription) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-6xl mx-auto px-4">
                    <button
                        onClick={handleBackToList}
                        className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
                    >
                        ← Back to Prescriptions
                    </button>
                    <PrescriptionViewer
                        prescriptionId={selectedPrescription._id}
                        isDoctor={isDoctor}
                    />
                </div>
            </div>
        );
    }

    if (viewMode === 'create') {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-6xl mx-auto px-4">
                    <button
                        onClick={handleBackToList}
                        className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
                    >
                        ← Back to Prescriptions
                    </button>
                    <PrescriptionForm
                        onSuccess={handleCreateSuccess}
                        onCancel={handleBackToList}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">
                            {isDoctor ? 'Prescription Management' : 'My Prescriptions'}
                        </h1>
                        <p className="text-gray-600 mt-2">
                            {isDoctor
                                ? 'Manage prescriptions for your patients'
                                : 'View your prescription history'
                            }
                        </p>
                    </div>

                    {isDoctor && (
                        <button
                            onClick={() => setViewMode('create')}
                            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 flex items-center"
                        >
                            + Create Prescription
                        </button>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="text-gray-600">Loading prescriptions...</div>
                    </div>
                ) : prescriptions.length === 0 ? (
                    /* Empty State */
                    <div className="text-center py-12">
                        <div className="text-gray-400 text-6xl mb-4">📋</div>
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">No Prescriptions Found</h3>
                        <p className="text-gray-500 mb-6">
                            {isDoctor
                                ? 'You haven\'t created any prescriptions yet.'
                                : 'You don\'t have any prescriptions yet.'
                            }
                        </p>
                        {isDoctor && (
                            <button
                                onClick={() => setViewMode('create')}
                                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
                            >
                                Create Your First Prescription
                            </button>
                        )}
                    </div>
                ) : (
                    /* Prescriptions List */
                    <div className="grid gap-6">
                        {prescriptions.map((prescription) => (
                            <div
                                key={prescription._id}
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => handleViewPrescription(prescription)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-xl font-semibold text-gray-800">
                                                Prescription #{prescription._id.slice(-8)}
                                            </h3>
                                            <span className={`px-2 py-1 rounded text-sm ${getStatusColor(prescription.status)}`}>
                                                {prescription.status}
                                            </span>
                                            {prescription.smsSent && (
                                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                                                    SMS Sent
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                            <div>
                                                <span className="font-medium">Created:</span>{' '}
                                                {new Date(prescription.createdAt).toLocaleDateString()}
                                            </div>
                                            {prescription.smsSent && (
                                                <div>
                                                    <span className="font-medium">SMS Sent:</span>{' '}
                                                    {new Date(prescription.smsSentAt).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        {isDoctor ? (
                                            <div>
                                                <p className="font-medium text-gray-800">
                                                    {prescription.patient.name}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {prescription.patient.phoneNumber}
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="font-medium text-gray-800">
                                                    Dr. {prescription.doctor.name}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {prescription.doctor.specialty}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Medications Preview */}
                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-gray-800 mb-2">Medications:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {prescription.medications.slice(0, 3).map((med, index) => (
                                            <span
                                                key={index}
                                                className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                                            >
                                                {med.name}
                                            </span>
                                        ))}
                                        {prescription.medications.length > 3 && (
                                            <span className="text-gray-500 text-sm">
                                                +{prescription.medications.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Diagnosis Preview */}
                                {prescription.diagnosis && (
                                    <div className="mt-3 text-sm text-gray-600">
                                        <span className="font-medium">Diagnosis:</span> {prescription.diagnosis}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrescriptionManagement;
