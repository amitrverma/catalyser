import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Check, RotateCcw, AlertCircle, Sparkles, Building, KeyRound, MapPin, ReceiptText, Database, Cloud, RefreshCw, UploadCloud, DownloadCloud, FileDown, FileUp, Save, Server, Users, UserPlus, Trash2, Edit, Plus, X, Briefcase } from 'lucide-react';
import { getDbData, prepareDbDataForBackup, saveDbData, validateDbDataPayload } from '../lib/db';
import { persistSettingsToSupabase } from '../lib/settingsSync';
import {
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_STAFF_SALARIES,
  getSetting,
  readJsonSetting,
  removeSetting,
  resetSettingsMemory,
  setSetting,
} from '../lib/settingsStore';

export default function SettingsManager() {
  const [formData, setFormData] = useState({
    ...DEFAULT_COMPANY_SETTINGS
  });

  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [stampBase64, setStampBase64] = useState<string | null>(null);
  const [signBase64, setSignBase64] = useState<string | null>(null);
  const [pendingLogo, setPendingLogo] = useState<string | null>(null);
  const [pendingStamp, setPendingStamp] = useState<string | null>(null);
  const [pendingSign, setPendingSign] = useState<string | null>(null);
  const [logoSaveSuccess, setLogoSaveSuccess] = useState(false);
  const [stampSaveSuccess, setStampSaveSuccess] = useState(false);
  const [signSaveSuccess, setSignSaveSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);

  const validateSettingsAsset = (file: File) => {
    const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
    if (!supportedTypes.has(file.type)) {
      return 'Use a JPEG, PNG, WebP, or SVG image.';
    }
    if (file.size > 2 * 1024 * 1024) {
      return 'Invoice image assets must be 2 MB or smaller.';
    }
    return null;
  };

  // Staff and salary directory list states
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; role: string; salary: number }>>(() => {
    return readJsonSetting('cc_staff_salaries', DEFAULT_STAFF_SALARIES);
  });

  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newStaffSalary, setNewStaffSalary] = useState('');
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaffName, setEditingStaffName] = useState('');
  const [editingStaffRole, setEditingStaffRole] = useState('');
  const [editingStaffSalary, setEditingStaffSalary] = useState('');

  const persistSettingsNow = async () => {
    const saved = await persistSettingsToSupabase();
    if (!saved) {
      setSettingsSaveError('Saved locally, but cloud sync failed. Retry before signing out.');
      return false;
    }

    setSettingsSaveError(null);
    window.dispatchEvent(new Event('custom-settings-updated'));
    return true;
  };

  const saveStaffList = async (newList: Array<{ id: string; name: string; role: string; salary: number }>) => {
    setStaffList(newList);
    setSetting('cc_staff_salaries', JSON.stringify(newList));
    return persistSettingsNow();
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffRole.trim() || !newStaffSalary) return;
    const val = parseFloat(newStaffSalary);
    if (isNaN(val) || val <= 0) return;

    const newItem = {
      id: `st-${Date.now()}`,
      name: newStaffName.trim(),
      role: newStaffRole.trim(),
      salary: val
    };

    const saved = await saveStaffList([...staffList, newItem]);
    if (!saved) return;
    setNewStaffName('');
    setNewStaffRole('');
    setNewStaffSalary('');
  };

  const handleDeleteStaff = (id: string) => {
    void saveStaffList(staffList.filter(x => x.id !== id));
  };

  const handleStartEditStaff = (item: { id: string; name: string; role: string; salary: number }) => {
    setEditingStaffId(item.id);
    setEditingStaffName(item.name);
    setEditingStaffRole(item.role);
    setEditingStaffSalary(item.salary.toString());
  };

  const handleSaveEditStaff = async (id: string) => {
    if (!editingStaffName.trim() || !editingStaffRole.trim() || !editingStaffSalary) return;
    const val = parseFloat(editingStaffSalary);
    if (isNaN(val) || val <= 0) return;

    const saved = await saveStaffList(staffList.map(x => x.id === id ? { ...x, name: editingStaffName.trim(), role: editingStaffRole.trim(), salary: val } : x));
    if (!saved) return;
    setEditingStaffId(null);
  };

  // Storage settings state
  const [storageType, setStorageType] = useState<'local' | 'cloud'>('local');
  const [localPrefix, setLocalPrefix] = useState('cc_');
  const [cloudEndpoint, setCloudEndpoint] = useState('');
  const [cloudAuth, setCloudAuth] = useState('');

  // Statuses for action feedbacks
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ type: 'push' | 'pull'; success: boolean; message: string } | null>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Load custom values on mount
  useEffect(() => {
    const cName = getSetting('cc_company_name');
    const cAddr = getSetting('cc_company_address');
    const cGst = getSetting('cc_company_gst');
    const cEmail = getSetting('cc_company_email');
    const cPhone = getSetting('cc_company_phone');
    const logo = getSetting('custom_logo_base64');
    
    // Fallback support for any unified signature/stamp saved previously
    let stamp = getSetting('custom_stamp_base64');
    if (!stamp) {
      stamp = getSetting('custom_stamp_sign_base64');
    }
    const signature = getSetting('custom_sign_base64');

    const sType = (getSetting('cc_storage_type') as 'local' | 'cloud') || 'local';
    const sPrefix = getSetting('cc_storage_local_prefix') || 'cc_';
    const sEndpoint = getSetting('cc_storage_cloud_endpoint') || '';
    const sAuth = getSetting('cc_storage_cloud_auth') || '';

    const bAccName = getSetting('cc_bank_account_name');
    const bBankName = getSetting('cc_bank_name');
    const bAccNo = getSetting('cc_bank_account_number');
    const bAccType = getSetting('cc_bank_account_type');
    const bIfsc = getSetting('cc_bank_ifsc');

    setFormData({
      companyName: cName || DEFAULT_COMPANY_SETTINGS.companyName,
      address: cAddr || DEFAULT_COMPANY_SETTINGS.address,
      gstNumber: cGst || DEFAULT_COMPANY_SETTINGS.gstNumber,
      email: cEmail || DEFAULT_COMPANY_SETTINGS.email,
      phone: cPhone || DEFAULT_COMPANY_SETTINGS.phone,
      bankAccountName: bAccName || DEFAULT_COMPANY_SETTINGS.bankAccountName,
      bankName: bBankName || DEFAULT_COMPANY_SETTINGS.bankName,
      bankAccountNumber: bAccNo || DEFAULT_COMPANY_SETTINGS.bankAccountNumber,
      bankAccountType: bAccType || DEFAULT_COMPANY_SETTINGS.bankAccountType,
      bankIfscCode: bIfsc || DEFAULT_COMPANY_SETTINGS.bankIfscCode
    });

    if (logo) {
      setLogoBase64(logo);
      setPendingLogo(logo);
    }
    if (stamp) {
      setStampBase64(stamp);
      setPendingStamp(stamp);
    }
    if (signature) {
      setSignBase64(signature);
      setPendingSign(signature);
    }

    setStorageType(sType);
    setLocalPrefix(sPrefix);
    setCloudEndpoint(sEndpoint);
    setCloudAuth(sAuth);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateSettingsAsset(file);
      if (error) {
        setSettingsSaveError(error);
        e.target.value = '';
        return;
      }
      setSettingsSaveError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPendingLogo(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = async () => {
    setLogoBase64(pendingLogo);
    if (pendingLogo) {
      setSetting('custom_logo_base64', pendingLogo);
      if (pendingLogo.startsWith('data:')) {
        removeSetting('custom_logo_storage_path');
      }
    } else {
      removeSetting('custom_logo_base64');
      removeSetting('custom_logo_storage_path');
    }
    window.dispatchEvent(new Event('custom-logo-updated'));
    const saved = await persistSettingsNow();
    if (!saved) return;
    const savedLogo = getSetting('custom_logo_base64');
    setLogoBase64(savedLogo);
    setPendingLogo(savedLogo);
    setLogoSaveSuccess(true);
    setTimeout(() => setLogoSaveSuccess(false), 3000);
  };

  const handleResetLogo = () => {
    setPendingLogo(null);
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateSettingsAsset(file);
      if (error) {
        setSettingsSaveError(error);
        e.target.value = '';
        return;
      }
      setSettingsSaveError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPendingStamp(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStamp = async () => {
    setStampBase64(pendingStamp);
    if (pendingStamp) {
      setSetting('custom_stamp_base64', pendingStamp);
      setSetting('custom_stamp_sign_base64', pendingStamp);
      if (pendingStamp.startsWith('data:')) {
        removeSetting('custom_stamp_storage_path');
        removeSetting('custom_stamp_sign_storage_path');
      }
    } else {
      removeSetting('custom_stamp_base64');
      removeSetting('custom_stamp_storage_path');
      removeSetting('custom_stamp_sign_base64');
      removeSetting('custom_stamp_sign_storage_path');
    }
    window.dispatchEvent(new Event('custom-stamp-updated'));
    const saved = await persistSettingsNow();
    if (!saved) return;
    let savedStamp = getSetting('custom_stamp_base64');
    if (!savedStamp) {
      savedStamp = getSetting('custom_stamp_sign_base64');
    }
    setStampBase64(savedStamp);
    setPendingStamp(savedStamp);
    setStampSaveSuccess(true);
    setTimeout(() => setStampSaveSuccess(false), 3000);
  };

  const handleResetStamp = () => {
    setPendingStamp(null);
  };

  const handleSignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateSettingsAsset(file);
      if (error) {
        setSettingsSaveError(error);
        e.target.value = '';
        return;
      }
      setSettingsSaveError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPendingSign(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSign = async () => {
    setSignBase64(pendingSign);
    if (pendingSign) {
      setSetting('custom_sign_base64', pendingSign);
      if (pendingSign.startsWith('data:')) {
        removeSetting('custom_sign_storage_path');
      }
    } else {
      removeSetting('custom_sign_base64');
      removeSetting('custom_sign_storage_path');
    }
    window.dispatchEvent(new Event('custom-sign-updated'));
    const saved = await persistSettingsNow();
    if (!saved) return;
    const savedSign = getSetting('custom_sign_base64');
    setSignBase64(savedSign);
    setPendingSign(savedSign);
    setSignSaveSuccess(true);
    setTimeout(() => setSignSaveSuccess(false), 3000);
  };

  const handleResetSign = () => {
    setPendingSign(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetting('cc_company_name', formData.companyName);
    setSetting('cc_company_address', formData.address);
    setSetting('cc_company_gst', formData.gstNumber);
    setSetting('cc_company_email', formData.email);
    setSetting('cc_company_phone', formData.phone);
    setSetting('cc_bank_account_name', formData.bankAccountName);
    setSetting('cc_bank_name', formData.bankName);
    setSetting('cc_bank_account_number', formData.bankAccountNumber);
    setSetting('cc_bank_account_type', formData.bankAccountType);
    setSetting('cc_bank_ifsc', formData.bankIfscCode);

    const saved = await persistSettingsNow();
    if (!saved) return;
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaults = async () => {
    resetSettingsMemory();

    setFormData({
      ...DEFAULT_COMPANY_SETTINGS
    });
    setLogoBase64(null);
    setStampBase64(null);
    setSignBase64(null);
    setPendingLogo(null);
    setPendingStamp(null);
    setPendingSign(null);
    setStorageType('local');
    setLocalPrefix('cc_');
    setCloudEndpoint('');
    setCloudAuth('');
    setStaffList(DEFAULT_STAFF_SALARIES);

    window.dispatchEvent(new Event('custom-logo-updated'));
    window.dispatchEvent(new Event('custom-stamp-updated'));
    window.dispatchEvent(new Event('custom-sign-updated'));

    const saved = await persistSettingsNow();
    if (!saved) return;
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveStorageSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetting('cc_storage_type', storageType);
    setSetting('cc_storage_local_prefix', localPrefix);
    setSetting('cc_storage_cloud_endpoint', cloudEndpoint);
    setSetting('cc_storage_cloud_auth', cloudAuth);

    window.dispatchEvent(new Event('custom-db-updated'));
    const saved = await persistSettingsNow();
    if (!saved) return;
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportDB = async () => {
    const data = prepareDbDataForBackup(await getDbData());
    const dbDump = {
      exportedAt: new Date().toISOString(),
      data
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbDump, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `catalyser_workspace_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const validation = validateDbDataPayload(parsed?.data);
        if ('message' in validation) {
          setImportStatus({ success: false, message: validation.message });
        } else {
          const saved = await saveDbData(validation.data);

          if (saved) {
            window.dispatchEvent(new Event('custom-db-updated'));
            window.dispatchEvent(new Event('custom-settings-updated'));

            setImportStatus({ success: true, message: 'Backup imported.' });
          } else {
            setImportStatus({ success: false, message: 'Import parsed, but database persistence failed. Retry before using this backup.' });
          }
        }
      } catch (err) {
        setImportStatus({ success: false, message: 'Failed to read database parameters from JSON.' });
      }
      setTimeout(() => setImportStatus(null), 5000);
    };
    reader.readAsText(file);
  };

  const handleTestCloudConnection = async () => {
    if (!cloudEndpoint) {
      setTestStatus({ success: false, message: 'Input endpoint query parameters first.' });
      return;
    }
    setTestStatus({ success: true, message: 'Initiating network check...' });
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json, text/plain, */*'
      };
      if (cloudAuth) {
        headers['Authorization'] = cloudAuth.startsWith('Bearer ') ? cloudAuth : `Bearer ${cloudAuth}`;
      }
      const res = await fetch(cloudEndpoint, { method: 'GET', headers });
      if (res.ok) {
        setTestStatus({ success: true, message: `Connection successful. Status ${res.status}.` });
      } else {
        setTestStatus({ success: true, message: `Connection reached the server. Status ${res.status}.` });
      }
    } catch (err: any) {
      setTestStatus({ success: false, message: `Connection failed: ${err?.message || 'Unable to reach endpoint'}.` });
    }
    setTimeout(() => setTestStatus(null), 6000);
  };

  const handlePushToCloud = async () => {
    if (!cloudEndpoint) {
      setSyncStatus({ type: 'push', success: false, message: 'Add an API endpoint first.' });
      return;
    }
    try {
      const data = await getDbData();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cloudAuth) {
        headers['Authorization'] = cloudAuth.startsWith('Bearer ') ? cloudAuth : `Bearer ${cloudAuth}`;
      }
      const res = await fetch(cloudEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setSyncStatus({ type: 'push', success: true, message: 'Workspace data uploaded.' });
      } else {
        setSyncStatus({ type: 'push', success: false, message: `Sync rejected. Server status: ${res.status}.` });
      }
    } catch (err: any) {
      setSyncStatus({ type: 'push', success: false, message: `Sync action failed: ${err?.message}` });
    }
    setTimeout(() => setSyncStatus(null), 6000);
  };

  const handlePullFromCloud = async () => {
    if (!cloudEndpoint) {
      setSyncStatus({ type: 'pull', success: false, message: 'No sync target defined.' });
      return;
    }
    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (cloudAuth) {
        headers['Authorization'] = cloudAuth.startsWith('Bearer ') ? cloudAuth : `Bearer ${cloudAuth}`;
      }
      const res = await fetch(cloudEndpoint, { method: 'GET', headers });
      if (!res.ok) throw new Error(`Received status ${res.status}`);
      const info = await res.json();
      let payload = info;
      if (info && typeof info === 'object' && !Array.isArray(info)) {
        if (info.data && Array.isArray(info.data.projects)) payload = info.data;
        else if (info.record && Array.isArray(info.record.projects)) payload = info.record;
      }
      const validation = validateDbDataPayload(payload);
      if ('message' in validation) {
        setSyncStatus({ type: 'pull', success: false, message: validation.message });
      } else {
        const saved = await saveDbData(validation.data);

        if (!saved) {
          setSyncStatus({ type: 'pull', success: false, message: 'Pulled data, but database persistence failed. Retry before using this restore.' });
          setTimeout(() => setSyncStatus(null), 6000);
          return;
        }

        window.dispatchEvent(new Event('custom-db-updated'));
        window.dispatchEvent(new Event('custom-settings-updated'));
        setSyncStatus({ type: 'pull', success: true, message: 'External data restored.' });
      }
    } catch (err: any) {
      setSyncStatus({ type: 'pull', success: false, message: `Sync pull failed: ${err?.message}` });
    }
    setTimeout(() => setSyncStatus(null), 6000);
  };

  return (
    <div className="space-y-6 text-left" id="settings-management-tab">
      {/* Settings Intro Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-150 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h3 className="font-black text-slate-800 text-base uppercase tracking-wide flex items-center gap-1.5">
            <Settings size={18} className="text-blue-600 animate-spin-slow" /> Settings
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Manage firm details, invoice assets, payroll, and backup settings.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-3.5 py-1.5 border border-slate-205 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition font-bold text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw size={13} /> Reset Defaults
        </button>
      </div>

      {settingsSaveError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 flex items-start gap-2">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <span>{settingsSaveError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings Left Pane */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6 bg-white p-6 rounded-2xl border border-slate-150">
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b">
              <Building size={14} className="text-blue-600" /> Company Profile
            </h4>

            {saveSuccess && (
              <div className="bg-emerald-5 border border-emerald-250 p-4 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150 shadow-2xs">
                <Check size={16} className="text-emerald-600 shrink-0" />
                Company profile saved.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Company Name</label>
                <input
                  type="text"
                  required
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  placeholder="e.g. Alpha Design Studio"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">GSTIN</label>
                <input
                  type="text"
                  required
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-205 rounded-xl p-3 text-xs font-mono font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition uppercase"
                  placeholder="GSTIN"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Corporate Office Billing Address</label>
              <textarea
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 transition resize-none leading-relaxed"
                placeholder="Street address, city, state and PIN code"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Business Email Address</label>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  placeholder="contact@company.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Phone Number</label>
                <input
                  type="text"
                  required
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  placeholder="+91 99000 00000"
                />
              </div>
            </div>

            {/* Bank details input block */}
            <div className="space-y-4 pt-4 border-t border-slate-100/80">
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b">
                <Database size={13} className="text-blue-600" /> Bank Details
              </h4>
              <p className="text-[10px] text-slate-450 leading-relaxed">
                These fields appear on generated invoices.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Account Holder Name</label>
                  <input
                    type="text"
                    required
                    name="bankAccountName"
                    value={formData.bankAccountName}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="e.g. Alpha Design Studio"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Bank Name</label>
                  <input
                    type="text"
                    required
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="Bank name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Bank Account Number</label>
                  <input
                    type="text"
                    required
                    name="bankAccountNumber"
                    value={formData.bankAccountNumber}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="Account number"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Account Type</label>
                  <input
                    type="text"
                    required
                    name="bankAccountType"
                    value={formData.bankAccountType}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="e.g. Current, Savings"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">IFSC Code</label>
                  <input
                    type="text"
                    required
                    name="bankIfscCode"
                    value={formData.bankIfscCode}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-205 rounded-xl p-3 text-xs font-mono font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition uppercase"
                    placeholder="IFSC code"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end border-t">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm border-none"
            >
              <Check size={14} /> Save Profile
            </button>
          </div>
        </form>

        {/* Logo settings right side panel */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-150 text-left space-y-4 flex flex-col justify-between h-auto">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b">
              <Sparkles size={14} className="text-blue-600" /> Logo
            </h4>

            {logoSaveSuccess && (
              <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl text-emerald-800 text-[10.5px] font-bold flex items-center gap-1.5 animate-in fade-in duration-150 shadow-2xs">
                <Check size={14} className="text-emerald-600 shrink-0" />
                Logo saved.
              </div>
            )}

            {/* Current Logo preview block */}
            <div className="bg-slate-50 p-6 rounded-2xl border flex flex-col items-center justify-center text-center relative overflow-hidden gap-3 min-h-[160px]">
              {pendingLogo ? (
                <div className="space-y-3 flex flex-col items-center">
                  <img
                    src={pendingLogo}
                    alt="Uploaded firm logo"
                    className="w-20 h-20 object-contain mx-auto bg-white p-1 rounded-xl border"
                  />
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Custom Brand Preview</span>
                    <button
                      type="button"
                      onClick={handleResetLogo}
                      className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer border-none bg-transparent"
                    >
                      Reset / Clear Logo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-100 flex items-center justify-center text-blue-600 rounded-xl font-bold text-xl select-none font-sans border border-blue-200">
                    CD
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Default Logo</span>
                    <p className="text-[10px] text-slate-400 max-w-[200px]">Upload a logo to use on invoices and reports.</p>
                  </div>
                </div>
              )}

              {/* Unsaved Draft label */}
              {pendingLogo !== logoBase64 && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md animate-pulse">
                  Staged (Unsaved)
                </div>
              )}
            </div>

            {/* Upload form block */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                Logo File (PNG, JPEG, SVG)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                id="brand-logo-file-picker"
                className="hidden"
              />
              <label
                htmlFor="brand-logo-file-picker"
                className="w-full text-center border-2 border-dashed border-slate-205 hover:border-blue-450 p-4 rounded-xl text-xs font-bold text-slate-500 hover:text-blue-600 cursor-pointer block transition bg-slate-50/50 hover:bg-slate-50"
              >
                Choose Logo File
              </label>
            </div>

            {/* Save Button for Logo component */}
            <div className="pt-2 border-t flex justify-end">
              <button
                type="button"
                onClick={handleSaveLogo}
                disabled={pendingLogo === logoBase64}
                className={`w-full font-extrabold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border-none ${
                  pendingLogo === logoBase64
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-550 text-white'
                }`}
              >
                <Save size={13} />
                <span>Save Logo</span>
              </button>
            </div>
          </div>

          {/* Company Rubber Stamp card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-150 text-left space-y-4 flex flex-col justify-between h-auto">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b">
              <Sparkles size={14} className="text-blue-600" /> Company Stamp
            </h4>

            {stampSaveSuccess && (
              <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl text-emerald-800 text-[10.5px] font-bold flex items-center gap-1.5 animate-in fade-in duration-150 shadow-2xs">
                <Check size={14} className="text-emerald-600 shrink-0" />
                Stamp saved.
              </div>
            )}

            {/* Current Stamp preview block */}
            <div className="bg-slate-50 p-6 rounded-2xl border flex flex-col items-center justify-center text-center relative overflow-hidden gap-3 min-h-[160px]">
              {pendingStamp ? (
                <div className="space-y-3 flex flex-col items-center">
                  <img
                    src={pendingStamp}
                    alt="Uploaded stamp"
                    className="max-h-20 max-w-full object-contain mx-auto bg-white p-1 rounded-xl border"
                  />
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Stamp Preview</span>
                    <button
                      type="button"
                      onClick={handleResetStamp}
                      className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer border-none bg-transparent"
                    >
                      Reset / Clear Stamp
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-dashed border-blue-250">
                    <Save size={18} className="stroke-1 text-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">No Custom Stamp</span>
                    <p className="text-[10px] text-slate-400 max-w-[200px]">Upload a clear stamp image for invoice output.</p>
                  </div>
                </div>
              )}

              {/* Unsaved Draft label */}
              {pendingStamp !== stampBase64 && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md animate-pulse">
                  Staged (Unsaved)
                </div>
              )}
            </div>

            {/* Upload form block */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                Stamp File (PNG, JPEG, WebP)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleStampUpload}
                id="stamp-file-picker"
                className="hidden"
              />
              <label
                htmlFor="stamp-file-picker"
                className="w-full text-center border-2 border-dashed border-slate-205 hover:border-blue-450 p-4 rounded-xl text-xs font-bold text-slate-500 hover:text-blue-600 cursor-pointer block transition bg-slate-50/50 hover:bg-slate-50"
              >
                Choose Stamp File
              </label>
            </div>

            {/* Save Button for Stamp component */}
            <div className="pt-2 border-t flex justify-end">
              <button
                type="button"
                onClick={handleSaveStamp}
                disabled={pendingStamp === stampBase64}
                className={`w-full font-extrabold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border-none ${
                  pendingStamp === stampBase64
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-550 text-white'
                }`}
              >
                <Save size={13} />
                <span>Save Stamp</span>
              </button>
            </div>
          </div>

          {/* Authorized Signature Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-150 text-left space-y-4 flex flex-col justify-between h-auto">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b">
              <Sparkles size={14} className="text-emerald-600" /> Authorized Signature
            </h4>

            {signSaveSuccess && (
              <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl text-emerald-800 text-[10.5px] font-bold flex items-center gap-1.5 animate-in fade-in duration-150 shadow-2xs">
                <Check size={14} className="text-emerald-600 shrink-0" />
                Signature saved.
              </div>
            )}

            {/* Current Signature preview block */}
            <div className="bg-slate-50 p-6 rounded-2xl border flex flex-col items-center justify-center text-center relative overflow-hidden gap-3 min-h-[160px]">
              {pendingSign ? (
                <div className="space-y-3 flex flex-col items-center">
                  <img
                    src={pendingSign}
                    alt="Uploaded Signature"
                    className="max-h-20 max-w-full object-contain mx-auto bg-white p-1 rounded-xl border"
                  />
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Signature Preview</span>
                    <button
                      type="button"
                      onClick={handleResetSign}
                      className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer border-none bg-transparent"
                    >
                      Reset / Clear Signature
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-dashed border-emerald-250">
                    <Save size={18} className="stroke-1 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">No Custom Signature</span>
                    <p className="text-[10px] text-slate-400 max-w-[200px]">Upload the authorized signature used on invoices.</p>
                  </div>
                </div>
              )}

              {/* Unsaved Draft label */}
              {pendingSign !== signBase64 && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md animate-pulse">
                  Staged (Unsaved)
                </div>
              )}
            </div>

            {/* Upload form block */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                Signature File (PNG, JPEG, WebP)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleSignUpload}
                id="sign-file-picker"
                className="hidden"
              />
              <label
                htmlFor="sign-file-picker"
                className="w-full text-center border-2 border-dashed border-slate-205 hover:border-emerald-450 p-4 rounded-xl text-xs font-bold text-slate-500 hover:text-emerald-750 cursor-pointer block transition bg-slate-50/50 hover:bg-slate-50"
              >
                Choose Signature File
              </label>
            </div>

            {/* Save Button for Signature component */}
            <div className="pt-2 border-t flex justify-end">
              <button
                type="button"
                onClick={handleSaveSign}
                disabled={pendingSign === signBase64}
                className={`w-full font-extrabold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border-none ${
                  pendingSign === signBase64
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-550 text-white'
                }`}
              >
                <Save size={13} />
                <span>Save Signature</span>
              </button>
            </div>
          </div>

          {/* Additional Security card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 text-left space-y-3 relative overflow-hidden">
            <div className="flex gap-3 items-start">
              <div className="p-2 bg-slate-800 rounded-xl text-yellow-500 font-bold shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 block uppercase">Persistence</span>
                <h5 className="font-extrabold text-white text-xs">Cloud Sync</h5>
                <p className="text-[10px] text-slate-405 leading-relaxed">
                  Settings, payroll, invoice assets, and workspace records sync through Supabase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Roster & Salary Administration Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-150 text-left space-y-4 shadow-xs" id="staff-roster-payroll-planner">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3" id="payroll-header">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-slate-850 text-sm md:text-base flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              Staff &amp; Payroll
            </h3>
            <p className="text-xs text-slate-400">
              Monthly payroll feeds into overhead calculations.
            </p>
          </div>
          <div className="text-[11px] font-bold text-slate-705 bg-slate-100 border border-slate-150 px-3 py-1.5 rounded-lg shrink-0">
            Total Payroll: <span className="text-blue-600 font-extrabold font-mono text-xs">INR {staffList.reduce((acc, x) => acc + x.salary, 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Staff Table list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-mono text-[9px] tracking-wider">
                <th className="py-2.5 font-bold">Name</th>
                <th className="py-2.5 font-bold">Role</th>
                <th className="py-2.5 font-bold text-right w-40">Monthly Pay (INR)</th>
                <th className="py-2.5 font-bold text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                    No staff records yet.
                  </td>
                </tr>
              ) : (
                staffList.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/40 animate-in fade-in duration-100">
                    <td className="py-3 pr-2">
                      {editingStaffId === item.id ? (
                        <input
                          type="text"
                          required
                          value={editingStaffName}
                          onChange={(e) => setEditingStaffName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 font-medium focus:outline-none"
                        />
                      ) : (
                        <span className="text-slate-800 font-semibold">{item.name}</span>
                      )}
                    </td>
                    <td className="py-3 pr-2">
                      {editingStaffId === item.id ? (
                        <input
                          type="text"
                          required
                          value={editingStaffRole}
                          onChange={(e) => setEditingStaffRole(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-medium focus:outline-none"
                        />
                      ) : (
                        <span className="text-slate-500 bg-slate-105 border border-slate-150 px-2 py-0.5 rounded text-[10px] font-semibold">{item.role}</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {editingStaffId === item.id ? (
                        <div className="relative inline-block w-full">
                          <input
                            type="number"
                            required
                            min="1"
                            value={editingStaffSalary}
                            onChange={(e) => setEditingStaffSalary(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-right font-mono font-bold text-slate-800 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-slate-700">INR {item.salary.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {editingStaffId === item.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveEditStaff(item.id)}
                              className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition cursor-pointer border-none"
                              title="Save Changes"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingStaffId(null)}
                              className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg transition cursor-pointer border-none"
                              title="Cancel Edit"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEditStaff(item)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition cursor-pointer border-none bg-transparent"
                              title="Edit Staff Member"
                            >
                              <Edit size={13} className="text-slate-500" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(item.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition cursor-pointer border-none bg-transparent"
                              title="Remove Staff"
                            >
                              <Trash2 size={13} className="text-rose-500" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Interactive Add Inline Form for Staff */}
        <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:flex gap-3 pt-2 bg-slate-50 p-4.5 rounded-xl border border-slate-100">
          <div className="flex-1 text-left">
            <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Staff Member Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ar. Devika Patel"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl text-slate-800 placeholder-slate-400 font-semibold focus:outline-none"
            />
          </div>
          <div className="flex-1 text-left">
            <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Designation / Role
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Project Manager, Lead Site Inspector"
              value={newStaffRole}
              onChange={(e) => setNewStaffRole(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl text-slate-800 placeholder-slate-400 font-semibold focus:outline-none"
            />
          </div>
          <div className="w-full md:w-44 text-left">
            <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Monthly Salary (INR)
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 45050"
                value={newStaffSalary}
                onChange={(e) => setNewStaffSalary(e.target.value)}
                className="w-full bg-white border border-slate-250 text-xs px-3 py-2 rounded-xl text-slate-800 placeholder-slate-400 font-mono font-bold focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-550 text-white text-xs font-bold px-4 py-2.5 rounded-xl border-none cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <UserPlus size={14} /> Add Staff Member
            </button>
          </div>
        </form>
      </div>

      {/* Backups */}
      <div className="bg-white p-6 rounded-2xl border border-slate-150 space-y-5 text-left" id="database-storage-settings">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Database size={16} className="text-blue-600" /> Backups
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Export or restore workspace data when moving between devices.
            </p>
          </div>
          <span className="hidden text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-mono uppercase tracking-wider shrink-0">
            {storageType === 'local' ? 'Workspace database' : 'External sync'}
          </span>
        </div>

        {/* Storage Segment Picker Tab Button Selector */}
        <div className="hidden bg-slate-50 p-1 rounded-xl w-full max-w-[420px] border border-slate-150">
          <button
            type="button"
            onClick={() => setStorageType('local')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer border-none ${
              storageType === 'local'
                ? 'bg-white shadow text-slate-800'
                : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            <Server size={14} />
            <span>Workspace Database</span>
          </button>
          <button
            type="button"
            onClick={() => setStorageType('cloud')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer border-none ${
              storageType === 'cloud'
                ? 'bg-white shadow text-slate-800'
                : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            <Cloud size={14} />
            <span>External Sync</span>
          </button>
        </div>

        <form onSubmit={handleSaveStorageSettings} className="space-y-5">
          {true ? (
            <div className="space-y-4 pt-1">
              <div className="hidden bg-slate-50 p-4 rounded-xl border border-slate-200/60 max-w-2xl text-[11px] text-slate-600 leading-relaxed space-y-2">
                <p>
                  <strong>Workspace database:</strong> Records are loaded from and saved through the application persistence layer.
                </p>
                <p>
                  Export/import is available for controlled workspace backup and restore operations.
                </p>
              </div>

              <div className="hidden space-y-1.5 max-w-md">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Workspace Key Prefix
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={localPrefix}
                    onChange={(e) => setLocalPrefix(e.target.value)}
                    placeholder="e.g. cc_ or workshop_2026_"
                    className="flex-1 bg-slate-50 border border-slate-205 rounded-xl p-3 text-xs font-mono font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                  <div className="text-[10px] flex items-center text-slate-400 font-semibold italic bg-slate-100/50 px-3 py-2 sm:py-0 rounded-xl border">
                    Namespace <code className="text-slate-700 ml-1.5 font-bold font-mono">{localPrefix}</code>
                  </div>
                </div>
              </div>

              {/* Import Export Actions Suite */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 text-[11px] block">Backups</span>
                  <span className="text-[10px] text-slate-450 block">Export or import the workspace ledger as JSON.</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportDB}
                    className="px-3.5 py-2 hover:bg-slate-50 bg-white border border-slate-200 hover:text-blue-600 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer shrink-0 text-slate-600 text-xs"
                    title="Download database dump"
                  >
                    <FileDown size={13} className="text-slate-500" />
                    <span>Export JSON</span>
                  </button>

                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportDB}
                      id="db-backup-import-picker"
                      className="hidden"
                    />
                    <label
                      htmlFor="db-backup-import-picker"
                      className="px-3.5 py-2 hover:bg-slate-50 bg-white border border-slate-205 hover:text-blue-600 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer shrink-0 text-slate-600 text-xs text-center inline-block"
                    >
                      <FileUp size={13} className="text-slate-500 inline mr-1" />
                      <span>Import JSON</span>
                    </label>
                  </div>
                </div>
              </div>

              {importStatus && (
                <div className={`p-3 rounded-xl border text-xs font-bold ${importStatus.success ? 'bg-emerald-5 border-emerald-200 text-emerald-800' : 'bg-rose-5 border-rose-200 text-rose-800'} animate-in fade-in duration-100`}>
                  {importStatus.message}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 text-[11px] text-blue-800 leading-relaxed space-y-1 max-w-2xl">
                <p className="font-extrabold flex items-center gap-1">
                  <Cloud size={12} /> External sync
                </p>
                <p>
                  Connect a REST endpoint only for controlled migration or interoperability workflows.
                </p>
                <p className="text-slate-500">
                  Use upload or download only when you need to move data between workspace persistence and an external endpoint.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                    API Endpoint
                  </label>
                  <input
                    type="url"
                    value={cloudEndpoint}
                    onChange={(e) => setCloudEndpoint(e.target.value)}
                    required={storageType === 'cloud'}
                    placeholder="e.g. https://api.jsonbin.it/v1/vault/my_keys"
                    className="w-full bg-slate-50 border border-slate-205 rounded-xl p-3 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                  <span className="text-[9px] text-slate-400 block mt-1">The API endpoint should accept <code>GET</code> to retrieve and <code>POST</code> with JSON payload to overwrite.</span>
                </div>

                <div className="space-y-1.5 pb-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                    Authorization Header
                  </label>
                  <input
                    type="text"
                    value={cloudAuth}
                    onChange={(e) => setCloudAuth(e.target.value)}
                    placeholder="e.g. Bearer my-sec-token-123"
                    className="w-full bg-slate-50 border border-slate-205 rounded-xl p-3 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                  <span className="text-[9px] text-slate-400 block mt-1">Bearer token or apiKey attached to <code>Authorization</code> request headers.</span>
                </div>
              </div>

              {/* Sync controls action bar */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 text-[11px] block">Sync Actions</span>
                  <span className="text-[10px] text-slate-450 block">Test the connection or move data between workspace persistence and an external endpoint.</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestCloudConnection}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer border-none text-xs"
                  >
                    <RefreshCw size={12} className="animate-spin-slow" />
                    <span>Test Connection</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePushToCloud}
                    className="px-3.5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer border-none text-xs"
                    title="Upload workspace data"
                  >
                    <UploadCloud size={13} />
                    <span>Upload Workspace Data</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePullFromCloud}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl font-bold transition flex items-center gap-1 cursor-pointer border-none text-xs"
                    title="Download external data into workspace persistence"
                  >
                    <DownloadCloud size={13} />
                    <span>Download Cloud Data</span>
                  </button>
                </div>
              </div>

              {testStatus && (
                <div className={`p-3 rounded-xl border text-xs font-bold ${testStatus.success ? 'bg-emerald-5 border-emerald-250 text-emerald-800' : 'bg-rose-5 border-rose-250 text-rose-800'} animate-in fade-in duration-100`}>
                  {testStatus.message}
                </div>
              )}

              {syncStatus && (
                <div className={`p-3 rounded-xl border text-xs font-bold ${syncStatus.success ? 'bg-emerald-5 border-emerald-250 text-emerald-800' : 'bg-rose-5 border-rose-250 text-rose-800'} animate-in fade-in duration-100`}>
                  {syncStatus.message}
                </div>
              )}
            </div>
          )}

          <div className="hidden pt-4 border-t justify-end gap-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-550 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
            >
              <Save size={13} />
              <span>Save Storage Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
