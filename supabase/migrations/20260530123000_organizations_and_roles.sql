-- Organization and role groundwork for enterprise tenancy.
-- Existing user-owned records continue to work; org_id columns are nullable until
-- the application UI supports team workspaces and membership management.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'accountant', 'project_manager', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.projects add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.contacts add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.payments add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.documents add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.company_settings add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.staff_salaries add column if not exists org_id uuid references public.organizations(id) on delete cascade;

create index if not exists organization_memberships_user_id_idx on public.organization_memberships(user_id);
create index if not exists projects_org_id_idx on public.projects(org_id);
create index if not exists contacts_org_id_idx on public.contacts(org_id);
create index if not exists payments_org_id_idx on public.payments(org_id);
create index if not exists documents_org_id_idx on public.documents(org_id);
create index if not exists company_settings_org_id_idx on public.company_settings(org_id);
create index if not exists staff_salaries_org_id_idx on public.staff_salaries(org_id);

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists set_organization_memberships_updated_at on public.organization_memberships;
create trigger set_organization_memberships_updated_at
before update on public.organization_memberships
for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_org_id
      and membership.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(target_org_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_org_id
      and membership.user_id = auth.uid()
      and membership.role = any(allowed_roles)
  );
$$;

drop policy if exists "Members can read organizations" on public.organizations;
create policy "Members can read organizations"
on public.organizations for select
using (public.is_org_member(id));

drop policy if exists "Users can create organizations" on public.organizations;
create policy "Users can create organizations"
on public.organizations for insert
with check (auth.uid() = created_by);

drop policy if exists "Owners and admins can update organizations" on public.organizations;
create policy "Owners and admins can update organizations"
on public.organizations for update
using (public.has_org_role(id, array['owner', 'admin']))
with check (public.has_org_role(id, array['owner', 'admin']));

drop policy if exists "Members can read memberships" on public.organization_memberships;
create policy "Members can read memberships"
on public.organization_memberships for select
using (public.is_org_member(organization_id));

drop policy if exists "Owners and admins manage memberships" on public.organization_memberships;
create policy "Owners and admins manage memberships"
on public.organization_memberships for all
using (public.has_org_role(organization_id, array['owner', 'admin']))
with check (public.has_org_role(organization_id, array['owner', 'admin']));

