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
    setBreadcrumbs((prev) => {
      const lastCrumb = prev[prev.length - 1];
      if (lastCrumb && lastCrumb.id === folderId) {
        return prev;
      }
      return [...prev, { id: folderId, name: folderName }];
    });
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
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-250">
            <CheckCircle className="w-3.5 h-3.5 mr-1 text-zinc-900" /> Ingested
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-zinc-50 text-zinc-900 border border-zinc-200 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-zinc-900" /> Indexing
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-zinc-50 text-zinc-600 border border-zinc-200">
            <AlertCircle className="w-3.5 h-3.5 mr-1 text-zinc-900" /> Failed
          </span>
        );
      case "NOT_INGESTED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-zinc-50 text-zinc-500 border border-zinc-200">
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
    <div className="flex flex-col gap-5 h-full text-zinc-850">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-2 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-md border border-zinc-200 hover:bg-zinc-55 text-zinc-500 hover:text-zinc-900 transition mr-1 shrink-0"
              title="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2 truncate font-mono">
              <Database className="w-5 h-5 text-zinc-900 shrink-0" /> Paper Database
            </h2>
            <p className="text-xs text-zinc-500 font-medium truncate">
              Browse Google Drive folders, ingest exam papers, or upload PDFs locally.
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchItems(currentFolderId)}
          disabled={loading}
          className="p-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 transition disabled:opacity-50 shrink-0"
          title="Refresh current folder"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-md p-3 flex gap-2.5 items-start text-xs text-zinc-950 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Error:</span> {error}
          </div>
        </div>
      )}

      {user.role === "MODERATOR" && (
        <div className="flex items-center gap-2.5 p-3.5 bg-zinc-50 border border-zinc-200 rounded-md">
          <input
            id="global-upload-toggle"
            type="checkbox"
            checked={isGlobalUpload}
            onChange={(e) => setIsGlobalUpload(e.target.checked)}
            className="w-4.5 h-4.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 bg-white cursor-pointer"
          />
          <label htmlFor="global-upload-toggle" className="text-xs text-zinc-700 font-bold cursor-pointer select-none">
            Upload / Ingest as a <span className="text-zinc-950 font-mono font-extrabold underline decoration-zinc-400">Global Knowledge Source</span> (available to all students)
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
        className={`border-2 border-dashed rounded-md p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
          dragActive
            ? "border-zinc-900 bg-zinc-50"
            : "border-zinc-300 hover:border-zinc-400 bg-zinc-50/40"
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
            <Loader2 className="w-7 h-7 text-zinc-900 animate-spin" />
            <p className="text-sm font-semibold text-zinc-800">Processing and indexing uploaded PDF...</p>
            <p className="text-xs text-zinc-400 font-mono">Extracting text &amp; computing embeddings</p>
          </>
        ) : (
          <>
            <UploadCloud className="w-7 h-7 text-zinc-900 animate-bounce" />
            <p className="text-sm font-bold text-zinc-700">
              Drag &amp; drop a PDF here, or <span className="text-zinc-900 underline font-mono">browse</span>
            </p>
            <p className="text-xs text-zinc-450 font-semibold font-mono">PDF documents only (up to 10MB)</p>
          </>
        )}
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {breadcrumbs.length > 1 && (
          <button
            onClick={goBack}
            className="p-1 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition mr-1"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-305 shrink-0" />}
            <button
              onClick={() => navigateToBreadcrumb(idx)}
              className={`text-xs px-2 py-1 rounded-md transition truncate max-w-[140px] ${
                idx === breadcrumbs.length - 1
                  ? "text-zinc-900 bg-zinc-100 font-bold"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
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
            <Loader2 className="w-6 h-6 text-zinc-900 animate-spin" />
            <span className="text-xs text-zinc-500 font-bold font-mono">Loading folder contents...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 border border-zinc-200 rounded-md bg-zinc-50/30">
            <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-600 font-bold font-mono">This folder is empty.</p>
            <p className="text-xs text-zinc-450 font-semibold mt-1">Navigate back or upload a PDF above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Folders Section */}
            {folders.length > 0 && (
              <>
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-1 mb-1 font-mono">
                  Folders ({folders.length})
                </h4>
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group flex items-center justify-between p-3 rounded-md border border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50 transition-all duration-150"
                  >
                    <button
                      onClick={() => navigateToFolder(folder.id!, folder.name)}
                      disabled={ingestingFolderId !== null || ingestingId !== null || loading}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div className="w-9 h-9 rounded bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-200 text-zinc-900 group-hover:bg-zinc-100 transition-colors">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-zinc-800 truncate group-hover:text-zinc-950 transition-colors font-mono">
                          {folder.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium">
                          {ingestingFolderId === folder.id && folderIngestProgress
                            ? `Ingesting queue (${folderIngestProgress.current}/${folderIngestProgress.total})...`
                            : "Click to browse contents"}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                      {ingestingFolderId === folder.id ? (
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded bg-zinc-105 border border-zinc-200 text-xs font-semibold text-zinc-900 font-mono">
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-xs font-semibold text-white transition border border-zinc-900"
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
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-3 mb-1 font-mono">
                  Files ({files.length})
                </h4>
                {files.map((file) => (
                  <div
                    key={file.id || file.name}
                    className="group flex items-center justify-between p-3 rounded-md border border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50/55 transition-all duration-150"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded flex items-center justify-center shrink-0 border transition-colors ${
                          file.ingested
                            ? "bg-zinc-105 border-zinc-250 text-zinc-900"
                            : "bg-zinc-50 border-zinc-200 text-zinc-500 group-hover:text-zinc-900"
                        }`}
                      >
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-semibold text-zinc-800 truncate group-hover:text-zinc-950 transition-colors font-mono"
                          title={file.name}
                        >
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap font-medium font-mono text-[10px]">
                          <span className="text-zinc-450">
                            {file.size
                              ? `${(parseInt(file.size) / 1024 / 1024).toFixed(2)} MB`
                              : "Local Upload"}
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            file.isGlobal
                              ? "bg-zinc-900 text-white border border-zinc-950"
                              : "bg-zinc-100 text-zinc-800 border border-zinc-200"
                          }`}>
                            {file.isGlobal ? "Global" : "Personal"}
                          </span>
                          <span className="text-zinc-300">•</span>
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
                          className="p-1.5 rounded border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition"
                          title="View document (Cloudinary)"
                        >
                          <Link2 className="w-4 h-4" />
                        </a>
                      )}
                      {file.ingested && (
                        <span className="text-[10px] text-zinc-600 font-bold mr-1 font-mono">✓ Ready</span>
                      )}
                      {file.id && (
                        <button
                          onClick={() => handleIngest(file.id!)}
                          disabled={ingestingId !== null || uploading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-xs font-semibold text-white transition border border-zinc-900"
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
