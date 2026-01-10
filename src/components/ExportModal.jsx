import React, { useState } from 'react';

// Using JSZip from CDN for the export functionality
const JSZIP_URL = 'https://esm.sh/jszip@3.10.1';

const ExportModal = ({ onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  /**
   * Performs a lightweight conversion from TypeScript to JavaScript/JSX.
   * This is a regex-based approach designed to handle the specific patterns 
   * used in this EstateNexus application.
   */
  const transformToJs = (content) => {
    return content
      // 1. Remove interfaces
      .replace(/interface\s+\w+\s*\{[\s\S]*?\}/g, '')
      
      // 2. Remove type aliases
      .replace(/type\s+\w+\s*=\s*[\s\S]*?;/g, '')
      
      // 3. Convert enums to constant objects
      .replace(/export\s+enum\s+(\w+)\s*\{([\s\S]*?)\}/g, (match, name, body) => {
        const lines = body.split(',').filter(l => l.trim()).map(line => {
          const [k, v] = line.split('=').map(s => s.trim());
          return v ? `  ${k}: ${v}` : `  ${k}: "${k.toLowerCase()}"`;
        }).join(',\n');
        return `export const ${name} = {\n${lines}\n};`;
      })
      
      // 4. Remove type annotations on variable declarations and parameters
      // Matches ": Type" or ": string" but avoids colons in objects/ternaries by checking lookahead
      .replace(/:\s*([A-Z][\w<>[\]]*|string|number|boolean|any|void|unknown|never|object)(\[\])?(?=\s*([=,;)]|$))/g, '')
      
      // 5. Remove React component type annotations like ""
      .replace(/:\s*React\.[A-Z]\w*/g, '')
      
      // 6. Remove generic type parameters in function calls, e.g., useApp()
      .replace(/<[A-Z][\w\s,]*>(?=\s*\()/g, '')
      
      // 7. Remove "as Type" casting
      .replace(/\s+as\s+[A-Z][\w<>[\]]*/g, '')
      
      // 8. Handle the generic DataTable definition specifically
      .replace(/]*>/g, '')
      
      // 9. Final cleanup of multiple empty lines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const { default: JSZip } = await import(JSZIP_URL);
      const zip = new JSZip();

      // Focusing primary on the src structure as requested
      const src = zip.folder("src") || zip;
      const components = src.folder("components") || src;
      const pages = src.folder("pages") || src;

      // 1. Root index.html (Adjusting imports to point to main.jsx)
      try {
        let indexHtml = await fetch('/index.html').then(r => r.text());
        indexHtml = indexHtml.replace('/index.tsx', '/src/main.jsx');
        indexHtml = indexHtml.replace('/index.css', '/src/index.css');
        zip.file("index.html", indexHtml);
      } catch(e) { console.warn("Skipped index.html"); }

      // 2. Core Source Files
      const coreSrc = [
        { name: 'index.tsx', target: 'main.jsx' },
        { name: 'App.tsx', target: 'App.jsx' },
        { name: 'types.ts', target: 'types.js' },
        { name: 'constants.tsx', target: 'constants.jsx' },
        { name: 'mockData.ts', target: 'mockData.js' },
        { name: 'index.css', target: 'index.css' }
      ];

      for (const f of coreSrc) {
        try {
          let content = await fetch(`/${f.name}`).then(r => r.text());
          if (f.target.endsWith('.js') || f.target.endsWith('.jsx')) {
            content = transformToJs(content);
          }
          src.file(f.target, content);
        } catch(e) { console.warn(`Skipped src file: ${f.name}`); }
      }

      // 3. Modular Component Files
      const compFiles = ['Navbar.tsx', 'Sidebar.tsx', 'DataTable.tsx', 'LocationSelector.tsx', 'ExportModal.tsx'];
      for (const f of compFiles) {
        try {
          let content = await fetch(`/components/${f}`).then(r => r.text());
          const targetName = f.replace('.tsx', '.jsx');
          content = transformToJs(content);
          components.file(targetName, content);
        } catch(e) { console.warn(`Skipped component: ${f}`); }
      }

      // 4. Modular Page Files
      const pageFiles = ['Dashboard.tsx', 'RentProperties.tsx', 'SaleProperties.tsx', 'PlotProperties.tsx', 'Sellers.tsx', 'Buyers.tsx', 'Enquiries.tsx', 'PlotLayoutEditor.tsx'];
      for (const f of pageFiles) {
        try {
          let content = await fetch(`/pages/${f}`).then(r => r.text());
          const targetName = f.replace('.tsx', '.jsx');
          content = transformToJs(content);
          pages.file(targetName, content);
        } catch(e) { console.warn(`Skipped page: ${f}`); }
      }

      // Generate and trigger download
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = "estatenexus-pro-jsx.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("ZIP creation failed. Check network or console.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="px-10 py-8 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Export React JSX Source</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">JavaScript Bundle • Source Folder Ready</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-10 space-y-6">
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-900 uppercase tracking-tight">Transpiled to JSX</h4>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                The source code will be processed to remove TypeScript type annotations, interfaces, and aliases. File extensions will be updated to .jsx and .js for immediate use in standard React projects.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className={`py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-100 flex items-center justify-center space-x-2 transition-all ${isDownloading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span>Download JSX ZIP</span>
                </>
              )}
            </button>
            <button 
              onClick={onClose}
              className="py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold uppercase tracking-widest text-[10px] border border-slate-100 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;