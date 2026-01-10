import React, { useState, createContext, useContext } from 'react';

// Pages
import Dashboard from './pages/Dashboard';
import RentProperties from './pages/RentProperties';
import SaleProperties from './pages/SaleProperties';
import PlotProperties from './pages/PlotProperties';
import Sellers from './pages/Sellers';
import Buyers from './pages/Buyers';
import Enquiries from './pages/Enquiries';
import PlotLayoutEditor from './pages/PlotLayoutEditor';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ExportModal from './components/ExportModal';

const AppContext = createContext(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppContext');
  return ctx;
};

const App = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [activeProject, setActiveProject] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const renderContent = () => {
    if (activeProject) return <PlotLayoutEditor />;

    switch (activeTab) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Rent Properties':
        return <RentProperties />;
      case 'Sale Properties':
        return <SaleProperties />;
      case 'Plot Properties':
        return <PlotProperties />;
      case 'Sellers':
        return <Sellers />;
      case 'Buyers':
        return <Buyers />;
      case 'Enquiries':
        return <Enquiries />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={{
      activeProject,
      setActiveProject
    }}>
      <div className="flex h-screen w-full bg-gray-50 font-sans">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar
            title={activeProject ? `Layout Architect: ${activeProject.layout_name}` : activeTab}
            onExport={() => setShowExportModal(true)}
          />

          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-[1600px] mx-auto">
              {renderContent()}
            </div>
          </main>
        </div>

        {showExportModal && (
          <ExportModal onClose={() => setShowExportModal(false)} />
        )}
      </div>
    </AppContext.Provider>
  );
};

export default App;
