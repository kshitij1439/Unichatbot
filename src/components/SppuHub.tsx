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
    icon: Globe
  },
  {
    title: "Examination Portal",
    desc: "Circulars, exam forms, schedules, and hall tickets.",
    url: "https://exam.unipune.ac.in/",
    icon: FileText
  },
  {
    title: "PG & UG Admissions",
    desc: "One Entry Entrance (OEE) and course applications.",
    url: "https://campus.unipune.ac.in/",
    icon: GraduationCap
  },
  {
    title: "Online Results Portal",
    desc: "Direct access to published course exam results.",
    url: "http://results.unipune.ac.in/",
    icon: Award
  },
  {
    title: "BCUD Research & Schemes",
    desc: "Academic approvals, funding, and university development.",
    url: "https://bcud.unipune.ac.in/",
    icon: BookOpen
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

  const getCategoryBadge = (category: Circular["category"]) => {
    return (
      <span className="bg-zinc-100 text-zinc-800 border border-zinc-200 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
        {category}
      </span>
    );
  };

  const filteredCirculars = circulars.filter((c) => {
    const matchesCategory = activeCategory === "all" || c.category === activeCategory;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col flex-1 h-full bg-zinc-50 relative min-w-0 font-sans">
      {/* Top Header */}
      <div className="h-16 border-b border-zinc-200 px-4 md:px-6 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 transition mr-1"
              title="Open menu"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          )}
          <div className="w-8 h-8 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 shrink-0">
            <Globe className="w-4.5 h-4.5" />
          </div>
          <span className="text-sm font-semibold text-zinc-900">SPPU Circulars & Links Hub</span>
        </div>

        <button
          onClick={() => fetchCirculars(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-600 hover:text-zinc-900 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-zinc-900" : ""}`} />
          <span className="hidden sm:inline">{refreshing ? "Checking circulars..." : "Check updates"}</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 min-h-0 max-w-4xl mx-auto w-full">
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-md border border-zinc-200 bg-white p-5 md:p-6">
          <div className="relative z-10 max-w-xl">
            <h2 className="text-lg font-bold text-zinc-900 mb-1.5 font-mono">SPPU Smart Assistant Co-pilot</h2>
            <p className="text-xs md:text-sm text-zinc-600 leading-relaxed">
              Browse exam form notices, PG admission announcements, minority scholarships, and syllabus changes. All these items are automatically integrated into the chatbot's memory so you can query deadlines and rules during study chat sessions!
            </p>
          </div>
        </div>

        {/* Portals Links Grid */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1 font-mono">
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
                  className="group flex items-start gap-3.5 p-4 rounded-md border border-zinc-250 bg-white hover:border-zinc-900 transition-all duration-150"
                >
                  <div className="p-2 rounded bg-zinc-50 border border-zinc-200 shrink-0">
                    <Icon className="w-5 h-5 text-zinc-900" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-1">
                      {portal.title}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500" />
                    </h4>
                    <p className="text-xs text-zinc-500 leading-snug group-hover:text-zinc-700 transition-colors">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-zinc-200 pb-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1 font-mono">
              Active University Circulars Feed
            </h3>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search circulars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 pl-9 pr-4 py-1.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white transition"
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
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                  activeCategory === tab.id
                    ? "border-zinc-900 bg-zinc-900 text-white font-bold"
                    : "border-zinc-200 bg-white hover:border-zinc-350 text-zinc-650 hover:text-zinc-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Feed Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
              <p className="text-xs text-zinc-500 font-bold">Checking Savitribai Phule Pune University portal updates...</p>
            </div>
          ) : filteredCirculars.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-200 rounded-md bg-zinc-50">
              <p className="text-sm text-zinc-500 font-medium font-mono">No circulars match your search or filter.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredCirculars.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50/50 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {getCategoryBadge(c.category)}
                      <span className="text-[10px] text-zinc-400 font-mono font-bold">{c.date}</span>
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900 leading-snug">
                      {c.title}
                    </h4>
                    <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-2.5 rounded border border-zinc-200">
                      {c.summary}
                    </p>
                  </div>

                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sm:self-center shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-900 hover:text-white text-xs text-zinc-600 bg-white transition-all font-bold"
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
