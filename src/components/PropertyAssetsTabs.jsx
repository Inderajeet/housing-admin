import React, { useMemo, useState, useRef } from "react";
import { downloadAsset } from "../utils/downloadAsset";
import { api } from "../api/api";

/**
 * Props:
 *  propertyId        – number | null (null when property hasn't been saved yet)
 *  assets            – array
 *  setAssets         – setter
 *  isReadOnly        – bool
 *  propertyData      – property object (used for live_image, drawing_image, sale_type)
 *  mode              – 'add' | 'edit' | 'view'
 *  onDrawingImageUpload(file) – async fn called when user picks a drawing image file
 *                               should return updated drawing_image URL or updated property
 */
export default function PropertyAssetsTabs({
    propertyId,
    assets,
    setAssets,
    isReadOnly,
    propertyData,
    mode = 'edit',
    onDrawingImageUpload,
    onlyType = null, // 'image' | 'document' | null — when set, hides tab bar and shows only that type
}) {
    const propertyType = String(
        propertyData?.sale_type ||
        propertyData?.property_type ||
        propertyData?.type ||
        propertyData?.property_use ||
        ""
    ).trim().toUpperCase();

    const isPlotOrFlat  = propertyType === "FLAT" || propertyType === "PLOT";
    const liveImageUrl  = propertyData?.live_image   || "";
    const [drawingUrl, setDrawingUrl] = useState(propertyData?.drawing_image || "");

    // Sync drawingUrl if propertyData changes externally
    React.useEffect(() => {
        setDrawingUrl(propertyData?.drawing_image || "");
    }, [propertyData?.drawing_image]);

    const hasLiveImage = Boolean(liveImageUrl) && mode !== 'add';

    const imageAssets    = useMemo(() => assets.filter(a => a.asset_type === "image"),    [assets]);
    const documentAssets = useMemo(() => assets.filter(a => a.asset_type === "document"), [assets]);

    // Default active tab: live-image if available, else images
    const defaultTab = hasLiveImage ? "live-image" : "images";
    const forcedTab = onlyType === 'image' ? 'images' : onlyType === 'document' ? 'documents' : null;
    const [activeTab, setActiveTab] = useState(forcedTab || defaultTab);

    const [downloadMode,    setDownloadMode]    = useState(false);
    const [deleteMode,      setDeleteMode]      = useState(false);
    const [selectedAssets,  setSelectedAssets]  = useState([]);
    const [previewIndex,    setPreviewIndex]     = useState(null);
    const [uploadingDrawing, setUploadingDrawing] = useState(false);
    const drawingFileRef = useRef();

    const tabClass = (tab) =>
        `py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
            activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-400 hover:text-gray-600"
        }`;

    // ── Helpers ──────────────────────────────────────────────────────────────

    const exitActionMode = () => {
        setDownloadMode(false);
        setDeleteMode(false);
        setSelectedAssets([]);
    };

    const toggleSelect = (id) =>
        setSelectedAssets(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

    const uploadFiles = async (files, type) => {
        for (const file of files) {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("asset_type", type);
            try {
                await api.post(`/property-assets/${propertyId}`, fd);
            } catch (err) {
                const status = err?.response?.status;
                if (status === 413) {
                    alert(`File "${file.name}" is too large. Please reduce the file size (compress the PDF or use a smaller image) and try again.`);
                } else {
                    alert(`Failed to upload "${file.name}": ${err?.message || 'Unknown error'}`);
                }
                // Refresh what was uploaded successfully so far
                const res = await api.get(`/property-assets/${propertyId}`);
                setAssets(res.data);
                return;
            }
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

    const handleDrawingUpload = async (file) => {
        if (!file || !onDrawingImageUpload) return;
        setUploadingDrawing(true);
        try {
            const result = await onDrawingImageUpload(file);
            // result may be the updated property or just a URL string
            const newUrl =
                typeof result === "string"
                    ? result
                    : result?.drawing_image || result?.data?.drawing_image || "";
            if (newUrl) setDrawingUrl(newUrl);
        } catch {
            // error handled by caller
        } finally {
            setUploadingDrawing(false);
            if (drawingFileRef.current) drawingFileRef.current.value = "";
        }
    };

    // ── "No property yet" guard ───────────────────────────────────────────────

    if (!propertyId) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                    Save property details first
                </p>
                <p className="text-xs text-gray-400">
                    Assets can be uploaded after the property is created.
                </p>
            </div>
        );
    }

    // ── Tab: single read-only image (live image) ──────────────────────────────

    const renderReadOnlyImageTab = (imageUrl, emptyLabel) => (
        <div className="space-y-4">
            {imageUrl ? (
                <div className="space-y-3">
                    <div className="border rounded-2xl overflow-hidden bg-gray-50">
                        <img
                            src={imageUrl}
                            alt={emptyLabel}
                            className="w-full max-h-[28rem] object-contain bg-white"
                        />
                    </div>
                    <a
                        href={imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 hover:underline"
                    >
                        Open Full Image
                    </a>
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                    {emptyLabel} not available
                </div>
            )}
        </div>
    );

    // ── Tab: Drawing Image (upload + view) ────────────────────────────────────

    const renderDrawingImageTab = () => (
        <div className="space-y-4">
            {/* Upload — edit mode only */}
            {!isReadOnly && (
                <div className="flex items-center gap-3">
                    <input
                        ref={drawingFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                            handleDrawingUpload(e.target.files[0]);
                        }}
                    />
                    <button
                        onClick={() => drawingFileRef.current.click()}
                        disabled={uploadingDrawing}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wide shadow disabled:opacity-60 hover:bg-blue-700"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {uploadingDrawing ? "Uploading…" : drawingUrl ? "Replace Drawing Image" : "Upload Drawing Image"}
                    </button>
                    {drawingUrl && (
                        <span className="text-[10px] text-green-600 font-bold uppercase tracking-wide">
                            Image uploaded
                        </span>
                    )}
                </div>
            )}

            {/* Preview */}
            {drawingUrl ? (
                <div className="space-y-3">
                    <div className="border rounded-2xl overflow-hidden bg-gray-50">
                        <img
                            src={drawingUrl}
                            alt="Drawing"
                            className="w-full max-h-[28rem] object-contain bg-white"
                        />
                    </div>
                    <a
                        href={drawingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 hover:underline"
                    >
                        Open Full Image
                    </a>
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                    No drawing image uploaded yet
                </div>
            )}
        </div>
    );

    // ── Main render ───────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Tab bar — hidden when onlyType is set */}
            {!onlyType && (
              <div className="flex gap-6 border-b border-gray-100">
                  {hasLiveImage && (
                      <button onClick={() => setActiveTab("live-image")} className={tabClass("live-image")}>
                          Live Image
                      </button>
                  )}
                  {isPlotOrFlat && (
                      <button onClick={() => setActiveTab("drawing-image")} className={tabClass("drawing-image")}>
                          Drawing Image
                      </button>
                  )}
                  <button onClick={() => setActiveTab("images")} className={tabClass("images")}>
                      Images
                  </button>
                  <button onClick={() => setActiveTab("documents")} className={tabClass("documents")}>
                      Documents
                  </button>
              </div>
            )}

            {/* Live Image — read-only, non-add mode only */}
            {activeTab === "live-image" && renderReadOnlyImageTab(liveImageUrl, "Live image")}

            {/* Drawing Image — upload in edit, view-only in view */}
            {activeTab === "drawing-image" && renderDrawingImageTab()}

            {/* Images */}
            {activeTab === "images" && (
                <div className="space-y-4">
                    {!isReadOnly && (
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={e => uploadFiles([...e.target.files], "image")}
                            className="text-xs font-bold"
                        />
                    )}

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
                                            const selected = imageAssets.filter(i => selectedAssets.includes(i.asset_id));
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
                                    onClick={() => { if (!downloadMode && !deleteMode) setPreviewIndex(idx); }}
                                    className="h-32 w-full object-cover cursor-pointer"
                                />
                                <span className="absolute bottom-2 left-2 text-[10px] bg-black/70 text-white px-2 py-0.5 rounded">
                                    #{img.sort_order}
                                </span>
                            </div>
                        ))}
                        {imageAssets.length === 0 && (
                            <p className="col-span-4 text-xs text-gray-400 font-medium py-4 text-center">
                                No images uploaded yet
                            </p>
                        )}
                    </div>

                    {/* Lightbox */}
                    {previewIndex !== null && (
                        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center">
                            <button className="absolute top-6 right-6 text-white text-3xl" onClick={() => setPreviewIndex(null)}>✕</button>
                            <button className="absolute left-6 text-white text-4xl" onClick={() => setPreviewIndex(i => Math.max(i - 1, 0))}>‹</button>
                            <img
                                src={imageAssets[previewIndex]?.file_url}
                                className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl"
                            />
                            <button className="absolute right-6 text-white text-4xl" onClick={() => setPreviewIndex(i => Math.min(i + 1, imageAssets.length - 1))}>›</button>
                        </div>
                    )}
                </div>
            )}

            {/* Documents */}
            {activeTab === "documents" && (
                <div className="space-y-4">
                    {!isReadOnly && (
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            multiple
                            onChange={e => uploadFiles([...e.target.files], "document")}
                            className="text-xs font-bold"
                        />
                    )}

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
                                            const selected = documentAssets.filter(d => selectedAssets.includes(d.asset_id));
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
                    {documentAssets.length === 0 && (
                        <p className="text-xs text-gray-400 font-medium py-4 text-center">No documents uploaded yet</p>
                    )}
                </div>
            )}
        </div>
    );
}
