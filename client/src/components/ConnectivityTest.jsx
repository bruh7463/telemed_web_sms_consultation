import { useState } from 'react';
import { authAPI } from '../services/api';

const ConnectivityTest = () => {
    const [testResults, setTestResults] = useState([]);
    const [isTesting, setIsTesting] = useState(false);

    const addResult = (test, result, details = '') => {
        setTestResults(prev => [...prev, {
            test,
            result,
            details,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const runConnectivityTests = async () => {
        setIsTesting(true);
        setTestResults([]);

        try {
            // Test 1: Basic connectivity
            addResult('Basic Connectivity', 'Testing...', 'Checking if backend server is reachable');
            try {
                const response = await fetch('http://localhost:5000/api/auth/patient/status', {
                    method: 'GET',
                    credentials: 'include'
                });
                // 401 is expected when not authenticated, so we consider it a success for connectivity
                if (response.status === 401 || response.ok) {
                    addResult('Basic Connectivity', '✅ SUCCESS', 'Backend server is running and reachable');
                } else {
                    addResult('Basic Connectivity', '❌ FAILED', `HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (networkError) {
                addResult('Basic Connectivity', '❌ FAILED', `Network error: ${networkError.message}`);
            }

            // Test 2: CORS configuration
            addResult('CORS Configuration', 'Testing...', 'Checking CORS headers');
            try {
                await fetch('http://localhost:5000/api/auth/patient/status', {
                    method: 'OPTIONS',
                    credentials: 'include'
                });
                addResult('CORS Configuration', '✅ SUCCESS', 'CORS headers are properly configured');
            } catch {
                addResult('CORS Configuration', '⚠️ WARNING', 'CORS preflight failed, but may still work');
            }

            // Test 3: API endpoints
            const endpoints = [
                { name: 'Patient Status', url: '/auth/patient/status' },
                { name: 'Doctor Status', url: '/auth/doctor/status' },
                { name: 'Admin Status', url: '/auth/admin/status' },
                { name: 'Patient Consultations', url: '/consultations/patient' },
                { name: 'Patient Prescriptions', url: '/prescriptions' }
            ];

            for (const endpoint of endpoints) {
                addResult(`${endpoint.name} API`, 'Testing...', `Testing ${endpoint.url}`);
                try {
                    const response = await authAPI.get(endpoint.url);
                    addResult(`${endpoint.name} API`, '✅ SUCCESS', `Status: ${response.status}`);
                } catch (error) {
                    const status = error.response?.status || 'Network Error';
                    const message = error.response?.data?.message || error.message;
                    addResult(`${endpoint.name} API`, '❌ FAILED', `Status: ${status} - ${message}`);
                }
            }

        } catch (error) {
            addResult('Test Execution', '❌ ERROR', `Unexpected error: ${error.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Backend Connectivity Test</h2>
                <p className="text-gray-600 mb-4">
                    This tool helps diagnose connectivity issues between the frontend and backend.
                </p>
                <button
                    onClick={runConnectivityTests}
                    disabled={isTesting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                    {isTesting ? 'Running Tests...' : 'Run Connectivity Tests'}
                </button>
            </div>

            {testResults.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">Test Results:</h3>
                    <div className="space-y-2">
                        {testResults.map((result, index) => (
                            <div key={index} className="p-4 border rounded-md bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-900">{result.test}</span>
                                    <span className="text-sm text-gray-500">{result.timestamp}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`font-medium ${
                                        result.result.includes('✅') ? 'text-green-600' :
                                        result.result.includes('❌') ? 'text-red-600' :
                                        result.result.includes('⚠️') ? 'text-yellow-600' :
                                        'text-blue-600'
                                    }`}>
                                        {result.result}
                                    </span>
                                </div>
                                {result.details && (
                                    <p className="text-sm text-gray-600 mt-1">{result.details}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-semibold text-blue-900 mb-2">Troubleshooting Tips:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Make sure the backend server is running on port 5000</li>
                    <li>• Check that MongoDB is running and accessible</li>
                    <li>• Verify that CORS is properly configured in the backend</li>
                    <li>• Check browser developer tools for network errors</li>
                    <li>• Ensure cookies are enabled in your browser</li>
                </ul>
            </div>
        </div>
    );
};

export default ConnectivityTest;
