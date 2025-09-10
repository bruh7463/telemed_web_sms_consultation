import { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import api, { setAuthToken } from '../src/services/api';
import LoginPage from '../src/pages/LoginPage';
import DashboardPage from '../src/pages/DashboardPage';
import PatientAuth from './components/PatientAuth';
import PatientDashboard from './pages/PatientDashBoard';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';

export const AuthContext = createContext(null);

function App() {
    const [auth, setAuth] = useState({
        token: null,
        isAuthenticated: null,
        loading: true,
        doctor: null,
        userType: null // 'doctor', 'patient', 'admin'
    });

    // Function to check authentication status with the backend using the cookie
    const checkAuthStatus = async () => {
        try {
            // Try to check doctor authentication first
            const doctorRes = await api.get('/auth/doctor/status');
            if (doctorRes.data.isAuthenticated) {
                setAuth({
                    token: 'EXISTS',
                    isAuthenticated: true,
                    loading: false,
                    doctor: doctorRes.data.doctor,
                    userType: 'doctor'
                });
                return;
            }
        } catch (err) {
            // Doctor not authenticated, continue to check others
        }

        try {
            // Try to check patient authentication
            const patientRes = await api.get('/auth/patient/status');
            if (patientRes.data.isAuthenticated) {
                setAuth({
                    token: 'EXISTS',
                    isAuthenticated: true,
                    loading: false,
                    patient: patientRes.data.patient,
                    userType: 'patient'
                });
                return;
            }
        } catch (err) {
            // Patient not authenticated, continue to check admin
        }

        try {
            // Try to check admin authentication
            const adminRes = await api.get('/auth/admin/status');
            if (adminRes.data.isAuthenticated) {
                setAuth({
                    token: 'EXISTS',
                    isAuthenticated: true,
                    loading: false,
                    admin: adminRes.data.admin,
                    userType: 'admin'
                });
                return;
            }
        } catch (err) {
            // Admin not authenticated
        }

        // No authentication found
        setAuth({
            token: null,
            isAuthenticated: false,
            loading: false,
            doctor: null,
            patient: null,
            admin: null,
            userType: null
        });
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error('Error logging out:', err);
        } finally {
            setAuthToken(null);
            setAuth({
                token: null,
                isAuthenticated: false,
                loading: false,
                doctor: null,
                patient: null,
                admin: null,
                userType: null
            });
        }
    };

    useEffect(() => {
        checkAuthStatus();
    }, []);

    // Doctor login function
    const loginDoctor = async (credentials) => {
        try {
            const res = await api.post('/auth/doctor/login', credentials);
            setAuth({
                token: 'EXISTS',
                isAuthenticated: true,
                loading: false,
                doctor: res.data.doctor,
                userType: 'doctor'
            });
        } catch (err) {
            throw new Error(err.response?.data?.message || 'Login failed. Please check your credentials.');
        }
    };

    // Patient login function
    const loginPatient = async (credentials) => {
        try {
            const res = await api.post('/auth/login/patient', credentials);
            setAuth({
                token: 'EXISTS',
                isAuthenticated: true,
                loading: false,
                patient: res.data.patient,
                userType: 'patient'
            });
        } catch (err) {
            throw new Error(err.response?.data?.message || 'Login failed. Please check your credentials.');
        }
    };

    // Admin login function
    const loginAdmin = async (credentials) => {
        try {
            const res = await api.post('/auth/admin/login', credentials);
            setAuth({
                token: 'EXISTS',
                isAuthenticated: true,
                loading: false,
                admin: res.data.admin,
                userType: 'admin'
            });
        } catch (err) {
            throw new Error(err.response?.data?.message || 'Login failed. Please check your credentials.');
        }
    };

    if (auth.loading) {
        return <div className="flex justify-center items-center h-screen bg-gray-100 font-semibold text-gray-600">Initializing Application...</div>;
    }

    return (
        <AuthContext.Provider value={{
            ...auth,
            loginDoctor,
            loginPatient,
            loginAdmin,
            logout,
            checkAuthStatus
        }}>
            <Router>
                <Routes>
                    {/* Default route - redirect based on authentication */}
                    <Route path="/" element={
                        auth.isAuthenticated ? (
                            auth.userType === 'doctor' ? <Navigate to="/doctor/dashboard" /> :
                            auth.userType === 'patient' ? <Navigate to="/patient/dashboard" /> :
                            auth.userType === 'admin' ? <Navigate to="/admin/dashboard" /> :
                            <Navigate to="/login" />
                        ) : (
                            <Navigate to="/login" />
                        )
                    } />

                    {/* Doctor Routes */}
                    <Route path="/login" element={
                        auth.isAuthenticated && auth.userType === 'doctor' ?
                            <Navigate to="/doctor/dashboard" /> :
                            <LoginPage onLogin={loginDoctor} />
                    } />
                    <Route path="/doctor/dashboard" element={
                        auth.isAuthenticated && auth.userType === 'doctor' ?
                            <DashboardPage /> :
                            <Navigate to="/login" />
                    } />

                    {/* Patient Routes */}
                    <Route path="/patient/auth" element={<PatientAuth />} />
                    <Route path="/patient/dashboard" element={
                        auth.isAuthenticated && auth.userType === 'patient' ?
                            <PatientDashboard /> :
                            <Navigate to="/patient/auth" />
                    } />

                    {/* Admin Routes */}
                    <Route path="/admin/login" element={
                        auth.isAuthenticated && auth.userType === 'admin' ?
                            <Navigate to="/admin/dashboard" /> :
                            <AdminLoginPage />
                    } />
                    <Route path="/admin/dashboard" element={
                        auth.isAuthenticated && auth.userType === 'admin' ?
                            <AdminDashboard /> :
                            <Navigate to="/admin/login" />
                    } />

                    {/* Catch all route */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Router>
        </AuthContext.Provider>
    );
}

export default App;
