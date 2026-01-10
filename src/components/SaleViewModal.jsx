import React, { useEffect, useState } from 'react';
import Loader from './Loader';
import { getSaleProperties } from '../api/sale.api';

const SaleViewModal = ({ propertyId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const list = await getSaleProperties();
      const found = list.find(p => p.property_id === propertyId);
      setData(found || null);
      setLoading(false);
    };
    load();
  }, [propertyId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl overflow-hidden">

        <div className="px-8 py-6 border-b flex justify-between">
          <h3 className="text-xl font-bold">View Sale Property</h3>
          <button onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <Loader text="Loading sale property..." />
        ) : !data ? (
          <div className="p-8 text-gray-400">Property not found</div>
        ) : (
          <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">

            {/* BASIC INFO */}
            <div className="grid grid-cols-2 gap-8">
              <Field label="Title" value={data.title} />
              <Field label="Seller ID" value={data.seller_id} />
              <Field label="Price" value={`₹${Number(data.price).toLocaleString()}`} />
              <Field label="Sale Type" value={data.sale_type} />
            </div>

            {/* ADDRESS */}
            <Field label="Address" value={data.address} full />

            {/* STATUS */}
            <div className="grid grid-cols-2 gap-8">
              <Field label="Sale Status" value={data.sale_status} />
              <Field label="Master Status" value={data.status} />
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, value, full }) => (
  <div className={`flex flex-col space-y-1 ${full ? 'col-span-2' : ''}`}>
    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
      {label}
    </label>
    <div className="px-4 py-2 rounded-xl border bg-gray-50 font-semibold text-gray-800">
      {value || '-'}
    </div>
  </div>
);

export default SaleViewModal;
