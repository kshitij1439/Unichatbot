"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare, Plus, Trash2, Database, MessageCircle, Loader2, X, LogOut, Globe, TrendingUp, LayoutDashboard } from "lucide-react";

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
  activeTab: "dashboard" | "chat" | "docs" | "sppu" | "analyzer";
  onChangeTab: (tab: "dashboard" | "chat" | "docs" | "sppu" | "analyzer") => void;
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
    <aside className={`fixed inset-y-0 left-0 z-40 w-80 shrink-0 border-r border-zinc-250 bg-white flex flex-col h-full text-zinc-800 select-none transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
      isOpen ? "translate-x-0" : "-translate-x-full"
    }`}>
      {/* Header / Brand */}
      <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-zinc-900 flex items-center justify-center font-bold text-white shrink-0">
            U
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 tracking-tight leading-none">UniBot</h1>
            <span className="text-[10px] text-zinc-500 font-medium">SPPU Study Assistant</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 transition"
            title="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Primary Action Buttons */}
      <div className="p-3 flex flex-col gap-2">
        <button
          onClick={() => onChangeTab("dashboard")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-xs font-medium transition-all ${
            activeTab === "dashboard"
              ? "border-zinc-300 bg-zinc-100 text-zinc-900 font-bold"
              : "border-transparent bg-transparent hover:bg-zinc-100 text-zinc-650 hover:text-zinc-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </span>
        </button>

        <button
          onClick={() => {
            onChangeTab("chat");
            onSelectSession(null);
          }}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md font-semibold text-xs transition-all ${
            activeTab === "chat" && !activeSessionId
              ? "bg-zinc-900 hover:bg-zinc-800 text-white"
              : "border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900"
          }`}
        >
          <Plus className="w-3.5 h-3.5" /> New Study Chat
        </button>

        <button
          onClick={() => onChangeTab("docs")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-xs font-medium transition-all ${
            activeTab === "docs"
              ? "border-zinc-300 bg-zinc-100 text-zinc-900 font-bold"
              : "border-transparent bg-transparent hover:bg-zinc-100 text-zinc-650 hover:text-zinc-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5" /> Knowledge Base
          </span>
          <span className="text-[10px] bg-zinc-100 text-zinc-600 border border-zinc-200 px-1.5 py-0.5 rounded font-mono font-medium">
            PDFs
          </span>
        </button>

        <button
          onClick={() => onChangeTab("sppu")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-xs font-medium transition-all ${
            activeTab === "sppu"
              ? "border-zinc-300 bg-zinc-100 text-zinc-900 font-bold"
              : "border-transparent bg-transparent hover:bg-zinc-100 text-zinc-650 hover:text-zinc-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" /> SPPU Hub
          </span>
          <span className="text-[10px] bg-zinc-100 text-zinc-600 border border-zinc-200 px-1.5 py-0.5 rounded font-mono font-medium">
            Circulars
          </span>
        </button>

        <button
          onClick={() => onChangeTab("analyzer")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-xs font-medium transition-all ${
            activeTab === "analyzer"
              ? "border-zinc-300 bg-zinc-100 text-zinc-900 font-bold"
              : "border-transparent bg-transparent hover:bg-zinc-100 text-zinc-650 hover:text-zinc-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Pattern Analyzer
          </span>
          <span className="text-[10px] bg-zinc-100 text-zinc-600 border border-zinc-200 px-1.5 py-0.5 rounded font-mono font-medium">
            New
          </span>
        </button>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1 min-h-0">
        <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-2">
          Chat History
        </h2>

        {loading && sessions.length === 0 ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-400 flex flex-col items-center gap-1.5">
            <MessageCircle className="w-5 h-5 text-zinc-300" />
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
                className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900 border border-zinc-200 font-semibold"
                    : "hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? "text-zinc-900" : "text-zinc-450 group-hover:text-zinc-600"}`} />
                  <span className="text-xs truncate pr-1" title={session.title}>
                    {session.title}
                  </span>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  disabled={deletingId === session.id}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-450 hover:text-zinc-900 hover:bg-zinc-200 transition"
                  title="Delete chat session"
                >
                  {deletingId === session.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Authenticated Profile Card Footer */}
      {user && (
        <div className="p-3.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-zinc-200 border border-zinc-300 flex items-center justify-center font-bold text-xs text-zinc-700 shrink-0 font-mono">
              {getInitials(user.email)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-800 truncate leading-snug" title={user.email}>
                {user.email}
              </p>
              <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border border-zinc-300 bg-zinc-100 text-zinc-800 select-none">
                {user.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 text-zinc-555 hover:text-zinc-900 transition shrink-0"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
}
