import { useState, useEffect } from 'react';
import api from '../services/api.js';
import Header from '../components/Header';
import ConsultationList from '../components/ConsultationList';
import ChatWindow from '../components/ChatWindow';
import DoctorAvailabilityManager from '../components/DoctorAvailabilityManager';

const DashboardPage = () => {
    const [consultations, setConsultations] = useState([]);
    const [selectedConsultation, setSelectedConsultation] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchConsultations = async () => {
        try {
            const res = await api.get('/consultations');
            setConsultations(res.data);
            
            if(selectedConsultation){
                const updatedSelection = res.data.find(c => c._id === selectedConsultation._id);
                setSelectedConsultation(updatedSelection || null);
            }
        } catch (err) {
            console.error("Failed to fetch consultations", err);
            // In a real app, handle this error more gracefully (e.g., show a toast notification)
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchConsultations();
        const interval = setInterval(fetchConsultations, 15000); // Poll every 15 seconds
        return () => clearInterval(interval);
    }, []); // Removed dependency to avoid re-triggering interval on selection

    // A separate effect to update the selected consultation details when the list refreshes
    useEffect(() => {
        if(selectedConsultation){
             const updatedSelection = consultations.find(c => c._id === selectedConsultation._id);
             setSelectedConsultation(updatedSelection || null);
        }
    }, [consultations])


    return (
        <div className="h-screen flex flex-col">
            <Header />
            <main className="flex flex-grow overflow-hidden">
                <ConsultationList
                    consultations={consultations}
                    onSelectConsultation={setSelectedConsultation}
                    selectedConsultationId={selectedConsultation?._id}
                    loading={loading}
                />
                <ChatWindow
                    consultation={selectedConsultation}
                    onUpdate={fetchConsultations}
                />
                <DoctorAvailabilityManager />
            </main>
        </div>
    );
};

export default DashboardPage;