import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getFlatLayout, saveFlatLayout } from '../api/flat.api';
import toast from 'react-hot-toast';
import { useApp } from '../App';

const getBookingStatusStyles = (status) => {
    const normalizedStatus = String(status || '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

    if (normalizedStatus === 'NIL_BOOKING') {
        return {
            tile: 'bg-emerald-500 text-white shadow-inner',
            buttonActive: 'bg-emerald-500 text-white border-emerald-600',
            buttonInactive: 'bg-white text-emerald-600 border-emerald-100'
        };
    }

    if (normalizedStatus === 'ON_BOOKING' || normalizedStatus === 'BOOKED') {
        return {
            tile: 'bg-yellow-400 text-slate-900 shadow-inner',
            buttonActive: 'bg-yellow-400 text-slate-900 border-yellow-500',
            buttonInactive: 'bg-white text-yellow-600 border-yellow-100'
        };
    }

    return {
        tile: 'bg-red-500 text-white shadow-inner',
        buttonActive: 'bg-red-500 text-white border-red-600',
        buttonInactive: 'bg-white text-red-600 border-red-100'
    };
};

const FlatLayoutEditor = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { activeProject } = useApp();
    const [dims, setDims] = useState({ rows: 40, cols: 60 });
    const [zoom, setZoom] = useState(1);
    const [gridData, setGridData] = useState({});
    const [history, setHistory] = useState([]);
    const [selection, setSelection] = useState({ start: null, end: null });
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedCellKey, setSelectedCellKey] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const recordHistory = (data) => {
        setHistory(prev => [...prev, JSON.stringify(data)].slice(-20));
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const lastState = JSON.parse(history[history.length - 1]);
        setGridData(lastState);
        setHistory(prev => prev.slice(0, -1));
        toast.success("Undo successful", { duration: 1000, icon: '↩️' });
    };

    // Auto-number FLAT cells (mirrors refreshPlotNumbers)
    const refreshFlatNumbers = useCallback((currentGrid) => {
        const newGrid = { ...currentGrid };
        const flatKeys = Object.keys(newGrid).filter(
            key => newGrid[key].type === 'FLAT' && !newGrid[key].merged
        );
        flatKeys.sort((a, b) => {
            const [rA, cA] = a.split('-').map(Number);
            const [rB, cB] = b.split('-').map(Number);
            return rA !== rB ? rA - rB : cA - cB;
        });
        let currentAutoIndex = 1;
        flatKeys.forEach((key) => {
            if (!(newGrid[key].isManual && newGrid[key].display_name !== "")) {
                newGrid[key].display_name = currentAutoIndex.toString();
                newGrid[key].isManual = false;
                currentAutoIndex++;
            }
        });
        return newGrid;
    }, []);

    // Load layout on mount
    useEffect(() => {
        const load = async () => {
            try {
                const res = await getFlatLayout(id);
                const rawItems = Array.isArray(res.data) ? res.data : (res.data?.items || []);
                const unitStatusByKey = new Map();
                const mapped = {};
                let maxR = 40, maxC = 60;

                rawItems.forEach(item => {
                    if (item.type !== 'FLAT') return;

                    const unitKeyCandidates = [
                        item.flat_unit_id != null ? `id:${item.flat_unit_id}` : null,
                        item.flat_number ? `name:${String(item.flat_number).trim()}` : null,
                        item.name ? `name:${String(item.name).trim()}` : null,
                    ].filter(Boolean);

                    const hasCoordinates = !isNaN(parseInt(item.x, 10)) && !isNaN(parseInt(item.y, 10));
                    if (!hasCoordinates && item.status) {
                        unitKeyCandidates.forEach(key => unitStatusByKey.set(key, item.status));
                    }
                });

                rawItems.forEach(item => {
                    const x = parseInt(item.x, 10), y = parseInt(item.y, 10);
                    const w = parseInt(item.width, 10) || 1, h = parseInt(item.height, 10) || 1;
                    if (isNaN(x) || isNaN(y)) return;
                    if (y + h > maxR) maxR = y + h + 5;
                    if (x + w > maxC) maxC = x + w + 5;

                    const resolvedStatus = item.type === 'FLAT'
                        ? unitStatusByKey.get(`id:${item.flat_unit_id}`) ||
                          unitStatusByKey.get(`name:${String(item.name || item.flat_number || '').trim()}`) ||
                          item.status ||
                          'Nil Booking'
                        : item.status;

                    const key = `${y}-${x}`;
                    mapped[key] = {
                        ...item,
                        row: y, col: x,
                        colSpan: w, rowSpan: h,
                        display_name: item.name || item.label || '',
                        isManual: isNaN(item.name) && item.type === 'FLAT',
                        type: item.type || 'FLAT',
                        status: resolvedStatus,
                        rotation: item.rotation || 0,
                        color: item.color || (item.type === 'TEXT' ? '#2563eb' : '#ffffff'),
                        font_size: item.font_size || 10,
                        font_weight: item.font_weight || '900',
                    };

                    if (w > 1 || h > 1) {
                        for (let r = 0; r < h; r++) {
                            for (let c = 0; c < w; c++) {
                                if (r === 0 && c === 0) continue;
                                mapped[`${y + r}-${x + c}`] = { merged: true, anchorKey: key };
                            }
                        }
                    }
                });
                setDims({ rows: maxR, cols: maxC });
                setGridData(refreshFlatNumbers(mapped));
            } catch (err) { console.error(err); }
        };
        if (id) load();
    }, [id, refreshFlatNumbers]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const elements = Object.keys(gridData)
                .filter(key => !gridData[key].merged && gridData[key].type)
                .map(key => {
                    const cell = gridData[key];
                    return {
                        property_id: id,
                        type: cell.type,
                        x: cell.col, y: cell.row,
                        width: cell.colSpan || 1, height: cell.rowSpan || 1,
                        name: cell.display_name,
                        status: cell.status,
                        rotation: parseInt(cell.rotation || 0),
                        color: cell.color,
                        font_size: parseInt(cell.font_size || 10),
                        font_weight: cell.font_weight || '900',
                        visible: true,
                    };
                });
            await saveFlatLayout(id, elements);
            toast.success("Layout Saved Successfully!");
        } catch (err) {
            toast.error("Save failed");
        } finally {
            setIsSaving(false);
        }
    };

    const applyAction = (type) => {
        recordHistory(gridData);
        let newGrid = { ...gridData };
        const { start, end } = selection;
        if (!start || !end) return;

        const rMin = Math.min(start.r, end.r), rMax = Math.max(start.r, end.r);
        const cMin = Math.min(start.c, end.c), cMax = Math.max(start.c, end.c);

        if (type === 'CLEAR') {
            for (let r = rMin; r <= rMax; r++) {
                for (let c = cMin; c <= cMax; c++) delete newGrid[`${r}-${c}`];
            }
        } else {
            const isText = type === 'TEXT';
            const shouldMergeSelection = type !== 'FLAT';
            for (let r = rMin; r <= rMax; r++) {
                for (let c = cMin; c <= cMax; c++) {
                    const key = `${r}-${c}`;
                    const isAnchor = r === rMin && c === cMin;
                    newGrid[key] = {
                        type, row: r, col: c,
                        merged: shouldMergeSelection ? (isText ? false : !isAnchor) : false,
                        anchorKey: shouldMergeSelection && !isAnchor ? `${rMin}-${cMin}` : null,
                        colSpan: shouldMergeSelection && isAnchor ? (cMax - cMin + 1) : 1,
                        rowSpan: shouldMergeSelection && isAnchor ? (rMax - rMin + 1) : 1,
                        display_name: isAnchor ? (isText ? 'LABEL' : '') : '',
                        status: 'Nil Booking',
                        rotation: 0,
                        color: isText ? '#2563eb' : '#ffffff',
                        font_size: isText ? 14 : 10,
                        font_weight: '900',
                    };
                }
            }
        }
        setGridData(refreshFlatNumbers(newGrid));
        setSelection({ start: null, end: null });
    };

    const activeCell = selectedCellKey ? gridData[selectedCellKey] : null;

    return (
        <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
            <div className="flex-1 flex flex-col min-w-0 relative">

                {/* ── Top Bar ── */}
                <div className="h-20 bg-white border-b flex items-center justify-between px-10 z-50 shrink-0">
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => navigate('/flats')}
                            className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-all"
                        >
                            ← Back
                        </button>
                        <h1 className="font-black text-slate-800 uppercase text-lg tracking-tighter">
                            Flat: <span className="text-blue-600">{activeProject?.formatted_id || id}</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Undo */}
                        <button
                            onClick={handleUndo}
                            disabled={history.length === 0}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:grayscale transition-all"
                        >
                            <span className="text-lg">↩</span>
                            <span className="text-[11px] font-black uppercase">Undo</span>
                        </button>

                        {/* Zoom */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1 px-3">
                            <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="w-8 h-8 font-black text-slate-500 hover:bg-white rounded-xl transition-all">-</button>
                            <span className="text-[12px] font-black w-12 text-center text-slate-700">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="w-8 h-8 font-black text-slate-500 hover:bg-white rounded-xl transition-all">+</button>
                        </div>

                        {/* Save */}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl text-[12px] font-black uppercase shadow-[0_15px_30px_-5px_rgba(37,99,235,0.4)] hover:shadow-[0_20px_40px_-5px_rgba(37,99,235,0.5)] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {/* ── Canvas ── */}
                <div
                    className="flex-1 overflow-auto p-20 bg-[#f0f4f8]"
                    onMouseUp={() => setIsSelecting(false)}
                >
                    <div
                        className="inline-grid bg-white shadow-2xl origin-top-left border-[0.5px] border-slate-200"
                        style={{
                            gridTemplateColumns: `repeat(${dims.cols}, 32px)`,
                            gridAutoRows: '32px',
                            transform: `scale(${zoom})`,
                            userSelect: 'none',
                        }}
                    >
                        {Array.from({ length: dims.rows }).map((_, r) =>
                            Array.from({ length: dims.cols }).map((_, c) => {
                                const key = `${r}-${c}`;
                                const cell = gridData[key];
                                if (cell?.merged) return null;

                                const isSelected = selection.start &&
                                    r >= Math.min(selection.start.r, selection.end.r) &&
                                    r <= Math.max(selection.start.r, selection.end.r) &&
                                    c >= Math.min(selection.start.c, selection.end.c) &&
                                    c <= Math.max(selection.start.c, selection.end.c);

                                let cellClass = "w-full h-full border-[0.1px] border-slate-100 flex items-center justify-center transition-all relative overflow-hidden ";
                                let cellStyle = {};

                                if (cell?.type === 'FLAT') {
                                    cellClass += getBookingStatusStyles(cell.status).tile;
                                    cellStyle = {
                                        fontSize: `${cell.font_size}px`,
                                        fontWeight: cell.font_weight,
                                        color: cell.color || '#fff',
                                    };
                                } else if (cell?.type === 'ROAD') {
                                    cellClass += "bg-slate-700 text-white";
                                } else if (cell?.type === 'TEXT') {
                                    cellClass += "bg-transparent";
                                    cellStyle = {
                                        fontSize: `${cell.font_size || 14}px`,
                                        fontWeight: cell.font_weight || '900',
                                        color: cell.color || '#2563eb',
                                    };
                                } else {
                                    cellClass += "bg-white hover:bg-slate-50 cursor-crosshair";
                                }

                                const borderStyle = selectedCellKey === key
                                    ? "outline outline-2 outline-blue-600 outline-offset-[-2px] z-30 shadow-lg"
                                    : "";
                                const selectionStyle = isSelected ? "bg-blue-500/10" : "";

                                return (
                                    <div
                                        key={key}
                                        style={{
                                            gridColumnStart: c + 1,
                                            gridColumnEnd: `span ${cell?.colSpan || 1}`,
                                            gridRowStart: r + 1,
                                            gridRowEnd: `span ${cell?.rowSpan || 1}`,
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setSelectedCellKey(key);
                                            setSelection({ start: { r, c }, end: { r, c } });
                                            setIsSelecting(true);
                                        }}
                                        onMouseEnter={() => {
                                            if (isSelecting) setSelection(prev => ({ ...prev, end: { r, c } }));
                                        }}
                                        className={`${cellClass} ${borderStyle} ${selectionStyle}`}
                                    >
                                        <span style={cellStyle} className="whitespace-nowrap pointer-events-none">
                                            {cell?.display_name || ''}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── Bottom Toolbar ── */}
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl p-2 rounded-[28px] flex items-center gap-2 z-[60]">
                    <button onClick={() => applyAction('FLAT')}  className="px-7 py-3.5 bg-emerald-500 text-white text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all">Add Flats</button>
                    <button onClick={() => applyAction('ROAD')}  className="px-7 py-3.5 bg-slate-900 text-white text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all">Road</button>
                    <button onClick={() => applyAction('TEXT')}  className="px-7 py-3.5 bg-blue-600 text-white text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all">Text</button>
                    <button onClick={() => applyAction('CLEAR')} className="px-7 py-3.5 bg-red-50 text-red-500 text-[11px] font-black rounded-2xl uppercase border border-red-100 hover:scale-105 active:scale-95 transition-all">Clear</button>
                </div>
            </div>

            {/* ── Right Panel (cell inspector) ── */}
            {selectedCellKey && activeCell && !activeCell.merged && (
                <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto shrink-0 z-10">
                    <div className="p-8 space-y-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Type</p>
                            <p className="font-black text-slate-800 text-sm">{activeCell.type}</p>
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                {activeCell.type === 'FLAT' ? 'Flat Number' : 'Label'}
                            </p>
                            <input
                                value={activeCell.display_name || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setGridData(prev => ({
                                        ...prev,
                                        [selectedCellKey]: {
                                            ...prev[selectedCellKey],
                                            display_name: val,
                                            isManual: activeCell.type === 'FLAT',
                                        },
                                    }));
                                }}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-sm focus:border-blue-500 outline-none"
                            />
                        </div>

                        {activeCell.type === 'FLAT' && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Status</p>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], status: 'Nil Booking' } }))}
                                        className={`w-full p-3 rounded-xl text-[11px] font-bold uppercase transition-all border ${getBookingStatusStyles('Nil Booking')[String(activeCell.status || '').trim().toUpperCase().replace(/[\s-]+/g, '_') === 'NIL_BOOKING' ? 'buttonActive' : 'buttonInactive']}`}
                                    >
                                        Nil Booking (Green)
                                    </button>
                                    <button
                                        onClick={() => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], status: 'ON_BOOKING' } }))}
                                        className={`w-full p-3 rounded-xl text-[11px] font-bold uppercase transition-all border ${getBookingStatusStyles('ON_BOOKING')[String(activeCell.status || '').trim().toUpperCase().replace(/[\s-]+/g, '_') === 'ON_BOOKING' ? 'buttonActive' : 'buttonInactive']}`}
                                    >
                                        On Booking (Yellow)
                                    </button>
                                    <button
                                        onClick={() => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], status: 'BOOKED' } }))}
                                        className={`w-full p-3 rounded-xl text-[11px] font-bold uppercase transition-all border ${getBookingStatusStyles('BOOKED')[String(activeCell.status || '').trim().toUpperCase().replace(/[\s-]+/g, '_') === 'BOOKED' ? 'buttonActive' : 'buttonInactive']}`}
                                    >
                                        Booked (Yellow)
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="pt-8">
                            <button
                                onClick={() => {
                                    recordHistory(gridData);
                                    const newGrid = { ...gridData };
                                    delete newGrid[selectedCellKey];
                                    setGridData(refreshFlatNumbers(newGrid));
                                    setSelectedCellKey(null);
                                }}
                                className="w-full py-4 bg-red-50 text-red-500 text-[10px] font-black rounded-xl uppercase hover:bg-red-500 hover:text-white transition-all"
                            >
                                Delete Element
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlatLayoutEditor;
