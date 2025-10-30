import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { consultationAPI, medicalHistoryAPI, setAuthToken } from '../../services/api';
import { Send, MessageCircle } from 'lucide-react';

const DoctorChat = ({ selectedConsultation: propSelectedConsultation }) => {
    const { consultations } = useSelector(state => state.consult);
    const [selectedConsultation, setSelectedConsultation] = useState(propSelectedConsultation || null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showMedicalHistory, setShowMedicalHistory] = useState(false);
    const [medicalHistory, setMedicalHistory] = useState(null);
    const [loadingMedicalHistory, setLoadingMedicalHistory] = useState(false);
    const messagesEndRef = useRef(null);

    // Ensure data is in array format
    const consultationsArray = Array.isArray(consultations) ? consultations : [];
    const activeConsultations = consultationsArray.filter(c => c.status === 'ACTIVE');

    const loadMessages = useCallback(async () => {
        if (!selectedConsultation) return;

        try {
            const consultationId = selectedConsultation._id || selectedConsultation.id;
            const response = await consultationAPI.getConsultationMessages(consultationId);

            // Transform messages to match our expected format
            const formattedMessages = (response.data.messages || []).map(message => ({
                id: message._id || message.id,
                content: message.content,
                sender: message.sender, // 'PATIENT' or 'DOCTOR'
                timestamp: message.timestamp || message.createdAt,
            }));

            // Only update if messages have actually changed to avoid unnecessary re-renders
            setMessages(prevMessages => {
                if (JSON.stringify(prevMessages) !== JSON.stringify(formattedMessages)) {
                    return formattedMessages;
                }
                return prevMessages;
            });
        } catch (err) {
            // Silent error handling - don't show errors during background polling
            console.debug('Background message polling failed:', err.message);
        }
    }, [selectedConsultation]);

    useEffect(() => {
        if (selectedConsultation) {
            loadMessages();
            // Start polling for new messages
            const pollInterval = setInterval(loadMessages, 3000); // Poll every 3 seconds

            return () => clearInterval(pollInterval); // Cleanup on unmount
        }
    }, [selectedConsultation, loadMessages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConsultation) return;

        try {
            setLoading(true);
            await consultationAPI.sendDoctorMessage(selectedConsultation._id || selectedConsultation.id, newMessage.trim());

            // Add message to local state
            const message = {
                id: Date.now(),
                content: newMessage.trim(),
                sender: 'DOCTOR',
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, message]);
            setNewMessage('');
        } catch (err) {
            console.error('Error sending message:', err);
            alert('Failed to send message');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const loadMedicalHistory = async () => {
        if (!selectedConsultation?.patient?._id) return;

        setLoadingMedicalHistory(true);
        setMedicalHistory(null); // Clear previous data
        try {
            console.log('Loading medical history for patient:', selectedConsultation.patient._id);
            const response = await medicalHistoryAPI.getPatientMedicalHistory(selectedConsultation.patient._id);
            console.log('Medical history response:', response.data);
            console.log('Patient DOB from medical history:', response.data?.patient?.dateOfBirth);
            setMedicalHistory(response.data);
        } catch (error) {
            console.error('Error loading medical history:', error);
            alert('Failed to load medical history');
        } finally {
            setLoadingMedicalHistory(false);
        }
    };

    useEffect(() => {
        if (showMedicalHistory && selectedConsultation) {
            loadMedicalHistory();
        }
    }, [showMedicalHistory, selectedConsultation]);

    const calculateAge = (dateOfBirth) => {
        if (!dateOfBirth) return 'Not available';
        try {
            const today = new Date();
            const birthDate = new Date(dateOfBirth);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age >= 0 ? age.toString() : 'Not available';
        } catch (error) {
            console.warn('Error calculating age:', error);
            return 'Not available';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Live Chat</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Consultations */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold">Active Consultations</h2>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {activeConsultations.length > 0 ? (
                            activeConsultations.map(consultation => (
                                <div
                                    key={consultation._id || consultation.id}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                                        (selectedConsultation?._id || selectedConsultation?.id) === (consultation._id || consultation.id) ? 'bg-green-50' : ''
                                    }`}
                                    onClick={() => setSelectedConsultation(consultation)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-medium text-gray-900">
                                                {consultation.patient?.name || 'Unknown Patient'}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                Started {consultation.scheduledStart ? new Date(consultation.scheduledStart).toLocaleDateString() : 'Date not set'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSelectedConsultation(consultation);
                                                setShowMedicalHistory(true);
                                            }}
                                            className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
                                            type="button"
                                            title="View Medical History"
                                        >
                                            Med
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                No active consultations
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Interface */}
                <div className="lg:col-span-2">
                    {selectedConsultation ? (
                        <div className="bg-white rounded-lg shadow-sm border h-96 flex flex-col">
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center space-x-3">
                                    <MessageCircle className="w-5 h-5 text-green-500" />
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            Chat with {selectedConsultation.patient?.name || 'Unknown Patient'}
                                        </h2>
                                        <p className="text-sm text-gray-500">Active consultation</p>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.length > 0 ? (
                                    messages.map(message => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.sender === 'DOCTOR' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                                    message.sender === 'DOCTOR'
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-gray-200 text-gray-900'
                                                }`}
                                            >
                                                <p className="text-sm">{message.content}</p>
                                                <p className={`text-xs mt-1 ${
                                                    message.sender === 'DOCTOR' ? 'text-green-100' : 'text-gray-500'
                                                }`}>
                                                    {formatTime(message.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500 mt-8">
                                        <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>Start your conversation with {selectedConsultation.patient?.name || 'Unknown Patient'}</p>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="border-t border-gray-200 p-4">
                                <form onSubmit={handleSendMessage} className="flex space-x-3">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type your message..."
                                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        disabled={loading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading || !newMessage.trim()}
                                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm border h-96 flex items-center justify-center">
                            <div className="text-center text-gray-500">
                                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-medium mb-2">Select a Consultation</h3>
                                <p>Choose an active consultation to start chatting with your patient</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Medical History Modal */}
            {showMedicalHistory && selectedConsultation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border">
                        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Medical History</h2>
                                   <div className="flex items-center space-x-4 mt-2">
                                        <p className="text-lg font-medium text-gray-800">{selectedConsultation.patient?.name}</p>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                            Age: {medicalHistory?.patient?.dateOfBirth ? calculateAge(medicalHistory.patient.dateOfBirth) : 'Not set'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowMedicalHistory(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {loadingMedicalHistory ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                    <p className="ml-4 text-gray-600">Loading medical history...</p>
                                </div>
                            ) : (
                                medicalHistory && typeof medicalHistory === 'object' && Object.keys(medicalHistory).length > 0 ? (
                                    <MedicalHistoryOverview medicalHistory={medicalHistory} />
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500">No medical history found for this patient.</p>
                                    </div>
                                )
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
        {medicalHistory.patient && (
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <p className="text-base">{medicalHistory.patient.name || 'Not provided'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                        <p className="text-base">
                            {medicalHistory.patient.dateOfBirth
                                ? new Date(medicalHistory.patient.dateOfBirth).toLocaleDateString()
                                : 'Not provided'
                            }
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                        <p className="text-base capitalize">{medicalHistory.patient.gender || 'Not provided'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <p className="text-base">{medicalHistory.patient.phoneNumber || 'Not provided'}</p>
                    </div>
                </div>
            </div>
        )}

        {/* Allergies */}
        {medicalHistory.allergies && medicalHistory.allergies.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    Allergies
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
                    Chronic Conditions
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
                    Current Medications
                </h3>
                <div className="space-y-3">
                    {medicalHistory.currentMedications.map((medication, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <h4 className="font-medium text-gray-900">{medication.medication || medication.name || 'Unnamed Medication'}</h4>
                            {medication.dosage && (
                                <p className="text-sm text-gray-600 mt-1">Dosage: {medication.dosage}</p>
                            )}
                            {medication.frequency && (
                                <p className="text-sm text-gray-600 mt-1">Frequency: {medication.frequency}</p>
                            )}
                            {medication.reason && (
                                <p className="text-sm text-gray-600 mt-1">Reason: {medication.reason}</p>
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
                    Social History
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Smoking */}
                    {medicalHistory.socialHistory.smoking && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Smoking Status</label>
                            <p className="text-base capitalize">{medicalHistory.socialHistory.smoking.status || 'Not reported'}</p>
                            {medicalHistory.socialHistory.smoking.packsPerDay && (
                                <p className="text-sm text-gray-600 mt-1">{medicalHistory.socialHistory.smoking.packsPerDay} packs per day</p>
                            )}
                        </div>
                    )}

                    {/* Alcohol */}
                    {medicalHistory.socialHistory.alcohol && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Alcohol Status</label>
                            <p className="text-base capitalize">{medicalHistory.socialHistory.alcohol.status || 'Not reported'}</p>
                            {medicalHistory.socialHistory.alcohol.drinksPerWeek && (
                                <p className="text-sm text-gray-600 mt-1">{medicalHistory.socialHistory.alcohol.drinksPerWeek} drinks per week</p>
                            )}
                        </div>
                    )}

                    {/* Occupation */}
                    {medicalHistory.socialHistory.occupation && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Occupation</label>
                            <p className="text-base">{medicalHistory.socialHistory.occupation}</p>
                        </div>
                    )}

                    {/* Exercise */}
                    {medicalHistory.socialHistory.exercise && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Exercise</label>
                            <p className="text-base">{medicalHistory.socialHistory.exercise}</p>
                        </div>
                    )}

                    {/* Diet */}
                    {medicalHistory.socialHistory.diet && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Diet</label>
                            <p className="text-base">{medicalHistory.socialHistory.diet}</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Family History */}
        {medicalHistory.familyHistory && medicalHistory.familyHistory.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    Family History
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
                    Emergency Contacts
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

export default DoctorChat;