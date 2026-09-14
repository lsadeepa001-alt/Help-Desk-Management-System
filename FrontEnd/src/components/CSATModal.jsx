import React, { useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:8080/api';

const StarButton = ({ value, selected, hovered, onHover, onClick }) => {
  const filled = value <= (hovered || selected);
  return (
    <button
      type="button"
      onMouseEnter={() => onHover(value)}
      onMouseLeave={() => onHover(0)}
      onClick={() => onClick(value)}
      className="transition-transform hover:scale-110 focus:outline-none"
      aria-label={`${value} star`}
    >
      <svg className={`w-10 h-10 transition-colors ${filled ? 'text-amber-400' : 'text-slate-600'}`}
        fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </button>
  );
};

const ratingLabels = {
  0: '',
  1: '😞 Very Unsatisfied',
  2: '😕 Unsatisfied',
  3: '😐 Neutral',
  4: '😊 Satisfied',
  5: '🤩 Very Satisfied',
};

export default function CSATModal({ ticket, userId, onClose, onSubmitted, existingFeedback = null, mode = 'create' }) {
  const isEdit = mode === 'edit' && !!existingFeedback;
  const [rating, setRating] = useState(existingFeedback?.rating || 0);
  const [hovered, setHovered] = useState(0);
  const [comments, setComments] = useState(existingFeedback?.comments || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a star rating.'); return; }

    setSubmitting(true);
    setError('');
    try {
      let res;
      if (isEdit) {
        res = await axios.put(`${API}/feedback/${existingFeedback.id}`, {
          rating,
          comments: comments.trim() || null,
        });
      } else {
        res = await axios.post(`${API}/feedback`, {
          ticketId: ticket.id,
          userId,
          rating,
          comments: comments.trim() || null,
        });
      }
      if (onSubmitted) onSubmitted(rating, res.data);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Submission failed.';
      setError(typeof msg === 'string' ? msg : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 px-7 py-6 border-b border-slate-700/50 relative">
          <button onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-700/50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="text-3xl mb-2">⭐</div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {isEdit ? 'Update Your Rating' : 'How was your experience?'}
          </h2>
          <p className="text-slate-300 text-sm mt-1">
            Ticket <span className="text-indigo-300 font-mono font-bold">{ticket.ticketNumber}</span> has been resolved.
            {isEdit ? ' Update your feedback and rating below.' : ' Share your feedback to help us improve.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-6">

          {/* Star Rating */}
          <div className="text-center space-y-3">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Your Rating</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(v => (
                <StarButton key={v} value={v} selected={rating} hovered={hovered}
                  onHover={setHovered} onClick={setRating} />
              ))}
            </div>
            <p className={`text-sm font-semibold h-5 transition-all ${rating > 0 ? 'text-amber-300' : 'text-transparent'}`}>
              {ratingLabels[hovered || rating]}
            </p>
          </div>

          {/* CSAT scale hint */}
          <div className="flex justify-between text-[10px] text-slate-600 px-1 -mt-2">
            <span>1 = Very Poor</span>
            <span>5 = Excellent</span>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Additional Comments <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3}
              placeholder="Tell us what went well or how we can improve..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm resize-none transition"
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium px-4 py-2.5 rounded-xl">
              ⚠️ {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl border border-slate-700 transition">
              {isEdit ? 'Cancel' : 'Skip for Now'}
            </button>
            <button type="submit" disabled={submitting || rating === 0}
              className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2">
              {submitting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              ) : '⭐'} {isEdit ? 'Update Feedback' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
