import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8080/api/tickets';

const CreateTicket = ({ onTicketCreated, onOpenAuth, prefillData }) => {
  const { user, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    title: prefillData?.title || '',
    description: prefillData?.description || '',
    priority: 'MEDIUM',
    location: '',
    categoryId: '1',
  });

  useEffect(() => {
    if (prefillData) {
      setFormData(prev => ({
        ...prev,
        title: prefillData.title || prev.title,
        description: prefillData.description || prev.description,
      }));
    }
  }, [prefillData]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const categories = [
    { id: 1, name: 'Network & Wi-Fi' },
    { id: 2, name: 'LMS & Student Portal' },
    { id: 3, name: 'Hardware & Lab Equipment' },
    { id: 4, name: 'Software & Licensing' },
    { id: 5, name: 'Account & Security' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      setMessage({
        type: 'error',
        text: 'You must be logged in to submit a ticket.',
      });
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      setMessage({ type: 'error', text: 'Please fill in both the title and description fields.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    const generatedTicketNum = `TICK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payload = {
      ticketNumber: generatedTicketNum,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      status: 'OPEN',
      location: formData.location || 'Campus Main Building',
      category: { id: parseInt(formData.categoryId) },
      createdBy: { id: user.id },
    };

    try {
      const response = await axios.post(API_URL, payload);
      setMessage({
        type: 'success',
        text: `Ticket ${response.data.ticketNumber || generatedTicketNum} created successfully under ${user.fullName || user.username}!`,
      });

      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        location: '',
        categoryId: '1',
      });

      if (onTicketCreated) {
        onTicketCreated();
      }
    } catch (err) {
      console.error('Error submitting ticket:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to create ticket. Please verify backend server status.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 shadow-xl text-center space-y-5 backdrop-blur-md">
        <div className="text-5xl">🔒</div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Authentication Required</h2>
        <p className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
          Please sign in to your University account or register to submit technical helpdesk tickets under your profile.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => onOpenAuth && onOpenAuth('login')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-500/20 text-sm"
          >
            Sign In
          </button>
          <button
            onClick={() => onOpenAuth && onOpenAuth('register')}
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition text-sm"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
      <div className="border-b border-slate-700/60 pb-4 flex justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>➕</span> Submit New Ticket
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Submitting as <span className="text-indigo-400 font-semibold">{user.fullName}</span> ({user.role})
          </p>
        </div>
        <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold">
          {user.department || 'General'}
        </span>
      </div>

      {prefillData && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold rounded-xl flex items-center gap-2">
          <span>🤖</span> Form pre-filled from UniAssist 360 AI Chatbot deflection conversation.
        </div>
      )}

      {message.text && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{message.type === 'success' ? '✅' : '❌'}</span>
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Ticket Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Wi-Fi disconnection issue in Science Building"
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Detailed Description <span className="text-rose-400">*</span>
          </label>
          <textarea
            name="description"
            rows="4"
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide relevant details, steps to reproduce, error codes, or specific locations..."
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition"
            required
          ></textarea>
        </div>

        {/* Category & Priority Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Category
            </label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Priority Level
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition"
            >
              <option value="LOW">Low - Routine issue</option>
              <option value="MEDIUM">Medium - Normal priority</option>
              <option value="HIGH">High - Urgent academic blocker</option>
              <option value="URGENT">Urgent - System wide outage</option>
            </select>
          </div>
        </div>

        {/* Location Row */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Location / Room
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g. Main Library 2nd Floor, Lab 03"
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Submitting Ticket...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Submit Ticket</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTicket;
