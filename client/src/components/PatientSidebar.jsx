import React from 'react';
import { Home, Calendar, FileText, MessageCircle, History, Heart } from 'lucide-react';

const PatientSidebar = ({ activeView, setActiveView }) => {
    const menuItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: Home,
        },
        {
            id: 'appointments',
            label: 'Appointments',
            icon: Calendar,
        },
        {
            id: 'prescriptions',
            label: 'Prescriptions',
            icon: FileText,
        },
        {
            id: 'medical-history',
            label: 'Medical History',
            icon: Heart,
        },
        {
            id: 'history',
            label: 'History',
            icon: History,
        },
        {
            id: 'chat',
            label: 'Messages',
            icon: MessageCircle,
        },
    ];

    return (
        <div className="w-64 bg-white shadow-sm border-r border-gray-200">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900">Patient Portal</h2>
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
                                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
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

export default PatientSidebar;
