-- Wires the app to organization-scoped records and storage-backed files.

alter table public.payments
add column if not exists bill_photo_storage_path text;

alter table public.company_settings drop constraint if exists company_settings_pkey;
alter table public.staff_salaries drop constraint if exists staff_salaries_pkey;

create unique index if not exists company_settings_user_org_uidx
on public.company_settings(user_id, org_id);

create unique index if not exists staff_salaries_user_org_uidx
on public.staff_salaries(user_id, org_id);

create or replace function public.ensure_personal_organization()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_org_id uuid;
  next_org_id uuid;
  user_email text;
begin
  select membership.organization_id
  into existing_org_id
  from public.organization_memberships membership
  where membership.user_id = auth.uid()
  order by membership.created_at asc
  limit 1;

  if existing_org_id is not null then
    return existing_org_id;
  end if;

  select email into user_email
  from auth.users
  where id = auth.uid();

  insert into public.organizations (name, created_by)
  values (coalesce(nullif(split_part(user_email, '@', 1), ''), 'Personal') || '''s Workspace', auth.uid())
  returning id into next_org_id;

  insert into public.organization_memberships (organization_id, user_id, role)
  values (next_org_id, auth.uid(), 'owner');

  return next_org_id;
end;
$$;

drop policy if exists "Users manage own projects" on public.projects;
create policy "Users manage own projects"
on public.projects for all
using (
  auth.uid() = user_id
  or (org_id is not null and public.is_org_member(org_id))
)
with check (
  auth.uid() = user_id
  and (
    org_id is null
    or public.has_org_role(org_id, array['owner', 'admin', 'accountant', 'project_manager'])
  )
);

drop policy if exists "Users manage own contacts" on public.contacts;
create policy "Users manage own contacts"
on public.contacts for all
using (
  auth.uid() = user_id
  or (org_id is not null and public.is_org_member(org_id))
)
with check (
  auth.uid() = user_id
  and (
    org_id is null
    or public.has_org_role(org_id, array['owner', 'admin', 'accountant', 'project_manager'])
  )
);

drop policy if exists "Users manage own payments" on public.payments;
create policy "Users manage own payments"
on public.payments for all
using (
  auth.uid() = user_id
  or (org_id is not null and public.is_org_member(org_id))
)
with check (
  auth.uid() = user_id
  and (
    org_id is null
    or public.has_org_role(org_id, array['owner', 'admin', 'accountant', 'project_manager'])
  )
);

drop policy if exists "Users manage own documents" on public.documents;
create policy "Users manage own documents"
on public.documents for all
using (
  auth.uid() = user_id
  or (org_id is not null and public.is_org_member(org_id))
)
with check (
  auth.uid() = user_id
  and (
    org_id is null
    or public.has_org_role(org_id, array['owner', 'admin', 'accountant', 'project_manager'])
  )
);

drop policy if exists "Users manage own company settings" on public.company_settings;
create policy "Users manage own company settings"
on public.company_settings for all
using (
  auth.uid() = user_id
  or (org_id is not null and public.is_org_member(org_id))
)
with check (
  auth.uid() = user_id
  and (
    org_id is null
    or public.has_org_role(org_id, array['owner', 'admin'])
  )
);

drop policy if exists "Users manage own staff salaries" on public.staff_salaries;
create policy "Users manage own staff salaries"
on public.staff_salaries for all
using (
  auth.uid() = user_id
  or (org_id is not null and public.is_org_member(org_id))
)
with check (
  auth.uid() = user_id
  and (
    org_id is null
    or public.has_org_role(org_id, array['owner', 'admin'])
  )
);

drop policy if exists "Users read own Catalyser files" on storage.objects;
create policy "Users read own Catalyser files"
on storage.objects for select
using (
  bucket_id = 'catalyser-documents'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or (
      (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
      and public.is_org_member(((storage.foldername(name))[2])::uuid)
    )
  )
);

drop policy if exists "Users upload own Catalyser files" on storage.objects;
create policy "Users upload own Catalyser files"
on storage.objects for insert
with check (
  bucket_id = 'catalyser-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
  and (
    (storage.foldername(name))[2] = auth.uid()::text
    or (storage.foldername(name))[2] = 'settings'
    or (
      (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
      and public.has_org_role(((storage.foldername(name))[2])::uuid, array['owner', 'admin', 'accountant', 'project_manager'])
    )
  )
);

drop policy if exists "Users update own Catalyser files" on storage.objects;
create policy "Users update own Catalyser files"
on storage.objects for update
using (
  bucket_id = 'catalyser-documents'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or (
      (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
      and public.has_org_role(((storage.foldername(name))[2])::uuid, array['owner', 'admin', 'accountant', 'project_manager'])
    )
  )
)
with check (
  bucket_id = 'catalyser-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
