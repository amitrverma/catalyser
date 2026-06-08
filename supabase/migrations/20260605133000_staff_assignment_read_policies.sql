-- Staff members can read only assigned project data. Non-staff members keep workspace-wide reads.

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

drop policy if exists "Members manage organization projects" on public.projects;
create policy "Members manage organization projects"
on public.projects for all
using (public.can_read_project(id))
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'project_manager']))
);

drop policy if exists "Members manage organization payments" on public.payments;
create policy "Members manage organization payments"
on public.payments for all
using (public.can_read_project(project_id))
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'project_manager', 'accountant']))
);

drop policy if exists "Members manage organization documents" on public.documents;
create policy "Members manage organization documents"
on public.documents for all
using (public.can_read_project(project_id))
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'project_manager', 'accountant', 'staff']))
);

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
