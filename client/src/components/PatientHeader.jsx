import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const PatientHeader = ({ user, onLogout }) => {
    const navigate = useNavigate();

    return (
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-semibold text-gray-900">Telemedicine Portal</h1>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                                {user?.name?.charAt(0)?.toUpperCase() || 'P'}
                            </span>
                        </div>
                        <div className="hidden md:block">
                            <p className="text-sm font-medium text-gray-900">{user?.name || 'Patient'}</p>
                            <p className="text-xs text-gray-500">Patient Portal</p>
                        </div>
                    </div>

                    <button
                        onClick={onLogout}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
};

export default PatientHeader;
