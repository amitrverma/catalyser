import { PlatformPermission, PlatformRole } from '../types';

type PlatformRoleConfig = {
  id: PlatformRole;
  label: string;
  description: string;
  permissions: PlatformPermission[];
};

const ALL_PERMISSIONS: PlatformPermission[] = [
  'manage_workspace',
  'manage_members',
  'manage_settings',
  'manage_projects',
  'manage_contacts',
  'manage_ledger',
  'manage_documents',
  'view_reports',
];

export const PLATFORM_ROLE_OPTIONS: PlatformRoleConfig[] = [
  {
    id: 'owner',
    label: 'Owner',
    description: 'Controls billing, members, workspace settings, and all operational data.',
    permissions: ALL_PERMISSIONS,
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Manages members, settings, projects, contacts, ledgers, documents, and reports.',
    permissions: ALL_PERMISSIONS.filter((permission) => permission !== 'manage_workspace'),
  },
  {
    id: 'project_manager',
    label: 'Project Manager',
    description: 'Runs project operations, contacts, documents, and project ledger entries.',
    permissions: ['manage_projects', 'manage_contacts', 'manage_ledger', 'manage_documents', 'view_reports'],
  },
  {
    id: 'accountant',
    label: 'Accountant',
    description: 'Manages payments, invoices, reports, and finance-related settings.',
    permissions: ['manage_settings', 'manage_contacts', 'manage_ledger', 'manage_documents', 'view_reports'],
  },
  {
    id: 'staff',
    label: 'Staff',
    description: 'Works on assigned operational tasks with limited project and document access.',
    permissions: ['manage_documents'],
  },
  {
    id: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to workspace records and reports.',
    permissions: ['view_reports'],
  },
];

export const PLATFORM_ROLES = PLATFORM_ROLE_OPTIONS.map((role) => role.id);

export function getPlatformRoleConfig(role: PlatformRole) {
  return PLATFORM_ROLE_OPTIONS.find((option) => option.id === role) || PLATFORM_ROLE_OPTIONS[PLATFORM_ROLE_OPTIONS.length - 1];
}

export function hasPlatformPermission(role: PlatformRole | null | undefined, permission: PlatformPermission) {
  if (!role) return false;
  return getPlatformRoleConfig(role).permissions.includes(permission);
}

export function canManagePlatformRole(actorRole: PlatformRole | null | undefined, targetRole: PlatformRole) {
  if (actorRole === 'owner') return targetRole !== 'owner';
  if (actorRole === 'admin') return !['owner', 'admin'].includes(targetRole);
  return false;
}
