import { ContactRole, PartyRole } from '../types';

type ContactRoleConfig = {
  id: ContactRole;
  label: string;
  pluralLabel: string;
  selectLabel: string;
  detailLabel: string;
  badgeClass: string;
};

export const CONTACT_ROLE_OPTIONS: ContactRoleConfig[] = [
  {
    id: 'client',
    label: 'Client',
    pluralLabel: 'Clients',
    selectLabel: 'Client',
    detailLabel: 'Client',
    badgeClass: 'border-blue-100 bg-blue-50 text-[#00509e]',
  },
  {
    id: 'vendor',
    label: 'Vendor',
    pluralLabel: 'Vendors',
    selectLabel: 'Vendor',
    detailLabel: 'Vendor',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    id: 'supplier',
    label: 'Supplier',
    pluralLabel: 'Suppliers',
    selectLabel: 'Supplier',
    detailLabel: 'Supplier',
    badgeClass: 'border-green-200 bg-green-50 text-green-700',
  },
  {
    id: 'contractor',
    label: 'Contractor',
    pluralLabel: 'Contractors',
    selectLabel: 'Contractor',
    detailLabel: 'Contractor',
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  {
    id: 'site_worker',
    label: 'Site Worker',
    pluralLabel: 'Site Workers',
    selectLabel: 'Site Worker',
    detailLabel: 'Site Worker',
    badgeClass: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  {
    id: 'other',
    label: 'Other',
    pluralLabel: 'Other',
    selectLabel: 'Other',
    detailLabel: 'Other',
    badgeClass: 'border-slate-200 bg-slate-50 text-slate-700',
  },
];

export const PARTY_ROLE_OPTIONS: Array<{ id: PartyRole; label: string }> = [
  ...CONTACT_ROLE_OPTIONS.map((role) => ({ id: role.id, label: role.selectLabel })),
];

export const PAYABLE_CONTACT_ROLES: ContactRole[] = ['vendor', 'supplier', 'contractor', 'site_worker', 'other'];
export const DEDUCTIBLE_PARTY_ROLES: PartyRole[] = ['vendor', 'supplier', 'contractor', 'site_worker'];

export function getContactRoleConfig(role: ContactRole): ContactRoleConfig {
  return CONTACT_ROLE_OPTIONS.find((option) => option.id === role) || CONTACT_ROLE_OPTIONS[0];
}

export function getPartyRoleLabel(role: PartyRole): string {
  if (role === 'other') return 'Other';
  return getContactRoleConfig(role).label;
}
