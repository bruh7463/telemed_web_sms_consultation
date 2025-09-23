import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const LoginPage = ({ onLogin }) => {
    const [formData, setFormData] = useState({ email: '', password: '', phoneNumber: '' });
    const [role, setRole] = useState('patient');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            let credentials = {};

            if (role === 'patient') {
                // For patients, use phoneNumber instead of email
                credentials = {
                    phoneNumber: formData.phoneNumber,
                    password: formData.password || '' // Allow empty password for SMS-registered users
                };
            } else {
                credentials = {
                    email: formData.email,
                    password: formData.password
                };
            }

            const result = await onLogin(credentials, role);
            console.log('Login successful, result:', result);

            // The onLogin function should handle the redirect
            // If it doesn't, we can add navigation here
            // navigate('/dashboard');
        } catch (err) {
            const errorMessage = err.message;
            console.log('Login error:', err); // Debug logging
            console.log('Error response:', err.response?.data); // Debug logging
            setError(errorMessage);

            // Handle password setup flow for patients
            if (role === 'patient' && (err.requiresPasswordSetup || errorMessage.includes('Password not set') || errorMessage.includes('password not set'))) {
                const patientId = err.patientId || err.response?.data?.patientId;
                console.log('Password setup required, patientId:', patientId); // Debug logging
                if (patientId) {
                    navigate('/patient/set-password', { state: { patientId } });
                    return;
                } else {
                    setError('Password setup required but patient ID not found. Please contact support.');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-900">Telemedicine Portal Login</h2>

                {/* Role Selection */}
                <div>
                    <label className="text-sm font-medium text-gray-700">Login as:</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="patient">Patient</option>
                        <option value="doctor">Doctor</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                <form className="space-y-6" onSubmit={onSubmit}>
                     {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{error}</p>}

                    {role === 'patient' ? (
                        <div>
                            <label className="text-sm font-medium text-gray-700">Phone Number</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={onChange}
                                required
                                placeholder="+260XXXXXXXXX"
                                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                If you already registered through SMS? Enter your phone number and leave password blank.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={onChange}
                                required
                                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={onChange}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                        >
                            {isLoading ? 'Logging in...' : 'Log In'}
                        </button>
                    </div>

                    {role === 'patient' && (
                        <div className="text-center">
                            <span className="text-sm text-gray-600">
                                Don't have an account?{' '}
                                <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                                    Sign up here
                                </Link>
                            </span>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
