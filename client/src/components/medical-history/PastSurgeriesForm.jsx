import { useState, useEffect, useCallback } from 'react';
import { medicalHistoryAPI } from '../../services/api';

const PastSurgeriesForm = ({ surgeries = [], onSave, onCancel }) => {
    const [formData, setFormData] = useState(surgeries);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Sync form data with props when they change
    useEffect(() => {
        setFormData(surgeries);
    }, [surgeries]);

    const searchProcedures = useCallback(async () => {
        try {
            const response = await medicalHistoryAPI.getMedicalCodes('procedure', searchTerm);
            setSearchResults(response.data.codes);
        } catch (error) {
            console.error('Error searching procedures:', error);
        }
    }, [searchTerm]);

    useEffect(() => {
        if (searchTerm.length > 2) {
            searchProcedures();
        } else {
            setSearchResults([]);
        }
    }, [searchTerm, searchProcedures]);

    const addSurgery = () => {
        setFormData([...formData, {
            procedure: '',
            date: '',
            surgeon: '',
            hospital: '',
            outcome: 'successful',
            complications: '',
            notes: ''
        }]);
    };

    const updateSurgery = (index, field, value) => {
        const updated = [...formData];
        updated[index] = { ...updated[index], [field]: value };
        setFormData(updated);
    };

    const selectProcedure = (index, procedure) => {
        updateSurgery(index, 'procedure', procedure.displayName);
        setSearchTerm('');
        setSearchResults([]);
    };

    const removeSurgery = (index) => {
        setFormData(formData.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error('Error saving surgeries:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Past Surgeries</h3>
                <button
                    type="button"
                    onClick={addSurgery}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"
                >
                    + Add Surgery
                </button>
            </div>

            {formData.map((surgery, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Surgery #{index + 1}</h4>
                        <button
                            type="button"
                            onClick={() => removeSurgery(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                        >
                            Remove
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Procedure *
                            </label>
                            <input
                                type="text"
                                value={surgery.procedure}
                                onChange={(e) => {
                                    updateSurgery(index, 'procedure', e.target.value);
                                    setSearchTerm(e.target.value);
                                }}
                                placeholder="e.g., Appendectomy, Knee Arthroscopy"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto">
                                    {searchResults.map((result, resultIndex) => (
                                        <div
                                            key={resultIndex}
                                            onClick={() => selectProcedure(index, result)}
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
                                Surgery Date *
                            </label>
                            <input
                                type="date"
                                value={surgery.date ? surgery.date.split('T')[0] : ''}
                                onChange={(e) => updateSurgery(index, 'date', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Surgeon
                            </label>
                            <input
                                type="text"
                                value={surgery.surgeon}
                                onChange={(e) => updateSurgery(index, 'surgeon', e.target.value)}
                                placeholder="Surgeon's name"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hospital/Clinic
                            </label>
                            <input
                                type="text"
                                value={surgery.hospital}
                                onChange={(e) => updateSurgery(index, 'hospital', e.target.value)}
                                placeholder="Hospital or clinic name"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Outcome
                            </label>
                            <select
                                value={surgery.outcome}
                                onChange={(e) => updateSurgery(index, 'outcome', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="successful">Successful</option>
                                <option value="complicated">Complicated</option>
                                <option value="failed">Failed</option>
                                <option value="ongoing">Ongoing</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Complications
                            </label>
                            <textarea
                                value={surgery.complications}
                                onChange={(e) => updateSurgery(index, 'complications', e.target.value)}
                                rows={2}
                                placeholder="Any complications or issues during/after surgery..."
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={surgery.notes}
                                onChange={(e) => updateSurgery(index, 'notes', e.target.value)}
                                rows={2}
                                placeholder="Additional notes about this surgery..."
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    </div>
                </div>
            ))}

            {formData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p>No past surgeries recorded yet.</p>
                    <button
                        type="button"
                        onClick={addSurgery}
                        className="mt-2 px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                    >
                        Add Your First Surgery
                    </button>
                </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="text-blue-600 mr-3">ℹ️</div>
                    <div>
                        <h4 className="font-medium text-blue-800">Surgical History Information</h4>
                        <p className="text-sm text-blue-700 mt-1">
                            Please include all surgical procedures you've had, including dates, surgeons, and any complications.
                            This information is crucial for your ongoing medical care and anesthesia planning.
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
                    {loading ? 'Saving...' : 'Save Surgeries'}
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

export default PastSurgeriesForm;
