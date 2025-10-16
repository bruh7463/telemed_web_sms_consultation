import { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { FiSend, FiX } from 'react-icons/fi';
import { medicalHistoryAPI } from '../services/api.js';

const ChatWindow = ({ consultation, onUpdate }) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showMedicalHistory, setShowMedicalHistory] = useState(false);
    const [medicalHistory, setMedicalHistory] = useState(null);
    const [loadingMedicalHistory, setLoadingMedicalHistory] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [consultation?.messages]);

    const loadMedicalHistory = async () => {
        if (!consultation?.patient?._id) return;

        setLoadingMedicalHistory(true);
        try {
            const response = await medicalHistoryAPI.getPatientMedicalHistory(consultation.patient._id);
            setMedicalHistory(response.data);
        } catch (error) {
            console.error('Error loading medical history:', error);
            alert('Failed to load medical history');
        } finally {
            setLoadingMedicalHistory(false);
        }
    };

    useEffect(() => {
        if (showMedicalHistory) {
            loadMedicalHistory();
        }
    }, [showMedicalHistory]);

    const calculateAge = (dateOfBirth) => {
        if (!dateOfBirth) return null;
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        setIsSending(true);
        try {
            await api.post(`/consultations/${consultation._id}/messages`, { content: message });
            setMessage('');
            onUpdate(); // Refresh consultations
        } catch (error) {
            console.error("Failed to send message", error);
            alert("Error sending message.");
        } finally {
            setIsSending(false);
        }
    };
    
    const handleComplete = async () => {
        if(window.confirm("Are you sure you want to complete this consultation?")){
             try {
                await api.patch(`/consultations/${consultation._id}/complete`);
                onUpdate();
            } catch {
                alert("Error completing consultation.")
            }
        }
    }

    if (!consultation) {
        return <div className="hidden md:flex w-2/3 items-center justify-center bg-gray-100"><p className="text-gray-500">Select a consultation to view details.</p></div>;
    }

    return (
        <div className="w-full md:w-2/3 flex flex-col bg-gray-50">
            <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm">
                <div>
                        <h3 className="font-bold text-lg text-gray-800">{consultation.patient.name}</h3>
                     <p className="text-sm text-gray-500">{consultation.patient.phoneNumber} | NRC: {consultation.patient.nrc}</p>
                 </div>
                 <div className="flex items-center space-x-2">
                     <button
                         onClick={() => setShowMedicalHistory(true)}
                         className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded hover:bg-blue-200 transition-colors"
                     >
                         Medical History
                     </button>
                </div>
                {consultation.status !== 'COMPLETED' && (
                     <button onClick={handleComplete} className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-md hover:bg-green-600 transition-colors">Mark as Complete</button>
                )}
            </div>
            <div className="flex-grow p-4 overflow-y-auto">
                {consultation.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === 'DOCTOR' ? 'justify-end' : 'justify-start'} mb-4`}>
                        <div className={`max-w-lg p-3 rounded-lg shadow-sm ${msg.sender === 'DOCTOR' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
                            <p>{msg.content}</p>
                            <span className={`text-xs block text-right mt-1 ${msg.sender === 'DOCTOR' ? 'text-blue-100' : 'text-gray-400'}`}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            {consultation.status !== 'COMPLETED' ? (
                <div className="p-4 bg-white border-t">
                    <form onSubmit={handleSend} className="flex items-center space-x-2">
                        <input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="Type a message..."
                            className="flex-grow px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isSending} />
                        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300" disabled={isSending}>
                            <FiSend />
                        </button>
                    </form>
                </div>
            ) : (
                 <div className="p-4 bg-gray-200 text-center font-semibold text-gray-600">
                    This consultation has been completed.
                </div>
            )}

            {/* Medical History Modal */}
            {showMedicalHistory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Medical History</h2>
                                    <div className="flex items-center space-x-4 mt-2">
                                        <p className="text-lg font-medium text-gray-800">{consultation.patient.name}</p>
                                        {medicalHistory?.personalInfo?.dateOfBirth && (
                                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                                Age: {calculateAge(medicalHistory.personalInfo.dateOfBirth)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center mt-2 space-x-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                            consultation.communicationMethod === 'SMS'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-purple-100 text-purple-800'
                                        }`}>
                                            {consultation.communicationMethod === 'SMS' ? '📱 SMS Patient' : '🌐 Web Patient'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowMedicalHistory(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <FiX size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {loadingMedicalHistory ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                    <p className="ml-4 text-gray-600">Loading medical history...</p>
                                </div>
                            ) : medicalHistory ? (
                                <MedicalHistoryOverview medicalHistory={medicalHistory} />
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-500">No medical history found for this patient.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Medical History Overview Component
const MedicalHistoryOverview = ({ medicalHistory }) => (
    <div className="space-y-8">
        {/* Personal Information */}
        {medicalHistory.personalInfo && (
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    👤 Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <p className="text-base">{medicalHistory.personalInfo.fullName || 'Not provided'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                        <p className="text-base">
                            {medicalHistory.personalInfo.dateOfBirth
                                ? new Date(medicalHistory.personalInfo.dateOfBirth).toLocaleDateString()
                                : 'Not provided'
                            }
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                        <p className="text-base capitalize">{medicalHistory.personalInfo.gender || 'Not provided'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <p className="text-base">{medicalHistory.personalInfo.phoneNumber || 'Not provided'}</p>
                    </div>
                </div>
            </div>
        )}

        {/* Allergies */}
        {medicalHistory.allergies && medicalHistory.allergies.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    🚫 Allergies
                </h3>
                <div className="space-y-3">
                    {medicalHistory.allergies.map((allergy, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">{allergy.allergen}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    allergy.severity === 'severe' ? 'bg-red-100 text-red-800' :
                                    allergy.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {allergy.severity}
                                </span>
                            </div>
                            {allergy.reaction && (
                                <p className="text-sm text-gray-600 mt-1">Reaction: {allergy.reaction}</p>
                            )}
                            {allergy.notes && (
                                <p className="text-sm text-gray-600 mt-1">{allergy.notes}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Chronic Conditions */}
        {medicalHistory.chronicConditions && medicalHistory.chronicConditions.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    🏥 Chronic Conditions
                </h3>
                <div className="space-y-3">
                    {medicalHistory.chronicConditions.map((condition, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">{condition.condition}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    condition.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                }`}>
                                    {condition.status}
                                </span>
                            </div>
                            {condition.diagnosedDate && (
                                <p className="text-sm text-gray-600 mt-1">
                                    Diagnosed: {new Date(condition.diagnosedDate).toLocaleDateString()}
                                </p>
                            )}
                            {condition.notes && (
                                <p className="text-sm text-gray-600 mt-1">{condition.notes}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Current Medications */}
        {medicalHistory.currentMedications && medicalHistory.currentMedications.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    💊 Current Medications
                </h3>
                <div className="space-y-3">
                    {medicalHistory.currentMedications.map((medication, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">{medication.name}</h4>
                                <span className="text-sm text-gray-600">{medication.dosage}</span>
                            </div>
                            {medication.frequency && (
                                <p className="text-sm text-gray-600 mt-1">Frequency: {medication.frequency}</p>
                            )}
                            {medication.purpose && (
                                <p className="text-sm text-gray-600 mt-1">Purpose: {medication.purpose}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Past Surgeries */}
        {medicalHistory.pastSurgeries && medicalHistory.pastSurgeries.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    🏥 Past Surgeries
                </h3>
                <div className="space-y-3">
                    {medicalHistory.pastSurgeries.map((surgery, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <h4 className="font-medium text-gray-900">{surgery.procedure}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                                Date: {new Date(surgery.date).toLocaleDateString()}
                            </p>
                            {surgery.outcome && (
                                <p className="text-sm text-gray-600 mt-1">Outcome: {surgery.outcome}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Social History */}
        {medicalHistory.socialHistory && (
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    🌟 Social History
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(medicalHistory.socialHistory).map(([key, value]) => (
                        <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 capitalize">
                                {key.replace(/([A-Z])/g, ' $1')}
                            </label>
                            <p className="text-base">{value || 'Not provided'}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Family History */}
        {medicalHistory.familyHistory && medicalHistory.familyHistory.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    👨‍👩‍👧‍👦 Family History
                </h3>
                <div className="space-y-3">
                    {medicalHistory.familyHistory.map((member, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <h4 className="font-medium text-gray-900">
                                {member.relationship}: {member.name}
                            </h4>
                            {member.medicalHistory && (
                                <p className="text-sm text-gray-600 mt-1">{member.medicalHistory}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Emergency Contacts */}
        {medicalHistory.emergencyContacts && medicalHistory.emergencyContacts.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    🚑 Emergency Contacts
                </h3>
                <div className="space-y-3">
                    {medicalHistory.emergencyContacts.map((contact, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">{contact.name}</h4>
                                <span className="text-sm text-gray-600">{contact.relationship}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">Phone: {contact.phoneNumber}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);

export default ChatWindow;
