-- Platform-role foundation for shared organization workspaces.

alter table public.organization_memberships
drop constraint if exists organization_memberships_role_check;

alter table public.organization_memberships
add constraint organization_memberships_role_check
check (role in ('owner', 'admin', 'project_manager', 'accountant', 'staff', 'viewer'));

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'project_manager', 'accountant', 'staff', 'viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  token_hash text,
  expires_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists organization_invitations_pending_email_uidx
on public.organization_invitations (organization_id, lower(email))
where status = 'pending';

create index if not exists organization_invitations_email_idx
on public.organization_invitations (lower(email));

create index if not exists organization_invitations_organization_id_idx
on public.organization_invitations (organization_id);

drop trigger if exists set_organization_invitations_updated_at on public.organization_invitations;
create trigger set_organization_invitations_updated_at
before update on public.organization_invitations
for each row execute function public.set_updated_at();

alter table public.organization_invitations enable row level security;

drop policy if exists "Owners and admins manage organization invitations" on public.organization_invitations;
create policy "Owners and admins manage organization invitations"
on public.organization_invitations for all
using (public.has_org_role(organization_id, array['owner', 'admin']))
with check (public.has_org_role(organization_id, array['owner', 'admin']));

drop policy if exists "Users can read invitations sent to them" on public.organization_invitations;
create policy "Users can read invitations sent to them"
on public.organization_invitations for select
using (
  lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  and status = 'pending'
);
