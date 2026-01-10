import React, { useState } from 'react';
import { useApp } from '../App';
import DataTable from '../components/DataTable';

const PlotProperties = () => {
  const { plotProjects, setActiveProject } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);


  const columns = [
    { header: 'Project ID', accessor: 'plot_project_id' },
    { header: 'Master Property ID', accessor: 'property_id', className: 'font-mono text-xs' },
    { header: 'Layout Name', accessor: 'layout_name', className: 'font-bold' },
    { header: 'Total Plots', accessor: 'total_plots' },
    { header: 'Created On', accessor: 'created_at' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Plot Layout Projects</h2>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest text-[10px]">Table 10 (Plot_Projects) & Table 11 (Plot_Units)</p>
        </div>
        <button 
          onClick={() => { setSelected(null); setIsModalOpen(true); }}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-widest shadow-lg shadow-slate-200"
        >
          New Layout Project
        </button>
      </div>

      <DataTable 
        columns={columns} 
        data={plotProjects} 
        onEdit={(p) => { setSelected(p); setIsModalOpen(true); }}
        actions={(p) => (
          <button 
            onClick={() => setActiveProject(p)}
            className="ml-2 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors uppercase tracking-widest shadow-sm"
          >
            Visual Editor
          </button>
        )}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">{selected ? 'Update Project' : 'New Plot Project'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Layout Name</label>
                <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 font-semibold focus:ring-2 focus:ring-slate-400 outline-none" defaultValue={selected?.layout_name} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Master Property ID Reference</label>
                <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 font-semibold focus:ring-2 focus:ring-slate-400 outline-none" defaultValue={selected?.property_id} placeholder="E.g. PROP-102" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Plot Count</label>
                  <input type="number" className="w-full px-4 py-2 rounded-xl border border-gray-200 font-semibold outline-none" defaultValue={selected?.total_plots} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Creation Date</label>
                  <input type="date" className="w-full px-4 py-2 rounded-xl border border-gray-200 font-semibold outline-none" defaultValue={selected?.created_at?.split('T')[0]} />
                </div>
              </div>
              <div className="space-y-1 pt-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Layout Master Image (Optional)</label>
                <div className="p-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Drop Base Map Here</p>
                </div>
              </div>
            </div>
            
            <div className="px-8 py-6 border-t border-gray-100 flex justify-end space-x-4 bg-gray-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-white transition-all text-xs uppercase tracking-widest border border-gray-200">Cancel</button>
              <button onClick={() => setIsModalOpen(false)} className="px-10 py-2.5 rounded-xl bg-slate-900 text-white font-bold shadow-lg shadow-slate-100 hover:bg-slate-800 transition-all text-xs uppercase tracking-widest">Save Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlotProperties;