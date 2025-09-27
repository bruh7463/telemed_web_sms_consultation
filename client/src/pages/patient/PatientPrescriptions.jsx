import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { prescriptionAPI } from '../../services/api';
import { setPrescriptions } from '../../redux/slices/prescriptionSlice';
import { Pill, Clock, CheckCircle, XCircle } from 'lucide-react';

const PatientPrescriptions = () => {
    const { prescriptions } = useSelector(state => state.prescription);
    const dispatch = useDispatch();
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [activeTab, setActiveTab] = useState('active');
    const [loading, setLoading] = useState(false);

    // Ensure data is in array format
    const prescriptionsArray = Array.isArray(prescriptions) ? prescriptions : [];

    // Categorize prescriptions by status
    const activePrescriptions = prescriptionsArray.filter(p => p.status === 'ACTIVE');
    const completedPrescriptions = prescriptionsArray.filter(p => p.status === 'COMPLETED');
    const cancelledPrescriptions = prescriptionsArray.filter(p => p.status === 'CANCELLED');

    useEffect(() => {
        loadPrescriptions();
        // Start polling for prescription updates (silent)
        const pollInterval = setInterval(pollPrescriptions, 15000); // Poll every 15 seconds

        return () => clearInterval(pollInterval); // Cleanup on unmount
    }, []);

    const loadPrescriptions = async () => {
        try {
            console.log('Loading patient prescriptions...');
            setLoading(true);
            const res = await prescriptionAPI.getPatientPrescriptions();
            console.log('Patient prescriptions API response:', res);
            console.log('Patient prescriptions data:', res.data);
            // Handle both direct array and wrapped object response
            const prescriptionsData = res.data.prescriptions || res.data || [];
            console.log('Patient prescriptions to dispatch:', prescriptionsData);
            console.log('Number of patient prescriptions found:', prescriptionsData.length);
            dispatch(setPrescriptions(prescriptionsData));
        } catch (err) {
            console.error('Error loading patient prescriptions:', err);
            console.error('Error response:', err.response);
            console.error('Error status:', err.response?.status);
            console.error('Error message:', err.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const pollPrescriptions = async () => {
        try {
            // Silent polling - no loading states or user interruption
            const res = await prescriptionAPI.getPatientPrescriptions();
            const prescriptionsData = res.data.prescriptions || res.data || [];
            dispatch(setPrescriptions(prescriptionsData));
        } catch (err) {
            // Silent error handling - don't interrupt user experience
            console.debug('Silent prescription polling failed:', err.message);
        }
    };

    const handleViewPrescription = async (prescriptionId) => {
        try {
            setLoading(true);
            const res = await prescriptionAPI.getPrescription(prescriptionId);
            setSelectedPrescription(res.data);
        } catch (err) {
            console.error('Error fetching prescription:', err);
            alert('Failed to load prescription details');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        if (!selectedPrescription) return;

        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=600');

        // Get prescription data
        const prescription = selectedPrescription.prescription;
        const medications = prescription?.medications || [];

        // Create print content
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prescription - ${prescription?.medications?.[0]?.name || 'Prescription'}</title>
                <style>
                    body {
                        font-family: 'Arial', sans-serif;
                        margin: 20px;
                        line-height: 1.6;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #333;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .prescription-title {
                        font-size: 24px;
                        font-weight: bold;
                        color: #333;
                        margin-bottom: 10px;
                    }
                    .doctor-info {
                        font-size: 16px;
                        color: #666;
                        margin-bottom: 5px;
                    }
                    .date-info {
                        font-size: 14px;
                        color: #888;
                    }
                    .section {
                        margin-bottom: 20px;
                    }
                    .section-title {
                        font-size: 18px;
                        font-weight: bold;
                        color: #333;
                        margin-bottom: 10px;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 5px;
                    }
                    .medication-item {
                        margin-bottom: 15px;
                        padding: 10px;
                        border: 1px solid #eee;
                        border-radius: 5px;
                    }
                    .medication-name {
                        font-size: 16px;
                        font-weight: bold;
                        color: #333;
                        margin-bottom: 5px;
                    }
                    .medication-detail {
                        margin: 3px 0;
                        font-size: 14px;
                    }
                    .status-badge {
                        display: inline-block;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    .status-active {
                        background-color: #d4edda;
                        color: #155724;
                    }
                    .status-completed {
                        background-color: #cce5ff;
                        color: #004085;
                    }
                    .status-cancelled {
                        background-color: #f8d7da;
                        color: #721c24;
                    }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="prescription-title">
                        ${prescription?.medications?.[0]?.name || 'Prescription'}
                        <span class="status-badge status-${prescription?.status?.toLowerCase() || 'active'}">
                            ${prescription?.status || 'Active'}
                        </span>
                    </div>
                    <div class="doctor-info">Prescribed by: Dr. ${prescription?.doctor?.name || 'Unknown Doctor'}</div>
                    <div class="date-info">Date: ${prescription?.createdAt ? new Date(prescription.createdAt).toLocaleDateString() : 'Date not set'}</div>
                </div>

                <div class="section">
                    <div class="section-title">Medications</div>
                    ${medications.map((med, index) => `
                        <div class="medication-item">
                            <div class="medication-name">${index + 1}. ${med.name}</div>
                            <div class="medication-detail"><strong>Dosage:</strong> ${med.dosage || 'Not specified'}</div>
                            <div class="medication-detail"><strong>Frequency:</strong> ${med.frequency || 'Not specified'}</div>
                            <div class="medication-detail"><strong>Duration:</strong> ${med.duration || 'Not specified'}</div>
                            ${med.instructions ? `<div class="medication-detail"><strong>Instructions:</strong> ${med.instructions}</div>` : ''}
                        </div>
                    `).join('')}
                </div>

                ${prescription?.diagnosis ? `
                    <div class="section">
                        <div class="section-title">Diagnosis</div>
                        <p>${prescription.diagnosis}</p>
                    </div>
                ` : ''}

                ${prescription?.notes ? `
                    <div class="section">
                        <div class="section-title">Notes</div>
                        <p>${prescription.notes}</p>
                    </div>
                ` : ''}

                ${prescription?.allergies ? `
                    <div class="section">
                        <div class="section-title">Allergies</div>
                        <p>${prescription.allergies}</p>
                    </div>
                ` : ''}

                <div class="section">
                    <p style="font-size: 12px; color: #666; text-align: center; margin-top: 40px;">
                        Please follow the medication instructions carefully. Contact your doctor if you experience any side effects.
                    </p>
                </div>
            </body>
            </html>
        `;

        // Write content to print window
        printWindow.document.write(printContent);
        printWindow.document.close();

        // Wait for content to load then print
        printWindow.onload = () => {
            printWindow.print();
            printWindow.close();
        };
    };

    const getCurrentPrescriptions = () => {
        switch (activeTab) {
            case 'active':
                return activePrescriptions;
            case 'completed':
                return completedPrescriptions;
            case 'cancelled':
                return cancelledPrescriptions;
            default:
                return activePrescriptions;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'ACTIVE':
                return <Pill className="w-4 h-4 text-green-600" />;
            case 'COMPLETED':
                return <CheckCircle className="w-4 h-4 text-blue-600" />;
            case 'CANCELLED':
                return <XCircle className="w-4 h-4 text-red-600" />;
            default:
                return <Pill className="w-4 h-4 text-gray-600" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800';
            case 'COMPLETED':
                return 'bg-blue-100 text-blue-800';
            case 'CANCELLED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const tabs = [
        { id: 'active', label: 'Active', count: activePrescriptions.length, icon: Pill },
        { id: 'completed', label: 'Completed', count: completedPrescriptions.length, icon: CheckCircle },
        { id: 'cancelled', label: 'Cancelled', count: cancelledPrescriptions.length, icon: XCircle },
    ];

    const currentPrescriptions = getCurrentPrescriptions();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Pill className="mr-3 text-blue-600" />
                    My Prescriptions
                </h1>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <div key={tab.id} className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{tab.label}</p>
                                    <p className="text-2xl font-bold text-gray-900">{tab.count}</p>
                                </div>
                                <Icon className="w-8 h-8 text-gray-400" />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Prescriptions List with Tabs */}
                <div className="bg-white rounded-lg shadow-sm border">
                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="flex">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-4 text-sm font-medium border-b-2 flex items-center space-x-2 ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span>{tab.label} ({tab.count})</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Prescriptions List */}
                    <div className="max-h-96 overflow-y-auto">
                        {currentPrescriptions.length > 0 ? (
                            <div className="divide-y divide-gray-200">
                                {currentPrescriptions.map(prescription => (
                                    <div
                                        key={prescription._id || prescription.id}
                                        className={`p-4 cursor-pointer hover:bg-gray-50 ${
                                            selectedPrescription?.prescription?._id === prescription._id ||
                                            selectedPrescription?.prescription?.id === prescription.id
                                                ? 'bg-blue-50'
                                                : ''
                                        }`}
                                        onClick={() => handleViewPrescription(prescription._id || prescription.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                {getStatusIcon(prescription.status)}
                                                <div>
                                                    <h3 className="text-lg font-medium text-gray-900">
                                                        {prescription.medications?.[0]?.name || 'Unknown Medication'}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        Dr. {prescription.doctor?.name || 'Unknown Doctor'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {prescription.createdAt ? new Date(prescription.createdAt).toLocaleDateString() : 'Date not set'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(prescription.status)}`}>
                                                    {prescription.status || 'Active'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                <div className="flex flex-col items-center space-y-2">
                                    {(() => {
                                        const currentTab = tabs.find(tab => tab.id === activeTab);
                                        const IconComponent = currentTab?.icon;
                                        return IconComponent && <IconComponent className="w-12 h-12 text-gray-300" />;
                                    })()}
                                    <p className="text-lg font-medium">No {activeTab} prescriptions</p>
                                    <p className="text-sm">
                                        {activeTab === 'active' && 'You have no active prescriptions at the moment.'}
                                        {activeTab === 'completed' && 'You have no completed prescriptions yet.'}
                                        {activeTab === 'cancelled' && 'You have no cancelled prescriptions.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Prescription Details */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold">Prescription Details</h2>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="text-center text-gray-500">Loading...</div>
                        ) : selectedPrescription ? (
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3">
                                    {getStatusIcon(selectedPrescription.prescription?.status)}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {selectedPrescription.prescription?.medications?.[0]?.name || 'Unknown Medication'}
                                        </h3>
                                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedPrescription.prescription?.status)}`}>
                                            {selectedPrescription.prescription?.status || 'Active'}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600">
                                    Prescribed by Dr. {selectedPrescription.prescription?.doctor?.name || 'Unknown Doctor'}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {selectedPrescription.prescription?.createdAt ? new Date(selectedPrescription.prescription.createdAt).toLocaleDateString() : 'Date not set'}
                                </div>

                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-gray-900 mb-2">Dosage Instructions</h4>
                                    <p className="text-sm text-gray-700">
                                        {selectedPrescription.prescription?.medications?.[0]?.dosage || 'Not specified'}
                                    </p>
                                </div>

                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-gray-900 mb-2">Frequency</h4>
                                    <p className="text-sm text-gray-700">
                                        {selectedPrescription.prescription?.medications?.[0]?.frequency || 'Not specified'}
                                    </p>
                                </div>

                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-gray-900 mb-2">Duration</h4>
                                    <p className="text-sm text-gray-700">
                                        {selectedPrescription.prescription?.medications?.[0]?.duration || 'Not specified'}
                                    </p>
                                </div>

                                {selectedPrescription.prescription?.diagnosis && (
                                    <div className="border-t pt-4">
                                        <h4 className="font-medium text-gray-900 mb-2">Diagnosis</h4>
                                        <p className="text-sm text-gray-700">
                                            {selectedPrescription.prescription.diagnosis}
                                        </p>
                                    </div>
                                )}

                                {selectedPrescription.prescription?.notes && (
                                    <div className="border-t pt-4">
                                        <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                                        <p className="text-sm text-gray-700">
                                            {selectedPrescription.prescription.notes}
                                        </p>
                                    </div>
                                )}

                                {selectedPrescription.prescription?.allergies && (
                                    <div className="border-t pt-4">
                                        <h4 className="font-medium text-gray-900 mb-2">Allergies</h4>
                                        <p className="text-sm text-gray-700">
                                            {selectedPrescription.prescription.allergies}
                                        </p>
                                    </div>
                                )}

                                {selectedPrescription.prescription?.status === 'ACTIVE' && (
                                    <div className="border-t pt-4 flex space-x-3">
                                        <button
                                            onClick={handlePrint}
                                            className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                                        >
                                            Print
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500">
                                <Pill className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                <p className="text-lg font-medium">Select a prescription</p>
                                <p className="text-sm">Click on a prescription from the list to view its details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientPrescriptions;
