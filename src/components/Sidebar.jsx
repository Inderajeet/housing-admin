import React from 'react';
import { ICONS } from '../constants';
import { useApp } from '../App';

/**
 * @typedef {Object} SidebarProps
 * @property {string} [activeTab]
 * @property {(tab:string)=>void} setActiveTab
 */

const Sidebar = ({ activeTab, setActiveTab }) => {
   const { setActiveProject } = useApp();
   
   const menuItems = [
     { label: 'Dashboard', icon: ICONS.Dashboard },
     { label: 'Rent Properties', icon: ICONS.Rent },
     { label: 'Sale Properties', icon: ICONS.Sale },
     { label: 'Plot Properties', icon: ICONS.Plots },
     { label: 'Sellers', icon: ICONS.Sellers },
     { label: 'Buyers', icon: ICONS.Buyers },
     { label: 'Enquiries', icon: ICONS.Enquiries },
   ];
 
   const handleNav = (label) => {
     setActiveProject(null);
     setActiveTab(label);
   };
 
   return (
     <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20 shrink-0">
       <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
         <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shrink-0">TN</div>
         <span className="text-xl font-bold tracking-tight truncate">TN Mandi</span>
       </div>
       
       <nav className="flex-1 mt-6 px-4 space-y-1 overflow-y-auto">
         {menuItems.map((item) => (
           <button
             key={item.label}
             onClick={() => handleNav(item.label)}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
               activeTab === item.label 
               ? 'bg-blue-600 text-white shadow-md' 
               : 'text-slate-400 hover:bg-slate-800 hover:text-white'
             }`}
           >
             <span className={`shrink-0 ${activeTab === item.label ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}>
              {(() => {
                const rawIcon = item.icon && (item.icon.ReactElement || item.icon);
                if (React.isValidElement(rawIcon)) {
                  return React.cloneElement(rawIcon, { className: "w-5 h-5" });
                }
                if (typeof rawIcon === 'function') {
                  return React.createElement(rawIcon, { className: "w-5 h-5" });
                }
                return null;
              })()}
             </span>
             <span className="font-medium text-sm truncate">{item.label}</span>
           </button>
         ))}
       </nav>
 
       <div className="p-4 border-t border-slate-800">
         <div className="bg-slate-800 rounded-xl p-3 flex items-center space-x-3">
           <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 shrink-0">
             <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
           </div>
           <div className="flex-1 min-w-0">
             <p className="text-xs font-semibold truncate text-white">Super Admin</p>
             <p className="text-[10px] text-slate-500 truncate">admin@nexus.com</p>
           </div>
         </div>
       </div>
     </aside>
   );
 };
 
 export default Sidebar;