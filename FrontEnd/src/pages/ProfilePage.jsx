import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Bell,
  CheckCircle2,
  AlertCircle,
  Building2,
  Phone,
  Shield,
  Save,
} from 'lucide-react';
import Button from '../components/ui/Button';

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

  // ── Notification Preferences State ──
  const [prefs, setPrefs] = useState({
    inAppEnabled: true,
    emailEnabled: true,
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
    if (!user?.id) return;
    const fetchPrefs = async () => {
      setPrefsLoading(true);
      try {
        const res = await axios.get(`${API}/notifications/preferences?userId=${user.id}`);
        setPrefs(res.data);
      } catch {
        // Fallback default preferences
      } finally {
        setPrefsLoading(false);
      }
    };
    fetchPrefs();
  }, [user?.id]);

  const handleSavePrefs = async (e) => {
    e.preventDefault();
    setPrefsSaving(true);
    setPrefsMessage(null);
    try {
      const res = await axios.put(`${API}/notifications/preferences?userId=${user.id}`, prefs);
      setPrefs(res.data);
      setPrefsMessage({ type: 'success', text: 'Notification preferences saved successfully.' });
    } catch (err) {
      setPrefsMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save notification preferences.',
      });
    } finally {
      setPrefsSaving(false);
    }
  };

  const togglePref = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Account & Preferences</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your personal university credentials, contact details, and notification channels.
        </p>
      </div>

      {/* ── Profile Information Card ── */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            <span>Profile Information</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Your university identity and technical contact details.
          </p>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-150 ${
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReadOnlyField label="Username" value={user?.username} />
          <ReadOnlyField label="Access Role" value={user?.frontendRole || user?.role} />
          <EditableField label="Full Name" name="fullName" value={formData.fullName} setFormData={setFormData} required />
          <EditableField label="Email" name="email" value={formData.email} setFormData={setFormData} type="email" required />
          <EditableField label="Department" name="department" value={formData.department} setFormData={setFormData} />
          <EditableField label="Phone Number" name="phoneNumber" value={formData.phoneNumber} setFormData={setFormData} type="tel" />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={saving}
            disabled={saving}
            icon={Save}
          >
            Save Profile
          </Button>
        </div>
      </form>

      {/* ── Notification Delivery Preferences ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" />
            <span>Notification Delivery Preferences</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Choose how and when you receive automated system updates and activity alerts.
          </p>
        </div>

        {prefsMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-150 ${
              prefsMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {prefsMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{prefsMessage.text}</span>
          </div>
        )}

        {prefsLoading ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading preferences...</div>
        ) : (
          <form onSubmit={handleSavePrefs} className="space-y-6">
            {/* Delivery Channels */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">Delivery Channels</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <ToggleCard
                  title="In-App Notifications"
                  description="Real-time alerts via top notification bell and inbox"
                  checked={prefs.inAppEnabled}
                  onChange={() => togglePref('inAppEnabled')}
                  icon={Bell}
                />
                <ToggleCard
                  title="Email Notifications"
                  description="Deliver updates to your registered university email"
                  checked={prefs.emailEnabled}
                  onChange={() => togglePref('emailEnabled')}
                  icon={Mail}
                />
              </div>
            </div>

            {/* Event Subscriptions */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">Event Subscriptions</h3>
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
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={prefsSaving}
                disabled={prefsSaving}
                icon={Save}
              >
                Save Preferences
              </Button>
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
      <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400">
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
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      />
    </div>
  );
}

function ToggleCard({ title, description, checked, onChange, icon: Icon }) {
  return (
    <div
      onClick={onChange}
      className={`p-4 rounded-2xl border cursor-pointer transition flex items-start justify-between gap-3 ${
        checked
          ? 'bg-blue-950/20 border-blue-500/40 hover:border-blue-400/60'
          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${checked ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">{title}</div>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      <div
        className={`w-10 h-5 rounded-full transition-colors relative shrink-0 mt-1 ${
          checked ? 'bg-blue-600' : 'bg-slate-800'
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

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div
      onClick={onChange}
      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3 cursor-pointer"
    >
      <div>
        <div className="text-xs font-semibold text-slate-200">{label}</div>
        <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
      </div>
      <div
        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
          checked ? 'bg-blue-600' : 'bg-slate-800'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
    </div>
  );
}
