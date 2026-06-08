-- Match create_organization upserts to the partial org-level unique indexes.

create unique index if not exists company_settings_org_uidx
on public.company_settings(org_id)
where org_id is not null;

create unique index if not exists staff_salaries_org_uidx
on public.staff_salaries(org_id)
where org_id is not null;

create or replace function public.create_organization(
  organization_name text,
  initial_settings jsonb default '{}'::jsonb,
  initial_salaries jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  next_org_id uuid;
  trimmed_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  trimmed_name := nullif(trim(organization_name), '');
  if trimmed_name is null then
    raise exception 'Organization name is required.';
  end if;

  insert into public.organizations (name, created_by)
  values (trimmed_name, auth.uid())
  returning id into next_org_id;

  insert into public.organization_memberships (organization_id, user_id, role)
  values (next_org_id, auth.uid(), 'owner');

  insert into public.company_settings (user_id, org_id, settings)
  values (auth.uid(), next_org_id, initial_settings)
  on conflict (org_id) where org_id is not null do update
  set settings = excluded.settings;

  insert into public.staff_salaries (user_id, org_id, salaries)
  values (auth.uid(), next_org_id, initial_salaries)
  on conflict (org_id) where org_id is not null do update
  set salaries = excluded.salaries;

  return next_org_id;
end;
$$;
