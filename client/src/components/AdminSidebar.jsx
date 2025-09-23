import React from 'react';
import { Home, Users, Settings, BarChart3 } from 'lucide-react';

const AdminSidebar = ({ activeView, setActiveView }) => {
    const menuItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: Home,
        },
        {
            id: 'users',
            label: 'User Management',
            icon: Users,
        },
        {
            id: 'analytics',
            label: 'Analytics',
            icon: BarChart3,
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
        },
    ];

    return (
        <div className="w-64 bg-white shadow-sm border-r border-gray-200">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900">Admin Portal</h2>
            </div>

            <nav className="px-4 pb-4">
                <ul className="space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeView === item.id;

                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => setActiveView(item.id)}
                                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150 ${
                                        isActive
                                            ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-700'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <Icon className="w-5 h-5 mr-3" />
                                    {item.label}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
};

export default AdminSidebar;
