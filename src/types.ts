export type ProjectStatus = 'ongoing' | 'completed' | 'onhold';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  budget: number;
  clientName: string;
  address?: string;
  createdAt: string;
}

export type PaymentType = 'in' | 'out';
export type PaymentMode = 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'card';

export interface Payment {
  id: string;
  projectId: string;
  type: PaymentType;
  amount: number;
  party: string; // Given to or received from
  partyRole: PartyRole;
  paymentMode: PaymentMode;
  remark: string;
  date: string; // ISO format or YYYY-MM-DD
  billPhoto?: string; // Local data URL before the file is uploaded.
  billPhotoStoragePath?: string;
}

export type ContactRole = 'client' | 'vendor' | 'supplier' | 'contractor' | 'site_worker' | 'other';
export type PartyRole = ContactRole;

export type PlatformRole = 'owner' | 'admin' | 'project_manager' | 'accountant' | 'staff' | 'viewer';

export type PlatformPermission =
  | 'manage_workspace'
  | 'manage_members'
  | 'manage_settings'
  | 'manage_projects'
  | 'manage_contacts'
  | 'manage_ledger'
  | 'manage_documents'
  | 'view_reports';

export interface Contact {
  id: string;
  name: string;
  role: ContactRole;
  phone: string;
  email: string;
  company?: string;
  gstNumber?: string;
  address?: string;
}

export type DocumentCategory = 'invoice' | 'receipt' | 'blueprint' | 'estimate' | 'contract' | 'other';

export interface CloudDocument {
  id: string;
  projectId: string;
  name: string;
  category: DocumentCategory;
  size: number; // in bytes
  uploadedAt: string;
  syncStatus: 'synced' | 'syncing' | 'failed';
  fileType: string; // e.g. "application/pdf"
  dataUrl?: string; // Local preview data URL before the file is uploaded.
  storagePath?: string;
}

export interface DbData {
  projects: Project[];
  payments: Payment[];
  contacts: Contact[];
  documents: CloudDocument[];
}

export interface TaxReportData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  estimatedTax: number;
  taxRate: number;
  deductibleExpenses: number;
  gstCollected: number;
  gstPaid: number;
  netGstOwed: number;
}
