import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';

import {
  getBuyers,
  updateBuyer,
  getBuyerEnquiries
} from '../api/buyer.api';

const EMPTY_FORM = {
  buyer_id: '',
  name: '',
  phone_number: '',
  email: '',
  address: '',
  created_at: ''
};

const normalizeForm = (d = {}) => ({
  ...EMPTY_FORM,
  ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? '']))
});

const Buyers = () => {
  const [buyers, setBuyers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState('view'); // Default to view
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [enquiries, setEnquiries] = useState([]);
  const [enqLoading, setEnqLoading] = useState(false);

  const isReadOnly = mode === 'view';

  const fetchBuyers = async () => {
    setLoading(true);
    try {
      const data = await getBuyers();
      setBuyers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  const openEdit = async (b) => {
    setSelected(b);
    setForm(normalizeForm(b));
    setMode('edit');
    setIsModalOpen(true);
    loadEnquiries(b.buyer_id);
  };

  const openView = async (b) => {
    setSelected(b);
    setForm(normalizeForm(b));
    setMode('view');
    setIsModalOpen(true);
    loadEnquiries(b.buyer_id);
  };

  const loadEnquiries = async (id) => {
    setEnqLoading(true);
    try {
      const data = await getBuyerEnquiries(id);
      setEnquiries(data);
    } finally {
      setEnqLoading(false);
    }
  };

  const handleSave = async () => {
    if (mode === 'view') return;
    if (selected?.buyer_id) {
      await updateBuyer(selected.buyer_id, form);
      fetchBuyers();
      setIsModalOpen(false);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'buyer_id' },
    { header: 'Name', accessor: 'name', className: 'font-semibold' },
    { header: 'Phone', accessor: 'phone_number', className: 'font-mono' },
    { header: 'Enquiries', accessor: b => b.enquiry_count ?? 0 },
    { header: 'Registered', accessor: b => b.created_at?.split('T')[0] }
  ];

  const enquiryColumns = [
    { header: 'ID', accessor: 'formatted_id', className: 'font-semibold' },
    { header: 'Type', accessor: e => e.property_type.toUpperCase() },
    { header: 'Amount', accessor: e => `₹${Number(e.amount || 0).toLocaleString()}` },
    { header: 'Date', accessor: e => e.enquiry_date?.split('T')[0] }
  ];

  const filteredBuyers = searchQuery.trim()
    ? buyers.filter(b => {
        const q = searchQuery.toLowerCase();
        return (b.name || '').toLowerCase().includes(q) ||
          (b.phone_number || '').includes(q) ||
          String(b.buyer_id || '').includes(q);
      })
    : buyers;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sale Buyers</h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Lead Management</p>
        </div>
        <div className="relative">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, ID..."
            className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20 w-52" />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
      </div>

      {loading ? (
        <Loader text="Loading buyers..." />
      ) : (
        <DataTable
          columns={columns}
          data={filteredBuyers}
          onEdit={openEdit}
          onView={openView}
        />
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl overflow-hidden">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold">
                {mode === 'edit' ? 'Edit Buyer Details' : 'View Buyer Profile'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-2xl text-slate-400 hover:text-black">✕</button>
            </div>

            <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-8">
                {[
                  ['name', 'Full Name'],
                  ['phone_number', 'Phone Number'],
                  ['email', 'Email']
                ].map(([k, l]) => (
                  <div key={k} className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{l}</label>
                    <input
                      disabled={isReadOnly || k === 'phone_number'} // Phone usually remains unique/uneditable
                      value={form[k]}
                      onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none disabled:bg-slate-50 transition-all font-medium"
                    />
                  </div>
                ))}

                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Address</label>
                  <textarea
                    disabled={isReadOnly}
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none disabled:bg-slate-50 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="pt-6 border-t space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-700">
                  Sale Enquiries History
                </h4>

                {enqLoading ? (
                  <Loader text="Loading enquiries..." />
                ) : enquiries.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">No sale enquiries found for this buyer.</p>
                ) : (
                  <DataTable
                    columns={enquiryColumns}
                    data={enquiries}
                  />
                )}
              </div>
            </div>

            <div className="px-8 py-6 border-t flex justify-end gap-4 bg-slate-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl border border-slate-200 font-bold text-xs uppercase hover:bg-white transition-all">
                Close
              </button>
              {mode !== 'view' && (
                <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Buyers;