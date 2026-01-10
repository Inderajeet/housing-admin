import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import LocationSelector from '../components/LocationSelector';
import SellerSelect from '../components/SellerSelect';
import Loader from '../components/Loader';

import { PropertyStatus, SaleStatus, SaleType } from '../types';
import { STATUS_COLORS } from '../constants';

import {
  getSaleProperties,
  createSaleProperty,
  updateSaleProperty,
} from '../api/sale.api';

// -------------------------
// Empty Form (UNCHANGED)
// -------------------------
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

  sale_type: SaleType.LAND,
  price: '',
  area_size: '',
  survey_number: '',
  street_name_or_road_name: '',
  extension: '',
  boundary_north: '',
  boundary_south: '',
  boundary_east: '',
  boundary_west: '',
  sale_status: SaleStatus.AVAILABLE,
};

const normalizeForm = (data = {}) => ({
  ...EMPTY_FORM,
  ...Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v ?? ''])
  ),
});

const SaleProperties = () => {
  const [saleProperties, setSaleProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [mode, setMode] = useState('add');
  const isReadOnly = mode === 'view';

  // -------------------------
  // Fetch
  // -------------------------
  const fetchSale = async () => {
    setLoading(true);
    try {
      const data = await getSaleProperties();
      setSaleProperties(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSale();
  }, []);

  // -------------------------
  // Modal handlers
  // -------------------------
  const openAdd = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setMode('add');
    setIsModalOpen(true);
    setModalLoading(false);
  };

  const openEdit = (p) => {
    setModalLoading(true);
    setSelected(p);
    setForm(normalizeForm(p));
    setMode('edit');
    setIsModalOpen(true);
    setTimeout(() => setModalLoading(false), 300);
  };

  const openView = (p) => {
    setModalLoading(true);
    setSelected(p);
    setForm(normalizeForm(p));
    setMode('view');
    setIsModalOpen(true);
    setTimeout(() => setModalLoading(false), 300);
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
      await updateSaleProperty(selected.property_id, form);
    } else {
      await createSaleProperty(form);
    }

    await fetchSale();
    setIsModalOpen(false);
  };

  // -------------------------
  // Table Columns (UNCHANGED)
  // -------------------------
  const columns = [
    { header: 'ID', accessor: 'property_id' },
    { header: 'Title', accessor: 'title', className: 'font-semibold' },
    { header: 'Type', accessor: 'sale_type' },
    {
      header: 'Price',
      accessor: p => `₹${Number(p.price || 0).toLocaleString()}`
    },
    {
      header: 'Status',
      accessor: p => (
        <span
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase
          ${STATUS_COLORS[p.sale_status] || 'bg-gray-200'}`}
        >
          {p.sale_status || '-'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Sale Inventory
          </h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest">
            Sale Properties
          </p>
        </div>

        <button
          onClick={openAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white
            px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest"
        >
          Add Sale Property
        </button>
      </div>

      {/* Table Loader */}
      {loading ? (
        <Loader text="Loading sale properties..." />
      ) : (
        <DataTable
          columns={columns}
          data={saleProperties}
          onEdit={openEdit}
          onView={openView}
        />
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-xl overflow-hidden">

            {/* Header */}
            <div className="px-8 py-6 border-b flex justify-between">
              <h3 className="text-xl font-bold">
                {mode === 'add' && 'New Sale'}
                {mode === 'edit' && 'Edit Sale'}
                {mode === 'view' && 'View Sale'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            {modalLoading ? (
              <Loader text="Loading property details..." />
            ) : (
              <div className="p-8 space-y-10 max-h-[75vh] overflow-y-auto">

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
                      className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  {/* Seller Dropdown */}
                  <SellerSelect
                    value={form.seller_id}
                    disabled={isReadOnly}
                    onChange={(seller) => {
                      handleChange('seller_id', seller.seller_id);
                      handleChange('contact_phone', seller.phone_number || '');
                    }}
                  />
                </div>

                {/* ROW 2: Contact Phone | Sale Status */}
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

                  {/* Sale Status */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                      Sale Status
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={form.sale_status}
                      onChange={e => handleChange('sale_status', e.target.value)}
                      className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {Object.values(SaleStatus).map(s => (
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
                    className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold"
                  />
                </div>

                {/* ROW 4: Latitude | Longitude */}
                <div className="grid grid-cols-2 gap-8">
                  {['latitude', 'longitude'].map(key => (
                    <div key={key} className="flex flex-col space-y-2">
                      <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </label>
                      <input
                        disabled={isReadOnly}
                        value={form[key]}
                        onChange={e => handleChange(key, e.target.value)}
                        className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  ))}
                </div>

                {/* ROW 5: Sale Type | Price */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                      Sale Type
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={form.sale_type}
                      onChange={e => handleChange('sale_type', e.target.value)}
                      className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {Object.values(SaleType).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                      Price
                    </label>
                    <input
                      disabled={isReadOnly}
                      value={form.price}
                      onChange={e => handleChange('price', e.target.value)}
                      className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* ROW 6: Area Size | Survey Number */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                      Area Size
                    </label>
                    <input
                      disabled={isReadOnly}
                      value={form.area_size}
                      onChange={e => handleChange('area_size', e.target.value)}
                      className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                      Survey Number
                    </label>
                    <input
                      disabled={isReadOnly}
                      value={form.survey_number}
                      onChange={e => handleChange('survey_number', e.target.value)}
                      className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* ROW 7: Street/Road Name | Extension */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                      Street / Road Name
                    </label>
                    <input
                      disabled={isReadOnly}
                      value={form.street_name_or_road_name}
                      onChange={e => handleChange('street_name_or_road_name', e.target.value)}
                      className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                      Extension (Facing)
                    </label>
                    <input
                      disabled={isReadOnly}
                      value={form.extension}
                      onChange={e => handleChange('extension', e.target.value)}
                      className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* ROW 8: North Boundary | South Boundary */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                      North Boundary
                    </label>
                    <input
                      disabled={isReadOnly}
                      value={form.boundary_north}
                      onChange={e => handleChange('boundary_north', e.target.value)}
                      className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                      South Boundary
                    </label>
                    <input
                      disabled={isReadOnly}
                      value={form.boundary_south}
                      onChange={e => handleChange('boundary_south', e.target.value)}
                      className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* ROW 9: East Boundary | West Boundary */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                      East Boundary
                    </label>
                    <input
                      disabled={isReadOnly}
                      value={form.boundary_east}
                      onChange={e => handleChange('boundary_east', e.target.value)}
                      className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                      West Boundary
                    </label>
                    <input
                      disabled={isReadOnly}
                      value={form.boundary_west}
                      onChange={e => handleChange('boundary_west', e.target.value)}
                      className="input disabled:bg-gray-200 w-full px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
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
            )}

            {/* Footer */}
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
                  className="bg-emerald-600 text-white px-8 py-2 rounded-xl"
                >
                  Save Sale Property
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SaleProperties;