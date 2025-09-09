import { useState, useEffect, createContext } from 'react'; 
import api, { setAuthToken } from '../src/services/api'; 
import LoginPage from '../src/pages/LoginPage'; 
import DashboardPage from '../src/pages/DashboardPage'; 

export const AuthContext = createContext(null);

function App() {
    const [auth, setAuth] = useState({
        token: null, 
        isAuthenticated: null,
        loading: true,
        doctor: null
    });

    // Function to check authentication status with the backend using the cookie
    const checkAuthStatus = async () => {
        try {
            // This endpoint on your backend should check if a valid HTTP-only cookie exists
            // and return user data if authenticated, or a 401 if not.
            // The `api` instance (configured with `withCredentials: true`) will automatically
            // send the HTTP-only cookie.
            const res = await api.get('/auth/status'); // Use imported 'api' directly

            // Backend should return { isAuthenticated: true, doctor: { id: '...' } }
            if (res.data.isAuthenticated) { //
                setAuth({
                    token: 'EXISTS', // Indicate that a session token (cookie) exists
                    isAuthenticated: true, //
                    loading: false, //
                    doctor: res.data.doctor // Get doctor data from backend response
                });
            } else {
                // If backend explicitly says not authenticated (e.g., cookie expired on server)
                // or if it returns 200 but isAuthenticated is false.
                logout(); //
            }
        } catch (err) {
            // Handle cases where the request itself fails (e.g., 401, network error)
            console.error('Error checking auth status:', err.response?.data?.message || err.message);
            logout(); // Treat any error as unauthenticated and ensure state is clear
        }
    };

    const logout = async () => {
        try {
            // This endpoint should clear the HTTP-only cookie on the server-side.
            // `api` instance will automatically send the cookie to be cleared.
            await api.post('/auth/logout'); // Use imported 'api' directly
        } catch (err) {
            console.error('Error logging out:', err);
            // Even if logout API fails, clear client-side state
        } finally {
            setAuthToken(null); // Clear any explicit Authorization header
            setAuth({ token: null, isAuthenticated: false, loading: false, doctor: null }); // Clear local state
        }
    };

    useEffect(() => {
        // On initial load, try to check auth status with the backend
        checkAuthStatus(); //
    }, []);

    // The `login` function now only sends credentials. The token (cookie) is set by the backend.
    const login = async (credentials) => {
        try {
            // When user logs in, send credentials. Backend will set the HTTP-only cookie.
            // The `api` instance (configured with `withCredentials: true`) will automatically
            // handle sending the cookie with subsequent requests.
            const res = await api.post('/auth/login', credentials); // Use imported 'api' directly

            // The backend should return a success message and doctor data, NOT the token.
            // e.g., { message: 'Logged in successfully', doctor: { id: '...' } }
            setAuth({
                token: 'EXISTS', // Placeholder, as we don't hold the token directly
                isAuthenticated: true, //
                loading: false, //
                doctor: res.data.doctor // Get doctor data from backend response
            });

        } catch (err) {
            console.error('Login failed:', err.response ? err.response.data : err.message);
            setAuth({ token: null, isAuthenticated: false, loading: false, doctor: null }); // Clear state on login failure
            throw new Error(err.response?.data?.message || 'Login failed. Please check your credentials.'); // Re-throw for LoginPage to catch
        }
    };

    if (auth.loading) {
        return <div className="flex justify-center items-center h-screen bg-gray-100 font-semibold text-gray-600">Initializing Application...</div>;
    }

    return (
        <AuthContext.Provider value={{ ...auth, login, logout }}>
            <div className="bg-gray-50 min-h-screen">
                {auth.isAuthenticated ? <DashboardPage /> : <LoginPage onLogin={login} />}
            </div>
        </AuthContext.Provider>
    );
}

export default App;