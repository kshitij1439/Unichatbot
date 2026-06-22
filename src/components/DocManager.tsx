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
}

interface BreadcrumbItem {
  id: string | null; // null = root
  name: string;
}

interface DocManagerProps {
  onDocumentIngested?: () => void;
}

export default function DocManager({ onDocumentIngested }: DocManagerProps) {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingestingId, setIngestingId] = useState<string | null>(null);
  const [ingestingFolderId, setIngestingFolderId] = useState<string | null>(null);
  const [folderIngestProgress, setFolderIngestProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, path: pathVal }),
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Ingested
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Indexing
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Failed
          </span>
        );
      case "NOT_INGESTED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
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
    <div className="flex flex-col gap-5 h-full text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" /> Paper Database
          </h2>
          <p className="text-xs text-zinc-400">
            Browse Google Drive folders, ingest exam papers, or upload PDFs locally.
          </p>
        </div>
        <button
          onClick={() => fetchItems(currentFolderId)}
          disabled={loading}
          className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white transition disabled:opacity-50"
          title="Refresh current folder"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-3 flex gap-2.5 items-start text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Error:</span> {error}
          </div>
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
            ? "border-indigo-500 bg-indigo-500/5"
            : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/30"
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
            <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
            <p className="text-sm font-medium text-zinc-300">Processing and indexing uploaded PDF...</p>
            <p className="text-xs text-zinc-500">Extracting text &amp; computing embeddings</p>
          </>
        ) : (
          <>
            <UploadCloud className="w-7 h-7 text-zinc-500" />
            <p className="text-sm font-medium text-zinc-300">
              Drag &amp; drop a PDF here, or <span className="text-indigo-400">browse</span>
            </p>
            <p className="text-xs text-zinc-500">PDF documents only (up to 10MB)</p>
          </>
        )}
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {breadcrumbs.length > 1 && (
          <button
            onClick={goBack}
            className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition mr-1"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
            <button
              onClick={() => navigateToBreadcrumb(idx)}
              className={`text-xs px-2 py-1 rounded-md transition truncate max-w-[140px] ${
                idx === breadcrumbs.length - 1
                  ? "text-white bg-zinc-800 font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
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
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            <span className="text-xs text-zinc-500">Loading folder contents...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 border border-zinc-900 rounded-xl bg-zinc-950/20">
            <FileText className="w-8 h-8 text-zinc-650 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">This folder is empty.</p>
            <p className="text-xs text-zinc-500 mt-1">Navigate back or upload a PDF above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Folders Section */}
            {folders.length > 0 && (
              <>
                <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mt-1 mb-1">
                  Folders ({folders.length})
                </h4>
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group flex items-center justify-between p-3 rounded-xl border border-zinc-900 bg-zinc-900/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-200"
                  >
                    <button
                      onClick={() => navigateToFolder(folder.id!, folder.name)}
                      disabled={ingestingFolderId !== null || ingestingId !== null}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                          {folder.name}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {ingestingFolderId === folder.id && folderIngestProgress
                            ? `Ingesting queue (${folderIngestProgress.current}/${folderIngestProgress.total})...`
                            : "Click to browse contents"}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                      {ingestingFolderId === folder.id ? (
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 text-xs font-semibold text-white shadow-lg shadow-indigo-950/20 transition"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          Ingest Folder
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
                <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mt-3 mb-1">
                  Files ({files.length})
                </h4>
                {files.map((file) => (
                  <div
                    key={file.id || file.name}
                    className="group flex items-center justify-between p-3 rounded-xl border border-zinc-900 bg-zinc-900/10 hover:border-zinc-800 hover:bg-zinc-900/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                          file.ingested
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-zinc-850 border-zinc-800 text-zinc-400 group-hover:text-indigo-400"
                        }`}
                      >
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors"
                          title={file.name}
                        >
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-zinc-500">
                            {file.size
                              ? `${(parseInt(file.size) / 1024 / 1024).toFixed(2)} MB`
                              : "Local Upload"}
                          </span>
                          <span className="text-zinc-700 text-[10px]">•</span>
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
                          className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                          title="View document (Cloudinary)"
                        >
                          <Link2 className="w-4 h-4" />
                        </a>
                      )}
                      {file.ingested && (
                        <span className="text-[10px] text-emerald-400/60 font-mono">✓ Ready</span>
                      )}
                      {file.id && (
                        <button
                          onClick={() => handleIngest(file.id!)}
                          disabled={ingestingId !== null || uploading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 text-xs font-semibold text-white shadow-lg shadow-indigo-950/20 transition"
                        >
                          {ingestingId === file.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          {file.status === "COMPLETED"
                            ? "Re-ingest"
                            : file.status === "PROCESSING" && ingestingId !== file.id
                            ? "Retry"
                            : "Ingest"}
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
