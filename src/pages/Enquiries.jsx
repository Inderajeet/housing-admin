import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import SearchSelect from '../components/SearchSelect';

import { getEnquiries, createEnquiry, updateEnquiry } from '../api/enquiry.api';
import { getSaleProperties } from '../api/sale.api';
import { getRentProperties } from '../api/rent.api';

const EMPTY_FORM = {
  property_type: 'sale',
  property_id: '',
  buyer_name: '',
  buyer_phone: '',
  contacted: false,
};

const Enquiries = ({ typeFilter = null }) => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [contacted, setContacted] = useState(false);
  const [status, setStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getEnquiries(typeFilter);
    setEnquiries(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleView = useCallback((row) => {
    setSelected(row);
    setContacted(row.contacted);
    setStatus(row.status);
    setIsViewOpen(true);
  }, []);

  const handleUpdate = async () => {
    await updateEnquiry(selected.enquiry_id, { contacted, property_status: status });
    setIsViewOpen(false);
    loadData();
  };

  const handleCreate = async () => {
    if (!form.buyer_phone || !form.property_id) return alert("Please fill required fields");
    await createEnquiry(form);
    setForm(EMPTY_FORM);
    setIsCreateOpen(false);
    loadData();
  };

  // STABLE COLUMNS FIX
  const columns = useMemo(() => [
    { header: 'ID', accessor: 'formatted_id', className: 'font-semibold' },
    { header: 'Type', accessor: e => e.property_type.toUpperCase() },
    { header: 'Buyer', accessor: e => `${e.buyer_name} (${e.buyer_phone})` },
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
      header: 'Actions',
      accessor: e => (
        <div className="flex items-center gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleView(e);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            title="View Details"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              let purePhone = e.buyer_phone.replace(/\D/g, '');
              if (purePhone.length === 10) purePhone = '91' + purePhone;
              const msg = encodeURIComponent(`Hi ${e.buyer_name}, regarding your enquiry for ${e.title}...`);
              window.open(`https://wa.me/${purePhone}?text=${msg}`, '_blank');
            }}
            className="bg-emerald-500 text-white p-2 rounded-lg hover:opacity-80 transition-opacity"
            title="WhatsApp"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </button>
        </div>
      )
    }
  ], [handleView]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Enquiries</h2>
        <button onClick={() => setIsCreateOpen(true)} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase">
          + Add Enquiry
        </button>
      </div>

      {loading ? <Loader text="Loading enquiries..." /> : (
        <DataTable columns={columns} data={enquiries} />
      )}

      {/* VIEW MODAL (Keeping your CSS) */}
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Buyer</p>
                  <p className="font-semibold">{selected.buyer_name}</p>
                  <p className="text-sm font-mono text-slate-500">{selected.buyer_phone}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Seller Phone</p>
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
                  <label className="text-[10px] font-bold uppercase tracking-widest">Contacted</label>
                  <select value={contacted ? 'yes' : 'no'} onChange={e => setContacted(e.target.value === 'yes')} className="w-full px-4 py-2 rounded-xl border font-semibold">
                    <option value="no">NO</option>
                    <option value="yes">YES</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest">Property Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-2 rounded-xl border font-semibold">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="HOLD">HOLD</option>
                    <option value="SOLD">SOLD</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-8 py-6 border-t flex justify-end gap-4">
              <button onClick={() => setIsViewOpen(false)} className="px-6 py-2 rounded-xl border">Close</button>
              <button onClick={handleUpdate} className="bg-slate-900 text-white px-8 py-2 rounded-xl">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL (Keeping your CSS) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-xl overflow-hidden">
            <div className="px-8 py-6 border-b flex justify-between">
              <h3 className="text-xl font-bold">New Lead / Enquiry</h3>
              <button onClick={() => setIsCreateOpen(false)}>✕</button>
            </div>
            <div className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Buyer Name</label>
                  <input className="px-4 py-2 border rounded-xl" value={form.buyer_name} onChange={e => setForm({ ...form, buyer_name: e.target.value })} />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Buyer Phone</label>
                  <input className="px-4 py-2 border rounded-xl font-mono" value={form.buyer_phone} onChange={e => setForm({ ...form, buyer_phone: e.target.value })} />
                </div>
              </div>
              <SearchSelect
                label="Type"
                value={form.property_type}
                fetchOptions={async () => [{ id: 'sale', name: 'Sale/Plot/Land' }, { id: 'rent', name: 'Rent' }]}
                getOptionValue={o => o.id}
                getOptionLabel={o => o.name}
                onChange={(v) => setForm(p => ({ ...p, property_type: v, property_id: '' }))}
              />
              <SearchSelect
                label="Select Property"
                value={form.property_id}
                fetchOptions={(q) => form.property_type === 'sale' ? getSaleProperties(q) : getRentProperties(q)}
                getOptionValue={p => p.property_id}
                getOptionLabel={p => `[${p.formatted_id}] ${p.title}`}
                onChange={(v) => setForm(p => ({ ...p, property_id: v }))}
              />
            </div>
            <div className="px-8 py-6 border-t flex justify-end gap-4">
              <button onClick={() => setIsCreateOpen(false)} className="px-6 py-2 border rounded-xl">Cancel</button>
              <button onClick={handleCreate} className="bg-slate-900 text-white px-8 py-2 rounded-xl uppercase font-bold text-xs">Create Lead</button>
            </div>
          </div>
        </div>
      )}
    </div>  
  );
};

export default Enquiries;