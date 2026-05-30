/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, Payment, Contact, CloudDocument, ProjectStatus, PaymentType, DocumentCategory, DbData } from './types';
import { getDbData, saveDbData } from './lib/db';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { hydrateSettingsFromSupabase, installSettingsPersistence, persistSettingsToSupabase } from './lib/settingsSync';
import { createWorkspaceFileUrl, uploadWorkspaceFile } from './lib/fileStorage';
import { ensureActiveOrganization } from './lib/orgs';
import { formatDate } from './lib/formatter';
import Logo from './components/Logo';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import ContactManager from './components/ContactManager';
import ReportGenerator from './components/ReportGenerator';
import PartyLedgerStandalone from './components/PartyLedgerStandalone';
import SettingsManager from './components/SettingsManager';
import { LayoutDashboard, FolderKanban, Users, ShieldAlert, FileSpreadsheet, Settings, LogOut } from 'lucide-react';

export default function App() {
  const [db, setDb] = useState<DbData | null>(null);

  // View state controllers
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [homeTab, setHomeTab] = useState<'dashboard' | 'projects' | 'contacts' | 'reports' | 'settings'>('projects');
  
  // State for recording deletion confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Standalone mode detection for multi-tab party ledgers
  const [standalonePartyName, setStandalonePartyName] = useState<string | null>(null);

  // Initialize data on mount
  useEffect(() => {
    let mounted = true;

    installSettingsPersistence();

    hydrateSettingsFromSupabase()
      .then(() => persistSettingsToSupabase())
      .then(() => getDbData())
      .then((data) => {
        if (mounted) setDb(data);
      });

    // Synchronize url params
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'partyLedger') {
      setStandalonePartyName(params.get('partyName'));
    }

    // Dynamic storage listener to keep different tabs instantly synced
    const handleStorageSync = async () => {
      const data = await getDbData();
      setDb(data);
    };
    const handleSettingsSync = async () => {
      await persistSettingsToSupabase();
      const data = await getDbData();
      setDb(data);
    };
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('custom-db-updated', handleStorageSync);
    window.addEventListener('custom-settings-updated', handleSettingsSync);

    return () => {
      mounted = false;
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('custom-db-updated', handleStorageSync);
      window.removeEventListener('custom-settings-updated', handleSettingsSync);
    };
  }, []);

  // Sync state helpers
  const saveState = (updatedDb: typeof db) => {
    if (!updatedDb) return;
    setDb(updatedDb);
    void saveDbData(updatedDb);
  };

  if (!db) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-slate-400">
        <Logo size="lg" layout="column" />
        <span className="text-xs font-mono tracking-widest mt-4 animate-pulse">
          INITIALIZING SECURE PORTFOLIOS...
        </span>
      </div>
    );
  }

  // Active Selected Project object
  const activeProject = db.projects.find((p) => p.id === selectedProjectId);

  // ----------------------------------------------------
  // Action Handlers
  // ----------------------------------------------------

  const handleAddProject = (
    name: string,
    description: string,
    budget: number,
    clientName: string,
    address: string
  ) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name,
      description,
      status: 'ongoing',
      budget,
      clientName,
      address,
      createdAt: new Date().toISOString().substring(0, 10), // auto device date
    };

    // Auto-create client contact when adding project to save time on-site!
    const newClientContact: Contact = {
      id: `c-${Date.now()}`,
      name: clientName,
      role: 'client',
      phone: '',
      email: '',
      company: 'Client Partner',
    };

    const updated = {
      ...db,
      projects: [newProj, ...db.projects],
      contacts: [newClientContact, ...db.contacts],
    };
    saveState(updated);
  };

  const handleUpdateStatus = (projectId: string, status: ProjectStatus) => {
    const updatedProjects = db.projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, status };
      }
      return p;
    });

    const updated = { ...db, projects: updatedProjects };
    saveState(updated);
  };

  const handleAddPayment = (paymentData: Omit<Payment, 'id'>) => {
    const newPay: Payment = {
      id: `pay-${Date.now()}`,
      ...paymentData,
    };

    const updated = {
      ...db,
      payments: [newPay, ...db.payments],
    };
    saveState(updated);
  };

  const handleEditPayment = (updatedPayment: Payment) => {
    const updated = {
      ...db,
      payments: db.payments.map((p) => (p.id === updatedPayment.id ? updatedPayment : p)),
    };
    saveState(updated);
  };

  const handleDeletePayment = (paymentId: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Confirm Payment Record Deletion',
      message: 'Are you sure you want to permanently delete this cash flow transaction record? This action will adjust the financial ledger balances and cannot be undone.',
      onConfirm: () => {
        const updated = {
          ...db,
          payments: db.payments.filter((p) => p.id !== paymentId),
        };
        saveState(updated);
        setDeleteConfirm(null);
      }
    });
  };

  const handleAddContact = (
    name: string,
    role: 'client' | 'vendor' | 'supplier',
    phone: string,
    email: string,
    company: string,
    gstNumber?: string,
    address?: string
  ) => {
    const newContact: Contact = {
      id: `c-${Date.now()}`,
      name,
      role,
      phone,
      email,
      company,
      gstNumber,
      address,
    };

    const updated = {
      ...db,
      contacts: [newContact, ...db.contacts],
    };
    saveState(updated);
  };

  const handleDeleteContact = (contactId: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Confirm Contact Profile Removal',
      message: 'Are you sure you want to permanently delete this contact from the global vault directory? Existing transactions that refer to this party will remain intact.',
      onConfirm: () => {
        const updated = {
          ...db,
          contacts: db.contacts.filter((c) => c.id !== contactId),
        };
        saveState(updated);
        setDeleteConfirm(null);
      }
    });
  };

  // Automated sync pipeline simulation
  const handleAddDocument = (file: File, category: DocumentCategory) => {
    const docId = `doc-${Date.now()}`;
    const newDoc: CloudDocument = {
      id: docId,
      projectId: selectedProjectId || 'unassigned',
      name: file.name,
      category,
      size: file.size,
      uploadedAt: new Date().toISOString().substring(0, 10),
      syncStatus: 'syncing',
      fileType: file.type || 'application/octet-stream',
    };

    const updated = {
      ...db,
      documents: [newDoc, ...db.documents],
    };
    saveState(updated);

    void (async () => {
      let storagePath: string | null = null;
      if (isSupabaseConfigured && supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const activeOrg = await ensureActiveOrganization();
        if (user) {
          storagePath = await uploadWorkspaceFile({
            file,
            userId: user.id,
            orgId: activeOrg?.id || null,
            folder: 'documents',
            id: docId,
          });
        }
      }

      setDb((currentDb) => {
        if (!currentDb) return null;
        const updatedDocs = currentDb.documents.map((document) =>
          document.id === docId
            ? {
                ...document,
                syncStatus: 'synced' as const,
                storagePath: storagePath || undefined,
              }
            : document,
        );
        const finishedDb = { ...currentDb, documents: updatedDocs };
        void saveDbData(finishedDb);
        return finishedDb;
      });
    })().catch((error) => {
      console.error('Document upload failed:', error);
      setDb((currentDb) => {
        if (!currentDb) return null;
        const finishedDb = {
          ...currentDb,
          documents: currentDb.documents.map((document) =>
            document.id === docId ? { ...document, syncStatus: 'failed' as const } : document,
          ),
        };
        void saveDbData(finishedDb);
        return finishedDb;
      });
    });
  };

  const handleDownloadDocument = (document: CloudDocument) => {
    void (async () => {
      if (document.storagePath) {
        const signedUrl = await createWorkspaceFileUrl(document.storagePath);
        if (signedUrl) {
          window.open(signedUrl, '_blank', 'noopener,noreferrer');
          return;
        }
      }
      if (document.dataUrl) {
        window.open(document.dataUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      alert('This document record does not have a stored file payload yet.');
    })();
  };

  const handleDeleteDocument = (docId: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Confirm File Deletion',
      message: 'Are you sure you want to permanently remove this blueprint file record from the Catalyser Cloud Locker?',
      onConfirm: () => {
        const updated = {
          ...db,
          documents: db.documents.filter((d) => d.id !== docId),
        };
        saveState(updated);
        setDeleteConfirm(null);
      }
    });
  };

  if (standalonePartyName) {
    return <PartyLedgerStandalone partyName={standalonePartyName} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-viewport">
      {/* Prime Header Bar */}
      <header className="bg-slate-900 sticky top-0 z-40 px-5 py-4.5 shadow-md text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Logo and company branding */}
          <div className="cursor-pointer" onClick={() => setSelectedProjectId(null)}>
            <Logo layout="row" size="sm" showSubtitle={true} onDark={true} allowChange={false} />
          </div>

          {/* Quick status diagnostic indicator lines - architectural simplicity */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2 bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span>{isSupabaseConfigured ? 'Supabase Sync Active' : 'Local Mode Active'}</span>
            </div>
            {isSupabaseConfigured && supabase && (
              <button
                onClick={() => void supabase.auth.signOut()}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
                title="Sign out"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            )}
            
            <div className="text-[11px] text-slate-400 font-mono hidden md:block">
              Device Date: <span className="text-blue-600 font-bold">{new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container body spacer */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-28" id="main-content-canvas">
        {activeProject ? (
          /* SINGLE PROJECT INDEPTH LEDGER, BILLING, AND DOCUMENTS VIEW */
          <ProjectDetail
            project={activeProject}
            projects={db.projects}
            payments={db.payments}
            contacts={db.contacts}
            documents={db.documents}
            onBack={() => setSelectedProjectId(null)}
            onAddPayment={handleAddPayment}
            onDeletePayment={handleDeletePayment}
            onEditPayment={handleEditPayment}
            onAddContact={handleAddContact}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
            onDownloadDocument={handleDownloadDocument}
          />
        ) : (
          /* HOME SCREEN - LOGO & PORTFOLIO DASHBOARD */
          <div className="space-y-6">
            
            {/* Display appropriate Tab View */}
            <div className="animate-in fade-in duration-150">
              {homeTab === 'projects' && (
                <div className="space-y-6">
                  {/* Visual logo banner explicitly placed at Home Screen as requested:
                      "At home screen, there must be the logo with add project options along with the list of added project."
                  */}
                  <div className="bg-white border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6" id="home-hero-banner">
                    <Logo layout="row" size="md" showSubtitle={true} onDark={false} allowChange={true} />
                    <div className="text-center md:text-right max-w-sm space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#016fca] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 font-sans">
                        Catalyser Design
                      </span>
                      <h3 className="text-base font-extrabold text-slate-800">Interior &amp; Architecture Ledger Studio</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Rapid on-site expense logs, real-time client billing, structural blueprints backup, and automatic schedule self-employed tax deductions.
                      </p>
                    </div>
                  </div>

                  <ProjectList
                    projects={db.projects}
                    payments={db.payments}
                    onAddProject={handleAddProject}
                    onUpdateStatus={handleUpdateStatus}
                    onSelectProject={setSelectedProjectId}
                  />
                </div>
              )}

              {homeTab === 'dashboard' && (
                <Dashboard
                  projects={db.projects}
                  payments={db.payments}
                  contacts={db.contacts}
                  documents={db.documents}
                  onSelectProject={(id) => {
                    setSelectedProjectId(id);
                    setHomeTab('projects');
                  }}
                />
              )}

              {homeTab === 'contacts' && (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-120 text-left">
                    <h3 className="font-bold text-slate-800 text-base">Global Directory Vault</h3>
                    <p className="text-xs text-[#456276]">Consolidated profile ledger for clients, contracting vendors, and supplier partners</p>
                  </div>
                  <ContactManager
                    contacts={db.contacts}
                    onAddContact={handleAddContact}
                    onDeleteContact={handleDeleteContact}
                    payments={db.payments}
                    projects={db.projects}
                  />
                </div>
              )}

              {homeTab === 'reports' && (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-120 text-left">
                    <h3 className="font-bold text-slate-800 text-base">Statement Report Studio</h3>
                    <p className="text-xs text-[#456276]">Generate real-time audited financial reports, filter by projects, clients or contracting vendors, and export in PDF or Excel sheets.</p>
                  </div>
                  <ReportGenerator
                    projects={db.projects}
                    payments={db.payments}
                  />
                </div>
              )}

              {homeTab === 'settings' && (
                <SettingsManager />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Persistent Bottom Responsive Floating Dock - Beautiful across all screen viewports! */}
      <nav className="fixed bottom-0 inset-x-0 md:bottom-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 bg-white/95 backdrop-blur-md border-t md:border border-slate-200/80 p-2.5 flex justify-around md:justify-center md:gap-14 items-center z-45 shadow-lg md:rounded-full md:px-12 md:max-w-xl md:w-full" id="system-navbar">
        <button
          onClick={() => {
            setSelectedProjectId(null);
            setHomeTab('projects');
          }}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold transition duration-150 cursor-pointer ${
            !selectedProjectId && homeTab === 'projects' ? 'text-[#016fca]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <FolderKanban size={18} />
          <span>Portfolios</span>
        </button>
        <button
          onClick={() => {
            setSelectedProjectId(null);
            setHomeTab('dashboard');
          }}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold transition duration-150 cursor-pointer ${
            !selectedProjectId && homeTab === 'dashboard' ? 'text-[#016fca]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <LayoutDashboard size={18} />
          <span>Analytics</span>
        </button>
        <button
          onClick={() => {
            setSelectedProjectId(null);
            setHomeTab('contacts');
          }}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold transition duration-150 cursor-pointer ${
            !selectedProjectId && homeTab === 'contacts' ? 'text-[#016fca]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users size={18} />
          <span>Directory</span>
        </button>
        <button
          onClick={() => {
            setSelectedProjectId(null);
            setHomeTab('reports');
          }}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold transition duration-150 cursor-pointer ${
            !selectedProjectId && homeTab === 'reports' ? 'text-[#016fca]' : 'text-slate-400 hover:text-slate-600'
          }`}
          id="mobile-nav-reports"
        >
          <FileSpreadsheet size={18} />
          <span>Statements</span>
        </button>
        <button
          onClick={() => {
            setSelectedProjectId(null);
            setHomeTab('settings');
          }}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold transition duration-150 cursor-pointer ${
            !selectedProjectId && homeTab === 'settings' ? 'text-[#016fca]' : 'text-slate-400 hover:text-slate-600'
          }`}
          id="mobile-nav-settings"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </nav>

      {/* Reusable Alert Deletion Confirmation Modal */}
      {deleteConfirm && deleteConfirm.isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100"
          id="delete-confirmation-dialog-backdrop"
        >
          <div 
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-150 overflow-hidden transform transition-all duration-150 scale-100 p-6 text-left"
            id="delete-confirmation-dialog-modal"
          >
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="font-extrabold text-slate-800 text-sm leading-tight uppercase tracking-wide">{deleteConfirm.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{deleteConfirm.message}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end text-xs font-bold">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-slate-550 hover:bg-slate-100 rounded-xl transition border-none cursor-pointer bg-transparent"
              >
                Go Back
              </button>
              <button
                onClick={deleteConfirm.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition border-none cursor-pointer shadow-xs"
                id="modal-confirm-delete-button"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
