import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { consultationAPI } from '../../services/api';
import { Send, MessageCircle } from 'lucide-react';

const DoctorChat = ({ selectedConsultation: propSelectedConsultation }) => {
    const { consultations } = useSelector(state => state.consult);
    const [selectedConsultation, setSelectedConsultation] = useState(propSelectedConsultation || null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
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
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900">
                                                {consultation.patient?.name || 'Unknown Patient'}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                Started {consultation.scheduledStart ? new Date(consultation.scheduledStart).toLocaleDateString() : 'Date not set'}
                                            </p>
                                        </div>
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
        </div>
    );
};

export default DoctorChat;
