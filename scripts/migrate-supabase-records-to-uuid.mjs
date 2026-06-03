import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const appTables = [
  'projects',
  'contacts',
  'payments',
  'documents',
  'company_settings',
  'staff_salaries',
  'organizations',
  'organization_memberships',
  'profiles',
];

async function tableExists(tableName) {
  const result = await client.query(
    `
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = $1
      ) as exists
    `,
    [tableName],
  );
  return Boolean(result.rows[0]?.exists);
}

async function readTable(tableName) {
  if (!(await tableExists(tableName))) return [];
  const result = await client.query(`select * from public.${tableName}`);
  return result.rows;
}

async function getColumnType(tableName, columnName) {
  const result = await client.query(
    `
      select data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
    `,
    [tableName, columnName],
  );
  return result.rows[0]?.data_type || null;
}

function backupPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(process.cwd(), 'backups', `supabase-before-uuid-migration-${stamp}.json`);
}

function keyForOwner(row) {
  return `${row.user_id || 'unknown-user'}::${row.org_id || 'no-org'}`;
}

function buildProjectMaps(projects) {
  const oldProjectIdToUuid = new Map();
  const oldProjectRowsByKey = new Map();
  const nextProjects = projects.map((project) => {
    const id = randomUUID();
    oldProjectIdToUuid.set(project.id, id);
    oldProjectRowsByKey.set(project.id, project);
    return { ...project, id };
  });

  return { oldProjectIdToUuid, oldProjectRowsByKey, nextProjects };
}

function ensureFallbackProject({ oldProjectId, ownerRow, nextProjects, oldProjectIdToUuid }) {
  if (oldProjectIdToUuid.has(oldProjectId)) {
    return oldProjectIdToUuid.get(oldProjectId);
  }

  const id = randomUUID();
  oldProjectIdToUuid.set(oldProjectId, id);
  nextProjects.push({
    id,
    user_id: ownerRow.user_id,
    org_id: ownerRow.org_id || null,
    name: `Recovered Project ${oldProjectId}`,
    description: 'Created during UUID migration for records whose original project was missing.',
    status: 'onhold',
    budget: 0,
    client_name: ownerRow.party || 'Recovered Client',
    address: null,
    created_at: new Date().toISOString().slice(0, 10),
  });

  return id;
}

async function insertRows(tableName, rows) {
  if (rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const rowPlaceholders = columns.map((column, columnIndex) => {
      values.push(row[column]);
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    });
    return `(${rowPlaceholders.join(', ')})`;
  });

  await client.query(
    `
      insert into public.${tableName} (${columns.map((column) => `"${column}"`).join(', ')})
      values ${placeholders.join(', ')}
    `,
    values,
  );
}

function stripTimestamps(row) {
  const { created_at: _createdAt, updated_at: _updatedAt, ...rest } = row;
  return rest;
}

async function recreateAppTables() {
  await client.query(`
    drop table if exists public.documents cascade;
    drop table if exists public.payments cascade;
    drop table if exists public.contacts cascade;
    drop table if exists public.projects cascade;

    create table public.projects (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      org_id uuid references public.organizations(id) on delete cascade,
      name text not null,
      description text not null default '',
      status text not null check (status in ('ongoing', 'completed', 'onhold')),
      budget numeric(14, 2) not null default 0,
      client_name text not null,
      address text,
      created_at date not null default current_date,
      updated_at timestamptz not null default now()
    );

    create table public.contacts (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      org_id uuid references public.organizations(id) on delete cascade,
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

    create table public.payments (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      org_id uuid references public.organizations(id) on delete cascade,
      project_id uuid not null references public.projects(id) on delete cascade,
      type text not null check (type in ('in', 'out')),
      amount numeric(14, 2) not null check (amount >= 0),
      party text not null,
      party_role text not null check (party_role in ('client', 'vendor', 'supplier', 'contractor', 'site_worker', 'other')),
      payment_mode text not null check (payment_mode in ('cash', 'bank_transfer', 'upi', 'cheque', 'card')),
      remark text not null default '',
      payment_date date not null default current_date,
      bill_photo text,
      bill_photo_storage_path text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table public.documents (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      org_id uuid references public.organizations(id) on delete cascade,
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

    create index projects_user_id_idx on public.projects(user_id);
    create index projects_org_id_idx on public.projects(org_id);
    create index contacts_user_id_idx on public.contacts(user_id);
    create index contacts_org_id_idx on public.contacts(org_id);
    create index payments_user_id_idx on public.payments(user_id);
    create index payments_project_id_idx on public.payments(project_id);
    create index payments_org_id_idx on public.payments(org_id);
    create index documents_user_id_idx on public.documents(user_id);
    create index documents_project_id_idx on public.documents(project_id);
    create index documents_org_id_idx on public.documents(org_id);

    create trigger set_projects_updated_at
    before update on public.projects
    for each row execute function public.set_updated_at();

    create trigger set_contacts_updated_at
    before update on public.contacts
    for each row execute function public.set_updated_at();

    create trigger set_payments_updated_at
    before update on public.payments
    for each row execute function public.set_updated_at();

    create trigger set_documents_updated_at
    before update on public.documents
    for each row execute function public.set_updated_at();

    alter table public.projects enable row level security;
    alter table public.contacts enable row level security;
    alter table public.payments enable row level security;
    alter table public.documents enable row level security;

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
  `);
}

async function dedupeSettingsTables() {
  await client.query(`
    delete from public.company_settings target
    using public.company_settings other
    where target.ctid < other.ctid
      and target.user_id = other.user_id
      and target.org_id is not distinct from other.org_id;

    delete from public.staff_salaries target
    using public.staff_salaries other
    where target.ctid < other.ctid
      and target.user_id = other.user_id
      and target.org_id is not distinct from other.org_id;

    drop index if exists public.company_settings_user_org_uidx;
    drop index if exists public.staff_salaries_user_org_uidx;

    create unique index company_settings_user_org_uidx
    on public.company_settings(user_id, org_id) nulls not distinct;

    create unique index staff_salaries_user_org_uidx
    on public.staff_salaries(user_id, org_id) nulls not distinct;
  `);
}

async function main() {
  await client.connect();

  const idType = await getColumnType('projects', 'id');
  if (idType === 'uuid') {
    console.log('projects.id is already uuid. No record ID migration needed.');
    await dedupeSettingsTables();
    await client.end();
    return;
  }

  const backup = {};
  for (const tableName of appTables) {
    backup[tableName] = await readTable(tableName);
  }

  const filePath = backupPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(backup, null, 2));

  const projects = backup.projects || [];
  const contacts = backup.contacts || [];
  const payments = backup.payments || [];
  const documents = backup.documents || [];

  const { oldProjectIdToUuid, nextProjects } = buildProjectMaps(projects);

  for (const payment of payments) {
    ensureFallbackProject({
      oldProjectId: payment.project_id,
      ownerRow: payment,
      nextProjects,
      oldProjectIdToUuid,
    });
  }

  for (const document of documents) {
    ensureFallbackProject({
      oldProjectId: document.project_id,
      ownerRow: document,
      nextProjects,
      oldProjectIdToUuid,
    });
  }

  const nextContacts = contacts.map((contact) => ({
    ...contact,
    id: randomUUID(),
  }));

  const nextPayments = payments.map((payment) => ({
    ...payment,
    id: randomUUID(),
    project_id: oldProjectIdToUuid.get(payment.project_id),
  }));

  const nextDocuments = documents.map((document) => ({
    ...document,
    id: randomUUID(),
    project_id: oldProjectIdToUuid.get(document.project_id),
  }));

  await client.query('begin');
  try {
    await recreateAppTables();
    await dedupeSettingsTables();

    await insertRows('projects', nextProjects.map(stripTimestamps));
    await insertRows('contacts', nextContacts.map(stripTimestamps));
    await insertRows('payments', nextPayments.map(stripTimestamps));
    await insertRows('documents', nextDocuments.map(stripTimestamps));

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }

  const counts = {};
  for (const tableName of ['projects', 'contacts', 'payments', 'documents']) {
    const result = await client.query(`select count(*)::int as count from public.${tableName}`);
    counts[tableName] = result.rows[0].count;
  }

  const typeCheck = await Promise.all(
    ['projects', 'contacts', 'payments', 'documents'].map(async (tableName) => [
      tableName,
      await getColumnType(tableName, 'id'),
    ]),
  );

  console.log(JSON.stringify({ backup: filePath, counts, idTypes: Object.fromEntries(typeCheck) }, null, 2));
  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  await client.end().catch(() => {});
  process.exit(1);
});
