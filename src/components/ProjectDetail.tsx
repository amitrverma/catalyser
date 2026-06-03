import React, { useState } from 'react';
import { Project, Payment, Contact, CloudDocument, PaymentType, PaymentMode, DocumentCategory, ContactRole, PartyRole } from '../types';
import { formatDate } from '../lib/formatter';
import { PARTY_ROLE_OPTIONS, PAYABLE_CONTACT_ROLES } from '../lib/roleLabels';
import InvoiceGenerator from './InvoiceGenerator';
import DocumentManager from './DocumentManager';
import ContactManager from './ContactManager';
import { ChevronLeft, Landmark, IndianRupee, ArrowUpRight, ArrowDownLeft, Calendar, FileCheck, Users, HelpCircle, HardHat, Receipt, HelpCircle as Help, Camera, Edit, Trash2 } from 'lucide-react';

interface ProjectDetailProps {
  project: Project;
  projects?: Project[];
  payments: Payment[];
  contacts: Contact[];
  documents: CloudDocument[];
  onBack: () => void;
  onAddPayment: (payment: Omit<Payment, 'id'>) => void;
  onDeletePayment: (paymentId: string) => void;
  onEditPayment?: (payment: Payment) => void;
  onAddContact: (name: string, role: ContactRole, phone: string, email: string, company: string) => void;
  onAddContacts?: (contacts: Array<{ name: string; role: ContactRole; phone: string; email: string; company: string }>) => Promise<boolean> | boolean | void;
  onUpdateContact?: (contactId: string, contact: { name: string; role: ContactRole; phone: string; email: string; company: string; gstNumber?: string; address?: string }) => Promise<boolean> | boolean | void;
  onUpdateContactRole?: (contactId: string, role: ContactRole) => void;
  onAddDocument: (file: File, category: DocumentCategory) => void;
  onDeleteDocument: (docId: string) => void;
  onDownloadDocument: (doc: CloudDocument) => void;
}

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
  const [payType, setPayType] = useState<PaymentType>('out'); // Default 'out' as requested for tracking expenses!
  const [amount, setAmount] = useState('');
  const [partyInput, setPartyInput] = useState('');
  const [partySearchStr, setPartySearchStr] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [remark, setRemark] = useState('');
  const [billPhoto, setBillPhoto] = useState<string>('');
  
  // Select among existing contacts easily
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [selectedPartyLedger, setSelectedPartyLedger] = useState<string | null>(null);
  const [viewingBillPhoto, setViewingBillPhoto] = useState<string | null>(null);

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

  const handleBeginEdit = (p: Payment) => {
    setEditingPayment(p);
    setEditAmount(p.amount.toString());
    setEditParty(p.party);
    setEditPartyRole(p.partyRole);
    setEditPaymentMode(p.paymentMode);
    setEditRemark(p.remark);
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
        remark: editRemark.trim(),
        date: editDate,
        billPhoto: editBillPhoto || undefined,
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
    if (!amount || Number(amount) <= 0) return;

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

    // Automatically retrieves the current device date!
    const currentDateStr = new Date().toISOString().substring(0, 10); // Format YYYY-MM-DD local

    onAddPayment({
      projectId: project.id,
      type: payType,
      amount: Number(amount),
      party: finalParty,
      partyRole: derivedRole,
      paymentMode,
      remark,
      date: currentDateStr, // Taken automatically
      billPhoto: billPhoto || undefined,
    });

    // Reset payment states
    setAmount('');
    setPartyInput('');
    setSelectedContact('');
    setRemark('');
    setBillPhoto('');
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
            {project.status === 'ongoing' ? '🟢 Ongoing' : project.status === 'completed' ? '✅ Completed' : '🟡 On Hold'}
          </span>
        </div>
      </div>

      {/* Project Financial Health Card */}
      <div className="bg-white rounded-2xl border border-slate-150 p-6 flex flex-col md:flex-row justify-between items-stretch gap-6 shadow-sm">
        <div className="space-y-2 text-left flex-1 md:border-r md:border-slate-100 md:pr-6">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Selected Portfolio</span>
          <h2 className="text-xl font-bold text-slate-800 leading-tight">{project.name}</h2>
          <p className="text-slate-500 text-xs leading-relaxed max-w-xl">{project.description}</p>
          <div className="text-xs text-slate-400 space-y-0.5 pt-1">
            <span>• Job Site: <span className="font-semibold text-slate-650">{project.address || 'Address Unregistered'}</span></span>
            <span className="block">• Primary Client Account: <span className="font-semibold text-slate-650">{project.clientName}</span></span>
          </div>
        </div>

        {/* Totals panel */}
        <div className="grid grid-cols-2 gap-4 shrink-0 justify-between items-center sm:w-96">
          <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-xl text-left">
            <span className="text-[9px] uppercase font-bold text-blue-600 block tracking-wider">Total Received (In)</span>
            <span className="text-base font-black text-emerald-600 block mt-0.5">₹{totalInflow.toLocaleString()}</span>
            <span className="text-[9px] text-slate-400 block font-medium">Milestones cleared</span>
          </div>

          <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-left">
            <span className="text-[9px] uppercase font-bold text-rose-600 block tracking-wider">Total Expenses (Out)</span>
            <span className="text-base font-black text-rose-600 block mt-0.5">₹{totalOutflow.toLocaleString()}</span>
            <span className="text-[9px] text-slate-400 block font-medium">Utilization: {budgetUtilization.toFixed(0)}%</span>
          </div>

          <div className="col-span-2 bg-slate-50 p-3 rounded-xl flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Net Project Inflow Balance</span>
              <span className={`font-bold text-sm ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                ₹{netBalance.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-450 block text-[10px]">Job Site Allocated Budget</span>
              <span className="font-bold text-slate-700">₹{project.budget.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Sub-Navigation Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          {[
            { id: 'ledger', label: 'transaction', count: projectPayments.length },
            { id: 'invoice', label: 'Billing Invoices', count: null },
            { id: 'parties', label: 'Parties', count: null },
            { id: 'documents', label: 'Documents', count: documents.filter((doc) => doc.projectId === project.id).length },
            { id: 'contacts', label: 'Directory Contacts', count: null },
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
                <h3 className="font-bold text-slate-800 text-sm">Site Ledger Cash Book</h3>
                <p className="text-[11px] text-slate-400">Register daily material expense receipts &amp; owner clearings</p>
              </div>

              <button
                onClick={() => setShowAddPayment(true)}
                className="bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs px-3.5 py-2 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-xs border-none"
                id="add-transaction-ledger-btn"
              >
                <IndianRupee size={14} /> Add Transaction
              </button>
            </div>

            {/* Daily device date autotaken form modal overlay */}
            {showAddPayment && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs" id="add-payment-modal">
                <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center text-left">
                    <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                      <Landmark size={15} /> Save Daily Transaction Details
                    </h3>
                    <button
                      onClick={() => setShowAddPayment(false)}
                      className="text-white/80 hover:text-white font-bold text-sm whitespace-nowrap cursor-pointer"
                    >
                      ✕
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
                          }}
                          className={`py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                            payType === 'in'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          💸 Cash received (IN)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPayType('out');
                            setSelectedContact('');
                          }}
                          className={`py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                            payType === 'out'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          🧾 Expense paid (OUT)
                        </button>
                      </div>
                    </div>

                    {/* Numeric amount */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transfer Amount (₹) *</label>
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
                          } else {
                            const cObj = contacts.find((c) => c.id === e.target.value);
                            setPartyInput(cObj ? cObj.name : '');
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                      >
                        <option value="">-- Choose registered contact or custom --</option>
                        {suggestedContacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.company || c.role})
                          </option>
                        ))}
                        <option value="custom">✍️ Type Custom Name Manually...</option>
                      </select>

                      {/* Manual input if they chose custom */}
                      {(!selectedContact || selectedContact === 'custom') && (
                        <input
                          type="text"
                          required
                          placeholder={payType === 'in' ? "Owner Client's Name" : 'Material store, contractor, or site worker'}
                          value={partyInput}
                          onChange={(e) => setPartyInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
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
                        <option value="bank_transfer">🏛️ Bank Transfer / ACH</option>
                        <option value="cash">💵 Hard Cash</option>
                        <option value="upi">📱 UPI / Mobile Payment Wallet</option>
                        <option value="cheque">✍️ Bank Cheque Draw</option>
                        <option value="card">💳 Company Debit/Credit Card</option>
                      </select>
                    </div>

                    {/* Auto date display */}
                    <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl flex items-center justify-between text-xs text-blue-900">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} />
                        <span>Current System Auto-Date:</span>
                      </div>
                      <span className="font-mono font-bold tracking-wider">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setBillPhoto(reader.result as string);
                              };
                              reader.readAsDataURL(file);
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
                        <th className="px-4 py-2.5">Log Date</th>
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
                              {p.billPhoto && (
                                <button
                                  onClick={() => setViewingBillPhoto(p.billPhoto!)}
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
                            {p.type === 'out' ? `-₹${p.amount.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                            {p.type === 'in' ? `+₹${p.amount.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleBeginEdit(p)}
                              className="text-blue-600 hover:text-blue-700 font-bold cursor-pointer inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100/80 px-2 py-1 rounded border border-blue-200 transition text-[11px]"
                              title="Edit transaction log item"
                            >
                              <Edit size={11} />
                              <span>Edit</span>
                            </button>
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
                <h4 className="text-sm font-bold text-slate-800">Party-wise Account Ledger</h4>
                <p className="text-xs text-slate-500">Track and view transactions grouped by specific client, contractor, vendor, or supplier account portfolios under this project.</p>
              </div>
            </div>

            {(() => {
              const partyNames = Array.from(new Set(projectPayments.map((p) => p.party).filter(Boolean)));
              
              if (partyNames.length === 0) {
                return (
                  <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center">
                    <Users className="text-slate-350 mx-auto mb-2.5" size={36} />
                    <h4 className="font-bold text-slate-700 text-sm">No Active Party Accounts for this Portfolio</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Create financial transactions in the cash book to establish and track relative balances.
                    </p>
                  </div>
                );
              }

              return (
                <div className="max-w-3xl space-y-4">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase block">Associate Accounts ({partyNames.length})</span>
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
                                <span className="font-bold text-rose-500">₹{dOut.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block uppercase font-medium">Deposited (In)</span>
                                <span className="font-bold text-emerald-600 font-sans">₹{dIn.toLocaleString()}</span>
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
                                  <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold block">Portfolio Net Balance</span>
                                  <span className={`text-xs font-black block ${partyNetBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {partyNetBalance >= 0 ? '+' : ''}₹{partyNetBalance.toLocaleString()}
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
                                            {p.billPhoto && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setViewingBillPhoto(p.billPhoto!);
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
                                            <span>•</span>
                                            <span className="capitalize">{p.paymentMode.replace('_', ' ')}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2.5 shrink-0">
                                        <div className="text-right whitespace-nowrap">
                                          <span className={`text-xs font-black whitespace-nowrap block ${p.type === 'in' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {p.type === 'in' ? '+' : '-'}₹{p.amount.toLocaleString()}
                                          </span>
                                        </div>
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
                <Edit size={16} className="text-blue-600" /> Correct Transaction Log
              </span>
              <button
                onClick={() => setEditingPayment(null)}
                className="text-slate-400 hover:text-slate-650 font-bold text-sm cursor-pointer border-none bg-transparent"
              >
                ✕
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
                  📉 Outflow (Expense Debit)
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
                  📈 Inflow (Deposit Credit)
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
                  <label className="text-[10px] uppercase font-bold text-slate-400">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="Enter amount (₹)"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Party association details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Party / Beneficiary</label>
                  <input
                    type="text"
                    required
                    value={editParty}
                    onChange={(e) => setEditParty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-medium text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Party Portfolio Role</label>
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
                <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">Payment Mode Selection</label>
                <select
                  value={editPaymentMode}
                  onChange={(e) => setEditPaymentMode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-medium text-slate-800"
                >
                  <option value="bank_transfer">🏛️ Bank Nettransfer / ACH Direct</option>
                  <option value="cash">💵 Hard Coin / Cash Reserves</option>
                  <option value="upi">📱 UPI Wallet / GPay / PhonePe</option>
                  <option value="cheque">✍️ Physical Drawer Cheque</option>
                  <option value="card">💳 Company Debit/Credit Card</option>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-medium text-slate-800"
                />
              </div>

              {/* Footer Buttons with prominent Delete Action! */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100 gap-3">
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
