import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { prescriptionAPI } from '../../services/api';
import { setPrescriptions } from '../../redux/slices/prescriptionSlice';

const PatientPrescriptions = () => {
    const { prescriptions } = useSelector(state => state.prescription);
    const dispatch = useDispatch();
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [loading, setLoading] = useState(false);

    // Ensure data is in array format
    const prescriptionsArray = Array.isArray(prescriptions) ? prescriptions : [];

    useEffect(() => {
        loadPrescriptions();
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

    const handleSendSMS = async (prescriptionId) => {
        if (!window.confirm('Send prescription via SMS?')) return;

        try {
            setLoading(true);
            await prescriptionAPI.sendPrescriptionSMS(prescriptionId);
            alert('Prescription sent via SMS successfully');
        } catch (err) {
            console.error('Error sending SMS:', err);
            alert('Failed to send SMS');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">My Prescriptions</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Prescriptions List */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold">All Prescriptions</h2>
                    </div>

                    <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                        {prescriptionsArray.length > 0 ? (
                            prescriptionsArray.map(prescription => (
                                <div
                                    key={prescription._id || prescription.id}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                                        selectedPrescription?.prescription?._id === prescription._id || selectedPrescription?.prescription?.id === prescription.id ? 'bg-blue-50' : ''
                                    }`}
                                    onClick={() => handleViewPrescription(prescription._id || prescription.id)}
                                >
                                    <div className="flex items-center justify-between">
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
                                        <div className="text-right">
                                            <span className={`px-2 py-1 text-xs rounded ${
                                                prescription.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                                prescription.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                                {prescription.status || 'Active'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                No prescriptions found
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
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {selectedPrescription.prescription?.medications?.[0]?.name || 'Unknown Medication'}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Prescribed by Dr. {selectedPrescription.prescription?.doctor?.name || 'Unknown Doctor'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {selectedPrescription.prescription?.createdAt ? new Date(selectedPrescription.prescription.createdAt).toLocaleDateString() : 'Date not set'}
                                    </p>
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

                                <div className="border-t pt-4 flex space-x-3">
                                    <button
                                        onClick={() => handleSendSMS(selectedPrescription.prescription?._id || selectedPrescription.prescription?.id)}
                                        disabled={loading}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                                    >
                                        Send via SMS
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                                    >
                                        Print
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500">
                                Select a prescription to view details
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientPrescriptions;
