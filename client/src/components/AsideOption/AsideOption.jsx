import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAsideEvent } from '../../redux/slices/appSlice';

function AsideOption({ name, linkId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const routes = {
    'Profile': `/dashboard/profile/${linkId}`,
    'History': '/dashboard/history',
    'Consult': '/dashboard/consult'
  };

  const handleClick = () => {
    dispatch(setAsideEvent(name));
    navigate(routes[name]);
  };

  const isSelected = location.pathname.includes(routes[name]?.split('/')[2] || '');

  return (
    <span
      className={`rounded-xl px-5 py-3 text-base font-medium cursor-pointer flex items-center gap-2.5 transition-all duration-200 text-primary-font hover:text-primary-purple hover:bg-primary-purple/10 ${
        isSelected ? 'text-white bg-primary-purple hover:text-white' : ''
      }`}
      onClick={handleClick}
    >
      {name}
    </span>
  );
}

export default AsideOption;
