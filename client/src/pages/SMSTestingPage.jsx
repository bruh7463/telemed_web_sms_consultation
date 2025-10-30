import { useState, useEffect, useRef } from 'react';
import { testAPI } from '../services/api';
import api from '../services/api'; // For SMS webhook

function SMSTestingPage() {
    const [simulatedSMS, setSimulatedSMS] = useState([]);
    const [isSimulatorEnabled, setIsSimulatorEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [messageCount, setMessageCount] = useState(0);
    const [currentConversation, setCurrentConversation] = useState([]);
    const [phoneNumber, setPhoneNumber] = useState('+260971234567'); // Test phone number
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);
    const lastMessageTimestamp = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [currentConversation]);

    // Check if SMS simulator is enabled and load initial data
    const checkSimulatorStatus = async () => {
        try {
            const response = await testAPI.getSmsCount();
            setIsSimulatorEnabled(true);
            setMessageCount(response.data.count);
            setSimulatedSMS(response.data.lastMessage ? [response.data.lastMessage] : []);
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('SMS simulator not enabled');
                setIsSimulatorEnabled(false);
            } else {
                console.error('Error checking simulator status:', error);
            }
        }
    };

    useEffect(() => {
        checkSimulatorStatus();
    }, []);

    // Simulate sending an SMS to the system
    const sendTestSMS = async (message) => {
        if (!message.trim()) return;

        setLoading(true);
        try {
            // Record the time before sending to filter only newer responses
            const sendTime = new Date();

            // Add user message to conversation
            const userMessage = {
                id: Date.now(),
                direction: 'outbound',
                content: message,
                timestamp: sendTime.toLocaleTimeString(),
                sender: phoneNumber
            };

            setCurrentConversation(prev => [...prev, userMessage]);
            setInputMessage('');

            // Send to SMS webhook (simulate incoming message)
            const response = await api.post('/sms/incoming', {
                webhookEvent: 'MESSAGE_RECEIVED',
                sender: phoneNumber,
                message: message
            });

            // Wait a moment then refresh SMS log
            setTimeout(async () => {
                try {
                    const logResponse = await testAPI.getSmsLog();
                    setMessageCount(logResponse.data.count);

                    // Get only SMS responses sent after our message (not all from the last minute)
                    const replies = logResponse.data.messages.filter(
                        sms => sms.to === phoneNumber && new Date(sms.timestamp) > sendTime
                    );

                    // Add system replies to conversation
                    const newReplies = replies.map(reply => ({
                        id: reply.id,
                        direction: 'inbound',
                        content: reply.content,
                        timestamp: new Date(reply.timestamp).toLocaleTimeString(),
                        sender: 'System'
                    }));

                    setCurrentConversation(prev => [...prev, ...newReplies]);
                } catch (logError) {
                    console.error('Error fetching SMS log:', logError);
                }
            }, 1000);

        } catch (error) {
            console.error('Error sending test SMS:', error);
            // Add error message to conversation
            setCurrentConversation(prev => [...prev, {
                id: Date.now(),
                direction: 'system',
                content: `Error: ${error.response?.data?.message || error.message}`,
                timestamp: new Date().toLocaleTimeString(),
                sender: 'System'
            }]);
        } finally {
            setLoading(false);
        }
    };

    // Clear conversation and SMS log
    const clearConversation = async () => {
        setCurrentConversation([]);
        lastMessageTimestamp.current = null; // Reset polling timestamp
        try {
            await testAPI.clearSmsLog();
            setMessageCount(0);
            setSimulatedSMS([]);
        } catch (error) {
            console.error('Error clearing SMS log:', error);
        }
    };

    // Poll for new doctor responses
    const pollForDoctorResponses = async () => {
        try {
            const logResponse = await testAPI.getSmsLog();
            const latestMessages = logResponse.data.messages;

            if (latestMessages.length > 0) {
                // Find messages sent TO our test phone number that are newer than our last check
                const doctorMessages = latestMessages.filter(
                    sms => sms.to === phoneNumber &&
                           new Date(sms.timestamp) > (lastMessageTimestamp.current || 0)
                );

                if (doctorMessages.length > 0) {
                    // Update last message timestamp
                    lastMessageTimestamp.current = new Date(Math.max(...doctorMessages.map(m => new Date(m.timestamp))));

                    // Add doctor messages to conversation
                    const newDoctorMsgs = doctorMessages.map(msg => ({
                        id: msg.id || Date.now(),
                        direction: 'inbound',
                        content: msg.content,
                        timestamp: new Date(msg.timestamp).toLocaleTimeString(),
                        sender: 'Doctor'
                    }));

                    setCurrentConversation(prev => [...prev, ...newDoctorMsgs]);
                }
            }
        } catch (error) {
            console.debug('Error polling for doctor responses:', error.message);
            // Don't show error alerts for background polling
        }
    };

    // Set up polling for doctor responses
    useEffect(() => {
        if (isSimulatorEnabled) {
            // Initial poll
            pollForDoctorResponses();

            // Set up polling interval (every 2 seconds)
            const pollInterval = setInterval(pollForDoctorResponses, 2000);

            return () => clearInterval(pollInterval); // Cleanup on unmount
        }
    }, [isSimulatorEnabled, phoneNumber]);

    // Pre-fill common test messages
    const fillTestMessage = (message) => {
        setInputMessage(message);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-gray-800">SMS Testing Interface</h1>
                        <div className="flex items-center space-x-4">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                isSimulatorEnabled
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {isSimulatorEnabled ? 'Simulator: Enabled' : 'Simulator: Disabled'}
                            </div>
                            <span className="text-sm text-gray-600">
                                Total Messages: {messageCount}
                            </span>
                        </div>
                    </div>

                    {!isSimulatorEnabled ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                            <p className="text-yellow-800">
                                <strong>Warning:</strong> SMS Simulator is not enabled.
                                Please set <code>SMS_SIMULATOR=true</code> in your environment variables to enable testing mode.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Phone Number Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Test Phone Number
                                </label>
                                <input
                                    type="text"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="+260971234567"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Chat Interface */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-semibold text-gray-700">Chat Interface</h2>
                                        <button
                                            onClick={clearConversation}
                                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                            disabled={loading}
                                        >
                                            Clear Chat
                                        </button>
                                    </div>

                                    {/* Messages Container */}
                                    <div className="h-96 bg-white border rounded-lg p-4 mb-4 overflow-y-auto">
                                        {currentConversation.length === 0 ? (
                                            <div className="text-center text-gray-500 mt-8">
                                                Start a conversation by typing a message below
                                            </div>
                                        ) : (
                                            currentConversation.map((msg) => (
                                                <div key={msg.id} className={`mb-3 ${
                                                    msg.direction === 'outbound'
                                                        ? 'text-right'
                                                        : msg.direction === 'system'
                                                        ? 'text-center'
                                                        : 'text-left'
                                                }`}>
                                                    <div className={`inline-block max-w-xs px-3 py-2 rounded-lg text-sm ${
                                                        msg.direction === 'outbound'
                                                            ? 'bg-blue-500 text-white'
                                                            : msg.direction === 'system'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-gray-200 text-gray-800'
                                                    }`}>
                                                        <div className="text-xs opacity-75 mb-1">
                                                            {msg.sender} • {msg.timestamp}
                                                        </div>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Message Input */}
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && sendTestSMS(inputMessage)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Type your message..."
                                            disabled={loading}
                                        />
                                        <button
                                            onClick={() => sendTestSMS(inputMessage)}
                                            disabled={loading || !inputMessage.trim()}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        >
                                            {loading ? 'Sending...' : 'Send'}
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Test Messages */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Quick Test Messages</h2>
                                    <div className="grid grid-cols-1 gap-2">
                                        <button
                                            onClick={() => fillTestMessage('book consultation')}
                                            className="px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 text-left"
                                        >
                                            "book consultation" - Booking flow
                                        </button>
                                        <button
                                            onClick={() => fillTestMessage('my appointments')}
                                            className="px-3 py-2 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600 text-left"
                                        >
                                            "my appointments" - Check appointments
                                        </button>
                                        <button
                                            onClick={() => fillTestMessage('i feel week')}
                                            className="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 text-left"
                                        >
                                            "i feel week" - Medical symptom
                                        </button>
                                    </div>
                                </div>
                            </div>

                            
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SMSTestingPage;
