import React from 'react';
import { 
  PROPERTIES_MASTER, SELLERS, BUYERS, INITIAL_ENQUIRIES 
} from '../mockData';
import { ICONS } from '../constants';
// Import PropertyType enum to fix comparison errors
import { PropertyType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Enquiries from './Enquiries';

const Dashboard = () => {
  const stats = [
    { label: 'Master Inventory', count: PROPERTIES_MASTER.length, icon: ICONS.Dashboard, color: 'bg-slate-500' },
    { label: 'Verified Sellers', count: SELLERS.length, icon: ICONS.Sellers, color: 'bg-blue-500' },
    { label: 'Unique Lead Base', count: BUYERS.length, icon: ICONS.Buyers, color: 'bg-emerald-500' },
    { label: 'Fresh Enquiries', count: INITIAL_ENQUIRIES.length, icon: ICONS.Enquiries, color: 'bg-purple-500' },
  ];

  // Fix: use PropertyType enum values for comparisons to resolve type overlap errors
  const chartData = [
    { name: 'Rentals', count: PROPERTIES_MASTER.filter(p => p.property_type === PropertyType.RENT).length },
    { name: 'Sales', count: PROPERTIES_MASTER.filter(p => p.property_type === PropertyType.SALE).length },
    { name: 'Plots', count: PROPERTIES_MASTER.filter(p => p.property_type === PropertyType.PLOT).length },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-300 transition-all">
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center text-white mb-4`}>
              {stat.icon}
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-3xl font-bold mt-1 text-slate-800">{stat.count}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800">Portfolio Breakdown</h3>
            <span className="text-[10px] font-bold text-slate-400 border border-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">Real-time sync</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={40}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b'][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Recent Enquiries</h3>
          <div className="space-y-4">
            {INITIAL_ENQUIRIES.slice(0, 4).map((enq, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-bold text-slate-800">{enq.phone_number}</p>
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">Master: {enq.property_id}</span>
                </div>
                <p className="text-[10px] font-medium text-slate-400">Received on {enq.enquiry_date}</p>
              </div>
            ))}
            {INITIAL_ENQUIRIES.length === 0 && (
              <p className="text-center py-10 text-slate-300 font-bold uppercase text-[10px] tracking-widest">No active leads</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;