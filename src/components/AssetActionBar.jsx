const AssetActionBar = ({
  downloadMode,
  hasSelection,
  onStart,
  onSelectAll,
  onDownload,
  onCancel
}) => {
  if (!downloadMode) {
    return (
      <button
        onClick={onStart}
        className="text-xs font-bold text-blue-600"
      >
        Download
      </button>
    );
  }

  return (
    <div className="flex gap-4 items-center">
      <button
        onClick={onSelectAll}
        className="text-xs font-bold text-blue-600"
      >
        Select All
      </button>

      <button
        disabled={!hasSelection}
        onClick={onDownload}
        className="text-xs font-bold text-green-600 disabled:opacity-40"
      >
        Download Selected
      </button>

      <button
        onClick={onCancel}
        className="text-xs font-bold text-gray-500"
      >
        Cancel
      </button>
    </div>
  );
};

export default AssetActionBar