import { useState, useContext } from 'react';
import { AuthContext } from '../App';

const LoginPage = () => {
    const [formData, setFormData] = useState({ email: '', password: '' }); 
    const [error, setError] = useState(''); 
    const [isLoading, setIsLoading] = useState(false); 
    const { loginDoctor } = useContext(AuthContext);

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value }); 

    const onSubmit = async e => {
        e.preventDefault(); 
        setError(''); 
        setIsLoading(true); 
        try {
            // Call the login function provided by AuthContext, which handles the API call and state update
            await loginDoctor(formData);
            // If login() throws an error, it will be caught below
        } catch (err) {
            setError(err.message || 'Login failed. Please check your credentials.'); // Display error from login function
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-900">Doctor Portal Login</h2>
                <form className="space-y-6" onSubmit={onSubmit}>
                     {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{error}</p>}
                    <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={onChange} required
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <input type="password" name="password" value={formData.password} onChange={onChange} required
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <button type="submit" disabled={isLoading} className="w-full px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400">
                            {isLoading ? 'Logging in...' : 'Log In'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
