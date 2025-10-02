import { useState, useEffect } from 'react';

const VitalSignsForm = ({ vitalSigns = {}, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        height: vitalSigns.height || '',
        weight: vitalSigns.weight || '',
        bloodPressure: {
            systolic: vitalSigns.bloodPressure?.systolic || '',
            diastolic: vitalSigns.bloodPressure?.diastolic || ''
        },
        heartRate: vitalSigns.heartRate || '',
        temperature: vitalSigns.temperature || '',
        oxygenSaturation: vitalSigns.oxygenSaturation || '',
        respiratoryRate: vitalSigns.respiratoryRate || '',
        lastMeasured: vitalSigns.lastMeasured || '',
        measuredBy: vitalSigns.measuredBy || '',
        notes: vitalSigns.notes || ''
    });
    const [loading, setLoading] = useState(false);

    // Sync form data with props when they change
    useEffect(() => {
        setFormData({
            height: vitalSigns.height || '',
            weight: vitalSigns.weight || '',
            bloodPressure: {
                systolic: vitalSigns.bloodPressure?.systolic || '',
                diastolic: vitalSigns.bloodPressure?.diastolic || ''
            },
            heartRate: vitalSigns.heartRate || '',
            temperature: vitalSigns.temperature || '',
            oxygenSaturation: vitalSigns.oxygenSaturation || '',
            respiratoryRate: vitalSigns.respiratoryRate || '',
            lastMeasured: vitalSigns.lastMeasured || '',
            measuredBy: vitalSigns.measuredBy || '',
            notes: vitalSigns.notes || ''
        });
    }, [vitalSigns]);

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

    const calculateBMI = () => {
        const height = parseFloat(formData.height);
        const weight = parseFloat(formData.weight);

        if (height && weight && height > 0) {
            // Convert height to meters if it's in cm
            const heightInMeters = height > 3 ? height / 100 : height;
            const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
            return bmi;
        }
        return '';
    };

    const getBMICategory = (bmi) => {
        if (!bmi) return '';
        const numBMI = parseFloat(bmi);
        if (numBMI < 18.5) return 'Underweight';
        if (numBMI < 25) return 'Normal weight';
        if (numBMI < 30) return 'Overweight';
        return 'Obese';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSave = {
                ...formData,
                bmi: calculateBMI()
            };
            await onSave(dataToSave);
        } catch (error) {
            console.error('Error saving vital signs:', error);
        } finally {
            setLoading(false);
        }
    };

    const bmi = calculateBMI();
    const bmiCategory = getBMICategory(bmi);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Vital Signs</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Height */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Height (cm)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        value={formData.height}
                        onChange={(e) => updateField('height', e.target.value)}
                        placeholder="170.5"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                </div>

                {/* Weight */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Weight (kg)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onChange={(e) => updateField('weight', e.target.value)}
                        placeholder="70.5"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                </div>

                {/* BMI (calculated) */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        BMI (calculated)
                    </label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={bmi}
                            readOnly
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                        />
                        {bmiCategory && (
                            <span className={`text-xs px-2 py-1 rounded ${
                                bmiCategory === 'Normal weight' ? 'bg-green-100 text-green-800' :
                                bmiCategory === 'Underweight' ? 'bg-yellow-100 text-yellow-800' :
                                bmiCategory === 'Overweight' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                                {bmiCategory}
                            </span>
                        )}
                    </div>
                </div>

                {/* Blood Pressure */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Blood Pressure (mmHg)
                    </label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="number"
                            value={formData.bloodPressure.systolic}
                            onChange={(e) => updateField('bloodPressure.systolic', e.target.value)}
                            placeholder="120"
                            className="w-20 border border-gray-300 rounded-md px-2 py-2 text-center"
                        />
                        <span className="text-gray-500">/</span>
                        <input
                            type="number"
                            value={formData.bloodPressure.diastolic}
                            onChange={(e) => updateField('bloodPressure.diastolic', e.target.value)}
                            placeholder="80"
                            className="w-20 border border-gray-300 rounded-md px-2 py-2 text-center"
                        />
                    </div>
                </div>

                {/* Heart Rate */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Heart Rate (bpm)
                    </label>
                    <input
                        type="number"
                        value={formData.heartRate}
                        onChange={(e) => updateField('heartRate', e.target.value)}
                        placeholder="72"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Temperature (°C)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        value={formData.temperature}
                        onChange={(e) => updateField('temperature', e.target.value)}
                        placeholder="36.5"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                </div>

                {/* Oxygen Saturation */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Oxygen Saturation (%)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.oxygenSaturation}
                        onChange={(e) => updateField('oxygenSaturation', e.target.value)}
                        placeholder="98"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                </div>

                {/* Respiratory Rate */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Respiratory Rate (breaths/min)
                    </label>
                    <input
                        type="number"
                        value={formData.respiratoryRate}
                        onChange={(e) => updateField('respiratoryRate', e.target.value)}
                        placeholder="16"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                </div>

                {/* Last Measured */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Last Measured
                    </label>
                    <input
                        type="date"
                        value={formData.lastMeasured ? formData.lastMeasured.split('T')[0] : ''}
                        onChange={(e) => updateField('lastMeasured', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Measured By
                    </label>
                    <input
                        type="text"
                        value={formData.measuredBy}
                        onChange={(e) => updateField('measuredBy', e.target.value)}
                        placeholder="Doctor, nurse, or self-measured"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => updateField('notes', e.target.value)}
                        rows={2}
                        placeholder="Additional notes about vital signs measurements..."
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                </div>
            </div>

            {/* Vital Signs Reference */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">Normal Ranges Reference</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p><strong>Blood Pressure:</strong> 120/80 mmHg (Normal)</p>
                        <p><strong>Heart Rate:</strong> 60-100 bpm (Resting)</p>
                        <p><strong>Temperature:</strong> 36.5-37.5°C (Oral)</p>
                    </div>
                    <div>
                        <p><strong>Oxygen Saturation:</strong> {`>`} 95% (Normal)</p>
                        <p><strong>Respiratory Rate:</strong> 12-20 breaths/min (Adult)</p>
                        <p><strong>BMI:</strong> 18.5-24.9 (Normal weight)</p>
                    </div>
                </div>
            </div>

            <div className="flex space-x-3 pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                    {loading ? 'Saving...' : 'Save Vital Signs'}
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

export default VitalSignsForm;
