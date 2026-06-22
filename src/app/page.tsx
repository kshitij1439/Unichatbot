"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import DocManager from "@/components/DocManager";

export default function Home() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showDocManager, setShowDocManager] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleDocumentIngested = () => {
    // Increment refresh trigger to reload sidebar/session lists if needed
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSessionStarted = (id: string) => {
    setActiveSessionId(id);
  };

  const handleSelectSession = (id: string | null) => {
    setActiveSessionId(id);
    setIsSidebarOpen(false); // Close sidebar on mobile session switch
  };

  const handleToggleDocManager = (show: boolean) => {
    setShowDocManager(show);
    setIsSidebarOpen(false); // Close sidebar on mobile tab switch
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans antialiased text-zinc-200 relative">
      {/* Sidebar Navigation */}
      <Sidebar
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        showDocManager={showDocManager}
        onToggleDocManager={handleToggleDocManager}
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
        {showDocManager ? (
          <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-4xl mx-auto w-full">
            <DocManager 
              onDocumentIngested={handleDocumentIngested} 
              onToggleSidebar={() => setIsSidebarOpen(true)}
            />
          </div>
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
