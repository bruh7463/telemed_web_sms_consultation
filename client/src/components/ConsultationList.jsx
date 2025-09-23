import { useSelector } from 'react-redux';

const ConsultationList = ({ onSelectConsultation, selectedConsultationId, loading }) => {
    const consultations = useSelector(state => state.consult.consultations);
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

    return (
        <div className="w-full max-w-sm border-r border-gray-200 bg-white flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-200">
                 <h2 className="text-lg font-semibold text-primary-font">My Consultations</h2>
            </div>
            {loading ? <p className="p-5 text-center text-gray-600">Loading...</p> : (
                 <ul className="list-none m-0 p-0 overflow-y-auto flex-1">
                   {consultations.length > 0 ? consultations.map(c => (
                        <li key={c._id} onClick={() => onSelectConsultation(c)}
                            className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                selectedConsultationId === c._id ? 'bg-primary-purple text-white border-l-4 border-primary-purple-light' : ''
                            }`}>
                            <div className="flex justify-between items-center mb-2">
                               <p className={`font-semibold text-base ${selectedConsultationId === c._id ? 'text-white' : 'text-primary-font'}`}>
                                   {c.patient?.name || 'Unknown Patient'}
                               </p>
                               <span className={`px-2 py-1 text-xs rounded-full font-medium uppercase ${
                                   c.status?.toLowerCase() === 'pending' ? 'bg-status-warning/20 text-status-warning' :
                                   c.status?.toLowerCase() === 'active' ? 'bg-status-success/20 text-status-success' :
                                   c.status?.toLowerCase() === 'completed' ? 'bg-blue-100 text-blue-800' :
                                   'bg-gray-100 text-gray-800'
                               }`}>
                                   {c.status || 'Unknown'}
                               </span>
                            </div>
                            <p className={`text-sm mb-1 ${selectedConsultationId === c._id ? 'text-white' : 'text-gray-600'}`}>
                                {c.bookingReason || 'No reason provided'}
                            </p>
                            <p className={`text-xs ${selectedConsultationId === c._id ? 'text-white/70' : 'text-gray-500'}`}>
                                {formatDate(c.createdAt)}
                            </p>
                        </li>
                   )) : <p className="p-5 text-center text-gray-500">No consultations found.</p>}
                </ul>
            )}
        </div>
    );
};

export default ConsultationList;
