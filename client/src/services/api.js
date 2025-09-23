import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

// Auth endpoints for all roles
export const authAPI = {
    // Patient auth
    patientLogin: (credentials) => api.post('/auth/login/patient', credentials),
    patientRegister: (data) => api.post('/auth/register/patient', data),
    patientSetPassword: (data) => api.post('/auth/patient/set-password', data),
    patientStatus: () => api.get('/auth/patient/status'),

    // Doctor auth
    doctorLogin: (credentials) => api.post('/auth/doctor/login', credentials),
    doctorStatus: () => api.get('/auth/doctor/status'),

    // Admin auth
    adminLogin: (credentials) => api.post('/auth/admin/login', credentials),
    adminStatus: () => api.get('/auth/admin/status'),

    // Common
    logout: () => api.post('/auth/logout'),
};

// Consultation endpoints
export const consultationAPI = {
    // Patient endpoints
    getPatientConsultations: () => api.get('/consultations/patient'),
    bookConsultation: (data) => api.post('/consultations/book', data),
    cancelConsultation: (id) => api.patch(`/consultations/${id}/cancel`),
    rescheduleConsultation: (id, data) => api.patch(`/consultations/${id}/reschedule`, data),
    sendPatientMessage: (id, content) => api.post(`/consultations/${id}/messages`, { content }),

    // Doctor endpoints
    getDoctorConsultations: () => api.get('/consultations'),
    sendDoctorMessage: (id, content) => api.post(`/consultations/${id}/doctor/messages`, { content }),
    completeConsultation: (id) => api.patch(`/consultations/${id}/complete`),

    // Common
    getConsultation: (id) => api.get(`/consultations/${id}`),
    getConsultationMessages: (id) => api.get(`/consultations/${id}/messages`),
};

// Prescription endpoints
export const prescriptionAPI = {
    // Patient endpoints
    getPatientPrescriptions: () => api.get('/prescriptions'),
    getPrescription: (id) => api.get(`/prescriptions/${id}`),

    // Doctor endpoints
    getDoctorPrescriptions: () => api.get('/prescriptions'),
    createPrescription: (data) => api.post('/prescriptions', data),
    updatePrescription: (id, data) => api.put(`/prescriptions/${id}`, data),
    deletePrescription: (id) => api.delete(`/prescriptions/${id}`),
    sendPrescriptionSMS: (id) => api.post(`/prescriptions/${id}/send-sms`),
};

// Doctor endpoints
export const doctorAPI = {
    getAvailableDoctors: () => api.get('/doctors/available'),
    getDoctorAvailability: (doctorId, date) => api.get(`/doctors/${doctorId}/availability${date ? `?date=${date}` : ''}`),
    getDoctorProfile: () => api.get('/doctors/profile'),
};

// Admin endpoints
export const adminAPI = {
    getDashboard: () => api.get('/admin/dashboard'),
    getUsers: (role) => {
        switch (role) {
            case 'patients':
                return api.get('/admin/patients').then(res => ({ ...res, data: res.data.patients }));
            case 'doctors':
                return api.get('/admin/doctors').then(res => ({ ...res, data: res.data.doctors }));
            case 'admins':
                return api.get('/admin/admins').then(res => ({ ...res, data: res.data.admins }));
            default:
                throw new Error(`Invalid role: ${role}`);
        }
    },
    createUser: (role, data) => {
        switch (role) {
            case 'patients':
                return api.post('/admin/patients', data);
            case 'doctors':
                return api.post('/admin/doctors', data);
            case 'admins':
                return api.post('/admin/admins', data);
            default:
                throw new Error(`Invalid role: ${role}`);
        }
    },
    updateUser: (role, id, data) => {
        switch (role) {
            case 'patients':
                return api.put(`/admin/patients/${id}`, data);
            case 'doctors':
                return api.put(`/admin/doctors/${id}`, data);
            case 'admins':
                return api.put(`/admin/admins/${id}`, data);
            default:
                throw new Error(`Invalid role: ${role}`);
        }
    },
    deleteUser: (role, id) => {
        switch (role) {
            case 'patients':
                return api.delete(`/admin/patients/${id}`);
            case 'doctors':
                return api.delete(`/admin/doctors/${id}`);
            case 'admins':
                return api.delete(`/admin/admins/${id}`);
            default:
                throw new Error(`Invalid role: ${role}`);
        }
    },
    getDoctors: () => api.get('/admin/doctors'),
    getDoctor: (id) => api.get(`/admin/doctors/${id}`),
    createDoctor: (data) => api.post('/admin/doctors', data),
    updateDoctor: (id, data) => api.put(`/admin/doctors/${id}`, data),
    deleteDoctor: (id) => api.delete(`/admin/doctors/${id}`),
    getPatients: () => api.get('/admin/patients'),
    getPatient: (id) => api.get(`/admin/patients/${id}`),
    createPatient: (data) => api.post('/admin/patients', data),
    updatePatient: (id, data) => api.put(`/admin/patients/${id}`, data),
    deletePatient: (id) => api.delete(`/admin/patients/${id}`),
    getAdmins: () => api.get('/admin/admins'),
    getAdmin: (id) => api.get(`/admin/admins/${id}`),
    createAdmin: (data) => api.post('/admin/admins', data),
    updateAdmin: (id, data) => api.put(`/admin/admins/${id}`, data),
    deleteAdmin: (id) => api.delete(`/admin/admins/${id}`),
};

export const setAuthToken = token => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export default api;
