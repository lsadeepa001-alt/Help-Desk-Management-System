import React, { useState } from 'react';
import axios from 'axios';
import { Star, X, AlertCircle } from 'lucide-react';
import Button from './ui/Button';

const API = 'http://localhost:8080/api';

const StarButton = ({ value, selected, hovered, onHover, onClick }) => {
  const filled = value <= (hovered || selected);
  return (
    <button
      type="button"
      onMouseEnter={() => onHover(value)}
      onMouseLeave={() => onHover(0)}
      onClick={() => onClick(value)}
      className="transition-transform hover:scale-110 focus:outline-none p-1"
      aria-label={`${value} star`}
    >
      <Star
        className={`w-8 h-8 transition-colors ${
          filled ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
        }`}
      />
    </button>
  );
};

const ratingLabels = {
  0: '',
  1: 'Very Unsatisfied',
  2: 'Unsatisfied',
  3: 'Neutral',
  4: 'Satisfied',
  5: 'Very Satisfied',
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
    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 px-7 py-6 border-b border-slate-800 relative text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <Star className="w-8 h-8 text-amber-400 fill-amber-400 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isEdit ? 'Update Your Rating' : 'How was your experience?'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Ticket <span className="text-blue-400 font-mono font-bold">{ticket.ticketNumber}</span> has been resolved.
            {isEdit ? ' Update your feedback and rating below.' : ' Share your feedback to help us improve campus services.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
          {/* Star Rating */}
          <div className="text-center space-y-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Your Rating</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <StarButton
                  key={v}
                  value={v}
                  selected={rating}
                  hovered={hovered}
                  onHover={setHovered}
                  onClick={setRating}
                />
              ))}
            </div>
            <p className={`text-xs font-semibold h-4 transition-all ${rating > 0 ? 'text-amber-400' : 'text-transparent'}`}>
              {ratingLabels[hovered || rating]}
            </p>
          </div>

          {/* Scale hint */}
          <div className="flex justify-between text-[11px] text-slate-500 px-1">
            <span>1 = Very Unsatisfied</span>
            <span>5 = Very Satisfied</span>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Additional Feedback <span className="text-slate-500 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Tell us what went well or how we can improve..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs resize-none transition"
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium px-4 py-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
            >
              {isEdit ? 'Cancel' : 'Skip for Now'}
            </button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={submitting || rating === 0}
              className="flex-1 justify-center"
            >
              {isEdit ? 'Update Feedback' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
