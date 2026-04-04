import React, { createContext, useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { LocationProvider } from './context/LocationContext';

// Pages & Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import PlotProperties from './pages/PlotProperties';
import PlotLayoutEditor from './pages/PlotLayoutEditor';
import Sellers from './pages/Sellers';
import RentProperties from './pages/RentProperties';
import Enquiries from './pages/Enquiries';
import SaleProperties from './pages/SaleProperties';
import Buyers from './pages/Buyers';
import PremiumProperties from './components/PremiumProperties';
import Bookings from './pages/Bookings';
import FlatProperties from './pages/FlatProperties';
import FlatLayoutEditor from './pages/FlatLayoutEditor';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
const ADMIN_BASE = '/admin';

// Placeholder for new components
const Placeholder = ({ title }) => <div className="p-10 text-2xl font-bold text-slate-400">{title} Component</div>;

const App = () => {
  const [activeProject, setActiveProject] = useState(null);

  return (
    <LocationProvider>
      <AppContext.Provider value={{ activeProject, setActiveProject }}>
        <BrowserRouter>
          <div className="flex h-screen w-full bg-gray-50 font-sans">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <Navbar title={activeProject ? `Architect: ${activeProject.property_id}` : "Management"} />

              <main className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-[1600px] mx-auto">
                  <Routes>
                    <Route path="/" element={<Navigate to={`${ADMIN_BASE}/dashboard`} replace />} />
                    <Route path={ADMIN_BASE} element={<Navigate to={`${ADMIN_BASE}/dashboard`} replace />} />
                    <Route path={`${ADMIN_BASE}/dashboard`} element={<Dashboard />} />
                    <Route path={`${ADMIN_BASE}/rent/premium-properties`} element={<PremiumProperties type='rent' />} />
                    <Route path={`${ADMIN_BASE}/sale/premium-properties`} element={<PremiumProperties type='sale' />} />
                    <Route path={`${ADMIN_BASE}/sale/bookings`} element={<Bookings type='sale' />} />
                    <Route path={`${ADMIN_BASE}/rent/bookings`} element={<Bookings type='rent' />} />
                    <Route
                      path={`${ADMIN_BASE}/rent/owners`}
                      element={<Sellers title="Rent Owners" typeFilter="rent" />}
                    />

                    {/* 2. Sale Sellers Section */}
                    <Route
                      path={`${ADMIN_BASE}/sale/sellers`}
                      element={<Sellers title="Property Sellers" typeFilter="sale" />}
                    />
                    <Route path={`${ADMIN_BASE}/rent/properties`} element={<RentProperties />} />

                    {/* Sale Routes */}
                    <Route path={`${ADMIN_BASE}/sale/properties`} element={<SaleProperties />} />
                    <Route path={`${ADMIN_BASE}/sale/buyers`} element={<Buyers title="Property Buyers" typeFilter="sale" />} />

                    {/* RENT SECTION */}
                    <Route
                      path={`${ADMIN_BASE}/rent/enquiries`}
                      element={<Enquiries title="Rent Enquiries" typeFilter="rent" />}
                    />

                    {/* SALE SECTION (Includes Plots, Flats, Land) */}
                    <Route
                      path={`${ADMIN_BASE}/sale/enquiries`}
                      element={<Enquiries title="Sale Enquiries" typeFilter="sale" />}
                    />

                    {/* Plot Routes */}
                    <Route path={`${ADMIN_BASE}/plots`} element={<PlotProperties />} />
                    <Route path={`${ADMIN_BASE}/plots/editor/:id`} element={<PlotLayoutEditor />} />
                    <Route path={`${ADMIN_BASE}/flats`} element={<FlatProperties />} />
                    <Route path={`${ADMIN_BASE}/flats/editor/:id`} element={<FlatLayoutEditor />} />
                  </Routes>
                </div>
              </main>
            </div>
          </div>
        </BrowserRouter>
      </AppContext.Provider>
    </LocationProvider>
  );
};

export default App;
