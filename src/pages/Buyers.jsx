import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';

import {
  getBuyers,
  createBuyer,
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
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState('add');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [enquiries, setEnquiries] = useState([]);
  const [enqLoading, setEnqLoading] = useState(false);

  const isReadOnly = mode === 'view';

  const fetchBuyers = async () => {
    setLoading(true);
    const data = await getBuyers();
    setBuyers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  const openAdd = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setMode('add');
    setIsModalOpen(true);
  };

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
    const data = await getBuyerEnquiries(id);
    setEnquiries(data);
    setEnqLoading(false);
  };

  const handleSave = async () => {
    if (mode === 'view') return;

    if (selected?.buyer_id) {
      await updateBuyer(selected.buyer_id, form);
    } else {
      await createBuyer(form);
    }

    fetchBuyers();
    setIsModalOpen(false);
  };

  const columns = [
    { header: 'ID', accessor: 'buyer_id' },
    { header: 'Name', accessor: 'name', className: 'font-semibold' },
    { header: 'Phone', accessor: 'phone_number', className: 'font-mono' },
    { header: 'Enquiries', accessor: b => b.enquiry_count ?? 0 },
    { header: 'Registered', accessor: b => b.created_at?.split('T')[0] }
  ];

  const enquiryColumns = [
    { header: 'Property', accessor: 'title', className: 'font-semibold' },
    { header: 'Type', accessor: e => e.property_type.toUpperCase() },
    { header: 'Amount', accessor: e => `₹${Number(e.amount || 0).toLocaleString()}` },
    { header: 'Status', accessor: 'enquiry_status' }
  ];

  return (
    <div className="space-y-6">

      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Buyers</h2>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase"
        >
          Add Buyer
        </button>
      </div>

      {loading ? (
        <Loader text="Loading buyers..." />
      ) : (
        <DataTable
          columns={columns}
          data={buyers}
          onEdit={openEdit}
          onView={openView}
        />
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl">

            <div className="px-8 py-6 border-b flex justify-between">
              <h3 className="text-xl font-bold">
                {mode === 'add' ? 'New Buyer' : mode === 'edit' ? 'Edit Buyer' : 'View Buyer'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto">

              <div className="grid grid-cols-2 gap-8">
                {[
                  ['name', 'Full Name'],
                  ['phone_number', 'Phone Number'],
                  ['email', 'Email']
                ].map(([k, l]) => (
                  <div key={k} className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest">{l}</label>
                    <input
                      disabled={isReadOnly}
                      value={form[k]}
                      onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                      className="px-4 py-2 rounded-xl border"
                    />
                  </div>
                ))}

                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest">Address</label>
                  <textarea
                    disabled={isReadOnly}
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 rounded-xl border"
                  />
                </div>
              </div>

              {(mode === 'edit' || mode === 'view') && (
                <div className="pt-6 border-t space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest">
                    Enquired Properties
                  </h4>

                  {enqLoading ? (
                    <Loader text="Loading enquiries..." />
                  ) : enquiries.length === 0 ? (
                    <p className="text-gray-400 text-sm">No enquiries found</p>
                  ) : (
                    <DataTable
                      columns={enquiryColumns}
                      data={enquiries}
                    />
                  )}
                </div>
              )}

            </div>

            <div className="px-8 py-6 border-t flex justify-end gap-4">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl border">
                Close
              </button>
              {mode !== 'view' && (
                <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-2 rounded-xl">
                  Save Buyer
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
