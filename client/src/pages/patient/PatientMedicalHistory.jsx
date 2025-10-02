import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { medicalHistoryAPI } from '../../services/api';
import { Heart, AlertTriangle, Pill, Stethoscope, Users, Cigarette, Wine, Activity, User, Phone } from 'lucide-react';
import ChronicConditionsForm from '../../components/medical-history/ChronicConditionsForm';
import AllergiesForm from '../../components/medical-history/AllergiesForm';
import CurrentMedicationsForm from '../../components/medical-history/CurrentMedicationsForm';
import PastSurgeriesForm from '../../components/medical-history/PastSurgeriesForm';
import FamilyHistoryForm from '../../components/medical-history/FamilyHistoryForm';
import VitalSignsForm from '../../components/medical-history/VitalSignsForm';
import EmergencyContactsForm from '../../components/medical-history/EmergencyContactsForm';
import SocialHistoryForm from '../../components/medical-history/SocialHistoryForm';

const PatientMedicalHistory = () => {
    const { user } = useSelector(state => state.auth);
    const [medicalHistory, setMedicalHistory] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState('overview');
    const [editingSection, setEditingSection] = useState(null);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        loadMedicalHistory();
    }, []);

    const loadMedicalHistory = async () => {
        try {
            setLoading(true);
            const response = await medicalHistoryAPI.getMyMedicalHistory();
            setMedicalHistory(response.data);
        } catch (error) {
            console.error('Error loading medical history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSectionUpdate = async (section, data) => {
        try {
            setLoading(true);
            const updateData = { patientId: user._id, [section]: data };
            await medicalHistoryAPI.updateMyMedicalHistory(updateData);
            await loadMedicalHistory();
            setEditingSection(null);
        } catch (error) {
            console.error('Error updating medical history:', error);
            alert('Failed to update medical history');
        } finally {
            setLoading(false);
        }
    };

    const startEditing = (section, currentData = {}) => {
        setEditingSection(section);
        setFormData(currentData);
    };

    const cancelEditing = () => {
        setEditingSection(null);
        setFormData({});
    };

    const sections = [
        { id: 'overview', label: 'Overview', icon: Heart },
        { id: 'chronicConditions', label: 'Chronic Conditions', icon: Heart },
        { id: 'allergies', label: 'Allergies', icon: AlertTriangle },
        { id: 'currentMedications', label: 'Current Medications', icon: Pill },
        { id: 'pastSurgeries', label: 'Past Surgeries', icon: Stethoscope },
        { id: 'familyHistory', label: 'Family History', icon: Users },
        { id: 'socialHistory', label: 'Social History', icon: Cigarette },
        { id: 'vitalSigns', label: 'Vital Signs', icon: Activity },
        { id: 'emergencyContacts', label: 'Emergency Contacts', icon: Phone }
    ];

    if (loading && !medicalHistory) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading medical history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Heart className="mr-3 text-red-600" />
                    My Medical History
                </h1>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    {sections.map(section => {
                        const Icon = section.icon;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                                    activeSection === section.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{section.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-lg shadow-sm border">
                {activeSection === 'overview' && (
                    <MedicalHistoryOverview
                        medicalHistory={medicalHistory}
                    />
                )}

                {activeSection === 'chronicConditions' && (
                    <ChronicConditionsSection
                        conditions={medicalHistory?.chronicConditions || []}
                        isEditing={editingSection === 'chronicConditions'}
                        formData={formData}
                        onEdit={() => startEditing('chronicConditions', medicalHistory?.chronicConditions || [])}
                        onSave={(data) => handleSectionUpdate('chronicConditions', data)}
                        onCancel={cancelEditing}
                    />
                )}

                {activeSection === 'allergies' && (
                    <AllergiesSection
                        allergies={medicalHistory?.allergies || []}
                        isEditing={editingSection === 'allergies'}
                        formData={formData}
                        onEdit={() => startEditing('allergies', medicalHistory?.allergies || [])}
                        onSave={(data) => handleSectionUpdate('allergies', data)}
                        onCancel={cancelEditing}
                    />
                )}

                {activeSection === 'currentMedications' && (
                    <CurrentMedicationsSection
                        medications={medicalHistory?.currentMedications || []}
                        isEditing={editingSection === 'currentMedications'}
                        formData={formData}
                        onEdit={() => startEditing('currentMedications', medicalHistory?.currentMedications || [])}
                        onSave={(data) => handleSectionUpdate('currentMedications', data)}
                        onCancel={cancelEditing}
                    />
                )}

                {activeSection === 'pastSurgeries' && (
                    <PastSurgeriesSection
                        surgeries={medicalHistory?.pastSurgeries || []}
                        isEditing={editingSection === 'pastSurgeries'}
                        formData={formData}
                        onEdit={() => startEditing('pastSurgeries', medicalHistory?.pastSurgeries || [])}
                        onSave={(data) => handleSectionUpdate('pastSurgeries', data)}
                        onCancel={cancelEditing}
                    />
                )}

                {activeSection === 'familyHistory' && (
                    <FamilyHistorySection
                        familyHistory={medicalHistory?.familyHistory || []}
                        isEditing={editingSection === 'familyHistory'}
                        formData={formData}
                        onEdit={() => startEditing('familyHistory', medicalHistory?.familyHistory || [])}
                        onSave={(data) => handleSectionUpdate('familyHistory', data)}
                        onCancel={cancelEditing}
                    />
                )}

                {activeSection === 'socialHistory' && (
                    <SocialHistorySection
                        socialHistory={medicalHistory?.socialHistory || {}}
                        isEditing={editingSection === 'socialHistory'}
                        formData={formData}
                        onEdit={() => startEditing('socialHistory', medicalHistory?.socialHistory || {})}
                        onSave={(data) => handleSectionUpdate('socialHistory', data)}
                        onCancel={cancelEditing}
                    />
                )}

                {activeSection === 'vitalSigns' && (
                    <VitalSignsSection
                        vitalSigns={medicalHistory?.vitalSigns || {}}
                        isEditing={editingSection === 'vitalSigns'}
                        formData={formData}
                        onEdit={() => startEditing('vitalSigns', medicalHistory?.vitalSigns || {})}
                        onSave={(data) => handleSectionUpdate('vitalSigns', data)}
                        onCancel={cancelEditing}
                    />
                )}

                {activeSection === 'emergencyContacts' && (
                    <EmergencyContactsSection
                        contacts={medicalHistory?.emergencyContacts || []}
                        isEditing={editingSection === 'emergencyContacts'}
                        formData={formData}
                        onEdit={() => startEditing('emergencyContacts', medicalHistory?.emergencyContacts || [])}
                        onSave={(data) => handleSectionUpdate('emergencyContacts', data)}
                        onCancel={cancelEditing}
                    />
                )}
            </div>
        </div>
    );
};

// Overview Component
const MedicalHistoryOverview = ({ medicalHistory }) => (
    <div className="p-6">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Medical History Overview</h2>
            <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-md">
                Click on any section below to update your information
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                    <Heart className="w-8 h-8 text-red-600 mr-3" />
                    <div>
                        <h3 className="font-medium text-gray-900">Chronic Conditions</h3>
                        <p className="text-sm text-gray-600">
                            {medicalHistory?.chronicConditions?.length || 0} conditions
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center">
                    <AlertTriangle className="w-8 h-8 text-yellow-600 mr-3" />
                    <div>
                        <h3 className="font-medium text-gray-900">Allergies</h3>
                        <p className="text-sm text-gray-600">
                            {medicalHistory?.allergies?.length || 0} allergies
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                    <Pill className="w-8 h-8 text-blue-600 mr-3" />
                    <div>
                        <h3 className="font-medium text-gray-900">Current Medications</h3>
                        <p className="text-sm text-gray-600">
                            {medicalHistory?.currentMedications?.length || 0} medications
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                    <Stethoscope className="w-8 h-8 text-green-600 mr-3" />
                    <div>
                        <h3 className="font-medium text-gray-900">Past Surgeries</h3>
                        <p className="text-sm text-gray-600">
                            {medicalHistory?.pastSurgeries?.length || 0} surgeries
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                    <Users className="w-8 h-8 text-purple-600 mr-3" />
                    <div>
                        <h3 className="font-medium text-gray-900">Family History</h3>
                        <p className="text-sm text-gray-600">
                            {medicalHistory?.familyHistory?.length || 0} conditions
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                    <Phone className="w-8 h-8 text-orange-600 mr-3" />
                    <div>
                        <h3 className="font-medium text-gray-900">Emergency Contacts</h3>
                        <p className="text-sm text-gray-600">
                            {medicalHistory?.emergencyContacts?.length || 0} contacts
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {medicalHistory?.lastUpdated && (
            <div className="mt-6 text-sm text-gray-500">
                Last updated: {new Date(medicalHistory.lastUpdated).toLocaleDateString()}
            </div>
        )}
    </div>
);

// Chronic Conditions Section
const ChronicConditionsSection = ({ conditions, isEditing, formData, onEdit, onSave, onCancel }) => {
    if (isEditing) {
        return (
            <div className="p-6">
                <ChronicConditionsForm
                    conditions={formData}
                    onSave={onSave}
                    onCancel={onCancel}
                />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Chronic Conditions</h2>
                <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Edit
                </button>
            </div>

            {conditions.length > 0 ? (
                <div className="space-y-4">
                    {conditions.map((condition, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <h3 className="font-medium text-gray-900">{condition.condition}</h3>
                            <p className="text-sm text-gray-600">Status: {condition.status}</p>
                            {condition.diagnosisDate && (
                                <p className="text-sm text-gray-600">
                                    Diagnosed: {new Date(condition.diagnosisDate).toLocaleDateString()}
                                </p>
                            )}
                            {condition.notes && (
                                <p className="text-sm text-gray-600">Notes: {condition.notes}</p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-600">No chronic conditions recorded</p>
            )}
        </div>
    );
};

// Allergies Section
const AllergiesSection = ({ allergies, isEditing, formData, onEdit, onSave, onCancel }) => {
    if (isEditing) {
        return (
            <div className="p-6">
                <AllergiesForm
                    allergies={formData}
                    onSave={onSave}
                    onCancel={onCancel}
                />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Allergies</h2>
                <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Edit
                </button>
            </div>

            {allergies.length > 0 ? (
                <div className="space-y-4">
                    {allergies.map((allergy, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">{allergy.allergen}</h3>
                                    <p className="text-sm text-gray-600">Reaction: {allergy.reaction}</p>
                                    <p className="text-sm text-gray-600">Severity: {allergy.severity}</p>
                                    <p className="text-sm text-gray-600">Status: {allergy.status}</p>
                                </div>
                                <AlertTriangle className={`w-6 h-6 ${
                                    allergy.severity === 'severe' || allergy.severity === 'life-threatening'
                                        ? 'text-red-600'
                                        : allergy.severity === 'moderate'
                                        ? 'text-yellow-600'
                                        : 'text-green-600'
                                }`} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-600">No allergies recorded</p>
            )}
        </div>
    );
};

// Current Medications Section
const CurrentMedicationsSection = ({ medications, isEditing, formData, onEdit, onSave, onCancel }) => {
    if (isEditing) {
        return (
            <div className="p-6">
                <CurrentMedicationsForm
                    medications={formData}
                    onSave={onSave}
                    onCancel={onCancel}
                />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Current Medications</h2>
                <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Edit
                </button>
            </div>

            {medications.length > 0 ? (
                <div className="space-y-4">
                    {medications.map((medication, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">{medication.medication}</h3>
                                    <p className="text-sm text-gray-600">Dosage: {medication.dosage}</p>
                                    <p className="text-sm text-gray-600">Frequency: {medication.frequency}</p>
                                    <p className="text-sm text-gray-600">Status: {medication.status}</p>
                                    {medication.prescribedBy && (
                                        <p className="text-sm text-gray-600">Prescribed by: {medication.prescribedBy}</p>
                                    )}
                                </div>
                                <Pill className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-600">No current medications recorded</p>
            )}
        </div>
    );
};

// Past Surgeries Section
const PastSurgeriesSection = ({ surgeries, isEditing, formData, onEdit, onSave, onCancel }) => {
    if (isEditing) {
        return (
            <div className="p-6">
                <PastSurgeriesForm
                    surgeries={formData}
                    onSave={onSave}
                    onCancel={onCancel}
                />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Past Surgeries</h2>
                <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Edit
                </button>
            </div>

            {surgeries.length > 0 ? (
                <div className="space-y-4">
                    {surgeries.map((surgery, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">{surgery.procedure}</h3>
                                    <p className="text-sm text-gray-600">
                                        Date: {new Date(surgery.date).toLocaleDateString()}
                                    </p>
                                    {surgery.surgeon && (
                                        <p className="text-sm text-gray-600">Surgeon: {surgery.surgeon}</p>
                                    )}
                                    {surgery.hospital && (
                                        <p className="text-sm text-gray-600">Hospital: {surgery.hospital}</p>
                                    )}
                                    {surgery.outcome && (
                                        <p className="text-sm text-gray-600">Outcome: {surgery.outcome}</p>
                                    )}
                                    {surgery.notes && (
                                        <p className="text-sm text-gray-600">Notes: {surgery.notes}</p>
                                    )}
                                </div>
                                <Stethoscope className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-600">No past surgeries recorded</p>
            )}
        </div>
    );
};

// Family History Section
const FamilyHistorySection = ({ familyHistory, isEditing, formData, onEdit, onSave, onCancel }) => {
    if (isEditing) {
        return (
            <div className="p-6">
                <FamilyHistoryForm
                    familyHistory={formData}
                    onSave={onSave}
                    onCancel={onCancel}
                />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Family History</h2>
                <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Edit
                </button>
            </div>

            {familyHistory.length > 0 ? (
                <div className="space-y-4">
                    {familyHistory.map((history, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">
                                        {history.relation}: {history.condition}
                                    </h3>
                                    <p className="text-sm text-gray-600">Status: {history.status}</p>
                                    {history.ageAtDiagnosis && (
                                        <p className="text-sm text-gray-600">Age at diagnosis: {history.ageAtDiagnosis}</p>
                                    )}
                                    {history.notes && (
                                        <p className="text-sm text-gray-600">Notes: {history.notes}</p>
                                    )}
                                </div>
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-600">No family history recorded</p>
            )}
        </div>
    );
};

// Social History Section
const SocialHistorySection = ({ socialHistory, isEditing, formData, onEdit, onSave, onCancel }) => {
    if (isEditing) {
        return (
            <div className="p-6">
                <SocialHistoryForm
                    socialHistory={formData}
                    onSave={onSave}
                    onCancel={onCancel}
                />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Social History</h2>
                <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Edit
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <Cigarette className="w-5 h-5 text-gray-600" />
                        <div>
                            <h3 className="font-medium text-gray-900">Smoking</h3>
                            <p className="text-sm text-gray-600">
                                Status: {socialHistory?.smoking?.status || 'Not recorded'}
                            </p>
                            {socialHistory?.smoking?.packsPerDay && (
                                <p className="text-sm text-gray-600">
                                    {socialHistory.smoking.packsPerDay} packs per day
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Wine className="w-5 h-5 text-gray-600" />
                        <div>
                            <h3 className="font-medium text-gray-900">Alcohol</h3>
                            <p className="text-sm text-gray-600">
                                Status: {socialHistory?.alcohol?.status || 'Not recorded'}
                            </p>
                            {socialHistory?.alcohol?.drinksPerWeek && (
                                <p className="text-sm text-gray-600">
                                    {socialHistory.alcohol.drinksPerWeek} drinks per week
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <h3 className="font-medium text-gray-900">Occupation</h3>
                        <p className="text-sm text-gray-600">
                            {socialHistory?.occupation || 'Not recorded'}
                        </p>
                    </div>

                    <div>
                        <h3 className="font-medium text-gray-900">Exercise</h3>
                        <p className="text-sm text-gray-600">
                            {socialHistory?.exercise || 'Not recorded'}
                        </p>
                    </div>

                    <div>
                        <h3 className="font-medium text-gray-900">Diet</h3>
                        <p className="text-sm text-gray-600">
                            {socialHistory?.diet || 'Not recorded'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Vital Signs Section
const VitalSignsSection = ({ vitalSigns, isEditing, formData, onEdit, onSave, onCancel }) => {
    if (isEditing) {
        return (
            <div className="p-6">
                <VitalSignsForm
                    vitalSigns={formData}
                    onSave={onSave}
                    onCancel={onCancel}
                />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Vital Signs</h2>
                <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Edit
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900">Height</h3>
                    <p className="text-2xl font-bold text-blue-600">
                        {vitalSigns?.height ? `${vitalSigns.height} cm` : 'Not recorded'}
                    </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900">Weight</h3>
                    <p className="text-2xl font-bold text-green-600">
                        {vitalSigns?.weight ? `${vitalSigns.weight} kg` : 'Not recorded'}
                    </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900">BMI</h3>
                    <p className="text-2xl font-bold text-purple-600">
                        {vitalSigns?.bmi ? vitalSigns.bmi : 'Not calculated'}
                    </p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900">Blood Pressure</h3>
                    <p className="text-2xl font-bold text-red-600">
                        {vitalSigns?.bloodPressure ?
                            `${vitalSigns.bloodPressure.systolic}/${vitalSigns.bloodPressure.diastolic}` :
                            'Not recorded'
                        }
                    </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900">Heart Rate</h3>
                    <p className="text-2xl font-bold text-yellow-600">
                        {vitalSigns?.heartRate ? `${vitalSigns.heartRate} bpm` : 'Not recorded'}
                    </p>
                </div>

                <div className="bg-indigo-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900">Temperature</h3>
                    <p className="text-2xl font-bold text-indigo-600">
                        {vitalSigns?.temperature ? `${vitalSigns.temperature}°C` : 'Not recorded'}
                    </p>
                </div>
            </div>
        </div>
    );
};

// Emergency Contacts Section
const EmergencyContactsSection = ({ contacts, isEditing, formData, onEdit, onSave, onCancel }) => {
    if (isEditing) {
        return (
            <div className="p-6">
                <EmergencyContactsForm
                    contacts={formData}
                    onSave={onSave}
                    onCancel={onCancel}
                />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Emergency Contacts</h2>
                <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Edit
                </button>
            </div>

            {contacts.length > 0 ? (
                <div className="space-y-4">
                    {contacts.map((contact, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">{contact.name}</h3>
                                    <p className="text-sm text-gray-600">Relationship: {contact.relationship}</p>
                                    <p className="text-sm text-gray-600">Phone: {contact.phoneNumber}</p>
                                    {contact.address && (
                                        <p className="text-sm text-gray-600">Address: {contact.address}</p>
                                    )}
                                </div>
                                <Phone className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-600">No emergency contacts recorded</p>
            )}
        </div>
    );
};

export default PatientMedicalHistory;
