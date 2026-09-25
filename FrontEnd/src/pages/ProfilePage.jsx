import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:8080/api';

export default function ProfilePage() {
  const { user, updateCurrentUser } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    department: '',
    phoneNumber: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setFormData({
      fullName: user?.fullName || '',
      email: user?.email || '',
      department: user?.department || '',
      phoneNumber: user?.phoneNumber || '',
    });
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.put(`${API}/users/${user.id}/profile`, formData);
      updateCurrentUser(response.data);
      setMessage({ type: 'success', text: 'Profile and contact details updated successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Unable to update your profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const [prefs, setPrefs] = useState({
    inAppEnabled: true,
    emailEnabled: false,
    ticketCreatedEnabled: true,
    ticketAssignedEnabled: true,
    statusUpdatedEnabled: true,
    newCommentEnabled: true,
    csatRequestEnabled: true,
  });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState(null);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await axios.get(`${API}/notifications/preferences`);
        if (res.data) setPrefs(res.data);
      } catch {
        // silently fallback to defaults
      } finally {
        setPrefsLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleSavePrefs = async (e) => {
    e.preventDefault();
    setPrefsSaving(true);
    setPrefsMessage(null);
    try {
      const res = await axios.put(`${API}/notifications/preferences`, prefs);
      setPrefs(res.data);
      setPrefsMessage({ type: 'success', text: 'Notification preferences updated successfully.' });
    } catch (err) {
      setPrefsMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update preferences.' });
    } finally {
      setPrefsSaving(false);
    }
  };

  const togglePref = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-slate-800/80 to-violet-900/40 border border-slate-700/60 shadow-2xl">
        <span className="inline-block px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
          My Account
        </span>
        <h1 className="text-3xl font-extrabold text-white">Profile & Contact Details</h1>
        <p className="text-sm text-slate-300 mt-2">
          Update your own contact information. Identity, role, status, and permissions are read-only.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800/90 border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {message && (
          <div className={`p-4 rounded-xl text-sm border ${message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
            {message.text}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <ReadOnlyField label="Username / Identity" value={user?.username} />
          <ReadOnlyField label="Role" value={user?.role?.replaceAll('_', ' ')} />
          <ReadOnlyField label="Account Status" value={user?.status || 'ACTIVE'} />
          <ReadOnlyField label="User ID" value={user?.id} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <EditableField label="Full Name" name="fullName" value={formData.fullName} setFormData={setFormData} required />
          <EditableField label="Email" name="email" value={formData.email} setFormData={setFormData} type="email" required />
          <EditableField label="Department" name="department" value={formData.department} setFormData={setFormData} />
          <EditableField label="Phone Number" name="phoneNumber" value={formData.phoneNumber} setFormData={setFormData} type="tel" />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* ── Notification Delivery Preferences ── */}
      <div className="bg-slate-800/90 border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔔</span>
            <h2 className="text-xl font-bold text-white">Notification Delivery Preferences</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Choose how and when you receive automated system updates and activity alerts.
          </p>
        </div>

        {prefsMessage && (
          <div className={`p-4 rounded-xl text-sm border ${prefsMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
            {prefsMessage.text}
          </div>
        )}

        {prefsLoading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading preferences...</div>
        ) : (
          <form onSubmit={handleSavePrefs} className="space-y-6">
            {/* Delivery Channels */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Delivery Channels</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <ToggleCard
                  title="In-App Notifications"
                  description="Real-time alerts via top notification bell and inbox"
                  checked={prefs.inAppEnabled}
                  onChange={() => togglePref('inAppEnabled')}
                  icon="🔔"
                />
                <ToggleCard
                  title="Email Notifications"
                  description="Deliver updates to your registered university email"
                  checked={prefs.emailEnabled}
                  onChange={() => togglePref('emailEnabled')}
                  icon="📧"
                />
              </div>
            </div>

            {/* Event Subscriptions */}
            <div className="space-y-3 pt-2 border-t border-slate-700/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Event Subscriptions</h3>
              <div className="space-y-2.5">
                <ToggleRow
                  label="New Ticket Created"
                  description="When a new ticket is submitted in your department (Staff / Team Leads)"
                  checked={prefs.ticketCreatedEnabled}
                  onChange={() => togglePref('ticketCreatedEnabled')}
                />
                <ToggleRow
                  label="Ticket Assigned"
                  description="When a ticket is assigned to you by a Team Lead"
                  checked={prefs.ticketAssignedEnabled}
                  onChange={() => togglePref('ticketAssignedEnabled')}
                />
                <ToggleRow
                  label="Ticket Status Updates"
                  description="When status changes on tickets you submitted or are assigned to"
                  checked={prefs.statusUpdatedEnabled}
                  onChange={() => togglePref('statusUpdatedEnabled')}
                />
                <ToggleRow
                  label="Comments & Discussion Replies"
                  description="When a new reply is posted to a ticket you are part of"
                  checked={prefs.newCommentEnabled}
                  onChange={() => togglePref('newCommentEnabled')}
                />
                <ToggleRow
                  label="CSAT Rating Invitations"
                  description="Feedback invitations when your ticket is marked as resolved"
                  checked={prefs.csatRequestEnabled}
                  onChange={() => togglePref('csatRequestEnabled')}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={prefsSaving}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition"
              >
                {prefsSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-400">
        {value || '—'}
      </div>
    </div>
  );
}

function EditableField({ label, name, value, setFormData, type = 'text', required = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        maxLength={name === 'phoneNumber' ? 20 : 100}
        onChange={(event) => setFormData((current) => ({ ...current, [name]: event.target.value }))}
        className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      />
    </div>
  );
}

function ToggleCard({ title, description, checked, onChange, icon }) {
  return (
    <div
      onClick={onChange}
      className={`p-4 rounded-2xl border cursor-pointer transition flex items-start justify-between gap-3 ${
        checked
          ? 'bg-indigo-950/30 border-indigo-500/50 hover:border-indigo-400'
          : 'bg-slate-900/40 border-slate-700/50 hover:border-slate-600 opacity-60 hover:opacity-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{icon}</span>
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <p className="text-xs text-slate-400 mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      <div
        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 mt-0.5 ${
          checked ? 'bg-indigo-600' : 'bg-slate-700'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div
      onClick={onChange}
      className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/40 hover:border-slate-600/70 transition flex items-center justify-between gap-3 cursor-pointer"
    >
      <div>
        <div className="text-xs font-semibold text-slate-200">{label}</div>
        <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
      </div>
      <div
        className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
          checked ? 'bg-indigo-600' : 'bg-slate-700'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </div>
  );
}
