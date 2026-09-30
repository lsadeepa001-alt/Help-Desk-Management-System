import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Search,
  Star,
  Plus,
  Globe,
  Laptop,
  Wrench,
  Shield,
  Eye,
  ArrowRight,
  X,
  AlertCircle,
  Trash2,
  Edit3,
} from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';

const API = 'http://localhost:8080/api';

const categoryBadges = {
  IT: 'info',
  IT_SERVICES: 'info',
  ACADEMIC_AFFAIRS: 'success',
  MAINTENANCE: 'warning',
  LIBRARY: 'neutral',
  SECURITY: 'error',
};

const KM_ROLES = ['KNOWLEDGE_MANAGER', 'SYSTEM_ADMINISTRATOR'];

export default function KnowledgeBase() {
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
    category: 'IT',
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
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, viewCount: res.data.viewCount } : a))
      );
    } catch {
      const art = articles.find((a) => a.id === id);
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
      setEditFormData({ id: null, title: '', content: '', category: 'IT', keywords: '', isFaq: false });
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
      category: article.category || 'IT',
      keywords: article.keywords || '',
      isFaq: article.isFaq || false,
    });
    setEditorMsg('');
    setShowEditor(true);
  };

  const handleDeleteClick = async (articleId) => {
    if (!window.confirm('Are you sure you want to permanently delete this KB article?')) return;
    try {
      await axios.delete(`${API}/kb/articles/${articleId}`);
      fetchArticles();
      if (selectedArticle?.id === articleId) setSelectedArticle(null);
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Header Banner ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Self-Service Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Knowledge Base & Self-Service FAQ
          </h1>
          <p className="text-slate-400 text-xs leading-relaxed max-w-2xl">
            Search step-by-step troubleshooting guides, university IT policies, software activation steps, and campus maintenance information.
          </p>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by keywords (e.g. Wi-Fi, LMS password, MATLAB, hostel repair)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setFaqOnly(!faqOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 whitespace-nowrap ${
                faqOnly
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${faqOnly ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} />
              <span>FAQs Only</span>
            </button>

            {canEdit && (
              <Button
                onClick={() => {
                  setEditFormData({ id: null, title: '', content: '', category: 'IT', keywords: '', isFaq: false });
                  setShowEditor(true);
                }}
                variant="primary"
                size="sm"
                icon={Plus}
              >
                Publish Article
              </Button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1 hide-scrollbar">
          {[
            { id: 'ALL', label: 'All Categories', icon: Globe },
            { id: 'IT', label: 'IT', icon: Laptop },
            { id: 'MAINTENANCE', label: 'Maintenance', icon: Wrench },
            { id: 'SECURITY', label: 'Security', icon: Shield },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Articles Grid / Loading / Empty ── */}
      {loading ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Searching Knowledge Base...</p>
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No Matching Articles Found"
          description="Try adjusting your search terms or selecting a different category."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((article) => (
            <div
              key={article.id}
              onClick={() => handleOpenArticle(article.id)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={categoryBadges[article.category] || 'neutral'}>
                    {article.category?.replace('_', ' ')}
                  </Badge>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {article.isFaq && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-400" /> FAQ
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px]">
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>{article.viewCount}</span>
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition line-clamp-2 leading-snug">
                  {article.title}
                </h3>

                {/* Preview text */}
                <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed">
                  {article.content}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="text-blue-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 text-xs">
                  Read Guide <ArrowRight className="w-3 h-3" />
                </span>
                {canEdit && (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditClick(article)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium transition flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(article.id)}
                      className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded text-[11px] font-medium transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setSelectedArticle(null)}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-950 border-b border-slate-800 p-6 flex justify-between items-start gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={categoryBadges[selectedArticle.category] || 'neutral'}>
                    {selectedArticle.category?.replace('_', ' ')}
                  </Badge>
                  {selectedArticle.isFaq && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-amber-400" /> FAQ Guide
                    </span>
                  )}
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedArticle.viewCount} views</span>
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{selectedArticle.title}</h2>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-300 text-xs leading-relaxed whitespace-pre-wrap flex-1">
              {selectedArticle.content}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 border-t border-slate-800 p-4 px-6 flex justify-between items-center text-xs">
              <span className="text-slate-400">
                Author: <strong className="text-blue-400">{selectedArticle.author?.fullName || 'University Support'}</strong>
              </span>
              <Button
                onClick={() => setSelectedArticle(null)}
                variant="secondary"
                size="sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Publish / Edit Modal ── */}
      {showEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowEditor(false)}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <span>{editFormData.id ? 'Edit KB Article' : 'Publish Knowledge Base Article'}</span>
              </h2>
              <button onClick={() => setShowEditor(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{editorMsg}</span>
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
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="e.g. Connecting to Campus Wi-Fi and eduroam"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="IT">IT</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="SECURITY">Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Keywords (comma separated)
                  </label>
                  <input
                    type="text"
                    value={editFormData.keywords}
                    onChange={(e) => setEditFormData({ ...editFormData, keywords: e.target.value })}
                    placeholder="wifi, portal, vpn"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                  onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                  placeholder="Provide clear step-by-step instructions..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFaqCheck"
                  checked={editFormData.isFaq}
                  onChange={(e) => setEditFormData({ ...editFormData, isFaq: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800"
                />
                <label htmlFor="isFaqCheck" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Mark as Featured FAQ Guide
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={saving}
                  disabled={saving}
                  className="flex-1 justify-center"
                >
                  {saving ? 'Saving...' : 'Publish Article'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
