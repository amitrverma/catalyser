import { isSupabaseConfigured, supabase } from './supabase';
import { PlatformRole } from '../types';
import { snapshotSettings } from './settingsStore';

export interface ActiveOrganization {
  id: string;
  name: string;
  role: PlatformRole;
}

let activeOrgId: string | null = null;

type MembershipRecord = {
  organization_id: string;
  role: PlatformRole;
};

export type OrganizationMember = {
  userId: string;
  email: string;
  role: PlatformRole;
};

export type OrganizationInvitation = {
  id: string;
  email: string;
  role: Exclude<PlatformRole, 'owner'>;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt: string;
};

export function selectActiveOrganization(orgId: string) {
  activeOrgId = orgId;
}

export async function listUserOrganizations(): Promise<ActiveOrganization[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const membershipsResult = await supabase
    .from('organization_memberships')
    .select('organization_id, role')
    .eq('user_id', user.id);

  if (membershipsResult.error) {
    console.error('Supabase organization lookup failed:', membershipsResult.error);
    return [];
  }

  const memberships = (membershipsResult.data || []) as MembershipRecord[];
  const organizationIds = memberships.map((membership) => membership.organization_id);
  if (organizationIds.length === 0) return [];

  const organizationsResult = await supabase
    .from('organizations')
    .select('id, name')
    .in('id', organizationIds);

  if (organizationsResult.error) {
    console.error('Supabase organization detail lookup failed:', organizationsResult.error);
    return [];
  }

  return (organizationsResult.data || [])
    .map((organization) => {
      const membership = memberships.find((item) => item.organization_id === organization.id);
      if (!membership) return null;
      return {
        id: organization.id,
        name: organization.name,
        role: membership.role,
      };
    })
    .filter((organization): organization is ActiveOrganization => Boolean(organization));
}

export async function acceptPendingOrganizationInvitations() {
  if (!isSupabaseConfigured || !supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return [];

  const invitationsResult = await supabase
    .from('organization_invitations')
    .select('id')
    .eq('status', 'pending')
    .ilike('email', user.email);

  if (invitationsResult.error) {
    console.error('Supabase pending invitation lookup failed:', invitationsResult.error);
    return [];
  }

  const acceptedOrgIds: string[] = [];
  for (const invitation of invitationsResult.data || []) {
    const acceptResult = await supabase.rpc('accept_organization_invitation', {
      invitation_id: invitation.id,
    });
    if (acceptResult.error) {
      console.error('Supabase invitation accept failed:', acceptResult.error);
    } else if (acceptResult.data) {
      acceptedOrgIds.push(acceptResult.data);
    }
  }

  if (acceptedOrgIds[0]) {
    activeOrgId = acceptedOrgIds[0];
  }
  return acceptedOrgIds;
}

export async function ensureActiveOrganization(): Promise<ActiveOrganization | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const organizations = await listUserOrganizations();
  const selectedOrganization =
    organizations.find((organization) => organization.id === activeOrgId) || organizations[0];

  if (selectedOrganization) {
    activeOrgId = selectedOrganization.id;
    return selectedOrganization;
  }

  return null;
}

export async function createOrganization(name: string): Promise<ActiveOrganization | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const settings = snapshotSettings([
    'cc_company_name',
    'cc_company_address',
    'cc_company_gst',
    'cc_company_email',
    'cc_company_phone',
    'cc_bank_account_name',
    'cc_bank_name',
    'cc_bank_account_number',
    'cc_bank_account_type',
    'cc_bank_ifsc',
    'cc_tax_rate',
    'cc_gst_rate',
    'cc_selected_fy',
    'cc_custom_overheads',
  ]);

  const rpcResult = await supabase.rpc('create_organization', {
    organization_name: name.trim(),
    initial_settings: {
      ...settings,
      cc_company_name: name.trim(),
    },
    initial_salaries: [],
  });
  if (rpcResult.error || !rpcResult.data) {
    console.error('Supabase organization creation failed:', rpcResult.error);
    return null;
  }

  activeOrgId = rpcResult.data;
  return { id: rpcResult.data, name: name.trim(), role: 'owner' };
}

export function getCachedActiveOrgId() {
  return activeOrgId;
}

export async function listOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const membershipsResult = await supabase
    .from('organization_memberships')
    .select('user_id, role')
    .eq('organization_id', orgId);

  if (membershipsResult.error) {
    console.error('Supabase organization members lookup failed:', membershipsResult.error);
    return [];
  }

  const memberships = (membershipsResult.data || []) as Array<{ user_id: string; role: PlatformRole }>;
  const userIds = memberships.map((membership) => membership.user_id);
  if (userIds.length === 0) return [];

  const profilesResult = await supabase
    .from('profiles')
    .select('user_id, email')
    .in('user_id', userIds);

  if (profilesResult.error) {
    console.error('Supabase member profiles lookup failed:', profilesResult.error);
  }

  const profiles = profilesResult.data || [];
  return memberships.map((membership) => ({
    userId: membership.user_id,
    email: profiles.find((profile) => profile.user_id === membership.user_id)?.email || membership.user_id,
    role: membership.role,
  }));
}

export async function listOrganizationInvitations(orgId: string): Promise<OrganizationInvitation[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const invitationsResult = await supabase
    .from('organization_invitations')
    .select('id, email, role, status, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (invitationsResult.error) {
    console.error('Supabase organization invitations lookup failed:', invitationsResult.error);
    return [];
  }

  return (invitationsResult.data || []).map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    createdAt: invitation.created_at,
  }));
}

export async function inviteOrganizationMember(
  orgId: string,
  email: string,
  role: Exclude<PlatformRole, 'owner'>,
) {
  if (!isSupabaseConfigured || !supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const invitationResult = await supabase.from('organization_invitations').insert({
    organization_id: orgId,
    email: email.trim().toLowerCase(),
    role,
    invited_by: user.id,
    status: 'pending',
  });

  if (invitationResult.error) {
    console.error('Supabase organization invitation failed:', invitationResult.error);
    return false;
  }

  return true;
}

export async function revokeOrganizationInvitation(invitationId: string) {
  if (!isSupabaseConfigured || !supabase) return false;

  const invitationResult = await supabase
    .from('organization_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId);

  if (invitationResult.error) {
    console.error('Supabase organization invitation revoke failed:', invitationResult.error);
    return false;
  }

  return true;
}

export async function updateOrganizationMemberRole(orgId: string, userId: string, role: PlatformRole) {
  if (!isSupabaseConfigured || !supabase) return false;

  const result = await supabase.rpc('update_organization_member_role', {
    target_organization_id: orgId,
    target_user_id: userId,
    next_role: role,
  });

  if (result.error) {
    console.error('Supabase organization member role update failed:', result.error);
    return false;
  }

  return true;
}

export async function removeOrganizationMember(orgId: string, userId: string) {
  if (!isSupabaseConfigured || !supabase) return false;

  const result = await supabase.rpc('remove_organization_member', {
    target_organization_id: orgId,
    target_user_id: userId,
  });

  if (result.error) {
    console.error('Supabase organization member remove failed:', result.error);
    return false;
  }

  return true;
}
