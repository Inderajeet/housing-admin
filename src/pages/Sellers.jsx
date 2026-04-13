import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import {
  getSellers,
  createSeller,
  updateSeller,
  getSellerProperties,
} from '../api/seller.api';

const EMPTY_FORM = {
  name: '',
  phone_number: '',
  alternate_phone: '',
  email: '',
  address: '',
};

const Sellers = ({ title = "Sellers Directory", typeFilter = null }) => {
  const [sellers, setSellers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState('view');

  const [sellerProps, setSellerProps] = useState([]);
  const [sellerPropsLoading, setSellerPropsLoading] = useState(false);

  useEffect(() => {
    fetchSellers();
  }, [typeFilter]);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const data = await getSellers(typeFilter);
      setSellers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const loadSellerProperties  = async (id) => {
    setSellerPropsLoading(true);
    try {
      const data = await getSellerProperties(id);
      
      let filtered = data;
      if (typeFilter === 'rent') {
        // Only show 'rent'
        filtered = data.filter(p => p.property_type === 'rent');
      } else if (typeFilter === 'sale') {
        // Show everything EXCEPT 'rent' (plots, land, flats, etc.)
        filtered = data.filter(p => p.property_type !== 'rent');
      }

      setSellerProps(filtered);
    } finally {
      setSellerPropsLoading(false);
    }
  };

  const openModal = (s = null, m = 'add') => {
    setSelected(s);
    setMode(m);
    setForm(s ? { ...EMPTY_FORM, ...s } : EMPTY_FORM);
    setSellerProps([]);
    setIsModalOpen(true);
    if (s) loadSellerProperties(s.seller_id);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone_number) return alert('Name and Phone are required');
    
    try {
      selected ? await updateSeller(selected.seller_id, form) : await createSeller(form);
      await fetchSellers();
      setIsModalOpen(false);
    } catch (err) {
      alert('Error saving record');
    }
  };

  const columns = [
    { header: 'ID', accessor: 'seller_id' },
    { header: 'Full Name', accessor: 'name', className: 'font-semibold' },
    { header: 'Primary Phone', accessor: 'phone_number', className: 'font-mono' },
    { header: 'Properties', accessor: s => s.property_count ?? 0 },
    { header: 'Registered', accessor: s => s.created_at?.split('T')[0] }
  ];

  const propColumns = [
    { header: 'ID', accessor: 'formatted_id', className: 'font-semibold' },
    { header: 'Type', accessor: p => p.property_type.toUpperCase() },
    { header: 'Amount', accessor: p => `₹${Number(p.amount || 0).toLocaleString()}` },
    { header: 'Status', accessor: 'status' }
  ];

  const filteredSellers = searchQuery.trim()
    ? sellers.filter(s => {
        const q = searchQuery.toLowerCase();
        return (s.name || '').toLowerCase().includes(q) ||
          (s.phone_number || '').includes(q) ||
          String(s.seller_id || '').includes(q);
      })
    : sellers;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest">Manage Registry</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, ID..."
              className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-500/20 w-52" />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <button onClick={() => openModal(null, 'add')} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs">
            ADD {typeFilter === 'rent' ? 'OWNER' : 'SELLER'}
          </button>
        </div>
      </div>

      {loading ? <Loader text="Fetching data..." /> : (
        <DataTable
          columns={columns}
          data={filteredSellers}
          onEdit={(s) => openModal(s, 'edit')}
          onView={(s) => openModal(s, 'view')}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl overflow-hidden">
            <div className="px-8 py-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold capitalize">{mode} {typeFilter || 'Seller'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black">✕</button>
            </div>

            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                {[
                  ['name', 'Full Name'], ['phone_number', 'Phone'], 
                  ['alternate_phone', 'Owner Phone'], ['email', 'Email']
                ].map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">{label}</label>
                    <input
                      disabled={mode === 'view'}
                      value={form[key] || ''}
                      onChange={e => setForm({...form, [key]: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none disabled:bg-slate-50 font-medium"
                    />
                  </div>
                ))}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Address</label>
                  <textarea
                    disabled={mode === 'view'}
                    value={form.address || ''}
                    onChange={e => setForm({...form, address: e.target.value})}
                    rows={2}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none disabled:bg-slate-50 font-medium"
                  />
                </div>
              </div>

              {mode !== 'add' && (
                <div className="pt-8 border-t">
                  <h4 className="text-sm font-bold uppercase text-slate-800 mb-4">Linked Properties</h4>
                  {sellerPropsLoading ? <Loader /> : (
                    <DataTable columns={propColumns} data={sellerProps} />
                  )}
                </div>
              )}
            </div>

            <div className="px-8 py-6 border-t flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl border text-sm font-bold">CANCEL</button>
              {mode !== 'view' && (
                <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-200">
                  SAVE CHANGES
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