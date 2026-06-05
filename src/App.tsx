/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Project, Payment, Contact, CloudDocument, ProjectStatus, PaymentType, DocumentCategory, DbData, ContactRole } from './types';
import {
  cacheDbData,
  deleteContact,
  deleteDocument,
  deletePayment,
  loadDbData,
  persistContact,
  persistDocument,
  persistPayment,
  persistProject,
  saveDbData,
} from './lib/db';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { hydrateSettingsFromSupabase, installSettingsPersistence, persistSettingsToSupabase } from './lib/settingsSync';
import { createWorkspaceFileUrl, uploadPaymentBillDataUrl, uploadWorkspaceFile, validateWorkspaceDocumentFile } from './lib/fileStorage';
import { ensureActiveOrganization, type ActiveOrganization } from './lib/orgs';
import Logo from './components/Logo';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  AlertCircle,
  ShieldAlert,
  FileSpreadsheet,
  Settings,
  LogOut,
  Search,
  UserCircle,
  Building2,
} from 'lucide-react';

const Dashboard = lazy(() => import('./components/Dashboard'));
const ProjectList = lazy(() => import('./components/ProjectList'));
const ProjectDetail = lazy(() => import('./components/ProjectDetail'));
const ContactManager = lazy(() => import('./components/ContactManager'));
const ReportGenerator = lazy(() => import('./components/ReportGenerator'));
const PartyLedgerStandalone = lazy(() => import('./components/PartyLedgerStandalone'));
const SettingsManager = lazy(() => import('./components/SettingsManager'));

type HomeTab = 'dashboard' | 'projects' | 'contacts' | 'reports' | 'settings';

const routeTabs: HomeTab[] = ['dashboard', 'projects', 'contacts', 'reports', 'settings'];

function routeFromPath(pathname: string): { homeTab: HomeTab; selectedProjectId: string | null } {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'projects' && segments[1]) {
    return { homeTab: 'projects', selectedProjectId: decodeURIComponent(segments[1]) };
  }
  if (segments[0] && routeTabs.includes(segments[0] as HomeTab)) {
    return { homeTab: segments[0] as HomeTab, selectedProjectId: null };
  }
  return { homeTab: 'projects', selectedProjectId: null };
}

function pathForTab(tab: HomeTab): string {
  return tab === 'projects' ? '/projects' : `/${tab}`;
}

function createRecordId() {
  return crypto.randomUUID();
}

function ScreenFallback() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-xs font-bold uppercase tracking-widest text-slate-400 shadow-xs">
      Loading workspace view...
    </div>
  );
}

export default function App() {
  const [db, setDb] = useState<DbData | null>(null);
  const [dbLoadWarning, setDbLoadWarning] = useState<string | null>(null);
  const [appNotice, setAppNotice] = useState<{ title: string; message: string } | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveOrganization | null>(null);
  const [accountLabel, setAccountLabel] = useState(isSupabaseConfigured ? 'Cloud account' : 'Local workspace');
  const pendingSaveRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const pendingSettingsSaveRef = useRef<Promise<boolean>>(Promise.resolve(true));

  // View state controllers
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => routeFromPath(window.location.pathname).selectedProjectId);
  const [homeTab, setHomeTab] = useState<HomeTab>(() => routeFromPath(window.location.pathname).homeTab);
  const [globalSearch, setGlobalSearch] = useState('');
  
  // State for recording deletion confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Standalone mode detection for multi-tab party ledgers
  const [standalonePartyName, setStandalonePartyName] = useState<string | null>(null);

  const persistSettingsTracked = () => {
    const savePromise = persistSettingsToSupabase();
    pendingSettingsSaveRef.current = savePromise;
    return savePromise;
  };

  // Initialize data on mount
  useEffect(() => {
    let mounted = true;

    installSettingsPersistence();

    const loadWorkspace = async () => {
      await hydrateSettingsFromSupabase();
      const workspace = await ensureActiveOrganization();
      const settingsSynced = await persistSettingsTracked();
      const result = await loadDbData();
      if (isSupabaseConfigured && supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setAccountLabel(user?.email || 'Cloud account');
      } else {
        setAccountLabel('Local workspace');
      }
      if (!mounted) return;
      setActiveWorkspace(workspace);
      setDb(result.data);
      setDbLoadWarning(
        !settingsSynced
          ? 'Settings could not be synced to the cloud. Retry before signing out from this device.'
          : result.source === 'fallback'
          ? 'Cloud data could not be loaded. Showing local fallback data until sync is restored.'
          : null,
      );
    };

    void loadWorkspace();

    // Synchronize url params
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'partyLedger') {
      setStandalonePartyName(params.get('partyName'));
    }

    const handleRouteChange = () => {
      const route = routeFromPath(window.location.pathname);
      setHomeTab(route.homeTab);
      setSelectedProjectId(route.selectedProjectId);
    };

    const handleStorageSync = async () => {
      const result = await loadDbData();
      setDb(result.data);
      setDbLoadWarning(
        result.source === 'fallback'
          ? 'Cloud data could not be loaded. Showing local fallback data until sync is restored.'
          : null,
      );
    };
    const handleSettingsSync = async () => {
      const settingsSynced = await persistSettingsTracked();
      const result = await loadDbData();
      setDb(result.data);
      setDbLoadWarning(
        !settingsSynced
          ? 'Settings could not be synced to the cloud. Retry before signing out from this device.'
          : result.source === 'fallback'
          ? 'Cloud data could not be loaded. Showing local fallback data until sync is restored.'
          : null,
      );
    };
    window.addEventListener('custom-db-updated', handleStorageSync);
    window.addEventListener('custom-settings-updated', handleSettingsSync);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      mounted = false;
      window.removeEventListener('custom-db-updated', handleStorageSync);
      window.removeEventListener('custom-settings-updated', handleSettingsSync);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Sync state helpers
  const commitState = (updatedDb: typeof db, persistPromise: Promise<boolean>): Promise<boolean> => {
    if (!updatedDb) return Promise.resolve(false);
    setDb(updatedDb);
    cacheDbData(updatedDb);
    pendingSaveRef.current = persistPromise;
    return persistPromise;
  };

  const syncPaymentBillPhoto = async (payment: Payment) => {
    if (!payment.billPhoto?.startsWith('data:')) return;

    try {
      const storagePath = await uploadPaymentBillDataUrl(payment.id, payment.billPhoto);
      if (!storagePath) return;

      setDb((currentDb) => {
        if (!currentDb) return null;
        const updatedPayments = currentDb.payments.map((item) =>
          item.id === payment.id
            ? {
                ...item,
                billPhotoStoragePath: storagePath,
              }
            : item,
        );
        const updatedDb = { ...currentDb, payments: updatedPayments };
        cacheDbData(updatedDb);
        const persistedPayment = updatedPayments.find((item) => item.id === payment.id);
        if (persistedPayment) {
          pendingSaveRef.current = persistPayment({
            ...persistedPayment,
            billPhoto: undefined,
            billPhotoStoragePath: storagePath,
          });
        }
        return updatedDb;
      });
    } catch (error) {
      console.error('Bill photo upload failed:', error);
      setAppNotice({
        title: 'Bill Photo Upload Failed',
        message: 'The transaction was saved, but the bill photo could not be uploaded. Try replacing the photo.',
      });
    }
  };

  if (!db) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-slate-400">
        <Logo size="lg" layout="column" />
        <span className="text-xs font-mono tracking-widest mt-4 animate-pulse">
          Loading workspace...
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
      id: createRecordId(),
      name,
      description,
      status: 'ongoing',
      budget,
      clientName,
      address,
      createdAt: new Date().toISOString().substring(0, 10), // auto device date
    };

    // Create a matching client contact for the new project.
    const newClientContact: Contact = {
      id: createRecordId(),
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
    void commitState(updated, Promise.all([persistProject(newProj), persistContact(newClientContact)]).then((results) => results.every(Boolean)));
  };

  const handleUpdateStatus = (projectId: string, status: ProjectStatus) => {
    const updatedProjects = db.projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, status };
      }
      return p;
    });

    const updatedProject = updatedProjects.find((project) => project.id === projectId);
    const updated = { ...db, projects: updatedProjects };
    void commitState(updated, updatedProject ? persistProject(updatedProject) : Promise.resolve(false));
  };

  const handleAddPayment = (paymentData: Omit<Payment, 'id'>) => {
    const newPay: Payment = {
      id: createRecordId(),
      ...paymentData,
    };

    const updated = {
      ...db,
      payments: [newPay, ...db.payments],
    };
    void commitState(updated, persistPayment(newPay));

    if (newPay.billPhoto?.startsWith('data:')) {
      void syncPaymentBillPhoto(newPay);
    }
  };

  const handleEditPayment = (updatedPayment: Payment) => {
    const updated = {
      ...db,
      payments: db.payments.map((p) => (p.id === updatedPayment.id ? updatedPayment : p)),
    };
    void commitState(updated, persistPayment(updatedPayment));

    if (updatedPayment.billPhoto?.startsWith('data:')) {
      void syncPaymentBillPhoto(updatedPayment);
    }
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
        void commitState(updated, deletePayment(paymentId));
        setDeleteConfirm(null);
      }
    });
  };

  const handleAddContact = (
    name: string,
    role: ContactRole,
    phone: string,
    email: string,
    company: string,
    gstNumber?: string,
    address?: string
  ) => {
    const newContact: Contact = {
      id: createRecordId(),
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
    void commitState(updated, persistContact(newContact));
  };

  const handleAddContacts = (
    contactInputs: Array<{
      name: string;
      role: ContactRole;
      phone: string;
      email: string;
      company: string;
      gstNumber?: string;
      address?: string;
    }>
  ): Promise<boolean> => {
    if (contactInputs.length === 0) return Promise.resolve(true);
    const newContacts: Contact[] = contactInputs.map((contact) => ({
      id: createRecordId(),
      name: contact.name,
      role: contact.role,
      phone: contact.phone,
      email: contact.email,
      company: contact.company,
      gstNumber: contact.gstNumber,
      address: contact.address,
    }));

    const updated = {
      ...db,
      contacts: [...newContacts, ...db.contacts],
    };
    return commitState(updated, Promise.all(newContacts.map((contact) => persistContact(contact))).then((results) => results.every(Boolean)));
  };

  const handleSignOut = async () => {
    const [recordsSynced, settingsSynced] = await Promise.all([
      pendingSaveRef.current,
      pendingSettingsSaveRef.current,
    ]);

    if (!recordsSynced || !settingsSynced) {
      setAppNotice({
        title: 'Sync Pending',
        message: 'Your latest changes have not synced to the cloud yet. Retry sync before signing out.',
      });
      return;
    }
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
  };

  const handleRetryCloudLoad = async () => {
    const workspace = await ensureActiveOrganization();
    const settingsSynced = await persistSettingsTracked();
    const result = await loadDbData();
    setActiveWorkspace(workspace);
    setDb(result.data);
    setDbLoadWarning(
      !settingsSynced
        ? 'Settings could not be synced to the cloud. Retry before signing out from this device.'
        : result.source === 'fallback'
        ? 'Cloud data could not be loaded. Showing local fallback data until sync is restored.'
        : null,
    );
    if (settingsSynced && result.source !== 'fallback') {
      setAppNotice(null);
    }
  };

  const handleUpdateContactRole = (contactId: string, role: ContactRole) => {
    const updatedContacts = db.contacts.map((contact) => (contact.id === contactId ? { ...contact, role } : contact));
    const updatedContact = updatedContacts.find((contact) => contact.id === contactId);
    const updated = {
      ...db,
      contacts: updatedContacts,
    };
    void commitState(updated, updatedContact ? persistContact(updatedContact) : Promise.resolve(false));
  };

  const handleUpdateContact = (
    contactId: string,
    contactData: {
      name: string;
      role: ContactRole;
      phone: string;
      email: string;
      company: string;
      gstNumber?: string;
      address?: string;
    },
  ): Promise<boolean> => {
    const updatedContacts = db.contacts.map((contact) =>
      contact.id === contactId
        ? {
            ...contact,
            ...contactData,
            company: contactData.company || undefined,
            gstNumber: contactData.gstNumber || undefined,
            address: contactData.address || undefined,
          }
        : contact,
    );
    const updatedContact = updatedContacts.find((contact) => contact.id === contactId);
    const updated = {
      ...db,
      contacts: updatedContacts,
    };
    return commitState(updated, updatedContact ? persistContact(updatedContact) : Promise.resolve(false));
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
        void commitState(updated, deleteContact(contactId));
        setDeleteConfirm(null);
      }
    });
  };

  // Document upload pipeline
  const handleAddDocument = (file: File, category: DocumentCategory) => {
    if (!selectedProjectId) {
      setAppNotice({
        title: 'Select A Project',
        message: 'Open a project ledger before uploading documents.',
      });
      return;
    }

    const validationError = validateWorkspaceDocumentFile(file);
    if (validationError) {
      setAppNotice({
        title: 'Document Not Added',
        message: validationError,
      });
      return;
    }

    const docId = createRecordId();
    const newDoc: CloudDocument = {
      id: docId,
      projectId: selectedProjectId,
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
    void commitState(updated, persistDocument(newDoc));

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
        cacheDbData(finishedDb);
        const finishedDocument = updatedDocs.find((document) => document.id === docId);
        if (finishedDocument) {
          const savePromise = persistDocument(finishedDocument);
          pendingSaveRef.current = savePromise;
        }
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
        cacheDbData(finishedDb);
        const failedDocument = finishedDb.documents.find((document) => document.id === docId);
        if (failedDocument) {
          const savePromise = persistDocument(failedDocument);
          pendingSaveRef.current = savePromise;
        }
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
      setAppNotice({
        title: 'File Not Available',
        message: 'This document record does not have a stored file payload yet.',
      });
    })();
  };

  const handleDeleteDocument = (docId: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Confirm File Deletion',
      message: 'Are you sure you want to permanently remove this document record?',
      onConfirm: () => {
        const updated = {
          ...db,
          documents: db.documents.filter((d) => d.id !== docId),
        };
        void commitState(updated, deleteDocument(docId));
        setDeleteConfirm(null);
      }
    });
  };

  if (standalonePartyName) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <PartyLedgerStandalone partyName={standalonePartyName} />
      </Suspense>
    );
  }

  const navItems = [
    { id: 'projects' as const, label: 'Projects', icon: FolderKanban },
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contacts' as const, label: 'Contacts', icon: Users },
    { id: 'reports' as const, label: 'Reports', icon: FileSpreadsheet },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];
  const workspaceName = activeWorkspace?.name || (isSupabaseConfigured ? 'Personal Workspace' : 'Local Workspace');
  const workspaceModeLabel = isSupabaseConfigured && supabase ? 'Cloud workspace' : 'Local workspace';

  const pageTitle = activeProject
    ? activeProject.name
    : navItems.find((item) => item.id === homeTab)?.label || 'Projects';
  const pageSubtitle = activeProject
    ? `${activeProject.clientName} - ${activeProject.address || 'Project ledger'}`
    : 'Architecture and interior design operations workspace';
  const normalizedSearch = globalSearch.trim().toLowerCase();
  const searchMatches = normalizedSearch
    ? [
        ...db.projects
          .filter((project) =>
            [project.name, project.clientName, project.address, project.description].some((value) =>
              (value || '').toLowerCase().includes(normalizedSearch),
            ),
          )
          .slice(0, 4)
          .map((project) => ({
            id: project.id,
            type: 'Project',
            title: project.name,
            subtitle: project.clientName,
            onClick: () => navigateToProject(project.id),
          })),
        ...db.contacts
          .filter((contact) =>
            [contact.name, contact.company, contact.email, contact.phone].some((value) =>
              (value || '').toLowerCase().includes(normalizedSearch),
            ),
          )
          .slice(0, 4)
          .map((contact) => ({
            id: contact.id,
            type: 'Contact',
            title: contact.name,
            subtitle: contact.company || contact.role,
            onClick: () => navigateToTab('contacts'),
          })),
        ...db.documents
          .filter((document) => document.name.toLowerCase().includes(normalizedSearch))
          .slice(0, 4)
          .map((document) => ({
            id: document.id,
            type: 'Document',
            title: document.name,
            subtitle: document.category,
            onClick: () => navigateToTab('projects'),
          })),
      ].slice(0, 8)
    : [];

  const navigateToTab = (tab: HomeTab) => {
    const path = pathForTab(tab);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setSelectedProjectId(null);
    setHomeTab(tab);
  };

  const navigateToProject = (projectId: string) => {
    const path = `/projects/${encodeURIComponent(projectId)}`;
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setSelectedProjectId(projectId);
    setHomeTab('projects');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900" id="app-viewport">
      <div className="flex min-h-screen">
        <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col border-r border-slate-950 bg-slate-950 text-slate-100" id="desktop-sidebar">
          <div className="border-b border-white/10 p-3 pt-6">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="shrink-0 text-slate-400" />
                <span className="truncate font-semibold">{workspaceName}</span>
              </div>
              <span className="mt-1 block truncate pl-5 text-[10px] font-semibold text-slate-500">{workspaceModeLabel}</span>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-3" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = !activeProject && homeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigateToTab(item.id);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition cursor-pointer border-none ${
                    isActive
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'bg-transparent text-slate-400 hover:bg-white/7 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-xs backdrop-blur md:px-6" id="workspace-header">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigateToTab('projects')}
                  className="shrink-0 border-none bg-transparent p-0 text-left cursor-pointer"
                >
                  <Logo layout="row" size="sm" showSubtitle={true} onDark={false} allowChange={false} />
                </button>
                <div className="hidden min-w-0 border-l border-slate-200 pl-3 text-left md:block">
                  <span className="block truncate text-xs font-bold text-slate-800">{workspaceName}</span>
                  <span className="block truncate text-[10px] font-semibold text-slate-400">{workspaceModeLabel}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <div className="relative hidden lg:block">
                  <div className="flex h-9 w-80 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                    <Search size={15} className="shrink-0" />
                    <input
                      type="search"
                      value={globalSearch}
                      onChange={(event) => setGlobalSearch(event.target.value)}
                      placeholder="Search projects, contacts, documents"
                      className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm text-slate-800 placeholder:text-slate-400 focus:shadow-none focus:outline-none"
                    />
                  </div>
                  {normalizedSearch && (
                    <div className="absolute right-0 top-11 z-50 w-96 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                      {searchMatches.length > 0 ? (
                        <div className="py-1">
                          {searchMatches.map((match) => (
                            <button
                              key={`${match.type}-${match.id}`}
                              type="button"
                              onClick={() => {
                                match.onClick();
                                setGlobalSearch('');
                              }}
                              className="flex w-full items-start gap-3 border-none bg-transparent px-3 py-2.5 text-left hover:bg-blue-50 cursor-pointer"
                            >
                              <span className="mt-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                                {match.type}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-slate-900">{match.title}</span>
                                <span className="block truncate text-xs text-slate-500">{match.subtitle}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-3 text-sm text-slate-500">No matches found</div>
                      )}
                    </div>
                  )}
                </div>
                {isSupabaseConfigured && supabase ? (
                  <div className="flex items-center gap-2">
                    <div className="hidden h-9 max-w-48 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 xl:flex">
                      <UserCircle size={16} className="shrink-0" />
                      <span className="truncate">{accountLabel}</span>
                    </div>
                    <button
                      onClick={() => void handleSignOut()}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      title="Sign out"
                    >
                      <LogOut size={15} />
                      <span className="hidden sm:inline">Sign out</span>
                    </button>
                  </div>
                ) : (
                  <div className="hidden sm:flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">
                    <UserCircle size={16} />
                    <span>{accountLabel}</span>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 pb-24 md:p-6 md:pb-8" id="main-content-canvas">
            <div className="mx-auto max-w-7xl">
        {dbLoadWarning && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs font-semibold text-amber-800 shadow-xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>{dbLoadWarning}</span>
              <button
                type="button"
                onClick={() => void handleRetryCloudLoad()}
                className="self-start rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 cursor-pointer sm:self-auto"
              >
                Retry sync
              </button>
            </div>
          </div>
        )}
        {appNotice && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-semibold text-slate-700 shadow-xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <span className="block font-extrabold text-slate-900">{appNotice.title}</span>
                  <span className="block text-slate-500">{appNotice.message}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAppNotice(null)}
                className="self-start rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer sm:self-auto"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        <Suspense fallback={<ScreenFallback />}>
        {activeProject ? (
          /* SINGLE PROJECT INDEPTH LEDGER, BILLING, AND DOCUMENTS VIEW */
          <ProjectDetail
            project={activeProject}
            projects={db.projects}
            payments={db.payments}
            contacts={db.contacts}
            documents={db.documents}
            onBack={() => navigateToTab('projects')}
            onAddPayment={handleAddPayment}
            onDeletePayment={handleDeletePayment}
            onEditPayment={handleEditPayment}
            onAddContact={handleAddContact}
            onAddContacts={handleAddContacts}
            onUpdateContact={handleUpdateContact}
            onUpdateContactRole={handleUpdateContactRole}
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
                  <div className="bg-slate-950 text-white p-6 rounded-2xl shadow-md">
                    <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
                    <p className="text-slate-200 text-sm mt-1">
                      Manage project budgets, client ledgers, payments, and documents.
                    </p>
                  </div>
                  <ProjectList
                    projects={db.projects}
                    payments={db.payments}
                    onAddProject={handleAddProject}
                    onUpdateStatus={handleUpdateStatus}
                    onSelectProject={navigateToProject}
                  />
                </div>
              )}

              {homeTab === 'dashboard' && (
                <Dashboard
                  projects={db.projects}
                  payments={db.payments}
                  contacts={db.contacts}
                  documents={db.documents}
                  onSelectProject={navigateToProject}
                />
              )}

              {homeTab === 'contacts' && (
                <div className="space-y-3">
                  <div className="bg-slate-950 text-white px-4 py-3 rounded-xl shadow-sm text-left flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Contacts</h2>
                    <p className="text-slate-200 text-xs">Clients, vendors, suppliers, contractors, site workers, and other contacts.</p>
                  </div>
                  <ContactManager
                    contacts={db.contacts}
                    onAddContact={handleAddContact}
                    onDeleteContact={handleDeleteContact}
                    onAddContacts={handleAddContacts}
                    onUpdateContact={handleUpdateContact}
                    onUpdateContactRole={handleUpdateContactRole}
                    payments={db.payments}
                    projects={db.projects}
                  />
                </div>
              )}

              {homeTab === 'reports' && (
                <div className="space-y-4">
                  <div className="bg-slate-950 text-white p-6 rounded-2xl shadow-md text-left">
                    <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
                    <p className="text-slate-200 text-sm mt-1">Generate financial statements by project, client, vendor, or fiscal period.</p>
                  </div>
                  <ReportGenerator
                    projects={db.projects}
                    payments={db.payments}
                  />
                </div>
              )}

              {homeTab === 'settings' && (
                <div className="space-y-4">
                  <div className="bg-slate-950 text-white p-6 rounded-2xl shadow-md text-left">
                    <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                    <p className="text-slate-200 text-sm mt-1">Configure company details, billing assets, staff, and backups.</p>
                  </div>
                  <SettingsManager />
                </div>
              )}
            </div>
          </div>
        )}
        </Suspense>
            </div>
          </main>
        </div>
      </div>

      <nav className="fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-lg backdrop-blur md:hidden" id="system-navbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = !activeProject && homeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                navigateToTab(item.id);
              }}
              className={`flex flex-col items-center gap-1 rounded-lg p-1.5 text-[10px] font-bold transition cursor-pointer border-none ${
                isActive ? 'bg-blue-50 text-blue-700' : 'bg-transparent text-slate-400 hover:text-slate-600'
              }`}
              id={item.id === 'reports' ? 'mobile-nav-reports' : item.id === 'settings' ? 'mobile-nav-settings' : undefined}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
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
