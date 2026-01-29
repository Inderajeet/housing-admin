import React, { useMemo, useState } from "react";
import { downloadAsset } from "../utils/downloadAsset";
import { api } from "../api/api";

export default function PropertyAssetsTabs({
    propertyId,
    assets,
    setAssets,
    isReadOnly
}) {
    const imageAssets = useMemo(
        () => assets.filter(a => a.asset_type === "image"),
        [assets]
    );

    const documentAssets = useMemo(
        () => assets.filter(a => a.asset_type === "document"),
        [assets]
    );

    const [activeTab, setActiveTab] = useState("images");
    const [downloadMode, setDownloadMode] = useState(false);
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [previewIndex, setPreviewIndex] = useState(null);

    const exitActionMode = () => {
        setDownloadMode(false);
        setDeleteMode(false);
        setSelectedAssets([]);
    };

    const toggleSelect = (id) => {
        setSelectedAssets(p =>
            p.includes(id) ? p.filter(x => x !== id) : [...p, id]
        );
    };

    const uploadFiles = async (files, type) => {
        for (const file of files) {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("asset_type", type);
            await api.post(`/property-assets/${propertyId}`, fd);
        }
        const res = await api.get(`/property-assets/${propertyId}`);
        setAssets(res.data);
    };

    const deleteSelected = async (typeName) => {
        if (!window.confirm(`Delete selected ${typeName}?`)) return;

        for (const id of selectedAssets) {
            await api.delete(`/property-assets/asset/${id}`);
        }

        setAssets(prev => prev.filter(a => !selectedAssets.includes(a.asset_id)));
        exitActionMode();
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-6">
                <button
                    onClick={() => setActiveTab("images")}
                    className={`py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === "images" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-400"
                        }`}
                >
                    Images
                </button>
                <button
                    onClick={() => setActiveTab("documents")}
                    className={`py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === "documents" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-400"
                        }`}
                >
                    Documents
                </button>
            </div>

            {activeTab === "images" && (
                <div className="space-y-4">

                    {/* Upload */}
                    {!isReadOnly && (
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={e => uploadFiles([...e.target.files], "image")}
                            className="text-xs font-bold"
                        />
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        {!downloadMode && !deleteMode && (
                            <>
                                <button onClick={() => setDownloadMode(true)} className="text-xs font-bold text-blue-600">
                                    Download
                                </button>
                                {!isReadOnly && (
                                    <button onClick={() => setDeleteMode(true)} className="text-xs font-bold text-red-600">
                                        Delete
                                    </button>
                                )}
                            </>
                        )}

                        {(downloadMode || deleteMode) && (
                            <>
                                <button
                                    onClick={() => setSelectedAssets(imageAssets.map(i => i.asset_id))}
                                    className="text-xs font-bold"
                                >
                                    Select All
                                </button>

                                {downloadMode && (
                                    <button
                                        disabled={!selectedAssets.length}
                                        onClick={async () => {
                                            const selected = imageAssets.filter(i =>
                                                selectedAssets.includes(i.asset_id)
                                            );
                                            for (const img of selected) await downloadAsset(img);
                                            exitActionMode();
                                        }}
                                        className="text-xs font-bold text-green-600"
                                    >
                                        Download Selected
                                    </button>
                                )}

                                {deleteMode && (
                                    <button
                                        disabled={!selectedAssets.length}
                                        onClick={() => deleteSelected("images")}
                                        className="text-xs font-bold text-red-600"
                                    >
                                        Delete Selected
                                    </button>
                                )}

                                <button onClick={exitActionMode} className="text-xs font-bold text-gray-400">
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-4 gap-4">
                        {imageAssets.map((img, idx) => (
                            <div key={img.asset_id} className="relative border rounded-xl overflow-hidden">
                                {(downloadMode || deleteMode) && (
                                    <input
                                        type="checkbox"
                                        checked={selectedAssets.includes(img.asset_id)}
                                        onChange={() => toggleSelect(img.asset_id)}
                                        className="absolute top-2 left-2 z-10"
                                    />
                                )}

                                <img
                                    src={img.file_url}
                                    onClick={() => {
                                        if (!downloadMode && !deleteMode) setPreviewIndex(idx);
                                    }}
                                    className="h-32 w-full object-cover cursor-pointer"
                                />

                                <span className="absolute bottom-2 left-2 text-[10px] bg-black/70 text-white px-2 py-0.5 rounded">
                                    #{img.sort_order}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Preview Slider */}
                    {previewIndex !== null && (
                        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center">
                            <button
                                className="absolute top-6 right-6 text-white text-3xl"
                                onClick={() => setPreviewIndex(null)}
                            >
                                ✕
                            </button>

                            <button
                                className="absolute left-6 text-white text-4xl"
                                onClick={() => setPreviewIndex(i => Math.max(i - 1, 0))}
                            >
                                ‹
                            </button>

                            <img
                                src={imageAssets[previewIndex]?.file_url}
                                className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl"
                            />

                            <button
                                className="absolute right-6 text-white text-4xl"
                                onClick={() =>
                                    setPreviewIndex(i =>
                                        Math.min(i + 1, imageAssets.length - 1)
                                    )
                                }
                            >
                                ›
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "documents" && (
                <div className="space-y-4">

                    {/* Upload */}
                    {!isReadOnly && (
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            multiple
                            onChange={e => uploadFiles([...e.target.files], "document")}
                            className="text-xs font-bold"
                        />
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        {!downloadMode && !deleteMode && (
                            <>
                                <button onClick={() => setDownloadMode(true)} className="text-xs font-bold text-blue-600">
                                    Download
                                </button>
                                {!isReadOnly && (
                                    <button onClick={() => setDeleteMode(true)} className="text-xs font-bold text-red-600">
                                        Delete
                                    </button>
                                )}
                            </>
                        )}

                        {(downloadMode || deleteMode) && (
                            <>
                                <button
                                    onClick={() => setSelectedAssets(documentAssets.map(d => d.asset_id))}
                                    className="text-xs font-bold"
                                >
                                    Select All
                                </button>

                                {downloadMode && (
                                    <button
                                        disabled={!selectedAssets.length}
                                        onClick={async () => {
                                            const selected = documentAssets.filter(d =>
                                                selectedAssets.includes(d.asset_id)
                                            );
                                            for (const doc of selected) await downloadAsset(doc);
                                            exitActionMode();
                                        }}
                                        className="text-xs font-bold text-green-600"
                                    >
                                        Download Selected
                                    </button>
                                )}

                                {deleteMode && (
                                    <button
                                        disabled={!selectedAssets.length}
                                        onClick={() => deleteSelected("documents")}
                                        className="text-xs font-bold text-red-600"
                                    >
                                        Delete Selected
                                    </button>
                                )}

                                <button onClick={exitActionMode} className="text-xs font-bold text-gray-400">
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>

                    {/* Document List */}
                    {documentAssets.map(doc => (
                        <div key={doc.asset_id} className="flex items-center gap-3 p-4 border rounded-xl bg-gray-50">
                            {(downloadMode || deleteMode) && (
                                <input
                                    type="checkbox"
                                    checked={selectedAssets.includes(doc.asset_id)}
                                    onChange={() => toggleSelect(doc.asset_id)}
                                />
                            )}

                            <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-blue-600 hover:underline"
                            >
                                {doc.file_name}
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
