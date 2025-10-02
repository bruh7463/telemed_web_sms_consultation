import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { adminAPI } from '../../services/api';
import { setDashboard, setUsers } from '../../redux/slices/adminSlice';
import AdminHeader from '../../components/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar';
import AdminOverview from './AdminOverview';
import AdminUsers from './AdminUsers';
import AdminSettings from './AdminSettings';

const AdminDashboard = ({ onLogout }) => {
    const [activeView, setActiveView] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);

    const loadAdminData = useCallback(async () => {
        try {
            setLoading(true);

            // Load dashboard data
            const dashboardRes = await adminAPI.getDashboard();
            dispatch(setDashboard(dashboardRes.data));

            // Load users for each role
            const roles = ['patients', 'doctors', 'admins'];
            for (const role of roles) {
                const usersRes = await adminAPI.getUsers(role);
                dispatch(setUsers({ role, users: usersRes.data }));
            }

        } catch (err) {
            console.error('Error loading admin data:', err);
        } finally {
            setLoading(false);
        }
    }, [dispatch]);

    const pollAdminData = useCallback(async () => {
        try {
            // Silent polling - no loading states

            // Load dashboard data silently
            const dashboardRes = await adminAPI.getDashboard();
            dispatch(setDashboard(dashboardRes.data));

            // Load users for each role silently
            const roles = ['patients', 'doctors', 'admins'];
            for (const role of roles) {
                const usersRes = await adminAPI.getUsers(role);
                dispatch(setUsers({ role, users: usersRes.data }));
            }

        } catch (err) {
            // Silent error handling - don't interrupt user experience
            console.debug('Silent admin data polling failed:', err.message);
        }
    }, [dispatch]);

    useEffect(() => {
        loadAdminData();
        // Start polling for admin data updates (silent)
        const pollInterval = setInterval(pollAdminData, 15000); // Poll every 15 seconds

        return () => clearInterval(pollInterval); // Cleanup on unmount
    }, [loadAdminData, pollAdminData]);

    const renderContent = () => {
        switch (activeView) {
            case 'users':
                return <AdminUsers />;
            case 'settings':
                return <AdminSettings />;
            default:
                return <AdminOverview />;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <AdminSidebar activeView={activeView} setActiveView={setActiveView} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminHeader user={user} onLogout={onLogout} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
