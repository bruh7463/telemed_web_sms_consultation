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
        try {
            await testAPI.clearSmsLog();
            setMessageCount(0);
            setSimulatedSMS([]);
        } catch (error) {
            console.error('Error clearing SMS log:', error);
        }
    };

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
                                            onClick={() => fillTestMessage('symptom check')}
                                            className="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 text-left"
                                        >
                                            "symptom check" - Start triage
                                        </button>
                                        <button
                                            onClick={() => fillTestMessage('1')}
                                            className="px-3 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 text-left"
                                        >
                                            "1" - Fever category
                                        </button>
                                        <button
                                            onClick={() => fillTestMessage('3')}
                                            className="px-3 py-2 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 text-left"
                                        >
                                            "3" - Symptoms option
                                        </button>
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
                                            onClick={() => fillTestMessage('help')}
                                            className="px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 text-left"
                                        >
                                            "help" - General help
                                        </button>
                                    </div>

                                    <div className="mt-6">
                                        <h3 className="text-md font-semibold text-gray-700 mb-2">Triage Test Cases</h3>
                                        <div className="grid grid-cols-1 gap-2">
                                            <button
                                                onClick={() => fillTestMessage('Yes, severe (can\u0027t complete sentences)')}
                                                className="px-3 py-2 bg-red-500 text-white text-xs rounded hover:bg-red-600 text-left"
                                                title="Severe breathing - should trigger EMERGENCY"
                                            >
                                                Severe Breathing (Emergency)
                                            </button>
                                            <button
                                                onClick={() => fillTestMessage('Yes, severe crushing pain')}
                                                className="px-3 py-2 bg-red-600 text-white text-xs rounded hover:bg-red-700 text-left"
                                                title="Severe chest pain - should trigger EMERGENCY"
                                            >
                                                Severe Chest Pain (Emergency)
                                            </button>
                                            <button
                                                onClick={() => fillTestMessage('Yes, moderate (short of breath with activity)')}
                                                className="px-3 py-2 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 text-left"
                                                title="Moderate breathing - should trigger URGENT"
                                            >
                                                Moderate Breathing (Urgent)
                                            </button>
                                            <button
                                                onClick={() => fillTestMessage('Watery diarrhea')}
                                                className="px-3 py-2 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 text-left"
                                                title="GI symptoms - routine consultation"
                                            >
                                                Digestive Symptoms (Monitor)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-blue-800 mb-2">Testing Instructions</h3>
                                <ul className="text-sm text-blue-700 space-y-1">
                                    <li>• Start with "symptom check" to begin triage assessment</li>
                                    <li>• Follow the chatbot prompts to complete triage</li>
                                    <li>• Monitor the chat for automated responses from the system</li>
                                    <li>• Check SMS log for detailed message history</li>
                                    <li>• Use "Clear Chat" to reset conversation and logs</li>
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SMSTestingPage;
