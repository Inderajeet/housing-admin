import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import LocationSelector from '../components/LocationSelector';
import SellerSelect from '../components/SellerSelect';
import { PropertyStatus, RentStatus } from '../types';
import { STATUS_COLORS } from '../constants';

import {
  getRentProperties,
  createRentProperty,
  updateRentProperty,
} from '../api/rent.api';

const EMPTY_FORM = {
  seller_id: '',
  title: '',
  description: '',
  contact_phone: '',
  address: '',
  latitude: '',
  longitude: '',
  district_id: '',
  taluk_id: '',
  village_id: '',
  area_id: '',
  status: PropertyStatus.ACTIVE,

  bhk: '',
  rent_amount: '',
  advance_amount: '',
  property_use: 'residential',
  rent_status: RentStatus.ACTIVE,
  landmark: '',
  street_name: '',
};

const normalizeForm = (data = {}) => ({
  ...EMPTY_FORM,
  ...Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v ?? ''])
  ),
});

const RentProperties = () => {
  const [rentProperties, setRentProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [mode, setMode] = useState('add');
  const isReadOnly = mode === 'view';

  const fetchRent = async () => {
    setLoading(true);
    try {
      const data = await getRentProperties();
      setRentProperties(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRent();
  }, []);

  const openAdd = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setMode('add');
    setIsModalOpen(true);
  };

  const openEdit = (p) => {
    setSelected(p);
    setForm(normalizeForm(p));
    setMode('edit');
    setIsModalOpen(true);
  };

  const openView = (p) => {
    setSelected(p);
    setForm(normalizeForm(p));
    setMode('view');
    setIsModalOpen(true);
  };

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value ?? '' }));
  };

  const handleSave = async () => {
    if (mode === 'view') return;

    if (!form.seller_id) {
      alert('Please select a seller');
      return;
    }

    if (selected?.property_id) {
      await updateRentProperty(selected.property_id, form);
    } else {
      await createRentProperty(form);
    }

    await fetchRent();
    setIsModalOpen(false);
  };

  const columns = [
    { header: 'ID', accessor: 'property_id' },
    { header: 'Title', accessor: 'title', className: 'font-semibold' },
    { header: 'BHK', accessor: p => `${p.bhk ?? '-'} BHK` },
    {
      header: 'Rent',
      accessor: p => `₹${Number(p.rent_amount || 0).toLocaleString()}`
    },
    {
      header: 'Status',
      accessor: p => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase
          ${STATUS_COLORS[p.rent_status] || 'bg-gray-200'}`}>
          {p.rent_status || '-'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Rental Inventory</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest">
            Rent Properties
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white
          px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest"
        >
          Add Rent Listing
        </button>
      </div>

      <DataTable
        columns={columns}
        data={rentProperties}
        loading={loading}
        onEdit={openEdit}
        onView={openView}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl overflow-hidden">

            <div className="px-8 py-6 border-b flex justify-between">
              <h3 className="text-xl font-bold">
                {mode === 'add' && 'New Rental'}
                {mode === 'edit' && 'Edit Rental'}
                {mode === 'view' && 'View Rental'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto">

              {/* ROW 1: Title | Seller */}
              <div className="grid grid-cols-2 gap-8">
                {/* Property Title */}
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest">
                    Property Title
                  </label>
                  <input
                    disabled={isReadOnly}
                    value={form.title}
                    onChange={e => handleChange('title', e.target.value)}
                    className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Seller */}
                <SellerSelect
                  value={form.seller_id}
                  disabled={isReadOnly}
                  onChange={(seller) => {
                    handleChange('seller_id', seller.seller_id);
                    handleChange('contact_phone', seller.phone_number || '');
                  }}
                />
              </div>

              {/* ROW 2: Phone | Status */}
              <div className="grid grid-cols-2 gap-8">
                {/* Contact Phone */}
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest">
                    Contact Phone
                  </label>
                  <input
                    disabled
                    value={form.contact_phone}
                    className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold"
                  />
                </div>

                {/* Rent Status */}
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                    Rent Status
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={form.rent_status}
                    onChange={e => handleChange('rent_status', e.target.value)}
                    className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.values(RentStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ROW 3: Address (Full width) */}
              <div className="flex flex-col space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest">
                  Address
                </label>
                <textarea
                  disabled={isReadOnly}
                  value={form.address}
                  onChange={e => handleChange('address', e.target.value)}
                  rows={3}
                  className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* ROW 4: Latitude | Longitude */}
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                    Latitude
                  </label>
                  <input
                    disabled={isReadOnly}
                    value={form.latitude}
                    onChange={e => handleChange('latitude', e.target.value)}
                    className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                    Longitude
                  </label>
                  <input
                    disabled={isReadOnly}
                    value={form.longitude}
                    onChange={e => handleChange('longitude', e.target.value)}
                    className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* ROW 5: Advance | Rent */}
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                    Advance Amount
                  </label>
                  <input
                    disabled={isReadOnly}
                    value={form.advance_amount}
                    onChange={e => handleChange('advance_amount', e.target.value)}
                    className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                    Rent Amount
                  </label>
                  <input
                    disabled={isReadOnly}
                    value={form.rent_amount}
                    onChange={e => handleChange('rent_amount', e.target.value)}
                    className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* ROW 6: BHK | Property Use */}
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                    BHK
                  </label>
                  <input
                    disabled={isReadOnly}
                    value={form.bhk}
                    onChange={e => handleChange('bhk', e.target.value)}
                    className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                    Property Use
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={form.property_use}
                    onChange={e => handleChange('property_use', e.target.value)}
                    className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
              </div>

              {/* ROW 7: Street Name | Landmark */}
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                    Street Name
                  </label>
                  <input
                    disabled={isReadOnly}
                    value={form.street_name}
                    onChange={e => handleChange('street_name', e.target.value)}
                    className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                    Landmark
                  </label>
                  <input
                    disabled={isReadOnly}
                    value={form.landmark}
                    onChange={e => handleChange('landmark', e.target.value)}
                    className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Location Selector */}
              <LocationSelector
                district_id={form.district_id}
                taluk_id={form.taluk_id}
                village_id={form.village_id}
                disabled={isReadOnly}
                onChange={(loc) =>
                  setForm(prev => ({ ...prev, ...loc }))
                }
              />
            </div>

            <div className="px-8 py-6 border-t flex justify-end gap-4">
              <button onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-xl border">
                Close
              </button>
              {mode !== 'view' && (
                <button
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-8 py-2 rounded-xl"
                >
                  Save Rental
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default RentProperties;