import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import DataTable from '../components/DataTable';
import LocationSelector from '../components/LocationSelector';
import Loader from '../components/Loader';
import { RentStatus } from '../types';
import { STATUS_COLORS } from '../constants';
import { useLocations } from '../context/LocationContext';
import { api } from '../api/api';
import {
  getRentProperties,
  createRentProperty,
  updateRentProperty,
} from '../api/rent.api';
import { reverseGeocodeDetailed } from '../utils/geocode';
import PropertyAssetsTabs from '../components/PropertyAssetsTabs';

const EMPTY_FORM = {
  contact_phone: '',
  seller_name: '',
  alternate_contact_phone: '',
  alternate_seller_name: '',
  title: '',
  address: '',
  latitude: '',
  longitude: '',
  district_id: null,
  taluk_id: null,
  village_id: null,
  status: 'pending',
  bhk: '',
  rent_amount: '',
  advance_amount: '',
  property_use: 'residential',
  rent_status: 'Nil Booking',
  landmark: '',
  street_name: '',
  extent_area: '',
  extent_unit: '',
  description: '',
};

const normalizeForm = (data = {}) => {
  const base = { ...EMPTY_FORM };
  Object.keys(EMPTY_FORM).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      base[key] = key === 'property_use' ? String(data[key]).toLowerCase() : data[key];
    }
  });
  if (data.seller_name) base.seller_name = data.seller_name;
  else if (data.seller?.name) base.seller_name = data.seller.name;
  if (data.contact_phone) base.contact_phone = data.contact_phone;
  else if (data.seller?.contact_phone) base.contact_phone = data.seller.contact_phone;
  return base;
};

const FORM_TABS = [
  { key: 'details',       label: 'Details' },
  { key: 'seller',        label: 'Seller' },
  { key: 'property-info', label: 'Property Info' },
  { key: 'images',        label: 'Images' },
  { key: 'documents',     label: 'Documents' },
];

const RentProperties = () => {
  const { districts } = useLocations();
  const [allProperties, setAllProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState('add');
  const isReadOnly = mode === 'view';

  const [sellerStatus, setSellerStatus] = useState(null);
  const [checkingSeller, setCheckingSeller] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const shouldCheckPhoneRef = useRef(false);

  const [formTab, setFormTab] = useState('details');
  const [assets, setAssets] = useState([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [geocodingAddress, setGeocodingAddress] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    dateRange: 'all', startDate: '', endDate: '',
    district_id: '', taluk_id: '', village_id: '', property_use: 'all'
  });
  const [filterTaluks, setFilterTaluks] = useState([]);
  const [filterVillages, setFilterVillages] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  const isNewProperty = !selected?.property_id;
  const propertyUse = String(form.property_use || '').toLowerCase();
  const isResidential = propertyUse === 'residential';
  const isCommercial = propertyUse === 'commercial';

  // ── Style helpers ──────────────────────────────────────────────────────────
  const fv = (f) => validationErrors[f] ? 'border-red-500 bg-red-50' : 'border-gray-300';
  const inp = (f) => `w-full px-4 py-2.5 rounded-xl border ${fv(f)} font-semibold text-sm`;
  const lbl = "text-[10px] font-bold uppercase tracking-widest text-gray-500";
  const fw = "flex flex-col space-y-2";
  const dd = "px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20 transition-all";

  const tabBtnClass = (key) => {
    const isActive = formTab === key;
    const locked = isNewProperty && key !== 'details';
    return `py-3 px-1 text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
      locked ? 'text-gray-300 cursor-not-allowed'
      : isActive ? 'border-b-2 border-blue-600 text-blue-600'
      : 'text-gray-400 hover:text-gray-600'}`;
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const fetchRent = async () => {
    setLoading(true);
    try {
      const data = await getRentProperties();
      setAllProperties(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchRent(); }, []);

  // Phone check
  useEffect(() => {
    const run = async () => {
      if (!shouldCheckPhoneRef.current || mode === 'view') return;
      const phone = form.contact_phone;
      if (phone.length > 0 && phone.length < 10) { setPhoneError('Please enter 10 digits'); setSellerStatus(null); return; }
      if (phone.length === 10) {
        setPhoneError(''); setCheckingSeller(true);
        try {
          const res = await api.get(`/rent/check/${phone}`);
          if (res.data?.seller_id) {
            if (!form.seller_name) setForm(p => ({ ...p, seller_name: res.data.name }));
            setSellerStatus('exists');
          } else { setSellerStatus('new'); }
        } catch { setSellerStatus('new'); }
        finally { setCheckingSeller(false); }
      } else { setPhoneError(''); setSellerStatus(null); }
    };
    const t = setTimeout(run, 500);
    return () => clearTimeout(t);
  }, [form.contact_phone, mode, form.seller_name]);

  useEffect(() => { if (!isModalOpen) shouldCheckPhoneRef.current = false; }, [isModalOpen]);

  useEffect(() => {
    if (isModalOpen && selected?.property_id) {
      setAssetLoading(true);
      api.get(`/property-assets/${selected.property_id}`).then(r => setAssets(r.data || [])).finally(() => setAssetLoading(false));
    } else { setAssets([]); setFormTab('details'); }
  }, [isModalOpen, selected]);

  useEffect(() => { if (form.status !== 'approved') setValidationErrors({}); }, [form.status]);

  useEffect(() => {
    if (!filters.district_id) { setFilterTaluks([]); setFilterVillages([]); return; }
    api.get(`/locations/taluks/${filters.district_id}`).then(r => setFilterTaluks(r.data || []));
  }, [filters.district_id]);

  useEffect(() => {
    if (!filters.taluk_id) { setFilterVillages([]); return; }
    api.get(`/locations/villages/${filters.taluk_id}`).then(r => setFilterVillages(r.data || []));
  }, [filters.taluk_id]);

  useEffect(() => {
    let result = [...allProperties];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.formatted_id || '').toLowerCase().includes(q) ||
        (p.contact_phone || '').includes(q) ||
        (p.property_use || '').toLowerCase().includes(q) ||
        String(p.rent_amount || '').includes(q)
      );
    }
    if (filters.property_use !== 'all') result = result.filter(p => p.property_use === filters.property_use);
    if (filters.district_id) result = result.filter(p => Number(p.district_id) === Number(filters.district_id));
    if (filters.taluk_id) result = result.filter(p => Number(p.taluk_id) === Number(filters.taluk_id));
    if (filters.village_id) result = result.filter(p => Number(p.village_id) === Number(filters.village_id));
    if (filters.dateRange !== 'all') {
      const now = new Date(); const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
      result = result.filter(p => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        if (filters.dateRange === 'week') { const w = new Date(); w.setDate(now.getDate()-7); w.setHours(0,0,0,0); return d>=w&&d<=todayEnd; }
        if (filters.dateRange === 'month') { const m = new Date(); m.setMonth(now.getMonth()-1); m.setHours(0,0,0,0); return d>=m&&d<=todayEnd; }
        if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
          const s=new Date(filters.startDate); s.setHours(0,0,0,0);
          const e=new Date(filters.endDate); e.setHours(23,59,59,999); return d>=s&&d<=e;
        }
        return true;
      });
    }
    setFilteredProperties(result);
  }, [filters, allProperties, searchQuery]);

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openModal = (property = null, modalMode = 'add') => {
    setSelected(property || null);
    setForm(property ? normalizeForm(property) : EMPTY_FORM);
    setMode(modalMode);
    setValidationErrors({});
    setSellerStatus(null); setCheckingSeller(false); setPhoneError('');
    shouldCheckPhoneRef.current = !property;
    setIsModalOpen(true);
  };

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value ?? '' }));

  const handleCoordBlur = useCallback(async (latVal, lngVal) => {
    const lat = parseFloat(latVal), lng = parseFloat(lngVal);
    if (isNaN(lat) || isNaN(lng)) return;
    setGeocodingAddress(true);
    try {
      const result = await reverseGeocodeDetailed(lat, lng);
      if (result) {
        setForm(prev => {
          const update = { ...prev, address: result.address };
          if (result.district && districts?.length && !prev.district_id) {
            const match = districts.find(d =>
              d.district_name.toLowerCase().includes(result.district.toLowerCase()) ||
              result.district.toLowerCase().includes(d.district_name.toLowerCase())
            );
            if (match) { update.district_id = match.district_id; update.taluk_id = null; update.village_id = null; }
          }
          return update;
        });
      }
    } catch {} finally { setGeocodingAddress(false); }
  }, [districts]);

  // ── Create / Update ────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.latitude || !form.longitude || isNaN(parseFloat(form.latitude)) || isNaN(parseFloat(form.longitude))) {
      alert('Latitude and longitude are required to create a property.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createRentProperty(form);
      const created = res.data || res.property || res;
      await fetchRent();
      setSelected(created);
      setMode('edit');
      setFormTab('seller');
      shouldCheckPhoneRef.current = false;
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const handleUpdate = async () => {
    if (mode === 'view' || !selected?.property_id) return;
    setSubmitting(true);
    try {
      await updateRentProperty(selected.property_id, form);
      await fetchRent();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const handleExport = () => {
    const rows = filteredProperties.map(p => ({
      'Property ID': p.formatted_id, 'Seller Name': p.seller?.name || p.seller_name,
      'Phone': p.contact_phone, 'BHK': p.bhk,
      'Extent Area': p.extent_area, 'Extent Unit': p.extent_unit,
      'Rent Amount': p.rent_amount, 'Advance': p.advance_amount,
      'Status': p.rent_status, 'Property Use': p.property_use,
      'Street': p.street_name, 'Landmark': p.landmark,
      'Address': p.address, 'Latitude': p.latitude, 'Longitude': p.longitude,
      'Created At': new Date(p.created_at).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rental_Inventory');
    XLSX.writeFile(wb, `Rent_Inventory_${new Date().toLocaleDateString()}.xlsx`);
  };

  const resetFilters = () => {
    setFilters({ dateRange:'all', district_id:'', taluk_id:'', village_id:'', property_use:'all', startDate:'', endDate:'' });
    setSearchQuery('');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Rental Inventory</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Manage Listings</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50">Export Excel</button>
          <button onClick={() => openModal(null,'add')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700">Add Rent Listing</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className={fw}>
            <label className={lbl}>Search</label>
            <div className="relative">
              <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                placeholder="ID, contact, type, rent..."
                className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20 w-52" />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
          </div>

          <div className={fw}>
            <label className={lbl}>Property Type</label>
            <select value={filters.property_use} onChange={e=>setFilters({...filters,property_use:e.target.value})} className={dd}>
              <option value="all">All</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>

          <div className={fw}>
            <label className={lbl}>Date Range</label>
            <select value={filters.dateRange} onChange={e=>setFilters({...filters,dateRange:e.target.value})} className={dd}>
              <option value="all">All Time</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className={fw}>
            <label className={lbl}>District</label>
            <select value={filters.district_id} onChange={e=>setFilters({...filters,district_id:e.target.value,taluk_id:'',village_id:''})} className={dd}>
              <option value="">All Districts</option>
              {districts?.map(d=><option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
            </select>
          </div>

          {filters.district_id && (
            <div className={fw}>
              <label className={lbl}>Taluk</label>
              <select value={filters.taluk_id} onChange={e=>setFilters({...filters,taluk_id:e.target.value,village_id:''})} className={dd}>
                <option value="">All Taluks</option>
                {filterTaluks?.map(t=><option key={t.taluk_id} value={t.taluk_id}>{t.taluk_name}</option>)}
              </select>
            </div>
          )}

          {filters.taluk_id && (
            <div className={fw}>
              <label className={lbl}>Village</label>
              <select value={filters.village_id} onChange={e=>setFilters({...filters,village_id:e.target.value})} className={dd}>
                <option value="">All Villages</option>
                {filterVillages?.map(v=><option key={v.village_id} value={v.village_id}>{v.village_name}</option>)}
              </select>
            </div>
          )}

          <button onClick={resetFilters} className="text-[10px] font-bold text-red-500 uppercase pb-3 hover:underline">Reset</button>
        </div>

        {filters.dateRange === 'custom' && (
          <div className="flex gap-4 pt-2 border-t border-gray-50">
            <div className={fw}><label className={lbl}>From</label>
              <input type="date" value={filters.startDate} onChange={e=>setFilters({...filters,startDate:e.target.value})} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" /></div>
            <div className={fw}><label className={lbl}>To</label>
              <input type="date" value={filters.endDate} onChange={e=>setFilters({...filters,endDate:e.target.value})} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" /></div>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? <Loader /> : (
        <div className="overflow-x-auto">
          <DataTable
            columns={[
              { header:'ID', accessor:'formatted_id' },
              { header:'Contact', accessor:'contact_phone', className:'font-bold text-blue-600' },
              { header:'Registered', accessor:p=>new Date(p.created_at).toLocaleDateString(), sortable:true, sortBy:p=>new Date(p.created_at).getTime() },
              { header:'Approval', accessor:p=>{
                  const s=p.status||'pending';
                  const c={approved:'bg-green-100 text-green-800 border-green-200',pending:'bg-yellow-100 text-yellow-800 border-yellow-200',rejected:'bg-red-100 text-red-800 border-red-200'};
                  return <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${c[s]||'bg-gray-100 text-gray-800 border-gray-200'}`}>{s.charAt(0).toUpperCase()+s.slice(1)}</span>;
                }, sortable:true },
              { header:'Status', accessor:p=><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[p.rent_status]||'bg-gray-200'}`}>{p.rent_status}</span>, sortable:true },
              { header:'Rent', accessor:p=>`₹${Number(p.rent_amount||0).toLocaleString()}`, sortable:false }
            ]}
            data={filteredProperties}
            onEdit={p=>openModal(p,'edit')}
            onView={p=>openModal(p,'view')}
          />
        </div>
      )}

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="!m-0 fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-10">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-full">

            {/* Header */}
            <div className="px-8 py-5 border-b flex justify-between items-center bg-gray-50/50 shrink-0">
              <h3 className="text-xl font-bold uppercase tracking-tight text-gray-800">
                {mode==='add'?'Add':mode==='edit'?'Edit':'View'} Rental Property
                {selected?.formatted_id && <span className="ml-3 text-sm font-bold text-blue-600 normal-case">{selected.formatted_id}</span>}
              </h3>
              <button className="text-2xl text-gray-400 hover:text-gray-600" onClick={()=>setIsModalOpen(false)}>✕</button>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-5 px-8 border-b bg-white shrink-0 overflow-x-auto">
              {FORM_TABS.map(t=>(
                <button key={t.key} onClick={()=>{ if(!(isNewProperty&&t.key!=='details')) setFormTab(t.key); }} className={tabBtnClass(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto flex-1">

              {/* ── Details ── */}
              {formTab === 'details' && (
                <div className="space-y-6">
                  <div className={fw}>
                    <label className={lbl}>Approval Status</label>
                    <select disabled={isReadOnly} value={form.status} onChange={e=>{setForm({...form,status:e.target.value});if(e.target.value!=='approved')setValidationErrors({});}} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <label className={lbl}>Latitude</label>
                      <input disabled={isReadOnly} value={form.latitude} onChange={e=>handleChange('latitude',e.target.value)}
                        onBlur={e=>handleCoordBlur(e.target.value,form.longitude)} placeholder="e.g. 11.0168" className={inp('latitude')} />
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Longitude</label>
                      <input disabled={isReadOnly} value={form.longitude} onChange={e=>handleChange('longitude',e.target.value)}
                        onBlur={e=>handleCoordBlur(form.latitude,e.target.value)} placeholder="e.g. 76.9558" className={inp('longitude')} />
                    </div>
                  </div>

                  <div className={fw}>
                    <label className={lbl}>Property Location (District / Taluk / Village)</label>
                    {geocodingAddress && <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wide animate-pulse">Fetching location…</span>}
                    <LocationSelector district_id={form.district_id} taluk_id={form.taluk_id} village_id={form.village_id}
                      disabled={isReadOnly} onChange={loc=>setForm(p=>({...p,...loc}))} />
                  </div>

                  <div className={fw}>
                    <label className={lbl}>Address</label>
                    <textarea disabled={isReadOnly} value={form.address} onChange={e=>handleChange('address',e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm min-h-[80px]" />
                  </div>
                </div>
              )}

              {/* ── Seller ── */}
              {formTab === 'seller' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <div className="flex justify-between items-center">
                        <label className={lbl}>Primary Phone</label>
                        {!isReadOnly && checkingSeller && <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"/>}
                        {!isReadOnly && sellerStatus==='exists' && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">EXISTING OWNER</span>}
                      </div>
                      <input disabled={isReadOnly} value={form.contact_phone}
                        onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(0,10);setForm({...form,contact_phone:v});shouldCheckPhoneRef.current=true;}}
                        placeholder="10-digit number" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                      {phoneError && <p className="text-[9px] text-red-500 font-bold">{phoneError}</p>}
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Primary Name</label>
                      <input disabled={isReadOnly} value={form.seller_name} onChange={e=>handleChange('seller_name',e.target.value)} placeholder="Owner name"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <label className={lbl}>Additional Phone</label>
                      <input disabled={isReadOnly} value={form.alternate_contact_phone}
                        onChange={e=>handleChange('alternate_contact_phone',e.target.value.replace(/\D/g,'').slice(0,10))}
                        placeholder="Optional" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Additional Name</label>
                      <input disabled={isReadOnly} value={form.alternate_seller_name} onChange={e=>handleChange('alternate_seller_name',e.target.value)} placeholder="Optional"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Property Info ── */}
              {formTab === 'property-info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <label className={lbl}>Rent Status</label>
                      <select disabled={isReadOnly} value={form.rent_status} onChange={e=>handleChange('rent_status',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                        {Object.values(RentStatus).map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Property Use</label>
                      <select disabled={isReadOnly} value={propertyUse}
                        onChange={e=>{ const v=e.target.value; setForm(p=>({...p,property_use:v,bhk:v==='commercial'?'':p.bhk,extent_area:v==='residential'?'':p.extent_area,extent_unit:v==='residential'?'':p.extent_unit})); }}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <label className={lbl}>Rent Amount (₹)</label>
                      <input disabled={isReadOnly} value={form.rent_amount} onChange={e=>handleChange('rent_amount',e.target.value)} className={inp('rent_amount')} />
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Advance Amount (₹)</label>
                      <input disabled={isReadOnly} value={form.advance_amount} onChange={e=>handleChange('advance_amount',e.target.value)} className={inp('advance_amount')} />
                    </div>
                  </div>
                  {isResidential && (
                    <div className={fw}>
                      <label className={lbl}>BHK</label>
                      <input disabled={isReadOnly} value={form.bhk} onChange={e=>handleChange('bhk',e.target.value)} placeholder="e.g. 2" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                    </div>
                  )}
                  {isCommercial && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className={fw}>
                        <label className={lbl}>Extent Area</label>
                        <input disabled={isReadOnly} value={form.extent_area} onChange={e=>handleChange('extent_area',e.target.value)} className={inp('extent_area')} />
                      </div>
                      <div className={fw}>
                        <label className={lbl}>Extent Unit</label>
                        <select disabled={isReadOnly} value={form.extent_unit} onChange={e=>handleChange('extent_unit',e.target.value)} className={inp('extent_unit')}>
                          <option value="">Select Unit</option>
                          <option value="sqft">Sq. Feet</option>
                          <option value="sqmt">Sq. Meters</option>
                          <option value="acres">Acres</option>
                          <option value="cents">Cents</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <label className={lbl}>Street Name</label>
                      <input disabled={isReadOnly} value={form.street_name} onChange={e=>handleChange('street_name',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Landmark</label>
                      <input disabled={isReadOnly} value={form.landmark} onChange={e=>handleChange('landmark',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                    </div>
                  </div>
                  <div className={fw}>
                    <label className={lbl}>Description</label>
                    <textarea disabled={isReadOnly} value={form.description} onChange={e=>handleChange('description',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm min-h-[80px]" />
                  </div>
                </div>
              )}

              {/* ── Images ── */}
              {formTab === 'images' && (
                assetLoading ? <Loader /> :
                <PropertyAssetsTabs propertyId={selected?.property_id||null} assets={assets} setAssets={setAssets}
                  isReadOnly={isReadOnly} propertyData={selected||form} mode={mode} onlyType="image" />
              )}

              {/* ── Documents ── */}
              {formTab === 'documents' && (
                assetLoading ? <Loader /> :
                <PropertyAssetsTabs propertyId={selected?.property_id||null} assets={assets} setAssets={setAssets}
                  isReadOnly={isReadOnly} propertyData={selected||form} mode={mode} onlyType="document" />
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t flex justify-end gap-4 bg-gray-50 shrink-0">
              <button onClick={()=>setIsModalOpen(false)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100">Close</button>
              {!isReadOnly && formTab !== 'images' && formTab !== 'documents' && (
                mode === 'add' && formTab === 'details' ? (
                  <button onClick={handleCreate} disabled={submitting} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-blue-700 disabled:opacity-70">
                    {submitting ? 'Creating…' : 'Create Property'}
                  </button>
                ) : (
                  <button onClick={handleUpdate} disabled={submitting} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-blue-700 disabled:opacity-70">
                    {submitting ? 'Saving…' : 'Update'}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentProperties;
