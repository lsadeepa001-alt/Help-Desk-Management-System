import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  MessageCircle,
  CircleHelp,
  Ticket,
  Send,
  Trash2,
  X,
  Wifi,
  KeyRound,
  Laptop,
  CheckCircle2,
  Plus,
} from 'lucide-react';

const API = 'http://localhost:8080/api';

export default function AiChatbotModal({ onNavigateToCreateTicket }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Welcome to UniAssist 360 Support Assistant. How may I assist you today? You can ask about campus Wi-Fi, LMS password resets, software licensing, lab facilities, or track an existing ticket by number.",
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

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputText('');
    setLoading(true);

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
            text: `**Ticket Details for ${t.ticketNumber}**\n\n` +
                  `• Title: ${t.title}\n` +
                  `• Status: ${t.status}\n` +
                  `• Priority: ${t.priority}\n` +
                  `• Assigned To: ${t.assignedTo}\n` +
                  (t.resolutionNotes ? `• Resolution Notes: ${t.resolutionNotes}` : ''),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            canDeflect: false,
          };
          setMessages((prev) => [...prev, botReply]);
          setLoading(false);
          return;
        }
      } catch {
        // Fall back to normal AI ask
      }
    }

    try {
      const historyPayload = messages.map((m) => ({ sender: m.sender, text: m.text }));
      const res = await axios.post(`${API}/kb/chatbot/ask`, {
        message: query.trim(),
        history: historyPayload,
      });

      const botReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: res.data.reply || 'I am here to assist with university services.',
        matchedArticleId: res.data.matchedArticleId,
        canDeflect: res.data.canDeflect !== false,
        needsEscalation: res.data.needsEscalation === true,
        userQuery: query.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botReply]);
      if (!isOpen) setUnreadCount((prev) => prev + 1);
    } catch (err) {
      console.error('Chatbot error:', err);
      const fallbackReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Unable to connect to support assistant service right now. Please submit a support ticket directly.',
        canDeflect: true,
        userQuery: query.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackReply]);
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
    const description = `Issue reported via UniAssist 360 Support Assistant:\n\nUser Question:\n"${userQuery}"\n\nAssistant Response:\n"${botReplyText.substring(0, 250)}..."`;

    setIsOpen(false);
    if (onNavigateToCreateTicket) {
      onNavigateToCreateTicket({ title, description });
    }
  };

  const handleResolvedInChat = (msgId) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, isResolved: true } : m)));
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* ── Floating Launcher Trigger ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative bg-blue-600 hover:bg-blue-500 text-white rounded-full p-3.5 sm:px-4 sm:py-3 shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/50 transition duration-200 flex items-center gap-2.5 border border-blue-400/30"
          aria-label="Open Support Assistant"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-slate-900" />
          </div>
          <span className="font-semibold text-xs tracking-wide hidden sm:inline">Support Assistant</span>

          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ── Chat Window ── */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-slate-950 p-4 px-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <CircleHelp className="w-5 h-5" />
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border-2 border-slate-900" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white leading-tight flex items-center gap-1.5">
                  Support Assistant
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium">
                    Self-Service
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  <span>Online • University Assistant</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([messages[0]])}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
                title="Clear Chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="bg-slate-950/60 border-b border-slate-800 px-3 py-2 flex gap-1.5 overflow-x-auto hide-scrollbar text-xs">
            <button
              onClick={() => handleSend('How do I connect to campus Wi-Fi?')}
              className="bg-slate-900 hover:bg-blue-600/20 hover:text-blue-300 text-slate-300 px-2.5 py-1 rounded-full border border-slate-800 whitespace-nowrap transition flex items-center gap-1.5 text-[11px]"
            >
              <Wifi className="w-3 h-3 text-blue-400" />
              <span>Wi-Fi Setup</span>
            </button>
            <button
              onClick={() => handleSend('How to reset LMS student password?')}
              className="bg-slate-900 hover:bg-blue-600/20 hover:text-blue-300 text-slate-300 px-2.5 py-1 rounded-full border border-slate-800 whitespace-nowrap transition flex items-center gap-1.5 text-[11px]"
            >
              <KeyRound className="w-3 h-3 text-amber-400" />
              <span>Password Reset</span>
            </button>
            <button
              onClick={() => handleSend('MATLAB software license request')}
              className="bg-slate-900 hover:bg-blue-600/20 hover:text-blue-300 text-slate-300 px-2.5 py-1 rounded-full border border-slate-800 whitespace-nowrap transition flex items-center gap-1.5 text-[11px]"
            >
              <Laptop className="w-3 h-3 text-sky-400" />
              <span>Software Keys</span>
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
                    <div className="w-7 h-7 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                      <MessageCircle className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-3.5 shadow-md ${
                      m.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-slate-950 border border-slate-800 text-slate-100 rounded-tl-none space-y-2'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                    <div
                      className={`text-[10px] text-right mt-1 ${
                        m.sender === 'user' ? 'text-blue-200' : 'text-slate-500'
                      }`}
                    >
                      {m.time}
                    </div>
                  </div>
                </div>

                {/* Prominent Escalation Action */}
                {m.sender === 'bot' && m.needsEscalation && (
                  <div className="ml-9 mt-2 p-3.5 bg-slate-950 border border-amber-500/30 rounded-2xl space-y-2.5 max-w-[85%] shadow-lg">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <Ticket className="w-3.5 h-3.5 text-amber-400" />
                      <span>Formal Support Ticket Required</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      No automated knowledge base match was found. Submit a ticket directly to departmental agents for personal review.
                    </p>
                    <button
                      onClick={() =>
                        handleCreateTicketFromChat(m.userQuery || 'Technical Inquiry', m.text)
                      }
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Support Ticket</span>
                    </button>
                  </div>
                )}

                {/* Deflection Action Buttons */}
                {m.sender === 'bot' && m.canDeflect && !m.needsEscalation && !m.isResolved && (
                  <div className="ml-9 mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 max-w-[82%]">
                    <p className="text-[11px] font-semibold text-slate-300">Did this resolve your inquiry?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolvedInChat(m.id)}
                        className="flex-1 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold rounded-lg transition flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Resolved</span>
                      </button>
                      <button
                        onClick={() =>
                          handleCreateTicketFromChat(m.userQuery || 'Technical Issue', m.text)
                        }
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg transition flex items-center justify-center gap-1"
                      >
                        <Ticket className="w-3 h-3 text-blue-400" />
                        <span>Create Ticket</span>
                      </button>
                    </div>
                  </div>
                )}

                {m.isResolved && (
                  <div className="ml-9 mt-1 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Marked as resolved. Glad we could assist you.</span>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-7 h-7 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xs">
                  <MessageCircle className="w-3.5 h-3.5" />
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Form */}
          <div className="p-3 bg-slate-950 border-t border-slate-800">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/50">
              <input
                type="text"
                placeholder="Ask Support Assistant a question..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs focus:outline-none py-1"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !inputText.trim()}
                className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition"
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[10px] text-center text-slate-500 mt-1">
              Powered by Google Gemini & University Knowledge Base
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
