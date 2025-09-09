import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Your backend URL
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

export const setAuthToken = token => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export default api;