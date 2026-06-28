"use client";

import React from "react";
import { MessageCircle, Database, Globe, TrendingUp, User, Shield, LogOut } from "lucide-react";
import { UserSession } from "../app/page";

interface DashboardProps {
  user: UserSession;
  onChangeTab: (tab: "dashboard" | "chat" | "docs" | "sppu" | "analyzer") => void;
  onToggleSidebar?: () => void;
}

export default function Dashboard({ user, onChangeTab }: DashboardProps) {
  const getUsername = (email: string) => {
    return email.split("@")[0];
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

  const tools = [
    {
      id: "chat",
      title: "AI Study Chatbot",
      desc: "Chat with the bot about course material, ask questions on syllabus topics, or search circulars.",
      btnText: "Open Chat",
      icon: <MessageCircle className="w-5 h-5 text-zinc-900" />,
      badge: "Study Tool",
    },
    {
      id: "docs",
      title: "Student Knowledge Base",
      desc: "Upload and manage notes, syllabus files, and past papers for your courses.",
      btnText: "Manage Files",
      icon: <Database className="w-5 h-5 text-zinc-900" />,
      badge: "File Ingest",
    },
    {
      id: "sppu",
      title: "SPPU Hub",
      desc: "Browse official SPPU circulars, exam schedules, and direct university portal links.",
      btnText: "Open SPPU Hub",
      icon: <Globe className="w-5 h-5 text-zinc-900" />,
      badge: "Official Portal",
    },
    {
      id: "analyzer",
      title: "Paper Pattern Analyzer",
      desc: "Select past papers to view topic counts, unit marks weightage, and generated revision questions.",
      btnText: "Analyze Papers",
      icon: <TrendingUp className="w-5 h-5 text-zinc-900" />,
      badge: "Syllabus Analysis",
    },
  ];

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto w-full select-none bg-zinc-50 font-sans">
      {/* Top Banner */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 mb-6">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
          Student Portal
        </span>
        <h2 className="text-xl font-bold text-zinc-900 mt-1">
          Welcome back, {getUsername(user.email)}
        </h2>
        <p className="text-xs text-zinc-650 mt-1 leading-relaxed max-w-2xl">
          Access your syllabus databases, study chatbot assistants, and exam analytics reports from one central dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Services Grid */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
            <h3 className="text-sm font-bold text-zinc-800">Explore Portal Tools</h3>
            <span className="text-[10px] text-zinc-400 font-semibold">4 active modules</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="bg-white border border-zinc-200 rounded-md p-5 hover:border-zinc-900 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="p-2 bg-zinc-50 border border-zinc-200 rounded">
                      {tool.icon}
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-600 uppercase tracking-wide">
                      {tool.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 mb-1">
                    {tool.title}
                  </h4>
                  <p className="text-[11px] text-zinc-550 leading-relaxed mb-4">
                    {tool.desc}
                  </p>
                </div>
                <button
                  onClick={() => onChangeTab(tool.id as any)}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-md transition-colors cursor-pointer text-center"
                >
                  {tool.btnText}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: User Profile Panel */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center border-b border-zinc-200 pb-2">
            <h3 className="text-sm font-bold text-zinc-800">Student Profile</h3>
          </div>

          <div className="bg-white border border-zinc-200 rounded-md p-5 flex flex-col items-center text-center">
            {/* Avatar Circle */}
            <div className="w-14 h-14 rounded-md border border-zinc-200 bg-zinc-50 flex items-center justify-center font-bold text-zinc-700 text-lg mb-3">
              {getUsername(user.email).substring(0, 2).toUpperCase()}
            </div>

            <h4 className="text-sm font-bold text-zinc-900 truncate max-w-full font-mono">
              {getUsername(user.email)}
            </h4>
            <p className="text-[10px] text-zinc-400 font-bold mb-3">{user.email}</p>

            <div className="w-full space-y-2 text-xs border-t border-zinc-150 pt-3 mt-1">
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Access Scope</span>
                <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                  {user.role === "MODERATOR" ? (
                    <Shield className="w-3.5 h-3.5 text-zinc-800" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-zinc-800" />
                  )}
                  {user.role}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-zinc-500">System Status</span>
                <span className="text-zinc-800 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 inline-block mr-1" />
                  Connected
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full mt-4 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-755 font-bold text-xs rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          </div>

          {/* Quick Notice Widget */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-md p-4 text-xs">
            <h4 className="font-bold text-zinc-900 flex items-center gap-1.5">
              Academic Tip
            </h4>
            <p className="text-zinc-600 mt-1 leading-relaxed">
              Upload your latest unit syllabus guide into the **Student Knowledge Base** first. This guarantees your **AI Study Chatbot** answers matches your exact curriculum outline!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
