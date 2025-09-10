import { useState, useEffect } from 'react';
import api from '../services/api';

const PrescriptionViewer = ({ prescriptionId, isDoctor = false }) => {
    const [prescription, setPrescription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sendingSMS, setSendingSMS] = useState(false);

    useEffect(() => {
        if (prescriptionId) {
            fetchPrescription();
        }
    }, [prescriptionId]);

    const fetchPrescription = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/prescriptions/${prescriptionId}`);
            setPrescription(response.data.prescription);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to load prescription');
            console.error('Error fetching prescription:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendSMS = async () => {
        if (!prescription) return;

        setSendingSMS(true);
        try {
            await api.post(`/prescriptions/${prescription._id}/send-sms`);
            // Update the prescription to reflect SMS was sent
            setPrescription({
                ...prescription,
                smsSent: true,
                smsSentAt: new Date()
            });
            alert('Prescription sent via SMS successfully!');
        } catch (error) {
            alert('Failed to send prescription via SMS');
            console.error('Error sending SMS:', error);
        } finally {
            setSendingSMS(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="text-gray-600">Loading prescription...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
            </div>
        );
    }

    if (!prescription) {
        return (
            <div className="text-center p-8 text-gray-600">
                Prescription not found
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
            {/* Header */}
            <div className="border-b pb-4 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Prescription</h1>
                        <p className="text-gray-600">
                            Created: {new Date(prescription.createdAt).toLocaleDateString()}
                        </p>
                        {prescription.smsSent && (
                            <p className="text-green-600 text-sm mt-1">
                                ✅ Sent via SMS on {new Date(prescription.smsSentAt).toLocaleString()}
                            </p>
                        )}
                    </div>
                    {isDoctor && (
                        <div className="flex space-x-2">
                            <button
                                onClick={handleSendSMS}
                                disabled={sendingSMS || prescription.smsSent}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sendingSMS ? 'Sending...' : prescription.smsSent ? 'SMS Sent' : 'Send via SMS'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Doctor and Patient Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">Doctor</h3>
                    <p className="text-gray-700">{prescription.doctor.name}</p>
                    <p className="text-gray-600 text-sm">{prescription.doctor.specialty}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">Patient</h3>
                    <p className="text-gray-700">{prescription.patient.name}</p>
                    <p className="text-gray-600 text-sm">{prescription.patient.phoneNumber}</p>
                </div>
            </div>

            {/* Diagnosis */}
            {prescription.diagnosis && (
                <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-2">Diagnosis</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{prescription.diagnosis}</p>
                </div>
            )}

            {/* Allergies */}
            {prescription.allergies && (
                <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-2">Allergies</h3>
                    <p className="text-red-700 bg-red-50 p-3 rounded border-l-4 border-red-400">
                        ⚠️ {prescription.allergies}
                    </p>
                </div>
            )}

            {/* Medications */}
            <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-4">Medications</h3>
                <div className="space-y-4">
                    {prescription.medications.map((medication, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                            <div className="flex items-start">
                                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800 text-lg mb-2">
                                        {medication.name}
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium text-gray-600">Dosage:</span>
                                            <p className="text-gray-800">{medication.dosage}</p>
                                        </div>

                                        <div>
                                            <span className="font-medium text-gray-600">Frequency:</span>
                                            <p className="text-gray-800">{medication.frequency}</p>
                                        </div>

                                        <div>
                                            <span className="font-medium text-gray-600">Duration:</span>
                                            <p className="text-gray-800">{medication.duration}</p>
                                        </div>
                                    </div>

                                    {medication.instructions && (
                                        <div className="mt-3">
                                            <span className="font-medium text-gray-600">Instructions:</span>
                                            <p className="text-gray-800 mt-1">{medication.instructions}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Notes */}
            {prescription.notes && (
                <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-2">Additional Notes</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{prescription.notes}</p>
                </div>
            )}

            {/* Status */}
            <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="font-medium text-gray-600">Status:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-sm ${
                            prescription.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : prescription.status === 'COMPLETED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                        }`}>
                            {prescription.status}
                        </span>
                    </div>

                    <div className="text-sm text-gray-500">
                        Last updated: {new Date(prescription.updatedAt).toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrescriptionViewer;
