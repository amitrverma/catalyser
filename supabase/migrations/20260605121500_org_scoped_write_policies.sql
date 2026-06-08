-- Move write access for organization rows from row creator ownership to membership role.
-- Personal/null-org rows remain user-owned.

drop policy if exists "Users manage own projects" on public.projects;
create policy "Members manage organization projects"
on public.projects for all
using (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.is_org_member(org_id))
)
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'project_manager']))
);

drop policy if exists "Users manage own contacts" on public.contacts;
create policy "Members manage organization contacts"
on public.contacts for all
using (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.is_org_member(org_id))
)
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'project_manager', 'accountant']))
);

drop policy if exists "Users manage own payments" on public.payments;
create policy "Members manage organization payments"
on public.payments for all
using (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.is_org_member(org_id))
)
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'project_manager', 'accountant']))
);

drop policy if exists "Users manage own documents" on public.documents;
create policy "Members manage organization documents"
on public.documents for all
using (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.is_org_member(org_id))
)
with check (
  (org_id is null and auth.uid() = user_id)
  or (org_id is not null and public.has_org_role(org_id, array['owner', 'admin', 'project_manager', 'accountant', 'staff']))
);

drop policy if exists "Users manage own company settings" on public.company_settings;
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
