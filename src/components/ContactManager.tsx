import React, { useState } from 'react';
import { Contact, ContactRole, Payment, Project } from '../types';
import { readContactImportFile } from '../lib/contactImport';
import { formatCurrency, formatDate } from '../lib/formatter';
import { CONTACT_ROLE_OPTIONS, getContactRoleConfig } from '../lib/roleLabels';
import { Plus, User, Phone, Mail, Building2, UserCheck, Receipt, UserPlus, Edit2, Check, X, Upload } from 'lucide-react';

type ContactInput = {
  name: string;
  role: ContactRole;
  phone: string;
  email: string;
  company: string;
  gstNumber?: string;
  address?: string;
};

type ContactUpdate = ContactInput;

type PickedContact = {
  name?: string[];
  email?: string[];
  tel?: string[];
};

type NavigatorWithContacts = Navigator & {
  contacts?: {
    select: (properties: Array<'name' | 'email' | 'tel'>, options?: { multiple?: boolean }) => Promise<PickedContact[]>;
  };
};

interface ContactManagerProps {
  contacts: Contact[];
  onAddContact: (name: string, role: ContactRole, phone: string, email: string, company: string, gstNumber?: string, address?: string) => void;
  onAddContacts?: (contacts: ContactInput[]) => Promise<boolean> | boolean | void;
  onUpdateContact?: (contactId: string, contact: ContactUpdate) => Promise<boolean> | boolean | void;
  onUpdateContactRole?: (contactId: string, role: ContactRole) => void;
  onDeleteContact?: (contactId: string) => void;
  payments?: Payment[];
  projects?: Project[];
}

export default function ContactManager({
  contacts,
  onAddContact,
  onAddContacts,
  onUpdateContact,
  onUpdateContactRole,
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
  const [selectedContactId, setSelectedContactId] = useState<string | null>(contacts[0]?.id || null);
  const [selectedContactForLedger, setSelectedContactForLedger] = useState<Contact | null>(null);
  const [importStatus, setImportStatus] = useState('');
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContact, setEditContact] = useState<ContactUpdate>({
    name: '',
    role: 'other',
    phone: '',
    email: '',
    company: '',
    gstNumber: '',
    address: '',
  });

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

  const handleImportFromDeviceContacts = async () => {
    setImportStatus('');
    const contactsApi = (navigator as NavigatorWithContacts).contacts;
    if (!contactsApi?.select) {
      setImportStatus('Mobile contact import is only available in supported secure mobile browsers.');
      return;
    }

    try {
      const pickedContacts = await contactsApi.select(['name', 'email', 'tel'], { multiple: true });
      const importedContacts: ContactInput[] = pickedContacts
        .map((pickedContact) => {
          const importedName =
            pickedContact.name?.[0]?.trim() ||
            pickedContact.tel?.[0]?.trim() ||
            pickedContact.email?.[0]?.trim() ||
            '';
          return {
            name: importedName,
            role: 'other' as ContactRole,
            phone: pickedContact.tel?.[0]?.trim() || '',
            email: pickedContact.email?.[0]?.trim() || '',
            company: '',
          };
        })
        .filter((contact) => contact.name);

      if (importedContacts.length === 0) {
        setImportStatus('No contacts were selected.');
        return;
      }

      setImportStatus(`Saving ${importedContacts.length} imported contact${importedContacts.length !== 1 ? 's' : ''}...`);

      if (onAddContacts) {
        const saved = await onAddContacts(importedContacts);
        if (saved === false) {
          setImportStatus('Imported locally, but cloud sync failed. Please stay signed in and try again.');
          return;
        }
      } else {
        importedContacts.forEach((contact) => {
          onAddContact(contact.name, contact.role, contact.phone, contact.email, contact.company);
        });
      }
      setImportStatus(`Imported ${importedContacts.length} contact${importedContacts.length !== 1 ? 's' : ''}.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setImportStatus('Contact import cancelled.');
        return;
      }
      setImportStatus('Unable to import contacts from this browser.');
    }
  };

  const handleImportFromFile = async (file: File | undefined) => {
    if (!file) return;
    setImportStatus('Reading contact file...');

    try {
      const importedContacts = await readContactImportFile(file, 'other');
      const newContacts = importedContacts.filter((contact) => {
        const normalizedName = contact.name.trim().toLowerCase();
        return !contacts.some((existing) => {
          const sameName = existing.name.trim().toLowerCase() === normalizedName;
          const samePhone = contact.phone && existing.phone === contact.phone;
          const sameEmail = contact.email && existing.email.toLowerCase() === contact.email.toLowerCase();
          return sameName || samePhone || sameEmail;
        });
      });

      if (newContacts.length === 0) {
        setImportStatus('No new contacts found in this file.');
        return;
      }

      if (onAddContacts) {
        const saved = await onAddContacts(newContacts);
        if (saved === false) {
          setImportStatus('Imported locally, but cloud sync failed. Please stay signed in and try again.');
          return;
        }
      } else {
        newContacts.forEach((contact) => {
          onAddContact(contact.name, contact.role, contact.phone, contact.email, contact.company, contact.gstNumber, contact.address);
        });
      }

      setImportStatus(`Imported ${newContacts.length} contact${newContacts.length !== 1 ? 's' : ''} from file.`);
    } catch {
      setImportStatus('Unable to import this file. Use a Google Contacts CSV export or .vcf file.');
    }
  };

  const startEditingContact = (contact: Contact) => {
    setEditingContactId(contact.id);
    setEditContact({
      name: contact.name,
      role: contact.role,
      phone: contact.phone,
      email: contact.email,
      company: contact.company || '',
      gstNumber: contact.gstNumber || '',
      address: contact.address || '',
    });
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingContactId || !editContact.name.trim() || !onUpdateContact) return;

    const saved = await onUpdateContact(editingContactId, {
      name: editContact.name.trim(),
      role: editContact.role,
      phone: editContact.phone.trim(),
      email: editContact.email.trim(),
      company: editContact.company.trim(),
      gstNumber: editContact.gstNumber?.trim() || undefined,
      address: editContact.address?.trim() || undefined,
    });

    if (saved === false) {
      setImportStatus('Contact updated locally, but cloud sync failed. Please try again before signing out.');
      return;
    }

    setEditingContactId(null);
    setImportStatus('Contact updated and saved.');
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
  const selectedContact = filteredContacts.find((contact) => contact.id === selectedContactId) || filteredContacts[0] || null;
  const roleCounts = CONTACT_ROLE_OPTIONS.reduce(
    (counts, option) => ({
      ...counts,
      [option.id]: contacts.filter((contact) => contact.role === option.id).length,
    }),
    { all: contacts.length } as Record<ContactRole | 'all', number>,
  );

  const roleFilterItems = [
    { id: 'all', label: 'All', count: roleCounts.all },
    ...CONTACT_ROLE_OPTIONS.map((option) => ({
      id: option.id,
      label: option.pluralLabel,
      count: roleCounts[option.id],
    })),
  ];

  return (
    <div className="space-y-3" id="contacts-management-tab">
      <div className="flex flex-col gap-2 rounded-xl border border-slate-150 bg-white p-2.5 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
          <input
            type="text"
            placeholder="Search directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-0 flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-xs whitespace-nowrap"
          >
            <Plus size={14} /> Add Partner
          </button>
          <button
            type="button"
            onClick={() => void handleImportFromDeviceContacts()}
            className="bg-white hover:bg-slate-50 text-slate-650 font-bold text-xs px-3 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 whitespace-nowrap"
            title="Import from this device's contacts when supported"
          >
            <UserPlus size={14} /> Import Contacts
          </button>
          <label
            className="bg-white hover:bg-slate-50 text-slate-650 font-bold text-xs px-3 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 whitespace-nowrap"
            title="Import a Google Contacts CSV export or vCard file"
          >
            <Upload size={14} /> Import File
            <input
              type="file"
              accept=".csv,.vcf,text/csv,text/vcard"
              onChange={(event) => {
                void handleImportFromFile(event.target.files?.[0]);
                event.target.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>

        {importStatus && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700">
            {importStatus}
          </div>
        )}

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hidden pb-0.5" aria-label="Contact role filters">
          {roleFilterItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setRoleFilter(item.id);
                setSelectedContactId(null);
              }}
              className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-left transition cursor-pointer ${
                roleFilter === item.id
                  ? 'border-[#66a3ff] bg-blue-50 text-[#003366]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
              <span className="ml-1.5 font-mono text-[10px] font-black">{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Inline Quick Add Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2.5 animate-in slide-in-from-top-3 duration-150 text-left">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1">
            <UserCheck size={14} className="text-blue-600" /> Add Contact
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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ContactRole)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
              >
                {CONTACT_ROLE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.selectLabel}
                  </option>
                ))}
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
                placeholder="GSTIN"
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
              Add Contact
            </button>
          </div>
        </form>
      )}

      {/* Focused directory layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 text-left">
        <aside className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white rounded-xl border border-slate-150 shadow-xs overflow-hidden">
            <div className="border-b border-slate-100 px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Contacts</span>
              <span className="text-[11px] text-slate-400">{filteredContacts.length} shown</span>
            </div>
            <div className="max-h-[calc(100vh-245px)] min-h-[260px] overflow-y-auto scrollbar-hidden divide-y divide-slate-100">
              {filteredContacts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No contacts match your filters.</div>
              ) : (
                filteredContacts.map((c) => {
                  const roleConfig = getContactRoleConfig(c.role);
                  const partyPaymentsCount = payments.filter(
                    (p) => p.party.trim().toLowerCase() === c.name.trim().toLowerCase()
                  ).length;
                  const isSelected = selectedContact?.id === c.id;
                  return (
                    <div key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedContactId(c.id)}
                        className={`w-full border-none px-3 py-2.5 text-left transition cursor-pointer ${
                          isSelected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="block truncate text-sm font-bold text-slate-900">{c.name}</span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500">{c.company || c.email || c.phone || 'No company details'}</span>
                          </div>
                          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${roleConfig.badgeClass}`}>
                            {roleConfig.label}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                          <span>{partyPaymentsCount} transaction{partyPaymentsCount !== 1 ? 's' : ''}</span>
                          <span>{c.phone || c.email ? 'Contactable' : 'Incomplete'}</span>
                        </div>
                      </button>
                      {isSelected && (
                        <div className="lg:hidden border-t border-blue-100 bg-blue-50/60 px-3 py-2.5 text-xs text-slate-700">
                          <div className="grid grid-cols-1 gap-1.5">
                            <span className="font-bold text-slate-900">{c.company || 'No company added'}</span>
                            <span>{c.phone || 'No phone added'}</span>
                            <span className="break-all">{c.email || 'No email added'}</span>
                            <span>{c.address || 'No address added'}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {onUpdateContact && (
                              <button
                                type="button"
                                onClick={() => startEditingContact(c)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedContactForLedger(c)}
                              className="rounded-lg border border-blue-100 bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#00509e]"
                            >
                              View ledger
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <section className="hidden lg:block lg:col-span-7 xl:col-span-8">
          {selectedContact ? (() => {
            const c = selectedContact;
          const roleConfig = getContactRoleConfig(c.role);

          const partyPaymentsCount = payments.filter(
            (p) => p.party.trim().toLowerCase() === c.name.trim().toLowerCase()
          ).length;
          const partyPayments = payments.filter(
            (p) => p.party.trim().toLowerCase() === c.name.trim().toLowerCase()
          );
          const totalIn = partyPayments.filter((p) => p.type === 'in').reduce((sum, p) => sum + p.amount, 0);
          const totalOut = partyPayments.filter((p) => p.type === 'out').reduce((sum, p) => sum + p.amount, 0);

          return (
            <div
              className="bg-white rounded-xl border border-slate-150 shadow-xs overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold ${roleConfig.badgeClass}`}>
                      {roleConfig.detailLabel}
                    </span>
                    <h3 className="mt-2 truncate text-lg font-black text-slate-950">{c.name}</h3>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{c.company || 'No company added'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {onUpdateContact && (
                      <button
                        type="button"
                        onClick={() => startEditingContact(c)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedContactForLedger(c)}
                      className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-[#00509e] hover:bg-blue-100 cursor-pointer"
                    >
                      View ledger
                    </button>
                    {onDeleteContact && (
                      <button
                        type="button"
                        onClick={() => onDeleteContact(c.id)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-5 gap-0">
                <div className="xl:col-span-2 border-b xl:border-b-0 xl:border-r border-slate-100 p-4 space-y-3">
                  {editingContactId === c.id ? (
                    <form onSubmit={handleEditSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 gap-2">
                        <label className="space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Name</span>
                          <input
                            type="text"
                            required
                            value={editContact.name}
                            onChange={(event) => setEditContact((current) => ({ ...current, name: event.target.value }))}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Role</span>
                          <select
                            value={editContact.role}
                            onChange={(event) => setEditContact((current) => ({ ...current, role: event.target.value as ContactRole }))}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {CONTACT_ROLE_OPTIONS.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.selectLabel}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Phone</span>
                          <input
                            type="text"
                            value={editContact.phone}
                            onChange={(event) => setEditContact((current) => ({ ...current, phone: event.target.value }))}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Email</span>
                          <input
                            type="email"
                            value={editContact.email}
                            onChange={(event) => setEditContact((current) => ({ ...current, email: event.target.value }))}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Company</span>
                          <input
                            type="text"
                            value={editContact.company}
                            onChange={(event) => setEditContact((current) => ({ ...current, company: event.target.value }))}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">GST Number</span>
                          <input
                            type="text"
                            value={editContact.gstNumber || ''}
                            onChange={(event) => setEditContact((current) => ({ ...current, gstNumber: event.target.value }))}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Address</span>
                          <input
                            type="text"
                            value={editContact.address || ''}
                            onChange={(event) => setEditContact((current) => ({ ...current, address: event.target.value }))}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingContactId(null)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                        >
                          <X size={13} /> Cancel
                        </button>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-lg border-none bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer"
                        >
                          <Check size={13} /> Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Contact Details</span>
                        <div className="mt-2 space-y-2 text-xs">
                          <div className="flex gap-2 text-slate-700">
                            <Phone size={15} className="mt-0.5 shrink-0 text-slate-400" />
                            <span>{c.phone || 'No phone added'}</span>
                          </div>
                          <div className="flex gap-2 text-slate-700">
                            <Mail size={15} className="mt-0.5 shrink-0 text-slate-400" />
                            <span className="break-all">{c.email || 'No email added'}</span>
                          </div>
                          <div className="flex gap-2 text-slate-700">
                            <Building2 size={15} className="mt-0.5 shrink-0 text-slate-400" />
                            <span>{c.address || 'No address added'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Role</label>
                        <select
                          value={c.role}
                          onChange={(event) => onUpdateContactRole?.(c.id, event.target.value as ContactRole)}
                          disabled={!onUpdateContactRole}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {CONTACT_ROLE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.selectLabel}
                            </option>
                          ))}
                        </select>
                      </div>
                      {c.gstNumber && (
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-2.5">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-[#00509e]">GSTIN</span>
                          <span className="mt-1 block font-mono text-xs font-bold text-slate-800">{c.gstNumber}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="xl:col-span-3 p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Transactions</span>
                      <span className="mt-0.5 block text-sm font-black text-slate-900">{partyPaymentsCount}</span>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-700">Received</span>
                      <span className="mt-0.5 block truncate text-sm font-black text-emerald-700">{formatCurrency(totalIn)}</span>
                    </div>
                    <div className="rounded-lg border border-rose-100 bg-rose-50 p-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-rose-700">Paid</span>
                      <span className="mt-0.5 block truncate text-sm font-black text-rose-700">{formatCurrency(totalOut)}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-150 overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                      Recent ledger activity
                    </div>
                    {partyPayments.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">No transactions recorded for this contact.</div>
                    ) : (
                      <div className="max-h-[300px] divide-y divide-slate-100 overflow-y-auto scrollbar-hidden">
                        {partyPayments.slice(0, 5).map((payment) => {
                          const project = projects.find((item) => item.id === payment.projectId);
                          return (
                            <div key={payment.id} className="grid grid-cols-12 gap-2 px-3 py-2.5 text-xs">
                              <div className="col-span-3 font-mono text-slate-500">{formatDate(payment.date)}</div>
                              <div className="col-span-5 min-w-0">
                                <span className="block truncate font-semibold text-slate-800">{project?.name || 'Unknown project'}</span>
                                <span className="block truncate text-slate-400">{payment.remark || 'No remark'}</span>
                              </div>
                              <div className={`col-span-4 text-right font-mono font-black ${payment.type === 'in' ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {payment.type === 'in' ? '+' : '-'}{formatCurrency(payment.amount)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })() : (
          <div className="bg-white rounded-xl border border-slate-150 p-8 text-center text-slate-400">
            Select a contact to view details.
          </div>
        )}
        </section>
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
                    {selectedContactForLedger.company ? `${selectedContactForLedger.company} / ` : ''}{selectedContactForLedger.role} account
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
                          {selectedContactForLedger.address}
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
                      <span className="text-base font-black text-emerald-600 block mt-0.5">{formatCurrency(totalIn)}</span>
                    </div>
                    <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-xl text-left">
                      <span className="text-[9px] uppercase font-bold text-rose-700 font-mono tracking-wider">Withdrawn (Debit)</span>
                      <span className="text-base font-black text-rose-500 block mt-0.5">{formatCurrency(totalOut)}</span>
                    </div>
                    <div className={`${balance >= 0 ? 'bg-blue-50/50 border-blue-100 text-blue-700' : 'bg-rose-50/50 border-rose-100 text-rose-700'} border p-3 rounded-xl text-left`}>
                      <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">Relative Standing</span>
                      <span className="text-base font-black block mt-0.5">
                        {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                      </span>
                    </div>
                  </div>

                  {/* Payments Table */}
                  <div className="max-h-[280px] overflow-y-auto scrollbar-hidden border border-slate-150 rounded-xl">
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
                                  {p.type === 'in' ? '+' : '-'}{formatCurrency(p.amount)}
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
