import { isSupabaseConfigured, supabase } from './supabase';

export interface ActiveOrganization {
  id: string;
  name: string;
}

const ACTIVE_ORG_KEY = 'catalyser_active_org_id';

export async function ensureActiveOrganization(): Promise<ActiveOrganization | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const preferredOrgId = localStorage.getItem(ACTIVE_ORG_KEY);
  const membershipsResult = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', user.id);

  if (membershipsResult.error) {
    console.error('Supabase organization lookup failed:', membershipsResult.error);
  }

  const memberships = membershipsResult.data || [];
  const selectedMembership =
    memberships.find((membership) => membership.organization_id === preferredOrgId) || memberships[0];

  if (selectedMembership?.organization_id) {
    const organizationResult = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', selectedMembership.organization_id)
      .maybeSingle();

    if (organizationResult.data?.id && organizationResult.data.name) {
      localStorage.setItem(ACTIVE_ORG_KEY, organizationResult.data.id);
      return { id: organizationResult.data.id, name: organizationResult.data.name };
    }
  }

  const rpcResult = await supabase.rpc('ensure_personal_organization');
  if (rpcResult.error || !rpcResult.data) {
    console.error('Supabase organization bootstrap failed:', rpcResult.error);
    return null;
  }

  localStorage.setItem(ACTIVE_ORG_KEY, rpcResult.data);
  return { id: rpcResult.data, name: 'Personal Workspace' };
}

export function getCachedActiveOrgId() {
  return localStorage.getItem(ACTIVE_ORG_KEY);
}
