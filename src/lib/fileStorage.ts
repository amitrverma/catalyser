import { isSupabaseConfigured, supabase } from './supabase';
import { ensureActiveOrganization } from './orgs';

export const STORAGE_BUCKET = 'catalyser-documents';
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const SUPPORTED_BILL_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
export const SUPPORTED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
}

export async function uploadWorkspaceFile(args: {
  file: File;
  userId: string;
  orgId: string | null;
  folder: 'documents' | 'payments';
  id: string;
}) {
  if (!isSupabaseConfigured || !supabase) return null;

  const workspaceId = args.orgId || args.userId;
  const path = `${args.userId}/${workspaceId}/${args.folder}/${args.id}-${sanitizeFileName(args.file.name)}`;
  const result = await supabase.storage.from(STORAGE_BUCKET).upload(path, args.file, {
    upsert: true,
    contentType: args.file.type || 'application/octet-stream',
  });

  if (result.error) {
    throw result.error;
  }

  return path;
}

function extensionForContentType(contentType: string) {
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('svg')) return 'svg';
  return 'png';
}

export function validateBillImageFile(file: File) {
  if (!SUPPORTED_BILL_IMAGE_TYPES.has(file.type)) {
    return 'Use a JPEG, PNG, WebP, or GIF image.';
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return 'Bill photos must be 5 MB or smaller.';
  }
  return null;
}

export function validateWorkspaceDocumentFile(file: File) {
  if (file.size > MAX_DOCUMENT_BYTES) {
    return 'Documents must be 10 MB or smaller.';
  }
  if (file.type && !SUPPORTED_DOCUMENT_TYPES.has(file.type)) {
    return 'Use PDF, image, spreadsheet, Word, or text files.';
  }
  return null;
}

export async function uploadPaymentBillDataUrl(paymentId: string, dataUrl: string) {
  if (!isSupabaseConfigured || !supabase || !dataUrl.startsWith('data:')) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const activeOrg = await ensureActiveOrganization();
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = extensionForContentType(blob.type || 'image/png');
  const file = new File([blob], `bill-photo.${extension}`, { type: blob.type || 'image/png' });

  return uploadWorkspaceFile({
    file,
    userId: user.id,
    orgId: activeOrg?.id || null,
    folder: 'payments',
    id: paymentId,
  });
}

export async function createWorkspaceFileUrl(path: string) {
  if (!isSupabaseConfigured || !supabase) return null;
  const result = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 10);
  if (result.error) {
    throw result.error;
  }
  return result.data.signedUrl;
}
