import type {
  ContactRole,
  DocumentCategory,
  PartyRole,
  PaymentMode,
  PaymentType,
  ProjectStatus,
} from '../types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type RowBase = {
  updated_at?: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { user_id: string; email: string | null; created_at: string };
        Insert: { user_id: string; email?: string | null; created_at?: string };
        Update: { email?: string | null; created_at?: string };
        Relationships: [];
      };
      organizations: {
        Row: RowBase & { id: string; name: string; slug: string | null; created_by: string };
        Insert: { id?: string; name: string; slug?: string | null; created_by: string };
        Update: { name?: string; slug?: string | null };
        Relationships: [];
      };
      organization_memberships: {
        Row: RowBase & {
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'accountant' | 'project_manager' | 'viewer';
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'accountant' | 'project_manager' | 'viewer';
        };
        Update: { role?: 'owner' | 'admin' | 'accountant' | 'project_manager' | 'viewer' };
        Relationships: [];
      };
      projects: {
        Row: RowBase & {
          id: string;
          user_id: string;
          org_id: string | null;
          name: string;
          description: string;
          status: ProjectStatus;
          budget: number;
          client_name: string;
          address: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          org_id: string | null;
          name: string;
          description: string;
          status: ProjectStatus;
          budget: number;
          client_name: string;
          address: string | null;
          created_at: string;
        };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
        Relationships: [];
      };
      contacts: {
        Row: RowBase & {
          id: string;
          user_id: string;
          org_id: string | null;
          name: string;
          role: ContactRole;
          phone: string;
          email: string;
          company: string | null;
          gst_number: string | null;
          address: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          org_id: string | null;
          name: string;
          role: ContactRole;
          phone: string;
          email: string;
          company: string | null;
          gst_number: string | null;
          address: string | null;
        };
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>;
        Relationships: [];
      };
      payments: {
        Row: RowBase & {
          id: string;
          user_id: string;
          org_id: string | null;
          project_id: string;
          type: PaymentType;
          amount: number;
          party: string;
          party_role: PartyRole;
          payment_mode: PaymentMode;
          remark: string;
          payment_date: string;
          bill_photo: string | null;
          bill_photo_storage_path: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          org_id: string | null;
          project_id: string;
          type: PaymentType;
          amount: number;
          party: string;
          party_role: PartyRole;
          payment_mode: PaymentMode;
          remark: string;
          payment_date: string;
          bill_photo: string | null;
          bill_photo_storage_path: string | null;
        };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
        Relationships: [];
      };
      documents: {
        Row: RowBase & {
          id: string;
          user_id: string;
          org_id: string | null;
          project_id: string;
          name: string;
          category: DocumentCategory;
          size: number;
          uploaded_at: string;
          sync_status: 'synced' | 'syncing' | 'failed';
          file_type: string;
          data_url: string | null;
          storage_path: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          org_id: string | null;
          project_id: string;
          name: string;
          category: DocumentCategory;
          size: number;
          uploaded_at: string;
          sync_status: 'synced' | 'syncing' | 'failed';
          file_type: string;
          data_url: string | null;
          storage_path: string | null;
        };
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
        Relationships: [];
      };
      company_settings: {
        Row: { user_id: string; org_id: string | null; settings: Json; updated_at: string };
        Insert: { user_id: string; org_id?: string | null; settings?: Json };
        Update: { org_id?: string | null; settings?: Json };
        Relationships: [];
      };
      staff_salaries: {
        Row: { user_id: string; org_id: string | null; salaries: Json; updated_at: string };
        Insert: { user_id: string; org_id?: string | null; salaries?: Json };
        Update: { org_id?: string | null; salaries?: Json };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_personal_organization: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
