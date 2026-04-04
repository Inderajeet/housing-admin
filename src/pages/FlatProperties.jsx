import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import { useApp } from '../App';
import { getFlatLayout, getFlatProperties } from '../api/flat.api';
import { useNavigate } from 'react-router-dom';

const FlatProperties = () => {
  const { setActiveProject } = useApp();
  const navigate = useNavigate();

  const [flats, setFlats]     = useState([]);
  const [loading, setLoading] = useState(true);

  const getStatusClasses = (status) => {
    const normalizedStatus = String(status || '').toLowerCase();

    if (normalizedStatus === 'approved') {
      return 'bg-emerald-100 text-emerald-700';
    }

    if (normalizedStatus === 'pending') {
      return 'bg-red-100 text-red-700';
    }

    return 'bg-gray-100 text-gray-600';
  };

  const fetchFlats = async () => {
    setLoading(true);
    try {
      const data = await getFlatProperties();
      setFlats(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFlats(); }, []);

  const handleOpenEditor = async (p) => {
    try {
      const layoutResponse = await getFlatLayout(p.property_id);
      setActiveProject({
        property_id: p.property_id,
        formatted_id: p.formatted_id,
        layout: layoutResponse.data || [],
      });
      navigate(`/admin/flats/editor/${p.property_id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const columns = [
    { header: 'Property ID', accessor: 'formatted_id' },
    { header: 'Seller Phone', accessor: 'seller_phone' },
    {
      header: 'Status',
      accessor: p => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase
          ${getStatusClasses(p.status)}`}
        >
          {p.status}
        </span>
      ),
    },
    {
      header: 'Units',
      accessor: p => (
        <span className="font-bold text-blue-700">{p.unit_count ?? 0} flats</span>
      ),
    },
    {
      header: 'Created',
      accessor: p => p.created_at?.split('T')[0],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Flat Properties</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest">
            Flat-type layout editor
          </p>
        </div>
      </div>

      {loading ? <Loader /> : (
        <DataTable
          columns={columns}
          data={flats}
          actions={(p) => (
            <button
              onClick={() => handleOpenEditor(p)}
              className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 hover:bg-blue-100 uppercase tracking-widest"
            >
              Open Editor
            </button>
          )}
        />
      )}
    </div>
  );
};

export default FlatProperties;
