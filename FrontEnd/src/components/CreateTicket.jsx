import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Plus,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  X,
  Send,
} from 'lucide-react';

const API_URL = 'http://localhost:8080/api/tickets';

const DEPARTMENT_CATEGORY_NAMES = {
  IT: [
    'Network & Wi-Fi',
    'LMS & Student Portal',
    'Hardware & Lab Equipment',
    'Software & Licensing',
    'Account & Security',
  ],
  MAINTENANCE: [
    'Air Conditioning & HVAC',
    'Electrical & Lighting',
    'Plumbing & Water Facilities',
    'Classroom Furniture & Fixtures',
    'Building Maintenance & Cleaning',
  ],
  SECURITY: [
    'Campus Access & Keycard',
    'Lost & Found Property',
    'Parking & Vehicle Pass',
    'Emergency & Incident Reporting',
    'Surveillance & Safety Concern',
  ],
};

const CreateTicket = ({ onTicketCreated, onOpenAuth, prefillData }) => {
  const { user, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    title: prefillData?.title || '',
    description: prefillData?.description || '',
    department: 'IT',
    priority: 'MEDIUM',
    location: '',
    categoryId: '',
  });

  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_URL}/categories`);
        if (isMounted && Array.isArray(res.data) && res.data.length > 0) {
          setCategories(res.data);
        }
      } catch (err) {
        console.error('Failed to load categories from backend:', err);
      }
    };
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, []);

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

  const activeNames = DEPARTMENT_CATEGORY_NAMES[formData.department] || DEPARTMENT_CATEGORY_NAMES.IT;
  const activeCategories = categories.length > 0
    ? categories.filter((c) => {
        if (c.department) {
          return c.department.toUpperCase() === (formData.department || '').toUpperCase();
        }
        return activeNames.some((n) => n.toLowerCase() === (c.name || '').toLowerCase());
      })
    : activeNames.map((name, idx) => ({ id: `temp-${idx}`, name, department: formData.department }));

  // Automatically keep categoryId pointing to an existing category ID for the active department
  useEffect(() => {
    if (activeCategories.length > 0) {
      const isValid = activeCategories.some((c) => String(c.id) === String(formData.categoryId));
      if (!isValid && activeCategories[0]) {
        setFormData((prev) => ({ ...prev, categoryId: String(activeCategories[0].id) }));
      }
    }
  }, [activeCategories, formData.categoryId]);

  const currentCategory = activeCategories.find((c) => String(c.id) === String(formData.categoryId));
  const categoryName = currentCategory ? currentCategory.name : '';

  const shouldShowLocation = (department, catName) => {
    const dept = (department || '').toUpperCase();
    const name = (catName || '').toLowerCase();

    // Digital/account IT categories do not have physical location
    if (dept === 'IT') {
      if (
        name.includes('account') ||
        name.includes('lms') ||
        name.includes('student portal') ||
        name.includes('software') ||
        name.includes('licensing')
      ) {
        return false;
      }
      return true;
    }

    // Physical maintenance and campus security always involve physical locations
    if (dept === 'MAINTENANCE' || dept === 'SECURITY') {
      return true;
    }

    return true;
  };

  const isLocationVisible = shouldShowLocation(formData.department, categoryName);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'department') {
      const activeNamesForDept = DEPARTMENT_CATEGORY_NAMES[value] || DEPARTMENT_CATEGORY_NAMES.IT;
      const deptCats = categories.filter((c) =>
        activeNamesForDept.some((n) => n.toLowerCase() === (c.name || '').toLowerCase())
      );
      setFormData((prev) => ({
        ...prev,
        department: value,
        categoryId: deptCats[0] ? String(deptCats[0].id) : '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileError, setFileError] = useState('');

  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  const handleFileSelection = (e) => {
    setFileError('');
    const files = Array.from(e.target.files || []);
    const validFiles = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setFileError(`File type .${ext} is not supported. Only images, PDF, office documents, and text files are allowed (archives like zip/rar are prohibited).`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(`File "${file.name}" exceeds the 10MB limit.`);
        continue;
      }
      validFiles.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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

    const selectedCat = categories.find((c) => String(c.id) === String(formData.categoryId))
      || activeCategories.find((c) => String(c.id) === String(formData.categoryId));

    let categoryObj = null;
    if (selectedCat && typeof selectedCat.id === 'number') {
      categoryObj = { id: selectedCat.id, name: selectedCat.name };
    } else if (formData.categoryId && !isNaN(Number(formData.categoryId))) {
      categoryObj = { id: parseInt(formData.categoryId, 10) };
    } else if (selectedCat && selectedCat.name) {
      categoryObj = { name: selectedCat.name };
    }

    const payload = {
      ticketNumber: generatedTicketNum,
      title: formData.title,
      description: formData.description,
      department: formData.department,
      priority: formData.priority,
      status: 'OPEN',
      location: isLocationVisible && formData.location?.trim() ? formData.location.trim() : null,
      category: categoryObj,
      createdBy: { id: user.id },
    };

    try {
      const response = await axios.post(API_URL, payload);
      const newTicket = response.data;
      const ticketId = newTicket.id;

      // Upload attachments if selected
      if (selectedFiles.length > 0 && ticketId) {
        try {
          const uploadData = new FormData();
          selectedFiles.forEach((file) => {
            uploadData.append('files', file);
          });

          await axios.post(`http://localhost:8080/api/tickets/${ticketId}/attachments`, uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (uploadErr) {
          console.error('Attachment upload warning:', uploadErr);
          setMessage({
            type: 'success',
            text: `Ticket #${newTicket.ticketNumber || generatedTicketNum} created, but some attachments failed to upload: ${uploadErr.response?.data?.message || uploadErr.message}`,
          });
          setFormData({
            title: '',
            description: '',
            department: 'IT',
            priority: 'MEDIUM',
            location: '',
            categoryId: activeCategories[0] ? String(activeCategories[0].id) : '',
          });
          setSelectedFiles([]);
          if (onTicketCreated) onTicketCreated();
          return;
        }
      }

      setMessage({
        type: 'success',
        text: `Ticket ${newTicket.ticketNumber || generatedTicketNum} created successfully with ${selectedFiles.length} attachment(s)!`,
      });

      setFormData({
        title: '',
        description: '',
        department: 'IT',
        priority: 'MEDIUM',
        location: '',
        categoryId: activeCategories[0] ? String(activeCategories[0].id) : '',
      });
      setSelectedFiles([]);

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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-5">
        <Lock className="w-12 h-12 text-slate-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white tracking-tight">Authentication Required</h2>
        <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
          Please sign in to your University account or register to submit technical helpdesk tickets under your profile.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => onOpenAuth && onOpenAuth('login')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-500/20 text-xs"
          >
            Sign In
          </button>
          <button
            onClick={() => onOpenAuth && onOpenAuth('register')}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition text-xs border border-slate-700"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
      <div className="border-b border-slate-800 pb-4 flex justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-400" />
            <span>Submit New Ticket</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Submitting as <span className="text-blue-400 font-semibold">{user.fullName}</span> ({user.role})
          </p>
        </div>
        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
          Requester: {user.department || 'General'}
        </span>
      </div>

      {prefillData && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium rounded-xl flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Form pre-filled from UniAssist 360 Support Assistant conversation.</span>
        </div>
      )}

      {message.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2.5 animate-in fade-in duration-150 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
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

        {/* Department, Category & Urgency Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Technical Department <span className="text-rose-400">*</span>
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition"
              required
            >
              <option value="IT">IT</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="SECURITY">Security</option>
            </select>
          </div>

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
              {activeCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Urgency / Priority
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
            </select>
          </div>
        </div>

        {/* Location Row (Conditional based on Department & Category) */}
        {isLocationVisible && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Location / Room <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Main Library 2nd Floor, Lab 03, Block B"
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition"
            />
          </div>
        )}

        {/* Attachments Section */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Attachments <span className="text-slate-500 font-normal">(Optional — Max 10MB per file)</span>
          </label>
          <div className="p-4 bg-slate-900/60 border border-dashed border-slate-700 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-300 font-medium">Add screenshots, logs, error reports, or documents</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Permitted: JPG, PNG, PDF, Word, Excel, PowerPoint, TXT, CSV (No archives)</p>
              </div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition">
                <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                <span>Browse Files</span>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  onChange={handleFileSelection}
                  className="hidden"
                />
              </label>
            </div>

            {fileError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>{fileError}</span>
              </p>
            )}

            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                  >
                    <span className="truncate max-w-[180px]">{file.name}</span>
                    <span className="text-slate-500 text-[10px]">
                      ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-rose-400 font-bold transition ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting Ticket...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
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
