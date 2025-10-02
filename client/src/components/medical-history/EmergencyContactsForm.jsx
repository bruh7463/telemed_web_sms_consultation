import { useState, useEffect } from 'react';

const EmergencyContactsForm = ({ contacts = [], onSave, onCancel }) => {
    const [formData, setFormData] = useState(contacts);
    const [loading, setLoading] = useState(false);

    // Sync form data with props when they change
    useEffect(() => {
        setFormData(contacts);
    }, [contacts]);

    const addContact = () => {
        setFormData([...formData, {
            name: '',
            relationship: '',
            phoneNumber: '',
            address: '',
            email: '',
            isPrimary: formData.length === 0 // First contact is primary by default
        }]);
    };

    const updateContact = (index, field, value) => {
        const updated = [...formData];
        updated[index] = { ...updated[index], [field]: value };
        setFormData(updated);
    };

    const setPrimaryContact = (index) => {
        const updated = formData.map((contact, i) => ({
            ...contact,
            isPrimary: i === index
        }));
        setFormData(updated);
    };

    const removeContact = (index) => {
        if (formData[index].isPrimary && formData.length > 1) {
            // If removing primary contact, make the first remaining contact primary
            const updated = formData.filter((_, i) => i !== index);
            updated[0] = { ...updated[0], isPrimary: true };
            setFormData(updated);
        } else {
            setFormData(formData.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error('Error saving emergency contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Emergency Contacts</h3>
                <button
                    type="button"
                    onClick={addContact}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"
                >
                    + Add Contact
                </button>
            </div>

            {formData.map((contact, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                            <h4 className="font-medium">Contact #{index + 1}</h4>
                            {contact.isPrimary && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                    Primary Contact
                                </span>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            {!contact.isPrimary && (
                                <button
                                    type="button"
                                    onClick={() => setPrimaryContact(index)}
                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                                >
                                    Set as Primary
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => removeContact(index)}
                                className="text-red-600 hover:text-red-800 text-sm"
                            >
                                Remove
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                value={contact.name}
                                onChange={(e) => updateContact(index, 'name', e.target.value)}
                                placeholder="John Doe"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Relationship *
                            </label>
                            <select
                                value={contact.relationship}
                                onChange={(e) => updateContact(index, 'relationship', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            >
                                <option value="">Select relationship</option>
                                <option value="spouse">Spouse</option>
                                <option value="parent">Parent</option>
                                <option value="child">Child</option>
                                <option value="sibling">Sibling</option>
                                <option value="grandparent">Grandparent</option>
                                <option value="grandchild">Grandchild</option>
                                <option value="aunt">Aunt</option>
                                <option value="uncle">Uncle</option>
                                <option value="cousin">Cousin</option>
                                <option value="friend">Friend</option>
                                <option value="neighbor">Neighbor</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                value={contact.phoneNumber}
                                onChange={(e) => updateContact(index, 'phoneNumber', e.target.value)}
                                placeholder="+1 (555) 123-4567"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={contact.email}
                                onChange={(e) => updateContact(index, 'email', e.target.value)}
                                placeholder="john.doe@example.com"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address
                            </label>
                            <textarea
                                value={contact.address}
                                onChange={(e) => updateContact(index, 'address', e.target.value)}
                                rows={2}
                                placeholder="Full address including city, state, and postal code"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    </div>
                </div>
            ))}

            {formData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p>No emergency contacts added yet.</p>
                    <button
                        type="button"
                        onClick={addContact}
                        className="mt-2 px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                    >
                        Add Your First Emergency Contact
                    </button>
                </div>
            )}

            {formData.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <div className="text-red-600 mr-3">⚠️</div>
                        <div>
                            <h4 className="font-medium text-red-800">Emergency Contact Information</h4>
                            <p className="text-sm text-red-700 mt-1">
                                Emergency contacts will be contacted in case of medical emergencies.
                                Please ensure the information is current and accurate. At least one primary contact is recommended.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex space-x-3 pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                    {loading ? 'Saving...' : 'Save Emergency Contacts'}
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

export default EmergencyContactsForm;
