import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import { api } from '../api/api';

const PremiumProperties = ({ type = 'rent' }) => {
  const [allProperties, setAllProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('requested'); // 'requested' or 'paid'
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    dateRange: 'all',
    startDate: '',
    endDate: '',
  });

  const [form, setForm] = useState({
    property_id: '',
    property_type: type,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    priority_order: 0,
    is_requested: 'true',
    is_paid: 'false'      
  });

  // --- HELPERS ---
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/premium/status?type=${type}&filter=${view}`);
      setAllProperties(res.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [type, view]);

  // --- FILTERING LOGIC ---
  useEffect(() => {
    let result = [...allProperties];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filters.dateRange !== 'all') {
      result = result.filter(p => {
        const dateToCompare = view === 'paid' ? p.start_date : p.created_at;
        if (!dateToCompare) return false;
        
        const pDate = new Date(dateToCompare);
        pDate.setHours(0, 0, 0, 0);

        if (filters.dateRange === 'week') {
          const weekAgo = new Date(todayStart);
          weekAgo.setDate(todayStart.getDate() - 7);
          return pDate >= weekAgo;
        }

        if (filters.dateRange === 'month') {
          const monthAgo = new Date(todayStart);
          monthAgo.setMonth(todayStart.getMonth() - 1);
          return pDate >= monthAgo;
        }

        if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          
          if (view === 'paid') {
             const pStart = new Date(p.start_date);
             const pEnd = new Date(p.end_date);
             return pStart <= end && pEnd >= start;
          }
          return pDate >= start && pDate <= end;
        }
        return true;
      });
    }
    setFilteredProperties(result);
  }, [filters, allProperties, view]);

  const handleExport = () => {
    const dataToExport = filteredProperties.map(p => ({
      Prop_ID: p.property_id,
      Title: p.title,
      Status: view === 'paid' ? 'ACTIVE' : 'REQUESTED',
      Start_Date: p.start_date ? formatDate(p.start_date) : 'N/A',
      End_Date: p.end_date ? formatDate(p.end_date) : 'N/A',
      Days_Left: view === 'paid' ? getDaysRemaining(p.end_date) : 'N/A',
      Priority: p.priority_order || 0,
      Phone: p.contact_phone
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Premium_Data");
    XLSX.writeFile(wb, `Premium_${type}_Export.xlsx`);
  };

  const handleActivate = async () => {
    try {
      await api.post('/premium/activate', form); 
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert("Failed to process request.");
    }
  };

  const dropdownClass = "px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20 transition-all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 capitalize">Premium {type}s</h2>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setView('requested')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'requested' ? 'bg-amber-600 text-white shadow-lg shadow-amber-200' : 'bg-gray-100 text-gray-500'}`}>Requests</button>
            <button onClick={() => setView('paid')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'paid' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-gray-100 text-gray-500'}`}>Paid/Active</button>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50">Export Excel</button>
          <button onClick={() => { setForm({ ...form, property_id: '', is_paid: 'false', is_requested: 'true' }); setIsModalOpen(true); }} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase shadow-lg shadow-blue-200 hover:bg-blue-700">+ Create Premium</button>
        </div>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-6 items-end">
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date Filter</label>
            <select value={filters.dateRange} onChange={e => setFilters({ ...filters, dateRange: e.target.value })} className={dropdownClass}>
              <option value="all">All Time</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <button onClick={() => setFilters({ dateRange: 'all', startDate: '', endDate: '' })} className="text-[10px] font-bold text-red-500 uppercase pb-3 hover:underline">Reset</button>
        </div>

        {filters.dateRange === 'custom' && (
          <div className="flex gap-4 pt-2 border-t border-gray-50">
            <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" />
            <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" />
          </div>
        )}
      </div>

      {loading ? <Loader /> : (
        <DataTable
          columns={view === 'requested' ? [
            { header: 'Prop ID', accessor: 'formatted_id' },
            { header: 'Title', accessor: 'title', className: 'font-bold text-blue-900' },
            { header: 'Contact', accessor: 'contact_phone' },
            { header: 'Action', accessor: (item) => (
              <button onClick={() => { setForm({...form, property_id: item.property_id, is_requested: 'true'}); setIsModalOpen(true); }} className="text-amber-600 font-bold text-[10px] uppercase underline">Activate Now</button>
            )}
          ] : [
            { header: 'Prop ID', accessor: 'formatted_id' },
            { header: 'Priority', accessor: 'priority_order' },
            { header: 'Validity', accessor: (item) => `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`, className: 'text-[11px]' },
            { header: 'Days Left', accessor: (item) => {
                const days = getDaysRemaining(item.end_date);
                return (
                  <span className={`px-2 py-1 rounded-lg font-bold text-[10px] ${days < 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {days < 0 ? 'EXPIRED' : `${days} DAYS`}
                  </span>
                );
            }},
            { header: 'Status', accessor: () => <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-[10px] font-bold uppercase">● Active</span> }
          ]}
          data={filteredProperties}
        />
      )}

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold uppercase tracking-tight text-gray-800">Premium Management</h3>
              <button className="text-2xl text-gray-400 hover:text-gray-600" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Property ID</label>
                  <input type="number" value={form.property_id} onChange={e => setForm({...form, property_id: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Requested Status</label>
                  <select value={form.is_requested} onChange={e => setForm({...form, is_requested: e.target.value})} className={`w-full px-4 py-2.5 rounded-xl border font-bold outline-none ${form.is_requested === 'true' ? 'text-amber-600 border-amber-100 bg-amber-50/30' : 'text-gray-400 border-gray-200'}`}>
                    <option value="true">YES (REQUESTED)</option>
                    <option value="false">NO</option>
                  </select>
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Payment Status</label>
                  <select value={form.is_paid} onChange={e => setForm({...form, is_paid: e.target.value})} className={`w-full px-4 py-2.5 rounded-xl border font-bold outline-none ${form.is_paid === 'true' ? 'text-green-600 border-green-100 bg-green-50/30' : 'text-amber-600 border-amber-100 bg-amber-50/30'}`}>
                    <option value="false">NOT PAID</option>
                    <option value="true">PAID (ACTIVATE)</option>
                  </select>
                </div>
              </div>

              {form.is_paid === 'true' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="flex flex-col space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Start Date</label>
                      <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">End Date</label>
                      <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Priority Order (0-100)</label>
                    <input type="number" value={form.priority_order} onChange={e => setForm({...form, priority_order: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 border-t flex justify-end gap-4 bg-gray-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100">Close</button>
              <button onClick={handleActivate} className={`px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg text-white ${form.is_paid === 'true' ? 'bg-green-600 shadow-green-100 hover:bg-green-700' : 'bg-amber-600 shadow-amber-100 hover:bg-amber-700'}`}>
                {form.is_paid === 'true' ? 'Activate Premium' : 'Save Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumProperties;