import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { prescriptionAPI, consultationAPI } from '../../services/api';
import { setPrescriptions } from '../../redux/slices/prescriptionSlice';
import { setConsultations } from '../../redux/slices/consultSlice';

const DoctorPrescriptions = () => {
    const { prescriptions } = useSelector(state => state.prescription);
    const { consultations } = useSelector(state => state.consult);
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [formData, setFormData] = useState({
        patientId: '',
        consultationId: '',
        medicationName: '',
        dosage: '',
        frequency: '',
        duration: '',
        diagnosis: '',
        notes: '',
        allergies: ''
    });

    // Ensure data is in array format
    const prescriptionsArray = Array.isArray(prescriptions) ? prescriptions : [];
    const consultationsArray = Array.isArray(consultations) ? consultations : [];

    // Get patients with active consultations
    const activeConsultations = consultationsArray.filter(c => c.status === 'ACTIVE');
    const activeConsultationPatients = activeConsultations.map(consultation => consultation.patient).filter(Boolean);

    // Remove duplicates based on patient ID
    const uniqueActivePatients = activeConsultationPatients.filter((patient, index, self) =>
        index === self.findIndex(p => p._id === patient._id || p.id === patient.id)
    );

    useEffect(() => {
        loadPrescriptions();
        loadConsultations();
    }, []);

    const loadConsultations = async () => {
        try {
            console.log('Loading consultations...');
            const res = await consultationAPI.getDoctorConsultations();
            console.log('Consultations loaded:', res.data);
            dispatch(setConsultations(res.data));
        } catch (err) {
            console.error('Error loading consultations:', err);
        }
    };

    const loadPrescriptions = async () => {
        try {
            console.log('Loading prescriptions...');
            setLoading(true);
            const res = await prescriptionAPI.getDoctorPrescriptions();
            console.log('Prescriptions API response:', res);
            console.log('Prescriptions data:', res.data);
            // Handle both direct array and wrapped object response
            const prescriptionsData = res.data.prescriptions || res.data || [];
            console.log('Prescriptions to dispatch:', prescriptionsData);
            console.log('Number of prescriptions found:', prescriptionsData.length);
            dispatch(setPrescriptions(prescriptionsData));
            console.log('Prescriptions dispatched to Redux');
        } catch (err) {
            console.error('Error loading prescriptions:', err);
            console.error('Error response:', err.response);
            console.error('Error status:', err.response?.status);
            console.error('Error message:', err.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePrescription = async (e) => {
        e.preventDefault();

        console.log('Form data being submitted:', formData);

        try {
            setLoading(true);

            // Validate required fields
            if (!formData.patientId) {
                alert('Please select a patient');
                return;
            }
            if (!formData.medicationName || !formData.dosage || !formData.frequency || !formData.duration) {
                alert('Please fill in all medication details');
                return;
            }

            // Transform form data to match backend expectations
            const prescriptionData = {
                patientId: formData.patientId,
                consultationId: formData.consultationId || undefined,
                medications: [{
                    name: formData.medicationName,
                    dosage: formData.dosage,
                    frequency: formData.frequency,
                    duration: formData.duration
                }],
                diagnosis: formData.diagnosis || undefined,
                notes: formData.notes || undefined,
                allergies: formData.allergies || undefined
            };

            console.log('Sending prescription data:', prescriptionData);

            const response = await prescriptionAPI.createPrescription(prescriptionData);
            console.log('Prescription created successfully:', response);

            await loadPrescriptions();
            setShowCreateForm(false);
            setFormData({
                patientId: '',
                consultationId: '',
                medicationName: '',
                dosage: '',
                frequency: '',
                duration: '',
                diagnosis: '',
                notes: '',
                allergies: ''
            });

            alert('Prescription created successfully!');
        } catch (err) {
            console.error('Error creating prescription:', err);
            console.error('Error response:', err.response);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to create prescription. Please try again.';
            alert(`Error: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePrescription = async (prescriptionId, updates) => {
        try {
            setLoading(true);
            await prescriptionAPI.updatePrescription(prescriptionId, updates);
            await loadPrescriptions();
        } catch (err) {
            console.error('Error updating prescription:', err);
            alert('Failed to update prescription');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePrescription = async (prescriptionId) => {
        if (!window.confirm('Are you sure you want to delete this prescription?')) return;

        try {
            setLoading(true);
            await prescriptionAPI.deletePrescription(prescriptionId);
            await loadPrescriptions();
        } catch (err) {
            console.error('Error deleting prescription:', err);
            alert('Failed to delete prescription');
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
                <h1 className="text-3xl font-bold text-gray-900">Prescription Management</h1>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                    Create Prescription
                </button>
            </div>

            {/* Create Prescription Form */}
            {showCreateForm && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Create New Prescription</h2>
                        <button
                            onClick={() => setShowCreateForm(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleCreatePrescription} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Select Patient (Active Consultations Only)</label>
                                <select
                                    value={formData.patientId}
                                    onChange={(e) => {
                                        const selectedPatientId = e.target.value;
                                        setFormData({
                                            ...formData,
                                            patientId: selectedPatientId,
                                            consultationId: '' // Reset consultation when patient changes
                                        });
                                    }}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                >
                                    <option value="">Choose a patient...</option>
                                    {uniqueActivePatients.map(patient => (
                                        <option key={patient._id || patient.id} value={patient._id || patient.id}>
                                            {patient.name || 'Unknown Patient'}
                                        </option>
                                    ))}
                                </select>
                                {uniqueActivePatients.length === 0 && (
                                    <p className="text-sm text-amber-600 mt-1">
                                        No patients with active consultations available
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Select Consultation (Optional)</label>
                                <select
                                    value={formData.consultationId}
                                    onChange={(e) => setFormData({...formData, consultationId: e.target.value})}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    disabled={!formData.patientId}
                                >
                                    <option value="">Choose a consultation...</option>
                                    {activeConsultations
                                        .filter(consultation => consultation.patient._id === formData.patientId || consultation.patient.id === formData.patientId)
                                        .map(consultation => (
                                            <option key={consultation._id || consultation.id} value={consultation._id || consultation.id}>
                                                {new Date(consultation.scheduledStart).toLocaleDateString()} - {consultation.bookingReason || 'No reason specified'}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Medication Name</label>
                                <input
                                    type="text"
                                    value={formData.medicationName}
                                    onChange={(e) => setFormData({...formData, medicationName: e.target.value})}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
                                <input
                                    type="text"
                                    value={formData.diagnosis}
                                    onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                                    placeholder="e.g., Common cold"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Dosage</label>
                                <input
                                    type="text"
                                    value={formData.dosage}
                                    onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                                    placeholder="e.g., 500mg"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Frequency</label>
                                <input
                                    type="text"
                                    value={formData.frequency}
                                    onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                                    placeholder="e.g., 3 times daily"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Duration</label>
                                <input
                                    type="text"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                                    placeholder="e.g., 7 days"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    rows={3}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Allergies</label>
                                <textarea
                                    value={formData.allergies}
                                    onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                                    rows={3}
                                    placeholder="e.g., Penicillin, Shellfish"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400"
                            >
                                {loading ? 'Creating...' : 'Create Prescription'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Prescriptions List */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold">Prescriptions Issued</h2>
                </div>

                <div className="divide-y divide-gray-200">
                    {prescriptionsArray.length > 0 ? (
                        prescriptionsArray.map(prescription => (
                            <div key={prescription._id || prescription.id} className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <h3 className="text-lg font-medium text-gray-900">
                                                {prescription.medications?.[0]?.name || 'Unknown Medication'}
                                            </h3>
                                            <span className={`px-2 py-1 text-xs rounded ${
                                                prescription.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                                prescription.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                                {prescription.status || 'Active'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Patient: {prescription.patient?.name || 'Unknown Patient'}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Dosage: {prescription.medications?.[0]?.dosage || 'N/A'} |
                                            Frequency: {prescription.medications?.[0]?.frequency || 'N/A'} |
                                            Duration: {prescription.medications?.[0]?.duration || 'N/A'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Created: {prescription.createdAt ? new Date(prescription.createdAt).toLocaleDateString() : 'Date not set'}
                                        </p>
                                    </div>

                                    <div className="flex space-x-3">
                                        <button
                                            onClick={() => setSelectedPrescription(prescription)}
                                            className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleSendSMS(prescription._id || prescription.id)}
                                            disabled={loading}
                                            className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50"
                                        >
                                            Send SMS
                                        </button>
                                        <button
                                            onClick={() => handleDeletePrescription(prescription._id || prescription.id)}
                                            disabled={loading}
                                            className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50"
                                        >
                                            Delete
                                        </button>
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

            {/* Prescription Details Modal */}
            {selectedPrescription && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Prescription Details</h2>
                            <button
                                onClick={() => setSelectedPrescription(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="font-medium text-gray-900">Medication Information</h3>
                                {selectedPrescription.medications?.map((med, index) => (
                                    <div key={index} className="mb-2 p-2 bg-gray-50 rounded">
                                        <p className="text-sm text-gray-600">Name: {med.name}</p>
                                        <p className="text-sm text-gray-600">Dosage: {med.dosage}</p>
                                        <p className="text-sm text-gray-600">Frequency: {med.frequency}</p>
                                        <p className="text-sm text-gray-600">Duration: {med.duration}</p>
                                        {med.instructions && (
                                            <p className="text-sm text-gray-600">Instructions: {med.instructions}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div>
                                <h3 className="font-medium text-gray-900">Patient Information</h3>
                                <p className="text-sm text-gray-600">Name: {selectedPrescription.patient?.name || 'Unknown Patient'}</p>
                                <p className="text-sm text-gray-600">ID: {selectedPrescription.patient?._id || selectedPrescription.patient?.id || 'N/A'}</p>
                            </div>

                            <div>
                                <h3 className="font-medium text-gray-900">Prescription Details</h3>
                                <p className="text-sm text-gray-600">
                                    Created: {selectedPrescription.createdAt ? new Date(selectedPrescription.createdAt).toLocaleString('en-GB', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    }) : 'Date not set'}
                                </p>
                                <p className="text-sm text-gray-600">Status: {selectedPrescription.status || 'Active'}</p>
                                {selectedPrescription.smsSent && (
                                    <p className="text-sm text-green-600">
                                        SMS Sent: {selectedPrescription.smsSentAt ? new Date(selectedPrescription.smsSentAt).toLocaleString() : 'Yes'}
                                    </p>
                                )}
                            </div>

                            {selectedPrescription.diagnosis && (
                                <div>
                                    <h3 className="font-medium text-gray-900">Diagnosis</h3>
                                    <p className="text-sm text-gray-600">{selectedPrescription.diagnosis}</p>
                                </div>
                            )}

                            {selectedPrescription.notes && (
                                <div>
                                    <h3 className="font-medium text-gray-900">Notes</h3>
                                    <p className="text-sm text-gray-600">{selectedPrescription.notes}</p>
                                </div>
                            )}

                            {selectedPrescription.allergies && (
                                <div>
                                    <h3 className="font-medium text-gray-900">Allergies</h3>
                                    <p className="text-sm text-gray-600">{selectedPrescription.allergies}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorPrescriptions;
