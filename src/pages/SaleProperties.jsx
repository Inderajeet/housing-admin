import React, { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import DataTable from '../components/DataTable';
import LocationSelector from '../components/LocationSelector';
import SellerSelect from '../components/SellerSelect';
import Loader from '../components/Loader';
import { api } from '../api/api';
import { PropertyStatus, SaleStatus, SaleType } from '../types';
import { STATUS_COLORS } from '../constants';

// Assuming these are available in your project to get names for the dropdowns
import { useLocations } from '../context/LocationContext';

import {
  getSaleProperties,
  createSaleProperty,
  updateSaleProperty,
} from '../api/sale.api';

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
  boundary_north: '',
  boundary_south: '',
  boundary_east: '',
  boundary_west: '',
  sale_status: SaleStatus.AVAILABLE,
  total_units_count: '',
  booked_units: '',
  open_units: '',
};

const normalizeForm = (data = {}) => ({
  ...EMPTY_FORM,
  ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ''])),
});

const SaleProperties = () => {
  const { districts, taluks, villages } = useLocations(); // From your context
  const [allProperties, setAllProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState('add');


  // Filter States
  const [filters, setFilters] = useState({
    dateRange: 'all',
    startDate: '',
    endDate: '',
    saleType: 'all',
    district_id: '',
    taluk_id: '',
    village_id: ''
  });

  const isReadOnly = mode === 'view';
  const showExtraFields = form.sale_type?.toUpperCase() === 'PLOT' || form.sale_type?.toUpperCase() === 'FLAT';

  const fetchSale = async () => {
    setLoading(true);
    try {
      const data = await getSaleProperties();
      const sortedData = Array.isArray(data) ? data : [];
      setAllProperties(sortedData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSale(); }, []);

  // --- INVENTORY CALCULATION ---
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

  // --- FILTERING LOGIC ---
  // --- UPDATED FILTERING LOGIC ---
  useEffect(() => {
    let result = [...allProperties];

    if (filters.saleType !== 'all') {
      result = result.filter(p => p.sale_type === filters.saleType);
    }

    // Use truthy check to prevent filtering when the dropdown is on "All"
    if (filters.district_id) {
      result = result.filter(p => Number(p.district_id) === Number(filters.district_id));
    }

    if (filters.taluk_id) {
      result = result.filter(p => Number(p.taluk_id) === Number(filters.taluk_id));
    }

    if (filters.village_id) {
      result = result.filter(p => Number(p.village_id) === Number(filters.village_id));
    }

    // ... rest of your date filtering code
    setFilteredProperties(result);
  }, [filters, allProperties]);

  const handleChange = (key, value) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value ?? '' };
      if (showExtraFields && (key === 'total_units_count' || key === 'booked_units')) {
        const total = parseInt(key === 'total_units_count' ? value : prev.total_units_count) || 0;
        const bookedSet = getBookedSet(key === 'booked_units' ? value : prev.booked_units);
        const openNumbers = [];
        for (let i = 1; i <= total; i++) { if (!bookedSet.has(i)) openNumbers.push(i); }
        updated.open_units = getRangeString(openNumbers);
      }
      return updated;
    });
  };

  const handleExport = () => {
    const dataToExport = filteredProperties.map(p => ({
      ID: p.formatted_id,
      Seller: p.contact_phone,
      Registered: new Date(p.created_at).toLocaleDateString(),
      Type: p.sale_type,
      Price: p.price,
      Status: p.sale_status
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "Properties_Export.xlsx");
  };

  const handleSave = async () => {
    if (!form.seller_id) return alert('Please select a seller');
    if (selected?.property_id) { await updateSaleProperty(selected.property_id, form); }
    else { await createSaleProperty(form); }
    await fetchSale();
    setIsModalOpen(false);
  };

  const openAdd = () => { setForm(EMPTY_FORM); setMode('add'); setSelected(null); setIsModalOpen(true); };
  const openEdit = (p) => { setMode('edit'); setForm(normalizeForm(p)); setSelected(p); setIsModalOpen(true); };
  const openView = (p) => { setMode('view'); setForm(normalizeForm(p)); setSelected(p); setIsModalOpen(true); };

  const [filterTaluks, setFilterTaluks] = useState([]);
  const [filterVillages, setFilterVillages] = useState([]);

  // 2. Add these effects to fetch data when filter IDs change
  useEffect(() => {
    if (!filters.district_id) {
      setFilterTaluks([]);
      setFilterVillages([]);
      return;
    }
    api.get(`/locations/taluks/${filters.district_id}`)
      .then(res => setFilterTaluks(res.data || []))
      .catch(() => setFilterTaluks([]));
  }, [filters.district_id]);

  useEffect(() => {
    if (!filters.taluk_id) {
      setFilterVillages([]);
      return;
    }
    api.get(`/locations/villages/${filters.taluk_id}`)
      .then(res => setFilterVillages(res.data || []))
      .catch(() => setFilterVillages([]));
  }, [filters.taluk_id]);
  // Common CSS for dropdowns
  const dropdownClass = "px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sale Inventory</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Property Listings</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors">Export Excel</button>
          <button onClick={openAdd} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700">Add Sale Property</button>
        </div>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-6 items-end">
          {/* Date Filter */}
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date Range</label>
            <select value={filters.dateRange} onChange={e => setFilters({ ...filters, dateRange: e.target.value })} className={dropdownClass}>
              <option value="all">All Time</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Property Type</label>
            <select value={filters.saleType} onChange={e => setFilters({ ...filters, saleType: e.target.value })} className={dropdownClass}>
              <option value="all">All Types</option>
              {Object.values(SaleType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* SEQUENTIAL LOCATION FILTERS */}
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">District</label>
            <select
              value={filters.district_id}
              onChange={e => setFilters({ ...filters, district_id: e.target.value, taluk_id: '', village_id: '' })}
              className={dropdownClass}
            >
              <option value="">All Districts</option>
              {districts?.map(d => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
            </select>
          </div>

          {filters.district_id && (
            <div className="flex flex-col space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Taluk</label>
              <select
                value={filters.taluk_id}
                onChange={e => setFilters({ ...filters, taluk_id: e.target.value, village_id: '' })}
                className={dropdownClass}
              >
                <option value="">All Taluks</option>
                {/* USE filterTaluks HERE */}
                {filterTaluks.map(t => (
                  <option key={t.taluk_id} value={t.taluk_id}>{t.taluk_name}</option>
                ))}
              </select>
            </div>
          )}

          {filters.taluk_id && (
            <div className="flex flex-col space-y-2 animate-in slide-in-from-left-2 duration-200">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Village</label>
              <select
                value={filters.village_id}
                onChange={e => setFilters({ ...filters, village_id: e.target.value })}
                className={dropdownClass}
              >
                <option value="">All Villages</option>
                {/* USE filterVillages HERE */}
                {filterVillages.map(v => (
                  <option key={v.village_id} value={v.village_id}>{v.village_name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              setFilters({
                dateRange: 'all',
                saleType: 'all',
                startDate: '',
                endDate: '',
                district_id: '',
                taluk_id: '',
                village_id: ''
              });
              // ALSO CLEAR THE DROPDOWN LISTS MANUALLY HERE
              setFilterTaluks([]);
              setFilterVillages([]);
            }}
            className="text-[10px] font-bold text-red-500 uppercase pb-3 hover:underline"
          >
            Reset
          </button> </div>

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
            { header: 'Seller Number', accessor: 'contact_phone', className: 'font-medium' },
            { header: 'Registered', accessor: p => new Date(p.created_at).toLocaleDateString() },
            { header: 'Type', accessor: 'sale_type' },
            { header: 'Price', accessor: p => `₹${Number(p.price || 0).toLocaleString()}` },
            {
              header: 'Status',
              accessor: p => <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[p.sale_status] || 'bg-gray-100'}`}>{p.sale_status}</span>
            }
          ]}
          data={filteredProperties} onEdit={openEdit} onView={openView}
        />
      )}

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold uppercase tracking-tight text-gray-800">{mode} Sale Property</h3>
              <button className="text-2xl text-gray-400 hover:text-gray-600" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto">
              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Property Title</label>
                  <input disabled={isReadOnly} value={form.title} onChange={e => handleChange('title', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Select Seller</label>
                  <SellerSelect value={form.seller_id} disabled={isReadOnly} onChange={(s) => { handleChange('seller_id', s.seller_id); handleChange('contact_phone', s.phone_number || ''); }} />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Contact Phone</label>
                  <input disabled value={form.contact_phone} className="bg-gray-50 w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-600" />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Sale Status</label>
                  <select disabled={isReadOnly} value={form.sale_status} onChange={e => handleChange('sale_status', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold">
                    {Object.values(SaleStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Sale Type</label>
                  <select disabled={isReadOnly} value={form.sale_type} onChange={e => handleChange('sale_type', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold">
                    {Object.values(SaleType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Price (INR)</label>
                  <input disabled={isReadOnly} value={form.price} onChange={e => handleChange('price', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                </div>
              </div>

              {/* Inventory Fields */}
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
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Available Range (Auto)</label>
                    <input disabled value={form.open_units} className="bg-gray-100 text-emerald-700 w-full px-4 py-2.5 rounded-xl border border-gray-300 font-bold" />
                  </div>
                </div>
              )}

              {/* Boundary/Location Fields */}
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Latitude</label>
                  <input disabled={isReadOnly} value={form.latitude} onChange={e => handleChange('latitude', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300" />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Longitude</label>
                  <input disabled={isReadOnly} value={form.longitude} onChange={e => handleChange('longitude', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">North Boundary</label>
                  <input disabled={isReadOnly} value={form.boundary_north} onChange={e => handleChange('boundary_north', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300" />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">South Boundary</label>
                  <input disabled={isReadOnly} value={form.boundary_south} onChange={e => handleChange('boundary_south', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300" />
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Property Location (District, Taluk, Village)</label>
                <LocationSelector district_id={form.district_id} taluk_id={form.taluk_id} village_id={form.village_id} disabled={isReadOnly} onChange={(loc) => setForm(prev => ({ ...prev, ...loc }))} />
              </div>
            </div>

            <div className="px-8 py-6 border-t flex justify-end gap-4 bg-gray-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100 transition-colors">Close</button>
              {!isReadOnly && <button onClick={handleSave} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-colors">Save Property</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleProperties;