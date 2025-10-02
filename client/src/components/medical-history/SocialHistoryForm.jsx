import { useState, useEffect } from 'react';

const SocialHistoryForm = ({ socialHistory = {}, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        smoking: socialHistory.smoking || { status: 'never', packsPerDay: '', quitDate: '' },
        alcohol: socialHistory.alcohol || { status: 'never', drinksPerWeek: '', quitDate: '' },
        occupation: socialHistory.occupation || '',
        exercise: socialHistory.exercise || '',
        diet: socialHistory.diet || '',
        maritalStatus: socialHistory.maritalStatus || '',
        education: socialHistory.education || '',
        livingArrangement: socialHistory.livingArrangement || '',
        notes: socialHistory.notes || ''
    });
    const [loading, setLoading] = useState(false);

    // Sync form data with props when they change
    useEffect(() => {
        setFormData({
            smoking: socialHistory.smoking || { status: 'never', packsPerDay: '', quitDate: '' },
            alcohol: socialHistory.alcohol || { status: 'never', drinksPerWeek: '', quitDate: '' },
            occupation: socialHistory.occupation || '',
            exercise: socialHistory.exercise || '',
            diet: socialHistory.diet || '',
            maritalStatus: socialHistory.maritalStatus || '',
            education: socialHistory.education || '',
            livingArrangement: socialHistory.livingArrangement || '',
            notes: socialHistory.notes || ''
        });
    }, [socialHistory]);

    const updateField = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error('Error saving social history:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Social History</h3>
            </div>

            {/* Smoking History */}
            <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🚬</span>
                    Smoking History
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Smoking Status
                        </label>
                        <select
                            value={formData.smoking.status}
                            onChange={(e) => updateField('smoking.status', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                            <option value="never">Never smoked</option>
                            <option value="former">Former smoker</option>
                            <option value="current">Current smoker</option>
                        </select>
                    </div>

                    {(formData.smoking.status === 'current' || formData.smoking.status === 'former') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Packs per Day
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.smoking.packsPerDay}
                                onChange={(e) => updateField('smoking.packsPerDay', e.target.value)}
                                placeholder="1.5"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    )}

                    {formData.smoking.status === 'former' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quit Date
                            </label>
                            <input
                                type="date"
                                value={formData.smoking.quitDate ? formData.smoking.quitDate.split('T')[0] : ''}
                                onChange={(e) => updateField('smoking.quitDate', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Alcohol History */}
            <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🍷</span>
                    Alcohol Consumption
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Alcohol Status
                        </label>
                        <select
                            value={formData.alcohol.status}
                            onChange={(e) => updateField('alcohol.status', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                            <option value="never">Never drinks</option>
                            <option value="former">Former drinker</option>
                            <option value="occasional">Occasional drinker</option>
                            <option value="moderate">Moderate drinker</option>
                            <option value="heavy">Heavy drinker</option>
                        </select>
                    </div>

                    {(formData.alcohol.status !== 'never' && formData.alcohol.status !== 'former') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Drinks per Week
                            </label>
                            <input
                                type="number"
                                value={formData.alcohol.drinksPerWeek}
                                onChange={(e) => updateField('alcohol.drinksPerWeek', e.target.value)}
                                placeholder="7"
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    )}

                    {formData.alcohol.status === 'former' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quit Date
                            </label>
                            <input
                                type="date"
                                value={formData.alcohol.quitDate ? formData.alcohol.quitDate.split('T')[0] : ''}
                                onChange={(e) => updateField('alcohol.quitDate', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Lifestyle Information */}
            <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🏃‍♂️</span>
                    Lifestyle Information
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Occupation
                        </label>
                        <input
                            type="text"
                            value={formData.occupation}
                            onChange={(e) => updateField('occupation', e.target.value)}
                            placeholder="e.g., Software Engineer, Teacher"
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Exercise Frequency
                        </label>
                        <select
                            value={formData.exercise}
                            onChange={(e) => updateField('exercise', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                            <option value="">Select frequency</option>
                            <option value="sedentary">Sedentary (little to no exercise)</option>
                            <option value="light">Light exercise (1-2 days/week)</option>
                            <option value="moderate">Moderate exercise (3-4 days/week)</option>
                            <option value="active">Active (5+ days/week)</option>
                            <option value="very-active">Very active (daily intense exercise)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Diet
                        </label>
                        <select
                            value={formData.diet}
                            onChange={(e) => updateField('diet', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                            <option value="">Select diet type</option>
                            <option value="balanced">Balanced/healthy</option>
                            <option value="vegetarian">Vegetarian</option>
                            <option value="vegan">Vegan</option>
                            <option value="low-carb">Low carbohydrate</option>
                            <option value="high-protein">High protein</option>
                            <option value="fast-food">Fast food/frequent dining out</option>
                            <option value="irregular">Irregular eating habits</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Marital Status
                        </label>
                        <select
                            value={formData.maritalStatus}
                            onChange={(e) => updateField('maritalStatus', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                            <option value="">Select status</option>
                            <option value="single">Single</option>
                            <option value="married">Married</option>
                            <option value="divorced">Divorced</option>
                            <option value="widowed">Widowed</option>
                            <option value="separated">Separated</option>
                            <option value="domestic-partnership">Domestic Partnership</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Education Level
                        </label>
                        <select
                            value={formData.education}
                            onChange={(e) => updateField('education', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                            <option value="">Select education level</option>
                            <option value="no-formal">No formal education</option>
                            <option value="primary">Primary school</option>
                            <option value="secondary">Secondary school</option>
                            <option value="vocational">Vocational training</option>
                            <option value="bachelors">Bachelor's degree</option>
                            <option value="masters">Master's degree</option>
                            <option value="doctorate">Doctorate/PhD</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Living Arrangement
                        </label>
                        <select
                            value={formData.livingArrangement}
                            onChange={(e) => updateField('livingArrangement', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                            <option value="">Select arrangement</option>
                            <option value="alone">Lives alone</option>
                            <option value="with-spouse">With spouse/partner</option>
                            <option value="with-family">With family</option>
                            <option value="with-roommates">With roommates</option>
                            <option value="assisted-living">Assisted living</option>
                            <option value="nursing-home">Nursing home</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Additional Notes */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                </label>
                <textarea
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    rows={3}
                    placeholder="Any additional information about your social history, lifestyle, or habits..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="text-blue-600 mr-3">ℹ️</div>
                    <div>
                        <h4 className="font-medium text-blue-800">Social History Information</h4>
                        <p className="text-sm text-blue-700 mt-1">
                            This information helps your healthcare providers understand your lifestyle and risk factors.
                            All information is kept confidential and used only for your medical care.
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
                    {loading ? 'Saving...' : 'Save Social History'}
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

export default SocialHistoryForm;
