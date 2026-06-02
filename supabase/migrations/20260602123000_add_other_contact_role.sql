-- Add generic Other classification for contacts.

alter table public.contacts
  drop constraint if exists contacts_role_check;

alter table public.contacts
  add constraint contacts_role_check
  check (role in ('client', 'vendor', 'supplier', 'contractor', 'site_worker', 'other'));
