"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  BarChart2,
  FileText,
  CheckSquare,
  Sparkles,
  Loader2,
  ChevronRight,
  Calendar,
  Award,
  AlertCircle,
  Flame,
  Menu,
} from "lucide-react";

interface DocumentItem {
  id: string;
  name: string;
  path: string | null;
  createdAt: string;
  analysis: string | null;
}

interface Topic {
  topicName: string;
  unitName: string;
  frequency: number;
  importance: "High" | "Medium" | "Low";
  averageMarks: number;
  lastAsked: string;
}

interface HeatmapUnit {
  unitName: string;
  weight: number; // expected marks or percentage
  description: string;
}

interface Prediction {
  questionText: string;
  expectedMarks: number;
  probability: number;
  rationale: string;
  unit: string;
}

interface StudyPlanItem {
  priority: number;
  task: string;
  actionItem: string;
}

interface AnalysisResult {
  subject: string;
  topics: Topic[];
  heatmapUnits: HeatmapUnit[];
  predictions: Prediction[];
  studyPlanner: StudyPlanItem[];
}

interface PatternAnalyzerProps {
  onToggleSidebar?: () => void;
}

export default function PatternAnalyzer({ onToggleSidebar }: PatternAnalyzerProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDocs, setFetchingDocs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Fetch completed documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setFetchingDocs(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-papers");
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
        if (data.documents && data.documents.length > 0) {
          const firstId = data.documents[0].id;
          setSelectedDocIds([firstId]);
          // If the first document already has analysis, load it
          if (data.documents[0].analysis) {
            try {
              setAnalysis(JSON.parse(data.documents[0].analysis));
            } catch (e) {
              console.warn("Failed to parse cached analysis", e);
            }
          }
        }
      } else {
        setError(data.error || "Failed to load documents.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch documents. Database connection error.");
    } finally {
      setFetchingDocs(false);
    }
  };

  const checkCombinationCache = (ids: string[]) => {
    if (ids.length === 0) {
      setAnalysis(null);
      return;
    }

    const sortedSelected = [...ids].sort();
    let matchedAnalysis = null;

    for (const doc of documents) {
      if (doc.analysis) {
        try {
          const parsed = JSON.parse(doc.analysis);
          const parsedIds = parsed.documentIds || [doc.id];
          const sortedParsed = [...parsedIds].sort();
          if (JSON.stringify(sortedSelected) === JSON.stringify(sortedParsed)) {
            matchedAnalysis = parsed;
            break;
          }
        } catch (e) {
          console.warn("Error checking combination cache", e);
        }
      }
    }
    setAnalysis(matchedAnalysis);
  };

  const toggleDocumentSelection = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      checkCombinationCache(next);
      return next;
    });
  };

  const runAnalysis = async () => {
    if (selectedDocIds.length === 0) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch("/api/analyze-papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: selectedDocIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnalysis(data.analysis);
        // Cache the analysis result locally in the documents list to avoid subsequent API calls
        setDocuments((prev) =>
          prev.map((d) => {
            if (d.id === selectedDocIds[0]) {
              return { ...d, analysis: JSON.stringify(data.analysis) };
            }
            return d;
          })
        );
      } else {
        setError(data.error || "Failed to perform pattern analysis.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error occurred during paper analysis.");
    } finally {
      setLoading(false);
    }
  };

  const getImportanceColor = (imp: Topic["importance"]) => {
    switch (imp) {
      case "High":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Medium":
        return "bg-amber-50 text-amber-705 border-amber-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getHeatmapColor = (weight: number) => {
    // Determine color intensity based on weight percentage
    if (weight >= 25) return "bg-indigo-600 text-white border-indigo-700 shadow-indigo-100";
    if (weight >= 18) return "bg-indigo-500 text-white border-indigo-600 shadow-indigo-50";
    if (weight >= 12) return "bg-indigo-50 text-indigo-700 border-indigo-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const formatPath = (path: string | null) => {
    if (!path) return "General / Course Files";
    return path;
  };

  return (
    <div className="flex flex-col gap-6 h-full text-slate-800 p-4 md:p-8 max-w-6xl mx-auto w-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition mr-1 shrink-0"
              title="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-[#1a253c] tracking-tight flex items-center gap-2 truncate">
              <TrendingUp className="w-6 h-6 text-[#1a253c] shrink-0" /> Paper Pattern Analyzer
            </h2>
            <p className="text-xs text-slate-500 font-semibold truncate">
              Identify topic frequencies, unit weightage heatmaps, and expected exam questions from past papers.
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel / File Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <div className="w-full min-w-0">
          <label className="block text-xs font-bold text-slate-450 uppercase tracking-wider mb-3">
            Select Past Papers / Study Material to Analyze (Select Multiple to Correlate Patterns)
          </label>
          {fetchingDocs ? (
            <div className="flex items-center gap-2 text-sm text-slate-450 font-semibold py-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-650" />
              <span>Loading completed documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-sm text-amber-600 font-semibold flex items-center gap-1.5 py-2">
              <AlertCircle className="w-4 h-4" />
              <span>No ingested files available. Go to the Knowledge Base to ingest PDFs first.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-1">
              {documents.map((doc) => {
                const isChecked = selectedDocIds.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                      isChecked
                        ? "border-indigo-500 bg-indigo-50/45 shadow-sm shadow-indigo-100/30"
                        : "border-slate-200 bg-slate-50/10 hover:bg-slate-50/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDocumentSelection(doc.id)}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-350 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate" title={doc.name}>
                        {doc.name}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5">
                        {formatPath(doc.path)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
          <p className="text-xs text-slate-500 font-semibold">
            {selectedDocIds.length} {selectedDocIds.length === 1 ? "paper" : "papers"} selected for analysis.
          </p>
          <button
            onClick={runAnalysis}
            disabled={loading || selectedDocIds.length === 0}
            className="bg-[#1a253c] hover:bg-[#253554] disabled:bg-slate-200 disabled:text-slate-450 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing Paper...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              {analysis ? "Re-Analyze Pattern" : "Analyze Pattern"}
            </>
          )}
        </button>
      </div>
    </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 items-start text-xs text-rose-650 font-semibold shadow-sm">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
          <div className="flex-1">
            <span className="font-bold">Analysis Failed:</span> {error}
          </div>
        </div>
      )}

      {/* Loading Skeleton Scanning UI */}
      {loading && (
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
            <Flame className="w-10 h-10 text-indigo-500 animate-bounce" />
            <p className="text-base font-bold text-slate-700">AI Exam Scanner active...</p>
            <p className="text-xs text-slate-450 font-semibold max-w-sm text-center">
              Scanning past papers and analyzing topic frequency counts, marks distributions, and unit chapters.
            </p>
            <div className="w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div className="w-1/2 h-full bg-indigo-600 rounded-full animate-infinite-scroll" />
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Result View */}
      {analysis && !loading && (
        <div className="flex flex-col gap-6 select-none animate-fadeIn">
          {/* Dashboard Summary Card */}
          <div className="bg-gradient-to-r from-[#1a253c] to-[#2b3a58] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
            <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider bg-white/10 px-2.5 py-1 rounded-md">
              AI Exam Insights Report
            </span>
            <h3 className="text-2xl font-extrabold mt-3 tracking-tight">{analysis.subject || "Subject Course Report"}</h3>
            <p className="text-xs text-indigo-150 mt-1 font-semibold leading-relaxed max-w-2xl">
              Calculated frequency trends and questions based on parsed past papers. Total identified key topics: {analysis.topics.length}.
            </p>
          </div>

          {/* Heatmap Grid */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <BarChart2 className="w-5 h-5 text-indigo-600" /> Unit Weightage Heatmap
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {analysis.heatmapUnits.map((unit, index) => {
                const isHeavy = unit.weight >= 18;
                return (
                  <div
                    key={index}
                    className={`border rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 ${getHeatmapColor(
                      unit.weight
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold truncate max-w-[150px]">{unit.unitName}</span>
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                          isHeavy
                            ? "bg-white/20 text-white"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {unit.weight}% marks
                      </span>
                    </div>
                    <p className={`text-[11px] font-medium leading-relaxed ${isHeavy ? "text-indigo-100" : "text-slate-500"}`}>
                      {unit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mid Section: Topics & Study Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Topic Frequency Table */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-extrabold text-slate-900">High-Frequency Topics</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Sorted by Importance</span>
              </div>
              <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
                {analysis.topics.map((topic, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/30 hover:border-indigo-100 hover:bg-indigo-50/10 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate" title={topic.topicName}>
                        {topic.topicName}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-450 font-medium">
                        <span>{topic.unitName}</span>
                        <span>•</span>
                        <span>Avg Marks: {topic.averageMarks}m</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-[10px] text-slate-400 font-bold">Asked: {topic.lastAsked}</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getImportanceColor(
                          topic.importance
                        )}`}
                      >
                        {topic.importance}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Study Revision Planner Checklist */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <CheckSquare className="w-4.5 h-4.5 text-indigo-650" />
                <h4 className="text-sm font-extrabold text-[#1a253c]">Revision Priority Queue</h4>
              </div>
              <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[360px] pr-1">
                {analysis.studyPlanner.map((item, index) => (
                  <div key={index} className="flex gap-2.5 items-start">
                    <span className="w-5.5 h-5.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs font-extrabold text-indigo-600 flex items-center justify-center shrink-0">
                      {item.priority}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 leading-snug">{item.task}</p>
                      <p className="text-[10px] text-slate-450 mt-0.5 font-medium leading-relaxed">
                        {item.actionItem}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Exam Predictions Grid */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-indigo-600" /> AI Exam Predictions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.predictions.map((pred, index) => {
                const probPercent = Math.round(pred.probability * 100);
                const isHighProb = probPercent >= 80;
                return (
                  <div
                    key={index}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-sm flex flex-col gap-3 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                          {pred.unit}
                        </span>
                        <h4 className="text-xs font-bold text-slate-850 mt-1 leading-normal" title={pred.questionText}>
                          {pred.questionText}
                        </h4>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-md ${
                            isHighProb
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}
                        >
                          {probPercent}% Prob
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold mt-1">Expected: {pred.expectedMarks}m</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-505 font-medium leading-relaxed">
                      <span className="font-bold text-slate-700">AI Rationale:</span> {pred.rationale}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
