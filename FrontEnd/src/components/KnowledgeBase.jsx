import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:8080/api';

const categoryBadges = {
  IT_SERVICES: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  ACADEMIC_AFFAIRS: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  MAINTENANCE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  LIBRARY: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  SECURITY: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

const KM_ROLES = ['KNOWLEDGE_MANAGER', 'SYSTEM_ADMINISTRATOR'];

export default function KnowledgeBase({ onOpenArticleInChat }) {
  const { user, isAuthenticated } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [faqOnly, setFaqOnly] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Modal for Create / Edit article
  const [showEditor, setShowEditor] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: null,
    title: '',
    content: '',
    category: 'IT_SERVICES',
    keywords: '',
    isFaq: false,
  });
  const [editorMsg, setEditorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const canEdit = isAuthenticated && KM_ROLES.includes(user?.role);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (searchQuery.trim()) params.query = searchQuery.trim();
      if (faqOnly) params.faqOnly = true;

      const res = await axios.get(`${API}/kb/articles`, { params });
      setArticles(res.data);
    } catch (err) {
      console.error('Error fetching KB articles:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, faqOnly]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleOpenArticle = async (id) => {
    try {
      const res = await axios.get(`${API}/kb/articles/${id}`);
      setSelectedArticle(res.data);
      // update local view count
      setArticles(prev => prev.map(a => a.id === id ? { ...a, viewCount: res.data.viewCount } : a));
    } catch {
      // fallback to article in list
      const art = articles.find(a => a.id === id);
      if (art) setSelectedArticle(art);
    }
  };

  const handleSaveArticle = async (e) => {
    e.preventDefault();
    if (!editFormData.title.trim() || !editFormData.content.trim()) {
      setEditorMsg('Please fill in both title and content.');
      return;
    }

    setSaving(true);
    setEditorMsg('');
    try {
      await axios.post(`${API}/kb/articles`, {
        ...editFormData,
        authorId: user?.id,
      });
      setShowEditor(false);
      setEditFormData({ id: null, title: '', content: '', category: 'IT_SERVICES', keywords: '', isFaq: false });
      fetchArticles();
    } catch (err) {
      setEditorMsg('Failed to save article. ' + (err.response?.data?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (article) => {
    setEditFormData({
      id: article.id,
      title: article.title,
      content: article.content,
      category: article.category || 'IT_SERVICES',
      keywords: article.keywords || '',
      isFaq: article.isFaq,
    });
    setShowEditor(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await axios.delete(`${API}/kb/articles/${id}`);
      if (selectedArticle?.id === id) setSelectedArticle(null);
      fetchArticles();
    } catch (err) {
      alert('Failed to delete article.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Header Banner ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-900/50 via-slate-800/90 to-purple-900/50 border border-slate-700/60 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <span className="inline-block px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider">
            Module 4: Knowledge Base & Smart Assistant
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            📚 Knowledge Base & Self-Service FAQ Portal
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Search step-by-step troubleshooting guides, university IT policies, software activation steps, and campus maintenance information.
          </p>
        </div>
        <div className="absolute right-6 bottom-0 opacity-10 text-9xl pointer-events-none select-none">📖</div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Search by keywords (e.g. Wi-Fi, LMS password, MATLAB, hostel repair)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 pl-11 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition"
            />
            <svg className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setFaqOnly(!faqOnly)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 whitespace-nowrap ${
                faqOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md'
                  : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <span>⭐</span> FAQs Only
            </button>

            {canEdit && (
              <button
                onClick={() => {
                  setEditFormData({ id: null, title: '', content: '', category: 'IT_SERVICES', keywords: '', isFaq: false });
                  setShowEditor(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>✏️</span> Publish Article
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1 hide-scrollbar">
          {[
            { id: 'ALL', label: 'All Categories', icon: '🌐' },
            { id: 'IT_SERVICES', label: 'IT Services', icon: '💻' },
            { id: 'ACADEMIC_AFFAIRS', label: 'Academic Affairs', icon: '🎓' },
            { id: 'MAINTENANCE', label: 'Maintenance', icon: '🛠️' },
            { id: 'LIBRARY', label: 'Library', icon: '📚' },
            { id: 'SECURITY', label: 'Campus Security', icon: '🛡️' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-700/60 hover:bg-slate-700/60 hover:text-slate-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Articles Grid / Loading / Empty ── */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 space-y-3">
          <svg className="w-8 h-8 animate-spin mx-auto text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-sm font-medium">Searching Knowledge Base...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-12 text-center space-y-4">
          <div className="text-5xl">🔍</div>
          <h3 className="text-lg font-semibold text-slate-200">No Matching Articles Found</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Try adjusting your search terms or selecting a different category. You can also chat with our UniAssist 360 AI Assistant!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map(article => (
            <div
              key={article.id}
              onClick={() => handleOpenArticle(article.id)}
              className="bg-slate-800/90 border border-slate-700/70 hover:border-indigo-500/50 rounded-2xl p-5 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 transition duration-200 cursor-pointer flex flex-col justify-between group relative"
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${categoryBadges[article.category] || 'bg-slate-700 text-slate-300'}`}>
                    {article.category?.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {article.isFaq && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                        ⭐ FAQ
                      </span>
                    )}
                    <span>👁️ {article.viewCount}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition line-clamp-2 leading-snug">
                  {article.title}
                </h3>

                {/* Preview text */}
                <p className="text-slate-300 text-xs line-clamp-3 leading-relaxed">
                  {article.content}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                <span className="text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Read Full Guide →
                </span>
                {canEdit && (
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditClick(article)}
                      className="px-2 py-1 bg-slate-700 hover:bg-indigo-600 text-slate-200 rounded text-[11px] font-medium transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(article.id)}
                      className="px-2 py-1 bg-slate-700 hover:bg-rose-600 text-slate-200 rounded text-[11px] font-medium transition"
                    >
                      Del
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Article Reader Modal ── */}
      {selectedArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && setSelectedArticle(null)}
        >
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="bg-slate-800/90 border-b border-slate-700/60 p-6 flex justify-between items-start gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${categoryBadges[selectedArticle.category] || ''}`}>
                    {selectedArticle.category?.replace('_', ' ')}
                  </span>
                  {selectedArticle.isFaq && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                      ⭐ FAQ Guide
                    </span>
                  )}
                  <span className="text-xs text-slate-400">👁️ {selectedArticle.viewCount} views</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">{selectedArticle.title}</h2>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap flex-1">
              {selectedArticle.content}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-800/90 border-t border-slate-700/60 p-4 px-6 flex justify-between items-center text-xs">
              <span className="text-slate-400">
                Author: <strong className="text-indigo-300">{selectedArticle.author?.fullName || 'University IT'}</strong>
              </span>
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Publish / Edit Modal ── */}
      {showEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && setShowEditor(false)}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-700/60 pb-4">
              <h2 className="text-xl font-extrabold text-white">
                {editFormData.id ? '✏️ Edit KB Article' : '✨ Publish New Knowledge Base Article'}
              </h2>
              <button onClick={() => setShowEditor(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {editorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-xl">
                ⚠️ {editorMsg}
              </div>
            )}

            <form onSubmit={handleSaveArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Article Title *
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="e.g. Connecting to Campus VPN"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={editFormData.category}
                    onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="IT_SERVICES">IT Services</option>
                    <option value="ACADEMIC_AFFAIRS">Academic Affairs</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="LIBRARY">Library</option>
                    <option value="SECURITY">Campus Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Keywords (comma separated)
                  </label>
                  <input
                    type="text"
                    value={editFormData.keywords}
                    onChange={e => setEditFormData({ ...editFormData, keywords: e.target.value })}
                    placeholder="wifi, portal, vpn"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Article Content / Step-by-Step Guide *
                </label>
                <textarea
                  rows={6}
                  value={editFormData.content}
                  onChange={e => setEditFormData({ ...editFormData, content: e.target.value })}
                  placeholder="Provide clear instructions..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFaqCheck"
                  checked={editFormData.isFaq}
                  onChange={e => setEditFormData({ ...editFormData, isFaq: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                />
                <label htmlFor="isFaqCheck" className="text-xs text-slate-300 font-medium">
                  Mark as Featured FAQ Guide
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-indigo-500/20"
                >
                  {saving ? 'Saving...' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
