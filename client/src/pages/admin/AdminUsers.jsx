import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { adminAPI } from '../../services/api';
import { setUsers, addUser, updateUser, removeUser } from '../../redux/slices/adminSlice';
import { Users, UserPlus, Edit, Trash2, Search } from 'lucide-react';

const AdminUsers = () => {
    const { users } = useSelector(state => state.admin);
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('patients');
    const [loading, setLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        // Common fields
        name: '',
        email: '',
        password: '',

        // Patient specific fields
        phoneNumber: '',
        nrc: '',
        dateOfBirth: '',
        gender: '',
        address: '',

        // Doctor specific fields
        specialty: 'General Practitioner',

        // Admin specific fields
        role: 'admin',
        isActive: true
    });

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await adminAPI.getUsers(activeTab);
            dispatch(setUsers({ role: activeTab, users: res.data }));
        } catch (err) {
            console.error('Error loading users:', err);
        } finally {
            setLoading(false);
        }
    }, [activeTab, dispatch]);

    const pollUsers = useCallback(async () => {
        try {
            // Silent polling - no loading states
            const res = await adminAPI.getUsers(activeTab);
            dispatch(setUsers({ role: activeTab, users: res.data }));
        } catch (err) {
            // Silent error handling - don't interrupt user experience
            console.debug('Silent user polling failed:', err.message);
        }
    }, [activeTab, dispatch]);

    useEffect(() => {
        loadUsers();
        // Start polling for user data updates (silent)
        const pollInterval = setInterval(pollUsers, 5000); // Poll every 5 seconds

        return () => clearInterval(pollInterval); // Cleanup on unmount
    }, [loadUsers, pollUsers]);

    const handleCreateUser = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const res = await adminAPI.createUser(activeTab, formData);
            dispatch(addUser({ role: activeTab, user: res.data }));
            setShowCreateForm(false);
            resetForm();
            // Immediately refresh data to ensure sync
            await pollUsers();
        } catch (err) {
            console.error('Error creating user:', err);
            alert('Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const res = await adminAPI.updateUser(activeTab, editingUser._id || editingUser.id, formData);
            dispatch(updateUser({ role: activeTab, user: res.data }));
            setEditingUser(null);
            resetForm();
            // Immediately refresh data to ensure sync
            await pollUsers();
        } catch (err) {
            console.error('Error updating user:', err);
            alert('Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;

        try {
            setLoading(true);
            await adminAPI.deleteUser(activeTab, userId);
            dispatch(removeUser({ role: activeTab, userId }));
        } catch (err) {
            console.error('Error deleting user:', err);
            alert('Failed to delete user');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            // Common fields
            name: '',
            email: '',
            password: '',

            // Patient specific fields
            phoneNumber: '',
            nrc: '',
            dateOfBirth: '',
            gender: '',
            address: '',

            // Doctor specific fields
            specialty: '',

            // Admin specific fields
            role: 'admin',
            isActive: true
        });
    };

    const startEdit = (user) => {
        setEditingUser(user);
        setFormData({
            // Common fields
            name: user.name || '',
            email: user.email || '',
            password: '',

            // Patient specific fields
            phoneNumber: user.phoneNumber || '',
            nrc: user.nrc || '',
            dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
            gender: user.gender || '',
            address: user.address || '',

            // Doctor specific fields
            specialty: user.specialty,

            // Admin specific fields
            role: user.role || 'admin',
            isActive: user.isActive !== false
        });
    };

    // Ensure users data is an array
    const usersArray = Array.isArray(users[activeTab]) ? users[activeTab] : [];

    const filteredUsers = usersArray.filter(user => {
        if (!user || typeof user !== 'object') return false;

        const nameMatch = user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase());
        const emailMatch = user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const phoneMatch = user.phoneNumber && user.phoneNumber.includes(searchTerm);

        return nameMatch || emailMatch || phoneMatch;
    });

    const tabs = [
        { id: 'patients', label: 'Patients', count: users.patients?.length || 0 },
        { id: 'doctors', label: 'Doctors', count: users.doctors?.length || 0 },
        { id: 'admins', label: 'Admins', count: users.admins?.length || 0 }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center space-x-2"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Add {activeTab.slice(0, -1)}</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="border-b border-gray-200">
                    <nav className="flex">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                                    activeTab === tab.id
                                        ? 'border-purple-500 text-purple-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                </div>

                {/* Users List */}
                <div className="divide-y divide-gray-200">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                            <div key={user._id || user.id} className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">
                                                {user.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                                            {activeTab === 'patients' ? (
                                                <p className="text-sm text-gray-600">{user.phoneNumber || 'No phone number'}</p>
                                            ) : (
                                                <p className="text-sm text-gray-600">{user.email || 'No email'}</p>
                                            )}
                                            {user.phoneNumber && activeTab !== 'patients' && (
                                                <p className="text-sm text-gray-600">{user.phoneNumber}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <span className={`px-2 py-1 text-xs rounded ${
                                            user.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {user.isActive !== false ? 'Active' : 'Inactive'}
                                        </span>
                                        <button
                                            onClick={() => startEdit(user)}
                                            className="p-2 text-gray-400 hover:text-purple-600"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user._id || user.id)}
                                            className="p-2 text-gray-400 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-6 text-center text-gray-500">
                            No users found
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit User Modal */}
            {(showCreateForm || editingUser) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">
                                {editingUser ? 'Edit' : 'Create'} {activeTab.slice(0, -1)}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setEditingUser(null);
                                    resetForm();
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4 max-h-96 overflow-y-auto">
                            {/* Common Fields */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                />
                            </div>

                            {/* Patient Specific Fields */}
                            {activeTab === 'patients' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                        <input
                                            type="tel"
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                            placeholder='+260XXXXXXXXX'
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">NRC (National Registration Card)</label>
                                        <input
                                            type="text"
                                            value={formData.nrc}
                                            onChange={(e) => setFormData({...formData, nrc: e.target.value})}
                                            maxLength={9}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            required
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Must be exactly 9 characters</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={formData.dateOfBirth}
                                            onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                                        <select
                                            value={formData.gender}
                                            onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Address</label>
                                        <textarea
                                            value={formData.address}
                                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                                            rows={3}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Doctor Specific Fields */}
                            {activeTab === 'doctors' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Specialty</label>
                                        <input
                                            type="text"
                                            value={formData.specialty}
                                            onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            placeholder="e.g., General Practitioner, Cardiologist"
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {/* Admin Specific Fields */}
                            {activeTab === 'admins' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Role</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            required
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="moderator">Moderator</option>
                                            <option value="super_admin">Super Admin</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Status</label>
                                        <select
                                            value={formData.isActive}
                                            onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            required
                                        >
                                            <option value={true}>Active</option>
                                            <option value={false}>Inactive</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Password Field (only for creating new users) */}
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Password</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        required
                                    />
                                </div>
                            )}

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400"
                                >
                                    {loading ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setEditingUser(null);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
