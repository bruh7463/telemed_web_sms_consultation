import { useState, useEffect } from 'react';
import api from '../services/api';

const PrescriptionForm = ({ patientId, consultationId, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        diagnosis: '',
        notes: '',
        allergies: '',
        medications: [
            {
                name: '',
                dosage: '',
                frequency: '',
                duration: '',
                instructions: ''
            }
        ]
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [patients, setPatients] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState(patientId || '');

    useEffect(() => {
        if (!patientId) {
            fetchPatients();
        }
    }, [patientId]);

    const fetchPatients = async () => {
        try {
            const response = await api.get('/patients');
            setPatients(response.data.patients || []);
        } catch (error) {
            console.error('Error fetching patients:', error);
        }
    };

    const handleMedicationChange = (index, field, value) => {
        const updatedMedications = [...formData.medications];
        updatedMedications[index][field] = value;
        setFormData({ ...formData, medications: updatedMedications });
    };

    const addMedication = () => {
        setFormData({
            ...formData,
            medications: [
                ...formData.medications,
                {
                    name: '',
                    dosage: '',
                    frequency: '',
                    duration: '',
                    instructions: ''
                }
            ]
        });
    };

    const removeMedication = (index) => {
        if (formData.medications.length > 1) {
            const updatedMedications = formData.medications.filter((_, i) => i !== index);
            setFormData({ ...formData, medications: updatedMedications });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validate form
        if (!selectedPatientId) {
            setError('Please select a patient');
            setLoading(false);
            return;
        }

        const validMedications = formData.medications.filter(med =>
            med.name.trim() && med.dosage.trim() && med.frequency.trim() && med.duration.trim()
        );

        if (validMedications.length === 0) {
            setError('Please add at least one complete medication');
            setLoading(false);
            return;
        }

        try {
            const prescriptionData = {
                patientId: selectedPatientId,
                consultationId: consultationId || null,
                medications: validMedications,
                diagnosis: formData.diagnosis.trim(),
                notes: formData.notes.trim(),
                allergies: formData.allergies.trim()
            };

            const response = await api.post('/prescriptions', prescriptionData);

            if (onSuccess) {
                onSuccess(response.data.prescription);
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create prescription');
            console.error('Error creating prescription:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Create Prescription</h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient Selection */}
                {!patientId && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Patient *
                        </label>
                        <select
                            value={selectedPatientId}
                            onChange={(e) => setSelectedPatientId(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="">Choose a patient...</option>
                            {patients.map(patient => (
                                <option key={patient._id} value={patient._id}>
                                    {patient.name} - {patient.phoneNumber}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Diagnosis */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Diagnosis
                    </label>
                    <input
                        type="text"
                        value={formData.diagnosis}
                        onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter diagnosis..."
                    />
                </div>

                {/* Allergies */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allergies
                    </label>
                    <input
                        type="text"
                        value={formData.allergies}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter patient allergies..."
                    />
                </div>

                {/* Medications */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-medium text-gray-700">
                            Medications *
                        </label>
                        <button
                            type="button"
                            onClick={addMedication}
                            className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 text-sm"
                        >
                            + Add Medication
                        </button>
                    </div>

                    {formData.medications.map((medication, index) => (
                        <div key={index} className="border border-gray-200 rounded-md p-4 mb-4 bg-gray-50">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium text-gray-800">Medication {index + 1}</h4>
                                {formData.medications.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeMedication(index)}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Medication Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={medication.name}
                                        onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., Amoxicillin"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Dosage *
                                    </label>
                                    <input
                                        type="text"
                                        value={medication.dosage}
                                        onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., 500mg"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Frequency *
                                    </label>
                                    <input
                                        type="text"
                                        value={medication.frequency}
                                        onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., 3 times daily"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Duration *
                                    </label>
                                    <input
                                        type="text"
                                        value={medication.duration}
                                        onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., 7 days"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Instructions
                                    </label>
                                    <textarea
                                        value={medication.instructions}
                                        onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., Take with food, avoid alcohol"
                                        rows="2"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Notes
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Additional instructions or notes..."
                        rows="3"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-4">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating...' : 'Create Prescription'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PrescriptionForm;
