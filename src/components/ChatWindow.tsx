"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Loader2, Sparkles, HelpCircle, Menu, FileText, ExternalLink, Brain, ChevronDown, ChevronRight } from "lucide-react";
import { MascotViewport } from "./MascotViewport";
import { EyeExpression, ActiveAnimation } from "../types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatWindowProps {
  sessionId: string | null;
  onSessionStarted: (id: string) => void;
  onToggleSidebar?: () => void;
}

const BotIcon = ({ isLive, expression, animation }: { isLive?: boolean; expression?: EyeExpression; animation?: ActiveAnimation }) => {
  if (isLive) {
    return (
      <div className="w-8 h-8 flex-shrink-0 relative overflow-hidden">
        <MascotViewport
          expression={expression}
          animation={animation}
          backdropColor="transparent"
        />
      </div>
    );
  }
  return (
    <svg className="w-6 h-6" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="42" rx="30" ry="20" fill="#f4f4f5" stroke="#e4e4e7" strokeWidth="1.5" />
      <ellipse cx="50" cy="42" rx="22" ry="11" fill="#e4e4e7" />
      <ellipse cx="42" cy="42" rx="3" ry="5" fill="#18181b" />
      <ellipse cx="58" cy="42" rx="3" ry="5" fill="#18181b" />
      <rect x="32" y="14" width="2" height="10" fill="#e4e4e7" />
      <circle cx="33" cy="12" r="3" fill="#e4e4e7" />
      <rect x="66" y="14" width="2" height="10" fill="#e4e4e7" />
      <circle cx="67" cy="12" r="3" fill="#e4e4e7" />
      <path d="M50 88 C58 75 58 64 50 60 C42 64 42 75 50 88 Z" fill="#f4f4f5" stroke="#e4e4e7" strokeWidth="1.5" />
    </svg>
  );
};

export default function ChatWindow({ sessionId, onSessionStarted, onToggleSidebar }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [expression, setExpression] = useState<EyeExpression>("neutral");
  const [animation, setAnimation] = useState<ActiveAnimation>("float");
  const [selectedModel, setSelectedModel] = useState<"gemini" | "grok">("gemini");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const lastAssistantMessageId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  const toggleThought = (msgId: string) => {
    setExpandedThoughts((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Fetch messages when session changes
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setFetchingMessages(true);
      try {
        const res = await fetch(`/api/chat?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      } finally {
        setFetchingMessages(false);
      }
    };

    fetchMessages();
  }, [sessionId]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageContent = input.trim();
    setInput("");
    setLoading(true);
    
    // Set mascot to thinking state
    setExpression("thinking");
    setAnimation("breathe");

    // Append user message immediately for responsiveness
    const tempUserMessage: Message = {
      id: "temp-user-id",
      role: "user",
      content: userMessageContent,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessageContent,
          sessionId: sessionId || "new",
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      if (!res.body) {
        throw new Error("No response body received");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const tempAssistantId = "temp-assistant-id";
      let hasAddedAssistantPlaceholder = false;
      let syncedSessionId = sessionId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split by SSE double-newline
        const parts = buffer.split("\n\n");
        // Save the last partial chunk back to the buffer
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;

          // Parse event and data lines
          const lines = part.split("\n");
          let event = "";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              event = line.substring(6).trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.substring(5).trim();
            }
          }

          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);

              if (event === "session") {
                // Sync session and replace user message with actual DB representation
                syncedSessionId = data.sessionId;
                if (!sessionId) {
                  onSessionStarted(data.sessionId);
                }
                setMessages((prev) => {
                  const filtered = prev.filter((m) => m.id !== "temp-user-id");
                  return [...filtered, data.userMessage];
                });
              } else if (event === "token") {
                // Initialize placeholder assistant message on first token
                if (!hasAddedAssistantPlaceholder) {
                  hasAddedAssistantPlaceholder = true;
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: tempAssistantId,
                      role: "assistant",
                      content: data,
                      createdAt: new Date().toISOString(),
                    },
                  ]);
                } else {
                  // Append subsequent tokens to content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === tempAssistantId
                        ? { ...msg, content: msg.content + data }
                        : msg
                    )
                  );
                }
              } else if (event === "done") {
                // Replace placeholder message with final assistant message saved in DB
                setMessages((prev) => {
                  const filtered = prev.filter((m) => m.id !== tempAssistantId);
                  return [...filtered, data.assistantMessage];
                });
                
                // Mascot happy reaction on completion
                setExpression("happy");
                setAnimation("wave");
                setTimeout(() => {
                  setExpression("neutral");
                  setAnimation("float");
                }, 4000);
              } else if (event === "error") {
                throw new Error(data.error || "Unknown stream error");
              }
            } catch (jsonErr) {
              console.error("Error parsing event JSON:", jsonErr);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      // Mascot error reaction
      setExpression("blink");
      setAnimation("none");
      setTimeout(() => {
        setExpression("neutral");
        setAnimation("float");
      }, 3000);
      
      // Clean any temporary messages and add error message
      setMessages((prev) => {
        const filtered = prev.filter(
          (m) => m.id !== "temp-user-id" && m.id !== "temp-assistant-id"
        );
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Sorry, I encountered an error: ${err.message || "Unknown error occurred"}. Please try again.`,
          createdAt: new Date().toISOString(),
        };
        return [...filtered, errorMessage];
      });
    } finally {
      setLoading(false);
    }
  };

  // Simple formatter for bullet points, bolding and code blocks
  const renderMessageContent = (content: string) => {
    const lines = content.split("\n");
    let inCodeBlock = false;
    let codeContent: string[] = [];

    return lines.map((line, idx) => {
      // Code block detection
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          inCodeBlock = false;
          const codeText = codeContent.join("\n");
          codeContent = [];
          return (
            <pre key={idx} className="bg-zinc-50 border border-zinc-200 rounded-md p-3 my-2.5 overflow-x-auto text-xs font-mono text-zinc-900">
              <code>{codeText}</code>
            </pre>
          );
        } else {
          inCodeBlock = true;
          return null;
        }
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return null;
      }

      // Check for bullet list
      const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
      const displayLine = line.replace(/^[-*]\s+/, "");

      // Split by markdown link syntax [label](url) or bold syntax **text**
      const regex = /(\[.*?\]\(.*?\))|(\*\*.*?\*\*)/g;
      const parts = displayLine.split(regex);

      const renderedLine = parts.map((part, pIdx) => {
        if (!part) return null;

        // Check for markdown link: [label](url)
        if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
          const linkText = part.substring(1, part.indexOf("]"));
          const linkUrl = part.substring(part.indexOf("](") + 2, part.length - 1);

          const isPdf = linkText.toLowerCase().endsWith(".pdf") || linkText.includes("/");
          if (isPdf) {
            const linkParts = linkText.split("/");
            const fileName = linkParts.pop() || "";
            const subject = linkParts.pop() || "";
            const cleanSubject = subject.replace(/_/g, " ").replace(/-/g, " ").trim();
            const cleanFileName = fileName.replace(/_/g, " ").replace(/-/g, " ").replace(/\.pdf$/i, "").trim();
            const badgeLabel = cleanSubject ? `${cleanSubject} (${cleanFileName})` : cleanFileName;

            return (
              <a
                key={pIdx}
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-250 border border-zinc-250 border-l-2 border-l-zinc-900 text-zinc-800 hover:text-zinc-950 text-xs font-semibold font-mono transition-all duration-150 align-middle mx-1 shadow-none group/link"
                title={linkText}
              >
                <FileText className="w-3.5 h-3.5 text-zinc-900 transition-colors" />
                <span className="truncate max-w-[200px] md:max-w-[300px]">{badgeLabel}</span>
              </a>
            );
          } else {
            return (
              <a
                key={pIdx}
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-105 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 hover:text-zinc-900 text-xs font-semibold font-mono transition-all duration-150 align-middle mx-1 shadow-none group/link"
              >
                <span className="truncate max-w-[150px]">{linkText}</span>
                <ExternalLink className="w-3 h-3 text-zinc-550 transition-colors ml-0.5" />
              </a>
            );
          }
        }

        // Check for bold text: **text**
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-bold text-zinc-950 font-mono">
              {part.slice(2, -2)}
            </strong>
          );
        }

        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-5 list-disc text-zinc-700 font-semibold my-1 text-sm leading-relaxed font-mono">
            {renderedLine}
          </li>
        );
      }

      return (
        <p key={idx} className="text-zinc-700 font-semibold text-sm leading-relaxed my-2 min-h-[1.25rem] font-mono">
          {renderedLine}
        </p>
      );
    });
  };

  const sampleQuestions = [
    "What are the typical questions asked about Software Engineering design patterns?",
    "Explain the concepts of database normalizations with examples from the papers.",
    "Can you summarize the core modules in the 2024 Computer Networks exam paper?",
  ];

  return (
    <div className="flex flex-col flex-1 h-full bg-zinc-50/50 relative min-w-0">
      {/* Top Session Header */}
      <div className="h-16 border-b border-zinc-200 px-4 md:px-6 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 transition mr-1"
              title="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 flex-shrink-0 relative overflow-hidden">
            <MascotViewport
              expression={expression}
              animation={animation}
              backdropColor="transparent"
            />
          </div>
          <span className="text-sm font-semibold text-zinc-900 font-mono">
            {sessionId ? "Study Session" : "New AI Conversation"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Model Selector Dropdown */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as "gemini" | "grok")}
            className="bg-zinc-50 border border-zinc-200 text-[10px] md:text-xs text-zinc-700 font-mono rounded px-2 py-1 md:px-2.5 md:py-1.5 focus:outline-none focus:border-zinc-900 focus:bg-white transition cursor-pointer"
          >
            <option value="gemini">Gemini 2.5 Flash</option>
            <option value="grok">Grok Beta</option>
          </select>

          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-zinc-900 animate-pulse" />
            <span className="hidden sm:inline">Powered by {selectedModel === "grok" ? "Grok" : "Gemini"} RAG</span>
            <span className="sm:hidden">{selectedModel === "grok" ? "Grok" : "RAG"}</span>
          </div>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 md:gap-6 min-h-0">
        {fetchingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          // Welcome / Guide Panel
          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto text-center gap-6">
            <div className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0 relative">
              <MascotViewport
                expression={expression}
                animation={animation}
                backdropColor="transparent"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight font-mono">
                Welcome to SPPU University Chatbot!
              </h2>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed font-semibold">
                Analyze previous university exam papers, lectures, and resources to prepare smarter.
                I extract text, map it into a Qdrant Vector Database, and use Gemini to guide your study.
              </p>
            </div>

            <div className="w-full flex flex-col gap-3.5 text-left border border-zinc-200 bg-white rounded p-5 mt-2 shadow-none">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <HelpCircle className="w-4 h-4 text-zinc-900" /> Try Asking Questions Like:
              </span>
              <div className="flex flex-col gap-2">
                {sampleQuestions.map((q, idx) => (
                  <button
                     key={idx}
                     onClick={() => setInput(q)}
                     className="text-xs text-zinc-750 hover:text-zinc-955 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 p-2.5 rounded text-left transition-colors duration-150 font-mono"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Render messages list
          <div className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto w-full">
            {messages.map((msg) => {
              const isAi = msg.role === "assistant";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 md:gap-4 ${isAi ? "items-start" : "items-start flex-row-reverse"}`}
                >
                  {/* Icon Avatar */}
                  <div
                    className={`w-9 h-9 rounded flex items-center justify-center shrink-0 border ${isAi
                        ? "bg-zinc-100 border-zinc-250 text-zinc-900"
                        : "bg-zinc-50 border-zinc-200 text-zinc-700"
                      }`}
                  >
                    {isAi ? (
                      <BotIcon
                        isLive={msg.id === lastAssistantMessageId}
                        expression={expression}
                        animation={animation}
                      />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>

                  {/* Message Balloon */}
                  <div
                    className={`max-w-[85%] md:max-w-[80%] rounded px-3.5 py-2.5 md:px-4 md:py-3 border ${isAi
                        ? "bg-white border-zinc-200 text-zinc-800"
                        : "bg-zinc-900 border-zinc-900 text-white font-mono"
                      }`}
                  >
                    {isAi ? (() => {
                      const hasThoughtStart = msg.content.includes("<thought>");
                      const hasThoughtEnd = msg.content.includes("</thought>");

                      const hasThought = hasThoughtStart;
                      let thoughtContent = "";
                      let mainContent = msg.content;

                      if (hasThoughtStart) {
                        const startIdx = msg.content.indexOf("<thought>") + "<thought>".length;
                        if (hasThoughtEnd) {
                          const endIdx = msg.content.indexOf("</thought>");
                          thoughtContent = msg.content.substring(startIdx, endIdx).trim();
                          mainContent = msg.content.substring(endIdx + "</thought>".length).trim();
                        } else {
                          thoughtContent = msg.content.substring(startIdx).trim();
                          mainContent = "";
                        }
                      }

                      // Auto expand while actively streaming the thinking block, otherwise use state
                      const isExpanded = expandedThoughts[msg.id] !== undefined
                        ? !!expandedThoughts[msg.id]
                        : (hasThoughtStart && !hasThoughtEnd);

                      return (
                        <div className="flex flex-col">
                          {hasThought && (
                            <div className="flex flex-col mb-1.5 select-none font-mono">
                              <button
                                onClick={() => toggleThought(msg.id)}
                                className="inline-flex items-center gap-1.5 py-1 px-2 -ml-1 rounded text-[10px] font-bold text-zinc-650 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 transition-all w-fit cursor-pointer align-middle"
                              >
                                <Brain className="w-3.5 h-3.5 text-zinc-900 animate-pulse-subtle" />
                                <span>
                                  {!hasThoughtEnd
                                    ? "Thinking..."
                                    : isExpanded
                                      ? "Hide Thinking Process"
                                      : "Show Thinking Process"}
                                </span>
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-zinc-400" />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="mt-2 pl-3 pr-2 py-2 border-l-2 border-zinc-400 bg-zinc-50 rounded-r text-[11px] text-zinc-500 font-mono leading-relaxed whitespace-pre-wrap select-text max-w-full overflow-hidden mb-2">
                                  {thoughtContent || "Analyzing question and context..."}
                                </div>
                              )}
                            </div>
                          )}
                          {(!hasThought || hasThoughtEnd || mainContent) && (
                            <div className="prose max-w-none text-zinc-800 prose-headings:text-zinc-900 prose-a:text-zinc-950">
                              {renderMessageContent(mainContent)}
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">{msg.content}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 md:gap-4 items-start">
                <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 border bg-zinc-100 border-zinc-250 text-zinc-900">
                  <BotIcon
                    isLive={true}
                    expression={expression}
                    animation={animation}
                  />
                </div>
                <div className="bg-white border border-zinc-200 rounded px-4 py-3.5 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-zinc-900 animate-spin" />
                  <span className="text-xs text-zinc-500 font-medium font-mono">Searching vector DB & drafting answer...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Message Form */}
      <div className="p-4 md:p-6 border-t border-zinc-200 bg-white">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              loading
                ? "Please wait while replying..."
                : "Ask anything about syllabus, exam papers, or topics..."
            }
            disabled={loading}
            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded pl-4 pr-12 py-3 md:py-3.5 text-sm focus:outline-none focus:bg-white focus:border-zinc-900 transition-all placeholder:text-zinc-400 shadow-none font-mono"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 px-3 py-2 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white transition flex items-center justify-center border border-zinc-900"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
