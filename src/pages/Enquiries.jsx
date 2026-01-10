import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import SearchSelect from '../components/SearchSelect';

import {
  getEnquiries,
  createEnquiry,
  updateEnquiry
} from '../api/enquiry.api';

import { getSaleProperties } from '../api/sale.api';
import { getRentProperties } from '../api/rent.api';
import { getBuyers } from '../api/buyer.api';

const EMPTY_FORM = {
  property_type: 'sale',
  property_id: '',
  buyer_id: '',
  contacted: false,
};

const Enquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [contacted, setContacted] = useState(false);
  const [status, setStatus] = useState('');

  // -------------------------
  // FETCH
  // -------------------------
  const fetchEnquiries = async () => {
    setLoading(true);
    const data = await getEnquiries();
    setEnquiries(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  // -------------------------
  // TABLE
  // -------------------------
  const columns = [
    { header: 'Property', accessor: 'title', className: 'font-semibold' },
    { header: 'Type', accessor: e => e.property_type.toUpperCase() },
    { header: 'Buyer Phone', accessor: 'buyer_phone', className: 'font-mono' },
    { header: 'Status', accessor: 'status' },
    {
      header: 'Contacted',
      accessor: e => (
        <span className={`font-bold ${e.contacted ? 'text-emerald-600' : 'text-red-500'}`}>
          {e.contacted ? 'YES' : 'NO'}
        </span>
      )
    },
    {
      header: 'Date',
      accessor: e => e.enquiry_date?.split('T')[0]
    }
  ];

  // -------------------------
  // VIEW HANDLER (🔥 FIXED)
  // -------------------------
  const handleView = (row) => {
    setSelected(row);
    setContacted(row.contacted);
    setStatus(row.status);
    setIsViewOpen(true);
  };

  // -------------------------
  // UPDATE
  // -------------------------
  const handleUpdate = async () => {
    await updateEnquiry(selected.enquiry_id, {
      contacted,
      property_status: status
    });
    setIsViewOpen(false);
    fetchEnquiries();
  };

  // -------------------------
  // CREATE
  // -------------------------
  const handleCreate = async () => {
    await createEnquiry(form);
    setForm(EMPTY_FORM);
    setIsCreateOpen(false);
    fetchEnquiries();
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Enquiries</h2>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase"
        >
          Add Enquiry
        </button>
      </div>

      {/* TABLE */}
      {loading ? (
        <Loader text="Loading enquiries..." />
      ) : (
        <DataTable
          columns={columns}
          data={enquiries}
          onView={handleView}
        />
      )}

      {/* ================= VIEW MODAL ================= */}
      {isViewOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden">

            <div className="px-8 py-6 border-b flex justify-between">
              <h3 className="text-xl font-bold">Enquiry Details</h3>
              <button onClick={() => setIsViewOpen(false)}>✕</button>
            </div>

            <div className="p-8 space-y-6">

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Buyer Phone
                  </p>
                  <p className="font-semibold">{selected.buyer_phone}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Seller Phone
                  </p>
                  <p className="font-semibold">{selected.seller_phone}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border bg-gray-50">
                <p className="font-bold">{selected.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {selected.property_type.toUpperCase()} · ₹{Number(selected.amount).toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest">
                    Contacted
                  </label>
                  <select
                    value={contacted ? 'yes' : 'no'}
                    onChange={e => setContacted(e.target.value === 'yes')}
                    className="w-full px-4 py-2 rounded-xl border font-semibold"
                  >
                    <option value="no">NO</option>
                    <option value="yes">YES</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest">
                    Property Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="HOLD">HOLD</option>
                    <option value="SOLD">SOLD</option>
                  </select>
                </div>
              </div>

            </div>

            <div className="px-8 py-6 border-t flex justify-end gap-4">
              <button
                onClick={() => setIsViewOpen(false)}
                className="px-6 py-2 rounded-xl border"
              >
                Close
              </button>
              <button
                onClick={handleUpdate}
                className="bg-slate-900 text-white px-8 py-2 rounded-xl"
              >
                Save
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= CREATE MODAL ================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-xl">

            <div className="px-8 py-6 border-b flex justify-between">
              <h3 className="text-xl font-bold">Create Enquiry</h3>
              <button onClick={() => setIsCreateOpen(false)}>✕</button>
            </div>

            <div className="p-8 space-y-6">

              <SearchSelect
                label="Property Type"
                value={form.property_type}
                fetchOptions={async () => [
                  { id: 'sale', name: 'Sale' },
                  { id: 'rent', name: 'Rent' }
                ]}
                getOptionValue={o => o.id}
                getOptionLabel={o => o.name}
                onChange={(v) => setForm(p => ({ ...p, property_type: v }))}
              />

              <SearchSelect
                label="Property"
                value={form.property_id}
                fetchOptions={(q) =>
                  form.property_type === 'sale'
                    ? getSaleProperties(q)
                    : getRentProperties(q)
                }
                getOptionValue={p => p.property_id}
                getOptionLabel={p =>
                  `${p.title} · ₹${p.price || p.rent_amount}`
                }
                onChange={(v) => setForm(p => ({ ...p, property_id: v }))}
              />

              <SearchSelect
                label="Buyer"
                value={form.buyer_id}
                fetchOptions={getBuyers}
                getOptionValue={b => b.buyer_id}
                getOptionLabel={b => `${b.name} · ${b.phone_number}`}
                onChange={(v) => setForm(p => ({ ...p, buyer_id: v }))}
              />

            </div>

            <div className="px-8 py-6 border-t flex justify-end gap-4">
              <button onClick={() => setIsCreateOpen(false)} className="px-6 py-2 border rounded-xl">
                Cancel
              </button>
              <button onClick={handleCreate} className="bg-slate-900 text-white px-8 py-2 rounded-xl">
                Create
              </button>
            </div>
                
          </div>
        </div>
      )}

    </div>
  );
};

export default Enquiries;
