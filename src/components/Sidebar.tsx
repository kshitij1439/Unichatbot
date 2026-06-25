"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare, Plus, Trash2, Database, MessageCircle, Loader2, X, LogOut, Globe } from "lucide-react";

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface SidebarProps {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
  activeSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  activeTab: "chat" | "docs" | "sppu";
  onChangeTab: (tab: "chat" | "docs" | "sppu") => void;
  refreshTrigger?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  user,
  activeSessionId,
  onSelectSession,
  activeTab,
  onChangeTab,
  refreshTrigger = 0,
  isOpen = false,
  onClose,
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
          onSelectSession(null);
          onChangeTab("chat");
        }
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  const getInitials = (email: string) => {
    if (!email) return "?";
    return email.split("@")[0].substring(0, 2).toUpperCase();
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-80 shrink-0 border-r border-slate-200 bg-white flex flex-col h-full text-slate-750 select-none transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
      isOpen ? "translate-x-0" : "-translate-x-full"
    }`}>
      {/* Header / Brand */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center font-bold text-[#1a253c] shadow-sm shrink-0">
            U
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">UniBot</h1>
            <span className="text-[10px] text-slate-500 font-semibold">SPPU Study Assistant</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition"
            title="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Primary Action Buttons */}
      <div className="p-3 flex flex-col gap-2">
        <button
          onClick={() => {
            onChangeTab("chat");
            onSelectSession(null);
          }}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all active:scale-[0.98] ${
            activeTab === "chat" && !activeSessionId
              ? "bg-[#1a253c] hover:bg-[#253554] text-white"
              : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900"
          }`}
        >
          <Plus className="w-4 h-4" /> New Study Chat
        </button>

        <button
          onClick={() => onChangeTab("docs")}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
            activeTab === "docs"
              ? "border-indigo-150 bg-indigo-50/70 text-indigo-700"
              : "border-slate-200 bg-white hover:border-slate-300 text-slate-600 hover:text-slate-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <Database className="w-4 h-4" /> Knowledge Base
          </span>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-mono font-semibold">
            PDFs
          </span>
        </button>

        <button
          onClick={() => onChangeTab("sppu")}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
            activeTab === "sppu"
              ? "border-indigo-150 bg-indigo-50/70 text-indigo-700"
              : "border-slate-200 bg-white hover:border-slate-300 text-slate-600 hover:text-slate-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4" /> SPPU Hub
          </span>
          <span className="text-[10px] bg-indigo-105 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-md font-mono font-bold animate-pulse">
            Circulars
          </span>
        </button>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1 min-h-0">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
          Chat History
        </h2>

        {loading && sessions.length === 0 ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 flex flex-col items-center gap-1.5">
            <MessageCircle className="w-6 h-6 text-slate-300" />
            <span>No previous study chats.</span>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = activeTab === "chat" && activeSessionId === session.id;
            return (
              <div
                key={session.id}
                onClick={() => {
                  onChangeTab("chat");
                  onSelectSession(session.id);
                }}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-slate-100 text-slate-900 border border-slate-200/60 font-semibold"
                    : "hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-indigo-650" : "text-slate-400 group-hover:text-slate-550"}`} />
                  <span className="text-sm truncate pr-1" title={session.title}>
                    {session.title}
                  </span>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  disabled={deletingId === session.id}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-200 transition"
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

      {/* Authenticated Profile Card Footer */}
      {user && (
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
              {getInitials(user.email)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate leading-snug" title={user.email}>
                {user.email}
              </p>
              <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 select-none ${
                user.role === "MODERATOR" 
                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  : "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
              }`}>
                {user.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl border border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition shrink-0"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
