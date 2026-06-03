-- Catalyser Supabase schema and Row Level Security policies.
-- Run this in the Supabase SQL editor before setting Vercel env vars.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null check (status in ('ongoing', 'completed', 'onhold')),
  budget numeric(14, 2) not null default 0,
  client_name text not null,
  address text,
  created_at date not null default current_date,
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('client', 'vendor', 'supplier', 'contractor', 'site_worker', 'other')),
  phone text not null default '',
  email text not null default '',
  company text,
  gst_number text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('in', 'out')),
  amount numeric(14, 2) not null check (amount >= 0),
  party text not null,
  party_role text not null check (party_role in ('client', 'vendor', 'supplier', 'contractor', 'site_worker', 'other')),
  payment_mode text not null check (payment_mode in ('cash', 'bank_transfer', 'upi', 'cheque', 'card')),
  remark text not null default '',
  payment_date date not null default current_date,
  bill_photo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  category text not null check (category in ('invoice', 'receipt', 'blueprint', 'estimate', 'contract', 'other')),
  size bigint not null default 0,
  uploaded_at date not null default current_date,
  sync_status text not null check (sync_status in ('synced', 'syncing', 'failed')),
  file_type text not null,
  data_url text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_salaries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  salaries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists contacts_user_id_idx on public.contacts(user_id);
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_project_id_idx on public.payments(project_id);
create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists documents_project_id_idx on public.documents(project_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_contacts_updated_at on public.contacts;
create trigger set_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

drop trigger if exists set_company_settings_updated_at on public.company_settings;
create trigger set_company_settings_updated_at
before update on public.company_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_staff_salaries_updated_at on public.staff_salaries;
create trigger set_staff_salaries_updated_at
before update on public.staff_salaries
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.contacts enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;
alter table public.company_settings enable row level security;
alter table public.staff_salaries enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own projects" on public.projects;
create policy "Users manage own projects"
on public.projects for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own contacts" on public.contacts;
create policy "Users manage own contacts"
on public.contacts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own payments" on public.payments;
create policy "Users manage own payments"
on public.payments for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own documents" on public.documents;
create policy "Users manage own documents"
on public.documents for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own company settings" on public.company_settings;
create policy "Users manage own company settings"
on public.company_settings for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own staff salaries" on public.staff_salaries;
create policy "Users manage own staff salaries"
on public.staff_salaries for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('catalyser-documents', 'catalyser-documents', false)
on conflict (id) do nothing;

drop policy if exists "Users read own Catalyser files" on storage.objects;
create policy "Users read own Catalyser files"
on storage.objects for select
using (
  bucket_id = 'catalyser-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users upload own Catalyser files" on storage.objects;
create policy "Users upload own Catalyser files"
on storage.objects for insert
with check (
  bucket_id = 'catalyser-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users update own Catalyser files" on storage.objects;
create policy "Users update own Catalyser files"
on storage.objects for update
using (
  bucket_id = 'catalyser-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'catalyser-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users delete own Catalyser files" on storage.objects;
create policy "Users delete own Catalyser files"
on storage.objects for delete
using (
  bucket_id = 'catalyser-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
