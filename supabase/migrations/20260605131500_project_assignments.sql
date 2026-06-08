-- Project-level assignment model for staff-scoped visibility.

create table if not exists public.project_assignments (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_assignments_user_id_idx on public.project_assignments(user_id);
create index if not exists project_assignments_project_id_idx on public.project_assignments(project_id);

alter table public.project_assignments enable row level security;

drop policy if exists "Members can read project assignments" on public.project_assignments;
create policy "Members can read project assignments"
on public.project_assignments for select
using (
  exists (
    select 1
    from public.projects project
    where project.id = project_assignments.project_id
      and project.org_id is not null
      and public.is_org_member(project.org_id)
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
      and project.org_id is not null
      and public.has_org_role(project.org_id, array['owner', 'admin', 'project_manager'])
  )
)
with check (
  exists (
    select 1
    from public.projects project
    where project.id = project_assignments.project_id
      and project.org_id is not null
      and public.has_org_role(project.org_id, array['owner', 'admin', 'project_manager'])
  )
);
