import {
  ContactRole,
  DocumentCategory,
  PaymentMode,
  PaymentType,
  ProjectStatus,
} from '../types';

export interface ProjectRow {
  id: string;
  user_id: string;
  org_id: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  budget: number | null;
  client_name: string;
  address: string | null;
  created_at: string;
}

export interface ContactRow {
  id: string;
  user_id: string;
  org_id: string | null;
  name: string;
  role: ContactRole;
  phone: string | null;
  email: string | null;
  company: string | null;
  gst_number: string | null;
  address: string | null;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  org_id: string | null;
  project_id: string;
  type: PaymentType;
  amount: number | null;
  party: string;
  party_role: 'client' | 'vendor' | 'supplier' | 'other';
  payment_mode: PaymentMode;
  remark: string | null;
  payment_date: string;
  bill_photo: string | null;
  bill_photo_storage_path: string | null;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  org_id: string | null;
  project_id: string;
  name: string;
  category: DocumentCategory;
  size: number | null;
  uploaded_at: string;
  sync_status: 'synced' | 'syncing' | 'failed';
  file_type: string;
  data_url: string | null;
  storage_path: string | null;
}
