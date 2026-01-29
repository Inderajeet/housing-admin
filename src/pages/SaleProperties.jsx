import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import DataTable from '../components/DataTable';
import LocationSelector from '../components/LocationSelector';
import Loader from '../components/Loader';
import { PropertyStatus, SaleStatus, SaleType } from '../types';
import { STATUS_COLORS } from '../constants';
import { useLocations } from '../context/LocationContext';
import { api } from '../api/api';
import {
  getSaleProperties,
  createSaleProperty,
  updateSaleProperty,
} from '../api/sale.api';
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
  area_id: '',
  status: PropertyStatus.ACTIVE,
  sale_type: SaleType.LAND,
  price: '',
  area_size: '',
  survey_number: '',
  street_name_or_road_name: '',
  boundary_north: '',
  boundary_south: '',
  boundary_east: '',
  boundary_west: '',
  sale_status: SaleStatus.AVAILABLE,
  total_units_count: '',
  booked_units: '',
  open_units: '',
  description: '',
  property_use: 'sale',
};

const normalizeForm = (data = {}) => {
  const base = { ...EMPTY_FORM };

  // Copy all direct properties
  Object.keys(EMPTY_FORM).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      base[key] = data[key];
    }
  });

  // Handle seller name from various sources
  if (data.seller_name) {
    base.seller_name = data.seller_name;
  } else if (data.seller?.name) {
    base.seller_name = data.seller.name;
  }

  // Handle contact phone from various sources
  if (data.contact_phone) {
    base.contact_phone = data.contact_phone;
  } else if (data.seller?.contact_phone) {
    base.contact_phone = data.seller.contact_phone;
  }

  // Auto-calculate open units if needed
  if (base.sale_type?.toUpperCase() === 'PLOT' || base.sale_type?.toUpperCase() === 'FLAT') {
    const getBookedSet = (input) => {
      const bookedSet = new Set();
      if (!input) return bookedSet;
      const parts = input.toString().split(',').map(p => p.trim());
      parts.forEach(part => {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.min(start, end); i <= Math.max(start, end); i++) bookedSet.add(i);
          }
        } else {
          const num = Number(part);
          if (!isNaN(num)) bookedSet.add(num);
        }
      });
      return bookedSet;
    };

    const getRangeString = (numbers) => {
      if (numbers.length === 0) return "None";
      numbers.sort((a, b) => a - b);
      const ranges = [];
      let start = numbers[0];
      let end = numbers[0];
      for (let i = 1; i <= numbers.length; i++) {
        if (numbers[i] === end + 1) { end = numbers[i]; }
        else {
          ranges.push(start === end ? `${start}` : `${start}-${end}`);
          start = numbers[i]; end = numbers[i];
        }
      }
      return ranges.join(', ');
    };

    const total = parseInt(base.total_units_count) || 0;
    const bookedSet = getBookedSet(base.booked_units);
    const openNumbers = [];
    for (let i = 1; i <= total; i++) {
      if (!bookedSet.has(i)) openNumbers.push(i);
    }
    base.open_units = getRangeString(openNumbers);
  }

  return base;
};

const SaleProperties = () => {
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
    sale_type: 'all'
  });
  const [filterTaluks, setFilterTaluks] = useState([]);
  const [filterVillages, setFilterVillages] = useState([]);

  const shouldCheckPhoneRef = useRef(false);

  const showExtraFields = form.sale_type?.toUpperCase() === 'PLOT' || form.sale_type?.toUpperCase() === 'FLAT';

  const fetchSale = async () => {
    setLoading(true);
    try {
      const data = await getSaleProperties();
      setAllProperties(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSale(); }, []);

  // Phone check logic
  useEffect(() => {
    const checkPhone = async () => {
      if (!shouldCheckPhoneRef.current || mode === 'view') {
        return;
      }

      const phone = form.contact_phone;

      if (phone.length > 0 && phone.length < 10) {
        setPhoneError('Please enter 10 digits');
        setSellerStatus(null);
        return;
      }

      if (phone.length === 10) {
        setPhoneError('');
        setCheckingSeller(true);
        try {
          const res = await api.get(`/sale/check/${phone}`);
          if (res.data && res.data.seller_id) {
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
    
    if (filters.sale_type !== 'all') {
      result = result.filter(p => p.sale_type === filters.sale_type);
    }
    
    if (filters.district_id) {
      result = result.filter(p => Number(p.district_id) === Number(filters.district_id));
    }
    if (filters.taluk_id) {
      result = result.filter(p => Number(p.taluk_id) === Number(filters.taluk_id));
    }
    if (filters.village_id) {
      result = result.filter(p => Number(p.village_id) === Number(filters.village_id));
    }

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

  const openModal = (property = null, modalMode = 'add') => {
    if (property) {
      const normalizedForm = normalizeForm(property);
      setSelected(property);
      setForm(normalizedForm);

      if (modalMode === 'edit') {
        shouldCheckPhoneRef.current = false;
      } else if (modalMode === 'view') {
        shouldCheckPhoneRef.current = false;
      }
    } else {
      setSelected(null);
      setForm(EMPTY_FORM);
      shouldCheckPhoneRef.current = true;
    }

    setMode(modalMode);

    if (modalMode === 'view') {
      setSellerStatus(null);
      setCheckingSeller(false);
      setPhoneError('');
    } else {
      setSellerStatus(null);
      setCheckingSeller(false);
      setPhoneError('');
    }

    setIsModalOpen(true);
  };

  const handlePhoneChange = (e) => {
    const newPhone = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, contact_phone: newPhone });

    if (mode === 'edit') {
      shouldCheckPhoneRef.current = true;
    }
  };

  const handleChange = (key, value) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value ?? '' };

      if (showExtraFields && (key === 'total_units_count' || key === 'booked_units')) {
        const total = parseInt(key === 'total_units_count' ? value : prev.total_units_count) || 0;
        
        const getBookedSet = (input) => {
          const bookedSet = new Set();
          if (!input) return bookedSet;
          const parts = input.toString().split(',').map(p => p.trim());
          parts.forEach(part => {
            if (part.includes('-')) {
              const [start, end] = part.split('-').map(Number);
              if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.min(start, end); i <= Math.max(start, end); i++) bookedSet.add(i);
              }
            } else {
              const num = Number(part);
              if (!isNaN(num)) bookedSet.add(num);
            }
          });
          return bookedSet;
        };

        const getRangeString = (numbers) => {
          if (numbers.length === 0) return "None";
          numbers.sort((a, b) => a - b);
          const ranges = [];
          let start = numbers[0];
          let end = numbers[0];
          for (let i = 1; i <= numbers.length; i++) {
            if (numbers[i] === end + 1) { end = numbers[i]; }
            else {
              ranges.push(start === end ? `${start}` : `${start}-${end}`);
              start = numbers[i]; end = numbers[i];
            }
          }
          return ranges.join(', ');
        };

        const bookedSet = getBookedSet(key === 'booked_units' ? value : prev.booked_units);
        const openNumbers = [];
        for (let i = 1; i <= total; i++) {
          if (!bookedSet.has(i)) openNumbers.push(i);
        }
        updated.open_units = getRangeString(openNumbers);
      }
      return updated;
    });
  };

  const handleExport = () => {
    const dataToExport = filteredProperties.map(p => ({
      'Property ID': p.formatted_id,
      'Seller Name': p.seller?.name || p.seller_name,
      'Phone': p.contact_phone,
      'Sale Type': p.sale_type,
      'Price': p.price,
      'Area Size': p.area_size,
      'Status': p.sale_status,
      'Street': p.street_name_or_road_name,
      'Survey Number': p.survey_number,
      'Address': p.address,
      'Latitude': p.latitude,
      'Longitude': p.longitude,
      'Created At': new Date(p.created_at).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sale_Inventory");
    XLSX.writeFile(wb, `Sale_Inventory_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleSave = async () => {
    if (mode === 'view') return;
    if (!form.contact_phone || form.contact_phone.length < 10)
      return alert('Enter a valid 10-digit phone number');
    if (!form.seller_name.trim())
      return alert('Please enter seller name');

    setSubmitting(true);

    try {
      if (selected?.property_id) {
        await updateSaleProperty(selected.property_id, form);
      } else {
        await createSaleProperty(form);
      }

      await fetchSale();
      shouldCheckPhoneRef.current = false;
      setIsModalOpen(false);
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const dropdownClass = "px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sale Inventory</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Manage Listings</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50">Export Excel</button>
          <button onClick={() => openModal(null, 'add')} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700">Add Sale Listing</button>
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
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sale Type</label>
            <select value={filters.sale_type} onChange={e => setFilters({ ...filters, sale_type: e.target.value })} className={dropdownClass}>
              <option value="all">All Types</option>
              {Object.values(SaleType).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">District</label>
            <select value={filters.district_id} onChange={e => setFilters({ ...filters, district_id: e.target.value, taluk_id: '', village_id: '' })} className={dropdownClass}>
              <option value="">All Districts</option>
              {districts?.map(d => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
            </select>
          </div>
          
          {filters.district_id && (
            <div className="flex flex-col space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Taluk</label>
              <select value={filters.taluk_id} onChange={e => setFilters({ ...filters, taluk_id: e.target.value, village_id: '' })} className={dropdownClass}>
                <option value="">All Taluks</option>
                {filterTaluks?.map(t => <option key={t.taluk_id} value={t.taluk_id}>{t.taluk_name}</option>)}
              </select>
            </div>
          )}
          
          {filters.taluk_id && (
            <div className="flex flex-col space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Village</label>
              <select value={filters.village_id} onChange={e => setFilters({ ...filters, village_id: e.target.value })} className={dropdownClass}>
                <option value="">All Villages</option>
                {filterVillages?.map(v => <option key={v.village_id} value={v.village_id}>{v.village_name}</option>)}
              </select>
            </div>
          )}
          
          <button onClick={() => setFilters({ dateRange: 'all', sale_type: 'all', district_id: '', taluk_id: '', village_id: '', startDate: '', endDate: '' })} className="text-[10px] font-bold text-red-500 uppercase pb-3 hover:underline">Reset</button>
        </div>
        
        {filters.dateRange === 'custom' && (
          <div className="flex gap-4 pt-2 border-t border-gray-50">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">From</label>
              <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">To</label>
              <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" />
            </div>
          </div>
        )}
      </div>

      {loading ? <Loader /> : (
        <DataTable
          columns={[
            { header: 'ID', accessor: 'formatted_id' },
            { header: 'Contact', accessor: 'contact_phone', className: 'font-bold text-emerald-600' },
            { header: 'Registered', accessor: p => new Date(p.created_at).toLocaleDateString() },
            { header: 'Type', accessor: 'sale_type' },
            { header: 'Price', accessor: p => `₹${Number(p.price || 0).toLocaleString()}` },
            { header: 'Status', accessor: p => <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[p.sale_status] || 'bg-gray-200'}`}>{p.sale_status}</span> }
          ]}
          data={filteredProperties}
          onEdit={(p) => openModal(p, 'edit')}
          onView={(p) => openModal(p, 'view')}
        />
      )}

      {isModalOpen && (
        <>
          <div className="!m-0 fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-10">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-full">
              <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50 shrink-0">
                <h3 className="text-xl font-bold uppercase tracking-tight text-gray-800">
                  {mode === 'add' ? 'Add' : mode === 'edit' ? 'Edit' : 'View'} Sale Property
                </h3>
                <button className="text-2xl text-gray-400 hover:text-gray-600" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>

              <div className="flex gap-6 px-8 border-b bg-white shrink-0">
                {['details', 'assets'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 text-[10px] font-bold uppercase tracking-widest transition-all
                      ${activeTab === tab
                        ? 'border-b-2 border-emerald-600 text-emerald-600'
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
                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Seller Phone</label>
                          {mode !== 'view' && checkingSeller && <div className="animate-spin h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full"></div>}
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
                          onChange={e => handleChange('seller_name', e.target.value)}
                          placeholder="Enter name"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Property ID / Title</label>
                        <input disabled={true} value={selected?.formatted_id || 'NEW LISTING'} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 font-bold text-emerald-600" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Sale Status</label>
                        <select disabled={isReadOnly} value={form.sale_status} onChange={e => handleChange('sale_status', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold">
                          {Object.values(SaleStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Sale Type</label>
                        <select disabled={isReadOnly} value={form.sale_type} onChange={e => handleChange('sale_type', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold">
                          {Object.values(SaleType).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Price</label>
                        <input disabled={isReadOnly} value={form.price} onChange={e => handleChange('price', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                    </div>

                    {showExtraFields && (
                      <div className="grid grid-cols-3 gap-8">
                        <div className="flex flex-col space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Units</label>
                          <input type="number" disabled={isReadOnly} value={form.total_units_count} onChange={e => handleChange('total_units_count', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                        </div>
                        <div className="flex flex-col space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Booked Units</label>
                          <input disabled={isReadOnly} value={form.booked_units} onChange={e => handleChange('booked_units', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" placeholder="e.g. 1-5, 8" />
                        </div>
                        <div className="flex flex-col space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Available Units (Auto)</label>
                          <input disabled value={form.open_units} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold bg-gray-100 text-emerald-700" />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-8">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Area Size</label>
                        <input disabled={isReadOnly} value={form.area_size} onChange={e => handleChange('area_size', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Survey Number</label>
                        <input disabled={isReadOnly} value={form.survey_number} onChange={e => handleChange('survey_number', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Street/Road Name</label>
                        <input disabled={isReadOnly} value={form.street_name_or_road_name} onChange={e => handleChange('street_name_or_road_name', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Boundary North</label>
                        <input disabled={isReadOnly} value={form.boundary_north} onChange={e => handleChange('boundary_north', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Boundary South</label>
                        <input disabled={isReadOnly} value={form.boundary_south} onChange={e => handleChange('boundary_south', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Boundary East</label>
                        <input disabled={isReadOnly} value={form.boundary_east} onChange={e => handleChange('boundary_east', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Boundary West</label>
                        <input disabled={isReadOnly} value={form.boundary_west} onChange={e => handleChange('boundary_west', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Address</label>
                      <textarea disabled={isReadOnly} value={form.address} onChange={e => handleChange('address', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold min-h-[80px]" />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Latitude</label>
                        <input disabled={isReadOnly} value={form.latitude} onChange={e => handleChange('latitude', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Longitude</label>
                        <input disabled={isReadOnly} value={form.longitude} onChange={e => handleChange('longitude', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
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
                    propertyId={selected?.property_id}
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
                  <button onClick={handleSave} disabled={submitting} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg">
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

export default SaleProperties;