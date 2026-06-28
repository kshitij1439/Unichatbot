"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  BarChart2,
  FileText,
  CheckSquare,
  Loader2,
  ChevronRight,
  AlertCircle,
  Menu,
  HelpCircle,
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

interface SvgChartProps {
  topics: Topic[];
}

export function TopicFrequencyChart({ topics }: SvgChartProps) {
  // Sort top 7 topics by frequency
  const topTopics = [...topics]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 7);

  const maxFreq = Math.max(...topTopics.map((t) => t.frequency), 1);
  const chartHeight = 130;
  const barWidth = 36;
  const gap = 20;
  const paddingLeft = 30;
  const paddingBottom = 35;
  const chartWidth = topTopics.length * (barWidth + gap) + paddingLeft + 10;

  return (
    <div className="w-full bg-white border border-zinc-200 rounded-md p-5">
      <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">Topic Frequency Distribution</h4>
        <span className="text-[10px] bg-zinc-100 text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded font-bold">Past Occurrences</span>
      </div>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[400px] h-[170px] flex items-center justify-center">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight + paddingBottom}`} className="w-full h-full overflow-visible">
            {/* Y Axis Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = chartHeight - ratio * chartHeight;
              const val = Math.round(ratio * maxFreq);
              return (
                <g key={i} className="opacity-40">
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - 10}
                    y2={y}
                    stroke="#e4e4e7"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fill="#71717a" className="text-[9px] font-bold font-mono">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {topTopics.map((topic, index) => {
              const barHeight = (topic.frequency / maxFreq) * chartHeight;
              const x = paddingLeft + index * (barWidth + gap) + gap / 2;
              const y = chartHeight - barHeight;

              return (
                <g key={index} className="group cursor-pointer">
                  {/* Tooltip hover trigger background */}
                  <rect
                    x={x - gap / 4}
                    y={0}
                    width={barWidth + gap / 2}
                    height={chartHeight}
                    fill="transparent"
                    className="hover:fill-zinc-50/20 transition-all duration-200"
                  />
                  
                  {/* Visual Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, 4)}
                    rx="1"
                    ry="1"
                    fill="#18181b"
                    className="transition-all duration-300 hover:opacity-90"
                  />

                  {/* Value Label above Bar */}
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fill="#18181b"
                    className="text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    {topic.frequency}x
                  </text>

                  {/* X Axis Label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 14}
                    textAnchor="middle"
                    fill="#27272a"
                    className="text-[9px] font-semibold"
                    transform={`rotate(-15, ${x + barWidth / 2}, ${chartHeight + 14})`}
                  >
                    {topic.topicName.length > 8 ? `${topic.topicName.slice(0, 8)}..` : topic.topicName}
                  </text>

                  <title>{`${topic.topicName}\nUnit: ${topic.unitName}\nFrequency: ${topic.frequency} times\nImportance: ${topic.importance}`}</title>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

interface UnitWeightageBarChartProps {
  heatmapUnits: HeatmapUnit[];
}

export function UnitWeightageBarChart({ heatmapUnits }: UnitWeightageBarChartProps) {
  const maxWeight = Math.max(...heatmapUnits.map((u) => u.weight), 1);

  return (
    <div className="w-full bg-white border border-zinc-200 rounded-md p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">Unit Weightage (Relative Marks)</h4>
          <span className="text-[10px] bg-zinc-100 text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded font-bold">Relative Percentage</span>
        </div>
        <div className="flex flex-col gap-3 mt-2">
          {heatmapUnits.slice(0, 5).map((unit, idx) => {
            const percentage = unit.weight;
            return (
              <div key={idx} className="flex flex-col gap-0.5 font-mono">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-800">
                  <span className="truncate max-w-[190px]" title={unit.unitName}>{unit.unitName}</span>
                  <span className="font-semibold text-zinc-900">{percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 rounded overflow-hidden relative border border-zinc-200">
                  <div
                    className="h-full rounded-sm bg-zinc-900 transition-all duration-500"
                    style={{ width: `${(percentage / maxWeight) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[9px] text-zinc-550 font-medium mt-4 leading-relaxed bg-zinc-50 p-2.5 rounded border border-zinc-200">
        💡 Heavy-weight units typically contain core syllabus principles and should be prepared first.
      </p>
    </div>
  );
}

export default function PatternAnalyzer({ onToggleSidebar }: PatternAnalyzerProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDocs, setFetchingDocs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Find the folder path of the first selected document to restrict checking other subjects
  const firstSelectedDoc = selectedDocIds.length > 0 ? documents.find((d) => d.id === selectedDocIds[0]) : null;
  const activePath = firstSelectedDoc?.path || null;

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
        return "bg-zinc-900 text-white border-zinc-950 font-semibold";
      case "Medium":
        return "bg-zinc-100 text-zinc-800 border-zinc-300 font-semibold";
      default:
        return "bg-zinc-50 text-zinc-500 border-zinc-200 font-semibold";
    }
  };

  const getHeatmapColor = (weight: number) => {
    if (weight >= 25) return "bg-zinc-800 text-white border-zinc-900";
    if (weight >= 18) return "bg-zinc-600 text-white border-zinc-750";
    if (weight >= 12) return "bg-zinc-105 text-zinc-900 border-zinc-200";
    return "bg-zinc-50 text-zinc-600 border-zinc-200";
  };

  const formatPath = (path: string | null) => {
    if (!path) return "General / Course Files";
    return path;
  };

  return (
    <div className="flex flex-col gap-6 h-full text-zinc-800 p-4 md:p-8 max-w-6xl mx-auto w-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-2 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 transition mr-1 shrink-0"
              title="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2 truncate">
              <TrendingUp className="w-6 h-6 text-zinc-900 shrink-0" /> Paper Pattern Analyzer
            </h2>
            <p className="text-xs text-zinc-500 font-medium truncate">
              Identify topic frequencies, unit weightage heatmaps, and expected exam questions from past papers.
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel / File Selector */}
      <div className="bg-white border border-zinc-200 rounded-md p-5 flex flex-col gap-4">
        <div className="w-full min-w-0">
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 font-mono">
            Select Past Papers / Study Material to Analyze (Select Multiple to Correlate Patterns)
          </label>
          {fetchingDocs ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500 font-semibold py-2">
              <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
              <span>Loading completed documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-sm text-zinc-800 font-semibold flex items-center gap-1.5 py-2">
              <AlertCircle className="w-4 h-4" />
              <span>No ingested files available. Go to the Knowledge Base to ingest PDFs first.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-1">
              {documents.map((doc) => {
                const isChecked = selectedDocIds.includes(doc.id);
                const isDisabled = activePath !== null && doc.path !== activePath && !isChecked;

                return (
                  <label
                    key={doc.id}
                    className={`flex items-center gap-3 p-3 rounded-md border select-none transition-all duration-200 ${
                      isChecked
                        ? "border-zinc-900 bg-zinc-50 font-bold"
                        : isDisabled
                        ? "border-zinc-200 bg-zinc-50 opacity-40 cursor-not-allowed"
                        : "border-zinc-200 bg-zinc-50/10 hover:bg-zinc-100 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={() => toggleDocumentSelection(doc.id)}
                      className="w-4 h-4 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isDisabled ? "text-zinc-400" : "text-zinc-800"}`} title={doc.name}>
                        {doc.name}
                      </p>
                      <p className={`text-[9px] font-bold truncate mt-0.5 ${isDisabled ? "text-zinc-350" : "text-zinc-400"}`}>
                        {formatPath(doc.path)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 pt-4 mt-2">
          <p className="text-xs text-zinc-500 font-semibold flex flex-col gap-0.5">
            <span>{selectedDocIds.length} {selectedDocIds.length === 1 ? "paper" : "papers"} selected for analysis.</span>
            {activePath && (
              <span className="text-[10px] text-zinc-900 font-bold font-mono">
                Subject folder: {activePath.split("/").pop()}
              </span>
            )}
          </p>
          <button
            onClick={runAnalysis}
            disabled={loading || selectedDocIds.length === 0}
            className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-450 disabled:cursor-not-allowed text-white px-5 py-2.5 border border-zinc-900 rounded-md font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                {analysis ? "Run Analysis Again" : "Analyze Patterns"}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-md p-4 flex gap-3 items-start text-xs text-zinc-950 font-semibold">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 text-zinc-900" />
          <div className="flex-1">
            <span className="font-bold">Analysis Failed:</span> {error}
          </div>
        </div>
      )}

      {/* Loading Skeleton Scanning UI */}
      {loading && (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-zinc-200 rounded-md p-6 flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
            <p className="text-sm font-bold text-zinc-800">Analyzing exam papers...</p>
            <p className="text-xs text-zinc-500 font-semibold max-w-sm text-center">
              Correlating topics and marks weightage from the selected documents.
            </p>
            <div className="w-64 h-1 bg-zinc-100 rounded overflow-hidden mt-2 border border-zinc-200">
              <div className="w-1/2 h-full bg-zinc-900 rounded animate-infinite-scroll" />
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Result View */}
      {analysis && !loading && (
        <div className="flex flex-col gap-6 select-none animate-fadeIn">
          {/* Dashboard Summary Card */}
          <div className="bg-white border border-zinc-200 rounded-md p-5">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-mono">
              Exam Insights Report
            </span>
            <h3 className="text-lg font-bold mt-1 text-zinc-900 font-mono">{analysis.subject || "Subject Course Report"}</h3>
            <p className="text-xs text-zinc-650 mt-1 leading-relaxed max-w-2xl">
              Calculated frequency trends and questions based on parsed past papers. Total identified key topics: {analysis.topics.length}.
            </p>
          </div>

          {/* Visual Analytics Chart Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TopicFrequencyChart topics={analysis.topics} />
            <UnitWeightageBarChart heatmapUnits={analysis.heatmapUnits} />
          </div>

          {/* Heatmap Grid */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-1.5 font-mono">
              <BarChart2 className="w-5 h-5 text-zinc-900" /> Unit Weightage Heatmap
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {analysis.heatmapUnits.map((unit, index) => {
                const isHeavy = unit.weight >= 18;
                return (
                  <div
                    key={index}
                    className={`border rounded-md p-4 flex flex-col gap-3 transition-colors ${getHeatmapColor(
                      unit.weight
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold truncate max-w-[150px] font-mono">{unit.unitName}</span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded border ${
                          isHeavy
                            ? "bg-zinc-900 text-white border-zinc-950"
                            : "bg-zinc-100 text-zinc-800 border-zinc-200"
                        }`}
                      >
                        {unit.weight}% marks
                      </span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isHeavy ? "text-zinc-350" : "text-zinc-550"}`}>
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
            <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-md p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-250 pb-3">
                <h4 className="text-sm font-bold text-zinc-900">High-Frequency Topics</h4>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase font-mono">Sorted by Importance</span>
              </div>
              <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
                {analysis.topics.map((topic, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-md border border-zinc-200 bg-zinc-50/50 hover:border-zinc-400 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-800 truncate" title={topic.topicName}>
                        {topic.topicName}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500 font-mono">
                        <span>{topic.unitName}</span>
                        <span>•</span>
                        <span>Avg Marks: {topic.averageMarks}m</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-[10px] text-zinc-400 font-bold font-mono">Asked: {topic.lastAsked}</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getImportanceColor(
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
            <div className="bg-white border border-zinc-200 rounded-md p-5 flex flex-col gap-4">
              <div className="flex items-center gap-1.5 border-b border-zinc-200 pb-3">
                <CheckSquare className="w-4.5 h-4.5 text-zinc-900" />
                <h4 className="text-sm font-bold text-zinc-900">Revision Priority Queue</h4>
              </div>
              <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[360px] pr-1">
                {analysis.studyPlanner.map((item, index) => (
                  <div key={index} className="flex gap-2.5 items-start">
                    <span className="w-5.5 h-5.5 rounded bg-zinc-100 border border-zinc-250 text-xs font-bold text-zinc-800 flex items-center justify-center shrink-0 font-mono">
                      {item.priority}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 leading-snug">{item.task}</p>
                      <p className="text-[10px] text-zinc-550 mt-0.5 leading-relaxed">
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
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-1.5 font-mono">
              <HelpCircle className="w-5 h-5 text-zinc-900" /> Expected Exam Questions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.predictions.map((pred, index) => {
                const probPercent = Math.round(pred.probability * 100);
                const isHighProb = probPercent >= 80;
                return (
                  <div
                    key={index}
                    className="bg-white border border-zinc-200 hover:border-zinc-400 rounded-md p-4 flex flex-col gap-3 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider font-mono">
                          {pred.unit}
                        </span>
                        <h4 className="text-xs font-bold text-zinc-800 mt-1 leading-normal" title={pred.questionText}>
                          {pred.questionText}
                        </h4>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                            isHighProb
                              ? "bg-zinc-900 text-white border-zinc-950"
                              : "bg-zinc-100 text-zinc-800 border-zinc-200"
                          }`}
                        >
                          {probPercent}% Prob
                        </span>
                        <span className="text-[9px] text-zinc-400 font-bold mt-1 font-mono">Expected: {pred.expectedMarks}m</span>
                      </div>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-200 rounded p-3 text-[10px] text-zinc-650 leading-relaxed">
                      <span className="font-bold text-zinc-800 font-mono">Analysis Rationale:</span> {pred.rationale}
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
