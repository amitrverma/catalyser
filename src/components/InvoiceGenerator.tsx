import React, { useState } from 'react';
import { Project, Payment, Contact } from '../types';
import Logo from './Logo';
import { Printer, Mail, Send, CheckCircle2, CircleDollarSign, Plus, Trash2, Edit, Check, X, Eye, MessageSquare, Share2 } from 'lucide-react';

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
  const [billableItems, setBillableItems] = useState<BillableItem[]>([
    { id: 'item-1', description: 'Architectural Design Consultation & Blueprint Drafting', qty: 1, rate: 4500 },
    { id: 'item-2', description: 'Concrete Slab Foundation Construction & Framing Check', qty: 1, rate: 12500 },
    { id: 'item-3', description: 'Interior Custom Wooden Cabinetry Fabrication & Fitting', qty: 1, rate: 8200 },
  ]);

  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemRate, setNewItemRate] = useState(0);

  const [invoiceType, setInvoiceType] = useState<'proforma' | 'tax'>('tax');
  const [sgstRate, setSgstRate] = useState<number>(9); // SGST 9%
  const [cgstRate, setCgstRate] = useState<number>(9); // CGST 9%
  const [terms, setTerms] = useState('Payment is due within 15 days of invoice date.');
  const [invoiceNumber, setInvoiceNumber] = useState(`CC-2026-${project.id.split('-')[1] || '01'}`);
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
    const firmName = localStorage.getItem('cc_company_name') || 'Catalyser Design';
    const totalDue = totalWithTax.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const balanceDue = outstandingBalanceDue.toLocaleString(undefined, { maximumFractionDigits: 2 });
    
    const text = `*Invoice Reference:* ${invoiceNumber}
*From:* ${firmName}
*Job Site/Project:* ${project.name}
*Client:* ${project.clientName}

Hello! Please find the summary of our invoice details below:
- *Document Type:* ${invoiceType === 'tax' ? 'Tax Invoice' : 'Proforma Invoice'}
- *Total Billable:* ₹${totalDue}
- *Deposits Received:* ₹${totalInflowsMatched.toLocaleString()}
- *Outstanding Balance Due:* ₹${balanceDue}

Thank you for your business. Please let us know if you need any adjustments or bank remittance support!`;

    // Try fallback secure write to clipboard
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
                placeholder="Rate (₹)"
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
                      {item.qty} Unit(s) × ₹{item.rate.toLocaleString()} / Unit
                    </span>
                  </div>
                  <div className="flex items-center gap-3.5 shrink-0">
                    <span className="font-bold text-slate-800">₹{(item.qty * item.rate).toLocaleString()}</span>
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
              onClick={() => setShowPreview(!showPreview)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-[#456276] font-extrabold text-xs py-2 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Eye size={14} />
              {showPreview ? 'Hide Invoice Print Sheet' : 'Draft Invoicing Preview'}
            </button>
          </div>
        </div>
      </div>

      {/* Actual High-Fidelity Print Sheet preview */}
      {showPreview && (
        <div className="space-y-5">
          {/* Responsive action utility hub (disabled under printing automatically) */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-left flex flex-col gap-4 print:hidden shadow-xs">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-blue-400 tracking-widest font-mono block">Invoicing Utilities Workspace</span>
                <h4 className="text-sm font-black text-white">Interactive Document Hub</h4>
                <p className="text-[11px] text-slate-400 max-w-lg leading-relaxed">
                  Export high-fidelity statement PDFs, dispatch client soft-copy emails, or coordinate billing balances directly over WhatsApp.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={triggerPrint}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition border-none"
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
                
                <button
                  onClick={handleShareWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-550 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition border-none"
                >
                  <MessageSquare size={14} /> WhatsApp Share
                </button>
                
                <button
                  onClick={handleSendEmail}
                  className="bg-[#456276] hover:bg-slate-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition border-none"
                >
                  <Send size={14} /> Mail to Client
                </button>
              </div>
            </div>

            {/* Sandbox iframe warning label */}
            <div className="pt-3.5 border-t border-slate-800 text-[10.5px] text-amber-200/90 font-medium flex gap-2 items-start leading-relaxed">
              <span className="text-xs shrink-0">💡</span>
              <p>
                <b>Print Sandbox Notice:</b> Due to secure iframe browser rules inside development previews, standard printing functions may draw browser warning blocks.
                If clicking <b>"Print / Save PDF"</b> does not open your printer dialog, click the <b>"Open in New Tab"</b> button at the top-right of the window to print or export as native PDF!
              </p>
            </div>
          </div>

          {/* Email confirmation toast notification */}
          {sentStatus && (
            <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl text-emerald-800 text-xs text-left font-bold flex items-center gap-2.5 print:hidden animate-in fade-in duration-200 shadow-2xs">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Invoice document successfully compiled &amp; scheduled to client: <b>{project.clientName}</b>.</span>
            </div>
          )}

          {/* WhatsApp confirmation toast notification */}
          {whatsappStatus && (
            <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl text-emerald-800 text-xs text-left font-bold flex items-center gap-2.5 print:hidden animate-in fade-in duration-200 shadow-2xs">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>
                <b>WhatsApp Chat Dispatched!</b> A clean text summary statement has also been copied to your clipboard. You can paste (Ctrl+V) directly if browser popups prevent the chat redirect.
              </span>
            </div>
          )}

          <div className="bg-white border rounded-2xl p-8 relative space-y-6 mx-auto max-w-4xl print-target" id="invoice-print-sheet">
            {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b pb-6 text-left">
            <Logo layout="row" size="sm" showSubtitle={true} />
            <div className="text-right sm:text-right text-xs">
              <h2 className="text-xl font-black text-[#456276] uppercase tracking-wide">
                {invoiceType === 'tax' ? 'Tax Invoice' : 'Proforma Invoice'}
              </h2>
              <span className="text-slate-400 block mt-1">Ref #: {invoiceNumber}</span>
              <span className="text-slate-400 block">Date Generated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Double Address Blocks */}
          {(() => {
            const firmName = localStorage.getItem('cc_company_name') || 'Catalyser Design';
            const firmAddress = localStorage.getItem('cc_company_address') || 'Unit number 809, 99 Avenue, Lullanagar, Pune - 411040';
            const firmGstNum = localStorage.getItem('cc_company_gst') || '27AAECC4524C1Z9';
            const firmEmail = localStorage.getItem('cc_company_email') || 'contact@catalyserdesign.com';
            const firmPhone = localStorage.getItem('cc_company_phone') || '+91 98765 43210';

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
                  <span className="text-slate-400 block mt-0.5 whitespace-pre-wrap">{firmAddress}</span>
                  <span className="text-blue-600 font-semibold block mt-1">{firmEmail} • {firmPhone}</span>
                  <span className="text-slate-700 font-mono text-[10px] font-bold block mt-1.5 bg-slate-100/70 border border-slate-200 px-2 py-0.5 rounded-md w-max">
                    GSTIN: {firmGstNum}
                  </span>
                </div>
                <div>
                  <span className="text-[#456276] font-bold uppercase tracking-wider block mb-1">Bill To Client</span>
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
                      No matching client GST in Directory
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Table list */}
          <div className="text-xs">
            <div className="grid grid-cols-12 bg-slate-100 p-2 font-bold text-slate-700 text-left">
              <div className="col-span-8">Product / Service Specification</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-1 text-right">Rate</div>
              <div className="col-span-2 text-right">Sum</div>
            </div>

            <div className="divide-y divide-slate-150">
              {billableItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 p-2.5 text-left text-slate-600">
                  <div className="col-span-8 font-semibold text-slate-800">{item.description}</div>
                  <div className="col-span-1 text-center">{item.qty}</div>
                  <div className="col-span-1 text-right">₹{item.rate.toLocaleString()}</div>
                  <div className="col-span-2 text-right font-bold">₹{(item.qty * item.rate).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Totals Breakdown in Sidebar style */}
          <div className="flex justify-end pt-4">
            <div className="w-full sm:w-80 text-xs space-y-2 border-t pt-4">
              <div className="flex justify-between text-slate-600">
                <span>Gross Direct Base Invoiced</span>
                <span className="font-semibold text-slate-800">₹{totalInvoiced.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST ({sgstRate}%)</span>
                <span className="font-semibold text-slate-800 font-mono">₹{sgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CGST ({cgstRate}%)</span>
                <span className="font-semibold text-slate-800 font-mono">₹{cgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-800 pt-1 border-t">
                <span>Total billable due</span>
                <span>₹{totalWithTax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-emerald-600 text-[11px] font-bold">
                <span>Less: Client Deposits Received (-Inflow)</span>
                <span>-₹{totalInflowsMatched.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-rose-600 bg-rose-50/80 p-2.5 rounded-lg border border-rose-100">
                <span>Outstanding Balance Due</span>
                <span>₹{outstandingBalanceDue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Footer details including bank remittance credentials */}
          {(() => {
            const bankAccName = localStorage.getItem('cc_bank_account_name') || 'Catalyser Design';
            const bankName = localStorage.getItem('cc_bank_name') || 'HDFC Bank Ltd';
            const bankAccNo = localStorage.getItem('cc_bank_account_number') || '50200012345678';
            const bankAccType = localStorage.getItem('cc_bank_account_type') || 'Current';
            const bankIfsc = localStorage.getItem('cc_bank_ifsc') || 'HDFC0001234';

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left border-t pt-4">
                <div className="bg-slate-50/75 p-4 rounded-xl border border-slate-150 text-[11px] leading-relaxed">
                  <span className="font-bold text-blue-600 uppercase tracking-wider block mb-1.5 text-[9px]">Bank Remittance Coordinates</span>
                  <div className="grid grid-cols-3 gap-y-1 text-slate-600 font-medium">
                    <span className="text-slate-400 uppercase text-[8px] font-bold">Holder Name:</span>
                    <span className="col-span-2 text-slate-800 font-bold">{bankAccName}</span>
                    
                    <span className="text-slate-400 uppercase text-[8px] font-bold">Bank Name:</span>
                    <span className="col-span-2 text-slate-800 font-semibold">{bankName}</span>
                    
                    <span className="text-slate-400 uppercase text-[8px] font-bold">Account Num:</span>
                    <span className="col-span-2 text-slate-800 font-mono font-bold tracking-wide">{bankAccNo}</span>
                    
                    <span className="text-slate-400 uppercase text-[8px] font-bold">Account Type:</span>
                    <span className="col-span-2 text-slate-800 font-semibold">{bankAccType}</span>
                    
                    <span className="text-slate-400 uppercase text-[8px] font-bold">IFSC Code:</span>
                    <span className="col-span-2 text-slate-800 font-mono font-extrabold text-blue-600 uppercase">{bankIfsc}</span>
                  </div>
                </div>

                <div className="bg-slate-50/75 p-4 rounded-xl border border-slate-100 text-[10px] text-slate-400 leading-relaxed flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-[#456276] uppercase tracking-wider block mb-1.5">Invoice Terms &amp; Instructions</span>
                    <p>{terms}</p>
                  </div>

                  {/* Stamp & Authorized Signature block */}
                  {(() => {
                    let stamp = localStorage.getItem('custom_stamp_base64');
                    if (!stamp) {
                      stamp = localStorage.getItem('custom_stamp_sign_base64');
                    }
                    const signature = localStorage.getItem('custom_sign_base64');
                    const firmName = localStorage.getItem('cc_company_name') || 'Catalyser Design';
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
                    Secure digital backup document. Thank you for your partnership.
                  </p>
                </div>
              </div>
            );
          })()}
          </div>
        </div>
      )}
    </div>
  );
}
