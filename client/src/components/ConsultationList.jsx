const ConsultationList = ({ consultations, onSelectConsultation, selectedConsultationId, loading }) => {
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

    return (
        <div className="w-full md:w-1/3 border-r border-gray-200 bg-white overflow-y-auto">
            <div className="p-4 border-b">
                 <h2 className="text-lg font-semibold">My Consultations</h2>
            </div>
            {loading ? <p className="p-4 text-center text-gray-500">Loading...</p> : (
                 <ul className="divide-y divide-gray-200">
                   {consultations.length > 0 ? consultations.map(c => (
                        <li key={c._id} onClick={() => onSelectConsultation(c)} 
                            className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors duration-150 ${selectedConsultationId === c._id ? 'bg-blue-100 border-l-4 border-blue-500' : ''}`}>
                            <div className="flex justify-between items-center">
                               <p className="font-bold text-gray-800">{c.patient.name}</p>
                               <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ c.status === 'PENDING' ? 'bg-yellow-200 text-yellow-800' : c.status === 'ACTIVE' ? 'bg-green-200 text-green-800' : 'bg-gray-300 text-gray-700' }`}>
                                   {c.status}
                               </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate mt-1">{c.bookingReason}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDate(c.createdAt)}</p>
                        </li>
                   )) : <p className="p-4 text-center text-gray-500">No consultations found.</p>}
                </ul>
            )}
        </div>
    );
};

export default ConsultationList;