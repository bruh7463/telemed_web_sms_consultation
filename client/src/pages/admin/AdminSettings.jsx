import { useState } from 'react';
import { Settings, Shield, Bell, Database, Mail } from 'lucide-react';

const AdminSettings = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'system', label: 'System', icon: Database },
    ];

    const handleSaveSettings = async () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            alert('Settings saved successfully!');
        }, 1000);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">System Name</label>
                                    <input
                                        type="text"
                                        defaultValue="Telemedicine Portal"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Default Language</label>
                                    <select className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                        <option>English</option>
                                        <option>Spanish</option>
                                        <option>French</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Timezone</label>
                                    <select className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                        <option>UTC</option>
                                        <option>America/New_York</option>
                                        <option>Europe/London</option>
                                        <option>Asia/Tokyo</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'security':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                                    <input
                                        type="number"
                                        defaultValue="30"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Password Policy</label>
                                    <div className="mt-2 space-y-2">
                                        <label className="flex items-center">
                                            <input type="checkbox" defaultChecked className="mr-2" />
                                            Require minimum 8 characters
                                        </label>
                                        <label className="flex items-center">
                                            <input type="checkbox" defaultChecked className="mr-2" />
                                            Require special characters
                                        </label>
                                        <label className="flex items-center">
                                            <input type="checkbox" className="mr-2" />
                                            Require 2FA for admins
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Login Attempts</label>
                                    <input
                                        type="number"
                                        defaultValue="5"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Maximum failed login attempts before account lockout</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'notifications':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Email Notifications</h4>
                                    <div className="space-y-2">
                                        <label className="flex items-center">
                                            <input type="checkbox" defaultChecked className="mr-2" />
                                            New user registrations
                                        </label>
                                        <label className="flex items-center">
                                            <input type="checkbox" defaultChecked className="mr-2" />
                                            System alerts
                                        </label>
                                        <label className="flex items-center">
                                            <input type="checkbox" className="mr-2" />
                                            Weekly reports
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">SMS Notifications</h4>
                                    <div className="space-y-2">
                                        <label className="flex items-center">
                                            <input type="checkbox" defaultChecked className="mr-2" />
                                            Appointment reminders
                                        </label>
                                        <label className="flex items-center">
                                            <input type="checkbox" defaultChecked className="mr-2" />
                                            Prescription notifications
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Admin Email</label>
                                    <input
                                        type="email"
                                        defaultValue="admin@telemed.com"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'system':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">System Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Database</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                            <span className="text-sm text-gray-600">Database Size</span>
                                            <span className="text-sm font-medium">2.4 GB</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                            <span className="text-sm text-gray-600">Last Backup</span>
                                            <span className="text-sm font-medium">2025-01-15 14:30</span>
                                        </div>
                                    </div>
                                    <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                        Create Backup
                                    </button>
                                </div>

                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">API Settings</h4>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">API Rate Limit</label>
                                            <input
                                                type="number"
                                                defaultValue="1000"
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Requests per hour</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Maintenance</h4>
                                    <div className="space-y-2">
                                        <button className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700">
                                            Clear Cache
                                        </button>
                                        <button className="ml-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                                            Reset System
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
                <button
                    onClick={handleSaveSettings}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400"
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border">
                <div className="border-b border-gray-200">
                    <nav className="flex">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center space-x-2 ${
                                        activeTab === tab.id
                                            ? 'border-purple-500 text-purple-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-6">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
