import React, { useEffect, useState } from 'react';
import { Project, Payment, Contact, CloudDocument, PaymentType, PaymentMode, DocumentCategory, ContactRole, PartyRole } from '../types';
import { formatCurrency, formatDate } from '../lib/formatter';
import { createWorkspaceFileUrl, validateBillImageFile } from '../lib/fileStorage';
import { readContactImportFile } from '../lib/contactImport';
import { ensureActiveOrganization, listOrganizationMembers, type OrganizationMember } from '../lib/orgs';
import { listProjectAssignments, replaceProjectAssignments } from '../lib/projectAssignments';
import { hasPlatformPermission } from '../lib/platformRoles';
import { PARTY_ROLE_OPTIONS, PAYABLE_CONTACT_ROLES } from '../lib/roleLabels';
import InvoiceGenerator from './InvoiceGenerator';
import DocumentManager from './DocumentManager';
import ContactManager from './ContactManager';
import { ChevronLeft, Landmark, IndianRupee, ArrowUpRight, ArrowDownLeft, Calendar, FileCheck, Users, HelpCircle, HardHat, Receipt, HelpCircle as Help, Camera, Edit, Trash2, Upload } from 'lucide-react';

interface ProjectDetailProps {
  project: Project;
  projects?: Project[];
  payments: Payment[];
  contacts: Contact[];
  documents: CloudDocument[];
  onBack: () => void;
  onAddPayment?: (payment: Omit<Payment, 'id'>) => void;
  onDeletePayment?: (paymentId: string) => void;
  onEditPayment?: (payment: Payment) => void;
  onAddContact?: (name: string, role: ContactRole, phone: string, email: string, company: string, gstNumber?: string, address?: string) => void;
  onAddContacts?: (contacts: Array<{ name: string; role: ContactRole; phone: string; email: string; company: string; gstNumber?: string; address?: string }>) => Promise<boolean> | boolean | void;
  onUpdateContact?: (contactId: string, contact: { name: string; role: ContactRole; phone: string; email: string; company: string; gstNumber?: string; address?: string }) => Promise<boolean> | boolean | void;
  onUpdateContactRole?: (contactId: string, role: ContactRole) => void;
  onAddDocument?: (file: File, category: DocumentCategory) => void;
  onDeleteDocument?: (docId: string) => void;
  onDownloadDocument: (doc: CloudDocument) => void;
}

const getTodayDateInputValue = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().substring(0, 10);
};

const DEFAULT_TRANSACTION_REMARK = 'No remark provided';

export default function ProjectDetail({
  project,
  projects = [],
  payments,
  contacts,
  documents,
  onBack,
  onAddPayment,
  onDeletePayment,
  onEditPayment,
  onAddContact,
  onAddContacts,
  onUpdateContact,
  onUpdateContactRole,
  onAddDocument,
  onDeleteDocument,
  onDownloadDocument,
}: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<'ledger' | 'invoice' | 'parties' | 'documents' | 'contacts'>('ledger');
  
  // States for Adding dynamic transaction ledger record
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [payType, setPayType] = useState<PaymentType>('out');
  const [amount, setAmount] = useState('');
  const [partyInput, setPartyInput] = useState('');
  const [partySearchStr, setPartySearchStr] = useState('');
  const [newPartyRole, setNewPartyRole] = useState<ContactRole>('vendor');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyEmail, setNewPartyEmail] = useState('');
  const [newPartyCompany, setNewPartyCompany] = useState('');
  const [newPartyGstNumber, setNewPartyGstNumber] = useState('');
  const [newPartyAddress, setNewPartyAddress] = useState('');
  const [partyImportStatus, setPartyImportStatus] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [remark, setRemark] = useState('');
  const [billPhoto, setBillPhoto] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState(getTodayDateInputValue());
  
  // Select among existing contacts easily
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [selectedPartyLedger, setSelectedPartyLedger] = useState<string | null>(null);
  const [viewingBillPhoto, setViewingBillPhoto] = useState<string | null>(null);
  const [billPhotoError, setBillPhotoError] = useState('');
  const [workspaceMembers, setWorkspaceMembers] = useState<OrganizationMember[]>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [assignmentStatus, setAssignmentStatus] = useState('');
  const [canManageAssignments, setCanManageAssignments] = useState(false);

  // Edit payment modal state
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editParty, setEditParty] = useState('');
  const [editPartyRole, setEditPartyRole] = useState<PartyRole>('other');
  const [editPaymentMode, setEditPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [editRemark, setEditRemark] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<PaymentType>('out');
  const [editBillPhoto, setEditBillPhoto] = useState<string>('');

  const readBillPhotoFile = (file: File, onRead: (dataUrl: string) => void) => {
    const error = validateBillImageFile(file);
    if (error) {
      setBillPhotoError(error);
      return;
    }

    setBillPhotoError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      onRead(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleViewBillPhoto = (payment: Payment) => {
    void (async () => {
      if (payment.billPhoto) {
        setViewingBillPhoto(payment.billPhoto);
        return;
      }
      if (payment.billPhotoStoragePath) {
        const signedUrl = await createWorkspaceFileUrl(payment.billPhotoStoragePath);
        if (signedUrl) {
          setViewingBillPhoto(signedUrl);
          return;
        }
      }
      setBillPhotoError('Bill attachment is not available.');
    })();
  };

  useEffect(() => {
    let cancelled = false;

    const loadAssignments = async () => {
      const activeOrg = await ensureActiveOrganization();
      if (!activeOrg || !hasPlatformPermission(activeOrg.role, 'manage_projects')) {
        if (!cancelled) {
          setCanManageAssignments(false);
          setWorkspaceMembers([]);
          setAssignedUserIds([]);
        }
        return;
      }

      const [members, assignments] = await Promise.all([
        listOrganizationMembers(activeOrg.id),
        listProjectAssignments([project.id]),
      ]);

      if (cancelled) return;
      setCanManageAssignments(true);
      setWorkspaceMembers(members.filter((member) => member.role === 'staff'));
      setAssignedUserIds(assignments.map((assignment) => assignment.userId));
    };

    void loadAssignments();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const handleToggleProjectAssignment = async (userId: string) => {
    const nextAssignedUserIds = assignedUserIds.includes(userId)
      ? assignedUserIds.filter((id) => id !== userId)
      : [...assignedUserIds, userId];

    setAssignedUserIds(nextAssignedUserIds);
    setAssignmentStatus('Saving assignments...');
    const saved = await replaceProjectAssignments(project.id, nextAssignedUserIds);
    setAssignmentStatus(saved ? 'Assignments saved.' : 'Assignment save failed.');
  };

  const resetNewPartyFields = (roleOverride?: ContactRole) => {
    setNewPartyRole(roleOverride || (payType === 'in' ? 'client' : 'vendor'));
    setNewPartyPhone('');
    setNewPartyEmail('');
    setNewPartyCompany('');
    setNewPartyGstNumber('');
    setNewPartyAddress('');
    setPartyImportStatus('');
  };

  const handleImportPartyFromFile = async (file: File | undefined) => {
    if (!file) return;
    setPartyImportStatus('Reading contact file...');

    try {
      const importedContacts = await readContactImportFile(file, payType === 'in' ? 'client' : 'vendor');
      const importedContact = importedContacts[0];

      if (!importedContact) {
        setPartyImportStatus('No contact found in this file.');
        return;
      }

      setSelectedContact('custom');
      setPartyInput(importedContact.name);
      setNewPartyRole(importedContact.role);
      setNewPartyPhone(importedContact.phone);
      setNewPartyEmail(importedContact.email);
      setNewPartyCompany(importedContact.company);
      setNewPartyGstNumber(importedContact.gstNumber || '');
      setNewPartyAddress(importedContact.address || '');
      setPartyImportStatus(importedContacts.length > 1 ? 'Imported first contact from file.' : 'Imported contact from file.');
    } catch {
      setPartyImportStatus('Unable to import this file. Use a Google Contacts CSV export or .vcf file.');
    }
  };

  const handleBeginEdit = (p: Payment) => {
    setEditingPayment(p);
    setEditAmount(p.amount.toString());
    setEditParty(p.party);
    setEditPartyRole(p.partyRole);
    setEditPaymentMode(p.paymentMode);
    setEditRemark(p.remark.trim() || DEFAULT_TRANSACTION_REMARK);
    setEditDate(p.date || new Date().toISOString().substring(0, 10));
    setEditType(p.type);
    setEditBillPhoto(p.billPhoto || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    if (!editAmount || Number(editAmount) <= 0) return;

    if (onEditPayment) {
      onEditPayment({
        ...editingPayment,
        type: editType,
        amount: Number(editAmount),
        party: editParty.trim(),
        partyRole: editPartyRole,
        paymentMode: editPaymentMode,
        remark: editRemark.trim() || DEFAULT_TRANSACTION_REMARK,
        date: editDate,
        billPhoto: editBillPhoto || undefined,
        billPhotoStoragePath: editBillPhoto?.startsWith('data:') ? undefined : editingPayment.billPhotoStoragePath,
      });
    }
    setEditingPayment(null);
  };

  // Auto-derived calculations for this project specifically
  const projectPayments = payments.filter((p) => p.projectId === project.id);
  
  const totalInflow = projectPayments
    .filter((p) => p.type === 'in')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOutflow = projectPayments
    .filter((p) => p.type === 'out')
    .reduce((sum, p) => sum + p.amount, 0);

  const netBalance = totalInflow - totalOutflow;
  const budgetUtilization = project.budget > 0 ? (totalOutflow / project.budget) * 100 : 0;

  // Handles adding new payment details
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddPayment) return;
    if (!amount || Number(amount) <= 0 || !paymentDate) return;

    // Party selection resolution (use picked contact or typed string)
    let finalParty = partyInput.trim();
    let derivedRole: PartyRole = 'other';

    if (selectedContact) {
      const match = contacts.find((c) => c.id === selectedContact);
      if (match) {
        finalParty = match.name;
        derivedRole = match.role;
      }
    } else if (finalParty) {
      // Basic heuristic to pick role typing manually
      const match = contacts.find((c) => c.name.toLowerCase() === finalParty.toLowerCase());
      if (match) {
        derivedRole = match.role;
      }
    }

    if (!finalParty) {
      finalParty = payType === 'in' ? 'Client' : 'Payee';
    }

    if (selectedContact === 'custom' && finalParty) {
      const existingContact = contacts.find((c) => c.name.trim().toLowerCase() === finalParty.toLowerCase());
      derivedRole = newPartyRole;
      if (!existingContact && onAddContact) {
        onAddContact(
          finalParty,
          newPartyRole,
          newPartyPhone.trim(),
          newPartyEmail.trim(),
          newPartyCompany.trim(),
          newPartyGstNumber.trim() || undefined,
          newPartyAddress.trim() || undefined,
        );
      }
    }

    onAddPayment({
      projectId: project.id,
      type: payType,
      amount: Number(amount),
      party: finalParty,
      partyRole: derivedRole,
      paymentMode,
      remark,
      date: paymentDate,
      billPhoto: billPhoto || undefined,
    });

    // Reset payment states
    setAmount('');
    setPartyInput('');
    setSelectedContact('');
    resetNewPartyFields();
    setRemark('');
    setBillPhoto('');
    setPaymentDate(getTodayDateInputValue());
    setShowAddPayment(false);
  };

  // Contacts filter matching their role depending on transaction direction.
  // Receivables/inflows are typically clients; payables/outflows are external work or supply partners.
  const suggestedContacts = contacts.filter((c) => {
    if (payType === 'in') return c.role === 'client';
    return PAYABLE_CONTACT_ROLES.includes(c.role);
  });

  return (
    <div className="space-y-6 text-left" id="project-details-view">
      {/* Back to Home row and Status Card header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3" id="project-header-row">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-500 font-extrabold text-xs inline-flex items-center gap-1 cursor-pointer transition py-1.5"
          id="back-to-projects-btn"
        >
          <ChevronLeft size={16} /> Back to Projects Portfolio
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium font-mono uppercase">Status badge:</span>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            project.status === 'ongoing'
              ? 'bg-emerald-100 text-emerald-700 border-emerald-205'
              : project.status === 'completed'
              ? 'bg-slate-100 text-slate-705 border-slate-205'
              : 'bg-blue-100 text-blue-700 border-blue-100'
          }`}>
            {project.status === 'ongoing' ? 'Ongoing' : project.status === 'completed' ? 'Completed' : 'On Hold'}
          </span>
        </div>
      </div>

      {/* Project Financial Health Card */}
      <div className="bg-white rounded-2xl border border-slate-150 p-6 flex flex-col md:flex-row justify-between items-stretch gap-6 shadow-sm">
        <div className="space-y-2 text-left flex-1 md:border-r md:border-slate-100 md:pr-6">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Project</span>
          <h2 className="text-xl font-bold text-slate-800 leading-tight">{project.name}</h2>
          <p className="text-slate-500 text-xs leading-relaxed max-w-xl">{project.description}</p>
          <div className="text-xs text-slate-400 space-y-0.5 pt-1">
            <span>Site: <span className="font-semibold text-slate-650">{project.address || 'Address not set'}</span></span>
            <span className="block">Client: <span className="font-semibold text-slate-650">{project.clientName}</span></span>
          </div>
        </div>

        {/* Totals panel */}
        <div className="grid grid-cols-2 gap-4 shrink-0 justify-between items-center sm:w-96">
          <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-xl text-left">
            <span className="text-[9px] uppercase font-bold text-blue-600 block tracking-wider">Total Received (In)</span>
            <span className="text-base font-black text-emerald-600 block mt-0.5">{formatCurrency(totalInflow)}</span>
            <span className="text-[9px] text-slate-400 block font-medium">Milestones cleared</span>
          </div>

          <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-left">
            <span className="text-[9px] uppercase font-bold text-rose-600 block tracking-wider">Total Expenses (Out)</span>
            <span className="text-base font-black text-rose-600 block mt-0.5">{formatCurrency(totalOutflow)}</span>
            <span className="text-[9px] text-slate-400 block font-medium">Utilization: {budgetUtilization.toFixed(0)}%</span>
          </div>

          <div className="col-span-2 bg-slate-50 p-3 rounded-xl flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Net Project Inflow Balance</span>
              <span className={`font-bold text-sm ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatCurrency(netBalance)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-450 block text-[10px]">Budget</span>
              <span className="font-bold text-slate-700">{formatCurrency(project.budget)}</span>
            </div>
          </div>
        </div>
      </div>

      {canManageAssignments && (
        <div className="bg-white rounded-xl border border-slate-150 px-3 py-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 text-left">
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Project Access</span>
            <span className="block text-xs font-semibold text-slate-700">Assign staff who can view this project workspace.</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {workspaceMembers.length === 0 ? (
              <span className="rounded-lg border border-slate-150 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500">
                No staff members in workspace
              </span>
            ) : (
              workspaceMembers.map((member) => {
                const isAssigned = assignedUserIds.includes(member.userId);
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => void handleToggleProjectAssignment(member.userId)}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                      isAssigned
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                    title={member.email}
                  >
                    {member.email}
                  </button>
                );
              })
            )}
            {assignmentStatus && (
              <span className="text-[10px] font-bold text-slate-400">{assignmentStatus}</span>
            )}
          </div>
        </div>
      )}

      {/* Primary Sub-Navigation Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          {[
            { id: 'ledger', label: 'Ledger', count: projectPayments.length },
            { id: 'invoice', label: 'Invoices', count: null },
            { id: 'parties', label: 'Parties', count: null },
            { id: 'documents', label: 'Documents', count: documents.filter((doc) => doc.projectId === project.id).length },
            { id: 'contacts', label: 'Contacts', count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 text-xs font-bold border-b-2 tracking-tight transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-blue-500'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Context views */}
      <div id="tab-outlet-canvas">
        {activeTab === 'ledger' && (
          <div className="space-y-4" id="ledger-sub-tab">
            {/* Quick Filter & Quick Add payment row */}
            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Project Ledger</h3>
                <p className="text-[11px] text-slate-400">Record receipts, expenses, and bill attachments.</p>
              </div>

              {onAddPayment && (
                <button
                  onClick={() => {
                    setPaymentDate(getTodayDateInputValue());
                    setShowAddPayment(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs px-3.5 py-2 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-xs border-none"
                  id="add-transaction-ledger-btn"
                >
                  <IndianRupee size={14} /> Add Transaction
                </button>
              )}
            </div>

            {/* Daily device date autotaken form modal overlay */}
            {showAddPayment && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs" id="add-payment-modal">
                <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center text-left">
                    <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                      <Landmark size={15} /> Add Transaction
                    </h3>
                    <button
                      onClick={() => setShowAddPayment(false)}
                      className="text-white/80 hover:text-white font-bold text-sm whitespace-nowrap cursor-pointer"
                    >
                      X
                    </button>
                  </div>

                  {/* Payment form */}
                  <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4 text-left">
                    {/* Direction: Cash In vs Cash Out toggles */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transaction Class</label>
                      <div className="grid grid-cols-2 gap-1 bg-slate-50 border p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setPayType('in');
                            setSelectedContact('');
                            resetNewPartyFields('client');
                          }}
                          className={`py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                            payType === 'in'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Cash received
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPayType('out');
                            setSelectedContact('');
                            resetNewPartyFields('vendor');
                          }}
                          className={`py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                            payType === 'out'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Expense paid
                        </button>
                      </div>
                    </div>

                    {/* Numeric amount */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Amount *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
                      />
                    </div>

                    {/* Select directory contact easily or input custom party */}
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {payType === 'in' ? 'Received From (Client)' : 'Given To (Vendor / Supplier / Contractor / Site Worker)'} *
                        </label>
                        <span className="text-[9px] text-blue-650 font-semibold">Pre-registered partners list</span>
                      </div>

                      <select
                        value={selectedContact}
                        onChange={(e) => {
                          setSelectedContact(e.target.value);
                          if (e.target.value === 'custom') {
                            setPartyInput('');
                            resetNewPartyFields(payType === 'in' ? 'client' : 'vendor');
                          } else {
                            const cObj = contacts.find((c) => c.id === e.target.value);
                            setPartyInput(cObj ? cObj.name : '');
                            resetNewPartyFields(payType === 'in' ? 'client' : 'vendor');
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                      >
                        <option value="">Choose registered contact or add new</option>
                        {suggestedContacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.company || c.role})
                          </option>
                        ))}
                        <option value="custom">{payType === 'in' ? 'Add client' : 'Add vendor / supplier'}</option>
                      </select>

                      {/* Manual input if they chose custom */}
                      {(!selectedContact || selectedContact === 'custom') && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              required
                              placeholder={payType === 'in' ? 'Enter client name' : 'Enter vendor, supplier, contractor, or site worker'}
                              value={partyInput}
                              onChange={(e) => setPartyInput(e.target.value)}
                              className="min-w-0 flex-1 bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <label className="shrink-0 bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs px-3 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-blue-100 whitespace-nowrap">
                              <Upload size={13} /> Import
                              <input
                                type="file"
                                accept=".csv,.vcf,text/csv,text/vcard"
                                onChange={(event) => {
                                  void handleImportPartyFromFile(event.target.files?.[0]);
                                  event.target.value = '';
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                          {partyImportStatus && (
                            <div className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                              {partyImportStatus}
                            </div>
                          )}
                          {selectedContact === 'custom' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <select
                                value={newPartyRole}
                                onChange={(e) => setNewPartyRole(e.target.value as ContactRole)}
                                className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {PARTY_ROLE_OPTIONS.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Phone"
                                value={newPartyPhone}
                                onChange={(e) => setNewPartyPhone(e.target.value)}
                                className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <input
                                type="email"
                                placeholder="Email"
                                value={newPartyEmail}
                                onChange={(e) => setNewPartyEmail(e.target.value)}
                                className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <input
                                type="text"
                                placeholder="Company"
                                value={newPartyCompany}
                                onChange={(e) => setNewPartyCompany(e.target.value)}
                                className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <input
                                type="text"
                                placeholder="GSTIN"
                                value={newPartyGstNumber}
                                onChange={(e) => setNewPartyGstNumber(e.target.value)}
                                className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs uppercase font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <input
                                type="text"
                                placeholder="Address"
                                value={newPartyAddress}
                                onChange={(e) => setNewPartyAddress(e.target.value)}
                                className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Payment mode choice list */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transfer Mode</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="cheque">Cheque</option>
                        <option value="card">Card</option>
                      </select>
                    </div>

                    {/* Transaction date */}
                    <div className="bg-blue-50 border border-blue-100 p-2 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-blue-900">
                      <label htmlFor="payment-date" className="flex items-center gap-1.5 font-semibold">
                        <Calendar size={13} />
                        <span>Transaction Date</span>
                      </label>
                      <input
                        id="payment-date"
                        type="date"
                        required
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full sm:w-auto min-w-0 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 font-mono font-bold text-blue-950 outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                     {/* Remark description details */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Internal Remarks / Description</label>
                      <input
                        type="text"
                        placeholder="e.g. advance layout sign-off, or rebar layout invoice #4422"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Attach Photo of Bill */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Attach Photo of Bill / Receipt
                      </label>
                      <div className="flex gap-3 items-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              readBillPhotoFile(file, setBillPhoto);
                            }
                          }}
                          className="hidden"
                          id="bill-photo-file-input"
                        />
                        <label
                          htmlFor="bill-photo-file-input"
                          className="px-3.5 py-2 ring-1 ring-slate-200 bg-slate-50 rounded-lg text-xs font-bold text-slate-650 hover:bg-slate-105 cursor-pointer flex items-center gap-1.5 transition whitespace-nowrap"
                        >
                          <Camera size={13} className="text-blue-500" />
                          {billPhoto ? 'Change Photo' : 'Upload Bill Photo'}
                        </label>
                        {billPhoto ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={billPhoto}
                              alt="Bill thumbnail"
                              className="w-8 h-8 rounded border border-slate-200 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setBillPhoto('')}
                              className="text-[10px] font-bold text-rose-500 hover:underline p-1 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No photo attached</span>
                        )}
                      </div>
                      {billPhotoError && (
                        <div className="text-[10px] font-bold text-rose-600">{billPhotoError}</div>
                      )}
                    </div>

                    {/* Form actions */}
                    <div className="pt-2 flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowAddPayment(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-550 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        Abandon
                      </button>
                      <button
                        type="submit"
                        className={`px-4 py-2 text-white font-bold text-xs rounded-lg cursor-pointer ${
                          payType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        Post Daily Ledger
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Grid listings of cash items */}
            {projectPayments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center">
                <Receipt className="text-slate-300 mx-auto mb-2" size={36} />
                <h4 className="font-bold text-slate-700 text-sm">No Recorded Transactions Yet</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Post incoming client deposits or material payouts to populate this ledger book.
                </p>
                <button
                  onClick={() => setShowAddPayment(true)}
                  className="mt-3 px-3.5 py-1.5 bg-slate-50 border hover:bg-slate-100 rounded-lg text-xs font-bold text-blue-500 cursor-pointer"
                >
                  Post First Transaction Cash Item
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-150 overflow-hidden" id="ledger-table-section">
                <div className="overflow-x-auto text-xs">
                  {/* Ledger grid table */}
                  <table className="w-full divide-y divide-slate-150 border-collapse table-auto text-left">
                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Transaction detail</th>
                        <th className="px-4 py-2.5">Party association</th>
                        <th className="px-4 py-2.5">Payment mode</th>
                        <th className="px-4 py-2.5 text-right">Cash Out (-)</th>
                        <th className="px-4 py-2.5 text-right">Cash In (+)</th>
                        <th className="px-4 py-2.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {projectPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                            {formatDate(p.date)}
                          </td>
                          <td className="px-4 py-3 text-left">
                            <div className="flex items-center gap-2">
                              {(p.billPhoto || p.billPhotoStoragePath) && (
                                <button
                                  onClick={() => handleViewBillPhoto(p)}
                                  className="shrink-0 p-1 bg-blue-50 rounded-md border border-blue-200 hover:bg-blue-100 transition duration-150 cursor-pointer flex items-center justify-center shadow-xs"
                                  title="View Attached Bill Photo"
                                >
                                  <Camera size={12} className="text-blue-600" />
                                </button>
                              )}
                              <span className="font-semibold text-slate-800 block leading-tight">{p.remark || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-left">
                              <span className="font-bold text-slate-700 block">{p.party}</span>
                              <span className="text-[9px] uppercase font-mono bg-slate-100 text-slate-500 px-1 rounded">
                                {p.partyRole}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-600 capitalize">
                            {p.paymentMode.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-rose-500 whitespace-nowrap">
                            {p.type === 'out' ? `-${formatCurrency(p.amount)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                            {p.type === 'in' ? `+${formatCurrency(p.amount)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {onEditPayment && (
                              <button
                                onClick={() => handleBeginEdit(p)}
                                className="text-blue-600 hover:text-blue-700 font-bold cursor-pointer inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100/80 px-2 py-1 rounded border border-blue-200 transition text-[11px]"
                                title="Edit transaction log item"
                              >
                                <Edit size={11} />
                                <span>Edit</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invoice Studio Tab */}
        {activeTab === 'invoice' && (
          <InvoiceGenerator
            project={project}
            payments={payments}
            contacts={contacts}
          />
        )}

        {/* Parties Tab - Party-wise ledger reports */}
        {activeTab === 'parties' && (
          <div className="space-y-4 text-left font-sans" id="party-ledger-tab">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Party Ledgers</h4>
                <p className="text-xs text-slate-500">Review transactions grouped by client, vendor, supplier, contractor, or site worker.</p>
              </div>
            </div>

            {(() => {
              const partyNames = Array.from(new Set(projectPayments.map((p) => p.party).filter(Boolean)));
              
              if (partyNames.length === 0) {
                return (
                  <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center">
                    <Users className="text-slate-350 mx-auto mb-2.5" size={36} />
                    <h4 className="font-bold text-slate-700 text-sm">No party ledger yet</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Add ledger transactions to track party balances.
                    </p>
                  </div>
                );
              }

              return (
                <div className="max-w-3xl space-y-4">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase block">Party Accounts ({partyNames.length})</span>
                  <div className="space-y-3">
                    {partyNames.map((pName) => {
                      const directTxns = projectPayments.filter((p) => p.party.toLowerCase() === pName.toLowerCase());
                      const dRole = directTxns[0]?.partyRole || 'other';
                      const dIn = directTxns.filter((p) => p.type === 'in').reduce((sum, p) => sum + p.amount, 0);
                      const dOut = directTxns.filter((p) => p.type === 'out').reduce((sum, p) => sum + p.amount, 0);
                      const isSelected = selectedPartyLedger && selectedPartyLedger.toLowerCase() === pName.toLowerCase();
                      const partyNetBalance = dIn - dOut;
                      const pPayments = directTxns;

                      return (
                        <div key={pName} className="space-y-2">
                          {/* Party summary card */}
                          <div
                            onClick={() => {
                              setSelectedPartyLedger(isSelected ? null : pName);
                            }}
                            className={`p-3.5 rounded-xl border transition cursor-pointer text-left relative overflow-hidden group ${
                              isSelected
                                ? 'bg-blue-500/10 border-blue-400 shadow-2xs'
                                : 'bg-white border-slate-150 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1.5">
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="font-bold text-slate-800 text-xs sm:text-sm block leading-tight truncate max-w-[140px] sm:max-w-xs">{pName}</span>
                                </div>
                                <span className="text-[9px] uppercase font-mono bg-slate-100/80 text-slate-600 px-1.5 py-0.5 rounded inline-block mt-1 capitalize">
                                  {dRole}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium font-mono whitespace-nowrap bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                                {directTxns.length} txn
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[10px]">
                              <div>
                                <span className="text-slate-400 block uppercase font-medium">Spent (Out)</span>
                                <span className="font-bold text-rose-500">{formatCurrency(dOut)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block uppercase font-medium">Deposited (In)</span>
                                <span className="font-bold text-emerald-600 font-sans">{formatCurrency(dIn)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Account statement view - opened just below the party details card */}
                          {isSelected && (
                            <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 space-y-3.5 animate-in slide-in-from-top-1 duration-150 ml-1.5 mr-1.5">
                              {/* Statement Header */}
                              <div className="border-b border-slate-200 pb-2.5 flex justify-between items-center gap-3 text-left">
                                <div className="space-y-0.5">
                                  <span className="text-[9px] font-bold text-blue-600 uppercase block tracking-wider">Account Statement Ledger</span>
                                  <span className="text-[11px] text-slate-505 font-semibold">All registered cash logs for <strong className="text-slate-850">{pName}</strong></span>
                                </div>
                                <div className="text-right">
                                  <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block">Net Balance</span>
                                  <span className={`text-xs font-black block ${partyNetBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {partyNetBalance >= 0 ? '+' : ''}{formatCurrency(partyNetBalance)}
                                  </span>
                                </div>
                              </div>

                              {/* Timeline entries list */}
                              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                                {pPayments.length === 0 ? (
                                  <div className="text-center py-6 text-slate-400 text-xs">No transaction entries found for this party.</div>
                                ) : (
                                  pPayments.map((p) => (
                                    <div key={p.id} className="p-3 bg-white hover:bg-slate-50/45 border border-slate-150 rounded-xl flex items-center justify-between group transition">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${p.type === 'in' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                                          {p.type === 'in' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                                        </div>
                                        <div className="text-left">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-800 block truncate max-w-[150px] sm:max-w-md">{p.remark || 'N/A'}</span>
                                            {(p.billPhoto || p.billPhotoStoragePath) && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleViewBillPhoto(p);
                                                }}
                                                className="p-1 bg-slate-50 rounded border border-slate-200 hover:bg-blue-50 cursor-pointer transition flex items-center shadow-2xs"
                                                title="View Attached Bill Photo"
                                              >
                                                <Camera size={10} className="text-blue-600" />
                                              </button>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[9px] text-slate-450 font-bold font-mono">
                                            <span>{formatDate(p.date)}</span>
                                            <span>/</span>
                                            <span className="capitalize">{p.paymentMode.replace('_', ' ')}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2.5 shrink-0">
                                        <div className="text-right whitespace-nowrap">
                                          <span className={`text-xs font-black whitespace-nowrap block ${p.type === 'in' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {p.type === 'in' ? '+' : '-'}{formatCurrency(p.amount)}
                                          </span>
                                        </div>
                                        {onEditPayment && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleBeginEdit(p);
                                            }}
                                            className="p-1 px-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition text-[9px] font-semibold text-slate-600 flex items-center gap-0.5 shrink-0"
                                            title="Edit Transaction"
                                          >
                                            <Edit size={9} className="text-blue-600 shrink-0" />
                                            <span>Edit</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Dynamic Contacts Sub-Tab */}
        {activeTab === 'contacts' && (
          <ContactManager
            contacts={contacts}
            onAddContact={onAddContact}
            onAddContacts={onAddContacts}
            onUpdateContact={onUpdateContact}
            onUpdateContactRole={onUpdateContactRole}
            payments={payments}
            projects={projects}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentManager
            projectId={project.id}
            documents={documents}
            onAddDocument={onAddDocument}
            onDeleteDocument={onDeleteDocument}
            onDownloadDocument={onDownloadDocument}
          />
        )}
      </div>

      {/* Lightbox / Modal for Viewing Bill Photo */}
      {viewingBillPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setViewingBillPhoto(null)}
          id="bill-photo-lightbox-backdrop"
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
            id="bill-photo-lightbox-modal"
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-150">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Receipt size={16} className="text-blue-600" /> Certified Bill / Receipt Photo
              </span>
              <button
                onClick={() => setViewingBillPhoto(null)}
                className="text-slate-400 hover:text-slate-650 font-bold text-sm cursor-pointer border-none bg-transparent"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden max-h-[60vh] p-1.5">
              <img
                src={viewingBillPhoto}
                alt="Bill Photo representation"
                className="max-w-full max-h-[50vh] object-contain shadow-xs rounded-lg"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setViewingBillPhoto(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-xs whitespace-nowrap border-none"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal with Deletion Option */}
      {editingPayment && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setEditingPayment(null)}
          id="edit-transaction-modal-backdrop"
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150 text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
            id="edit-transaction-modal"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-150">
              <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wide">
                <Edit size={16} className="text-blue-600" /> Edit Transaction
              </span>
              <button
                onClick={() => setEditingPayment(null)}
                className="text-slate-400 hover:text-slate-650 font-bold text-sm cursor-pointer border-none bg-transparent"
              >
                X
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold text-slate-600">
              {/* Type selector */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border">
                <button
                  type="button"
                  onClick={() => setEditType('out')}
                  className={`py-2 text-center rounded-lg font-bold transition cursor-pointer ${
                    editType === 'out'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Outflow
                </button>
                <button
                  type="button"
                  onClick={() => setEditType('in')}
                  className={`py-2 text-center rounded-lg font-bold transition cursor-pointer ${
                    editType === 'in'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Inflow
                </button>
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Transaction Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-medium text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Amount</label>
                  <input
                    type="number"
                    required
                    placeholder="Enter amount"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Party association details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Party</label>
                  <input
                    type="text"
                    required
                    value={editParty}
                    onChange={(e) => setEditParty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-medium text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Role</label>
                  <select
                    value={editPartyRole}
                    onChange={(e) => setEditPartyRole(e.target.value as PartyRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-medium text-slate-800"
                  >
                    {PARTY_ROLE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Mode */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">Payment Mode</label>
                <select
                  value={editPaymentMode}
                  onChange={(e) => setEditPaymentMode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-medium text-slate-800"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>

              {/* Remarks detail */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Remark / Transaction Purpose</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Purchased plumbing copper valves"
                  value={editRemark}
                  onChange={(e) => setEditRemark(e.target.value)}
                  onBlur={() => {
                    if (!editRemark.trim()) {
                      setEditRemark(DEFAULT_TRANSACTION_REMARK);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-medium text-slate-800"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100 gap-3">
                {onDeletePayment ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeletePayment(editingPayment.id);
                      setEditingPayment(null);
                    }}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl cursor-pointer transition flex items-center gap-1 border border-rose-200"
                    title="Remove this transaction log item permanently"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex gap-2 font-bold">
                  <button
                    type="button"
                    onClick={() => setEditingPayment(null)}
                    className="px-4 py-2.5 hover:bg-slate-100 text-slate-500 rounded-xl cursor-pointer transition border-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-[#00509e] hover:bg-[#007acc] text-white rounded-xl cursor-pointer transition shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
