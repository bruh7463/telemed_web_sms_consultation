import React from 'react';
import { useSelector } from 'react-redux';
import AsideOption from '../AsideOption/AsideOption';

function Aside() {
  const userData = useSelector(state => state.appEvents.userData);
  const options = ['Perfil', 'Historia', 'Consulta'];

  return (
    <aside className="flex flex-col p-5 bg-white border-r border-gray-200 min-w-64">
      <span className="text-lg font-semibold mb-5 text-primary-font">Menu</span>
      <div className="flex flex-col gap-2.5 overflow-hidden">
        {options.map(option =>
          <AsideOption
            name={option}
            key={option}
            linkId={userData?.id}
          />
        )}
      </div>
    </aside>
  );
}

export default Aside;
