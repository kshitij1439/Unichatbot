"use client";

import React, { useEffect, useState } from "react";
import { 
  Globe, 
  ExternalLink, 
  BookOpen, 
  Award, 
  GraduationCap, 
  FileText, 
  RefreshCw,
  Bell,
  Search,
  Loader2
} from "lucide-react";
import { Circular } from "@/lib/sppu";

interface SppuHubProps {
  onToggleSidebar?: () => void;
}

const PORTALS = [
  {
    title: "SPPU Main Website",
    desc: "Official Savitribai Phule Pune University landing page.",
    url: "https://www.unipune.ac.in/",
    icon: Globe,
    color: "from-blue-500/10 to-indigo-500/10 text-indigo-400 border-indigo-500/20"
  },
  {
    title: "Examination Portal",
    desc: "Circulars, exam forms, schedules, and hall tickets.",
    url: "https://exam.unipune.ac.in/",
    icon: FileText,
    color: "from-amber-500/10 to-orange-500/10 text-amber-400 border-amber-500/20"
  },
  {
    title: "PG & UG Admissions",
    desc: "One Entry Entrance (OEE) and course applications.",
    url: "https://campus.unipune.ac.in/",
    icon: GraduationCap,
    color: "from-emerald-500/10 to-teal-500/10 text-emerald-400 border-emerald-500/20"
  },
  {
    title: "Online Results Portal",
    desc: "Direct access to published course exam results.",
    url: "http://results.unipune.ac.in/",
    icon: Award,
    color: "from-rose-500/10 to-pink-500/10 text-rose-400 border-rose-500/20"
  },
  {
    title: "BCUD Research & Schemes",
    desc: "Academic approvals, funding, and university development.",
    url: "https://bcud.unipune.ac.in/",
    icon: BookOpen,
    color: "from-purple-500/10 to-violet-500/10 text-purple-400 border-purple-500/20"
  }
];

export default function SppuHub({ onToggleSidebar }: SppuHubProps) {
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCirculars = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/sppu-circulars");
      if (res.ok) {
        const data = await res.json();
        setCirculars(data.circulars || []);
      }
    } catch (error) {
      console.error("Error fetching circulars:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCirculars();
  }, []);

  const filteredCirculars = circulars.filter((c) => {
    const matchesCategory = activeCategory === "all" || c.category === activeCategory;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: Circular["category"]) => {
    switch (category) {
      case "exam":
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full">Examination</span>;
      case "admission":
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full">Admission</span>;
      case "scholarship":
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full">Scholarship</span>;
      default:
        return <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">General</span>;
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-zinc-900/10 backdrop-blur-md relative min-w-0">
      {/* Top Header */}
      <div className="h-16 border-b border-zinc-900 px-4 md:px-6 flex items-center justify-between bg-zinc-950/20">
        <div className="flex items-center gap-2">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-lg border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white transition mr-1"
              title="Open menu"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Globe className="w-4.5 h-4.5" />
          </div>
          <span className="text-sm font-semibold text-white">SPPU Circulars & Links Hub</span>
        </div>

        <button
          onClick={() => fetchCirculars(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-850 bg-zinc-950/40 text-xs text-zinc-400 hover:text-white transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
          <span className="hidden sm:inline">{refreshing ? "Checking circulars..." : "Check updates"}</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 min-h-0 max-w-4xl mx-auto w-full">
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-850 bg-gradient-to-br from-indigo-950/20 to-zinc-950 p-5 md:p-6 shadow-xl">
          <div className="relative z-10 max-w-xl">
            <h2 className="text-lg font-bold text-white mb-1.5">SPPU Smart Assistant Co-pilot</h2>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
              Browse exam form notices, PG admission announcements, minority scholarships, and syllabus changes. All these items are automatically integrated into the chatbot's memory so you can query deadlines and rules during study chat sessions!
            </p>
          </div>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-indigo-500/10 pointer-events-none hidden md:block">
            <Bell className="w-32 h-32" />
          </div>
        </div>

        {/* Portals Links Grid */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">
            Important Portals & Resources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {PORTALS.map((portal, idx) => {
              const Icon = portal.icon;
              return (
                <a
                  key={idx}
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex items-start gap-3.5 p-4 rounded-2xl border bg-gradient-to-tr transition-all hover:-translate-y-0.5 hover:shadow-lg ${portal.color} hover:bg-zinc-900/30`}
                >
                  <div className="p-2 rounded-xl bg-zinc-950/60 border border-white/[0.05] group-hover:scale-105 transition-transform shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1">
                      {portal.title}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500" />
                    </h4>
                    <p className="text-xs text-zinc-400 leading-snug group-hover:text-zinc-350 transition-colors">
                      {portal.desc}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* Circulars Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-zinc-900 pb-3">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">
              Active University Circulars Feed
            </h3>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-650" />
              <input
                type="text"
                placeholder="Search circulars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 pl-9 pr-4 py-1.5 rounded-xl border border-zinc-850 bg-zinc-950/40 text-xs text-zinc-300 placeholder-zinc-650 focus:outline-none focus:border-indigo-500/50 focus:bg-zinc-950 transition"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "All Notices" },
              { id: "exam", label: "Examinations" },
              { id: "admission", label: "Admissions" },
              { id: "scholarship", label: "Scholarships" },
              { id: "general", label: "General" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  activeCategory === tab.id
                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                    : "border-zinc-900 bg-zinc-900/30 hover:border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Feed Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs text-zinc-500">Checking Savitribai Phule Pune University portal updates...</p>
            </div>
          ) : filteredCirculars.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/10">
              <p className="text-sm text-zinc-500">No circulars match your search or filter.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredCirculars.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-2xl border border-zinc-850 bg-zinc-950/30 hover:bg-zinc-950/50 transition-colors shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {getCategoryBadge(c.category)}
                      <span className="text-[10px] text-zinc-500 font-mono">{c.date}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white leading-snug">
                      {c.title}
                    </h4>
                    <p className="text-xs text-zinc-450 leading-relaxed bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-900">
                      {c.summary}
                    </p>
                  </div>

                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sm:self-center shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-850 hover:border-zinc-850 hover:bg-indigo-650 hover:text-white text-xs text-zinc-400 bg-zinc-950/40 transition-all font-semibold"
                  >
                    View Official <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
