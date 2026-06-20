"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

interface DriveFile {
  id: string | null;
  name: string;
  mimeType: string;
  size: string | null;
  createdTime: string;
  ingested: boolean;
  status: "COMPLETED" | "PROCESSING" | "PENDING" | "FAILED" | "NOT_INGESTED";
  dbId: string | null;
  url: string | null;
}

interface DocManagerProps {
  onDocumentIngested?: () => void;
}

export default function DocManager({ onDocumentIngested }: DocManagerProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingestingId, setIngestingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ingest");
      const data = await res.json();
      if (res.ok) {
        setFiles(data.files || []);
      } else {
        setError(data.error || "Failed to load files.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch documents. Make sure Google Drive is configured.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleIngest = async (fileId: string) => {
    setIngestingId(fileId);
    setError(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ingestion failed.");
      } else {
        // Refresh list
        await fetchFiles();
        if (onDocumentIngested) onDocumentIngested();
      }
    } catch (err) {
      console.error(err);
      setError("Network error occurred during ingestion.");
    } finally {
      setIngestingId(null);
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
        await fetchFiles();
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

  const getStatusBadge = (status: DriveFile["status"]) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Ready
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
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Unprocessed
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full text-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" /> Paper Database
          </h2>
          <p className="text-xs text-zinc-400">
            Ingest exam papers from Google Drive or upload PDFs locally to feed the vector search.
          </p>
        </div>
        <button
          onClick={fetchFiles}
          disabled={loading}
          className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white transition disabled:opacity-50"
          title="Refresh document list"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-3 flex gap-2.5 items-start text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Configuration Error:</span> {error}
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
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
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
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-sm font-medium text-zinc-300">Processing and indexing uploaded PDF...</p>
            <p className="text-xs text-zinc-500">Extracting text & computing embeddings</p>
          </>
        ) : (
          <>
            <UploadCloud className="w-8 h-8 text-zinc-500 group-hover:text-zinc-400" />
            <p className="text-sm font-medium text-zinc-300">
              Drag & drop a university exam PDF here, or <span className="text-indigo-400">browse</span>
            </p>
            <p className="text-xs text-zinc-500">PDF documents only (up to 10MB)</p>
          </>
        )}
      </div>

      {/* GDrive / Documents List */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 select-none">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          University Resource List
        </h3>
        
        {loading && files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            <span className="text-xs text-zinc-500">Loading resources...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-10 border border-zinc-900 rounded-xl bg-zinc-950/20">
            <FileText className="w-8 h-8 text-zinc-650 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">No exam papers found.</p>
            <p className="text-xs text-zinc-500 mt-1">Add files to your Google Drive folder or upload above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {files.map((file) => (
              <div
                key={file.id || file.name}
                className="group flex items-center justify-between p-3 rounded-xl border border-zinc-900 bg-zinc-900/10 hover:border-zinc-800 hover:bg-zinc-900/20 transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-zinc-850 flex items-center justify-center shrink-0 border border-zinc-800 text-zinc-400 group-hover:text-indigo-400 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-500">
                        {file.size ? `${(parseInt(file.size) / 1024 / 1024).toFixed(2)} MB` : "Local"}
                      </span>
                      <span className="text-zinc-700 text-[10px]">•</span>
                      {getStatusBadge(file.status)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-3">
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
                  {file.id && (file.status === "NOT_INGESTED" || file.status === "FAILED") && (
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
                      Ingest
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
