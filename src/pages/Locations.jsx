import React, { useState, useEffect, useCallback, useRef } from 'react';
import Loader from '../components/Loader';
import {
  getAllDistricts, updateDistrict, uploadDistricts,
  bulkUpdateDistrictCoords,
  getTaluksByDistrict, updateTaluk, uploadTaluks,
  bulkUpdateTalukCoords,
  getVillagesByTaluk, updateVillage, uploadVillages,
  bulkUpdateVillageCoords,
} from '../api/location-admin.api';
import { forwardGeocode } from '../utils/geocode';

// ── Toast helper ─────────────────────────────────────────────────────────────

const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div
      className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all ${
        toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      {toast.message}
    </div>
  );
};

// ── Panel column wrapper ─────────────────────────────────────────────────────

const PanelColumn = ({ title, count, search, onSearch, loading, placeholder, action, children }) => (
  <div
    className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden"
    style={{ height: 'calc(100vh - 220px)' }}
  >
    {/* Panel header */}
    <div className="p-5 border-b border-gray-100 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search..."
        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none bg-gray-50"
      />
      {action && <div className="mt-2">{action}</div>}
    </div>

    {/* Scrollable list */}
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <Loader text="Loading..." />
      ) : placeholder ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300 select-none">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-xs font-semibold">{placeholder}</p>
        </div>
      ) : React.Children.count(children) === 0 ? (
        <div className="flex items-center justify-center h-full text-xs text-gray-400 font-medium">
          No records found
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

// ── Fetch-all-coords button with inline progress bar ─────────────────────────

const FetchAllButton = ({ onClick, progress, disabled }) => {
  const isRunning = progress !== null && progress.done < progress.total;
  const isDone    = progress !== null && progress.done >= progress.total;
  const pct       = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={onClick}
        disabled={disabled || isRunning}
        className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all disabled:opacity-60 ${
          isRunning
            ? 'bg-green-50 border border-green-200 text-green-700'
            : isDone
            ? 'bg-green-500 text-white'
            : 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
        }`}
      >
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {isRunning
          ? `Geocoding ${progress.done} / ${progress.total}…`
          : isDone
          ? `Done — ${progress.total - (progress.failed || 0)} saved${progress.failed ? `, ${progress.failed} failed` : ''}`
          : 'Fetch All Coords'}
      </button>
      {isRunning && (
        <div className="w-full h-1 bg-green-100 rounded-full overflow-hidden">
          <div
            className="h-1 bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────

const Locations = () => {
  // Data
  const [districts, setDistricts]         = useState([]);
  const [taluks, setTaluks]               = useState([]);
  const [villages, setVillages]           = useState([]);

  // Selection
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedTaluk, setSelectedTaluk]       = useState(null);

  // Loading
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingTaluks, setLoadingTaluks]       = useState(false);
  const [loadingVillages, setLoadingVillages]   = useState(false);

  // Uploading
  const [uploadingDistricts, setUploadingDistricts] = useState(false);
  const [uploadingTaluks, setUploadingTaluks]       = useState(false);
  const [uploadingVillages, setUploadingVillages]   = useState(false);

  // Inline edit  { type: 'district'|'taluk'|'village', id, values: {} }
  const [editingItem, setEditingItem] = useState(null);
  const [savingEdit, setSavingEdit]   = useState(false);
  const [fetchingCoords, setFetchingCoords] = useState(false);

  // Bulk-fetch-all progress: null = idle, { done, total, failed } = in-progress/done
  const [bulkProgress, setBulkProgress] = useState({ districts: null, taluks: null, villages: null });

  // Search
  const [districtSearch, setDistrictSearch] = useState('');
  const [talukSearch, setTalukSearch]       = useState('');
  const [villageSearch, setVillageSearch]   = useState('');

  // Toast
  const [toast, setToast] = useState(null);

  // File refs
  const districtFileRef = useRef();
  const talukFileRef    = useRef();
  const villageFileRef  = useRef();

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadDistricts = useCallback(async () => {
    setLoadingDistricts(true);
    try {
      const data = await getAllDistricts();
      setDistricts(Array.isArray(data) ? data : []);
    } catch {
      showToast('error', 'Failed to load districts');
    } finally {
      setLoadingDistricts(false);
    }
  }, []);

  const loadTaluks = useCallback(async (districtId) => {
    if (!districtId) { setTaluks([]); return; }
    setLoadingTaluks(true);
    try {
      const data = await getTaluksByDistrict(districtId);
      setTaluks(Array.isArray(data) ? data : []);
    } catch {
      showToast('error', 'Failed to load taluks');
    } finally {
      setLoadingTaluks(false);
    }
  }, []);

  const loadVillages = useCallback(async (talukId) => {
    if (!talukId) { setVillages([]); return; }
    setLoadingVillages(true);
    try {
      const data = await getVillagesByTaluk(talukId);
      setVillages(Array.isArray(data) ? data : []);
    } catch {
      showToast('error', 'Failed to load villages');
    } finally {
      setLoadingVillages(false);
    }
  }, []);

  useEffect(() => { loadDistricts(); }, [loadDistricts]);

  // ── Selection ──────────────────────────────────────────────────────────────
  const handleSelectDistrict = (district) => {
    setSelectedDistrict(district);
    setSelectedTaluk(null);
    setVillages([]);
    setTalukSearch('');
    setVillageSearch('');
    setEditingItem(null);
    loadTaluks(district.district_id);
  };

  const handleSelectTaluk = (taluk) => {
    setSelectedTaluk(taluk);
    setVillageSearch('');
    setEditingItem(null);
    loadVillages(taluk.taluk_id);
  };

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async (type, file) => {
    if (!file) return;
    const setUpl =
      type === 'districts' ? setUploadingDistricts
      : type === 'taluks'  ? setUploadingTaluks
      : setUploadingVillages;

    setUpl(true);
    try {
      if (type === 'districts') {
        await uploadDistricts(file);
        await loadDistricts();
      } else if (type === 'taluks') {
        await uploadTaluks(file);
        if (selectedDistrict) await loadTaluks(selectedDistrict.district_id);
      } else {
        await uploadVillages(file);
        if (selectedTaluk) await loadVillages(selectedTaluk.taluk_id);
      }
      showToast('success', `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
    } catch {
      showToast('error', `Failed to upload ${type}`);
    } finally {
      setUpl(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const startEdit = (type, item) => {
    let values = {};
    if (type === 'district') {
      values = {
        district_name: item.district_name,
        district_code: item.district_code || '',
        latitude:  item.latitude  ?? '',
        longitude: item.longitude ?? '',
      };
    } else if (type === 'taluk') {
      values = {
        taluk_name: item.taluk_name,
        latitude:  item.latitude  ?? '',
        longitude: item.longitude ?? '',
      };
    } else {
      values = {
        village_name: item.village_name,
        latitude:  item.latitude  ?? '',
        longitude: item.longitude ?? '',
      };
    }
    setEditingItem({ type, id: item[`${type}_id`], values });
  };

  // ── Fetch coordinates from Google Maps for the editing item ────────────────
  const handleFetchCoords = useCallback(async () => {
    if (!editingItem) return;
    const { type, values } = editingItem;

    let query = '';
    if (type === 'district') {
      query = `${values.district_name}, Tamil Nadu, India`;
    } else if (type === 'taluk') {
      const districtName = selectedDistrict?.district_name || '';
      query = `${values.taluk_name}, ${districtName}, Tamil Nadu, India`;
    } else {
      const talukName    = selectedTaluk?.taluk_name    || '';
      const districtName = selectedDistrict?.district_name || '';
      query = `${values.village_name}, ${talukName}, ${districtName}, Tamil Nadu, India`;
    }

    setFetchingCoords(true);
    try {
      const coords = await forwardGeocode(query);
      if (coords) {
        setEditingItem((prev) => ({
          ...prev,
          values: {
            ...prev.values,
            latitude:  String(coords.lat),
            longitude: String(coords.lng),
          },
        }));
        showToast('success', 'Coordinates fetched');
      } else {
        showToast('error', 'Could not find coordinates');
      }
    } catch {
      showToast('error', 'Geocoding failed');
    } finally {
      setFetchingCoords(false);
    }
  }, [editingItem, selectedDistrict, selectedTaluk]);

  // ── Bulk fetch all coordinates for a panel ────────────────────────────────
  const handleFetchAllCoords = useCallback(async (type) => {
    const items =
      type === 'districts' ? districts
      : type === 'taluks'  ? taluks
      : villages;

    if (!items.length) return;

    const total = items.length;
    setBulkProgress((p) => ({ ...p, [type]: { done: 0, total, failed: 0 } }));

    const results = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let query = '';

      if (type === 'districts') {
        query = `${item.district_name}, Tamil Nadu, India`;
      } else if (type === 'taluks') {
        query = `${item.taluk_name}, ${selectedDistrict?.district_name || ''}, Tamil Nadu, India`;
      } else {
        query = `${item.village_name}, ${selectedTaluk?.taluk_name || ''}, ${selectedDistrict?.district_name || ''}, Tamil Nadu, India`;
      }

      try {
        const coords = await forwardGeocode(query);
        if (coords) {
          const idKey = type === 'districts' ? 'district_id' : type === 'taluks' ? 'taluk_id' : 'village_id';
          results.push({ [idKey]: item[idKey], latitude: String(coords.lat), longitude: String(coords.lng) });
        } else {
          setBulkProgress((p) => ({ ...p, [type]: { ...p[type], done: i + 1, failed: (p[type]?.failed || 0) + 1 } }));
          continue;
        }
      } catch {
        setBulkProgress((p) => ({ ...p, [type]: { ...p[type], done: i + 1, failed: (p[type]?.failed || 0) + 1 } }));
        continue;
      }

      setBulkProgress((p) => ({ ...p, [type]: { ...p[type], done: i + 1 } }));

      // ~5 requests/sec to respect Google geocoding rate limits
      if (i < items.length - 1) await new Promise((r) => setTimeout(r, 200));
    }

    // One bulk save call with all results
    if (results.length > 0) {
      try {
        if (type === 'districts') {
          await bulkUpdateDistrictCoords(results);
          setDistricts((prev) =>
            prev.map((d) => {
              const r = results.find((x) => x.district_id === d.district_id);
              return r ? { ...d, latitude: r.latitude, longitude: r.longitude } : d;
            })
          );
        } else if (type === 'taluks') {
          await bulkUpdateTalukCoords(results);
          setTaluks((prev) =>
            prev.map((t) => {
              const r = results.find((x) => x.taluk_id === t.taluk_id);
              return r ? { ...t, latitude: r.latitude, longitude: r.longitude } : t;
            })
          );
        } else {
          await bulkUpdateVillageCoords(results);
          setVillages((prev) =>
            prev.map((v) => {
              const r = results.find((x) => x.village_id === v.village_id);
              return r ? { ...v, latitude: r.latitude, longitude: r.longitude } : v;
            })
          );
        }
        const failed = bulkProgress[type]?.failed || 0;
        showToast('success', `Saved ${results.length} coordinates${failed ? ` (${failed} failed)` : ''}`);
      } catch {
        showToast('error', 'Geocoding done but bulk save failed');
      }
    } else {
      showToast('error', 'No coordinates could be fetched');
    }

    // Clear progress after 4 s so status is readable
    setTimeout(() => setBulkProgress((p) => ({ ...p, [type]: null })), 4000);
  }, [districts, taluks, villages, selectedDistrict, selectedTaluk, bulkProgress]);

  const cancelEdit = () => setEditingItem(null);

  const saveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      const { type, id, values } = editingItem;
      if (type === 'district') {
        await updateDistrict(id, values);
        setDistricts((prev) => prev.map((d) => d.district_id === id ? { ...d, ...values } : d));
        if (selectedDistrict?.district_id === id) setSelectedDistrict((prev) => ({ ...prev, ...values }));
      } else if (type === 'taluk') {
        await updateTaluk(id, values);
        setTaluks((prev) => prev.map((t) => t.taluk_id === id ? { ...t, ...values } : t));
        if (selectedTaluk?.taluk_id === id) setSelectedTaluk((prev) => ({ ...prev, ...values }));
      } else {
        await updateVillage(id, values);
        setVillages((prev) => prev.map((v) => v.village_id === id ? { ...v, ...values } : v));
      }
      showToast('success', 'Updated successfully');
      setEditingItem(null);
    } catch {
      showToast('error', 'Failed to update');
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const filteredDistricts = districts.filter((d) =>
    d.district_name?.toLowerCase().includes(districtSearch.toLowerCase())
  );
  const filteredTaluks = taluks.filter((t) =>
    t.taluk_name?.toLowerCase().includes(talukSearch.toLowerCase())
  );
  const filteredVillages = villages.filter((v) =>
    v.village_name?.toLowerCase().includes(villageSearch.toLowerCase())
  );

  // ── Render list item ───────────────────────────────────────────────────────
  const renderItem = (type, item, nameField, isSelected = false) => {
    const itemId   = item[`${type}_id`];
    const isEditing =
      editingItem?.type === type && editingItem?.id === itemId;

    return (
      <div
        key={itemId}
        className={`group flex items-start gap-2 px-4 py-3 border-b border-gray-50 last:border-b-0 transition-colors ${
          isSelected
            ? 'bg-blue-50 border-l-2 border-l-blue-500'
            : 'hover:bg-gray-50'
        }`}
      >
        {isEditing ? (
          /* ── Edit mode ── */
          <div className="flex-1 flex flex-col gap-2 py-1">
            {/* Name fields */}
            {type === 'district' ? (
              <>
                <input
                  value={editingItem.values.district_name}
                  onChange={(e) =>
                    setEditingItem((prev) => ({
                      ...prev,
                      values: { ...prev.values, district_name: e.target.value },
                    }))
                  }
                  placeholder="District name"
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-full"
                />
                <input
                  value={editingItem.values.district_code}
                  onChange={(e) =>
                    setEditingItem((prev) => ({
                      ...prev,
                      values: { ...prev.values, district_code: e.target.value },
                    }))
                  }
                  placeholder="District code (e.g. TN-01)"
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium font-mono focus:ring-2 focus:ring-blue-500 outline-none w-full"
                />
              </>
            ) : (
              <input
                value={editingItem.values[nameField]}
                onChange={(e) =>
                  setEditingItem((prev) => ({
                    ...prev,
                    values: { ...prev.values, [nameField]: e.target.value },
                  }))
                }
                placeholder={`${type.charAt(0).toUpperCase() + type.slice(1)} name`}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-full"
              />
            )}

            {/* Lat / Lng row */}
            <div className="flex gap-1.5">
              <input
                value={editingItem.values.latitude}
                onChange={(e) =>
                  setEditingItem((prev) => ({
                    ...prev,
                    values: { ...prev.values, latitude: e.target.value },
                  }))
                }
                placeholder="Latitude"
                className="w-1/2 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                value={editingItem.values.longitude}
                onChange={(e) =>
                  setEditingItem((prev) => ({
                    ...prev,
                    values: { ...prev.values, longitude: e.target.value },
                  }))
                }
                placeholder="Longitude"
                className="w-1/2 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleFetchCoords}
                disabled={fetchingCoords}
                className="flex items-center gap-1 px-3 py-1 bg-green-50 border border-green-200 text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-wide hover:bg-green-100 disabled:opacity-60"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {fetchingCoords ? 'Fetching…' : 'Fetch Coords'}
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wide disabled:opacity-60"
              >
                {savingEdit ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-wide hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ── View mode ── */
          <>
            <div
              className={`flex-1 min-w-0 ${type !== 'village' ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (type === 'district') handleSelectDistrict(item);
                else if (type === 'taluk') handleSelectTaluk(item);
              }}
            >
              <p className="text-sm font-semibold text-gray-800 truncate">{item[nameField]}</p>
              {type === 'district' && item.district_code && (
                <p className="text-[10px] text-gray-400 font-mono uppercase mt-0.5">
                  {item.district_code}
                </p>
              )}
              {(item.latitude && item.longitude) && (
                <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                  {parseFloat(item.latitude).toFixed(4)}, {parseFloat(item.longitude).toFixed(4)}
                </p>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); startEdit(type, item); }}
              className="shrink-0 opacity-0 group-hover:opacity-100 px-2.5 py-1 border border-gray-200 text-gray-500 rounded-lg text-[10px] font-bold uppercase tracking-wide hover:bg-gray-100 transition-all"
            >
              Edit
            </button>
          </>
        )}
      </div>
    );
  };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Master Data</p>
          <h1 className="text-xl font-bold text-gray-800">Locations Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage Tamil Nadu districts, taluks, and villages
          </p>
        </div>

        {/* Upload buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Districts */}
          <input
            ref={districtFileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { handleUpload('districts', e.target.files[0]); e.target.value = ''; }}
          />
          <button
            onClick={() => districtFileRef.current.click()}
            disabled={uploadingDistricts}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wide shadow-sm hover:bg-gray-50 disabled:opacity-60"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {uploadingDistricts ? 'Uploading…' : 'Upload Districts'}
          </button>

          {/* Taluks */}
          <input
            ref={talukFileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { handleUpload('taluks', e.target.files[0]); e.target.value = ''; }}
          />
          <button
            onClick={() => talukFileRef.current.click()}
            disabled={uploadingTaluks}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wide shadow-sm hover:bg-gray-50 disabled:opacity-60"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {uploadingTaluks ? 'Uploading…' : 'Upload Taluks'}
          </button>

          {/* Villages */}
          <input
            ref={villageFileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { handleUpload('villages', e.target.files[0]); e.target.value = ''; }}
          />
          <button
            onClick={() => villageFileRef.current.click()}
            disabled={uploadingVillages}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wide shadow-lg hover:bg-blue-700 disabled:opacity-60"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {uploadingVillages ? 'Uploading…' : 'Upload Villages'}
          </button>
        </div>
      </div>

      {/* ── Excel format hint ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex flex-wrap items-center gap-6 text-xs text-amber-700">
        <span className="font-bold uppercase tracking-wide shrink-0">Excel column format</span>
        <span><strong>Districts:</strong> district_name, district_code</span>
        <span><strong>Taluks:</strong> taluk_name, district_name</span>
        <span><strong>Villages:</strong> village_name, taluk_name</span>
      </div>

      {/* ── 3-column panel ── */}
      <div className="grid grid-cols-3 gap-5">
        {/* Districts */}
        <PanelColumn
          title="Districts"
          count={filteredDistricts.length}
          search={districtSearch}
          onSearch={setDistrictSearch}
          loading={loadingDistricts}
          action={
            <FetchAllButton
              progress={bulkProgress.districts}
              disabled={!districts.length || !!bulkProgress.taluks || !!bulkProgress.villages}
              onClick={() => handleFetchAllCoords('districts')}
            />
          }
        >
          {filteredDistricts.map((d) =>
            renderItem('district', d, 'district_name', selectedDistrict?.district_id === d.district_id)
          )}
        </PanelColumn>

        {/* Taluks */}
        <PanelColumn
          title={selectedDistrict ? `Taluks — ${selectedDistrict.district_name}` : 'Taluks'}
          count={filteredTaluks.length}
          search={talukSearch}
          onSearch={setTalukSearch}
          loading={loadingTaluks}
          placeholder={!selectedDistrict ? 'Select a district first' : undefined}
          action={selectedDistrict && taluks.length > 0 ? (
            <FetchAllButton
              progress={bulkProgress.taluks}
              disabled={!!bulkProgress.districts || !!bulkProgress.villages}
              onClick={() => handleFetchAllCoords('taluks')}
            />
          ) : null}
        >
          {filteredTaluks.map((t) =>
            renderItem('taluk', t, 'taluk_name', selectedTaluk?.taluk_id === t.taluk_id)
          )}
        </PanelColumn>

        {/* Villages */}
        <PanelColumn
          title={selectedTaluk ? `Villages — ${selectedTaluk.taluk_name}` : 'Villages'}
          count={filteredVillages.length}
          search={villageSearch}
          onSearch={setVillageSearch}
          loading={loadingVillages}
          placeholder={!selectedTaluk ? 'Select a taluk first' : undefined}
          action={selectedTaluk && villages.length > 0 ? (
            <FetchAllButton
              progress={bulkProgress.villages}
              disabled={!!bulkProgress.districts || !!bulkProgress.taluks}
              onClick={() => handleFetchAllCoords('villages')}
            />
          ) : null}
        >
          {filteredVillages.map((v) =>
            renderItem('village', v, 'village_name')
          )}
        </PanelColumn>
      </div>
    </div>
  );
};

export default Locations;
