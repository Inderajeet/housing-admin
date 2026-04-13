import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import DataTable from '../components/DataTable';
import LocationSelector from '../components/LocationSelector';
import Loader from '../components/Loader';
import { SaleStatus, SaleType } from '../types';
import { STATUS_COLORS } from '../constants';
import { useLocations } from '../context/LocationContext';
import { getTaluks, getVillages } from '../api/location.api';
import { api } from '../api/api';
import {
  getSaleProperties,
  createSaleProperty,
  updateSaleProperty,
  deleteSaleProperty,
  uploadDrawingImage,
} from '../api/sale.api';
import PropertyAssetsTabs from '../components/PropertyAssetsTabs';
import { reverseGeocodeDetailed } from '../utils/geocode';

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
  area_id: '',
  status: 'pending',
  sale_type: SaleType.LAND,
  price: '',
  area_size: '',
  survey_number: '',
  street_name_or_road_name: '',
  layout_name: '',
  boundary_north: '',
  boundary_south: '',
  boundary_east: '',
  boundary_west: '',
  sale_status: 'Nil Booking',
  total_units_count: '',
  booked_units: '',
  open_units: '',
  description: '',
  property_use: 'sale',
  dtcp: '',
  parent_document: '',
  sub_registrar_office: '',
  gift_deed: '',
};

const normalizeForm = (data = {}) => {
  const base = { ...EMPTY_FORM };
  Object.keys(EMPTY_FORM).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) base[key] = data[key];
  });
  if (data.seller_name) base.seller_name = data.seller_name;
  else if (data.seller?.name) base.seller_name = data.seller.name;
  if (data.contact_phone) base.contact_phone = data.contact_phone;
  else if (data.seller?.contact_phone) base.contact_phone = data.seller.contact_phone;
  return base;
};

// 6 tabs: Details → Seller → Property Info → Legal → Images → Documents
const FORM_TABS = [
  { key: 'details',       label: 'Details' },
  { key: 'seller',        label: 'Seller' },
  { key: 'property-info', label: 'Property Info' },
  { key: 'legal',         label: 'Legal' },
  { key: 'images',        label: 'Images' },
  { key: 'documents',     label: 'Documents' },
];

const SaleProperties = () => {
  const { districts } = useLocations();
  const [allProperties, setAllProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef();

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
    district_id: '', taluk_id: '', village_id: '', sale_type: 'all'
  });
  const [filterTaluks, setFilterTaluks] = useState([]);
  const [filterVillages, setFilterVillages] = useState([]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const showExtraFields = form.sale_type?.toUpperCase() === 'PLOT' || form.sale_type?.toUpperCase() === 'FLAT';
  const isNewProperty = !selected?.property_id;

  // ── Styles helpers ─────────────────────────────────────────────────────────
  const fv = (f) => validationErrors[f] ? 'border-red-500 bg-red-50' : 'border-gray-300';
  const inp = (f) => `w-full px-4 py-2.5 rounded-xl border ${fv(f)} font-semibold text-sm`;
  const lbl = "text-[10px] font-bold uppercase tracking-widest text-gray-500";
  const fw = "flex flex-col space-y-2";
  const dd = "px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all";

  const tabBtnClass = (key) => {
    const isActive = formTab === key;
    const locked = isNewProperty && key !== 'details';
    return `py-3 px-1 text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
      locked ? 'text-gray-300 cursor-not-allowed'
      : isActive ? 'border-b-2 border-emerald-600 text-emerald-600'
      : 'text-gray-400 hover:text-gray-600'}`;
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const fetchSale = async () => {
    setLoading(true);
    try {
      const data = await getSaleProperties();
      setAllProperties(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSale(); }, []);

  // Phone check
  useEffect(() => {
    const run = async () => {
      if (!shouldCheckPhoneRef.current || mode === 'view') return;
      const phone = form.contact_phone;
      if (phone.length > 0 && phone.length < 10) { setPhoneError('Please enter 10 digits'); setSellerStatus(null); return; }
      if (phone.length === 10) {
        setPhoneError(''); setCheckingSeller(true);
        try {
          const res = await api.get(`/sale/check/${phone}`);
          if (res.data?.seller_id) {
            if (mode === 'add' || !form.seller_name) setForm(p => ({ ...p, seller_name: res.data.name }));
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
        (p.sale_type || '').toLowerCase().includes(q) ||
        String(p.price || '').includes(q)
      );
    }
    if (filters.sale_type !== 'all') result = result.filter(p => p.sale_type === filters.sale_type);
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
          const e=new Date(filters.endDate); e.setHours(23,59,59,999);
          return d>=s&&d<=e;
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

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleChange = (key, value) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value ?? '' };
      if (showExtraFields && (key === 'total_units_count' || key === 'booked_units')) {
        const total = parseInt(key === 'total_units_count' ? value : prev.total_units_count) || 0;
        const getBookedSet = (inp) => {
          const s = new Set(); if (!inp) return s;
          inp.toString().split(',').map(p=>p.trim()).forEach(part => {
            if (part.includes('-')) { const [a,b]=part.split('-').map(Number); if(!isNaN(a)&&!isNaN(b)) for(let i=Math.min(a,b);i<=Math.max(a,b);i++) s.add(i); }
            else { const n=Number(part); if(!isNaN(n)) s.add(n); }
          }); return s;
        };
        const bookedSet = getBookedSet(key==='booked_units'?value:prev.booked_units);
        const open=[]; for(let i=1;i<=total;i++) if(!bookedSet.has(i)) open.push(i);
        const getRng=(nums)=>{ if(!nums.length) return "None"; nums.sort((a,b)=>a-b); const r=[]; let s=nums[0],e=nums[0]; for(let i=1;i<=nums.length;i++){ if(nums[i]===e+1){e=nums[i]}else{r.push(s===e?`${s}`:`${s}-${e}`);s=nums[i];e=nums[i];} } return r.join(', '); };
        updated.open_units = getRng(open);
      }
      return updated;
    });
  };

  const handleCoordBlur = useCallback(async (latVal, lngVal) => {
    const lat = parseFloat(latVal), lng = parseFloat(lngVal);
    if (isNaN(lat) || isNaN(lng)) return;
    setGeocodingAddress(true);
    try {
      const result = await reverseGeocodeDetailed(lat, lng);
      if (result) {
        const update = { address: result.address };
        let resolvedDistrictId = null;

        if (result.district && districts?.length) {
          const matchedDistrict = districts.find(d =>
            d.district_name.toLowerCase().includes(result.district.toLowerCase()) ||
            result.district.toLowerCase().includes(d.district_name.toLowerCase())
          );
          if (matchedDistrict) {
            resolvedDistrictId = matchedDistrict.district_id;
            update.district_id = resolvedDistrictId;
            update.taluk_id = null;
            update.village_id = null;

            // Try to resolve taluk
            if (result.taluk) {
              try {
                const taluks = await getTaluks(resolvedDistrictId);
                const matchedTaluk = taluks.find(t =>
                  t.taluk_name.toLowerCase().includes(result.taluk.toLowerCase()) ||
                  result.taluk.toLowerCase().includes(t.taluk_name.toLowerCase())
                );
                if (matchedTaluk) {
                  update.taluk_id = matchedTaluk.taluk_id;

                  // Try to resolve village
                  if (result.village) {
                    try {
                      const villages = await getVillages(matchedTaluk.taluk_id);
                      const matchedVillage = villages.find(v =>
                        v.village_name.toLowerCase().includes(result.village.toLowerCase()) ||
                        result.village.toLowerCase().includes(v.village_name.toLowerCase())
                      );
                      if (matchedVillage) update.village_id = matchedVillage.village_id;
                    } catch {}
                  }
                }
              } catch {}
            }
          }
        }

        setForm(prev => {
          const merged = { ...prev, ...update };
          // Don't overwrite district/taluk/village if user already set them
          if (prev.district_id) { merged.district_id = prev.district_id; merged.taluk_id = prev.taluk_id; merged.village_id = prev.village_id; }
          return merged;
        });
      }
    } catch {} finally { setGeocodingAddress(false); }
  }, [districts]);

  // ── Save / Update ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.latitude || !form.longitude || isNaN(parseFloat(form.latitude)) || isNaN(parseFloat(form.longitude))) {
      alert('Latitude and longitude are required to create a property.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createSaleProperty(form);
      const created = res.data || res.property || res;
      await fetchSale();
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
      await updateSaleProperty(selected.property_id, form);
      await fetchSale();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const handleDeleteClick = (p) => setDeleteTarget(p);
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSaleProperty(deleteTarget.property_id);
      await fetchSale();
      setDeleteTarget(null);
    } catch (err) { alert('Failed to delete: ' + err.message); }
    finally { setDeleting(false); }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filteredProperties.map(p => ({
      'contact_phone': p.contact_phone, 'seller_name': p.seller?.name || p.seller_name,
      'alternate_contact_phone': p.alternate_contact_phone || '',
      'alternate_seller_name': p.alternate_seller_name || '',
      'latitude': p.latitude, 'longitude': p.longitude, 'address': p.address,
      'district_id': p.district_id, 'taluk_id': p.taluk_id, 'village_id': p.village_id,
      'status': p.status, 'sale_type': p.sale_type, 'price': p.price,
      'area_size': p.area_size, 'survey_number': p.survey_number,
      'street_name_or_road_name': p.street_name_or_road_name, 'layout_name': p.layout_name || '',
      'sale_status': p.sale_status,
      'boundary_north': p.boundary_north, 'boundary_south': p.boundary_south,
      'boundary_east': p.boundary_east, 'boundary_west': p.boundary_west,
      'description': p.description,
      'dtcp': p.dtcp || '', 'parent_document': p.parent_document || '',
      'sub_registrar_office': p.sub_registrar_office || '', 'gift_deed': p.gift_deed || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sale_Inventory');
    XLSX.writeFile(wb, `Sale_Inventory_${new Date().toLocaleDateString()}.xlsx`);
  };

  // ── Import from Excel ─────────────────────────────────────────────────────
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    let created = 0, skipped = 0, failed = 0;
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Normalize each row: trim whitespace from keys and stringify key to lowercase
      // so column headers like " Latitude " or "LATITUDE" all resolve correctly
      const rows = rawRows.map(raw => {
        const normalized = {};
        Object.entries(raw).forEach(([k, v]) => {
          normalized[k.trim().toLowerCase().replace(/\s+/g, '_')] = v;
        });
        return normalized;
      });

      for (const row of rows) {
        const lat = parseFloat(row.latitude);
        const lng = parseFloat(row.longitude);

        // latitude and longitude are required — skip row if missing or invalid
        if (isNaN(lat) || isNaN(lng)) { skipped++; continue; }

        // Check against existing DB list — skip if same coordinates already exist
        const duplicate = allProperties.some(p => {
          const pLat = parseFloat(p.latitude);
          const pLng = parseFloat(p.longitude);
          return !isNaN(pLat) && !isNaN(pLng) &&
            Math.abs(pLat - lat) < 0.0001 && Math.abs(pLng - lng) < 0.0001;
        });
        if (duplicate) { skipped++; continue; }

        try {
          // Resolve address, district, taluk, village from lat/lng
          let address = row.address || '';
          let district_id = row.district_id || null;
          let taluk_id = row.taluk_id || null;
          // also accept "village" column as a hint for matching
          let village_id = row.village_id || null;
          const villageHint = row.village || '';

          const geo = await reverseGeocodeDetailed(lat, lng);
          if (geo) {
            if (!address) address = geo.address || '';

            // Match district from geocode if not provided in Excel
            if (!district_id && geo.district && districts?.length) {
              const matchedDistrict = districts.find(d =>
                d.district_name.toLowerCase().includes(geo.district.toLowerCase()) ||
                geo.district.toLowerCase().includes(d.district_name.toLowerCase())
              );
              if (matchedDistrict) {
                district_id = matchedDistrict.district_id;

                // Fetch taluks and match from geocode
                if (!taluk_id && geo.taluk) {
                  try {
                    const taluks = await getTaluks(district_id);
                    const matchedTaluk = taluks.find(t =>
                      t.taluk_name.toLowerCase().includes(geo.taluk.toLowerCase()) ||
                      geo.taluk.toLowerCase().includes(t.taluk_name.toLowerCase())
                    );
                    if (matchedTaluk) {
                      taluk_id = matchedTaluk.taluk_id;

                      // Fetch villages and match from geocode or Excel "village" column
                      const villageSearch = geo.village || villageHint;
                      if (!village_id && villageSearch) {
                        try {
                          const villages = await getVillages(taluk_id);
                          const matchedVillage = villages.find(v =>
                            v.village_name.toLowerCase().includes(villageSearch.toLowerCase()) ||
                            villageSearch.toLowerCase().includes(v.village_name.toLowerCase())
                          );
                          if (matchedVillage) village_id = matchedVillage.village_id;
                        } catch {}
                      }
                    }
                  } catch {}
                }
              }
            }
          }

          // Only map fields that match known property fields; ignore extra columns
          // All row keys are already normalized (lowercase, trimmed, spaces→_)
          await createSaleProperty({
            contact_phone: String(row.contact_phone || ''),
            seller_name: String(row.seller_name || ''),
            alternate_contact_phone: String(row.alternate_contact_phone || ''),
            alternate_seller_name: String(row.alternate_seller_name || ''),
            latitude: lat,
            longitude: lng,
            address,
            district_id,
            taluk_id,
            village_id,
            status: row.status || 'pending',
            sale_type: row.sale_type || SaleType.LAND,
            price: row.price || '',
            area_size: row.area_size || '',
            survey_number: String(row.survey_number || ''),
            street_name_or_road_name: row.street_name_or_road_name || '',
            layout_name: row.layout_name || '',
            sale_status: row.sale_status || 'Nil Booking',
            boundary_north: row.boundary_north || '',
            boundary_south: row.boundary_south || '',
            boundary_east: row.boundary_east || '',
            boundary_west: row.boundary_west || '',
            description: row.description || '',
            dtcp: String(row.dtcp || ''),
            parent_document: String(row.parent_document || ''),
            sub_registrar_office: row.sub_registrar_office || '',
            gift_deed: String(row.gift_deed || ''),
            property_use: 'sale',
          });
          created++;
        } catch { failed++; }
      }

      alert(`Import complete: ${created} created, ${skipped} skipped (missing lat/lng or duplicate), ${failed} failed.`);
      await fetchSale();
    } catch (err) {
      alert('Failed to read Excel file: ' + err.message);
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const resetFilters = () => {
    setFilters({ dateRange:'all', sale_type:'all', district_id:'', taluk_id:'', village_id:'', startDate:'', endDate:'' });
    setSearchQuery('');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sale Inventory</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Manage Listings</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
          <button
            onClick={() => importFileRef.current.click()}
            disabled={importing}
            className="bg-white border border-blue-300 text-blue-700 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-50 disabled:opacity-60"
          >
            {importing ? 'Importing…' : 'Import Excel'}
          </button>
          <button onClick={handleExport} className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50">
            Export Excel
          </button>
          <button onClick={() => openModal(null, 'add')} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700">
            Add Sale Listing
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className={fw}>
            <label className={lbl}>Search</label>
            <div className="relative">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="ID, contact, type, price..."
                className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500/20 w-56" />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
          </div>

          <div className={fw}>
            <label className={lbl}>Date Range</label>
            <select value={filters.dateRange} onChange={e => setFilters({...filters, dateRange:e.target.value})} className={dd}>
              <option value="all">All Time</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className={fw}>
            <label className={lbl}>Sale Type</label>
            <select value={filters.sale_type} onChange={e => setFilters({...filters, sale_type:e.target.value})} className={dd}>
              <option value="all">All Types</option>
              {Object.values(SaleType).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className={fw}>
            <label className={lbl}>District</label>
            <select value={filters.district_id} onChange={e => setFilters({...filters, district_id:e.target.value, taluk_id:'', village_id:''})} className={dd}>
              <option value="">All Districts</option>
              {districts?.map(d => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
            </select>
          </div>

          {filters.district_id && (
            <div className={fw}>
              <label className={lbl}>Taluk</label>
              <select value={filters.taluk_id} onChange={e => setFilters({...filters, taluk_id:e.target.value, village_id:''})} className={dd}>
                <option value="">All Taluks</option>
                {filterTaluks?.map(t => <option key={t.taluk_id} value={t.taluk_id}>{t.taluk_name}</option>)}
              </select>
            </div>
          )}

          {filters.taluk_id && (
            <div className={fw}>
              <label className={lbl}>Village</label>
              <select value={filters.village_id} onChange={e => setFilters({...filters, village_id:e.target.value})} className={dd}>
                <option value="">All Villages</option>
                {filterVillages?.map(v => <option key={v.village_id} value={v.village_id}>{v.village_name}</option>)}
              </select>
            </div>
          )}

          <button onClick={resetFilters} className="text-[10px] font-bold text-red-500 uppercase pb-3 hover:underline">Reset</button>
        </div>

        {filters.dateRange === 'custom' && (
          <div className="flex gap-4 pt-2 border-t border-gray-50">
            <div className={fw}><label className={lbl}>From</label>
              <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate:e.target.value})} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" /></div>
            <div className={fw}><label className={lbl}>To</label>
              <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate:e.target.value})} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" /></div>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? <Loader /> : (
        <div className="overflow-x-auto">
          <DataTable
            columns={[
              { header:'ID', accessor:'formatted_id' },
              { header:'Contact', accessor:'contact_phone', className:'font-bold text-emerald-600' },
              { header:'Registered', accessor:p=>new Date(p.created_at).toLocaleDateString(), sortable:true, sortBy:p=>new Date(p.created_at).getTime() },
              { header:'Type', accessor:'sale_type', sortable:false },
              { header:'Approval', accessor:p=>{
                  const s=p.status||'pending';
                  const c={approved:'bg-green-100 text-green-800 border-green-200',pending:'bg-yellow-100 text-yellow-800 border-yellow-200',rejected:'bg-red-100 text-red-800 border-red-200'};
                  return <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${c[s]||'bg-gray-100 text-gray-800 border-gray-200'}`}>{s.charAt(0).toUpperCase()+s.slice(1)}</span>;
                }, sortable:true },
              { header:'Status', accessor:p=><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[p.sale_status]||'bg-gray-200'}`}>{p.sale_status}</span>, sortable:true },
              { header:'Price', accessor:p=>`₹${Number(p.price||0).toLocaleString()}` }
            ]}
            data={filteredProperties}
            onEdit={p=>openModal(p,'edit')}
            onView={p=>openModal(p,'view')}
            actions={p=>(
              <button onClick={()=>handleDeleteClick(p)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100" title="Delete property">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            )}
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
                {mode==='add'?'Add':mode==='edit'?'Edit':'View'} Sale Property
                {selected?.formatted_id && <span className="ml-3 text-sm font-bold text-emerald-600 normal-case">{selected.formatted_id}</span>}
              </h3>
              <button className="text-2xl text-gray-400 hover:text-gray-600" onClick={()=>setIsModalOpen(false)}>✕</button>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-5 px-8 border-b bg-white shrink-0 overflow-x-auto">
              {FORM_TABS.map(t => (
                <button key={t.key} onClick={()=>{ if(!(isNewProperty&&t.key!=='details')) setFormTab(t.key); }} className={tabBtnClass(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto flex-1">

              {/* ── Tab: Details ── */}
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
                        onBlur={e=>handleCoordBlur(e.target.value,form.longitude)} placeholder="e.g. 11.0168"
                        className={inp('latitude')} />
                      {validationErrors.latitude && <p className="text-[9px] text-red-500 font-bold">{validationErrors.latitude}</p>}
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Longitude</label>
                      <input disabled={isReadOnly} value={form.longitude} onChange={e=>handleChange('longitude',e.target.value)}
                        onBlur={e=>handleCoordBlur(form.latitude,e.target.value)} placeholder="e.g. 76.9558"
                        className={inp('longitude')} />
                      {validationErrors.longitude && <p className="text-[9px] text-red-500 font-bold">{validationErrors.longitude}</p>}
                    </div>
                  </div>

                  <div className={fw}>
                    <label className={lbl}>Property Location (District / Taluk / Village)</label>
                    {geocodingAddress && <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wide animate-pulse">Fetching location…</span>}
                    <div className={`rounded-xl border ${validationErrors.district_id||validationErrors.taluk_id||validationErrors.village_id?'border-red-500 bg-red-50 p-1':''}`}>
                      <LocationSelector district_id={form.district_id} taluk_id={form.taluk_id} village_id={form.village_id}
                        disabled={isReadOnly} onChange={loc=>setForm(p=>({...p,...loc}))} />
                    </div>
                    {validationErrors.district_id && <p className="text-[9px] text-red-500 font-bold">District is required</p>}
                    {validationErrors.taluk_id && <p className="text-[9px] text-red-500 font-bold">Taluk is required</p>}
                    {validationErrors.village_id && <p className="text-[9px] text-red-500 font-bold">Village is required</p>}
                  </div>

                  <div className={fw}>
                    <label className={lbl}>Address</label>
                    <textarea disabled={isReadOnly} value={form.address} onChange={e=>handleChange('address',e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm min-h-[80px]" />
                  </div>
                </div>
              )}

              {/* ── Tab: Seller ── */}
              {formTab === 'seller' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <div className="flex justify-between items-center">
                        <label className={lbl}>Primary Phone</label>
                        {!isReadOnly && checkingSeller && <div className="animate-spin h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full"/>}
                        {!isReadOnly && sellerStatus==='exists' && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">EXISTING SELLER</span>}
                      </div>
                      <input disabled={isReadOnly} value={form.contact_phone}
                        onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(0,10);setForm({...form,contact_phone:v});shouldCheckPhoneRef.current=true;}}
                        placeholder="10-digit number" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                      {phoneError && <p className="text-[9px] text-red-500 font-bold">{phoneError}</p>}
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Primary Name</label>
                      <input disabled={isReadOnly} value={form.seller_name} onChange={e=>handleChange('seller_name',e.target.value)} placeholder="Enter name"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <label className={lbl}>Additional Phone</label>
                      <input disabled={isReadOnly} value={form.alternate_contact_phone}
                        onChange={e=>handleChange('alternate_contact_phone',e.target.value.replace(/\D/g,'').slice(0,10))}
                        placeholder="Optional 10-digit number" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Additional Name</label>
                      <input disabled={isReadOnly} value={form.alternate_seller_name} onChange={e=>handleChange('alternate_seller_name',e.target.value)} placeholder="Optional name"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Property Info ── */}
              {formTab === 'property-info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <label className={lbl}>Sale Status</label>
                      <select disabled={isReadOnly} value={form.sale_status} onChange={e=>handleChange('sale_status',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                        {Object.values(SaleStatus).map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Sale Type</label>
                      <select disabled={isReadOnly} value={form.sale_type} onChange={e=>handleChange('sale_type',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                        {Object.values(SaleType).map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <label className={lbl}>Price (₹)</label>
                      <input disabled={isReadOnly} value={form.price} onChange={e=>handleChange('price',e.target.value)} className={inp('price')} />
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Area Size</label>
                      <input disabled={isReadOnly} value={form.area_size} onChange={e=>handleChange('area_size',e.target.value)} className={inp('area_size')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <label className={lbl}>Survey Number</label>
                      <input disabled={isReadOnly} value={form.survey_number} onChange={e=>handleChange('survey_number',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Street / Road Name</label>
                      <input disabled={isReadOnly} value={form.street_name_or_road_name} onChange={e=>handleChange('street_name_or_road_name',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                    </div>
                  </div>
                  <div className={fw}>
                    <label className={lbl}>Layout Name</label>
                    <input disabled={isReadOnly} value={form.layout_name} onChange={e=>handleChange('layout_name',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" />
                  </div>
                  {showExtraFields && (
                    <div className="grid grid-cols-3 gap-6">
                      <div className={fw}><label className={lbl}>Total Units</label>
                        <input type="number" disabled={isReadOnly} value={form.total_units_count} onChange={e=>handleChange('total_units_count',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" /></div>
                      <div className={fw}><label className={lbl}>Booked Units</label>
                        <input disabled={isReadOnly} value={form.booked_units} onChange={e=>handleChange('booked_units',e.target.value)} placeholder="e.g. 1-5, 8" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" /></div>
                      <div className={fw}><label className={lbl}>Available (Auto)</label>
                        <input disabled value={form.open_units} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm bg-gray-100 text-emerald-700" /></div>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Boundaries</p>
                    <div className="grid grid-cols-2 gap-6">
                      {['boundary_north','boundary_south','boundary_east','boundary_west'].map(f=>(
                        <div key={f} className={fw}><label className={lbl}>{f.replace('boundary_','')}</label>
                          <input disabled={isReadOnly} value={form[f]} onChange={e=>handleChange(f,e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" /></div>
                      ))}
                    </div>
                  </div>
                  <div className={fw}>
                    <label className={lbl}>Description</label>
                    <textarea disabled={isReadOnly} value={form.description} onChange={e=>handleChange('description',e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm min-h-[80px]" />
                  </div>
                </div>
              )}

              {/* ── Tab: Legal ── */}
              {formTab === 'legal' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>DTCP Approval</label>
                      <input disabled={isReadOnly} value={form.dtcp} onChange={e=>handleChange('dtcp',e.target.value)} placeholder="DTCP number / details" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" /></div>
                    <div className={fw}><label className={lbl}>Sub Registrar Office</label>
                      <input disabled={isReadOnly} value={form.sub_registrar_office} onChange={e=>handleChange('sub_registrar_office',e.target.value)} placeholder="Office name" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" /></div>
                  </div>
                  <div className={fw}><label className={lbl}>Parent Document</label>
                    <input disabled={isReadOnly} value={form.parent_document} onChange={e=>handleChange('parent_document',e.target.value)} placeholder="Parent document reference" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" /></div>
                  <div className={fw}><label className={lbl}>Gift Deed</label>
                    <input disabled={isReadOnly} value={form.gift_deed} onChange={e=>handleChange('gift_deed',e.target.value)} placeholder="Gift deed details" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm" /></div>
                </div>
              )}

              {/* ── Tab: Images ── */}
              {formTab === 'images' && (
                assetLoading ? <Loader /> :
                <PropertyAssetsTabs propertyId={selected?.property_id||null} assets={assets} setAssets={setAssets}
                  isReadOnly={isReadOnly} propertyData={selected||form} mode={mode} onlyType="image"
                  onDrawingImageUpload={async(f)=>{const r=await uploadDrawingImage(selected.property_id,f);setSelected(p=>({...p,drawing_image:r?.drawing_image||r?.data?.drawing_image||p?.drawing_image}));return r;}} />
              )}

              {/* ── Tab: Documents ── */}
              {formTab === 'documents' && (
                assetLoading ? <Loader /> :
                <PropertyAssetsTabs propertyId={selected?.property_id||null} assets={assets} setAssets={setAssets}
                  isReadOnly={isReadOnly} propertyData={selected||form} mode={mode} onlyType="document"
                  onDrawingImageUpload={async(f)=>{const r=await uploadDrawingImage(selected.property_id,f);setSelected(p=>({...p,drawing_image:r?.drawing_image||r?.data?.drawing_image||p?.drawing_image}));return r;}} />
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t flex justify-end gap-4 bg-gray-50 shrink-0">
              <button onClick={()=>setIsModalOpen(false)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100">Close</button>
              {!isReadOnly && formTab !== 'images' && formTab !== 'documents' && (
                mode === 'add' && formTab === 'details' ? (
                  <button onClick={handleCreate} disabled={submitting} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-emerald-700 disabled:opacity-70">
                    {submitting ? 'Creating…' : 'Create Property'}
                  </button>
                ) : (
                  <button onClick={handleUpdate} disabled={submitting} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-emerald-700 disabled:opacity-70">
                    {submitting ? 'Saving…' : 'Update'}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-1">Delete Property</h3>
            <p className="text-sm text-gray-500 text-center mb-1"><span className="font-bold text-gray-800">{deleteTarget.formatted_id}</span></p>
            <p className="text-xs text-red-600 text-center font-bold uppercase tracking-wide mb-6">This action cannot be undone. All associated data will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs uppercase hover:bg-red-700 disabled:opacity-70">
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleProperties;
