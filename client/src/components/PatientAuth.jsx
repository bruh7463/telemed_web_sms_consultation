// src/components/PatientAuth.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const PatientAuth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isPasswordSetup, setIsPasswordSetup] = useState(false);
    const [patientIdForSetup, setPatientIdForSetup] = useState(null);
    const [formData, setFormData] = useState({
        phoneNumber: '',
        password: '',
        name: '',
        nrc: '',
        dateOfBirth: '',
        gender: '',
        address: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const response = await api.get('/auth/patient/status');
            if (response.data.isAuthenticated) {
                navigate('/patient/dashboard');
            }
        } catch (error) {
            // Not authenticated, stay on auth page
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (isPasswordSetup) {
            await handlePasswordSetup();
            return;
        }

        const endpoint = isLogin ? '/auth/login/patient' : '/auth/register/patient';

        try {
            const response = await api.post(endpoint, formData);
            if (response.data) {
                navigate('/patient/dashboard');
            }
        } catch (error) {
            const errorData = error.response?.data;
            if (errorData?.requiresPasswordSetup) {
                // Switch to password setup mode
                setIsPasswordSetup(true);
                setPatientIdForSetup(errorData.patientId);
                setIsLogin(false); // Hide registration fields
                setError('Please set a password to continue');
            } else {
                setError(errorData?.message || 'Authentication failed');
            }
            console.error('Authentication error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSetup = async () => {
        try {
            const response = await api.post('/auth/patient/set-password', {
                patientId: patientIdForSetup,
                password: formData.password
            });
            if (response.data) {
                navigate('/patient/dashboard');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Password setup failed');
            console.error('Password setup error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        setIsPasswordSetup(false);
        setPatientIdForSetup(null);
        setIsLogin(true);
        setError('');
        setFormData({
            phoneNumber: '',
            password: '',
            name: '',
            nrc: '',
            dateOfBirth: '',
            gender: '',
            address: ''
        });
    };

    return (
        <div className="max-w-md mx-auto mt-8">
            <h2 className="text-2xl font-bold mb-4">
                {isPasswordSetup ? 'Set Password' : (isLogin ? 'Patient Login' : 'Patient Registration')}
            </h2>
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                {!isPasswordSetup && (
                    <div>
                        <label className="block text-sm font-medium mb-1">Phone Number</label>
                        <input
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                            className="w-full p-2 border rounded"
                            required
                            disabled={isPasswordSetup}
                        />
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        {isPasswordSetup ? 'New Password' : 'Password'}
                    </label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                {!isLogin && !isPasswordSetup && (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1">Full Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Date of Birth</label>
                            <input
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Gender</label>
                            <div className="flex space-x-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="male"
                                        checked={formData.gender === 'male'}
                                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                        className="mr-2"
                                    />
                                    Male
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="female"
                                        checked={formData.gender === 'female'}
                                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                        className="mr-2"
                                    />
                                    Female
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">NRC</label>
                            <input
                                type="text"
                                value={formData.nrc}
                                onChange={(e) => setFormData({...formData, nrc: e.target.value})}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Address</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                    </>
                )}
                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white p-2 rounded disabled:opacity-50"
                    disabled={loading}
                >
                    {loading ? 'Processing...' : (isPasswordSetup ? 'Set Password' : (isLogin ? 'Login' : 'Register'))}
                </button>
            </form>
            {isPasswordSetup ? (
                <button
                    onClick={handleBackToLogin}
                    className="mt-4 text-blue-500"
                >
                    Back to Login
                </button>
            ) : (
                <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="mt-4 text-blue-500"
                >
                    {isLogin ? 'Need to register?' : 'Already have an account?'}
                </button>
            )}
        </div>
    );
};

export default PatientAuth;
