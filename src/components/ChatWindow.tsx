"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Loader2, Sparkles, HelpCircle, Menu } from "lucide-react";

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

export default function ChatWindow({ sessionId, onSessionStarted, onToggleSidebar }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const data = await res.json();
      
      // Update session ID if it was newly created
      if (!sessionId && data.sessionId) {
        onSessionStarted(data.sessionId);
      }

      // Replace temp message and append response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== "temp-user-id");
        return [...filtered, data.userMessage, data.assistantMessage];
      });
    } catch (err) {
      console.error("Chat error:", err);
      // Append an error message from system
      const errorMessage: Message = {
        id: "error-id",
        role: "assistant",
        content: "Sorry, I encountered an error processing that request. Please verify your Gemini API key and try again.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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
            <pre key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 my-2.5 overflow-x-auto text-xs font-mono text-indigo-300">
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
          return (
            <a
              key={pIdx}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline font-semibold transition-colors duration-150"
            >
              {linkText}
            </a>
          );
        }

        // Check for bold text: **text**
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-bold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }

        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-5 list-disc text-zinc-300 my-1 text-sm leading-relaxed">
            {renderedLine}
          </li>
        );
      }

      return (
        <p key={idx} className="text-zinc-300 text-sm leading-relaxed my-2 min-h-[1.25rem]">
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
    <div className="flex flex-col flex-1 h-full bg-zinc-900/10 backdrop-blur-md relative min-w-0">
      {/* Top Session Header */}
      <div className="h-16 border-b border-zinc-900 px-4 md:px-6 flex items-center justify-between bg-zinc-950/20">
        <div className="flex items-center gap-2">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-lg border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white transition mr-1"
              title="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <Bot className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-semibold text-white">
            {sessionId ? "Study Session" : "New AI Conversation"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="hidden sm:inline">Powered by Gemini RAG</span>
          <span className="sm:hidden">RAG</span>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 md:gap-6 min-h-0">
        {fetchingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          // Welcome / Guide Panel
          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto text-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-950/20">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Welcome to SPPU University Chatbot!
              </h2>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                Analyze previous university exam papers, lectures, and resources to prepare smarter. 
                I extract text, map it into a Qdrant Vector Database, and use Gemini to guide your study.
              </p>
            </div>

            <div className="w-full flex flex-col gap-3.5 text-left border border-zinc-800 bg-zinc-950/30 rounded-2xl p-5 mt-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-400" /> Try Asking Questions Like:
              </span>
              <div className="flex flex-col gap-2">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(q)}
                    className="text-xs text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-850 border border-zinc-850 p-2.5 rounded-xl text-left transition-colors duration-150"
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
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-md ${
                      isAi
                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-indigo-950/20"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300"
                    }`}
                  >
                    {isAi ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>

                  {/* Message Balloon */}
                  <div
                    className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-3.5 py-2.5 md:px-4 md:py-3 border shadow-lg ${
                      isAi
                        ? "bg-zinc-950/30 border-zinc-900 text-zinc-100 shadow-zinc-950/30"
                        : "bg-indigo-650/90 border-indigo-600 text-white shadow-indigo-950/20"
                    }`}
                  >
                    {isAi ? (
                      <div className="prose prose-invert max-w-none">
                        {renderMessageContent(msg.content)}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 md:gap-4 items-start">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl px-4 py-3.5 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span className="text-xs text-zinc-500">Searching vector DB & drafting answer...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Message Form */}
      <div className="p-4 md:p-6 border-t border-zinc-900 bg-zinc-950/10">
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
            className="w-full bg-zinc-950/40 border border-zinc-850 text-white rounded-2xl pl-4 pr-12 py-3 md:py-3.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 px-3 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 text-white transition flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
