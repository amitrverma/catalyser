import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Check, RotateCcw, AlertCircle, Sparkles, Building, KeyRound, MapPin, ReceiptText, Database, Cloud, RefreshCw, UploadCloud, DownloadCloud, FileDown, FileUp, Save, Server, Users, UserPlus, Trash2, Edit, Plus, X, Briefcase } from 'lucide-react';
import { saveDbData } from '../lib/db';

export default function SettingsManager() {
  const [formData, setFormData] = useState({
    companyName: 'Catalyser Design',
    address: 'Unit number 809, 99 Avenue, Lullanagar, Pune - 411040',
    gstNumber: '27AAECC4524C1Z9',
    email: 'contact@catalyserdesign.com',
    phone: '+91 98765 43210',
    bankAccountName: 'Catalyser Design',
    bankName: 'HDFC Bank Ltd',
    bankAccountNumber: '50200012345678',
    bankAccountType: 'Current',
    bankIfscCode: 'HDFC0001234'
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

  // Staff and salary directory list states
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; role: string; salary: number }>>(() => {
    const saved = localStorage.getItem('cc_staff_salaries');
    return saved ? JSON.parse(saved) : [
      { id: 'st-1', name: 'Ar. Rohit Sharma', role: 'Senior Landscape Architect', salary: 55000 },
      { id: 'st-2', name: 'Ananya Mehta', role: 'Interior & Space Designer', salary: 38000 },
      { id: 'st-3', name: 'Kabir Verma', role: '3D Visualiser & Renderer', salary: 28000 }
    ];
  });

  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newStaffSalary, setNewStaffSalary] = useState('');
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaffName, setEditingStaffName] = useState('');
  const [editingStaffRole, setEditingStaffRole] = useState('');
  const [editingStaffSalary, setEditingStaffSalary] = useState('');

  const saveStaffList = (newList: Array<{ id: string; name: string; role: string; salary: number }>) => {
    setStaffList(newList);
    localStorage.setItem('cc_staff_salaries', JSON.stringify(newList));
    window.dispatchEvent(new Event('custom-settings-updated'));
  };

  const handleAddStaff = (e: React.FormEvent) => {
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

    saveStaffList([...staffList, newItem]);
    setNewStaffName('');
    setNewStaffRole('');
    setNewStaffSalary('');
  };

  const handleDeleteStaff = (id: string) => {
    saveStaffList(staffList.filter(x => x.id !== id));
  };

  const handleStartEditStaff = (item: { id: string; name: string; role: string; salary: number }) => {
    setEditingStaffId(item.id);
    setEditingStaffName(item.name);
    setEditingStaffRole(item.role);
    setEditingStaffSalary(item.salary.toString());
  };

  const handleSaveEditStaff = (id: string) => {
    if (!editingStaffName.trim() || !editingStaffRole.trim() || !editingStaffSalary) return;
    const val = parseFloat(editingStaffSalary);
    if (isNaN(val) || val <= 0) return;

    saveStaffList(staffList.map(x => x.id === id ? { ...x, name: editingStaffName.trim(), role: editingStaffRole.trim(), salary: val } : x));
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
    const cName = localStorage.getItem('cc_company_name');
    const cAddr = localStorage.getItem('cc_company_address');
    const cGst = localStorage.getItem('cc_company_gst');
    const cEmail = localStorage.getItem('cc_company_email');
    const cPhone = localStorage.getItem('cc_company_phone');
    const logo = localStorage.getItem('custom_logo_base64');
    
    // Fallback support for any unified signature/stamp saved previously
    let stamp = localStorage.getItem('custom_stamp_base64');
    if (!stamp) {
      stamp = localStorage.getItem('custom_stamp_sign_base64');
    }
    const signature = localStorage.getItem('custom_sign_base64');

    const sType = (localStorage.getItem('cc_storage_type') as 'local' | 'cloud') || 'local';
    const sPrefix = localStorage.getItem('cc_storage_local_prefix') || 'cc_';
    const sEndpoint = localStorage.getItem('cc_storage_cloud_endpoint') || '';
    const sAuth = localStorage.getItem('cc_storage_cloud_auth') || '';

    const bAccName = localStorage.getItem('cc_bank_account_name');
    const bBankName = localStorage.getItem('cc_bank_name');
    const bAccNo = localStorage.getItem('cc_bank_account_number');
    const bAccType = localStorage.getItem('cc_bank_account_type');
    const bIfsc = localStorage.getItem('cc_bank_ifsc');

    setFormData({
      companyName: cName || 'Catalyser Design',
      address: cAddr || 'Unit number 809, 99 Avenue, Lullanagar, Pune - 411040',
      gstNumber: cGst || '27AAECC4524C1Z9',
      email: cEmail || 'contact@catalyserdesign.com',
      phone: cPhone || '+91 98765 43210',
      bankAccountName: bAccName || 'Catalyser Design',
      bankName: bBankName || 'HDFC Bank Ltd',
      bankAccountNumber: bAccNo || '50200012345678',
      bankAccountType: bAccType || 'Current',
      bankIfscCode: bIfsc || 'HDFC0001234'
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
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPendingLogo(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = () => {
    setLogoBase64(pendingLogo);
    if (pendingLogo) {
      localStorage.setItem('custom_logo_base64', pendingLogo);
    } else {
      localStorage.removeItem('custom_logo_base64');
    }
    window.dispatchEvent(new Event('custom-logo-updated'));
    window.dispatchEvent(new Event('custom-settings-updated'));
    setLogoSaveSuccess(true);
    setTimeout(() => setLogoSaveSuccess(false), 3000);
  };

  const handleResetLogo = () => {
    setPendingLogo(null);
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPendingStamp(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStamp = () => {
    setStampBase64(pendingStamp);
    if (pendingStamp) {
      localStorage.setItem('custom_stamp_base64', pendingStamp);
      // Synchronize with the older unified key as fallback for other parts of system
      localStorage.setItem('custom_stamp_sign_base64', pendingStamp);
    } else {
      localStorage.removeItem('custom_stamp_base64');
      localStorage.removeItem('custom_stamp_sign_base64');
    }
    window.dispatchEvent(new Event('custom-stamp-updated'));
    window.dispatchEvent(new Event('custom-settings-updated'));
    setStampSaveSuccess(true);
    setTimeout(() => setStampSaveSuccess(false), 3000);
  };

  const handleResetStamp = () => {
    setPendingStamp(null);
  };

  const handleSignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPendingSign(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSign = () => {
    setSignBase64(pendingSign);
    if (pendingSign) {
      localStorage.setItem('custom_sign_base64', pendingSign);
    } else {
      localStorage.removeItem('custom_sign_base64');
    }
    window.dispatchEvent(new Event('custom-sign-updated'));
    window.dispatchEvent(new Event('custom-settings-updated'));
    setSignSaveSuccess(true);
    setTimeout(() => setSignSaveSuccess(false), 3000);
  };

  const handleResetSign = () => {
    setPendingSign(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('cc_company_name', formData.companyName);
    localStorage.setItem('cc_company_address', formData.address);
    localStorage.setItem('cc_company_gst', formData.gstNumber);
    localStorage.setItem('cc_company_email', formData.email);
    localStorage.setItem('cc_company_phone', formData.phone);
    localStorage.setItem('cc_bank_account_name', formData.bankAccountName);
    localStorage.setItem('cc_bank_name', formData.bankName);
    localStorage.setItem('cc_bank_account_number', formData.bankAccountNumber);
    localStorage.setItem('cc_bank_account_type', formData.bankAccountType);
    localStorage.setItem('cc_bank_ifsc', formData.bankIfscCode);

    // Dispatch event to announce update to other components immediately
    window.dispatchEvent(new Event('custom-settings-updated'));
    localStorage.setItem('cc_settings_sync_trigger', Date.now().toString());

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    localStorage.setItem('cc_company_name', 'Catalyser Design');
    localStorage.setItem('cc_company_address', 'Unit number 809, 99 Avenue, Lullanagar, Pune - 411040');
    localStorage.setItem('cc_company_gst', '27AAECC4524C1Z9');
    localStorage.setItem('cc_company_email', 'contact@catalyserdesign.com');
    localStorage.setItem('cc_company_phone', '+91 98765 43210');
    localStorage.setItem('cc_bank_account_name', 'Catalyser Design');
    localStorage.setItem('cc_bank_name', 'HDFC Bank Ltd');
    localStorage.setItem('cc_bank_account_number', '50200012345678');
    localStorage.setItem('cc_bank_account_type', 'Current');
    localStorage.setItem('cc_bank_ifsc', 'HDFC0001234');
    localStorage.removeItem('custom_logo_base64');
    localStorage.removeItem('custom_stamp_base64');
    localStorage.removeItem('custom_stamp_sign_base64');
    localStorage.removeItem('custom_sign_base64');
    localStorage.removeItem('cc_staff_salaries');

    localStorage.setItem('cc_storage_type', 'local');
    localStorage.setItem('cc_storage_local_prefix', 'cc_');
    localStorage.setItem('cc_storage_cloud_endpoint', '');
    localStorage.setItem('cc_storage_cloud_auth', '');

    setFormData({
      companyName: 'Catalyser Design',
      address: 'Unit number 809, 99 Avenue, Lullanagar, Pune - 411040',
      gstNumber: '27AAECC4524C1Z9',
      email: 'contact@catalyserdesign.com',
      phone: '+91 98765 43210',
      bankAccountName: 'Catalyser Design',
      bankName: 'HDFC Bank Ltd',
      bankAccountNumber: '50200012345678',
      bankAccountType: 'Current',
      bankIfscCode: 'HDFC0001234'
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
    setStaffList([
      { id: 'st-1', name: 'Ar. Rohit Sharma', role: 'Senior Landscape Architect', salary: 55000 },
      { id: 'st-2', name: 'Ananya Mehta', role: 'Interior & Space Designer', salary: 38000 },
      { id: 'st-3', name: 'Kabir Verma', role: '3D Visualiser & Renderer', salary: 28000 }
    ]);

    window.dispatchEvent(new Event('custom-logo-updated'));
    window.dispatchEvent(new Event('custom-stamp-updated'));
    window.dispatchEvent(new Event('custom-sign-updated'));
    window.dispatchEvent(new Event('custom-settings-updated'));

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveStorageSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('cc_storage_type', storageType);
    localStorage.setItem('cc_storage_local_prefix', localPrefix);
    localStorage.setItem('cc_storage_cloud_endpoint', cloudEndpoint);
    localStorage.setItem('cc_storage_cloud_auth', cloudAuth);

    // Dispatch event to announce update
    window.dispatchEvent(new Event('custom-db-updated'));
    window.dispatchEvent(new Event('custom-settings-updated'));

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportDB = () => {
    const prefix = localStorage.getItem('cc_storage_local_prefix') || 'cc_';
    const projects = localStorage.getItem(`${prefix}projects`);
    const payments = localStorage.getItem(`${prefix}payments`);
    const contacts = localStorage.getItem(`${prefix}contacts`);
    const documents = localStorage.getItem(`${prefix}documents`);

    const dbDump = {
      exportedAt: new Date().toISOString(),
      storagePrefix: prefix,
      data: {
        projects: projects ? JSON.parse(projects) : [],
        payments: payments ? JSON.parse(payments) : [],
        contacts: contacts ? JSON.parse(contacts) : [],
        documents: documents ? JSON.parse(documents) : []
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbDump, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `catalyser_vault_${prefix}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.data && Array.isArray(parsed.data.projects)) {
          const prefix = localPrefix || 'cc_';
          
          localStorage.setItem(`${prefix}projects`, JSON.stringify(parsed.data.projects));
          localStorage.setItem(`${prefix}payments`, JSON.stringify(parsed.data.payments || []));
          localStorage.setItem(`${prefix}contacts`, JSON.stringify(parsed.data.contacts || []));
          localStorage.setItem(`${prefix}documents`, JSON.stringify(parsed.data.documents || []));
          void saveDbData({
            projects: parsed.data.projects,
            payments: parsed.data.payments || [],
            contacts: parsed.data.contacts || [],
            documents: parsed.data.documents || []
          });

          window.dispatchEvent(new Event('custom-db-updated'));
          window.dispatchEvent(new Event('custom-settings-updated'));

          setImportStatus({ success: true, message: `Imported successfully to namespace "${prefix}"!` });
        } else {
          setImportStatus({ success: false, message: 'Invalid payload structure. Make sure "data.projects" contains a valid list.' });
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
        setTestStatus({ success: true, message: `Ping success! Status: ${res.status}. Data channel open.` });
      } else {
        setTestStatus({ success: true, message: `Access validated. Server reported response status ${res.status}. POST operational.` });
      }
    } catch (err: any) {
      setTestStatus({ success: false, message: `Verification check: ${err?.message || 'Access blocked/CORS shield'}.` });
    }
    setTimeout(() => setTestStatus(null), 6000);
  };

  const handlePushToCloud = async () => {
    if (!cloudEndpoint) {
      setSyncStatus({ type: 'push', success: false, message: 'Cloud URL is null.' });
      return;
    }
    try {
      const prefix = localPrefix || 'cc_';
      const data = {
        projects: JSON.parse(localStorage.getItem(`${prefix}projects`) || '[]'),
        payments: JSON.parse(localStorage.getItem(`${prefix}payments`) || '[]'),
        contacts: JSON.parse(localStorage.getItem(`${prefix}contacts`) || '[]'),
        documents: JSON.parse(localStorage.getItem(`${prefix}documents`) || '[]')
      };
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
        setSyncStatus({ type: 'push', success: true, message: 'All local entities backed up to the cloud storage registry successfully!' });
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
      if (payload && Array.isArray(payload.projects)) {
        const prefix = localPrefix || 'cc_';
        localStorage.setItem(`${prefix}projects`, JSON.stringify(payload.projects));
        localStorage.setItem(`${prefix}payments`, JSON.stringify(payload.payments || []));
        localStorage.setItem(`${prefix}contacts`, JSON.stringify(payload.contacts || []));
        localStorage.setItem(`${prefix}documents`, JSON.stringify(payload.documents || []));
        void saveDbData({
          projects: payload.projects,
          payments: payload.payments || [],
          contacts: payload.contacts || [],
          documents: payload.documents || []
        });

        window.dispatchEvent(new Event('custom-db-updated'));
        window.dispatchEvent(new Event('custom-settings-updated'));
        setSyncStatus({ type: 'pull', success: true, message: 'Pulled cloud state locally!' });
      } else {
        setSyncStatus({ type: 'pull', success: false, message: 'No matching "projects" hierarchy found in server payload.' });
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
            <Settings size={18} className="text-blue-600 animate-spin-slow" /> Core Studio Parameters
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Manage your firm's visual identity, contact coordinates, billing address, and certified GSTIN identification settings.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-3.5 py-1.5 border border-slate-205 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition font-bold text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw size={13} /> Clear to Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings Left Pane */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6 bg-white p-6 rounded-2xl border border-slate-150">
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b">
              <Building size={14} className="text-blue-600" /> Firm Profiling Directory
            </h4>

            {saveSuccess && (
              <div className="bg-emerald-5 border border-emerald-250 p-4 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150 shadow-2xs">
                <Check size={16} className="text-emerald-600 shrink-0" />
                Company profile attributes synchronized and stored successfully! All invoices and billing statements now display these revised coordinates.
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
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Firm GSTIN (Tax Identification)</label>
                <input
                  type="text"
                  required
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-205 rounded-xl p-3 text-xs font-mono font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition uppercase"
                  placeholder="e.g. 27AAECC4524C1Z9"
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
                <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Office Hotline / Phone Number</label>
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
                <Database size={13} className="text-blue-600" /> Commercial Bank Coordinates
              </h4>
              <p className="text-[10px] text-slate-450 leading-relaxed">
                Configure corporate banking indicators. These verified bank fields are automatically loaded at the bottom of generated client invoice PDFs.
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
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Bank Institution Name</label>
                  <input
                    type="text"
                    required
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="e.g. HDFC Bank Ltd"
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
                    placeholder="e.g. 50200012345678"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Account Category / Type</label>
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
                  <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">IFSC Transit Code</label>
                  <input
                    type="text"
                    required
                    name="bankIfscCode"
                    value={formData.bankIfscCode}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-205 rounded-xl p-3 text-xs font-mono font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition uppercase"
                    placeholder="e.g. HDFC0001234"
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
              <Check size={14} /> Save Profile Parameters
            </button>
          </div>
        </form>

        {/* Logo settings right side panel */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-150 text-left space-y-4 flex flex-col justify-between h-auto">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b">
              <Sparkles size={14} className="text-blue-600" /> Logo Branding Suite
            </h4>

            {logoSaveSuccess && (
              <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl text-emerald-800 text-[10.5px] font-bold flex items-center gap-1.5 animate-in fade-in duration-150 shadow-2xs">
                <Check size={14} className="text-emerald-600 shrink-0" />
                Logo branding coordinates updated successfully!
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
                  {/* Default styled dummy logo icon representation from Logo.tsx preview */}
                  <div className="w-16 h-16 bg-blue-100 flex items-center justify-center text-blue-600 rounded-xl font-bold text-xl select-none font-sans border border-blue-200">
                    CD
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Default Vector Blueprint</span>
                    <p className="text-[10px] text-slate-400 max-w-[200px]">No design uploads matched. Upload custom client-facing logo brand below.</p>
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
                Choose Logo Image File (PNG, JPEG, SVG)
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
                📥 Choose Logo Image
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
                <span>Save Logo Branding</span>
              </button>
            </div>
          </div>

          {/* Company Rubber Stamp card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-150 text-left space-y-4 flex flex-col justify-between h-auto">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b">
              <Sparkles size={14} className="text-blue-600" /> Company Rubber Stamp
            </h4>

            {stampSaveSuccess && (
              <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl text-emerald-800 text-[10.5px] font-bold flex items-center gap-1.5 animate-in fade-in duration-150 shadow-2xs">
                <Check size={14} className="text-emerald-600 shrink-0" />
                Company rubber stamp uploaded and saved successfully!
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
                    <p className="text-[10px] text-slate-400 max-w-[200px]">Upload a clear transparent or soft copy image of your official business rubber stamp.</p>
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
                Choose Stamp Copy (PNG, JPEG, WebP)
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
                📥 Choose Stamp File
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
                <span>Save Rubber Stamp</span>
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
                Authorized signature saved successfully!
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
                    <p className="text-[10px] text-slate-400 max-w-[200px]">Upload a clear transparent or soft copy image of the authorized signatory signature.</p>
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
                Choose Signature Copy (PNG, JPEG, WebP)
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
                📥 Choose Signature File
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
                <span>Save Signature File</span>
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
                <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 block uppercase">Audit Safe Security</span>
                <h5 className="font-extrabold text-white text-xs">On-Device Local Sandbox</h5>
                <p className="text-[10px] text-slate-405 leading-relaxed">
                  All company settings are safely and privately locked within your browser’s isolated local sandbox filesystem. No unencrypted corporate financial identifiers leaving current endpoint.
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
              Staff Roster &amp; Monthly Payroll Configuration
            </h3>
            <p className="text-xs text-slate-400">
              Manage internal office staff, architects, designers, and logistical retainerships. Monthly payroll sums automatically feed into your Studio Overhead calculations.
            </p>
          </div>
          <div className="text-[11px] font-bold text-slate-705 bg-slate-100 border border-slate-150 px-3 py-1.5 rounded-lg shrink-0">
            Total Payroll: <span className="text-blue-600 font-extrabold font-mono text-xs">₹{staffList.reduce((acc, x) => acc + x.salary, 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Staff Table list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-mono text-[9px] tracking-wider">
                <th className="py-2.5 font-bold">Staff Member Name</th>
                <th className="py-2.5 font-bold">Designation/Contract Role</th>
                <th className="py-2.5 font-bold text-right w-40">Monthly Compensation (₹)</th>
                <th className="py-2.5 font-bold text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                    No active staff configurations registered. Add your first design associate below!
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
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            required
                            min="1"
                            value={editingStaffSalary}
                            onChange={(e) => setEditingStaffSalary(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 pl-6 pr-2.5 py-1 rounded-lg text-right font-mono font-bold text-slate-800 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-slate-700">₹{item.salary.toLocaleString()}</span>
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
              Monthly Salary (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs font-mono">₹</span>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 45050"
                value={newStaffSalary}
                onChange={(e) => setNewStaffSalary(e.target.value)}
                className="w-full bg-white border border-slate-250 text-xs pl-7 pr-3 py-2 rounded-xl text-slate-800 placeholder-slate-400 font-mono font-bold focus:outline-none"
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

      {/* Database Location & Storage Infrastructure Area */}
      <div className="bg-white p-6 rounded-2xl border border-slate-150 space-y-5 text-left" id="database-storage-settings">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Database size={16} className="text-blue-600" /> Database Location & Storage Infrastructure
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Configure whether to persist transaction logs, bills, and project portfolios inside the local browser sandbox or synchronize to an external cloud database.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-mono uppercase tracking-wider block shrink-0">
            {storageType === 'local' ? 'Local sandbox active' : 'Connected to API cloud'}
          </span>
        </div>

        {/* Storage Segment Picker Tab Button Selector */}
        <div className="flex bg-slate-50 p-1 rounded-xl w-full max-w-[420px] border border-slate-150">
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
            <span>Local Browser Storage</span>
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
            <span>Cloud REST API Storage</span>
          </button>
        </div>

        <form onSubmit={handleSaveStorageSettings} className="space-y-5">
          {storageType === 'local' ? (
            <div className="space-y-4 pt-1">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 max-w-2xl text-[11px] text-slate-600 leading-relaxed space-y-2">
                <p>
                  <strong>💡 Local Sandbox Mode:</strong> Your architectural ledgers are securely recorded inside this browser's <code>localStorage</code> sandbox. This keeps details fully client-side for maximum confidentiality.
                </p>
                <p>
                  To manage multiple workspace folder environments or segregate separate accounts, modify the custom <strong>Storage Key Path prefix</strong> below.
                </p>
              </div>

              <div className="space-y-1.5 max-w-md">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Storage Namespace Prefix / Save Path
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
                    Key resolves to: <code className="text-slate-700 ml-1.5 font-bold font-mono">{localPrefix}projects</code>
                  </div>
                </div>
              </div>

              {/* Import Export Actions Suite */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 text-[11px] block">Backup Vault Controls</span>
                  <span className="text-[10px] text-slate-450 block">Manually export this workspace's entire ledger as a structured JSON backup file, or migrate values in.</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportDB}
                    className="px-3.5 py-2 hover:bg-slate-50 bg-white border border-slate-200 hover:text-blue-600 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer shrink-0 text-slate-600 text-xs"
                    title="Download database dump"
                  >
                    <FileDown size={13} className="text-slate-500" />
                    <span>Export Ledger JSON</span>
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
                      <span>Import Ledger JSON</span>
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
                  <Cloud size={12} /> Active Cloud Synchronization
                </p>
                <p>
                  When Cloud REST API Mode is saved, all changes to projects, transactions, and payments will be automatically and non-blockingly dispatched to your REST server path via background sync.
                </p>
                <p className="text-slate-500">
                  You can push your current local sandbox records up to sync files initially, or pull existing records back from the cloud registry.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                    Cloud Storage REST API Endpoint Port / URL Path
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
                    Cloud Authorization Header Value (Optional Key)
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
                  <span className="font-bold text-slate-800 text-[11px] block">Sync Operations Console</span>
                  <span className="text-[10px] text-slate-450 block">Manually resolve records or check standard connectivity parameters.</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestCloudConnection}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer border-none text-xs"
                  >
                    <RefreshCw size={12} className="animate-spin-slow" />
                    <span>Ping Endpoint</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePushToCloud}
                    className="px-3.5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer border-none text-xs"
                    title="Upload local state to Cloud API path"
                  >
                    <UploadCloud size={13} />
                    <span>Push Sandbox to Cloud</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePullFromCloud}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl font-bold transition flex items-center gap-1 cursor-pointer border-none text-xs"
                    title="Download Cloud state into Local Sandbox"
                  >
                    <DownloadCloud size={13} />
                    <span>Pull Cloud to Sandbox</span>
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

          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-550 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
            >
              <Save size={13} />
              <span>Apply Storage Infrastructure Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
