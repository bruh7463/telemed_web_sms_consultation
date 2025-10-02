import { useState, useEffect, useCallback } from 'react';
import { medicalHistoryAPI } from '../../services/api';

const AllergiesForm = ({ allergies = [], onSave, onCancel }) => {
    const [formData, setFormData] = useState(allergies);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Sync form data with props when they change
    useEffect(() => {
        setFormData(allergies);
    }, [allergies]);

    const searchAllergens = useCallback(async () => {
        try {
            const response = await medicalHistoryAPI.getMedicalCodes('allergen', searchTerm);
            setSearchResults(response.data.codes);
        } catch (error) {
            console.error('Error searching allergens:', error);
        }
    }, [searchTerm]);

    useEffect(() => {
        if (searchTerm.length > 2) {
            searchAllergens();
        } else {
            setSearchResults([]);
        }
    }, [searchTerm, searchAllergens]);



    const addAllergy = () => {
        setFormData([...formData, {
            allergen: '',
            reaction: '',
            severity: 'mild',
            status: 'active',
            diagnosedDate: '',
            notes: ''
        }]);
    };

    const updateAllergy = (index, field, value) => {
        const updated = [...formData];
        updated[index] = { ...updated[index], [field]: value };
        setFormData(updated);
    };

    const selectAllergen = (index, allergen) => {
        updateAllergy(index, 'allergen', allergen.displayName);
        setSearchTerm('');
        setSearchResults([]);
    };

    const removeAllergy = (index) => {
        setFormData(formData.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error('Error saving allergies:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Allergies</h3>
                <button
                    type="button"
                    onClick={addAllergy}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"
                >
                    + Add Allergy
                </button>
            </div>

            {formData.map((allergy, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Allergy #{index + 1}</h4>
                        <button
                            type="button"
                            onClick={() => removeAllergy(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                        >
                            Remove
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Allergen *
                            </label>
                            <input
                                type="text"
                                value={allergy.allergen}
                                onChange={(e) => {
                                    updateAllergy(index, 'allergen', e.target.value);
                                    setSearchTerm(e.target.value);
                                }}
                                placeholder="e.g., Penicillin, Shellfish"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto">
                                    {searchResults.map((result, resultIndex) => (
                                        <div
                                            key={resultIndex}
                                            onClick={() => selectAllergen(index, result)}
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
                                Reaction
                            </label>
                            <input
                                type="text"
                                value={allergy.reaction}
                                onChange={(e) => updateAllergy(index, 'reaction', e.target.value)}
                                placeholder="e.g., Rash, Hives, Difficulty breathing"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Severity
                            </label>
                            <select
                                value={allergy.severity}
                                onChange={(e) => updateAllergy(index, 'severity', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="mild">Mild</option>
                                <option value="moderate">Moderate</option>
                                <option value="severe">Severe</option>
                                <option value="life-threatening">Life-threatening</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={allergy.status}
                                onChange={(e) => updateAllergy(index, 'status', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="active">Active</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Diagnosed Date
                            </label>
                            <input
                                type="date"
                                value={allergy.diagnosedDate ? allergy.diagnosedDate.split('T')[0] : ''}
                                onChange={(e) => updateAllergy(index, 'diagnosedDate', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={allergy.notes}
                                onChange={(e) => updateAllergy(index, 'notes', e.target.value)}
                                rows={2}
                                placeholder="Additional notes about this allergy..."
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    </div>
                </div>
            ))}

            {formData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p>No allergies recorded yet.</p>
                    <button
                        type="button"
                        onClick={addAllergy}
                        className="mt-2 px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                    >
                        Add Your First Allergy
                    </button>
                </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="text-yellow-600 mr-3">⚠️</div>
                    <div>
                        <h4 className="font-medium text-yellow-800">Important</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                            Please be accurate when recording allergies. This information is critical for your safety during medical consultations.
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
                    {loading ? 'Saving...' : 'Save Allergies'}
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

export default AllergiesForm;
