import { Project, Payment, Contact, CloudDocument, DbData } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';
import { ContactRow, DocumentRow, PaymentRow, ProjectRow } from './supabaseRows';
import { ensureActiveOrganization } from './orgs';

function createRecordId() {
  return crypto.randomUUID();
}

const SEED_PROJECT_IDS = {
  villaElixir: createRecordId(),
  auraPenthouse: createRecordId(),
  summitOffice: createRecordId(),
} as const;

const INITIAL_PROJECTS: Project[] = [
  {
    id: SEED_PROJECT_IDS.villaElixir,
    name: 'Villa Elixir - Minimalist Residence',
    description: 'High-end 4-bedroom villa project focusing on minimalist concrete, cedar wood slats, and smart building features.',
    status: 'ongoing',
    budget: 450000,
    clientName: 'Sarah Jenkins',
    address: '88 Overlook Terrace, Pasadena, CA',
    createdAt: '2026-03-12',
  },
  {
    id: SEED_PROJECT_IDS.auraPenthouse,
    name: 'Aura Penthouse - Interior Renovation',
    description: 'Full luxury interior styling, acoustic wood panels, marble flooring, custom kitchen cabinets, and bespoke dimming fixtures.',
    status: 'completed',
    budget: 180000,
    clientName: 'Arthur Vance',
    address: 'Penthouse B, 412 Grand Ave, Los Angeles, CA',
    createdAt: '2026-01-05',
  },
  {
    id: SEED_PROJECT_IDS.summitOffice,
    name: 'Summit Office Lounge',
    description: 'Corporate lounge renovation, biophilic plant walls, custom glass partitions, and ergonomic workspace acoustics.',
    status: 'onhold',
    budget: 290000,
    clientName: 'Elena Rostova (Vertex Group)',
    address: 'Level 14, 100 Wilshire Blvd, Santa Monica, CA',
    createdAt: '2026-04-20',
  }
];

const INITIAL_CONTACTS: Contact[] = [
  // Clients
  { id: createRecordId(), name: 'Sarah Jenkins', role: 'client', phone: '+1 (555) 234-9876', email: 'sjenkins@gmail.com', company: 'Jenkins LLC' },
  { id: createRecordId(), name: 'Arthur Vance', role: 'client', phone: '+1 (555) 762-3849', email: 'arthur.vance@vanceholdings.com', company: 'Vance Partners' },
  { id: createRecordId(), name: 'Elena Rostova', role: 'client', phone: '+1 (555) 432-8472', email: 'erostova@vertex.co', company: 'Vertex Group' },
  // Vendors
  { id: createRecordId(), name: 'Elite Timber & Joinery', role: 'vendor', phone: '+1 (555) 901-2321', email: 'brian@elitetimber.com', company: 'Elite Timber' },
  { id: createRecordId(), name: 'Tesla Drywall & Acoustic', role: 'vendor', phone: '+1 (555) 890-4322', email: 'billing@teslaspaces.com', company: 'Tesla Drywall LLC' },
  { id: createRecordId(), name: 'Aero Duct & HVAC Services', role: 'vendor', phone: '+1 (555) 472-8392', email: 'service@aeroduct.com', company: 'Aero Duct Inc.' },
  // Material Suppliers
  { id: createRecordId(), name: 'Sierra Plywood & Veneer', role: 'supplier', phone: '+1 (555) 123-4567', email: 'orders@sierraplywood.com', company: 'Sierra Forest Products' },
  { id: createRecordId(), name: 'Pacific Marble & Granite', role: 'supplier', phone: '+1 (555) 987-6543', email: 'showroom@pacificmarble.com', company: 'Pacific Stone Group' },
  { id: createRecordId(), name: 'Metropolis Iron & Rebar', role: 'supplier', phone: '+1 (555) 456-7890', email: 'sales@metroiron.com', company: 'Metropolis Steel Ltd' }
];

const INITIAL_PAYMENTS: Payment[] = [
  // Villa Elixir
  {
    id: createRecordId(),
    projectId: SEED_PROJECT_IDS.villaElixir,
    type: 'in',
    amount: 150000,
    party: 'Sarah Jenkins',
    partyRole: 'client',
    paymentMode: 'bank_transfer',
    remark: 'First retainer & design phase sign-off milestone payment',
    date: '2026-03-15',
  },
  {
    id: createRecordId(),
    projectId: SEED_PROJECT_IDS.villaElixir,
    type: 'in',
    amount: 100000,
    party: 'Sarah Jenkins',
    partyRole: 'client',
    paymentMode: 'bank_transfer',
    remark: 'Milestone 2 - Foundation concrete and framing launch',
    date: '2026-04-18',
  },
  {
    id: createRecordId(),
    projectId: SEED_PROJECT_IDS.villaElixir,
    type: 'out',
    amount: 35000,
    party: 'Elite Timber & Joinery',
    partyRole: 'vendor',
    paymentMode: 'cheque',
    remark: 'Payment for bespoke cedar support column trusses',
    date: '2026-04-22',
    billPhoto: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="100%" height="100%"><rect width="100%" height="100%" fill="%23f8fafc" rx="16"/><rect x="20" y="20" width="360" height="460" fill="%23ffffff" rx="12" stroke="%23e2e8f0" stroke-width="2"/><rect x="40" y="40" width="40" height="40" fill="%23f59e0b" rx="8"/><text x="48" y="66" font-family="sans-serif" font-weight="950" font-size="22" fill="%23ffffff">E</text><text x="92" y="58" font-family="sans-serif" font-weight="bold" font-size="14" fill="%231e293b">ELITE TIMBER &amp; JOINERY</text><text x="92" y="73" font-family="sans-serif" font-size="10" fill="%2364748b">Tax Invoice %23ET-9921</text><line x1="40" y1="100" x2="360" y2="100" stroke="%23f1f5f9" stroke-width="2"/><text x="40" y="130" font-family="sans-serif" font-weight="bold" font-size="10" fill="%2394a3b8">BILLED TO:</text><text x="40" y="146" font-family="sans-serif" font-weight="bold" font-size="12" fill="%23334155">Alpha Construction Ltd</text><text x="220" y="130" font-family="sans-serif" font-weight="bold" font-size="10" fill="%2394a3b8">DATE OF ISSUE:</text><text x="220" y="146" font-family="sans-serif" font-size="11" fill="%23334155">2026-04-22</text><rect x="40" y="180" width="320" height="30" fill="%23f8fafc" rx="6"/><text x="50" y="199" font-family="sans-serif" font-weight="bold" font-size="10" fill="%23475569">Item &amp; Description</text><text x="340" y="199" font-family="sans-serif" font-weight="bold" font-size="10" fill="%23475569" text-anchor="end">Total</text><text x="50" y="240" font-family="sans-serif" font-weight="bold" font-size="11" fill="%23334155">Bespoke Cedar Support columns</text><text x="50" y="255" font-family="sans-serif" font-size="9" fill="%2394a3b8">Premium structural grade timber</text><text x="340" y="245" font-family="sans-serif" font-weight="bold" font-size="11" fill="%231e293b" text-anchor="end">₹35,000</text><line x1="40" y1="290" x2="360" y2="290" stroke="%23f1f5f9" stroke-width="1"/><text x="240" y="320" font-family="sans-serif" font-weight="bold" font-size="11" fill="%23475569">Subtotal:</text><text x="340" y="320" font-family="sans-serif" font-weight="bold" font-size="11" fill="%23334155" text-anchor="end">₹35,000</text><text x="240" y="340" font-family="sans-serif" font-size="11" fill="%23475569">Tax GST (0%):</text><text x="340" y="340" font-family="sans-serif" font-size="11" fill="%23334155" text-anchor="end">₹0</text><line x1="240" y1="355" x2="360" y2="355" stroke="%23cbd5e1" stroke-width="1"/><text x="240" y="380" font-family="sans-serif" font-weight="900" font-size="14" fill="%231e293b">TOTAL DUE:</text><text x="340" y="380" font-family="sans-serif" font-weight="900" font-size="14" fill="%23059669" text-anchor="end">₹35,000</text><rect x="40" y="415" width="150" height="35" fill="none" stroke="%2310b981" stroke-width="2" stroke-dasharray="4 2" rx="6"/><text x="115" y="437" font-family="sans-serif" font-weight="900" font-size="11" fill="%2310b981" text-anchor="middle">PAID &amp; COMPLETED</text></svg>`,
  },
  {
    id: createRecordId(),
    projectId: SEED_PROJECT_IDS.villaElixir,
    type: 'out',
    amount: 62000,
    party: 'Sierra Plywood & Veneer',
    partyRole: 'supplier',
    paymentMode: 'bank_transfer',
    remark: 'Premium walnut cabinetry panels delivery',
    date: '2026-05-10',
    billPhoto: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="100%" height="100%"><rect width="100%" height="100%" fill="%23f8fafc" rx="16"/><rect x="20" y="20" width="360" height="460" fill="%23ffffff" rx="12" stroke="%23e2e8f0" stroke-width="2"/><rect x="40" y="40" width="40" height="40" fill="%230974c6" rx="8"/><text x="48" y="66" font-family="sans-serif" font-weight="950" font-size="22" fill="%23ffffff">S</text><text x="92" y="58" font-family="sans-serif" font-weight="bold" font-size="14" fill="%231e293b">SIERRA PLYWOOD &amp; VENEER</text><text x="92" y="73" font-family="sans-serif" font-size="10" fill="%2364748b">Tax Invoice %23SP-2281</text><line x1="40" y1="100" x2="360" y2="100" stroke="%23f1f5f9" stroke-width="2"/><text x="40" y="130" font-family="sans-serif" font-weight="bold" font-size="10" fill="%2394a3b8">BILLED TO:</text><text x="40" y="146" font-family="sans-serif" font-weight="bold" font-size="12" fill="%23334155">Alpha Construction Ltd</text><text x="220" y="130" font-family="sans-serif" font-weight="bold" font-size="10" fill="%2394a3b8">DATE OF ISSUE:</text><text x="220" y="146" font-family="sans-serif" font-size="11" fill="%23334155">2026-05-10</text><rect x="40" y="180" width="320" height="30" fill="%23f8fafc" rx="6"/><text x="50" y="199" font-family="sans-serif" font-weight="bold" font-size="10" fill="%23475569">Item &amp; Description</text><text x="340" y="199" font-family="sans-serif" font-weight="bold" font-size="10" fill="%23475569" text-anchor="end">Total</text><text x="50" y="240" font-family="sans-serif" font-weight="bold" font-size="11" fill="%23334155">Premium Cabinetry Panels</text><text x="50" y="255" font-family="sans-serif" font-size="9" fill="%2394a3b8">Premium walnut veneers</text><text x="340" y="245" font-family="sans-serif" font-weight="bold" font-size="11" fill="%231e293b" text-anchor="end">₹62,000</text><line x1="40" y1="290" x2="360" y2="290" stroke="%23f1f5f9" stroke-width="1"/><text x="240" y="320" font-family="sans-serif" font-weight="bold" font-size="11" fill="%23475569">Subtotal:</text><text x="340" y="320" font-family="sans-serif" font-weight="bold" font-size="11" fill="%23334155" text-anchor="end">₹62,000</text><text x="240" y="340" font-family="sans-serif" font-size="11" fill="%23475569">Tax GST (0%):</text><text x="340" y="340" font-family="sans-serif" font-size="11" fill="%23334155" text-anchor="end">₹0</text><line x1="240" y1="355" x2="360" y2="355" stroke="%23cbd5e1" stroke-width="1"/><text x="240" y="380" font-family="sans-serif" font-weight="900" font-size="14" fill="%231e293b">TOTAL DUE:</text><text x="340" y="380" font-family="sans-serif" font-weight="900" font-size="14" fill="%23059669" text-anchor="end">₹62,000</text><rect x="40" y="415" width="150" height="35" fill="none" stroke="%2310b981" stroke-width="2" stroke-dasharray="4 2" rx="6"/><text x="115" y="437" font-family="sans-serif" font-weight="900" font-size="11" fill="%2310b981" text-anchor="middle">PAID &amp; COMPLETED</text></svg>`,
  },
  // Aura Penthouse
  {
    id: createRecordId(),
    projectId: SEED_PROJECT_IDS.auraPenthouse,
    type: 'in',
    amount: 90000,
    party: 'Arthur Vance',
    partyRole: 'client',
    paymentMode: 'upi',
    remark: 'Advance billing for interior marble floor tiles & fixtures',
    date: '2026-01-08',
  },
  {
    id: createRecordId(),
    projectId: SEED_PROJECT_IDS.auraPenthouse,
    type: 'in',
    amount: 90000,
    party: 'Arthur Vance',
    partyRole: 'client',
    paymentMode: 'bank_transfer',
    remark: 'Final project completion and walkthrough clearance',
    date: '2026-02-28',
  },
  {
    id: createRecordId(),
    projectId: SEED_PROJECT_IDS.auraPenthouse,
    type: 'out',
    amount: 42000,
    party: 'Tesla Drywall & Acoustic',
    partyRole: 'vendor',
    paymentMode: 'bank_transfer',
    remark: 'Acoustic partition sound blocking ceiling panel grid installation',
    date: '2026-01-20',
  },
  {
    id: createRecordId(),
    projectId: SEED_PROJECT_IDS.auraPenthouse,
    type: 'out',
    amount: 58000,
    party: 'Pacific Marble & Granite',
    partyRole: 'supplier',
    paymentMode: 'cheque',
    remark: 'Calacatta Viola marble kitchen island slabs',
    date: '2026-01-25',
  },
  {
    id: createRecordId(),
    projectId: SEED_PROJECT_IDS.auraPenthouse,
    type: 'out',
    amount: 15000,
    party: 'Aero Duct & HVAC Services',
    partyRole: 'vendor',
    paymentMode: 'card',
    remark: 'Linear bar diffusers and clean filter vent placements',
    date: '2026-02-12',
  }
];

const INITIAL_DOCUMENTS: CloudDocument[] = [];
let memoryDbData: DbData | null = null;

const EMPTY_DB_DATA: DbData = {
  projects: [],
  payments: [],
  contacts: [],
  documents: [],
};

export type DbLoadResult = {
  data: DbData;
  source: 'supabase' | 'local' | 'fallback';
  error?: unknown;
};

export type DbValidationResult =
  | { valid: true; data: DbData }
  | { valid: false; message: string };

const PROJECT_STATUSES = new Set(['ongoing', 'completed', 'onhold']);
const PAYMENT_TYPES = new Set(['in', 'out']);
const PAYMENT_MODES = new Set(['cash', 'bank_transfer', 'upi', 'cheque', 'card']);
const CONTACT_ROLES = new Set(['client', 'vendor', 'supplier', 'contractor', 'site_worker', 'other']);
const DOCUMENT_CATEGORIES = new Set(['invoice', 'receipt', 'blueprint', 'estimate', 'contract', 'other']);
const DOCUMENT_SYNC_STATUSES = new Set(['synced', 'syncing', 'failed']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function optionalString(value: unknown): string | undefined {
  return isString(value) && value.trim() ? value : undefined;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validationError(message: string): DbValidationResult {
  return { valid: false, message };
}

function assertUniqueIds(rows: Array<{ id: string }>, label: string): DbValidationResult | null {
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) {
      return validationError(`Duplicate ${label} id "${row.id}" in import payload.`);
    }
    ids.add(row.id);
  }
  return null;
}

export function validateDbDataPayload(value: unknown): DbValidationResult {
  if (!isRecord(value)) {
    return validationError('Backup payload must be an object.');
  }

  if (!Array.isArray(value.projects)) {
    return validationError('Backup payload must include a projects array.');
  }

  const rawPayments = Array.isArray(value.payments) ? value.payments : [];
  const rawContacts = Array.isArray(value.contacts) ? value.contacts : [];
  const rawDocuments = Array.isArray(value.documents) ? value.documents : [];

  const projects: Project[] = [];
  for (const [index, item] of value.projects.entries()) {
    if (!isRecord(item)) return validationError(`Project ${index + 1} must be an object.`);
    if (!isNonEmptyString(item.id)) return validationError(`Project ${index + 1} is missing a valid id.`);
    if (!isNonEmptyString(item.name)) return validationError(`Project "${item.id}" is missing a name.`);
    if (!PROJECT_STATUSES.has(String(item.status))) return validationError(`Project "${item.id}" has an invalid status.`);
    if (!isFiniteNumber(item.budget) || item.budget < 0) return validationError(`Project "${item.id}" has an invalid budget.`);
    if (!isNonEmptyString(item.clientName)) return validationError(`Project "${item.id}" is missing a client name.`);
    if (!isNonEmptyString(item.createdAt)) return validationError(`Project "${item.id}" is missing a created date.`);

    projects.push({
      id: item.id,
      name: item.name,
      description: isString(item.description) ? item.description : '',
      status: item.status as Project['status'],
      budget: item.budget,
      clientName: item.clientName,
      address: optionalString(item.address),
      createdAt: item.createdAt,
    });
  }

  const duplicateProject = assertUniqueIds(projects, 'project');
  if (duplicateProject) return duplicateProject;

  const projectIds = new Set(projects.map((project) => project.id));

  const payments: Payment[] = [];
  for (const [index, item] of rawPayments.entries()) {
    if (!isRecord(item)) return validationError(`Payment ${index + 1} must be an object.`);
    if (!isNonEmptyString(item.id)) return validationError(`Payment ${index + 1} is missing a valid id.`);
    if (!isNonEmptyString(item.projectId) || !projectIds.has(item.projectId)) {
      return validationError(`Payment "${item.id}" references a missing project.`);
    }
    if (!PAYMENT_TYPES.has(String(item.type))) return validationError(`Payment "${item.id}" has an invalid type.`);
    if (!isFiniteNumber(item.amount) || item.amount <= 0) return validationError(`Payment "${item.id}" has an invalid amount.`);
    if (!isNonEmptyString(item.party)) return validationError(`Payment "${item.id}" is missing a party.`);
    if (!CONTACT_ROLES.has(String(item.partyRole))) return validationError(`Payment "${item.id}" has an invalid party role.`);
    if (!PAYMENT_MODES.has(String(item.paymentMode))) return validationError(`Payment "${item.id}" has an invalid payment mode.`);
    if (!isNonEmptyString(item.date)) return validationError(`Payment "${item.id}" is missing a date.`);

    payments.push({
      id: item.id,
      projectId: item.projectId,
      type: item.type as Payment['type'],
      amount: item.amount,
      party: item.party,
      partyRole: item.partyRole as Payment['partyRole'],
      paymentMode: item.paymentMode as Payment['paymentMode'],
      remark: isString(item.remark) ? item.remark : '',
      date: item.date,
      billPhoto: optionalString(item.billPhoto),
      billPhotoStoragePath: optionalString(item.billPhotoStoragePath),
    });
  }

  const duplicatePayment = assertUniqueIds(payments, 'payment');
  if (duplicatePayment) return duplicatePayment;

  const contacts: Contact[] = [];
  for (const [index, item] of rawContacts.entries()) {
    if (!isRecord(item)) return validationError(`Contact ${index + 1} must be an object.`);
    if (!isNonEmptyString(item.id)) return validationError(`Contact ${index + 1} is missing a valid id.`);
    if (!isNonEmptyString(item.name)) return validationError(`Contact "${item.id}" is missing a name.`);
    if (!CONTACT_ROLES.has(String(item.role))) return validationError(`Contact "${item.id}" has an invalid role.`);

    contacts.push({
      id: item.id,
      name: item.name,
      role: item.role as Contact['role'],
      phone: isString(item.phone) ? item.phone : '',
      email: isString(item.email) ? item.email : '',
      company: optionalString(item.company),
      gstNumber: optionalString(item.gstNumber),
      address: optionalString(item.address),
    });
  }

  const duplicateContact = assertUniqueIds(contacts, 'contact');
  if (duplicateContact) return duplicateContact;

  const documents: CloudDocument[] = [];
  for (const [index, item] of rawDocuments.entries()) {
    if (!isRecord(item)) return validationError(`Document ${index + 1} must be an object.`);
    if (!isNonEmptyString(item.id)) return validationError(`Document ${index + 1} is missing a valid id.`);
    if (!isNonEmptyString(item.projectId) || !projectIds.has(item.projectId)) {
      return validationError(`Document "${item.id}" references a missing project.`);
    }
    if (!isNonEmptyString(item.name)) return validationError(`Document "${item.id}" is missing a name.`);
    if (!DOCUMENT_CATEGORIES.has(String(item.category))) return validationError(`Document "${item.id}" has an invalid category.`);
    if (!isFiniteNumber(item.size) || item.size < 0) return validationError(`Document "${item.id}" has an invalid file size.`);
    if (!isNonEmptyString(item.uploadedAt)) return validationError(`Document "${item.id}" is missing an upload date.`);
    if (!DOCUMENT_SYNC_STATUSES.has(String(item.syncStatus))) return validationError(`Document "${item.id}" has an invalid sync status.`);
    if (!isNonEmptyString(item.fileType)) return validationError(`Document "${item.id}" is missing a file type.`);

    documents.push({
      id: item.id,
      projectId: item.projectId,
      name: item.name,
      category: item.category as CloudDocument['category'],
      size: item.size,
      uploadedAt: item.uploadedAt,
      syncStatus: item.syncStatus as CloudDocument['syncStatus'],
      fileType: item.fileType,
      dataUrl: optionalString(item.dataUrl),
      storagePath: optionalString(item.storagePath),
    });
  }

  const duplicateDocument = assertUniqueIds(documents, 'document');
  if (duplicateDocument) return duplicateDocument;

  return {
    valid: true,
    data: {
      projects,
      payments,
      contacts,
      documents,
    },
  };
}

function hasDocumentPayload(document: CloudDocument) {
  return document.syncStatus !== 'synced' || Boolean(document.storagePath || document.dataUrl);
}

export function getLocalDbData(): DbData {
  if (!memoryDbData) {
    memoryDbData = import.meta.env.DEV
      ? {
          projects: INITIAL_PROJECTS,
          payments: INITIAL_PAYMENTS,
          contacts: INITIAL_CONTACTS,
          documents: INITIAL_DOCUMENTS,
        }
      : EMPTY_DB_DATA;
  }

  return {
    projects: [...memoryDbData.projects],
    payments: [...memoryDbData.payments],
    contacts: [...memoryDbData.contacts],
    documents: memoryDbData.documents.filter(hasDocumentPayload),
  };
}

export async function getDbData(): Promise<DbData> {
  const result = await loadDbData();
  return result.data;
}

export async function loadDbData(): Promise<DbLoadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: getLocalDbData(), source: 'local' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: getLocalDbData(), source: 'local' };
  }

  try {
    const activeOrg = await ensureActiveOrganization();
    const orgFilter = activeOrg ? `org_id.eq.${activeOrg.id},org_id.is.null` : 'org_id.is.null';

    const [projectsResult, paymentsResult, contactsResult, documentsResult] = await Promise.all([
      supabase.from('projects').select('*').or(orgFilter).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').or(orgFilter).order('payment_date', { ascending: false }),
      supabase.from('contacts').select('*').or(orgFilter).order('created_at', { ascending: false }),
      supabase.from('documents').select('*').or(orgFilter).order('uploaded_at', { ascending: false }),
    ]);

    const error =
      projectsResult.error || paymentsResult.error || contactsResult.error || documentsResult.error;

    if (error) {
      console.error('Supabase load failed:', error);
      return { data: getLocalDbData(), source: 'fallback', error };
    }

    const data: DbData = {
      projects: ((projectsResult.data || []) as ProjectRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        status: row.status,
        budget: Number(row.budget || 0),
        clientName: row.client_name,
        address: row.address || undefined,
        createdAt: row.created_at,
      })),
      payments: ((paymentsResult.data || []) as PaymentRow[]).map((row) => ({
        id: row.id,
        projectId: row.project_id,
        type: row.type,
        amount: Number(row.amount || 0),
        party: row.party,
        partyRole: row.party_role,
        paymentMode: row.payment_mode,
        remark: row.remark || '',
        date: row.payment_date,
        billPhoto: row.bill_photo || undefined,
        billPhotoStoragePath: row.bill_photo_storage_path || undefined,
      })),
      contacts: ((contactsResult.data || []) as ContactRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        role: row.role,
        phone: row.phone || '',
        email: row.email || '',
        company: row.company || undefined,
        gstNumber: row.gst_number || undefined,
        address: row.address || undefined,
      })),
      documents: ((documentsResult.data || []) as DocumentRow[])
        .map((row) => ({
          id: row.id,
          projectId: row.project_id,
          name: row.name,
          category: row.category,
          size: Number(row.size || 0),
          uploadedAt: row.uploaded_at,
          syncStatus: row.sync_status,
          fileType: row.file_type,
          dataUrl: row.data_url || undefined,
          storagePath: row.storage_path || undefined,
        }))
        .filter(hasDocumentPayload),
    };

    saveLocalDbData(data);
    return { data, source: 'supabase' };
  } catch (error) {
    console.error('Supabase load failed:', error);
    return { data: getLocalDbData(), source: 'fallback', error };
  }
}

function saveLocalDbData(data: DbData) {
  memoryDbData = {
    projects: [...data.projects],
    payments: [...data.payments],
    contacts: [...data.contacts],
    documents: [...data.documents],
  };
}

export function cacheDbData(data: DbData) {
  saveLocalDbData(data);
}

export function prepareDbDataForBackup(data: DbData): DbData {
  return {
    projects: data.projects,
    contacts: data.contacts,
    payments: data.payments.map((payment) => ({
      ...payment,
      billPhoto: payment.billPhotoStoragePath ? undefined : payment.billPhoto,
    })),
    documents: data.documents.map((document) => ({
      ...document,
      dataUrl: document.storagePath ? undefined : document.dataUrl,
    })),
  };
}

function missingIds<T extends { id: string }>(previousRows: T[], nextRows: T[]) {
  const nextIds = new Set(nextRows.map((row) => row.id));
  return previousRows.map((row) => row.id).filter((id) => !nextIds.has(id));
}

function toProjectRow(project: Project, userId: string, orgId: string | null): ProjectRow {
  return {
    id: project.id,
    user_id: userId,
    org_id: orgId,
    name: project.name,
    description: project.description,
    status: project.status,
    budget: project.budget,
    client_name: project.clientName,
    address: project.address || null,
    created_at: project.createdAt,
  };
}

function toContactRow(contact: Contact, userId: string, orgId: string | null): ContactRow {
  return {
    id: contact.id,
    user_id: userId,
    org_id: orgId,
    name: contact.name,
    role: contact.role,
    phone: contact.phone,
    email: contact.email,
    company: contact.company || null,
    gst_number: contact.gstNumber || null,
    address: contact.address || null,
  };
}

function toPaymentRow(payment: Payment, userId: string, orgId: string | null): PaymentRow {
  return {
    id: payment.id,
    user_id: userId,
    org_id: orgId,
    project_id: payment.projectId,
    type: payment.type,
    amount: payment.amount,
    party: payment.party,
    party_role: payment.partyRole,
    payment_mode: payment.paymentMode,
    remark: payment.remark,
    payment_date: payment.date,
    bill_photo: payment.billPhotoStoragePath ? null : payment.billPhoto || null,
    bill_photo_storage_path: payment.billPhotoStoragePath || null,
  };
}

function toDocumentRow(document: CloudDocument, userId: string, orgId: string | null): DocumentRow {
  return {
    id: document.id,
    user_id: userId,
    org_id: orgId,
    project_id: document.projectId,
    name: document.name,
    category: document.category,
    size: document.size,
    uploaded_at: document.uploadedAt,
    sync_status: document.syncStatus,
    file_type: document.fileType,
    data_url: document.dataUrl || null,
    storage_path: document.storagePath || null,
  };
}

async function throwOnSupabaseError(operation: PromiseLike<{ error: unknown }>) {
  const result = await operation;
  if (result.error) {
    throw result.error;
  }
}

async function getPersistenceContext() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const activeOrg = await ensureActiveOrganization();
  return {
    userId: user.id,
    orgId: activeOrg?.id || null,
  };
}

async function persistSingleRow(
  tableName: 'projects' | 'contacts' | 'payments' | 'documents',
  row: ProjectRow | ContactRow | PaymentRow | DocumentRow,
) {
  if (!supabase) return true;

  try {
    await throwOnSupabaseError(supabase.from(tableName).upsert(row as never, { onConflict: 'id' }));
    return true;
  } catch (error) {
    console.error(`Supabase ${tableName} row save failed:`, error);
    return false;
  }
}

async function deleteSingleRow(tableName: 'contacts' | 'payments' | 'documents', id: string) {
  if (!supabase) return true;

  const context = await getPersistenceContext();
  if (!context) return true;

  try {
    await throwOnSupabaseError(supabase.from(tableName).delete().eq('user_id', context.userId).eq('id', id));
    return true;
  } catch (error) {
    console.error(`Supabase ${tableName} row delete failed:`, error);
    return false;
  }
}

export async function persistProject(project: Project): Promise<boolean> {
  const context = await getPersistenceContext();
  if (!context) return true;
  return persistSingleRow('projects', toProjectRow(project, context.userId, context.orgId));
}

export async function persistContact(contact: Contact): Promise<boolean> {
  const context = await getPersistenceContext();
  if (!context) return true;
  return persistSingleRow('contacts', toContactRow(contact, context.userId, context.orgId));
}

export async function persistPayment(payment: Payment): Promise<boolean> {
  const context = await getPersistenceContext();
  if (!context) return true;
  return persistSingleRow('payments', toPaymentRow(payment, context.userId, context.orgId));
}

export async function persistDocument(document: CloudDocument): Promise<boolean> {
  const context = await getPersistenceContext();
  if (!context) return true;
  return persistSingleRow('documents', toDocumentRow(document, context.userId, context.orgId));
}

export const deleteContact = (id: string) => deleteSingleRow('contacts', id);
export const deletePayment = (id: string) => deleteSingleRow('payments', id);
export const deleteDocument = (id: string) => deleteSingleRow('documents', id);

export async function saveDbData(data: DbData): Promise<boolean> {
  const previousLocalData = getLocalDbData();
  saveLocalDbData(data);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return true;
  }

  const activeOrg = await ensureActiveOrganization();
  const orgId = activeOrg?.id || null;

  const projectRows = data.projects.map((project) => toProjectRow(project, user.id, orgId));
  const contactRows = data.contacts.map((contact) => toContactRow(contact, user.id, orgId));
  const paymentRows = data.payments.map((payment) => toPaymentRow(payment, user.id, orgId));
  const documentRows = data.documents.map((document) => toDocumentRow(document, user.id, orgId));

  const deletedProjectIds = missingIds(previousLocalData.projects, data.projects);
  const deletedContactIds = missingIds(previousLocalData.contacts, data.contacts);
  const deletedPaymentIds = missingIds(previousLocalData.payments, data.payments);
  const deletedDocumentIds = missingIds(previousLocalData.documents, data.documents);

  try {
    const deletions = [
      deletedPaymentIds.length ? supabase.from('payments').delete().eq('user_id', user.id).in('id', deletedPaymentIds) : null,
      deletedDocumentIds.length ? supabase.from('documents').delete().eq('user_id', user.id).in('id', deletedDocumentIds) : null,
      deletedProjectIds.length ? supabase.from('projects').delete().eq('user_id', user.id).in('id', deletedProjectIds) : null,
      deletedContactIds.length ? supabase.from('contacts').delete().eq('user_id', user.id).in('id', deletedContactIds) : null,
    ].filter(Boolean);

    const parentUpserts = [
      projectRows.length ? supabase.from('projects').upsert(projectRows, { onConflict: 'id' }) : null,
      contactRows.length ? supabase.from('contacts').upsert(contactRows, { onConflict: 'id' }) : null,
    ].filter(Boolean);

    const childUpserts = [
      paymentRows.length ? supabase.from('payments').upsert(paymentRows, { onConflict: 'id' }) : null,
      documentRows.length ? supabase.from('documents').upsert(documentRows, { onConflict: 'id' }) : null,
    ].filter(Boolean);

    await Promise.all(deletions.map((operation) => throwOnSupabaseError(operation as PromiseLike<{ error: unknown }>)));
    await Promise.all(parentUpserts.map((operation) => throwOnSupabaseError(operation as PromiseLike<{ error: unknown }>)));
    await Promise.all(childUpserts.map((operation) => throwOnSupabaseError(operation as PromiseLike<{ error: unknown }>)));
    return true;
  } catch (error) {
    console.error('Supabase save failed:', error);
    return false;
  }
}
