import { useState } from 'react';

const ConnectivityTest = () => {
    const [tests, setTests] = useState([
        {
            testName: 'Basic Connectivity',
            endpoint: 'http://localhost:5000',
            expectedOutcome: 'Server is reachable',
            actualOutcome: '',
            result: '',
            status: 'pending' // pending, testing, success, fail
        },
        {
            testName: 'CORS Configuration',
            endpoint: 'OPTIONS /api/auth/patient/status',
            expectedOutcome: 'Allow-Origin header',
            actualOutcome: '',
            result: '',
            status: 'pending'
        },
        {
            testName: 'Patient Status API',
            endpoint: 'GET /api/auth/patient/status',
            expectedOutcome: '401 (Unauthenticated)',
            actualOutcome: '',
            result: '',
            status: 'pending'
        },
        {
            testName: 'Doctor Status API',
            endpoint: 'GET /api/auth/doctor/status',
            expectedOutcome: '401 (Unauthenticated)',
            actualOutcome: '',
            result: '',
            status: 'pending'
        },
        {
            testName: 'Admin Status API',
            endpoint: 'GET /api/auth/admin/status',
            expectedOutcome: '401 (Unauthenticated)',
            actualOutcome: '',
            result: '',
            status: 'pending'
        },
        {
            testName: 'Patient Consultations API',
            endpoint: 'GET /api/consultations/patient',
            expectedOutcome: '401 (Unauthenticated)',
            actualOutcome: '',
            result: '',
            status: 'pending'
        }
    ]);
    const [isTesting, setIsTesting] = useState(false);

    const updateTest = (index, updates) => {
        setTests(prev => prev.map((test, i) =>
            i === index ? { ...test, ...updates } : test
        ));
    };

    const runConnectivityTests = async () => {
        setIsTesting(true);
        // Reset all tests to pending state
        setTests(prev => prev.map(test => ({
            ...test,
            actualOutcome: '',
            result: '',
            status: 'pending'
        })));

        try {
            // Test 1: Basic Connectivity - localhost:5000
            updateTest(0, { status: 'testing' });
            try {
                const response = await fetch('http://localhost:5000', {
                    method: 'GET',
                    credentials: 'omit'
                });
                if (response.ok || response.status === 404) { // 404 is ok for root endpoint, server is reachable
                    updateTest(0, {
                        actualOutcome: `HTTP ${response.status}`,
                        result: 'SUCCESS',
                        status: 'success'
                    });
                } else {
                    updateTest(0, {
                        actualOutcome: `HTTP ${response.status}`,
                        result: 'FAILED',
                        status: 'fail'
                    });
                }
            } catch (error) {
                updateTest(0, {
                    actualOutcome: 'Network Error',
                    result: 'FAILED',
                    status: 'fail'
                });
            }

            // Test 2: CORS Configuration - OPTIONS /api/auth/patient/status
            updateTest(1, { status: 'testing' });
            try {
                const response = await fetch('http://localhost:5000/api/auth/patient/status', {
                    method: 'OPTIONS',
                    credentials: 'omit'
                });

                if (response.status === 200 || response.status === 204) {
                    updateTest(1, {
                        actualOutcome: 'Headers present',
                        result: 'SUCCESS',
                        status: 'success'
                    });
                } else {
                    updateTest(1, {
                        actualOutcome: `HTTP ${response.status}`,
                        result: 'FAILED',
                        status: 'fail'
                    });
                }
            } catch (error) {
                updateTest(1, {
                    actualOutcome: 'Preflight failed',
                    result: 'FAILED',
                    status: 'fail'
                });
            }

            // Test 3-6: Status APIs (expect 401 for unauthenticated)
            const statusTests = [
                { index: 2, url: '/api/auth/patient/status' },
                { index: 3, url: '/api/auth/doctor/status' },
                { index: 4, url: '/api/auth/admin/status' },
                { index: 5, url: '/api/consultations/patient' }
            ];

            for (const test of statusTests) {
                updateTest(test.index, { status: 'testing' });
                try {
                    const response = await fetch(`http://localhost:5000${test.url}`, {
                        method: 'GET',
                        credentials: 'include'
                    });
                    if (response.status === 401) {
                        updateTest(test.index, {
                            actualOutcome: 'HTTP 401',
                            result: 'SUCCESS',
                            status: 'success'
                        });
                    } else {
                        updateTest(test.index, {
                            actualOutcome: `HTTP ${response.status}`,
                            result: 'FAILED',
                            status: 'fail'
                        });
                    }
                } catch (error) {
                    updateTest(test.index, {
                        actualOutcome: 'Network Error',
                        result: 'FAILED',
                        status: 'fail'
                    });
                }
            }

        } catch (error) {
            console.error('Test execution error:', error);
            // Mark all remaining pending tests as error
            setTests(prev => prev.map(test =>
                test.status === 'testing' || test.status === 'pending'
                    ? { ...test, actualOutcome: 'Error', result: 'FAILED', status: 'fail' }
                    : test
            ));
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

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint/Target</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Outcome</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Outcome</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tests.map((test, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{test.testName}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{test.endpoint}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{test.expectedOutcome}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        test.status === 'testing' ? 'bg-blue-100 text-blue-800' :
                                        test.status === 'success' ? 'bg-green-100 text-green-800' :
                                        test.status === 'fail' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {test.status === 'testing' && 'Testing...'}
                                        {test.status === 'success' && test.actualOutcome}
                                        {test.status === 'fail' && test.actualOutcome}
                                        {test.status === 'pending' && '-'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        test.status === 'success' ? 'bg-green-100 text-green-800' :
                                        test.status === 'fail' ? 'bg-red-100 text-red-800' :
                                        test.status === 'testing' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {test.status === 'testing' && 'Running'}
                                        {test.status === 'success' && 'SUCCESS'}
                                        {test.status === 'fail' && 'FAILED'}
                                        {test.status === 'pending' && 'Pending'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
