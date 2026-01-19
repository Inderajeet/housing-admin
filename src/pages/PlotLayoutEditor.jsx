import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../App';
import { ElementType, PlotUnitStatus } from '../types';
import { useNavigate, useParams } from 'react-router-dom';
import { getPlotLayout, openPlotProject } from '../api/plot.api';

const GRID_SIZE = 20;

const PlotLayoutEditor = () => {
  // 1. Hooks (Must be at the top level of the component)
  const { activeProject, setActiveProject, updatePlotLayout } = useApp();
  const navigate = useNavigate();
  const { id } = useParams(); // Gets the property_id from the URL

  // 2. State
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragInfo, setDragInfo] = useState(null);
  const [resizeInfo, setResizeInfo] = useState(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // 3. Effect: Handle Page Refresh (Auto-load data if context is empty)
  useEffect(() => {
    if (id && (!activeProject || String(activeProject.property_id) !== String(id))) {
      const reloadData = async () => {
        try {
          const projectInfo = await openPlotProject(id);
          const layoutResponse = await getPlotLayout(id);
          
          setActiveProject({
            ...projectInfo,
            property_id: id,
            layout: layoutResponse.data || []
          });
        } catch (err) {
          console.error("Failed to reload project", err);
          navigate('/plots'); 
        }
      };
      reloadData();
    }
  }, [id, activeProject, setActiveProject, navigate]);

  // 4. Effect: Normalize data when activeProject is loaded
  useEffect(() => {
    if (activeProject?.layout) {
      const normalized = activeProject.layout.map(el => ({
        ...el,
        plot_unit_id: el.plot_unit_id || el.element_id,
        fontSize: el.font_size || 12,
        fontWeight: el.font_weight || 'normal',
        x: Number(el.x),
        y: Number(el.y),
        width: Number(el.width),
        height: Number(el.height),
        rotation: Number(el.rotation || 0)
      }));
      setElements(normalized);
    }
  }, [activeProject]);

  const selectedElement = elements.find(e => e.plot_unit_id === selectedId);

  // 5. Canvas Drawing Logic
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Grid
    ctx.beginPath();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5 / zoom;
    for (let x = -offset.x / zoom; x < (canvas.width - offset.x) / zoom; x += GRID_SIZE) {
      ctx.moveTo(x, -offset.y / zoom);
      ctx.lineTo(x, (canvas.height - offset.y) / zoom);
    }
    for (let y = -offset.y / zoom; y < (canvas.height - offset.y) / zoom; y += GRID_SIZE) {
      ctx.moveTo(-offset.x / zoom, y);
      ctx.lineTo((canvas.width - offset.x) / zoom, y);
    }
    ctx.stroke();

    elements.forEach(el => {
      if (el.visible === false) return;

      ctx.save();
      const centerX = el.x + el.width / 2;
      const centerY = el.y + el.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);

      if (el.type === ElementType.PLOT) {
        let fillColor = '#dcfce7'; 
        let strokeColor = '#22c55e';
        if (el.status === PlotUnitStatus.BOOKED) {
          fillColor = '#ffedd5';
          strokeColor = '#f97316';
        } else if (el.status === PlotUnitStatus.CLOSED) {
          fillColor = '#fee2e2';
          strokeColor = '#ef4444';
        }
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2 / zoom;
        ctx.fillRect(el.x, el.y, el.width, el.height);
        ctx.strokeRect(el.x, el.y, el.width, el.height);

        ctx.fillStyle = el.color || '#000000';
        ctx.font = `${el.fontWeight === 'bold' ? 'bold ' : ''}${el.fontSize || 12}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelText = el.name || el.plot_number || 'N/A';
        ctx.fillText(labelText, el.x + el.width / 2, el.y + el.height / 2);

      } else if (el.type === ElementType.ROAD) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(el.x, el.y, el.width, el.height);
        ctx.strokeStyle = '#cbd5e1';
        ctx.setLineDash([10, 10]);
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        if (el.width > el.height) {
          ctx.moveTo(el.x, el.y + el.height / 2);
          ctx.lineTo(el.x + el.width, el.y + el.height / 2);
        } else {
          ctx.moveTo(el.x + el.width / 2, el.y);
          ctx.lineTo(el.x + el.width / 2, el.y + el.height);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        
        if (el.name) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${el.fontSize || 10}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(el.name, el.x + el.width / 2, el.y + el.height / 2);
        }
      } else if (el.type === ElementType.TEXT) {
        ctx.fillStyle = el.color || '#000000';
        ctx.font = `${el.fontWeight === 'bold' ? 'bold ' : ''}${el.fontSize || 18}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.name || 'Double Click to Edit', el.x + el.width / 2, el.y + el.height / 2);
      }

      if (el.plot_unit_id === selectedId) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 4 / zoom;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(el.x - 2, el.y - 2, el.width + 4, el.height + 4);
        ctx.fillStyle = '#3b82f6';
        ctx.setLineDash([]);
        ctx.fillRect(el.x + el.width - 5/zoom, el.y + el.height - 5/zoom, 10/zoom, 10/zoom);
      }
      ctx.restore();
    });
    ctx.restore();
  }, [elements, selectedId, zoom, offset]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        draw();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  // 6. Interaction Handlers
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offset.x) / zoom,
      y: (e.clientY - rect.top - offset.y) / zoom
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    if (selectedElement) {
      const hx = selectedElement.x + selectedElement.width;
      const hy = selectedElement.y + selectedElement.height;
      if (Math.abs(pos.x - hx) < 15/zoom && Math.abs(pos.y - hy) < 15/zoom) {
        setResizeInfo({ id: selectedElement.plot_unit_id, startX: pos.x, startY: pos.y, originalW: selectedElement.width, originalH: selectedElement.height });
        return;
      }
    }
    const clickedEl = [...elements].reverse().find(el => 
      el.visible !== false && pos.x >= el.x && pos.x <= el.x + el.width && pos.y >= el.y && pos.y <= el.y + el.height
    );
    if (clickedEl) {
      setSelectedId(clickedEl.plot_unit_id);
      setDragInfo({ id: clickedEl.plot_unit_id, startX: pos.x, startY: pos.y, originalX: clickedEl.x, originalY: clickedEl.y });
    } else {
      setSelectedId(null);
      setIsPanning(true);
      setDragInfo({ id: 'canvas', startX: e.clientX, startY: e.clientY, originalX: offset.x, originalY: offset.y });
    }
  };

  const handleMouseMove = (e) => {
    if (resizeInfo) {
      const pos = getMousePos(e);
      setElements(prev => prev.map(el => el.plot_unit_id === resizeInfo.id ? { ...el, width: Math.max(10, resizeInfo.originalW + (pos.x - resizeInfo.startX)), height: Math.max(10, resizeInfo.originalH + (pos.y - resizeInfo.startY)) } : el));
    } else if (dragInfo) {
      if (dragInfo.id === 'canvas') {
        setOffset({ x: dragInfo.originalX + (e.clientX - dragInfo.startX), y: dragInfo.originalY + (e.clientY - dragInfo.startY) });
      } else {
        const pos = getMousePos(e);
        setElements(prev => prev.map(el => el.plot_unit_id === dragInfo.id ? { ...el, x: dragInfo.originalX + (pos.x - dragInfo.startX), y: dragInfo.originalY + (pos.y - dragInfo.startY) } : el));
      }
    }
  };

  const handleMouseUp = () => {
    setDragInfo(null);
    setResizeInfo(null);
    setIsPanning(false);
  };

  const handleSave = async () => {
    if (activeProject) {
      const propertyId = activeProject.property_id;
      try {
        await updatePlotLayout(propertyId, elements);
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 3000);
      } catch (err) {
        alert("Save failed");
      }
    }
  };

  const addElement = (type) => {
    const newId = `UNIT-${Date.now()}`;
    const newElement = {
      plot_unit_id: newId,
      plot_project_id: activeProject?.property_id || '',
      plot_number: type === ElementType.PLOT ? `${elements.length + 1}` : '',
      x: 100,
      y: 100,
      width: type === ElementType.PLOT ? 60 : 200,
      height: type === ElementType.PLOT ? 80 : 40,
      status: PlotUnitStatus.ACTIVE,
      type: type,
      name: type === ElementType.ROAD ? 'Main Road' : '',
      rotation: 0,
      visible: true
    };
    setElements([...elements, newElement]);
    setSelectedId(newId);
  };

  const handleGoBack = () => {
    setActiveProject(null);
    navigate('/plots'); 
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50">
        <div className="flex items-center space-x-4">
          <button onClick={handleGoBack} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center space-x-2">
            <button onClick={() => addElement(ElementType.PLOT)} className="px-3 py-1.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-lg border border-green-100 hover:bg-green-100 uppercase tracking-widest">Add Plot</button>
            <button onClick={() => addElement(ElementType.ROAD)} className="px-3 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg border border-slate-700 hover:bg-slate-700 uppercase tracking-widest">Add Road</button>
            <button onClick={() => addElement(ElementType.TEXT)} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100 hover:bg-blue-100 uppercase tracking-widest">Add Label</button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1">
            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg></button>
            <span className="text-[10px] font-bold text-slate-400 w-12 text-center uppercase tracking-widest">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg></button>
          </div>
          <button onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white text-[10px] font-bold rounded-xl uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">Save Layout</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 bg-slate-100 overflow-hidden relative">
           <canvas 
            ref={canvasRef} 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`w-full h-full block ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
           />
           {showSaveSuccess && (
             <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-3">
               <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                 <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
               </div>
               <span className="text-xs font-bold uppercase tracking-widest">Layout saved to project master</span>
             </div>
           )}
        </div>

        {/* Sidebar Settings */}
        {selectedElement && (
          <div className="w-80 border-l border-slate-100 bg-white p-6 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-6 flex items-center justify-between">
              <span>Element Properties</span>
              <button 
                onClick={() => {
                  setElements(elements.filter(e => e.plot_unit_id !== selectedId));
                  setSelectedId(null);
                }}
                className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </h3>
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Label / Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" 
                  value={selectedElement.name || ''}
                  onChange={(e) => setElements(elements.map(el => el.plot_unit_id === selectedId ? {...el, name: e.target.value} : el))}
                />
              </div>

              {selectedElement.type === ElementType.PLOT && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plot No.</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" 
                      value={selectedElement.plot_number || ''}
                      onChange={(e) => setElements(elements.map(el => el.plot_unit_id === selectedId ? {...el, plot_number: e.target.value} : el))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                      value={selectedElement.status}
                      onChange={(e) => setElements(elements.map(el => el.plot_unit_id === selectedId ? {...el, status: e.target.value} : el))}
                    >
                      {Object.values(PlotUnitStatus).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Geometry</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400">Position X</label>
                    <input type="number" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" value={Math.round(selectedElement.x)} onChange={(e) => setElements(elements.map(el => el.plot_unit_id === selectedId ? {...el, x: parseInt(e.target.value)} : el))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400">Position Y</label>
                    <input type="number" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" value={Math.round(selectedElement.y)} onChange={(e) => setElements(elements.map(el => el.plot_unit_id === selectedId ? {...el, y: parseInt(e.target.value)} : el))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Rotation</label>
                  <input type="range" min="0" max="360" className="w-full accent-slate-800" value={selectedElement.rotation || 0} onChange={(e) => setElements(elements.map(el => el.plot_unit_id === selectedId ? {...el, rotation: parseInt(e.target.value)} : el))} />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Styling</p>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-[9px] font-bold text-slate-400">Font Size</label>
                     <input type="number" className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs" value={selectedElement.fontSize || 12} onChange={(e) => setElements(elements.map(el => el.plot_unit_id === selectedId ? {...el, fontSize: parseInt(e.target.value)} : el))} />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[9px] font-bold text-slate-400">Color</label>
                     <input type="color" className="w-full h-8 p-1 bg-slate-50 border rounded-lg" value={selectedElement.color || '#000000'} onChange={(e) => setElements(elements.map(el => el.plot_unit_id === selectedId ? {...el, color: e.target.value} : el))} />
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlotLayoutEditor;