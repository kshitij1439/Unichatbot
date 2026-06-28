"use client";

import React from "react";
import { MessageCircle, Database, Globe, TrendingUp, User, Award, Shield, FileText } from "lucide-react";
import { UserSession } from "../app/page";

interface DashboardProps {
  user: UserSession;
  onChangeTab: (tab: "dashboard" | "chat" | "docs" | "sppu" | "analyzer") => void;
  onToggleSidebar?: () => void;
}

export default function Dashboard({ user, onChangeTab, onToggleSidebar }: DashboardProps) {
  const getUsername = (email: string) => {
    return email.split("@")[0];
  };

  const getRoleIcon = (role: string) => {
    if (role === "MODERATOR") return <Shield className="w-4 h-4 text-rose-500" />;
    return <User className="w-4 h-4 text-indigo-500" />;
  };

  const tools = [
    {
      id: "chat",
      title: "AI Study Chatbot",
      desc: "Discuss coursework, get summaries, clarify doubts, and ask questions trained on your syllabus and PDFs.",
      btnText: "Start Chatting",
      icon: <MessageCircle className="w-6 h-6 text-indigo-600" />,
      badge: "Assistant",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
    },
    {
      id: "docs",
      title: "Student Knowledge Base",
      desc: "Upload notes, syllabus guidelines, and past exam PDFs to train the AI assistant on your specific subject.",
      btnText: "Manage Files",
      icon: <Database className="w-6 h-6 text-emerald-600" />,
      badge: "Knowledge Base",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      id: "sppu",
      title: "SPPU Hub",
      desc: "Stay updated with official Pune University circulars, direct portal links, archives, and academic alerts.",
      btnText: "Open SPPU Hub",
      icon: <Globe className="w-6 h-6 text-amber-600" />,
      badge: "Circulars",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      id: "analyzer",
      title: "Paper Pattern Analyzer",
      desc: "Scan multiple past papers to extract topic frequency distributions, expected exam questions, and unit weightage maps.",
      btnText: "Analyze Patterns",
      icon: <TrendingUp className="w-6 h-6 text-violet-600" />,
      badge: "Analytics",
      badgeColor: "bg-violet-50 text-violet-700 border-violet-100",
    },
  ];

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full select-none animate-fadeIn">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-[#1a253c] to-[#2b3a58] text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Mobile Header Toggle */}
        <div className="flex justify-between items-center md:hidden mb-4">
          <button
            onClick={onToggleSidebar}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="text-xs font-bold bg-white/15 px-2.5 py-1 rounded-full uppercase tracking-wider">UniBot Dashboard</span>
        </div>

        <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider bg-white/10 px-2.5 py-1 rounded-md">
          Student Portal
        </span>
        <h2 className="text-3xl font-extrabold mt-4 tracking-tight">
          Welcome back, {getUsername(user.email)}!
        </h2>
        <p className="text-xs text-indigo-150 mt-2 font-semibold leading-relaxed max-w-2xl">
          Access your syllabus databases, study chatbot assistants, and exam analytics reports from one central dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Services Grid */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-800">Explore Assistant Tools</h3>
            <span className="text-[10px] text-slate-400 font-bold">4 active modules</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between hover:border-indigo-200 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-indigo-50/50 transition">
                      {tool.icon}
                    </div>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${tool.badgeColor}`}>
                      {tool.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1.5 group-hover:text-indigo-650 transition">
                    {tool.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-6">
                    {tool.desc}
                  </p>
                </div>
                <button
                  onClick={() => onChangeTab(tool.id as any)}
                  className="w-full py-2 bg-slate-50 hover:bg-[#1a253c] text-slate-700 hover:text-white border border-slate-200 hover:border-[#1a253c] font-bold text-xs rounded-xl transition cursor-pointer text-center"
                >
                  {tool.btnText}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: User Profile Panel */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-800">Your Student Profile</h3>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            {/* Avatar Circle */}
            <div className="w-20 h-20 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-2xl mb-4 shadow-inner">
              {getUsername(user.email).substring(0, 2).toUpperCase()}
            </div>

            <h4 className="text-sm font-bold text-slate-900 truncate max-w-full">
              {getUsername(user.email)}
            </h4>
            <p className="text-[10px] text-slate-400 font-bold mb-4">{user.email}</p>

            <div className="w-full flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
              <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Access Scope</span>
              <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                {getRoleIcon(user.role)}
                {user.role}
              </span>
            </div>

            <div className="w-full flex items-center justify-between pt-3 mt-1">
              <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">System Status</span>
              <span className="text-[10px] text-emerald-650 font-extrabold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block mr-1" />
                Online
              </span>
            </div>
          </div>

          {/* Quick Notice Widget */}
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 shadow-sm flex flex-col gap-2">
            <h4 className="text-xs font-bold text-amber-850 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600" /> Syllabus Tip
            </h4>
            <p className="text-[10px] text-amber-800 font-semibold leading-relaxed">
              Upload your latest unit syllabus guide into the **Student Knowledge Base** first. This guarantees your **AI Study Chatbot** answers matches your exact curriculum outline!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
