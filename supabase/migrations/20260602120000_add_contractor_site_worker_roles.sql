-- Add contractor and site worker classifications for contacts and payment ledgers.

alter table public.contacts
  drop constraint if exists contacts_role_check;

alter table public.contacts
  add constraint contacts_role_check
  check (role in ('client', 'vendor', 'supplier', 'contractor', 'site_worker', 'other'));

alter table public.payments
  drop constraint if exists payments_party_role_check;

alter table public.payments
  add constraint payments_party_role_check
  check (party_role in ('client', 'vendor', 'supplier', 'contractor', 'site_worker', 'other'));
