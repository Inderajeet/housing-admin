import React, { useState, useMemo } from "react";

const DataTable = ({ columns, data, onEdit, onView, actions }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const safeData = Array.isArray(data) ? data : [];
  const hasActions = Boolean(onView || onEdit || actions);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return safeData;

    return [...safeData].sort((a, b) => {
      const aValue = a?.[sortConfig.key] ?? '';
      const bValue = b?.[sortConfig.key] ?? '';

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [safeData, sortConfig]);

  const handleSort = col => {
    if (typeof col.accessor === "function") return;
    const key = col.accessor;
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  onClick={() => handleSort(col)}
                  className={`px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:bg-gray-100 transition-colors ${col.className || ""}`}
                >
                  <div className="flex items-center space-x-1">
                    <span>{col.header}</span>
                    {typeof col.accessor !== "function" && (
                      <svg
                        className={`w-3 h-3 transition-transform ${sortConfig.key === col.accessor &&
                          sortConfig.direction === "desc"
                          ? "rotate-180"
                          : ""
                          }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
              {hasActions && (
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {sortedData.length > 0 ? (
              sortedData.map((item, index) => (
                <tr
                  // FIX: Using a combination of IDs to ensure the key is always unique
                  key={item.enquiry_id || item.property_id || item.seller_id || `row-${index}`}
                  className="hover:bg-blue-50/20 transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-6 py-4 text-sm text-gray-700 ${col.className || ""}`}
                    >
                      {typeof col.accessor === "function"
                        ? col.accessor(item)
                        : item?.[col.accessor] ?? '-'}
                    </td>
                  ))}

                  <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                    <div className="flex justify-end space-x-2">
                      {onView && (
                        <button
                          onClick={() => onView(item)}
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      )}

                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}

                      {actions && actions(item)}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest"
                >
                  No matching records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;