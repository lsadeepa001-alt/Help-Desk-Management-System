import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:8080/api';

export default function AiChatbotModal({ onNavigateToCreateTicket }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "👋 Hi there! I am **UniAssist 360**, your AI Help Desk Assistant.\nHow can I help you today? Ask me about campus Wi-Fi, LMS passwords, software keys, lab PCs, or checking ticket status!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  const handleSend = async (customText = null) => {
    const query = customText || inputText;
    if (!query || !query.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputText('');
    setLoading(true);

    // Check if query is ticket status check
    const statusMatch = query.match(/TICK-\d{4}-\d{4}/i);
    if (statusMatch) {
      try {
        const ticketNum = statusMatch[0];
        const res = await axios.get(`${API}/kb/chatbot/ticket-status/${ticketNum}`);
        if (res.data.found) {
          const t = res.data;
          const botReply = {
            id: Date.now() + 1,
            sender: 'bot',
            text: `🎫 **Ticket Details for ${t.ticketNumber}**\n\n` +
                  `• **Title:** ${t.title}\n` +
                  `• **Status:** ${t.status}\n` +
                  `• **Priority:** ${t.priority}\n` +
                  `• **Assigned To:** ${t.assignedTo}\n` +
                  (t.resolutionNotes ? `• **Resolution Notes:** ${t.resolutionNotes}` : ''),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            canDeflect: false,
          };
          setMessages(prev => [...prev, botReply]);
          setLoading(false);
          return;
        }
      } catch {
        // continue to normal AI ask
      }
    }

    try {
      const historyPayload = messages.map(m => ({ sender: m.sender, text: m.text }));
      const res = await axios.post(`${API}/kb/chatbot/ask`, {
        message: query.trim(),
        history: historyPayload,
      });

      const botReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: res.data.reply || "I am here to assist with university services.",
        matchedArticleId: res.data.matchedArticleId,
        canDeflect: res.data.canDeflect !== false,
        userQuery: query.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botReply]);
      if (!isOpen) setUnreadCount(prev => prev + 1);
    } catch (err) {
      console.error('Chatbot error:', err);
      const fallbackReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: "I am having trouble connecting right now. Please try again or create a ticket directly.",
        canDeflect: true,
        userQuery: query.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, fallbackReply]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateTicketFromChat = (userQuery, botReplyText) => {
    const title = userQuery.length > 50 ? userQuery.substring(0, 50) + '...' : userQuery;
    const description = `Issue reported via UniAssist 360 AI Chatbot:\n\nUser Question:\n"${userQuery}"\n\nAI Suggested Response:\n"${botReplyText.substring(0, 250)}..."`;

    setIsOpen(false);
    if (onNavigateToCreateTicket) {
      onNavigateToCreateTicket({ title, description });
    }
  };

  const handleResolvedInChat = (msgId) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isResolved: true } : m));
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* ── Trigger Launcher Button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-full p-4 shadow-2xl shadow-indigo-500/40 hover:scale-105 transition duration-300 flex items-center gap-3 border border-indigo-400/30"
          aria-label="Open AI Help Desk Assistant"
        >
          <div className="relative">
            <span className="text-2xl">🤖</span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
          </div>
          <span className="font-bold text-sm pr-1 hidden sm:inline">Ask UniAssist 360</span>

          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ── Chat Window Box ── */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900/90 via-slate-800 to-purple-900/90 p-4 px-5 border-b border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl bg-indigo-600/80 flex items-center justify-center text-xl shadow-md border border-indigo-400/30">
                🤖
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white leading-tight flex items-center gap-1.5">
                  UniAssist 360
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-mono">AI 1.5</span>
                </h3>
                <p className="text-[11px] text-slate-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Online · University Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([messages[0]])}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded hover:bg-slate-800 transition"
                title="Clear Chat"
              >
                🗑️
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="bg-slate-950/60 border-b border-slate-800/80 px-3 py-2 flex gap-1.5 overflow-x-auto hide-scrollbar text-xs">
            <button onClick={() => handleSend("How do I connect to campus Wi-Fi?")}
              className="bg-slate-800 hover:bg-indigo-600/60 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-700 whitespace-nowrap transition">
              📶 Wi-Fi Setup
            </button>
            <button onClick={() => handleSend("How to reset LMS student password?")}
              className="bg-slate-800 hover:bg-indigo-600/60 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-700 whitespace-nowrap transition">
              🔑 Password Reset
            </button>
            <button onClick={() => handleSend("MATLAB software license request")}
              className="bg-slate-800 hover:bg-indigo-600/60 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-700 whitespace-nowrap transition">
              💻 Software Keys
            </button>
          </div>

          {/* Message Stream Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex gap-2 max-w-[85%]">
                  {m.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-full bg-indigo-600/80 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      🤖
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-3.5 shadow-md ${
                      m.sender === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                        : 'bg-slate-800 border border-slate-700/80 text-slate-100 rounded-tl-none space-y-2'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>

                    <div className={`text-[10px] text-right mt-1 ${m.sender === 'user' ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {m.time}
                    </div>
                  </div>
                </div>

                {/* Deflection Action Buttons (for bot messages that offer deflection) */}
                {m.sender === 'bot' && m.canDeflect && !m.isResolved && (
                  <div className="ml-9 mt-2 p-3 bg-slate-800/80 border border-indigo-500/30 rounded-xl space-y-2 max-w-[82%]">
                    <p className="text-[11px] font-semibold text-indigo-300">Did this resolve your inquiry?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolvedInChat(m.id)}
                        className="flex-1 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg transition"
                      >
                        Yes, Thanks! 😊
                      </button>
                      <button
                        onClick={() => handleCreateTicketFromChat(m.userQuery || 'Technical Issue', m.text)}
                        className="flex-1 py-1.5 bg-rose-600/80 hover:bg-rose-500 text-white text-[11px] font-semibold rounded-lg transition"
                      >
                        No, Create Ticket 🎫
                      </button>
                    </div>
                  </div>
                )}

                {m.isResolved && (
                  <div className="ml-9 mt-1 text-[11px] text-emerald-400 font-medium">
                    ✅ Marked as Resolved. Glad we could help!
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-7 h-7 rounded-full bg-indigo-600/80 text-white flex items-center justify-center text-xs">
                  🤖
                </div>
                <div className="bg-slate-800 border border-slate-700/80 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Form */}
          <div className="p-3 bg-slate-950/90 border-t border-slate-800">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/50">
              <input
                type="text"
                placeholder="Ask UniAssist 360 a question..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs focus:outline-none py-1"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !inputText.trim()}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition"
                title="Send Message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <div className="text-[10px] text-center text-slate-500 mt-1">
              Powered by Google Gemini 1.5 & UniKB Engine
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
