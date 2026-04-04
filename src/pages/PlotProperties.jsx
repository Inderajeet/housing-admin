import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import { useApp } from '../App';
import { getPlotLayout } from '../api/plot.api';
import { useNavigate } from 'react-router-dom';

import {
  getPlotProperties
} from '../api/plot.api';

const PlotProperties = () => {
  const { setActiveProject } = useApp();
  const navigate = useNavigate();

  const [plots, setPlots] = useState([]);
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

  // -------------------------
  // Fetch Plot Properties
  // -------------------------
  const fetchPlots = async () => {
    setLoading(true);
    try {
      const data = await getPlotProperties();
      setPlots(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlots();
  }, []);

  const handleOpenEditor = async (p) => {
    try {
      const layoutResponse = await getPlotLayout(p.property_id);
      setActiveProject({
        property_id: p.property_id,
        formatted_id: p.formatted_id,
        layout: layoutResponse.data || []
      });
      navigate(`/admin/plots/editor/${p.property_id}`);
    } catch (e) {
      console.error(e);
    }
  };
  // -------------------------
  // Columns
  // -------------------------
  const columns = [
    { header: 'Property ID', accessor: 'formatted_id' },

    {
      header: 'Seller Phone',
      accessor: 'seller_phone'
    },

    {
      header: 'Status',
      accessor: p => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase
          ${getStatusClasses(p.status)}`}
        >
          {p.status}
        </span>
      )
    },

    {
      header: 'Units',
      accessor: p => (
        <span className="font-bold text-blue-700">
          {p.total_plots ?? 0} plots
        </span>
      ),
    },

    {
      header: 'Created',
      accessor: p => p.created_at?.split('T')[0]
    }
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Plot Properties
          </h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest">
            Plot-type master properties
          </p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Loader text="Loading plot properties..." />
      ) : (
        <DataTable
          columns={columns}
          data={plots}
          actions={(p) => (
            <button
              onClick={() => handleOpenEditor(p)}
              className="px-3 py-1 bg-blue-50 text-blue-600
                text-[10px] font-bold rounded-lg
                border border-blue-100 hover:bg-blue-100
                uppercase tracking-widest"
            >
              Open Editor
            </button>
          )}
        />
      )}

    </div>
  );
};

export default PlotProperties;
