import { useState, type FormEvent } from 'react';
import { Settings, MapPin, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone })
        .eq('id', profile?.id);
      if (err) throw err;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage your profile and platform settings</p>
      </div>

      {/* Profile */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Settings className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Profile Settings</h2>
        </div>
        {error && <div className="mb-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
        {saved && <div className="mb-4 rounded bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">✅ Profile updated successfully</div>}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input value={profile?.email ?? ''} disabled className={inputCls + ' bg-slate-50 text-slate-400 cursor-not-allowed'} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
            <input value={profile?.role ?? ''} disabled className={inputCls + ' bg-slate-50 text-slate-400 cursor-not-allowed capitalize'} />
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Warehouse */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <MapPin className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Warehouse Configuration</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Warehouse Name</label>
            <input defaultValue="Chennai Central Warehouse" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Latitude</label>
              <input defaultValue="13.0827" type="number" step="any" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Longitude</label>
              <input defaultValue="80.2707" type="number" step="any" className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-slate-400">Warehouse coordinates are used as the start/end point for all route optimizations.</p>
        </div>
      </div>
    </div>
  );
}
