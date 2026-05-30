import { Project, Payment, Contact, CloudDocument, DbData } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';
import { ContactRow, DocumentRow, PaymentRow, ProjectRow } from './supabaseRows';

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Villa Elixir - Minimalist Residence',
    description: 'High-end 4-bedroom villa project focusing on minimalist concrete, cedar wood slats, and smart building features.',
    status: 'ongoing',
    budget: 450000,
    clientName: 'Sarah Jenkins',
    address: '88 Overlook Terrace, Pasadena, CA',
    createdAt: '2026-03-12',
  },
  {
    id: 'proj-2',
    name: 'Aura Penthouse - Interior Renovation',
    description: 'Full luxury interior styling, acoustic wood panels, marble flooring, custom kitchen cabinets, and bespoke dimming fixtures.',
    status: 'completed',
    budget: 180000,
    clientName: 'Arthur Vance',
    address: 'Penthouse B, 412 Grand Ave, Los Angeles, CA',
    createdAt: '2026-01-05',
  },
  {
    id: 'proj-3',
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
  { id: 'c-1', name: 'Sarah Jenkins', role: 'client', phone: '+1 (555) 234-9876', email: 'sjenkins@gmail.com', company: 'Jenkins LLC' },
  { id: 'c-2', name: 'Arthur Vance', role: 'client', phone: '+1 (555) 762-3849', email: 'arthur.vance@vanceholdings.com', company: 'Vance Partners' },
  { id: 'c-3', name: 'Elena Rostova', role: 'client', phone: '+1 (555) 432-8472', email: 'erostova@vertex.co', company: 'Vertex Group' },
  // Vendors
  { id: 'v-1', name: 'Elite Timber & Joinery', role: 'vendor', phone: '+1 (555) 901-2321', email: 'brian@elitetimber.com', company: 'Elite Timber' },
  { id: 'v-2', name: 'Tesla Drywall & Acoustic', role: 'vendor', phone: '+1 (555) 890-4322', email: 'billing@teslaspaces.com', company: 'Tesla Drywall LLC' },
  { id: 'v-3', name: 'Aero Duct & HVAC Services', role: 'vendor', phone: '+1 (555) 472-8392', email: 'service@aeroduct.com', company: 'Aero Duct Inc.' },
  // Material Suppliers
  { id: 's-1', name: 'Sierra Plywood & Veneer', role: 'supplier', phone: '+1 (555) 123-4567', email: 'orders@sierraplywood.com', company: 'Sierra Forest Products' },
  { id: 's-2', name: 'Pacific Marble & Granite', role: 'supplier', phone: '+1 (555) 987-6543', email: 'showroom@pacificmarble.com', company: 'Pacific Stone Group' },
  { id: 's-3', name: 'Metropolis Iron & Rebar', role: 'supplier', phone: '+1 (555) 456-7890', email: 'sales@metroiron.com', company: 'Metropolis Steel Ltd' }
];

const INITIAL_PAYMENTS: Payment[] = [
  // Villa Elixir
  {
    id: 'pay-1',
    projectId: 'proj-1',
    type: 'in',
    amount: 150000,
    party: 'Sarah Jenkins',
    partyRole: 'client',
    paymentMode: 'bank_transfer',
    remark: 'First retainer & design phase sign-off milestone payment',
    date: '2026-03-15',
  },
  {
    id: 'pay-2',
    projectId: 'proj-1',
    type: 'in',
    amount: 100000,
    party: 'Sarah Jenkins',
    partyRole: 'client',
    paymentMode: 'bank_transfer',
    remark: 'Milestone 2 - Foundation concrete and framing launch',
    date: '2026-04-18',
  },
  {
    id: 'pay-3',
    projectId: 'proj-1',
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
    id: 'pay-4',
    projectId: 'proj-1',
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
    id: 'pay-5',
    projectId: 'proj-2',
    type: 'in',
    amount: 90000,
    party: 'Arthur Vance',
    partyRole: 'client',
    paymentMode: 'upi',
    remark: 'Advance billing for interior marble floor tiles & fixtures',
    date: '2026-01-08',
  },
  {
    id: 'pay-6',
    projectId: 'proj-2',
    type: 'in',
    amount: 90000,
    party: 'Arthur Vance',
    partyRole: 'client',
    paymentMode: 'bank_transfer',
    remark: 'Final project completion and walkthrough clearance',
    date: '2026-02-28',
  },
  {
    id: 'pay-7',
    projectId: 'proj-2',
    type: 'out',
    amount: 42000,
    party: 'Tesla Drywall & Acoustic',
    partyRole: 'vendor',
    paymentMode: 'bank_transfer',
    remark: 'Acoustic partition sound blocking ceiling panel grid installation',
    date: '2026-01-20',
  },
  {
    id: 'pay-8',
    projectId: 'proj-2',
    type: 'out',
    amount: 58000,
    party: 'Pacific Marble & Granite',
    partyRole: 'supplier',
    paymentMode: 'cheque',
    remark: 'Calacatta Viola marble kitchen island slabs',
    date: '2026-01-25',
  },
  {
    id: 'pay-9',
    projectId: 'proj-2',
    type: 'out',
    amount: 15000,
    party: 'Aero Duct & HVAC Services',
    partyRole: 'vendor',
    paymentMode: 'card',
    remark: 'Linear bar diffusers and clean filter vent placements',
    date: '2026-02-12',
  }
];

const INITIAL_DOCUMENTS: CloudDocument[] = [
  {
    id: 'doc-1',
    projectId: 'proj-1',
    name: 'villa_elixir_floorplan_v3.pdf',
    category: 'blueprint',
    size: 4500000, // 4.5 MB
    uploadedAt: '2026-03-13',
    syncStatus: 'synced',
    fileType: 'application/pdf'
  },
  {
    id: 'doc-2',
    projectId: 'proj-1',
    name: 'structural_timber_estimate.xlsx',
    category: 'estimate',
    size: 2100000,
    uploadedAt: '2026-04-10',
    syncStatus: 'synced',
    fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
  {
    id: 'doc-3',
    projectId: 'proj-2',
    name: 'kitchen_island_marble_receipt.pdf',
    category: 'receipt',
    size: 320000,
    uploadedAt: '2026-01-26',
    syncStatus: 'synced',
    fileType: 'application/pdf'
  },
  {
    id: 'doc-4',
    projectId: 'proj-2',
    name: 'vance_penthouse_signed_contract.pdf',
    category: 'contract',
    size: 1500000,
    uploadedAt: '2026-01-06',
    syncStatus: 'synced',
    fileType: 'application/pdf'
  }
];

export function getLocalDbData(): DbData {
  const prefix = localStorage.getItem('cc_storage_local_prefix') || 'cc_';
  
  const projectsKey = `${prefix}projects`;
  const paymentsKey = `${prefix}payments`;
  const contactsKey = `${prefix}contacts`;
  const documentsKey = `${prefix}documents`;

  const projects = localStorage.getItem(projectsKey);
  const payments = localStorage.getItem(paymentsKey);
  const contacts = localStorage.getItem(contactsKey);
  const documents = localStorage.getItem(documentsKey);

  if (!projects) localStorage.setItem(projectsKey, JSON.stringify(INITIAL_PROJECTS));
  if (!payments) localStorage.setItem(paymentsKey, JSON.stringify(INITIAL_PAYMENTS));
  if (!contacts) localStorage.setItem(contactsKey, JSON.stringify(INITIAL_CONTACTS));
  if (!documents) localStorage.setItem(documentsKey, JSON.stringify(INITIAL_DOCUMENTS));

  return {
    projects: JSON.parse(localStorage.getItem(projectsKey) || JSON.stringify(INITIAL_PROJECTS)) as Project[],
    payments: JSON.parse(localStorage.getItem(paymentsKey) || JSON.stringify(INITIAL_PAYMENTS)) as Payment[],
    contacts: JSON.parse(localStorage.getItem(contactsKey) || JSON.stringify(INITIAL_CONTACTS)) as Contact[],
    documents: JSON.parse(localStorage.getItem(documentsKey) || JSON.stringify(INITIAL_DOCUMENTS)) as CloudDocument[],
  };
}

export async function getDbData(): Promise<DbData> {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalDbData();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return getLocalDbData();
  }

  try {
    const [projectsResult, paymentsResult, contactsResult, documentsResult] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('payment_date', { ascending: false }),
      supabase.from('contacts').select('*').order('created_at', { ascending: false }),
      supabase.from('documents').select('*').order('uploaded_at', { ascending: false }),
    ]);

    const error =
      projectsResult.error || paymentsResult.error || contactsResult.error || documentsResult.error;

    if (error) {
      console.error('Supabase load failed, falling back to local cache:', error);
      return getLocalDbData();
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
      documents: ((documentsResult.data || []) as DocumentRow[]).map((row) => ({
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        category: row.category,
        size: Number(row.size || 0),
        uploadedAt: row.uploaded_at,
        syncStatus: row.sync_status,
        fileType: row.file_type,
        dataUrl: row.data_url || undefined,
      })),
    };

    if (
      data.projects.length === 0 &&
      data.payments.length === 0 &&
      data.contacts.length === 0 &&
      data.documents.length === 0
    ) {
      await saveDbData(getLocalDbData());
      return getLocalDbData();
    }

    saveLocalDbData(data);
    return data;
  } catch (error) {
    console.error('Supabase load failed, falling back to local cache:', error);
    return getLocalDbData();
  }
}

function saveLocalDbData(data: DbData) {
  const prefix = localStorage.getItem('cc_storage_local_prefix') || 'cc_';
  localStorage.setItem(`${prefix}projects`, JSON.stringify(data.projects));
  localStorage.setItem(`${prefix}payments`, JSON.stringify(data.payments));
  localStorage.setItem(`${prefix}contacts`, JSON.stringify(data.contacts));
  localStorage.setItem(`${prefix}documents`, JSON.stringify(data.documents));

  // Background Cloud Sync if Storage type is set to Cloud REST API
  const storageType = localStorage.getItem('cc_storage_type') || 'local';
  if (storageType === 'cloud') {
    const cloudUrl = localStorage.getItem('cc_storage_cloud_endpoint');
    const cloudAuth = localStorage.getItem('cc_storage_cloud_auth') || '';
    if (cloudUrl) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (cloudAuth) {
        headers['Authorization'] = cloudAuth.startsWith('Bearer ') ? cloudAuth : `Bearer ${cloudAuth}`;
      }
      fetch(cloudUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }).catch((err) => {
        console.error('Core Background Cloud Sync failure:', err);
      });
    }
  }
}

function missingIds<T extends { id: string }>(previousRows: T[], nextRows: T[]) {
  const nextIds = new Set(nextRows.map((row) => row.id));
  return previousRows.map((row) => row.id).filter((id) => !nextIds.has(id));
}

function toProjectRow(project: Project, userId: string): ProjectRow {
  return {
    id: project.id,
    user_id: userId,
    name: project.name,
    description: project.description,
    status: project.status,
    budget: project.budget,
    client_name: project.clientName,
    address: project.address || null,
    created_at: project.createdAt,
  };
}

function toContactRow(contact: Contact, userId: string): ContactRow {
  return {
    id: contact.id,
    user_id: userId,
    name: contact.name,
    role: contact.role,
    phone: contact.phone,
    email: contact.email,
    company: contact.company || null,
    gst_number: contact.gstNumber || null,
    address: contact.address || null,
  };
}

function toPaymentRow(payment: Payment, userId: string): PaymentRow {
  return {
    id: payment.id,
    user_id: userId,
    project_id: payment.projectId,
    type: payment.type,
    amount: payment.amount,
    party: payment.party,
    party_role: payment.partyRole,
    payment_mode: payment.paymentMode,
    remark: payment.remark,
    payment_date: payment.date,
    bill_photo: payment.billPhoto || null,
  };
}

function toDocumentRow(document: CloudDocument, userId: string): DocumentRow {
  return {
    id: document.id,
    user_id: userId,
    project_id: document.projectId,
    name: document.name,
    category: document.category,
    size: document.size,
    uploaded_at: document.uploadedAt,
    sync_status: document.syncStatus,
    file_type: document.fileType,
    data_url: document.dataUrl || null,
  };
}

async function throwOnSupabaseError(operation: PromiseLike<{ error: unknown }>) {
  const result = await operation;
  if (result.error) {
    throw result.error;
  }
}

export async function saveDbData(data: DbData) {
  const previousLocalData = getLocalDbData();
  saveLocalDbData(data);

  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const projectRows = data.projects.map((project) => toProjectRow(project, user.id));
  const contactRows = data.contacts.map((contact) => toContactRow(contact, user.id));
  const paymentRows = data.payments.map((payment) => toPaymentRow(payment, user.id));
  const documentRows = data.documents.map((document) => toDocumentRow(document, user.id));

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
  } catch (error) {
    console.error('Supabase save failed:', error);
  }
}
