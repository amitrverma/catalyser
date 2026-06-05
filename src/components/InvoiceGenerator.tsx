import React, { useState } from 'react';
import { Project, Payment, Contact } from '../types';
import Logo from './Logo';
import { Printer, Mail, Send, CheckCircle2, CircleDollarSign, Plus, Trash2, Edit, Check, X, Eye, MessageSquare, Share2 } from 'lucide-react';
import { getSetting } from '../lib/settingsStore';
import { formatCurrency } from '../lib/formatter';

interface InvoiceGeneratorProps {
  project: Project;
  payments: Payment[];
  contacts: Contact[];
}

interface BillableItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
}

export default function InvoiceGenerator({ project, payments, contacts }: InvoiceGeneratorProps) {
  const [billableItems, setBillableItems] = useState<BillableItem[]>([]);

  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemRate, setNewItemRate] = useState(0);

  const [invoiceType, setInvoiceType] = useState<'proforma' | 'tax'>('tax');
  const [sgstRate, setSgstRate] = useState<number>(9);
  const [cgstRate, setCgstRate] = useState<number>(9);
  const [terms, setTerms] = useState('Payment is due within 15 days of invoice date.');
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    const year = new Date().getFullYear();
    const suffix = project.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || '000001';
    return `INV-${year}-${suffix}`;
  });
  const [sentStatus, setSentStatus] = useState<boolean>(false);
  const [whatsappStatus, setWhatsappStatus] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Listen to settings/logo/stamp/sign updates to dynamically re-render the preview sheets
  const [, setSettingsUpdateTick] = useState(0);
  React.useEffect(() => {
    const handleUpdate = () => {
      setSettingsUpdateTick((tick) => tick + 1);
    };
    window.addEventListener('custom-settings-updated', handleUpdate);
    window.addEventListener('custom-logo-updated', handleUpdate);
    window.addEventListener('custom-stamp-updated', handleUpdate);
    window.addEventListener('custom-sign-updated', handleUpdate);
    return () => {
      window.removeEventListener('custom-settings-updated', handleUpdate);
      window.removeEventListener('custom-logo-updated', handleUpdate);
      window.removeEventListener('custom-stamp-updated', handleUpdate);
      window.removeEventListener('custom-sign-updated', handleUpdate);
    };
  }, []);

  // States & handlings for inline line-item editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingDesc, setEditingDesc] = useState('');
  const [editingQty, setEditingQty] = useState(1);
  const [editingRate, setEditingRate] = useState(0);

  const startEditing = (item: BillableItem) => {
    setEditingItemId(item.id);
    setEditingDesc(item.description);
    setEditingQty(item.qty);
    setEditingRate(item.rate);
  };

  const cancelEditing = () => {
    setEditingItemId(null);
  };

  const saveEditing = (id: string) => {
    if (!editingDesc.trim() || editingRate <= 0) return;
    setBillableItems(
      billableItems.map((item) =>
        item.id === id
          ? { ...item, description: editingDesc, qty: editingQty, rate: editingRate }
          : item
      )
    );
    setEditingItemId(null);
  };

  const totalInvoiced = billableItems.reduce((acc, item) => acc + item.qty * item.rate, 0);
  const sgstAmount = totalInvoiced * (sgstRate / 100);
  const cgstAmount = totalInvoiced * (cgstRate / 100);
  const calculatedTax = sgstAmount + cgstAmount;
  const totalWithTax = totalInvoiced + calculatedTax;

  // Payments in received from the client for this project
  const totalInflowsMatched = payments
    .filter((p) => p.projectId === project.id && p.type === 'in')
    .reduce((sum, p) => sum + p.amount, 0);

  const outstandingBalanceDue = Math.max(0, totalWithTax - totalInflowsMatched);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc.trim() || newItemRate <= 0) return;
    setBillableItems([
      ...billableItems,
      {
        id: `bill-${Date.now()}`,
        description: newItemDesc,
        qty: newItemQty,
        rate: newItemRate,
      },
    ]);
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemRate(0);
  };

  const handleRemoveItem = (id: string) => {
    setBillableItems(billableItems.filter((i) => i.id !== id));
  };

  const triggerPrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn("Print action triggered warning:", e);
    }
  };

  const handleShareWhatsApp = () => {
    const firmName = getSetting('cc_company_name') || 'Workspace';
    const totalDue = formatCurrency(totalWithTax);
    const balanceDue = formatCurrency(outstandingBalanceDue);
    
    const text = `*Invoice Reference:* ${invoiceNumber}
*From:* ${firmName}
*Project:* ${project.name}
*Client:* ${project.clientName}

Invoice summary:
- *Document Type:* ${invoiceType === 'tax' ? 'Tax Invoice' : 'Proforma Invoice'}
- *Total Billable:* ${totalDue}
- *Deposits Received:* ${formatCurrency(totalInflowsMatched)}
- *Outstanding Balance Due:* ${balanceDue}

Please review and confirm if any corrections are needed.`;

    // Copy the share text when clipboard access is available.
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
    } catch (err) {
      console.warn("Clipboard access copy blocked:", err);
    }

    setWhatsappStatus(true);
    setTimeout(() => setWhatsappStatus(false), 4000);

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSendEmail = () => {
    setSentStatus(true);
    setTimeout(() => setSentStatus(false), 4400);
  };

  return (
    <div className="space-y-6" id="invoice-generator-container">
      {/* Configuration Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100" id="invoice-billables-setup">
        <div className="md:col-span-2 space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Configure Line Items
          </h4>
          
          <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-3 rounded-xl border border-slate-200">
            <div className="sm:col-span-6">
              <input
                type="text"
                placeholder="Product or service description"
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <input
                type="number"
                min="1"
                placeholder="Qty"
                value={newItemQty}
                onChange={(e) => setNewItemQty(Number(e.target.value))}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none text-center"
              />
            </div>
            <div className="sm:col-span-3">
              <input
                type="number"
                placeholder="Rate"
                value={newItemRate === 0 ? '' : newItemRate}
                onChange={(e) => setNewItemRate(Number(e.target.value))}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none"
              />
            </div>
            <div className="sm:col-span-1">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white w-full h-full p-2 rounded-md flex items-center justify-center cursor-pointer border-none"
                title="Add item row"
              >
                <Plus size={16} />
              </button>
            </div>
          </form>

          {/* Current list */}
          <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
            {billableItems.map((item) => {
              const isEditing = editingItemId === item.id;
              if (isEditing) {
                return (
                  <div key={item.id} className="p-3 bg-slate-50 border-b border-slate-100 space-y-2 text-xs">
                    <span className="font-bold text-[10px] text-blue-600 uppercase tracking-widest block">Editing Invoice Item</span>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-left">
                      <div className="sm:col-span-6">
                        <input
                          type="text"
                          value={editingDesc}
                          onChange={(e) => setEditingDesc(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md focus:outline-none"
                          placeholder="Description"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={editingQty}
                          onChange={(e) => setEditingQty(Number(e.target.value))}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md focus:outline-none text-center"
                          placeholder="Qty"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="number"
                          placeholder="Rate"
                          value={editingRate === 0 ? '' : editingRate}
                          onChange={(e) => setEditingRate(Number(e.target.value))}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-1 flex gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => saveEditing(item.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white w-full p-2 rounded-md flex items-center justify-center cursor-pointer border-none"
                          title="Save change"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="bg-slate-400 hover:bg-slate-500 text-white w-full p-2 rounded-md flex items-center justify-center cursor-pointer border-none"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.id} className="p-3 flex justify-between items-center text-xs group hover:bg-slate-50/50 transition">
                  <div className="text-left flex-1 min-w-0 pr-3">
                    <span className="font-semibold text-slate-800 block truncate" title={item.description}>
                      {item.description}
                    </span>
                    <span className="text-slate-400 mt-0.5 block font-mono">
                      {item.qty} unit(s) x {formatCurrency(item.rate)} / unit
                    </span>
                  </div>
                  <div className="flex items-center gap-3.5 shrink-0">
                    <span className="font-bold text-slate-800">{formatCurrency(item.qty * item.rate)}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startEditing(item)}
                        className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition cursor-pointer border-none bg-transparent"
                        title="Edit Item"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition cursor-pointer border-none bg-transparent"
                        title="Delete Item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Configurations Sidepanel */}
        <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 text-left">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Invoice Setup
          </h4>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Invoice Ref #</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Invoice Document Type</label>
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setInvoiceType('tax')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer border-none ${
                    invoiceType === 'tax' ? 'bg-white shadow-xs text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-700 bg-transparent'
                  }`}
                >
                  Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceType('proforma')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer border-none ${
                    invoiceType === 'proforma' ? 'bg-white shadow-xs text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-700 bg-transparent'
                  }`}
                >
                  Proforma Invoice
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">SGST (%)</label>
                <input
                  type="number"
                  value={sgstRate}
                  onChange={(e) => setSgstRate(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none text-xs font-semibold font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">CGST (%)</label>
                <input
                  type="number"
                  value={cgstRate}
                  onChange={(e) => setCgstRate(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none text-xs font-semibold font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Payment Terms</label>
              <input
                type="text"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="w-full bg-blue-50 hover:bg-blue-100 text-[#00509e] font-extrabold text-xs py-2 rounded-xl border border-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Eye size={14} />
              Preview invoice
            </button>
          </div>
        </div>
      </div>

      {/* Invoice preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#003366]/75 p-3 backdrop-blur-sm md:p-6 print:static print:bg-transparent print:p-0">
          <div className="mx-auto max-w-6xl">
            <div className="sticky top-0 z-10 mb-4 rounded-xl border border-[#cce0ff] bg-white shadow-xl print:hidden">
              <div className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between md:px-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-extrabold text-[#003366]">Invoice preview</h3>
                  <p className="truncate text-xs font-semibold text-slate-500">{project.name} - {invoiceNumber}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={triggerPrint}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00509e] px-3.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#003366] cursor-pointer"
                  >
                    <Printer size={15} />
                    Print / Save PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cce0ff] bg-[#eef6ff] px-3.5 text-xs font-extrabold text-[#00509e] transition hover:bg-[#cce0ff] cursor-pointer"
                  >
                    <MessageSquare size={15} />
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cce0ff] bg-white px-3.5 text-xs font-extrabold text-[#00509e] transition hover:bg-[#eef6ff] cursor-pointer"
                  >
                    <Send size={15} />
                    Mail
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                    aria-label="Close invoice preview"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>
            </div>

        <div className="space-y-3">
          {/* Email confirmation toast notification */}
          {sentStatus && (
            <div className="bg-emerald-50 border border-emerald-250 px-4 py-3 rounded-xl text-emerald-800 text-xs text-left font-bold flex items-center gap-2.5 print:hidden animate-in fade-in duration-200 shadow-2xs">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Invoice queued for <b>{project.clientName}</b>.</span>
            </div>
          )}

          {/* WhatsApp confirmation toast notification */}
          {whatsappStatus && (
            <div className="bg-emerald-50 border border-emerald-250 px-4 py-3 rounded-xl text-emerald-800 text-xs text-left font-bold flex items-center gap-2.5 print:hidden animate-in fade-in duration-200 shadow-2xs">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>
                WhatsApp summary copied and ready to send.
              </span>
            </div>
          )}

          <div className="bg-white border border-[#cce0ff] rounded-xl p-6 md:p-8 relative space-y-6 mx-auto max-w-4xl shadow-2xl print-target" id="invoice-print-sheet">
            {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b pb-6 text-left">
            <Logo layout="row" size="sm" showSubtitle={true} />
            <div className="text-right sm:text-right text-xs">
              <h2 className="text-xl font-black text-[#003366] uppercase tracking-wide">
                {invoiceType === 'tax' ? 'Tax Invoice' : 'Proforma Invoice'}
              </h2>
              <span className="text-slate-400 block mt-1">Ref #: {invoiceNumber}</span>
              <span className="text-slate-400 block">Date Generated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Double Address Blocks */}
          {(() => {
            const firmName = getSetting('cc_company_name') || 'Your company';
            const firmAddress = getSetting('cc_company_address') || '';
            const firmGstNum = getSetting('cc_company_gst') || '';
            const firmEmail = getSetting('cc_company_email') || '';
            const firmPhone = getSetting('cc_company_phone') || '';
            const firmContact = [firmEmail, firmPhone].filter(Boolean).join(' | ');

            // Find matching client GST from Directory Contacts
            const clientContact = contacts.find(
              (c) => c.role === 'client' && c.name.trim().toLowerCase() === project.clientName.trim().toLowerCase()
            );
            const clientGstNum = clientContact?.gstNumber;
            const clientAddress = clientContact?.address || project.address;

            return (
              <div className="grid grid-cols-2 gap-4 text-xs text-left">
                <div>
                  <span className="text-blue-600 font-bold uppercase tracking-wider block mb-1">Contractor Details</span>
                  <span className="font-extrabold text-slate-800 block">{firmName}</span>
                  {firmAddress && <span className="text-slate-400 block mt-0.5 whitespace-pre-wrap">{firmAddress}</span>}
                  {firmContact && <span className="text-blue-600 font-semibold block mt-1">{firmContact}</span>}
                  {firmGstNum && (
                    <span className="text-slate-700 font-mono text-[10px] font-bold block mt-1.5 bg-slate-100/70 border border-slate-200 px-2 py-0.5 rounded-md w-max">
                      GSTIN: {firmGstNum}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[#00509e] font-bold uppercase tracking-wider block mb-1">Bill To Client</span>
                  <span className="font-extrabold text-slate-800 block">{project.clientName}</span>
                  {clientAddress && (
                    <span className="text-slate-400 block mt-0.5 whitespace-pre-wrap">{clientAddress}</span>
                  )}
                  <span className="text-slate-400 block mt-0.5">Active Site Profile: {project.name}</span>
                  {clientGstNum ? (
                    <span className="text-blue-600 font-mono text-[10px] font-bold block mt-1.5 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md w-max uppercase">
                      GSTIN: {clientGstNum}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-mono text-[9px] block mt-1.5 italic">
                      No matching client GSTIN
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Table list */}
          <div className="text-xs">
            <div className="grid grid-cols-12 bg-slate-100 p-2 font-bold text-slate-700 text-left">
              <div className="col-span-8">Product / Service</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-1 text-right">Rate</div>
              <div className="col-span-2 text-right">Sum</div>
            </div>

            <div className="divide-y divide-slate-150">
              {billableItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 p-2.5 text-left text-slate-600">
                  <div className="col-span-8 font-semibold text-slate-800">{item.description}</div>
                  <div className="col-span-1 text-center">{item.qty}</div>
                  <div className="col-span-1 text-right">{formatCurrency(item.rate)}</div>
                  <div className="col-span-2 text-right font-bold">{formatCurrency(item.qty * item.rate)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Totals Breakdown in Sidebar style */}
          <div className="flex justify-end pt-4">
            <div className="w-full sm:w-80 text-xs space-y-2 border-t pt-4">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">{formatCurrency(totalInvoiced)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST ({sgstRate}%)</span>
                <span className="font-semibold text-slate-800 font-mono">{formatCurrency(sgstAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CGST ({cgstRate}%)</span>
                <span className="font-semibold text-slate-800 font-mono">{formatCurrency(cgstAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-800 pt-1 border-t">
                <span>Total</span>
                <span>{formatCurrency(totalWithTax)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 text-[11px] font-bold">
                <span>Less: Receipts</span>
                <span>-{formatCurrency(totalInflowsMatched)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-rose-600 bg-rose-50/80 p-2.5 rounded-lg border border-rose-100">
                <span>Balance Due</span>
                <span>{formatCurrency(outstandingBalanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Footer details including bank remittance credentials */}
          {(() => {
            const bankAccName = getSetting('cc_bank_account_name') || '';
            const bankName = getSetting('cc_bank_name') || '';
            const bankAccNo = getSetting('cc_bank_account_number') || '';
            const bankAccType = getSetting('cc_bank_account_type') || '';
            const bankIfsc = getSetting('cc_bank_ifsc') || '';
            const hasBankDetails = Boolean(bankAccName || bankName || bankAccNo || bankAccType || bankIfsc);

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left border-t pt-4">
                <div className="bg-slate-50/75 p-4 rounded-xl border border-slate-150 text-[11px] leading-relaxed">
                  <span className="font-bold text-blue-600 uppercase tracking-wider block mb-1.5 text-[9px]">Bank Details</span>
                  {hasBankDetails ? (
                    <div className="grid grid-cols-3 gap-y-1 text-slate-600 font-medium">
                      {bankAccName && (
                        <>
                          <span className="text-slate-400 uppercase text-[8px] font-bold">Holder Name:</span>
                          <span className="col-span-2 text-slate-800 font-bold">{bankAccName}</span>
                        </>
                      )}
                      {bankName && (
                        <>
                          <span className="text-slate-400 uppercase text-[8px] font-bold">Bank Name:</span>
                          <span className="col-span-2 text-slate-800 font-semibold">{bankName}</span>
                        </>
                      )}
                      {bankAccNo && (
                        <>
                          <span className="text-slate-400 uppercase text-[8px] font-bold">Account No:</span>
                          <span className="col-span-2 text-slate-800 font-mono font-bold tracking-wide">{bankAccNo}</span>
                        </>
                      )}
                      {bankAccType && (
                        <>
                          <span className="text-slate-400 uppercase text-[8px] font-bold">Account Type:</span>
                          <span className="col-span-2 text-slate-800 font-semibold">{bankAccType}</span>
                        </>
                      )}
                      {bankIfsc && (
                        <>
                          <span className="text-slate-400 uppercase text-[8px] font-bold">IFSC Code:</span>
                          <span className="col-span-2 text-slate-800 font-mono font-extrabold text-blue-600 uppercase">{bankIfsc}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">Add bank details in Settings.</span>
                  )}
                </div>

                <div className="bg-slate-50/75 p-4 rounded-xl border border-slate-100 text-[10px] text-slate-400 leading-relaxed flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-[#00509e] uppercase tracking-wider block mb-1.5">Invoice Terms &amp; Instructions</span>
                    <p>{terms}</p>
                  </div>

                  {/* Stamp & Authorized Signature block */}
                  {(() => {
                    let stamp = getSetting('custom_stamp_base64');
                    if (!stamp) {
                      stamp = getSetting('custom_stamp_sign_base64');
                    }
                    const signature = getSetting('custom_sign_base64');
                    const firmName = getSetting('cc_company_name') || 'Your company';
                    return (
                      <div className="flex flex-col items-end mt-4 pt-4 border-t border-slate-200/50">
                        <div className="text-right space-y-1">
                          <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider block">
                            For {firmName}
                          </span>
                          <div className="flex gap-2 justify-end my-1.5">
                            {/* Rubber Stamp Box */}
                            {stamp ? (
                              <div className="relative border border-dashed border-slate-200 p-1 rounded bg-white w-24 h-14 flex justify-center items-center overflow-hidden" title="Company Rubber Stamp">
                                <img
                                  src={stamp}
                                  alt="Stamp"
                                  className="max-h-full max-w-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute top-0.5 right-0.5 bg-blue-50 text-blue-650 border border-blue-200 rounded text-[5px] px-0.5 scale-75 uppercase tracking-widest font-extrabold select-none">
                                  Stamp
                                </div>
                              </div>
                            ) : (
                              <div className="border border-dashed border-slate-200 rounded w-24 h-14 flex flex-col justify-center items-center text-center text-[7px] text-slate-350 italic bg-white/50">
                                <span>No Stamp</span>
                              </div>
                            )}

                            {/* Authorized Sign Box */}
                            {signature ? (
                              <div className="relative border border-dashed border-slate-200 p-1 rounded bg-white w-24 h-14 flex justify-center items-center overflow-hidden" title="Authorized Signature">
                                <img
                                  src={signature}
                                  alt="Signature"
                                  className="max-h-full max-w-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute top-0.5 right-0.5 bg-emerald-50 text-emerald-650 border border-emerald-200 rounded text-[5px] px-0.5 scale-75 uppercase tracking-widest font-extrabold select-none">
                                  Signed
                                </div>
                              </div>
                            ) : (
                              <div className="border border-dashed border-slate-200 rounded w-24 h-14 flex flex-col justify-center items-center text-center text-[7px] text-slate-350 italic bg-white/50">
                                <span>No Signature</span>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-slate-300 w-50 pt-1 text-right">
                            <span className="text-[9px] font-bold text-slate-705 block">Authorized Signatory</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <p className="mt-2 text-[9px] text-[#8fa0b5] italic">
                    Generated from the workspace invoice ledger.
                  </p>
                </div>
              </div>
            );
          })()}
          </div>
        </div>
          </div>
        </div>
      )}
    </div>
  );
}
