import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';

import {
  getSellers,
  createSeller,
  updateSeller,
  getSellerProperties,
} from '../api/seller.api';

import SaleProperties from './SaleProperties';
import RentProperties from './RentProperties';
import SaleViewModal from '../components/SaleViewModal';

// -------------------------
// Empty Form
// -------------------------
const EMPTY_FORM = {
  seller_id: '',
  name: '',
  phone_number: '',
  alternate_phone: '',
  email: '',
  address: '',
  created_at: '',
};

const normalizeForm = (data = {}) => ({
  ...EMPTY_FORM,
  ...Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v ?? ''])
  ),
});

const Sellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState('add');

  const [sellerProps, setSellerProps] = useState([]);
  const [sellerPropsLoading, setSellerPropsLoading] = useState(false);

  const isReadOnly = mode === 'view';

  // -------------------------
  // Fetch Sellers
  // -------------------------
  const fetchSellers = async () => {
    setLoading(true);
    try {
      const data = await getSellers();
      setSellers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  // -------------------------
  // Seller Properties
  // -------------------------
  const loadSellerProperties = async (sellerId) => {
    setSellerPropsLoading(true);
    try {
      const data = await getSellerProperties(sellerId);
      setSellerProps(Array.isArray(data) ? data : []);
    } finally {
      setSellerPropsLoading(false);
    }
  };

  // -------------------------
  // Modal Handlers
  // -------------------------
  const openAdd = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setMode('add');
    setSellerProps([]);
    setIsModalOpen(true);
  };

  const openEdit = (s) => {
    setSelected(s);
    setForm(normalizeForm(s));
    setMode('edit');
    setIsModalOpen(true);
    loadSellerProperties(s.seller_id);
  };

  const openView = (s) => {
    setSelected(s);
    setForm(normalizeForm(s));
    setMode('view');
    setIsModalOpen(true);
    loadSellerProperties(s.seller_id);
  };

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value ?? '' }));
  };

  const handleSave = async () => {
    if (mode === 'view') return;

    if (!form.name || !form.phone_number) {
      alert('Name and Phone Number are required');
      return;
    }

    if (selected?.seller_id) {
      await updateSeller(selected.seller_id, form);
    } else {
      await createSeller(form);
    }

    await fetchSellers();
    setIsModalOpen(false);
  };

  // -------------------------
  // Table Columns
  // -------------------------
  const columns = [
    { header: 'ID', accessor: 'seller_id' },
    { header: 'Full Name', accessor: 'name', className: 'font-semibold' },
    {
      header: 'Primary Phone',
      accessor: 'phone_number',
      className: 'font-mono'
    },
    {
      header: 'Properties',
      accessor: s => s.property_count ?? 0
    },
    { header: 'Registered On', accessor: s => s.created_at?.split('T')[0] }
  ];

  const sellerPropertyColumns = [
    { header: 'Title', accessor: 'title', className: 'font-semibold' },
    {
      header: 'Type',
      accessor: p => p.property_type.toUpperCase()
    },
    {
      header: 'Amount',
      accessor: p => `₹${Number(p.amount || 0).toLocaleString()}`
    },
    {
      header: 'Status',
      accessor: 'status'
    }
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Sellers Directory
          </h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest">
            Unified Seller Registry
          </p>
        </div>

        <button
          onClick={openAdd}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest"
        >
          Add New Seller
        </button>
      </div>

      {loading ? (
        <Loader text="Loading sellers..." />
      ) : (
        <DataTable
          columns={columns}
          data={sellers}
          onEdit={openEdit}
          onView={openView}
        />
      )}

      {/* Seller Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl overflow-hidden">

            <div className="px-8 py-6 border-b flex justify-between">
              <h3 className="text-xl font-bold">
                {mode === 'add' ? 'New Seller' : mode === 'edit' ? 'Edit Seller' : 'View Seller'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <div className="p-8 space-y-10 max-h-[75vh] overflow-y-auto">

              {/* BASIC INFO */}
              <div className="grid grid-cols-2 gap-8">
                {[
                  ['name', 'Full Name'],
                  ['phone_number', 'Primary Phone'],
                  ['alternate_phone', 'Alternate Phone'],
                  ['email', 'Email'],
                ].map(([key, label]) => (
                  <div key={key} className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest">
                      {label}
                    </label>
                    <input
                      disabled={isReadOnly }
                      value={form[key]}
                      onChange={e => handleChange(key, e.target.value)}
                      className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold"
                    />
                  </div>
                ))}

                <div className="flex flex-col space-y-2 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest">
                    Address
                  </label>
                  <textarea
                    disabled={isReadOnly}
                    value={form.address}
                    onChange={e => handleChange('address', e.target.value)}
                    rows={3}
                    className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold resize-none"
                  />
                </div>
              </div>

              {/* PROPERTIES */}
              {(mode === 'edit' || mode === 'view') && (
                <div className="pt-8 border-t space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-gray-700">
                    Properties by this Seller
                  </h4>

                  {sellerPropsLoading ? (
                    <Loader text="Loading seller properties..." />
                  ) : sellerProps.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      No properties found
                    </p>
                  ) : (
                    <DataTable
                      columns={sellerPropertyColumns}
                      data={sellerProps}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="px-8 py-6 border-t flex justify-end gap-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-xl border"
              >
                Close
              </button>

              {mode !== 'view' && (
                <button
                  onClick={handleSave}
                  className="bg-slate-900 text-white px-8 py-2 rounded-xl"
                >
                  Save Seller
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Sellers;
