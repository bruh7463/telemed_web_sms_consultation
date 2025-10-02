import { useState, useEffect, useCallback } from 'react';
import { medicalHistoryAPI } from '../../services/api';

const CurrentMedicationsForm = ({ medications = [], onSave, onCancel }) => {
    const [formData, setFormData] = useState(medications);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Sync form data with props when they change
    useEffect(() => {
        setFormData(medications);
    }, [medications]);

    const searchMedications = useCallback(async () => {
        try {
            const response = await medicalHistoryAPI.getMedicalCodes('medication', searchTerm);
            setSearchResults(response.data.codes);
        } catch (error) {
            console.error('Error searching medications:', error);
        }
    }, [searchTerm]);

    useEffect(() => {
        if (searchTerm.length > 2) {
            searchMedications();
        } else {
            setSearchResults([]);
        }
    }, [searchTerm, searchMedications]);

    const addMedication = () => {
        setFormData([...formData, {
            medication: '',
            dosage: '',
            frequency: '',
            status: 'active',
            prescribedBy: '',
            startDate: '',
            notes: ''
        }]);
    };

    const updateMedication = (index, field, value) => {
        const updated = [...formData];
        updated[index] = { ...updated[index], [field]: value };
        setFormData(updated);
    };

    const selectMedication = (index, medication) => {
        updateMedication(index, 'medication', medication.displayName);
        setSearchTerm('');
        setSearchResults([]);
    };

    const removeMedication = (index) => {
        setFormData(formData.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error('Error saving medications:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Current Medications</h3>
                <button
                    type="button"
                    onClick={addMedication}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"
                >
                    + Add Medication
                </button>
            </div>

            {formData.map((medication, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Medication #{index + 1}</h4>
                        <button
                            type="button"
                            onClick={() => removeMedication(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                        >
                            Remove
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Medication Name *
                            </label>
                            <input
                                type="text"
                                value={medication.medication}
                                onChange={(e) => {
                                    updateMedication(index, 'medication', e.target.value);
                                    setSearchTerm(e.target.value);
                                }}
                                placeholder="e.g., Aspirin, Lisinopril"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto">
                                    {searchResults.map((result, resultIndex) => (
                                        <div
                                            key={resultIndex}
                                            onClick={() => selectMedication(index, result)}
                                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="font-medium">{result.displayName}</div>
                                            <div className="text-sm text-gray-500">{result.code}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Dosage
                            </label>
                            <input
                                type="text"
                                value={medication.dosage}
                                onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                                placeholder="e.g., 10mg, 500mg twice daily"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Frequency
                            </label>
                            <select
                                value={medication.frequency}
                                onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="">Select frequency</option>
                                <option value="once daily">Once daily</option>
                                <option value="twice daily">Twice daily</option>
                                <option value="three times daily">Three times daily</option>
                                <option value="four times daily">Four times daily</option>
                                <option value="as needed">As needed</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={medication.status}
                                onChange={(e) => updateMedication(index, 'status', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="active">Active</option>
                                <option value="discontinued">Discontinued</option>
                                <option value="on hold">On hold</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Prescribed By
                            </label>
                            <input
                                type="text"
                                value={medication.prescribedBy}
                                onChange={(e) => updateMedication(index, 'prescribedBy', e.target.value)}
                                placeholder="Doctor's name"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={medication.startDate ? medication.startDate.split('T')[0] : ''}
                                onChange={(e) => updateMedication(index, 'startDate', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={medication.notes}
                                onChange={(e) => updateMedication(index, 'notes', e.target.value)}
                                rows={2}
                                placeholder="Additional notes about this medication..."
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    </div>
                </div>
            ))}

            {formData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p>No current medications recorded yet.</p>
                    <button
                        type="button"
                        onClick={addMedication}
                        className="mt-2 px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                    >
                        Add Your First Medication
                    </button>
                </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="text-blue-600 mr-3">ℹ️</div>
                    <div>
                        <h4 className="font-medium text-blue-800">Medication Information</h4>
                        <p className="text-sm text-blue-700 mt-1">
                            Please include all current medications, including over-the-counter drugs, vitamins, and supplements.
                            This information is crucial for your safety during consultations.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex space-x-3 pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                    {loading ? 'Saving...' : 'Save Medications'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};

export default CurrentMedicationsForm;
