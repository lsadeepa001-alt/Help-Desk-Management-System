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
