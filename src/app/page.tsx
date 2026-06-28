"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import DocManager from "@/components/DocManager";
import SppuHub from "@/components/SppuHub";
import PatternAnalyzer from "@/components/PatternAnalyzer";
import Dashboard from "@/components/Dashboard";
import { Loader2 } from "lucide-react";

export interface UserSession {
  userId: string;
  email: string;
  role: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "docs" | "sppu" | "analyzer">("dashboard");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Parse URL search parameters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const sessionParam = params.get("session");

      if (tabParam && ["dashboard", "chat", "docs", "sppu", "analyzer"].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
      if (sessionParam) {
        setActiveSessionId(sessionParam);
      }
    }
  }, []);

  // Authenticate user on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          router.replace("/login");
        }
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, [router]);

  const updateUrl = (tab: string, sessionId: string | null) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      if (sessionId && tab === "chat") {
        url.searchParams.set("session", sessionId);
      } else {
        url.searchParams.delete("session");
      }
      window.history.pushState(null, "", url.pathname + url.search);
    }
  };

  const handleDocumentIngested = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSessionStarted = (id: string) => {
    setActiveSessionId(id);
    setActiveTab("chat");
    updateUrl("chat", id);
  };

  const handleSelectSession = (id: string | null) => {
    setActiveSessionId(id);
    setActiveTab("chat");
    setIsSidebarOpen(false); // Close sidebar on mobile session switch
    updateUrl("chat", id);
  };

  const handleChangeTab = (tab: "dashboard" | "chat" | "docs" | "sppu" | "analyzer") => {
    setActiveTab(tab);
    setIsSidebarOpen(false); // Close sidebar on mobile tab switch
    updateUrl(tab, activeSessionId);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 font-sans">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-bold animate-pulse">Initializing secure session...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white font-sans antialiased text-slate-800 relative">
      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        activeTab={activeTab}
        onChangeTab={handleChangeTab}
        refreshTrigger={refreshTrigger}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Backdrop overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Main Panel */}
      <main className="flex-1 h-full flex flex-col min-w-0 bg-slate-50">
        {activeTab === "dashboard" ? (
          <Dashboard
            user={user}
            onChangeTab={handleChangeTab}
            onToggleSidebar={() => setIsSidebarOpen(true)}
          />
        ) : activeTab === "docs" ? (
          <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-4xl mx-auto w-full">
            <DocManager 
              user={user}
              onDocumentIngested={handleDocumentIngested} 
              onToggleSidebar={() => setIsSidebarOpen(true)}
            />
          </div>
        ) : activeTab === "sppu" ? (
          <SppuHub onToggleSidebar={() => setIsSidebarOpen(true)} />
        ) : activeTab === "analyzer" ? (
          <PatternAnalyzer onToggleSidebar={() => setIsSidebarOpen(true)} />
        ) : (
          <ChatWindow
            sessionId={activeSessionId}
            onSessionStarted={handleSessionStarted}
            onToggleSidebar={() => setIsSidebarOpen(true)}
          />
        )}
      </main>
    </div>
  );
}
