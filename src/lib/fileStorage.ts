import { isSupabaseConfigured, supabase } from './supabase';

export const STORAGE_BUCKET = 'catalyser-documents';

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

export async function createWorkspaceFileUrl(path: string) {
  if (!isSupabaseConfigured || !supabase) return null;
  const result = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 10);
  if (result.error) {
    throw result.error;
  }
  return result.data.signedUrl;
}
