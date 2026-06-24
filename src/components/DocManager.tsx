"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  UploadCloud,
  CheckCircle,
  Loader2,
  Play,
  FileText,
  RefreshCw,
  AlertCircle,
  Database,
  Link2,
  FolderOpen,
  ChevronRight,
  Home,
  ArrowLeft,
  Menu,
} from "lucide-react";

interface DriveItem {
  id: string | null;
  name: string;
  mimeType: string;
  size: string | null;
  createdTime: string;
  isFolder: boolean;
  ingested: boolean;
  status: "COMPLETED" | "PROCESSING" | "PENDING" | "FAILED" | "NOT_INGESTED" | "FOLDER";
  dbId: string | null;
  url: string | null;
  isGlobal?: boolean;
}

interface BreadcrumbItem {
  id: string | null; // null = root
  name: string;
}

interface DocManagerProps {
  user: {
    userId: string;
    email: string;
    role: string;
  };
  onDocumentIngested?: () => void;
  onToggleSidebar?: () => void;
}

export default function DocManager({ user, onDocumentIngested, onToggleSidebar }: DocManagerProps) {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingestingId, setIngestingId] = useState<string | null>(null);
  const [ingestingFolderId, setIngestingFolderId] = useState<string | null>(null);
  const [folderIngestProgress, setFolderIngestProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle for Global vs Personal uploads (Moderator only)
  const [isGlobalUpload, setIsGlobalUpload] = useState(true);

  // Folder navigation state
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: "Root" },
  ]);

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;

  const fetchItems = useCallback(async (folderId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const url = folderId
        ? `/api/ingest?folderId=${encodeURIComponent(folderId)}`
        : "/api/ingest";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
      } else {
        setError(data.error || "Failed to load items.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch documents. Make sure Google Drive is configured.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(currentFolderId);
  }, [currentFolderId, fetchItems]);

  // Navigate into a subfolder
  const navigateToFolder = (folderId: string, folderName: string) => {
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
  };

  // Navigate to a specific breadcrumb level
  const navigateToBreadcrumb = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  // Go back one level
  const goBack = () => {
    if (breadcrumbs.length > 1) {
      setBreadcrumbs((prev) => prev.slice(0, -1));
    }
  };

  const getPathString = () => {
    const pathParts = breadcrumbs.slice(1).map((b) => b.name);
    return pathParts.join("/");
  };

  const handleIngest = async (fileId: string, customPath?: string) => {
    setIngestingId(fileId);
    setError(null);
    try {
      const pathVal = customPath !== undefined ? customPath : getPathString();
      const globalFlag = user.role === "MODERATOR" ? isGlobalUpload : false;

      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, path: pathVal, isGlobal: globalFlag }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ingestion failed.");
        return false;
      } else {
        // Refresh current folder
        await fetchItems(currentFolderId);
        if (onDocumentIngested) onDocumentIngested();
        return true;
      }
    } catch (err) {
      console.error(err);
      setError("Network error occurred during ingestion.");
      return false;
    } finally {
      setIngestingId(null);
    }
  };

  const handleIngestFolder = async (folderId: string, folderName: string) => {
    setIngestingFolderId(folderId);
    setFolderIngestProgress(null);
    setError(null);
    try {
      const res = await fetch(`/api/ingest?folderId=${encodeURIComponent(folderId)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to retrieve folder contents for ingestion.");
        setIngestingFolderId(null);
        return;
      }
      
      const filesToIngest = (data.items || []).filter(
        (item: DriveItem) => !item.isFolder && item.id
      );
      
      if (filesToIngest.length === 0) {
        setError("No files found in this folder to ingest.");
        setIngestingFolderId(null);
        return;
      }

      const parentPath = getPathString();
      const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;

      setFolderIngestProgress({ current: 0, total: filesToIngest.length });

      for (let i = 0; i < filesToIngest.length; i++) {
        const file = filesToIngest[i];
        setFolderIngestProgress({ current: i + 1, total: filesToIngest.length });
        const success = await handleIngest(file.id!, folderPath);
        if (!success) {
          console.warn(`Failed to ingest file ${file.name} in folder queue.`);
        }
      }
      
      await fetchItems(currentFolderId);
      if (onDocumentIngested) onDocumentIngested();
    } catch (err) {
      console.error(err);
      setError("Failed to process folder ingestion queue.");
    } finally {
      setIngestingFolderId(null);
      setFolderIngestProgress(null);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    
    const globalFlag = user.role === "MODERATOR" ? isGlobalUpload : false;
    formData.append("isGlobal", String(globalFlag));

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed.");
      } else {
        await fetchItems(currentFolderId);
        if (onDocumentIngested) onDocumentIngested();
      }
    } catch (err) {
      console.error(err);
      setError("Network error occurred during manual upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        uploadFile(file);
      } else {
        setError("Only PDF files are supported.");
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getStatusBadge = (status: DriveItem["status"]) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-750 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Ingested
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-705 border border-amber-200 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Indexing
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Failed
          </span>
        );
      case "NOT_INGESTED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            New
          </span>
        );
      default:
        return null;
    }
  };

  const folders = items.filter((item) => item.isFolder);
  const files = items.filter((item) => !item.isFolder);

  return (
    <div className="flex flex-col gap-5 h-full text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition mr-1 shrink-0"
              title="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-905 tracking-tight flex items-center gap-2 truncate">
              <Database className="w-5 h-5 text-[#1a253c] shrink-0" /> Paper Database
            </h2>
            <p className="text-xs text-slate-505 font-semibold truncate">
              Browse Google Drive folders, ingest exam papers, or upload PDFs locally.
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchItems(currentFolderId)}
          disabled={loading}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition disabled:opacity-50 shrink-0"
          title="Refresh current folder"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2.5 items-start text-xs text-rose-650 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Error:</span> {error}
          </div>
        </div>
      )}

      {user.role === "MODERATOR" && (
        <div className="flex items-center gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <input
            id="global-upload-toggle"
            type="checkbox"
            checked={isGlobalUpload}
            onChange={(e) => setIsGlobalUpload(e.target.checked)}
            className="w-4.5 h-4.5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-650/40 bg-white cursor-pointer"
          />
          <label htmlFor="global-upload-toggle" className="text-xs text-slate-700 font-bold cursor-pointer select-none">
            Upload / Ingest as a <span className="bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent font-extrabold">Global Knowledge Source</span> (available to all students)
          </label>
        </div>
      )}

      {/* Local Drag and Drop Uploader */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
          dragActive
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-300 hover:border-slate-400 bg-slate-50/40"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileInputChange}
        />
        {uploading ? (
          <>
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-700">Processing and indexing uploaded PDF...</p>
            <p className="text-xs text-slate-405 font-bold">Extracting text &amp; computing embeddings</p>
          </>
        ) : (
          <>
            <UploadCloud className="w-7 h-7 text-slate-405 animate-bounce" />
            <p className="text-sm font-bold text-slate-650">
              Drag &amp; drop a PDF here, or <span className="text-indigo-600 hover:text-indigo-700">browse</span>
            </p>
            <p className="text-xs text-slate-405 font-bold">PDF documents only (up to 10MB)</p>
          </>
        )}
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {breadcrumbs.length > 1 && (
          <button
            onClick={goBack}
            className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition mr-1"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-350 shrink-0" />}
            <button
              onClick={() => navigateToBreadcrumb(idx)}
              className={`text-xs px-2 py-1 rounded-md transition truncate max-w-[140px] ${
                idx === breadcrumbs.length - 1
                  ? "text-slate-905 bg-slate-205 font-bold"
                  : "text-slate-505 hover:text-slate-900 hover:bg-slate-100"
              }`}
              title={crumb.name}
            >
              {idx === 0 ? (
                <span className="flex items-center gap-1">
                  <Home className="w-3 h-3" /> Drive
                </span>
              ) : (
                crumb.name
              )}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 select-none">
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <span className="text-xs text-slate-405 font-bold">Loading folder contents...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 border border-slate-200 rounded-xl bg-slate-50/30">
            <FileText className="w-8 h-8 text-slate-305 mx-auto mb-2" />
            <p className="text-sm text-slate-505 font-bold">This folder is empty.</p>
            <p className="text-xs text-slate-405 font-semibold mt-1">Navigate back or upload a PDF above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Folders Section */}
            {folders.length > 0 && (
              <>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 mb-1">
                  Folders ({folders.length})
                </h4>
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/20 hover:border-indigo-500/30 hover:bg-indigo-50/40 transition-all duration-200"
                  >
                    <button
                      onClick={() => navigateToFolder(folder.id!, folder.name)}
                      disabled={ingestingFolderId !== null || ingestingId !== null}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-950 transition-colors">
                          {folder.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {ingestingFolderId === folder.id && folderIngestProgress
                            ? `Ingesting queue (${folderIngestProgress.current}/${folderIngestProgress.total})...`
                            : "Click to browse contents"}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                      {ingestingFolderId === folder.id ? (
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-650">
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          {folderIngestProgress ? `${Math.round((folderIngestProgress.current / folderIngestProgress.total) * 100)}%` : "0%"}
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIngestFolder(folder.id!, folder.name);
                          }}
                          disabled={ingestingFolderId !== null || ingestingId !== null || uploading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a253c] hover:bg-[#253554] disabled:opacity-40 text-xs font-semibold text-white shadow-sm transition"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ingest Folder</span>
                          <span className="sm:hidden">Ingest</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Files Section */}
            {files.length > 0 && (
              <>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3 mb-1">
                  Files ({files.length})
                </h4>
                {files.map((file) => (
                  <div
                    key={file.id || file.name}
                    className="group flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/20 hover:border-slate-300 hover:bg-slate-50/60 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                          file.ingested
                            ? "bg-emerald-50 border-emerald-100 text-emerald-605"
                            : "bg-slate-105 border-slate-200 text-slate-500 group-hover:text-indigo-650"
                        }`}
                      >
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-950 transition-colors"
                          title={file.name}
                        >
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap font-medium">
                          <span className="text-[10px] text-slate-450">
                            {file.size
                              ? `${(parseInt(file.size) / 1024 / 1024).toFixed(2)} MB`
                              : "Local Upload"}
                          </span>
                          <span className="text-slate-300 text-[10px]">•</span>
                          <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            file.isGlobal
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}>
                            {file.isGlobal ? "Global" : "Personal"}
                          </span>
                          <span className="text-slate-300 text-[10px]">•</span>
                          {getStatusBadge(file.status)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                      {file.url && (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                          title="View document (Cloudinary)"
                        >
                          <Link2 className="w-4 h-4" />
                        </a>
                      )}
                      {file.ingested && (
                        <span className="text-[10px] text-emerald-600 font-bold mr-1">✓ Ready</span>
                      )}
                      {file.id && (
                        <button
                          onClick={() => handleIngest(file.id!)}
                          disabled={ingestingId !== null || uploading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a253c] hover:bg-[#253554] disabled:opacity-40 text-xs font-semibold text-white shadow-sm transition"
                        >
                          {ingestingId === file.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">
                            {file.status === "COMPLETED"
                              ? "Re-ingest"
                              : file.status === "PROCESSING" && ingestingId !== file.id
                              ? "Retry"
                              : "Ingest"}
                          </span>
                          <span className="sm:hidden">
                            {file.status === "COMPLETED"
                              ? "Redo"
                              : file.status === "PROCESSING" && ingestingId !== file.id
                              ? "Retry"
                              : "Ingest"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
