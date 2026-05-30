import React, { useState } from 'react';
import { Contact, ContactRole, Payment, Project } from '../types';
import { formatDate } from '../lib/formatter';
import { Plus, User, Phone, Mail, Building2, UserCheck, Trash2, ShieldCheck, Tag, Receipt, ArrowUpRight } from 'lucide-react';

interface ContactManagerProps {
  contacts: Contact[];
  onAddContact: (name: string, role: ContactRole, phone: string, email: string, company: string, gstNumber?: string, address?: string) => void;
  onDeleteContact?: (contactId: string) => void;
  payments?: Payment[];
  projects?: Project[];
}

export default function ContactManager({
  contacts,
  onAddContact,
  onDeleteContact,
  payments = [],
  projects = [],
}: ContactManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<ContactRole>('client');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedContactForLedger, setSelectedContactForLedger] = useState<Contact | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddContact(name, role, phone, email, company, gstNumber.trim() || undefined, address.trim() || undefined);
    setName('');
    setPhone('');
    setEmail('');
    setCompany('');
    setGstNumber('');
    setAddress('');
    setShowAddForm(false);
  };

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.phone.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (roleFilter === 'all') return matchesSearch;
    return matchesSearch && c.role === roleFilter;
  });

  return (
    <div className="space-y-4" id="contacts-management-tab">
      {/* Search and Quick Trigger row */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="flex gap-2 flex-grow">
          <input
            type="text"
            placeholder="Search directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="client">Clients</option>
            <option value="vendor">Vendors</option>
            <option value="supplier">Suppliers</option>
          </select>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-xs"
        >
          <Plus size={14} /> Add Partner
        </button>
      </div>

      {/* Inline Quick Add Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3 animate-in slide-in-from-top-3 duration-150 text-left">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1">
            <UserCheck size={14} className="text-blue-600" /> Register Directory Contact
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Directory Classification</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ContactRole)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
              >
                <option value="client">Client (Owner Paying Retainers)</option>
                <option value="vendor">Vendor (Installer / Contractor)</option>
                <option value="supplier">Material Supplier (Stone, Wood, Tile)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">E-mail Address</label>
              <input
                type="email"
                placeholder="johndoe@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company / Suffix</label>
              <input
                type="text"
                placeholder="e.g. Acme Tile Inc"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GST Number</label>
              <input
                type="text"
                placeholder="e.g. 27AAECC4524C1Z9"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase font-mono font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Business Address</label>
              <input
                type="text"
                placeholder="e.g. 102 Park Ave, Pune"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-400 font-semibold hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg cursor-pointer border-none"
            >
              Add to Directory
            </button>
          </div>
        </form>
      )}

      {/* Directory Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
        {filteredContacts.map((c) => {
          let badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
          let roleTitle = 'Client (Owner)';
          if (c.role === 'vendor') {
            badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
            roleTitle = 'Vendor Sub-Contractor';
          } else if (c.role === 'supplier') {
            badgeColor = 'bg-slate-200 text-slate-650 border-slate-305';
            roleTitle = 'Material Supplier';
          }

          const partyPaymentsCount = payments.filter(
            (p) => p.party.trim().toLowerCase() === c.name.trim().toLowerCase()
          ).length;

          return (
            <div
              key={c.id}
              onClick={() => setSelectedContactForLedger(c)}
              className="bg-white p-4 rounded-xl border border-slate-150 hover:border-blue-300 transition-all duration-150 flex flex-col justify-between space-y-3 cursor-pointer shadow-xs hover:shadow-xs group"
            >
              <div>
                <div className="flex justify-between items-start gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                    <User size={15} className="text-blue-600" />
                    <span>{c.name}</span>
                  </div>
                  <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                    {roleTitle}
                  </span>
                </div>

                <div className="mt-2.5 space-y-1.5 text-xs text-slate-500">
                  {c.company && (
                    <div className="flex items-center gap-2">
                      <Building2 size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{c.company}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.gstNumber && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[8px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded leading-none shrink-0 font-mono">GST</span>
                      <span className="truncate font-mono font-bold text-slate-600 tracking-tight text-[10.5px] leading-none">{c.gstNumber}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-extrabold text-slate-500 bg-slate-50 border border-slate-150 px-1 py-0.5 rounded leading-none shrink-0 font-mono">ADR</span>
                      <span className="truncate text-slate-600 text-[11px] leading-none" title={c.address}>{c.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action items */}
              <div className="border-t border-slate-1-0 pt-2 flex justify-between items-center text-[10px]">
                <span className="font-semibold text-slate-400 flex items-center gap-1">
                  <Receipt size={11} className="text-slate-400" />
                  <span className="group-hover:text-blue-600 font-bold transition-colors">
                    {partyPaymentsCount} Transaction{partyPaymentsCount !== 1 ? 's' : ''}
                  </span>
                </span>
                {onDeleteContact && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteContact(c.id);
                    }}
                    className="text-slate-350 hover:text-rose-600 transition p-1 hover:bg-slate-50 rounded cursor-pointer border-none bg-transparent"
                    title="Remove contact"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Party Ledger Popup Modal */}
      {selectedContactForLedger && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100"
          onClick={() => setSelectedContactForLedger(null)}
          id="party-ledger-modal-backdrop"
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-150 overflow-hidden transform transition-all duration-150 scale-100 p-6 text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
            id="party-ledger-modal"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wide flex items-center gap-2">
                  <User size={18} className="text-blue-600" /> {selectedContactForLedger.name} Transactions Ledger
                </h3>
                <div className="flex flex-col gap-0.5 mt-1">
                  <span className="text-[11px] text-slate-450 capitalize block font-semibold">
                    {selectedContactForLedger.company ? `${selectedContactForLedger.company} • ` : ''}{selectedContactForLedger.role} account profile
                  </span>
                  {(selectedContactForLedger.gstNumber || selectedContactForLedger.address) && (
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[9.5px]">
                      {selectedContactForLedger.gstNumber && (
                        <span className="font-mono text-blue-600 bg-blue-50/60 border border-blue-100 px-1.5 py-0.5 rounded font-bold uppercase">
                          GSTIN: {selectedContactForLedger.gstNumber}
                        </span>
                      )}
                      {selectedContactForLedger.address && (
                        <span className="text-slate-500 bg-slate-50 border border-slate-150 px-1.5 py-0.5 rounded font-medium max-w-sm truncate" title={selectedContactForLedger.address}>
                          📍 {selectedContactForLedger.address}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedContactForLedger(null)}
                className="text-slate-400 hover:text-slate-650 font-bold text-sm cursor-pointer border-none bg-transparent"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            {(() => {
              const partyPayments = (payments || []).filter(
                (p) => p.party.trim().toLowerCase() === selectedContactForLedger.name.trim().toLowerCase()
              );

              const totalIn = partyPayments
                .filter((p) => p.type === 'in')
                .reduce((sum, p) => sum + p.amount, 0);

              const totalOut = partyPayments
                .filter((p) => p.type === 'out')
                .reduce((sum, p) => sum + p.amount, 0);

              const balance = totalIn - totalOut;

              return (
                <div className="space-y-4">
                  {/* Financial Mini Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl text-left">
                      <span className="text-[9px] uppercase font-bold text-emerald-700 font-mono tracking-wider">Deposited (Credit)</span>
                      <span className="text-base font-black text-emerald-600 block mt-0.5">₹{totalIn.toLocaleString()}</span>
                    </div>
                    <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-xl text-left">
                      <span className="text-[9px] uppercase font-bold text-rose-700 font-mono tracking-wider">Withdrawn (Debit)</span>
                      <span className="text-base font-black text-rose-500 block mt-0.5">₹{totalOut.toLocaleString()}</span>
                    </div>
                    <div className={`${balance >= 0 ? 'bg-blue-50/50 border-blue-100 text-blue-700' : 'bg-rose-50/50 border-rose-100 text-rose-700'} border p-3 rounded-xl text-left`}>
                      <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">Relative Standing</span>
                      <span className="text-base font-black block mt-0.5">
                        {balance >= 0 ? '+' : ''}₹{balance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Payments Table */}
                  <div className="max-h-[280px] overflow-y-auto border border-slate-150 rounded-xl">
                    {partyPayments.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        <Receipt className="mx-auto text-slate-350 mb-2 animate-pulse" size={28} />
                        <p className="text-xs font-semibold text-slate-600">No recorded cash items match this partner</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Financial items that reference this party will list here dynamically</p>
                      </div>
                    ) : (
                      <table className="w-full text-xs divide-y divide-slate-150 text-left border-collapse table-auto">
                        <thead className="bg-slate-50 font-bold uppercase tracking-wider text-[9px] text-slate-500 sticky top-0 border-b border-slate-100">
                          <tr>
                            <th className="px-3 py-2.5">Date</th>
                            <th className="px-3 py-2.5">Associated Project</th>
                            <th className="px-3 py-2.5">Remark / Description</th>
                            <th className="px-3 py-2.5 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white text-slate-650">
                          {partyPayments.map((p) => {
                            const proj = (projects || []).find((pr) => pr.id === p.projectId);
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">{formatDate(p.date)}</td>
                                <td className="px-3 py-2.5 text-slate-700 truncate max-w-[140px] font-semibold">
                                  {proj ? proj.name : 'Unknown Project'}
                                </td>
                                <td className="px-3 py-2.5 text-slate-550 max-w-[180px] truncate">{p.remark || 'N/A'}</td>
                                <td className={`px-3 py-2.5 text-right font-black font-mono whitespace-nowrap ${p.type === 'in' ? 'text-emerald-700' : 'text-rose-600'}`}>
                                  {p.type === 'in' ? '+' : '-'}₹{p.amount.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedContactForLedger(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-550 font-extrabold text-xs rounded-xl cursor-pointer border-none"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
