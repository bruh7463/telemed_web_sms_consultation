import { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { FiSend, FiX } from 'react-icons/fi';

const ChatWindow = ({ consultation, onUpdate }) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [consultation?.messages]);

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


        </div>
    );
};

export default ChatWindow;
