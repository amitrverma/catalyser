-- Idempotent repair for org-scoped persistence.
-- This brings live databases that were migrated manually or partially up to the
-- schema/RLS shape expected by the current app.

alter table public.projects add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.contacts add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.payments add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.documents add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.company_settings add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.staff_salaries add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.payments add column if not exists bill_photo_storage_path text;

alter table public.organization_memberships drop constraint if exists organization_memberships_role_check;
alter table public.organization_memberships
add constraint organization_memberships_role_check
check (role in ('owner', 'admin', 'project_manager', 'accountant', 'staff', 'viewer'));

create table if not exists public.project_assignments (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists organization_memberships_user_id_idx on public.organization_memberships(user_id);
create index if not exists projects_org_id_idx on public.projects(org_id);
create index if not exists contacts_org_id_idx on public.contacts(org_id);
create index if not exists payments_org_id_idx on public.payments(org_id);
create index if not exists documents_org_id_idx on public.documents(org_id);
create index if not exists company_settings_org_id_idx on public.company_settings(org_id);
create index if not exists staff_salaries_org_id_idx on public.staff_salaries(org_id);
create index if not exists project_assignments_user_id_idx on public.project_assignments(user_id);

alter table public.project_assignments enable row level security;

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

create or replace function public.can_read_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects project
    where project.id = target_project_id
      and (
        (project.org_id is null and project.user_id = auth.uid())
        or (
          project.org_id is not null
          and (
            public.has_org_role(project.org_id, array['owner', 'admin', 'project_manager', 'accountant', 'viewer'])
            or exists (
              select 1
              from public.project_assignments assignment
              where assignment.project_id = project.id
                and assignment.user_id = auth.uid()
            )
          )
        )
      )
  );
$$;

drop policy if exists "Users manage own projects" on public.projects;
drop policy if exists "Members manage organization projects" on public.projects;
drop policy if exists "Members can read organization projects" on public.projects;
drop policy if exists "Members can create organization projects" on public.projects;
drop policy if exists "Managers can update organization projects" on public.projects;
drop policy if exists "Managers can delete organization projects" on public.projects;

create policy "Members can read organization projects"
on public.projects for select
using (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.is_org_member(org_id))
);

create policy "Members can create organization projects"
on public.projects for insert
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'project_manager']))
);

create policy "Managers can update organization projects"
on public.projects for update
using (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'project_manager']))
)
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'project_manager']))
);

create policy "Managers can delete organization projects"
on public.projects for delete
using (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin']))
);

drop policy if exists "Users manage own contacts" on public.contacts;
drop policy if exists "Members manage organization contacts" on public.contacts;
create policy "Members manage organization contacts"
on public.contacts for all
using (
  (org_id is null and auth.uid() = user_id)
  or (
    org_id is not null
    and (
      public.has_org_role(org_id, array['owner', 'admin', 'project_manager', 'accountant', 'viewer'])
      or exists (
        select 1
        from public.projects project
        join public.project_assignments assignment on assignment.project_id = project.id
        where assignment.user_id = auth.uid()
          and project.org_id = contacts.org_id
          and lower(project.client_name) = lower(contacts.name)
      )
      or exists (
        select 1
        from public.payments payment
        join public.project_assignments assignment on assignment.project_id = payment.project_id
        where assignment.user_id = auth.uid()
          and payment.org_id = contacts.org_id
          and lower(payment.party) = lower(contacts.name)
      )
    )
  )
)
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'project_manager', 'accountant']))
);

drop policy if exists "Users manage own payments" on public.payments;
drop policy if exists "Members manage organization payments" on public.payments;
create policy "Members manage organization payments"
on public.payments for all
using (public.can_read_project(project_id))
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'project_manager', 'accountant']))
);

drop policy if exists "Users manage own documents" on public.documents;
drop policy if exists "Members manage organization documents" on public.documents;
create policy "Members manage organization documents"
on public.documents for all
using (public.can_read_project(project_id))
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'project_manager', 'accountant', 'staff']))
);

drop policy if exists "Users manage own company settings" on public.company_settings;
drop policy if exists "Members manage organization company settings" on public.company_settings;
create policy "Members manage organization company settings"
on public.company_settings for all
using (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.is_org_member(org_id))
)
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin']))
);

drop policy if exists "Users manage own staff salaries" on public.staff_salaries;
drop policy if exists "Members manage organization staff salaries" on public.staff_salaries;
create policy "Members manage organization staff salaries"
on public.staff_salaries for all
using (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.is_org_member(org_id))
)
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin']))
);

drop policy if exists "Members can read project assignments" on public.project_assignments;
create policy "Members can read project assignments"
on public.project_assignments for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.projects project
    where project.id = project_assignments.project_id
      and public.has_org_role(project.org_id, array['owner', 'admin', 'project_manager'])
  )
);

drop policy if exists "Managers manage project assignments" on public.project_assignments;
create policy "Managers manage project assignments"
on public.project_assignments for all
using (
  exists (
    select 1
    from public.projects project
    where project.id = project_assignments.project_id
      and public.has_org_role(project.org_id, array['owner', 'admin', 'project_manager'])
  )
)
with check (
  exists (
    select 1
    from public.projects project
    where project.id = project_assignments.project_id
      and public.has_org_role(project.org_id, array['owner', 'admin', 'project_manager'])
  )
);

notify pgrst, 'reload schema';
