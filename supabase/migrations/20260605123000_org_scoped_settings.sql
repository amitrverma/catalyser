-- Consolidate organization settings toward one row per organization.
-- Existing personal/null-org settings remain per user.

with ranked_company_settings as (
  select
    ctid,
    row_number() over (partition by org_id order by updated_at desc) as row_number
  from public.company_settings
  where org_id is not null
)
delete from public.company_settings settings
using ranked_company_settings ranked
where settings.ctid = ranked.ctid
  and ranked.row_number > 1;

with ranked_staff_salaries as (
  select
    ctid,
    row_number() over (partition by org_id order by updated_at desc) as row_number
  from public.staff_salaries
  where org_id is not null
)
delete from public.staff_salaries salaries
using ranked_staff_salaries ranked
where salaries.ctid = ranked.ctid
  and ranked.row_number > 1;

create unique index if not exists company_settings_org_uidx
on public.company_settings(org_id)
where org_id is not null;

create unique index if not exists staff_salaries_org_uidx
on public.staff_salaries(org_id)
where org_id is not null;
