import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';

const PatientSetPassword = () => {
    const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const patientId = location.state?.patientId;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setIsLoading(true);
        try {
            await authAPI.patientSetPassword({
                patientId,
                password: formData.password
            });

            // Redirect to patient dashboard after successful password setup
            navigate('/patient/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to set password');
        } finally {
            setIsLoading(false);
        }
    };

    if (!patientId) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                    <p className="text-red-500 text-center">Invalid access. Please login first.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-900">Set Your Password</h2>
                <p className="text-sm text-gray-600 text-center">
                    Please set a password for your account to continue.
                </p>

                <form className="space-y-6" onSubmit={onSubmit}>
                     {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{error}</p>}

                    <div>
                        <label className="text-sm font-medium text-gray-700">New Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={onChange}
                            required
                            minLength={6}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={onChange}
                            required
                            minLength={6}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                        >
                            {isLoading ? 'Setting Password...' : 'Set Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PatientSetPassword;
