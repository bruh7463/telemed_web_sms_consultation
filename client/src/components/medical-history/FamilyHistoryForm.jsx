import { useState, useEffect } from 'react';

const FamilyHistoryForm = ({ familyHistory = [], onSave, onCancel }) => {
    const [formData, setFormData] = useState(familyHistory);
    const [loading, setLoading] = useState(false);

    // Sync form data with props when they change
    useEffect(() => {
        setFormData(familyHistory);
    }, [familyHistory]);

    const addFamilyMember = () => {
        setFormData([...formData, {
            relation: '',
            condition: '',
            status: 'living',
            ageAtDiagnosis: '',
            ageAtDeath: '',
            causeOfDeath: '',
            notes: ''
        }]);
    };

    const updateFamilyMember = (index, field, value) => {
        const updated = [...formData];
        updated[index] = { ...updated[index], [field]: value };
        setFormData(updated);
    };

    const removeFamilyMember = (index) => {
        setFormData(formData.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error('Error saving family history:', error);
        } finally {
            setLoading(false);
        }
    };

    const commonRelations = [
        'Mother', 'Father', 'Brother', 'Sister', 'Son', 'Daughter',
        'Grandmother (maternal)', 'Grandfather (maternal)',
        'Grandmother (paternal)', 'Grandfather (paternal)',
        'Aunt', 'Uncle', 'Cousin', 'Grandchild'
    ];

    const commonConditions = [
        'Heart disease', 'Cancer', 'Diabetes', 'High blood pressure',
        'Stroke', 'Alzheimer\'s disease', 'Parkinson\'s disease',
        'Asthma', 'Depression', 'Anxiety', 'Arthritis', 'Kidney disease',
        'Liver disease', 'Thyroid problems', 'Blood clots', 'Mental illness'
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Family History</h3>
                <button
                    type="button"
                    onClick={addFamilyMember}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"
                >
                    + Add Family Member
                </button>
            </div>

            {formData.map((member, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Family Member #{index + 1}</h4>
                        <button
                            type="button"
                            onClick={() => removeFamilyMember(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                        >
                            Remove
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Relationship *
                            </label>
                            <select
                                value={member.relation}
                                onChange={(e) => updateFamilyMember(index, 'relation', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            >
                                <option value="">Select relationship</option>
                                {commonRelations.map(relation => (
                                    <option key={relation} value={relation.toLowerCase()}>
                                        {relation}
                                    </option>
                                ))}
                                <option value="other">Other</option>
                            </select>
                            {member.relation === 'other' && (
                                <input
                                    type="text"
                                    placeholder="Specify relationship"
                                    className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2"
                                    onChange={(e) => updateFamilyMember(index, 'customRelation', e.target.value)}
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Medical Condition *
                            </label>
                            <select
                                value={member.condition}
                                onChange={(e) => updateFamilyMember(index, 'condition', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            >
                                <option value="">Select condition</option>
                                {commonConditions.map(condition => (
                                    <option key={condition} value={condition.toLowerCase()}>
                                        {condition}
                                    </option>
                                ))}
                                <option value="other">Other</option>
                            </select>
                            {member.condition === 'other' && (
                                <input
                                    type="text"
                                    placeholder="Specify condition"
                                    className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2"
                                    onChange={(e) => updateFamilyMember(index, 'customCondition', e.target.value)}
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={member.status}
                                onChange={(e) => updateFamilyMember(index, 'status', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="living">Living</option>
                                <option value="deceased">Deceased</option>
                                <option value="unknown">Unknown</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Age at Diagnosis
                            </label>
                            <input
                                type="number"
                                value={member.ageAtDiagnosis}
                                onChange={(e) => updateFamilyMember(index, 'ageAtDiagnosis', e.target.value)}
                                placeholder="Age when diagnosed"
                                min="0"
                                max="120"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>

                        {member.status === 'deceased' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Age at Death
                                    </label>
                                    <input
                                        type="number"
                                        value={member.ageAtDeath}
                                        onChange={(e) => updateFamilyMember(index, 'ageAtDeath', e.target.value)}
                                        placeholder="Age at death"
                                        min="0"
                                        max="120"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cause of Death
                                    </label>
                                    <input
                                        type="text"
                                        value={member.causeOfDeath}
                                        onChange={(e) => updateFamilyMember(index, 'causeOfDeath', e.target.value)}
                                        placeholder="Cause of death (if known)"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                            </>
                        )}

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={member.notes}
                                onChange={(e) => updateFamilyMember(index, 'notes', e.target.value)}
                                rows={2}
                                placeholder="Additional notes about this family member's medical history..."
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    </div>
                </div>
            ))}

            {formData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p>No family history recorded yet.</p>
                    <button
                        type="button"
                        onClick={addFamilyMember}
                        className="mt-2 px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                    >
                        Add Your First Family Member
                    </button>
                </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="text-blue-600 mr-3">ℹ️</div>
                    <div>
                        <h4 className="font-medium text-blue-800">Family History Information</h4>
                        <p className="text-sm text-blue-700 mt-1">
                            Family medical history is crucial for identifying genetic risks and preventive care.
                            Include information about close relatives (parents, siblings, children) and any significant
                            medical conditions they may have experienced.
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
                    {loading ? 'Saving...' : 'Save Family History'}
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

export default FamilyHistoryForm;
