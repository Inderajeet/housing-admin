import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ICONS } from '../constants';
import { useApp } from '../App';

const Sidebar = () => {
  const { setActiveProject } = useApp();
  const location = useLocation();

  // SET TO TRUE BY DEFAULT: Menus will be open when the app loads
  const [openMenus, setOpenMenus] = useState({ rent: true, sale: true });

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const renderIcon = (icon, isActive) => {
    const rawIcon = icon && (icon.ReactElement || icon);
    if (React.isValidElement(rawIcon)) {
      return React.cloneElement(rawIcon, { 
        className: `w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}` 
      });
    }
    if (typeof rawIcon === 'function') {
      return React.createElement(rawIcon, { 
        className: `w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}` 
      });
    }
    return null;
  };

  const navClass = ({ isActive }) => 
    `w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  const subNavClass = ({ isActive }) =>
    `w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all text-sm group ${
      isActive ? 'text-blue-400 font-bold bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
    }`;

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20 shrink-0">
      <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shrink-0">TN</div>
        <span className="text-xl font-bold tracking-tight truncate">TN Mandi</span>
      </div>

      <nav className="flex-1 mt-6 px-4 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <NavLink to="/dashboard" onClick={() => setActiveProject(null)} className={navClass}>
          {renderIcon(ICONS.Dashboard, location.pathname === '/dashboard')}
          <span className="font-medium text-sm">Dashboard</span>
        </NavLink>

        {/* --- Rent Properties Section --- */}
        <div>
          <button 
            onClick={() => toggleMenu('rent')} 
            className="w-full flex items-center justify-between px-4 py-3 text-slate-400 hover:text-white group transition-all"
          >
            <div className="flex items-center space-x-3">
              {renderIcon(ICONS.Rent, location.pathname.startsWith('/rent'))}
              <span className="font-medium text-sm">Rent Properties</span>
            </div>
            <span className={`text-[10px] transition-transform duration-200 ${openMenus.rent ? 'rotate-180' : ''}`}>▼</span>
          </button>
          
          {openMenus.rent && (
            <div className="ml-9 mt-1 space-y-1 border-l border-slate-800 pl-2">
              <NavLink to="/rent/properties" className={subNavClass}>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-[.text-blue-400]:bg-blue-400"></span>
                <span>Properties</span>
              </NavLink><NavLink to="/rent/premium-properties" className={subNavClass}>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-[.text-blue-400]:bg-blue-400"></span>
                <span>Premium Properties</span>
              </NavLink>
              <NavLink to="/rent/owners" className={subNavClass}>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-[.text-blue-400]:bg-blue-400"></span>
                <span>Owners</span>
              </NavLink>
              <NavLink to="/rent/enquiries" className={subNavClass}>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-[.text-blue-400]:bg-blue-400"></span>
                <span>Enquiries</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* --- Sale Properties Section --- */}
        <div>
          <button 
            onClick={() => toggleMenu('sale')} 
            className="w-full flex items-center justify-between px-4 py-3 text-slate-400 hover:text-white group transition-all"
          >
            <div className="flex items-center space-x-3">
              {renderIcon(ICONS.Sale, location.pathname.startsWith('/sale'))}
              <span className="font-medium text-sm">Sale Properties</span>
            </div>
            <span className={`text-[10px] transition-transform duration-200 ${openMenus.sale ? 'rotate-180' : ''}`}>▼</span>
          </button>
          
          {openMenus.sale && (
            <div className="ml-9 mt-1 space-y-1 border-l border-slate-800 pl-2">
              <NavLink to="/sale/properties" className={subNavClass}>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-[.text-blue-400]:bg-blue-400"></span>
                <span>Properties</span>
              </NavLink><NavLink to="/sale/premium-properties" className={subNavClass}>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-[.text-blue-400]:bg-blue-400"></span>
                <span>Premium Properties</span>
              </NavLink>
              <NavLink to="/sale/sellers" className={subNavClass}>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-[.text-blue-400]:bg-blue-400"></span>
                <span>Sellers</span>
              </NavLink>
              <NavLink to="/sale/buyers" className={subNavClass}>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-[.text-blue-400]:bg-blue-400"></span>
                <span>Buyers</span>
              </NavLink>
              <NavLink to="/sale/enquiries" className={subNavClass}>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-[.text-blue-400]:bg-blue-400"></span>
                <span>Enquiries</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Plot Properties */}
        <NavLink to="/plots" onClick={() => setActiveProject(null)} className={navClass}>
          {renderIcon(ICONS.Plots, location.pathname === '/plots')}
          <span className="font-medium text-sm">Plot Properties</span>
        </NavLink>

      </nav>

      {/* Profile Section */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800 rounded-xl p-3 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 shrink-0">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
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