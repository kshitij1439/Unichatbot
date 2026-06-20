"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare, Plus, Trash2, Database, MessageCircle, Loader2 } from "lucide-react";

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface SidebarProps {
  activeSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  showDocManager: boolean;
  onToggleDocManager: (show: boolean) => void;
  refreshTrigger?: number;
}

export default function Sidebar({
  activeSessionId,
  onSelectSession,
  showDocManager,
  onToggleDocManager,
  refreshTrigger = 0,
}: SidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [activeSessionId, refreshTrigger]);

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat session?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/chat?sessionId=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (activeSessionId === id) {
          onSelectSession(null); // Deselect if deleting current
        }
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside className="w-80 shrink-0 border-r border-zinc-900 bg-zinc-950/80 backdrop-blur-xl flex flex-col h-full text-zinc-300 select-none">
      {/* Header / Brand */}
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-650 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-900/30">
            U
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">UniBot</h1>
            <span className="text-[10px] text-zinc-500 font-medium">SPPU Study Assistant</span>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="p-3 flex flex-col gap-2">
        <button
          onClick={() => {
            onToggleDocManager(false);
            onSelectSession(null);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white font-semibold text-sm shadow-lg shadow-indigo-950/30 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> New Study Chat
        </button>

        <button
          onClick={() => onToggleDocManager(!showDocManager)}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
            showDocManager
              ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
              : "border-zinc-900 bg-zinc-900/30 hover:border-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <Database className="w-4 h-4" /> Knowledge Base
          </span>
          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md font-mono">
            PDFs
          </span>
        </button>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1 min-h-0">
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-2">
          Chat History
        </h2>

        {loading && sessions.length === 0 ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-650 flex flex-col items-center gap-1.5">
            <MessageCircle className="w-6 h-6 text-zinc-700" />
            <span>No previous study chats.</span>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = !showDocManager && activeSessionId === session.id;
            return (
              <div
                key={session.id}
                onClick={() => {
                  onToggleDocManager(false);
                  onSelectSession(session.id);
                }}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-zinc-900 text-white border border-zinc-850 font-medium"
                    : "hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-500"}`} />
                  <span className="text-sm truncate pr-1" title={session.title}>
                    {session.title}
                  </span>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  disabled={deletingId === session.id}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-600 hover:text-rose-400 hover:bg-zinc-850 transition"
                  title="Delete chat session"
                >
                  {deletingId === session.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-900 text-[10px] text-zinc-600 text-center font-mono">
        v1.0.0 • Connected to Qdrant & Gemini
      </div>
    </aside>
  );
}
