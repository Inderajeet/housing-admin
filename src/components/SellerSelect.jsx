import React, { useEffect, useRef, useState } from 'react';
import { getSellerDropdown } from '../api/seller.api';

const SellerSelect = ({ value, onChange, disabled }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [sellers, setSellers] = useState([]);
    const [selectedSeller, setSelectedSeller] = useState(null);

    const wrapperRef = useRef(null);

    // close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // fetch sellers on open / search
    useEffect(() => {
        if (open) fetchSellers();
    }, [search, open]);

    const fetchSellers = async () => {
        const data = await getSellerDropdown(search);
        setSellers(Array.isArray(data) ? data : []);
    };

    // keep selected seller info synced
    useEffect(() => {
        if (value && sellers.length) {
            const found = sellers.find(s => s.seller_id === Number(value));
            if (found) setSelectedSeller(found);
        }
    }, [value, sellers]);

    useEffect(() => {
        if (value && !selectedSeller) {
            (async () => {
                const data = await getSellerDropdown('');
                const found = data.find(s => s.seller_id === Number(value));
                if (found) setSelectedSeller(found);
            })();
        }
    }, [value]);

    return (
        <div ref={wrapperRef} className="relative">
            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-2 block">
                Seller
            </label>

            {/* Selected value */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(o => !o)}
                className={`w-full text-left px-4 py-2 rounded-xl border border-gray-400 bg-white
          focus:ring-2 focus:ring-emerald-500 outline-none
          ${disabled ? 'bg-gray-200 cursor-not-allowed' : ''}`}
            >
                {selectedSeller ? (
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-800">
                            {selectedSeller.name || 'Unnamed Seller'}
                        </span>
                        <span className="text-xs text-gray-500">
                            {selectedSeller.phone_number} · ID {selectedSeller.seller_id}
                        </span>
                    </div>
                ) : (
                    <span className="text-gray-500 font-semibold">Select Seller</span>
                )}
            </button>

            {/* Dropdown */}
            {open && !disabled && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-300 rounded-xl shadow-xl overflow-hidden">

                    {/* Search (inside dropdown) */}
                    <div className="p-3 border-b">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search seller name / phone"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold
                focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>

                    {/* List */}
                    <div className="max-h-60 overflow-y-auto">
                        {sellers.length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-400">
                                No sellers found
                            </div>
                        )}

                        {sellers.map(s => (
                            <div
                                key={s.seller_id}
                                onClick={() => {
                                    onChange(s); 
                                    setSelectedSeller(s);
                                    setOpen(false);
                                    setSearch('');
                                }}
                                className="px-4 py-3 cursor-pointer hover:bg-emerald-50 transition-colors border-b last:border-b-0"
                            >
                                <div className="font-bold text-gray-800">
                                    {s.name || 'Unnamed Seller'}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {s.phone_number} · ID {s.seller_id}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerSelect;
