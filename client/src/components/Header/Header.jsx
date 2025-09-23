import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setAsideEvent } from '../../redux/slices/appSlice';

function Header() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userData = useSelector(state => state.appEvents.userData);

  const navigator = {
    home: '/dashboard',
    info: `/user/health-data/${userData?.id || ''}`
  };

  function handleNav(path) {
    dispatch(setAsideEvent(''));
    navigate(navigator[path]);
  }

  function handleLogout() {
    // Clear any stored data and redirect to login
    localStorage.clear();
    navigate('/login');
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">Telemedicine Portal</h1>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleNav('home')}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Home
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
