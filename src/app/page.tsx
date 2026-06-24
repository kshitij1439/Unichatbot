"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import DocManager from "@/components/DocManager";
import SppuHub from "@/components/SppuHub";
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
  const [activeTab, setActiveTab] = useState<"chat" | "docs" | "sppu">("chat");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const handleDocumentIngested = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSessionStarted = (id: string) => {
    setActiveSessionId(id);
    setActiveTab("chat");
  };

  const handleSelectSession = (id: string | null) => {
    setActiveSessionId(id);
    setActiveTab("chat");
    setIsSidebarOpen(false); // Close sidebar on mobile session switch
  };

  const handleChangeTab = (tab: "chat" | "docs" | "sppu") => {
    setActiveTab(tab);
    setIsSidebarOpen(false); // Close sidebar on mobile tab switch
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-screen bg-[#090b11] flex flex-col items-center justify-center text-slate-100 font-sans">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-medium animate-pulse">Initializing secure session...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans antialiased text-zinc-200 relative">
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
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Main Panel */}
      <main className="flex-1 h-full flex flex-col min-w-0 bg-gradient-to-b from-zinc-900 to-zinc-950">
        {activeTab === "docs" ? (
          <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-4xl mx-auto w-full">
            <DocManager 
              user={user}
              onDocumentIngested={handleDocumentIngested} 
              onToggleSidebar={() => setIsSidebarOpen(true)}
            />
          </div>
        ) : activeTab === "sppu" ? (
          <SppuHub onToggleSidebar={() => setIsSidebarOpen(true)} />
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
