import { useEffect, useCallback } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthenticated, setUser, setRole, logout } from './redux/slices/authSlice';
import { setUserData } from './redux/slices/appSlice';
import { authAPI } from './services/api';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientDashboard from './pages/patient/PatientDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import PatientSetPassword from './pages/patient/PatientSetPassword';
import PatientRegister from './pages/PatientRegister';
import ConnectivityTest from './components/ConnectivityTest';

function App() {
    const dispatch = useDispatch();
    const { isAuthenticated, loading, role } = useSelector(state => state.auth);

    // Debug logging for authentication state changes
    console.log('App render - isAuthenticated:', isAuthenticated, 'role:', role, 'loading:', loading);

    // Function to check authentication status with the backend
    const checkAuthStatus = useCallback(async () => {
        try {
            // Check all three status endpoints in parallel for efficiency
            const [patientRes, doctorRes, adminRes] = await Promise.allSettled([
                authAPI.patientStatus(),
                authAPI.doctorStatus(),
                authAPI.adminStatus()
            ]);

            // Process results - find the first successful authentication
            if (patientRes.status === 'fulfilled' && patientRes.value.data.isAuthenticated) {
                dispatch(setAuthenticated(true));
                dispatch(setUser(patientRes.value.data.patient));
                dispatch(setRole('patient'));
                dispatch(setUserData({
                    id: patientRes.value.data.patient.id,
                    name: patientRes.value.data.patient.name,
                    email: patientRes.value.data.patient.email,
                    phoneNumber: patientRes.value.data.patient.phoneNumber,
                    role: 'patient'
                }));
                return;
            }

            if (doctorRes.status === 'fulfilled' && doctorRes.value.data.isAuthenticated) {
                dispatch(setAuthenticated(true));
                dispatch(setUser(doctorRes.value.data.doctor));
                dispatch(setRole('doctor'));
                dispatch(setUserData({
                    id: doctorRes.value.data.doctor.id,
                    name: doctorRes.value.data.doctor.name,
                    email: doctorRes.value.data.doctor.email,
                    role: 'doctor'
                }));
                return;
            }

            if (adminRes.status === 'fulfilled' && adminRes.value.data.isAuthenticated) {
                dispatch(setAuthenticated(true));
                dispatch(setUser(adminRes.value.data.admin));
                dispatch(setRole('admin'));
                dispatch(setUserData({
                    id: adminRes.value.data.admin.id,
                    name: adminRes.value.data.admin.name,
                    email: adminRes.value.data.admin.email,
                    role: 'admin'
                }));
                return;
            }

            // Check for actual errors (not just 403 Forbidden which is expected)
            const errors = [patientRes, doctorRes, adminRes]
                .filter(result => result.status === 'rejected')
                .map(result => result.reason);

            const hasRealErrors = errors.some(err =>
                !err.response || (err.response.status !== 401 && err.response.status !== 403)
            );

            if (hasRealErrors) {
                console.warn('Some authentication checks failed:', errors);
            }

            // No authenticated session found - this is normal for new users
            console.log('No active authentication session found');
            dispatch(logout());

        } catch (err) {
            console.error('Unexpected error during authentication check:', err);
            dispatch(logout());
        }
    }, [dispatch]);

    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    const handleLogin = async (credentials, userRole) => {
        try {
            console.log('Starting login process for role:', userRole);
            let res;
            switch (userRole) {
                case 'patient':
                    console.log('Calling patient login API...');
                    res = await authAPI.patientLogin(credentials);
                    console.log('Patient login response:', res.data);
                    dispatch(setUser(res.data.patient));
                    dispatch(setRole('patient'));
                    break;
                case 'doctor':
                    console.log('Calling doctor login API...');
                    res = await authAPI.doctorLogin(credentials);
                    console.log('Doctor login response:', res.data);
                    dispatch(setUser(res.data.doctor));
                    dispatch(setRole('doctor'));
                    break;
                case 'admin':
                    console.log('Calling admin login API...');
                    res = await authAPI.adminLogin(credentials);
                    console.log('Admin login response:', res.data);
                    dispatch(setUser(res.data.admin));
                    dispatch(setRole('admin'));
                    break;
                default:
                    throw new Error('Invalid role');
            }

            console.log('Setting authentication state...');
            dispatch(setAuthenticated(true));
            dispatch(setUserData({
                id: res.data[userRole].id,
                name: res.data[userRole].name,
                email: res.data[userRole].email,
                role: userRole
            }));

            console.log('Login process completed successfully');
            return res.data; // Return the response data
        } catch (err) {
            console.error('Login failed:', err);
            // Pass the full error object so LoginPage can handle password setup flow
            const error = new Error(err.response?.data?.message || 'Login failed. Please check your credentials.');
            error.response = err.response;
            error.patientId = err.response?.data?.patientId;
            error.requiresPasswordSetup = err.response?.data?.requiresPasswordSetup;
            throw error;
        }
    };

    const handleLogout = async () => {
        try {
            await authAPI.logout();
        } catch (err) {
            console.error('Error logging out:', err);
        } finally {
            dispatch(logout());
        }
    };

    const getDashboardRoute = () => {
        switch (role) {
            case 'patient':
                return '/patient/dashboard';
            case 'doctor':
                return '/doctor/dashboard';
            case 'admin':
                return '/admin/dashboard';
            default:
                return '/dashboard';
        }
    };

    const getDashboardComponent = () => {
        switch (role) {
            case 'patient':
                return <PatientDashboard onLogout={handleLogout} />;
            case 'doctor':
                return <DoctorDashboard onLogout={handleLogout} />;
            case 'admin':
                return <AdminDashboard onLogout={handleLogout} />;
            default:
                return <DashboardPage onLogout={handleLogout} />;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100 font-semibold text-gray-600">
                Initializing Application...
            </div>
        );
    }

    return (
        <div className="App">
            <Routes>
                <Route
                    path="/login"
                    element={
                        isAuthenticated ? (
                            <Navigate to={getDashboardRoute()} replace />
                        ) : (
                            <LoginPage onLogin={handleLogin} />
                        )
                    }
                />
                <Route
                    path="/register"
                    element={
                        isAuthenticated ? (
                            <Navigate to={getDashboardRoute()} replace />
                        ) : (
                            <PatientRegister />
                        )
                    }
                />
                <Route
                    path="/connectivity-test"
                    element={<ConnectivityTest />}
                />
                <Route
                    path="/patient/set-password"
                    element={<PatientSetPassword />}
                />
                <Route
                    path="/patient/*"
                    element={
                        isAuthenticated && role === 'patient' ? (
                            <PatientDashboard onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                <Route
                    path="/doctor/*"
                    element={
                        isAuthenticated && role === 'doctor' ? (
                            <DoctorDashboard onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                <Route
                    path="/admin/*"
                    element={
                        isAuthenticated && role === 'admin' ? (
                            <AdminDashboard onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                <Route
                    path="/dashboard/*"
                    element={
                        isAuthenticated ? (
                            getDashboardComponent()
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                <Route
                    path="/"
                    element={
                        <Navigate to={isAuthenticated ? getDashboardRoute() : "/login"} replace />
                    }
                />
            </Routes>
        </div>
    );
}

export default App;
