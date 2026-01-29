import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import DataTable from '../components/DataTable';
import LocationSelector from '../components/LocationSelector';
import Loader from '../components/Loader';
import { PropertyStatus, RentStatus } from '../types';
import { STATUS_COLORS } from '../constants';
import { useLocations } from '../context/LocationContext';
import { api } from '../api/api';
import SortableItem from '../components/SortableItem';
import {
  getRentProperties,
  createRentProperty,
  updateRentProperty,
} from '../api/rent.api';
import {
  DndContext,
  closestCenter
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AssetActionBar from '../components/AssetActionBar';
import PropertyAssetsTabs from '../components/PropertyAssetsTabs';

const EMPTY_FORM = {
  seller_name: '',
  contact_phone: '',
  title: '',
  address: '',
  latitude: '',
  longitude: '',
  district_id: null,
  taluk_id: null,
  village_id: null,
  area_id: null,
  status: PropertyStatus.ACTIVE,
  bhk: null,
  rent_amount: '',
  advance_amount: '',
  property_use: 'residential',
  rent_status: '',
  landmark: '',
  street_name: '',
};

const normalizeForm = (data = {}) => {
  const base = { ...EMPTY_FORM };

  // First, copy all direct properties
  Object.keys(EMPTY_FORM).forEach(key => {
    // Check both direct property and nested seller object
    if (data[key] !== undefined && data[key] !== null) {
      base[key] = data[key];
    }
  });

  // Get seller name from various possible sources
  // Priority: data.seller_name > data.seller?.name > data.seller_name in nested
  if (data.seller_name) {
    base.seller_name = data.seller_name;
  } else if (data.seller?.name) {
    base.seller_name = data.seller.name;
  } else if (data.seller_name_from_api) { // If API returns it differently
    base.seller_name = data.seller_name_from_api;
  }

  // Get contact phone from various possible sources
  if (data.contact_phone) {
    base.contact_phone = data.contact_phone;
  } else if (data.seller?.contact_phone) {
    base.contact_phone = data.seller.contact_phone;
  }

  return base;
};

const RentProperties = () => {
  const { districts } = useLocations();
  const [allProperties, setAllProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [sellerStatus, setSellerStatus] = useState(null);
  const [checkingSeller, setCheckingSeller] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const [mode, setMode] = useState('add');
  const isReadOnly = mode === 'view';

  const [activeTab, setActiveTab] = useState('details');
  const [assets, setAssets] = useState([]);
  const [assetLoading, setAssetLoading] = useState(false);

  const [filters, setFilters] = useState({
    dateRange: 'all',
    startDate: '',
    endDate: '',
    district_id: '',
    taluk_id: '',
    village_id: '',
    property_use: 'all'
  });
  const [filterTaluks, setFilterTaluks] = useState([]);
  const [filterVillages, setFilterVillages] = useState([]);

  const [selectedAssets, setSelectedAssets] = useState([]);
  const [downloadMode, setDownloadMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);



  // Track if we should check phone (only in add mode or when phone changes in edit mode)
  const shouldCheckPhoneRef = useRef(false);

  const fetchRent = async () => {
    setLoading(true);
    try {
      const data = await getRentProperties();
      setAllProperties(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRent(); }, []);

  // Phone check logic - only run when shouldCheckPhoneRef.current is true
  useEffect(() => {
    const checkPhone = async () => {
      // Only check if we're allowed to
      if (!shouldCheckPhoneRef.current || mode === 'view') {
        return;
      }

      const phone = form.contact_phone;

      // Validation for phone length
      if (phone.length > 0 && phone.length < 10) {
        setPhoneError('Please enter 10 digits');
        setSellerStatus(null);
        return;
      }

      // Perform API check only for valid 10-digit numbers
      if (phone.length === 10) {
        setPhoneError('');
        setCheckingSeller(true);
        try {
          const res = await api.get(`/rent/check/${phone}`);
          if (res.data && res.data.seller_id) {
            // Auto-populate seller name only in add mode or when editing and seller name is empty
            if (mode === 'add' || form.seller_name === '' || form.seller_name === EMPTY_FORM.seller_name) {
              setForm(prev => ({ ...prev, seller_name: res.data.name }));
            }
            setSellerStatus('exists');
          } else {
            setSellerStatus('new');
          }
        } catch (e) {
          setSellerStatus('new');
        }
        finally {
          setCheckingSeller(false);
        }
      } else {
        setPhoneError('');
        setSellerStatus(null);
      }
    };

    const timer = setTimeout(checkPhone, 500);
    return () => clearTimeout(timer);
  }, [form.contact_phone, mode, form.seller_name]);

  // Reset shouldCheckPhone when mode changes or modal closes
  useEffect(() => {
    if (!isModalOpen) {
      shouldCheckPhoneRef.current = false;
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (isModalOpen && selected?.property_id) {
      setAssetLoading(true);
      api.get(`/property-assets/${selected.property_id}`)
        .then(res => setAssets(res.data || []))
        .finally(() => setAssetLoading(false));
    } else {
      setAssets([]);
      setActiveTab('details');
    }
  }, [isModalOpen, selected]);

  useEffect(() => {
    if (!filters.district_id) { setFilterTaluks([]); setFilterVillages([]); return; }
    api.get(`/locations/taluks/${filters.district_id}`).then(res => setFilterTaluks(res.data || []));
  }, [filters.district_id]);

  useEffect(() => {
    if (!filters.taluk_id) { setFilterVillages([]); return; }
    api.get(`/locations/villages/${filters.taluk_id}`).then(res => setFilterVillages(res.data || []));
  }, [filters.taluk_id]);

  useEffect(() => {
    let result = [...allProperties];
    if (filters.property_use !== 'all') result = result.filter(p => p.property_use === filters.property_use);
    if (filters.district_id) result = result.filter(p => Number(p.district_id) === Number(filters.district_id));
    if (filters.taluk_id) result = result.filter(p => Number(p.taluk_id) === Number(filters.taluk_id));
    if (filters.village_id) result = result.filter(p => Number(p.village_id) === Number(filters.village_id));

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      result = result.filter(p => {
        if (!p.created_at) return false;
        const pDate = new Date(p.created_at);
        if (filters.dateRange === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          weekAgo.setHours(0, 0, 0, 0);
          return pDate >= weekAgo && pDate <= todayEnd;
        }
        if (filters.dateRange === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          monthAgo.setHours(0, 0, 0, 0);
          return pDate >= monthAgo && pDate <= todayEnd;
        }
        if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          return pDate >= start && pDate <= end;
        }
        return true;
      });
    }
    setFilteredProperties(result);
  }, [filters, allProperties]);

  // Handle opening modal for different modes
  const openModal = (property = null, modalMode = 'add') => {
    if (property) {
      const normalizedForm = normalizeForm(property);
      setSelected(property);
      setForm(normalizedForm);

      // For edit mode, allow phone check only if phone is changed
      // For view mode, never check phone
      if (modalMode === 'edit') {
        shouldCheckPhoneRef.current = false; // Start with no check
      } else if (modalMode === 'view') {
        shouldCheckPhoneRef.current = false; // Never check in view mode
      }
    } else {
      setSelected(null);
      setForm(EMPTY_FORM);
      // In add mode, always allow phone check
      shouldCheckPhoneRef.current = true;
    }

    setMode(modalMode);

    // Reset seller status for view mode
    if (modalMode === 'view') {
      setSellerStatus(null);
      setCheckingSeller(false);
      setPhoneError('');
    } else {
      // For add/edit, start with no status unless phone is valid
      setSellerStatus(null);
      setCheckingSeller(false);
      setPhoneError('');

      // If we have a valid phone in edit mode, we might want to show status
      if (modalMode === 'edit' && property?.contact_phone?.length === 10) {
        // We could optionally pre-check here if needed
      }
    }

    setIsModalOpen(true);
  };

  // Handle phone input change - enable phone check in edit mode when phone changes
  const handlePhoneChange = (e) => {
    const newPhone = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, contact_phone: newPhone });

    // Enable phone check in edit mode when phone changes
    if (mode === 'edit') {
      shouldCheckPhoneRef.current = true;
    }
  };

  // --- UPDATED EXPORT LOGIC ---
  const handleExport = () => {
    const dataToExport = filteredProperties.map(p => ({
      'Property ID': p.formatted_id,
      'Seller Name': p.seller?.name || p.seller_name,
      'Phone': p.contact_phone,
      'BHK': p.bhk,
      'Rent Amount': p.rent_amount,
      'Advance': p.advance_amount,
      'Status': p.rent_status,
      'Property Use': p.property_use,
      'Street': p.street_name,
      'Landmark': p.landmark,
      'Address': p.address,
      'Area ID': p.area_id,
      'Latitude': p.latitude,
      'Longitude': p.longitude,
      'Created At': new Date(p.created_at).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rental_Inventory");
    XLSX.writeFile(wb, `Rent_Inventory_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleSave = async () => {
    if (mode === 'view') return;
    if (!form.contact_phone || form.contact_phone.length < 10)
      return alert('Enter a valid 10-digit phone number');

    setSubmitting(true);

    try {
      if (selected?.property_id) {
        await updateRentProperty(selected.property_id, form);
      } else {
        await createRentProperty(form);
      }

      await fetchRent();

      shouldCheckPhoneRef.current = false; // Reset phone check flag
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };


  const toggleSelect = (id) => {
    setSelectedAssets(p =>
      p.includes(id) ? p.filter(i => i !== id) : [...p, id]
    );
  };

  const exitActionMode = () => {
    setSelectedAssets([]);
    setDownloadMode(false);
    setDeleteMode(false);
  };

  const dropdownClass = "px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20 transition-all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Rental Inventory</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Manage Listings</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50">Export Excel</button>
          <button onClick={() => openModal(null, 'add')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700">Add Rent Listing</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-6 items-end">
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date Range</label>
            <select value={filters.dateRange} onChange={e => setFilters({ ...filters, dateRange: e.target.value })} className={dropdownClass}>
              <option value="all">All Time</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">District</label>
            <select value={filters.district_id} onChange={e => setFilters({ ...filters, district_id: e.target.value, taluk_id: '', village_id: '' })} className={dropdownClass}>
              <option value="">All Districts</option>
              {districts?.map(d => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
            </select>
          </div>
          <button onClick={() => setFilters({ dateRange: 'all', district_id: '', taluk_id: '', village_id: '', property_use: 'all', startDate: '', endDate: '' })} className="text-[10px] font-bold text-red-500 uppercase pb-3 hover:underline">Reset</button>
        </div>
      </div>

      {loading ? <Loader /> : (
        <DataTable
          columns={[
            { header: 'ID', accessor: 'formatted_id' },
            { header: 'Contact', accessor: 'contact_phone', className: 'font-bold text-blue-600' },
            { header: 'Registered', accessor: p => new Date(p.created_at).toLocaleDateString() },
            { header: 'BHK', accessor: p => `${p.bhk ?? '-'} BHK` },
            { header: 'Rent', accessor: p => `₹${Number(p.rent_amount || 0).toLocaleString()}` },
            { header: 'Status', accessor: p => <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[p.rent_status] || 'bg-gray-200'}`}>{p.rent_status}</span> }
          ]}
          data={filteredProperties}
          onEdit={(p) => openModal(p, 'edit')}
          onView={(p) => openModal(p, 'view')}
        />
      )}

      {isModalOpen && (
        <>
          <div className="!m-0 fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-10">
            {/* 1. Added h-full and max-h-full to the container to prevent overflow */}
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-full">

              {/* HEADER: Fixed height */}
              <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50 shrink-0">
                <h3 className="text-xl font-bold uppercase tracking-tight text-gray-800">
                  {mode === 'add' ? 'Add' : mode === 'edit' ? 'Edit' : 'View'} Rental Property
                </h3>
                <button className="text-2xl text-gray-400 hover:text-gray-600" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>

              {/* TABS: Fixed height */}
              <div className="flex gap-6 px-8 border-b bg-white shrink-0">
                {['details', 'assets'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 text-[10px] font-bold uppercase tracking-widest transition-all
              ${activeTab === tab
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                {activeTab === 'details' && (
                  <div className="space-y-8">
                    {/* 🔽 EVERYTHING THAT WAS INSIDE STAYS EXACTLY SAME */}
                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Seller Phone</label>
                          {mode !== 'view' && checkingSeller && <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
                          {mode !== 'view' && sellerStatus === 'exists' && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">EXISTING SELLER</span>}
                        </div>
                        <input
                          disabled={isReadOnly}
                          value={form.contact_phone}
                          onChange={handlePhoneChange}
                          placeholder="10-digit number"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold"
                        />
                        {phoneError && <p className="text-[9px] text-red-500 font-bold">{phoneError}</p>}
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Seller Name</label>
                        <input
                          disabled={isReadOnly}
                          value={form.seller_name}
                          onChange={e => setForm({ ...form, seller_name: e.target.value })}
                          placeholder="Enter name"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Property ID / Title</label>
                        <input disabled={true} value={selected?.formatted_id || 'NEW LISTING'} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 font-bold text-blue-600" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Rent Status</label>
                        <select disabled={isReadOnly} value={form.rent_status} onChange={e => setForm({ ...form, rent_status: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold">
                          {Object.values(RentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Rent Amount</label>
                        <input disabled={isReadOnly} value={form.rent_amount} onChange={e => setForm({ ...form, rent_amount: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Advance Amount</label>
                        <input disabled={isReadOnly} value={form.advance_amount} onChange={e => setForm({ ...form, advance_amount: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-8">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">BHK</label>
                        <input disabled={isReadOnly} value={form.bhk} onChange={e => setForm({ ...form, bhk: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Property Use</label>
                        <select disabled={isReadOnly} value={form.property_use} onChange={e => setForm({ ...form, property_use: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold">
                          <option value="residential">Residential</option>
                          <option value="commercial">Commercial</option>
                        </select>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Area ID</label>
                        <input disabled={isReadOnly} value={form.area_id} onChange={e => setForm({ ...form, area_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Street Name</label>
                        <input disabled={isReadOnly} value={form.street_name} onChange={e => setForm({ ...form, street_name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Landmark</label>
                        <input disabled={isReadOnly} value={form.landmark} onChange={e => setForm({ ...form, landmark: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Address</label>
                      <textarea disabled={isReadOnly} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold min-h-[80px]" />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Latitude</label>
                        <input disabled={isReadOnly} value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Longitude</label>
                        <input disabled={isReadOnly} value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Property Location</label>
                      <LocationSelector district_id={form.district_id} taluk_id={form.taluk_id} village_id={form.village_id} disabled={isReadOnly} onChange={(loc) => setForm(prev => ({ ...prev, ...loc }))} />
                    </div>
                  </div>
                )}

                {activeTab === 'assets' && (
                  <PropertyAssetsTabs
                    propertyId={selected.property_id}
                    assets={assets}
                    setAssets={setAssets}
                    isReadOnly={isReadOnly}
                  />
                )}

              </div>
              <div className="px-8 py-6 border-t flex justify-end gap-4 bg-gray-50 shrink-0">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600">
                  Close
                </button>
                {!isReadOnly && (
                  <button onClick={handleSave} disabled={submitting} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg">
                    {submitting ? 'Saving...' : mode === 'add' ? 'Create' : 'Update'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RentProperties;