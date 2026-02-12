import React, { useState, useMemo } from "react";

const DataTable = ({ 
  columns, 
  data, 
  onEdit, 
  onView, 
  actions,
  itemsPerPage = 10,
  showPagination = true
}) => {
  const [sortConfig, setSortConfig] = useState({ 
    key: null, 
    direction: "asc",
    sortByValue: null // Track if we should sort by a custom value
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPageState, setItemsPerPageState] = useState(itemsPerPage);

  const safeData = Array.isArray(data) ? data : [];
  const hasActions = Boolean(onView || onEdit || actions);

  // Calculate pagination values
  const totalPages = Math.ceil(safeData.length / itemsPerPageState);
  const startIndex = (currentPage - 1) * itemsPerPageState;
  const endIndex = startIndex + itemsPerPageState;

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return safeData;

    return [...safeData].sort((a, b) => {
      let aValue, bValue;
      
      // Get the column configuration
      const column = columns.find(col => col.accessor === sortConfig.key);
      
      if (column && typeof column.accessor === "function") {
        // For functional columns with sortBy function
        if (column.sortBy && typeof column.sortBy === "function") {
          aValue = column.sortBy(a);
          bValue = column.sortBy(b);
        } 
        // For functional columns that return JSX, try to extract text
        else if (column.sortByText && typeof column.sortByText === "function") {
          aValue = column.sortByText(a);
          bValue = column.sortByText(b);
        }
        // For functional columns, try to get a sortable value
        else if (column.sortableValue && typeof column.sortableValue === "function") {
          aValue = column.sortableValue(a);
          bValue = column.sortableValue(b);
        }
        // Default: use the accessor function result
        else {
          const aResult = column.accessor(a);
          const bResult = column.accessor(b);
          
          // Try to extract text from React elements
          if (React.isValidElement(aResult) && React.isValidElement(bResult)) {
            // For React elements, try to get text content
            aValue = aResult.props.children?.toString() || '';
            bValue = bResult.props.children?.toString() || '';
          } else {
            aValue = aResult;
            bValue = bResult;
          }
        }
      } else {
        // For string accessors
        aValue = a?.[sortConfig.key] ?? '';
        bValue = b?.[sortConfig.key] ?? '';
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === "asc" 
          ? aValue.localeCompare(bValue, undefined, { sensitivity: 'base' })
          : bValue.localeCompare(aValue, undefined, { sensitivity: 'base' });
      }
      
      // For numbers and other types
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [safeData, sortConfig, columns]);

  // Paginate data
  const paginatedData = useMemo(() => {
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, startIndex, endIndex]);

  const handleSort = (col) => {
    // Don't sort if column is not sortable
    if (col.sortable === false) return;
    
    // Don't sort if accessor is a function (unless sortable is explicitly true)
    if (typeof col.accessor === "function" && col.sortable !== true) return;
    
    const key = col.accessor;
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ 
      key, 
      direction,
      sortByValue: col.sortBy || col.sortableValue || col.sortByText
    });
    setCurrentPage(1);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (e) => {
    const value = parseInt(e.target.value);
    setItemsPerPageState(value);
    setCurrentPage(1);
  };

  // Generate page numbers
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              {columns.map((col, idx) => {
                // Determine if column should be sortable
                const isSortable = col.sortable !== false && 
                  (typeof col.accessor !== "function" || col.sortable === true);
                
                return (
                  <th
                    key={idx}
                    onClick={() => handleSort(col)}
                    className={`px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest ${isSortable ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'} transition-colors ${col.className || ""}`}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{col.header}</span>
                      {isSortable && (
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
                );
              })}
              {hasActions && (
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right cursor-default">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {paginatedData.length > 0 ? (
              paginatedData.map((item, index) => (
                <tr
                  key={item.enquiry_id || item.property_id || item.seller_id || `row-${startIndex + index}`}
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

      {/* Pagination Controls (same as before) */}
      {showPagination && safeData.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          {/* Items per page selector */}
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Show
            </span>
            <select
              value={itemsPerPageState}
              onChange={handleItemsPerPageChange}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              entries
            </span>
          </div>

          {/* Page info */}
          <div className="text-xs font-bold text-gray-700 uppercase tracking-widest">
            Showing {startIndex + 1} to {Math.min(endIndex, safeData.length)} of {safeData.length} entries
          </div>

          {/* Page navigation */}
          <div className="flex items-center space-x-2">
            {/* First page button */}
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className={`p-1.5 rounded-lg border ${currentPage === 1
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

            {/* Previous page button */}
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-1.5 rounded-lg border ${currentPage === 1
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Page numbers */}
            <div className="flex space-x-1">
              {getPageNumbers().map((pageNum, index) => (
                pageNum === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-2 py-1 text-xs text-gray-400">...</span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold ${currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    {pageNum}
                  </button>
                )
              ))}
            </div>

            {/* Next page button */}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded-lg border ${currentPage === totalPages
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Last page button */}
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded-lg border ${currentPage === totalPages
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;