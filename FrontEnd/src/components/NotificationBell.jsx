import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:8080/api';

const typeIcons = {
  TICKET_CREATED: '➕',
  TICKET_ASSIGNED: '👤',
  STATUS_UPDATED: '🔄',
  NEW_COMMENT: '💬',
  CSAT_REQUEST: '⭐',
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSecs = Math.floor((now - date) / 1000);

  if (diffSecs < 60) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function NotificationBell({ onSelectTicket }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      const res = await axios.get(`${API}/notifications?userId=${user.id}`);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // silently ignore polling errors
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notification) => {
    try {
      if (!notification.isRead) {
        await axios.put(`${API}/notifications/${notification.id}/read`);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {
      // ignore
    }

    setIsOpen(false);
    if (notification.relatedTicketId && onSelectTicket) {
      onSelectTicket(notification.relatedTicketId);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await axios.put(`${API}/notifications/read-all?userId=${user.id}`);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Bell Icon Button ── */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          fetchNotifications();
        }}
        className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center justify-center"
        aria-label="View Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-slate-950 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Notification Dropdown Panel ── */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          {/* Header */}
          <div className="bg-slate-800/90 p-4 border-b border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List Stream */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 text-xs">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <div className="text-3xl">🔕</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n)}
                  className={`p-3.5 hover:bg-slate-800/80 cursor-pointer transition flex gap-3 items-start ${
                    !n.isRead ? 'bg-indigo-950/20 border-l-2 border-indigo-500' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                    {typeIcons[n.type] || '🔔'}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={`font-semibold text-slate-100 truncate ${!n.isRead ? 'font-bold text-indigo-200' : ''}`}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap flex-shrink-0">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-950/80 p-2.5 text-center text-[10px] text-slate-500 border-t border-slate-800">
            Real-time University Alert System
          </div>
        </div>
      )}
    </div>
  );
}
