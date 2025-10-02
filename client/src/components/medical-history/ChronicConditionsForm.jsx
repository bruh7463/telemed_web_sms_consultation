import { useState, useEffect } from 'react';

const ChronicConditionsForm = ({ conditions = [], onSave, onCancel }) => {
    const [formData, setFormData] = useState(conditions);
    const [loading, setLoading] = useState(false);

    // Sync form data with props when they change
    useEffect(() => {
        setFormData(conditions);
    }, [conditions]);

    const addCondition = () => {
        setFormData([...formData, {
            condition: '',
            diagnosisDate: '',
            status: 'active',
            notes: ''
        }]);
    };

    const updateCondition = (index, field, value) => {
        const updated = [...formData];
        updated[index] = { ...updated[index], [field]: value };
        setFormData(updated);
    };

    const removeCondition = (index) => {
        setFormData(formData.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error('Error saving chronic conditions:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Chronic Conditions</h3>
                <button
                    type="button"
                    onClick={addCondition}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"
                >
                    + Add Condition
                </button>
            </div>

            {formData.map((condition, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Condition #{index + 1}</h4>
                        <button
                            type="button"
                            onClick={() => removeCondition(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                        >
                            Remove
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Condition *
                            </label>
                            <input
                                type="text"
                                value={condition.condition}
                                onChange={(e) => updateCondition(index, 'condition', e.target.value)}
                                placeholder="e.g., Type 2 Diabetes"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Diagnosis Date
                            </label>
                            <input
                                type="date"
                                value={condition.diagnosisDate ? condition.diagnosisDate.split('T')[0] : ''}
                                onChange={(e) => updateCondition(index, 'diagnosisDate', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={condition.status}
                                onChange={(e) => updateCondition(index, 'status', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="active">Active</option>
                                <option value="resolved">Resolved</option>
                                <option value="managed">Managed</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={condition.notes}
                                onChange={(e) => updateCondition(index, 'notes', e.target.value)}
                                rows={2}
                                placeholder="Additional notes about this condition..."
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    </div>
                </div>
            ))}

            {formData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p>No chronic conditions added yet.</p>
                    <button
                        type="button"
                        onClick={addCondition}
                        className="mt-2 px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                    >
                        Add Your First Condition
                    </button>
                </div>
            )}

            <div className="flex space-x-3 pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                    {loading ? 'Saving...' : 'Save Conditions'}
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

export default ChronicConditionsForm;
