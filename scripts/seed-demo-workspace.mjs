import pg from 'pg';
import { createHash } from 'node:crypto';

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

function deterministicUuid(input) {
  const bytes = createHash('sha256').update(input).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function buildIds(namespace) {
  const id = (key) => deterministicUuid(`catalyser-demo:${namespace}:${key}`);
  return {
    villa: id('villa'),
    aura: id('aura'),
    summit: id('summit'),
    contactSarah: id('contact-sarah'),
    contactArthur: id('contact-arthur'),
    contactElena: id('contact-elena'),
    contactElite: id('contact-elite'),
    contactTesla: id('contact-tesla'),
    contactAero: id('contact-aero'),
    contactSierra: id('contact-sierra'),
    contactPacific: id('contact-pacific'),
    contactMetro: id('contact-metro'),
    pay1: id('pay-1'),
    pay2: id('pay-2'),
    pay3: id('pay-3'),
    pay4: id('pay-4'),
    pay5: id('pay-5'),
    pay6: id('pay-6'),
    pay7: id('pay-7'),
    pay8: id('pay-8'),
    pay9: id('pay-9'),
    doc1: id('doc-1'),
    doc2: id('doc-2'),
    doc3: id('doc-3'),
  };
}

const ids = buildIds(process.env.DEMO_SEED_EMAIL || 'default');

const demoProjectNames = [
  'Villa Elixir - Minimalist Residence',
  'Aura Penthouse - Interior Renovation',
  'Summit Office Lounge',
];

const demoContactNames = [
  'Sarah Jenkins',
  'Arthur Vance',
  'Elena Rostova',
  'Elite Timber & Joinery',
  'Tesla Drywall & Acoustic',
  'Aero Duct & HVAC Services',
  'Sierra Plywood & Veneer',
  'Pacific Marble & Granite',
  'Metropolis Iron & Rebar',
];

const projects = [
  [
    ids.villa,
    'Villa Elixir - Minimalist Residence',
    'High-end 4-bedroom villa project focusing on minimalist concrete, cedar wood slats, and smart building features.',
    'ongoing',
    450000,
    'Sarah Jenkins',
    '88 Overlook Terrace, Pasadena, CA',
    '2026-03-12',
  ],
  [
    ids.aura,
    'Aura Penthouse - Interior Renovation',
    'Full luxury interior styling, acoustic wood panels, marble flooring, custom kitchen cabinets, and bespoke dimming fixtures.',
    'completed',
    180000,
    'Arthur Vance',
    'Penthouse B, 412 Grand Ave, Los Angeles, CA',
    '2026-01-05',
  ],
  [
    ids.summit,
    'Summit Office Lounge',
    'Corporate lounge renovation, biophilic plant walls, custom glass partitions, and ergonomic workspace acoustics.',
    'onhold',
    290000,
    'Elena Rostova (Vertex Group)',
    'Level 14, 100 Wilshire Blvd, Santa Monica, CA',
    '2026-04-20',
  ],
];

const contacts = [
  [ids.contactSarah, 'Sarah Jenkins', 'client', '+1 (555) 234-9876', 'sjenkins@gmail.com', 'Jenkins LLC'],
  [ids.contactArthur, 'Arthur Vance', 'client', '+1 (555) 762-3849', 'arthur.vance@vanceholdings.com', 'Vance Partners'],
  [ids.contactElena, 'Elena Rostova', 'client', '+1 (555) 432-8472', 'erostova@vertex.co', 'Vertex Group'],
  [ids.contactElite, 'Elite Timber & Joinery', 'vendor', '+1 (555) 901-2321', 'brian@elitetimber.com', 'Elite Timber'],
  [ids.contactTesla, 'Tesla Drywall & Acoustic', 'vendor', '+1 (555) 890-4322', 'billing@teslaspaces.com', 'Tesla Drywall LLC'],
  [ids.contactAero, 'Aero Duct & HVAC Services', 'vendor', '+1 (555) 472-8392', 'service@aeroduct.com', 'Aero Duct Inc.'],
  [ids.contactSierra, 'Sierra Plywood & Veneer', 'supplier', '+1 (555) 123-4567', 'orders@sierraplywood.com', 'Sierra Forest Products'],
  [ids.contactPacific, 'Pacific Marble & Granite', 'supplier', '+1 (555) 987-6543', 'showroom@pacificmarble.com', 'Pacific Stone Group'],
  [ids.contactMetro, 'Metropolis Iron & Rebar', 'supplier', '+1 (555) 456-7890', 'sales@metroiron.com', 'Metropolis Steel Ltd'],
];

const payments = [
  [ids.pay1, ids.villa, 'in', 150000, 'Sarah Jenkins', 'client', 'bank_transfer', 'First retainer and design phase sign-off milestone payment', '2026-03-15'],
  [ids.pay2, ids.villa, 'in', 100000, 'Sarah Jenkins', 'client', 'bank_transfer', 'Milestone 2 - Foundation concrete and framing launch', '2026-04-18'],
  [ids.pay3, ids.villa, 'out', 35000, 'Elite Timber & Joinery', 'vendor', 'cheque', 'Payment for bespoke cedar support column trusses', '2026-04-22'],
  [ids.pay4, ids.villa, 'out', 62000, 'Sierra Plywood & Veneer', 'supplier', 'bank_transfer', 'Premium walnut cabinetry panels delivery', '2026-05-10'],
  [ids.pay5, ids.aura, 'in', 90000, 'Arthur Vance', 'client', 'upi', 'Advance billing for interior marble floor tiles and fixtures', '2026-01-08'],
  [ids.pay6, ids.aura, 'in', 90000, 'Arthur Vance', 'client', 'bank_transfer', 'Final project completion and walkthrough clearance', '2026-02-28'],
  [ids.pay7, ids.aura, 'out', 42000, 'Tesla Drywall & Acoustic', 'vendor', 'bank_transfer', 'Acoustic partition sound blocking ceiling panel grid installation', '2026-01-20'],
  [ids.pay8, ids.aura, 'out', 58000, 'Pacific Marble & Granite', 'supplier', 'cheque', 'Calacatta Viola marble kitchen island slabs', '2026-01-25'],
  [ids.pay9, ids.aura, 'out', 15000, 'Aero Duct & HVAC Services', 'vendor', 'card', 'Linear bar diffusers and clean filter vent placements', '2026-02-12'],
];

const documents = [
  [ids.doc1, ids.villa, 'Villa Elixir Signed Proposal.txt', 'contract', 64, '2026-03-12', 'text/plain', 'data:text/plain;charset=utf-8,Villa%20Elixir%20signed%20proposal%20placeholder'],
  [ids.doc2, ids.aura, 'Aura Penthouse Completion Note.txt', 'receipt', 70, '2026-02-28', 'text/plain', 'data:text/plain;charset=utf-8,Aura%20Penthouse%20completion%20note%20placeholder'],
  [ids.doc3, ids.summit, 'Summit Office Scope.txt', 'estimate', 58, '2026-04-20', 'text/plain', 'data:text/plain;charset=utf-8,Summit%20Office%20scope%20placeholder'],
];

const demoSettings = {
  cc_company_name: 'Catalyser Design',
  cc_company_address: 'Unit number 809, 99 Avenue, Lullanagar, Pune - 411040',
  cc_company_gst: '27AAECC4524C1Z9',
  cc_company_email: 'contact@catalyserdesign.com',
  cc_company_phone: '+91 98765 43210',
  cc_bank_account_name: 'Catalyser Design',
  cc_bank_name: 'HDFC Bank Ltd',
  cc_bank_account_number: '50200012345678',
  cc_bank_account_type: 'Current',
  cc_bank_ifsc: 'HDFC0001234',
  cc_tax_rate: '20',
  cc_gst_rate: '18',
  cc_selected_fy: 'all',
  cc_custom_overheads: JSON.stringify([
    { id: 'oh-1', label: 'Pro Design Softwares (AutoCAD, Revit, SketchUp)', amount: 15400 },
    { id: 'oh-2', label: 'Studio Base Rent & Electric Utilities', amount: 35000 },
    { id: 'oh-3', label: 'Admin Staff & Site Logistics Reimbursement', amount: 8000 },
  ]),
};

const demoSalaries = [
  { id: 'st-1', name: 'Ar. Rohit Sharma', role: 'Senior Landscape Architect', salary: 55000 },
  { id: 'st-2', name: 'Ananya Mehta', role: 'Interior & Space Designer', salary: 38000 },
  { id: 'st-3', name: 'Kabir Verma', role: '3D Visualiser & Renderer', salary: 28000 },
];

async function createFirstWorkspaceIfMissing() {
  const userResult = await client.query(`
    select id, email
    from auth.users
    order by created_at asc
    limit 1
  `);
  const user = userResult.rows[0];
  if (!user) throw new Error('No auth users exist in this Supabase project.');

  const orgResult = await client.query(
    `
      insert into public.organizations (name, created_by)
      values ($1, $2)
      returning id
    `,
    [`${(user.email || 'Personal').split('@')[0]}'s Workspace`, user.id],
  );

  await client.query(
    `
      insert into public.organization_memberships (organization_id, user_id, role)
      values ($1, $2, 'owner')
      on conflict (organization_id, user_id) do nothing
    `,
    [orgResult.rows[0].id, user.id],
  );

  return { user_id: user.id, org_id: orgResult.rows[0].id };
}

async function getTargetWorkspaces() {
  const targetEmail = process.env.DEMO_SEED_EMAIL;
  const seedAllBlank = process.env.DEMO_SEED_ALL_BLANK === '1';

  let membershipQuery = `
    select membership.user_id, membership.organization_id as org_id
    from public.organization_memberships membership
    join auth.users auth_user on auth_user.id = membership.user_id
  `;
  const params = [];

  if (targetEmail) {
    params.push(targetEmail);
    membershipQuery += ` where auth_user.email = $1`;
  }

  membershipQuery += ` order by membership.created_at asc`;

  const membership = await client.query(membershipQuery, params);
  if (targetEmail && membership.rows.length === 0) {
    throw new Error(`No workspace found for ${targetEmail}.`);
  }
  if (membership.rows.length > 0) {
    if (targetEmail) return [membership.rows[0]];
    if (seedAllBlank) return membership.rows;
    return [membership.rows[0]];
  }

  return [await createFirstWorkspaceIfMissing()];
}

function mergeSettings(existing) {
  const next = { ...(existing || {}) };
  for (const [key, value] of Object.entries(demoSettings)) {
    if (next[key] === undefined || next[key] === null || next[key] === '') {
      next[key] = value;
    }
  }
  return next;
}

async function seedWorkspace(target) {
  await client.query('begin');
  const userId = target.user_id;
  const orgId = target.org_id || null;

  await client.query(
    `
      delete from public.contacts
      where user_id = $1
        and coalesce(org_id::text, '') = coalesce($2::text, '')
        and name = any($3::text[])
    `,
    [userId, orgId, demoContactNames],
  );

  await client.query(
    `
      delete from public.projects
      where user_id = $1
        and coalesce(org_id::text, '') = coalesce($2::text, '')
        and name = any($3::text[])
    `,
    [userId, orgId, demoProjectNames],
  );

  for (const project of projects) {
    await client.query(
      `
        insert into public.projects (id, user_id, org_id, name, description, status, budget, client_name, address, created_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [project[0], userId, orgId, ...project.slice(1)],
    );
  }

  for (const contact of contacts) {
    await client.query(
      `
        insert into public.contacts (id, user_id, org_id, name, role, phone, email, company)
        values ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [contact[0], userId, orgId, ...contact.slice(1)],
    );
  }

  for (const payment of payments) {
    await client.query(
      `
        insert into public.payments (id, user_id, org_id, project_id, type, amount, party, party_role, payment_mode, remark, payment_date)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [payment[0], userId, orgId, ...payment.slice(1)],
    );
  }

  for (const document of documents) {
    await client.query(
      `
        insert into public.documents (id, user_id, org_id, project_id, name, category, size, uploaded_at, sync_status, file_type, data_url)
        values ($1, $2, $3, $4, $5, $6, $7, $8, 'synced', $9, $10)
      `,
      [document[0], userId, orgId, ...document.slice(1)],
    );
  }

  const existingSettingsResult = await client.query(
    `
      select settings
      from public.company_settings
      where user_id = $1 and org_id is not distinct from $2
      limit 1
    `,
    [userId, orgId],
  );
  const settings = mergeSettings(existingSettingsResult.rows[0]?.settings || {});

  await client.query(
    `
      insert into public.company_settings (user_id, org_id, settings)
      values ($1, $2, $3::jsonb)
      on conflict (user_id, org_id) do update
      set settings = excluded.settings
    `,
    [userId, orgId, JSON.stringify(settings)],
  );

  const existingSalariesResult = await client.query(
    `
      select salaries
      from public.staff_salaries
      where user_id = $1 and org_id is not distinct from $2
      limit 1
    `,
    [userId, orgId],
  );
  const existingSalaries = existingSalariesResult.rows[0]?.salaries;
  const salaries = Array.isArray(existingSalaries) && existingSalaries.length > 0 ? existingSalaries : demoSalaries;

  await client.query(
    `
      insert into public.staff_salaries (user_id, org_id, salaries)
      values ($1, $2, $3::jsonb)
      on conflict (user_id, org_id) do update
      set salaries = excluded.salaries
    `,
    [userId, orgId, JSON.stringify(salaries)],
  );

  await client.query('commit');

  const counts = await client.query(
    `
      select
        (select count(*) from public.projects where user_id = $1 and org_id is not distinct from $2 and name = any($3::text[])) as demo_projects,
        (select count(*) from public.contacts where user_id = $1 and org_id is not distinct from $2 and name = any($4::text[])) as demo_contacts,
        (select count(*) from public.payments where user_id = $1 and org_id is not distinct from $2 and project_id = any($5::uuid[])) as demo_payments,
        (select count(*) from public.documents where user_id = $1 and org_id is not distinct from $2 and project_id = any($5::uuid[])) as demo_documents
    `,
    [userId, orgId, demoProjectNames, demoContactNames, [ids.villa, ids.aura, ids.summit]],
  );

  console.log(
    JSON.stringify({
      userId,
      orgId,
      ...counts.rows[0],
    }),
  );
}

await client.connect();

try {
  const targets = await getTargetWorkspaces();
  for (const target of targets) {
    await seedWorkspace(target);
  }
} catch (error) {
  try {
    await client.query('rollback');
  } catch {
    // Ignore rollback failures when no transaction is open.
  }
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}
