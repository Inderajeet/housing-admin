import React, { useEffect, useState } from 'react';
import { ICONS } from '../constants';
import { getDashboardStats, getRecentEnquiries } from '../api/dashboard.api';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── colours ─────────────────────────────────────────────────────────────────
const PIE_COLORS_TYPE   = ['#3b82f6', '#10b981', '#f59e0b'];
const PIE_COLORS_STATUS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
const PIE_COLORS_ENQ    = ['#a78bfa', '#3b82f6', '#10b981', '#f43f5e'];

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString());

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ label, count, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-300 transition-all">
    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white mb-4`}>
      {icon}
    </div>
    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{label}</p>
    <h3 className="text-3xl font-bold mt-1 text-slate-800">{fmt(count)}</h3>
  </div>
);

const MiniPie = ({ title, data, colors }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <h4 className="text-sm font-bold text-slate-700 mb-4">{title}</h4>
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,.08)' }}
          formatter={(v, n) => [fmt(v), n]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}
        />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
);

// ─── main component ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const [stats, setStats]         = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, enqRes] = await Promise.all([
        getDashboardStats(),
        getRecentEnquiries(),
      ]);
      setStats(statsRes.data);
      setEnquiries(enqRes.data || []);
    } catch (err) {
      console.error('[Dashboard] fetch error:', err);
      setError(err?.response?.data?.error || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ── derived chart data ────────────────────────────────────────────────────
  const typeChartData = stats
    ? [
        { name: 'Rentals', value: Number(stats.total_rent) || 0 },
        { name: 'Sales',   value: Number(stats.total_sale) || 0 },
        { name: 'Plots',   value: Number(stats.total_plot) || 0 },
      ]
    : [];

  const statusChartData = stats
    ? [
        { name: 'Approved', value: Number(stats.status_approved) || 0 },
        { name: 'Pending',  value: Number(stats.status_pending)  || 0 },
        { name: 'Inactive', value: Number(stats.status_inactive) || 0 },
      ]
    : [];

  const enquiryChartData = stats
    ? [
        { name: 'Open',      value: Number(stats.enquiries_open)      || 0 },
        { name: 'Booked',    value: Number(stats.enquiries_booked)    || 0 },
        { name: 'Confirmed', value: Number(stats.enquiries_confirmed) || 0 },
        { name: 'Cancelled', value: Number(stats.enquiries_cancelled) || 0 },
      ]
    : [];

  const topStats = stats
    ? [
        { label: 'Total Properties', count: stats.total_properties, icon: ICONS.Dashboard,  color: 'bg-slate-500'   },
        { label: 'Verified Sellers', count: stats.total_sellers,    icon: ICONS.Sellers,    color: 'bg-blue-500'    },
        { label: 'Unique Buyers',    count: stats.total_buyers,     icon: ICONS.Buyers,     color: 'bg-emerald-500' },
        { label: 'Total Enquiries',  count: stats.total_enquiries,  icon: ICONS.Enquiries,  color: 'bg-purple-500'  },
      ]
    : [];

  const subStats = stats
    ? [
        { label: 'Rent Listings',   count: stats.total_rent,          color: 'bg-blue-50 text-blue-700 border-blue-100'       },
        { label: 'Sale Listings',   count: stats.total_sale,          color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        { label: 'Plot Listings',   count: stats.total_plot,          color: 'bg-amber-50 text-amber-700 border-amber-100'    },
        { label: 'Premium Active',  count: stats.premium_active,      color: 'bg-rose-50 text-rose-700 border-rose-100'       },
        { label: 'Premium Pending', count: stats.premium_pending,     color: 'bg-orange-50 text-orange-700 border-orange-100' },
        { label: 'Confirmed Deals', count: stats.enquiries_confirmed, color: 'bg-violet-50 text-violet-700 border-violet-100' },
      ]
    : [];

  // ── error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 font-bold text-lg">⚠ Failed to load dashboard</p>
          <p className="text-slate-400 text-sm mt-2">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* TOP 4 STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)
          : topStats.map((s, i) => <StatCard key={i} {...s} />)
        }
      </div>

      {/* SUB STAT PILLS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          : subStats.map((s, i) => (
              <div key={i} className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center ${s.color}`}>
                <span className="text-2xl font-bold">{fmt(s.count)}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">{s.label}</span>
              </div>
            ))
        }
      </div>

      {/* PIE CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />)
          : (
            <>
              <MiniPie title="Portfolio by Type"    data={typeChartData}    colors={PIE_COLORS_TYPE}   />
              <MiniPie title="Properties by Status" data={statusChartData}  colors={PIE_COLORS_STATUS} />
              <MiniPie title="Enquiries by Stage"   data={enquiryChartData} colors={PIE_COLORS_ENQ}    />
            </>
          )
        }
      </div>

      {/* SALE SUB-TYPE BREAKDOWN */}
      {!loading && stats && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4">Sale Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Houses', value: stats.sale_house, color: 'bg-blue-50 text-blue-700'     },
              { label: 'Flats',  value: stats.sale_flat,  color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Land',   value: stats.sale_land,  color: 'bg-amber-50 text-amber-700'   },
              { label: 'Plots',  value: stats.sale_plot,  color: 'bg-purple-50 text-purple-700' },
            ].map((item, i) => (
              <div key={i} className={`rounded-xl p-4 flex flex-col items-center ${item.color}`}>
                <span className="text-2xl font-bold">{fmt(item.value)}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECENT ENQUIRIES */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Recent Enquiries</h3>
          <span className="text-[10px] font-bold text-slate-400 border border-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
            Live
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : enquiries.length === 0 ? (
          <p className="text-center py-10 text-slate-300 font-bold uppercase text-[10px] tracking-widest">
            No active leads
          </p>
        ) : (
          <div className="space-y-3">
            {enquiries.map((enq, idx) => {
              const statusColors = {
                enquired:  'bg-blue-50 text-blue-600',
                booked:    'bg-amber-50 text-amber-600',
                confirmed: 'bg-emerald-50 text-emerald-600',
                cancelled: 'bg-red-50 text-red-500',
              };
              const pill = statusColors[enq.booking_status] || 'bg-slate-50 text-slate-500';
              return (
                <div
                  key={enq.enquiry_id || idx}
                  className="p-4 bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {enq.contact_name || enq.phone_number || 'Unknown'}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400">
                      {enq.property_title || '—'} · {formatDate(enq.enquiry_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                      {enq.formatted_id || enq.property_id}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${pill}`}>
                      {enq.booking_status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;