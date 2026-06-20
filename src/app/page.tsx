"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import DocManager from "@/components/DocManager";

export default function Home() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showDocManager, setShowDocManager] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDocumentIngested = () => {
    // Increment refresh trigger to reload sidebar/session lists if needed
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSessionStarted = (id: string) => {
    setActiveSessionId(id);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans antialiased text-zinc-200">
      {/* Sidebar Navigation */}
      <Sidebar
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        showDocManager={showDocManager}
        onToggleDocManager={setShowDocManager}
        refreshTrigger={refreshTrigger}
      />

      {/* Main Panel */}
      <main className="flex-1 h-full flex flex-col min-w-0 bg-gradient-to-b from-zinc-900 to-zinc-950">
        {showDocManager ? (
          <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full">
            <DocManager onDocumentIngested={handleDocumentIngested} />
          </div>
        ) : (
          <ChatWindow
            sessionId={activeSessionId}
            onSessionStarted={handleSessionStarted}
          />
        )}
      </main>
    </div>
  );
}
