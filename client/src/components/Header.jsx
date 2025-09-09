import { useContext } from 'react';
import { AuthContext } from '../App';
import { FiLogOut } from 'react-icons/fi';

const Header = () => {
    const { logout } = useContext(AuthContext);
    return (
        <header className="bg-white shadow-md p-4 flex items-center justify-between z-10">
            <h1 className="text-xl font-bold text-gray-800">Telemedicine Dashboard</h1>
            <button
                onClick={logout}
                className="flex items-center px-4 py-2 font-medium text-sm text-red-600 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none"
            >
                <FiLogOut className="mr-2" />
                Logout
            </button>
        </header>
    );
};

export default Header;