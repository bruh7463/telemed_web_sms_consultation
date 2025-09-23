import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

const PatientRegister = () => {
    const [formData, setFormData] = useState({
        name: '',
        phoneNumber: '',
        nrc: '',
        password: '',
        confirmPassword: '',
        dateOfBirth: '',
        gender: '',
        address: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('Name is required');
            return false;
        }
        if (!formData.phoneNumber.trim()) {
            setError('Phone number is required');
            return false;
        }
        if (!formData.nrc.trim()) {
            setError('NRC (National Registration Card) is required');
            return false;
        }
        if (formData.nrc.length !== 9) {
            setError('NRC must be exactly 9 characters long');
            return false;
        }
        if (!formData.password) {
            setError('Password is required');
            return false;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        if (!formData.dateOfBirth) {
            setError('Date of birth is required');
            return false;
        }
        if (!formData.gender) {
            setError('Gender is required');
            return false;
        }
        if (!formData.address.trim()) {
            setError('Address is required');
            return false;
        }

        // Phone number validation (basic)
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(formData.phoneNumber)) {
            setError('Please enter a valid phone number');
            return false;
        }

        return true;
    };

    const onSubmit = async e => {
        e.preventDefault();
        setError('');

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        try {
            const registrationData = {
                name: formData.name.trim(),
                phoneNumber: formData.phoneNumber.replace(/\s+/g, '').trim(),
                nrc: formData.nrc.trim(),
                password: formData.password,
                dateOfBirth: formData.dateOfBirth,
                gender: formData.gender,
                address: formData.address.trim()
            };

            console.log('Sending registration data:', registrationData); // Debug logging

            await authAPI.patientRegister(registrationData);
            setIsSuccess(true);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err) {
            console.log('Registration error:', err); // Debug logging
            console.log('Error response:', err.response?.data); // Debug logging
            const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Registration failed. Please try again.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
                        <p className="text-sm text-gray-500">
                            Redirecting to login page in 3 seconds...
                        </p>
                        <Link
                            to="/login"
                            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 py-8">
            <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900">Patient Registration</h2>
                    <p className="text-gray-600 mt-2">
                        Create your account to access telemedicine services
                    </p>
                </div>

                <form className="space-y-6" onSubmit={onSubmit}>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Required Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={onChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={onChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="+260XXXXXXXXX"
                            />
                        </div>
                    </div>

                    {/* NRC */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            NRC (National Registration Card) *
                        </label>
                        <input
                            type="text"
                            name="nrc"
                            value={formData.nrc}
                            onChange={onChange}
                            required
                            maxLength={9}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="XXXXXXXXX"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Must be exactly 9 characters long
                        </p>
                    </div>

                    {/* Password Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password *
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={onChange}
                                required
                                minLength={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your password"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Must be at least 6 characters long
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password *
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={onChange}
                                required
                                minLength={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Confirm your password"
                            />
                        </div>
                    </div>

                    {/* Additional Required Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date of Birth *
                            </label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={onChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Gender *
                            </label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={onChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Address *
                        </label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={onChange}
                            rows={3}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your full address"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex flex-col space-y-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-4 py-3 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </button>

                        <div className="text-center">
                            <span className="text-sm text-gray-600">
                                Already have an account?{' '}
                                <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                                    Sign in here
                                </Link>
                            </span>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PatientRegister;
