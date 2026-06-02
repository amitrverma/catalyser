import React, { useState, useEffect } from 'react';
import { Project, Payment, Contact, PaymentMode, PaymentType, DbData, PartyRole } from '../types';
import { getDbData, saveDbData } from '../lib/db';
import { formatDate } from '../lib/formatter';
import { PARTY_ROLE_OPTIONS } from '../lib/roleLabels';
import { Receipt, Calendar, Edit2, Trash2, Camera, Check, ExternalLink, ArrowLeftRight, Landmark, Tag } from 'lucide-react';

interface PartyLedgerStandaloneProps {
  partyName: string;
}

export default function PartyLedgerStandalone({ partyName }: PartyLedgerStandaloneProps) {
  const [db, setDb] = useState<DbData | null>(null);

  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editParty, setEditParty] = useState('');
  const [editPartyRole, setEditPartyRole] = useState<PartyRole>('other');
  const [editPaymentMode, setEditPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [editRemark, setEditRemark] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<PaymentType>('out');
  const [editProjectId, setEditProjectId] = useState('');
  const [editBillPhoto, setEditBillPhoto] = useState<string>('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load database on mount
  useEffect(() => {
    let mounted = true;

    getDbData().then((data) => {
      if (mounted) setDb(data);
    });

    const handleDbChange = async () => {
      const data = await getDbData();
      setDb(data);
    };
    window.addEventListener('custom-db-updated', handleDbChange);
    return () => {
      mounted = false;
      window.removeEventListener('custom-db-updated', handleDbChange);
    };
  }, []);

  if (!db) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-slate-400">
        <span className="text-xs font-mono tracking-widest animate-pulse">
          LOADING SECURE PARTY STATEMENT...
        </span>
      </div>
    );
  }

  // Filter payments matching this party name (case-insensitive)
  const partyPayments = db.payments.filter(
    (p) => p.party && p.party.trim().toLowerCase() === partyName.trim().toLowerCase()
  );

  // Group metadata from directory contacts
  const contactProfile = db.contacts.find(
    (c) => c.name.trim().toLowerCase() === partyName.trim().toLowerCase()
  );

  const totalIn = partyPayments
    .filter((p) => p.type === 'in')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOut = partyPayments
    .filter((p) => p.type === 'out')
    .reduce((sum, p) => sum + p.amount, 0);

  const balance = totalIn - totalOut;

  const handleBeginEdit = (p: Payment) => {
    setEditingPayment(p);
    setEditAmount(p.amount.toString());
    setEditParty(p.party);
    setEditPartyRole(p.partyRole);
    setEditPaymentMode(p.paymentMode);
    setEditRemark(p.remark);
    setEditDate(p.date || new Date().toISOString().substring(0, 10));
    setEditType(p.type);
    setEditProjectId(p.projectId);
    setEditBillPhoto(p.billPhoto || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    if (!editAmount || Number(editAmount) <= 0) return;

    const updatedPayments = db.payments.map((p) => {
      if (p.id === editingPayment.id) {
        return {
          ...p,
          type: editType,
          amount: Number(editAmount),
          party: editParty.trim(),
          partyRole: editPartyRole,
          paymentMode: editPaymentMode,
          remark: editRemark.trim(),
          date: editDate,
          projectId: editProjectId,
          billPhoto: editBillPhoto || undefined,
        };
      }
      return p;
    });

    const updatedDb = { ...db, payments: updatedPayments };
    setDb(updatedDb);
    void saveDbData(updatedDb);
    setEditingPayment(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    // Notify other tabs immediately
    window.dispatchEvent(new Event('custom-db-updated'));
  };

  const handleDeletePayment = (id: string) => {
    const updatedPayments = db.payments.filter((p) => p.id !== id);
    const updatedDb = { ...db, payments: updatedPayments };
    setDb(updatedDb);
    void saveDbData(updatedDb);
    setDeleteConfirmId(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    // Notify other tabs immediately
    window.dispatchEvent(new Event('custom-db-updated'));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-left pb-16">
      {/* Prime Header Bar */}
      <header className="bg-slate-900 px-5 py-4.5 shadow-md text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md font-mono font-bold text-lg">
              {partyName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-tight uppercase">Party Accounts</h1>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest block uppercase mt-0.5">
                SECURE TRANSACTION RECORD STATEMENT
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="bg-emerald-600/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Synchronized Multi-Tab Database
            </span>
          </div>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Success Alert Banner */}
        {saveSuccess && (
          <div className="bg-emerald-5 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
            <Check size={16} className="text-emerald-600 shrink-0" />
            Ledger adjustments saved successfully! Changes are instantly synced with all active construction and billing tabs.
          </div>
        )}

        {/* Party Identification Banner */}
        <div className="bg-white rounded-2xl border border-slate-150 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#00509e] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {contactProfile?.role || 'Other'} Profile
              </span>
              {contactProfile?.company && (
                <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full">
                  🏢 {contactProfile.company}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-slate-800 leading-none">{partyName}</h2>
            
            {/* Display Contact details from directory if associated */}
            <div className="text-xs text-slate-500 space-y-1 pt-1">
              {contactProfile?.phone && (
                <p>• Mobile Phone Number: <span className="text-slate-700 font-bold">{contactProfile.phone}</span></p>
              )}
              {contactProfile?.email && (
                <p>• Registered Email: <span className="text-slate-700 font-bold">{contactProfile.email}</span></p>
              )}
              {contactProfile?.gstNumber && (
                <p>• Verified GSTIN: <span className="text-slate-705 font-bold font-mono text-blue-650 bg-blue-50/50 px-1.5 py-0.5 rounded text-[10px] border border-blue-100">{contactProfile.gstNumber}</span></p>
              )}
              {contactProfile?.address && (
                <p>• Business address: <span className="text-slate-700 font-medium">{contactProfile.address}</span></p>
              )}
            </div>
          </div>

          {/* Core ledger metrics cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto shrink-0 md:max-w-md">
            <div className="bg-emerald-50/40 border border-emerald-100 p-3 rounded-xl text-left">
              <span className="text-[9px] uppercase font-bold text-emerald-700 font-mono tracking-wider block">Deposited (Credit / In)</span>
              <span className="text-base font-black text-emerald-600 block mt-0.5">₹{totalIn.toLocaleString()}</span>
              <span className="text-[9.5px] text-slate-400 block mt-0.5 font-medium">Funds Cleared</span>
            </div>
            
            <div className="bg-rose-50/40 border border-rose-100 p-3 rounded-xl text-left">
              <span className="text-[9px] uppercase font-bold text-rose-700 font-mono tracking-wider block">Withdrawn (Debit / Out)</span>
              <span className="text-base font-black text-rose-500 block mt-0.5">₹{totalOut.toLocaleString()}</span>
              <span className="text-[9.5px] text-slate-400 block mt-0.5 font-medium">Material / Services Payouts</span>
            </div>

            <div className={`col-span-2 sm:col-span-1 border p-3 rounded-xl text-left flex flex-col justify-between ${balance >= 0 ? 'bg-blue-50/40 border-blue-100 text-blue-800' : 'bg-rose-50/40 border-rose-100 text-rose-800'}`}>
              <div>
                <span className="text-[9px] uppercase font-bold font-mono tracking-wider text-slate-400 block">Relative Standing</span>
                <span className="text-base font-black block mt-0.5">
                  {balance >= 0 ? '+' : ''}₹{balance.toLocaleString()}
                </span>
              </div>
              <span className="text-[9.5px] text-slate-400 block mt-1 font-medium font-mono truncate">
                {balance >= 0 ? 'Clear Retainer' : 'Balance Deficit'}
              </span>
            </div>
          </div>
        </div>

        {/* Table list of transactions */}
        <div className="bg-white rounded-2xl border border-slate-150 p-5 space-y-4 shadow-2xs">
          <div className="flex justify-between items-center pb-2 border-b">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                <Receipt size={16} className="text-blue-600" /> Complete Transaction Logs Ledger
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Lists all recorded payments associated with {partyName} under different construction portfolios. Take corrective actions by clicking Edit.
              </p>
            </div>
          </div>

          {partyPayments.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Receipt className="mx-auto text-slate-300 mb-2 animate-pulse" size={36} />
              <p className="text-xs font-semibold text-slate-600">No recorded cash items match this partner</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Financial items that reference this party will list here dynamically</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-150 rounded-xl">
              <table className="w-full text-xs divide-y divide-slate-150 text-left border-collapse table-auto">
                <thead className="bg-slate-50 font-bold uppercase tracking-wider text-[9.5px] text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Log Date</th>
                    <th className="px-4 py-3">Associated Project</th>
                    <th className="px-4 py-3">Remark / Purpose</th>
                    <th className="px-4 py-3">Payment Mode</th>
                    <th className="px-4 py-3 text-right">Debit (Outflow)</th>
                    <th className="px-4 py-3 text-right">Credit (Inflow)</th>
                    <th className="px-4 py-3 text-center">Correct Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-650">
                  {partyPayments.map((p) => {
                    const associatedProject = db.projects.find((pr) => pr.id === p.projectId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-550 whitespace-nowrap">
                          {formatDate(p.date)}
                        </td>
                        <td className="px-4 py-3 text-slate-800 truncate max-w-[160px] font-semibold">
                          {associatedProject ? associatedProject.name : `Unassigned (${p.projectId})`}
                        </td>
                        <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={p.remark}>
                          <div className="flex items-center gap-1.5">
                            {p.billPhoto && (
                              <span className="inline-block px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] text-blue-600 font-bold font-mono">
                                PHOTO
                              </span>
                            )}
                            <span>{p.remark || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 space-x-1.5 whitespace-nowrap capitalize">
                          {p.paymentMode.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-550 whitespace-nowrap font-mono">
                          {p.type === 'out' ? `-₹${p.amount.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-650 whitespace-nowrap font-mono">
                          {p.type === 'in' ? `+₹${p.amount.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleBeginEdit(p)}
                            className="text-blue-600 hover:text-blue-700 font-black cursor-pointer inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition text-[11px] border border-blue-200"
                          >
                            <Edit2 size={11} /> Correct
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Editing Form Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="relative max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden p-6 animate-in zoom-in-95 duration-150 text-left space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-150">
              <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wide">
                <Edit2 size={16} className="text-blue-600" /> Correct Transaction Log
              </span>
              <button
                onClick={() => setEditingPayment(null)}
                className="text-slate-400 hover:text-slate-650 font-bold text-sm cursor-pointer border-none bg-transparent"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold text-slate-600">
              {/* Type toggle */}
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-medium text-slate-800 animate-none"
                  />
                </div>
              </div>

              {/* Project association & Party classification */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Project Association</label>
                  <select
                    value={editProjectId}
                    onChange={(e) => setEditProjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium text-slate-800"
                  >
                    {db.projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                    <option value="unassigned">Unassigned Shared Expense</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Beneficiary Classification</label>
                  <select
                    value={editPartyRole}
                    onChange={(e) => setEditPartyRole(e.target.value as PartyRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium text-slate-800"
                  >
                    {PARTY_ROLE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Party Identifier */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Party / Contact Name</label>
                <input
                  type="text"
                  required
                  value={editParty}
                  onChange={(e) => setEditParty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-medium text-slate-800"
                />
              </div>

              {/* Payment Mode */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Payment Mode</label>
                <select
                  value={editPaymentMode}
                  onChange={(e) => setEditPaymentMode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium text-slate-800"
                >
                  <option value="bank_transfer">🏛️ Bank Nettransfer / Direct ACH</option>
                  <option value="cash">💵 Hard Coin / Cash Reserves</option>
                  <option value="upi">📱 UPI Wallet / GPay / PhonePe</option>
                  <option value="cheque">✍️ Physical Drawer Cheque</option>
                  <option value="card">💳 Company Debit/Credit Card</option>
                </select>
              </div>

              {/* Remarks description */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 font-sans">Remarks / Transaction Purpose</label>
                <input
                  type="text"
                  required
                  value={editRemark}
                  onChange={(e) => setEditRemark(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none font-medium text-slate-800"
                />
              </div>

              {/* Bill Photo representation */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Attached Bill / Material Invoice Photo</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    id="edit-billphoto-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditBillPhoto(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="edit-billphoto-input"
                    className="px-3.5 py-2 border rounded-xl text-xs font-bold text-slate-650 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5 whitespace-nowrap bg-white"
                  >
                    <Camera size={13} className="text-blue-500" />
                    {editBillPhoto ? 'Replace Photo' : 'Attach Photo'}
                  </label>
                  {editBillPhoto ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={editBillPhoto}
                        alt="Bill audit"
                        className="w-8 h-8 rounded border object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setEditBillPhoto('')}
                        className="text-[10px] font-bold text-rose-500 hover:underline p-1 cursor-pointer bg-transparent border-none"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-450 italic font-mono">No material receipt scanned</span>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100 gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(editingPayment.id)}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl cursor-pointer transition flex items-center gap-1 border border-rose-200"
                  title="Remove transaction"
                >
                  <Trash2 size={13} />
                  <span>Delete Record</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPayment(null)}
                    className="px-4 py-2.5 hover:bg-slate-100 text-slate-500 rounded-xl cursor-pointer transition border-none"
                  >
                    Go Back
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

      {/* Delete Confirmation Alert Dialouge Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-150 p-6 text-left space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm leading-tight uppercase tracking-wider">
              Confirm Transaction Removal
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete this cash flow transaction record? This will adjust relative and cash-book balances across all modules. This action is irreversible.
            </p>
            <div className="flex gap-2 justify-end text-xs font-bold pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-slate-550 hover:bg-slate-100 rounded-xl transition border-none cursor-pointer bg-transparent"
              >
                Cancel Deletion
              </button>
              <button
                onClick={() => handleDeletePayment(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition border-none cursor-pointer shadow-xs"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
