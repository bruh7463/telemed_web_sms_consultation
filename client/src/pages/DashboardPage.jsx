import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setConsultations } from '../redux/slices/consultSlice';
import { consultationAPI } from '../services/api.js';
import Header from '../components/Header/Header';
import Aside from '../components/Aside/Aside';
import ConsultationList from '../components/ConsultationList';
import ChatWindow from '../components/ChatWindow';
import DoctorAvailabilityManager from '../components/DoctorAvailabilityManager';

const DashboardPage = ({ onLogout }) => {
    const dispatch = useDispatch();
    const [selectedConsultation, setSelectedConsultation] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchConsultations = async () => {
        try {
            const res = await consultationAPI.getAll();
            dispatch(setConsultations(res.data));

            if(selectedConsultation){
                const updatedSelection = res.data.find(c => c._id === selectedConsultation._id);
                setSelectedConsultation(updatedSelection || null);
            }
        } catch (err) {
            console.error("Failed to fetch consultations", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsultations();
        const interval = setInterval(fetchConsultations, 15000); // Poll every 15 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="dashboard-container">
            <Header />
            <div className="dashboard-content">
                <Aside />
                <main className="main-content">
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <div className="consultation-layout">
                                    <ConsultationList
                                        consultations={[]} // Will be managed by Redux
                                        onSelectConsultation={setSelectedConsultation}
                                        selectedConsultationId={selectedConsultation?._id}
                                        loading={loading}
                                    />
                                    <ChatWindow
                                        consultation={selectedConsultation}
                                        onUpdate={fetchConsultations}
                                    />
                                    <DoctorAvailabilityManager />
                                </div>
                            }
                        />
                        <Route path="/profile/:id" element={<div>Profile Page</div>} />
                        <Route path="/history" element={<div>History Page</div>} />
                        <Route path="/consult" element={<div>Consult Page</div>} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default DashboardPage;
