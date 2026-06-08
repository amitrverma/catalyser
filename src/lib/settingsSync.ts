import { isSupabaseConfigured, supabase } from './supabase';
import { ensureActiveOrganization } from './orgs';
import { readJsonSetting, removeSetting, setSetting, snapshotSettings } from './settingsStore';

const SETTINGS_KEYS = [
  'cc_company_name',
  'cc_company_address',
  'cc_company_gst',
  'cc_company_email',
  'cc_company_phone',
  'cc_bank_account_name',
  'cc_bank_name',
  'cc_bank_account_number',
  'cc_bank_account_type',
  'cc_bank_ifsc',
  'custom_logo_base64',
  'custom_logo_storage_path',
  'custom_stamp_base64',
  'custom_stamp_storage_path',
  'custom_stamp_sign_base64',
  'custom_stamp_sign_storage_path',
  'custom_sign_base64',
  'custom_sign_storage_path',
  'cc_custom_overheads',
  'cc_tax_rate',
  'cc_gst_rate',
  'cc_selected_fy',
];

const STAFF_SALARIES_KEY = 'cc_staff_salaries';
const STORAGE_BUCKET = 'catalyser-documents';
const MAX_SETTINGS_ASSET_BYTES = 2 * 1024 * 1024;
const SUPPORTED_SETTINGS_ASSET_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const ASSET_KEYS = [
  { dataKey: 'custom_logo_base64', pathKey: 'custom_logo_storage_path' },
  { dataKey: 'custom_stamp_base64', pathKey: 'custom_stamp_storage_path' },
  { dataKey: 'custom_stamp_sign_base64', pathKey: 'custom_stamp_sign_storage_path' },
  { dataKey: 'custom_sign_base64', pathKey: 'custom_sign_storage_path' },
];

function canSync() {
  return Boolean(isSupabaseConfigured && supabase);
}

function readJsonValue<T>(key: string, fallback: T): T {
  return readJsonSetting(key, fallback);
}

function writeNullableLocalValue(key: string, value: unknown) {
  if (value === null || value === undefined) {
    removeSetting(key);
    return;
  }

  setSetting(key, String(value));
}

function extensionForContentType(contentType: string) {
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('svg')) return 'svg';
  return 'png';
}

async function uploadDataUrlAsset(userId: string, orgId: string | null, key: string, dataUrl: string) {
  if (!supabase || !dataUrl.startsWith('data:')) return null;

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const contentType = blob.type || 'image/png';

  if (!SUPPORTED_SETTINGS_ASSET_TYPES.has(contentType)) {
    throw new Error('Use JPEG, PNG, WebP, or SVG image assets.');
  }
  if (blob.size > MAX_SETTINGS_ASSET_BYTES) {
    throw new Error('Invoice image assets must be 2 MB or smaller.');
  }

  const extension = extensionForContentType(blob.type || 'image/png');
  const path = orgId ? `${userId}/${orgId}/settings/${key}.${extension}` : `${userId}/settings/${key}.${extension}`;
  const uploadResult = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, {
    upsert: true,
    contentType,
  });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  return path;
}

async function createSignedAssetUrl(path: string) {
  if (!supabase) return null;
  const result = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 60);
  if (result.error) {
    throw result.error;
  }
  return result.data.signedUrl;
}

async function hydrateAssetUrls(settings: Record<string, unknown>) {
  for (const asset of ASSET_KEYS) {
    const storagePath = settings[asset.pathKey];
    if (typeof storagePath === 'string' && storagePath) {
      try {
        const signedUrl = await createSignedAssetUrl(storagePath);
        if (signedUrl) {
          setSetting(asset.dataKey, signedUrl);
          setSetting(asset.pathKey, storagePath);
        }
      } catch (error) {
        console.error('Supabase signed asset URL failed:', error);
      }
    }
  }
}

async function migrateLocalAssetsToStorage(userId: string, orgId: string | null, settings: Record<string, string | null>) {
  let migrated = false;
  let allAssetsSynced = true;

  for (const asset of ASSET_KEYS) {
    const value = settings[asset.dataKey];
    if (!value?.startsWith('data:')) continue;

    try {
      const path = await uploadDataUrlAsset(userId, orgId, asset.dataKey, value);
      if (!path) continue;

      const signedUrl = await createSignedAssetUrl(path);
      settings[asset.pathKey] = path;
      settings[asset.dataKey] = null;
      setSetting(asset.pathKey, path);
      if (signedUrl) {
        setSetting(asset.dataKey, signedUrl);
      }
      migrated = true;
    } catch (error) {
      allAssetsSynced = false;
      console.error('Supabase asset upload failed:', error);
    }
  }

  if (migrated && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('custom-logo-updated'));
    window.dispatchEvent(new Event('custom-stamp-updated'));
    window.dispatchEvent(new Event('custom-sign-updated'));
  }

  return allAssetsSynced;
}

export async function hydrateSettingsFromSupabase() {
  if (!canSync() || !supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;
  const activeOrg = await ensureActiveOrganization();
  const orgId = activeOrg?.id || null;

  const settingsQuery = supabase.from('company_settings').select('settings');
  const salariesQuery = supabase.from('staff_salaries').select('salaries');
  const [settingsResult, salariesResult] = await Promise.all([
    orgId ? settingsQuery.eq('org_id', orgId).maybeSingle() : settingsQuery.eq('user_id', user.id).is('org_id', null).maybeSingle(),
    orgId ? salariesQuery.eq('org_id', orgId).maybeSingle() : salariesQuery.eq('user_id', user.id).is('org_id', null).maybeSingle(),
  ]);

  if (settingsResult.error) {
    console.error('Supabase settings hydrate failed:', settingsResult.error);
  }

  if (salariesResult.error) {
    console.error('Supabase staff hydrate failed:', salariesResult.error);
  }

  const settings = (settingsResult.data?.settings || {}) as Record<string, unknown>;
  SETTINGS_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      writeNullableLocalValue(key, settings[key]);
    }
  });
  await hydrateAssetUrls(settings);

  if (salariesResult.data?.salaries) {
    setSetting(STAFF_SALARIES_KEY, JSON.stringify(salariesResult.data.salaries));
  }

  window.dispatchEvent(new Event('custom-logo-updated'));
  window.dispatchEvent(new Event('custom-stamp-updated'));
  window.dispatchEvent(new Event('custom-sign-updated'));
}

export async function persistSettingsToSupabase(): Promise<boolean> {
  if (!canSync() || !supabase) return true;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return true;
    const activeOrg = await ensureActiveOrganization();
    const orgId = activeOrg?.id || null;

    const settings = snapshotSettings(SETTINGS_KEYS);
    const assetsSynced = await migrateLocalAssetsToStorage(user.id, orgId, settings);
    if (!assetsSynced) return false;

    const salaries = readJsonValue(STAFF_SALARIES_KEY, []);

    const [existingSettingsResult, existingSalariesResult] = await Promise.all([
      orgId ? supabase.from('company_settings').select('org_id').eq('org_id', orgId).maybeSingle() : Promise.resolve(null),
      orgId ? supabase.from('staff_salaries').select('org_id').eq('org_id', orgId).maybeSingle() : Promise.resolve(null),
    ]);

    const settingsOperation = orgId
      ? existingSettingsResult?.data
        ? supabase.from('company_settings').update({ settings }).eq('org_id', orgId)
        : supabase.from('company_settings').insert({ user_id: user.id, org_id: orgId, settings })
      : supabase.from('company_settings').upsert(
          {
            user_id: user.id,
            org_id: null,
            settings,
          },
          { onConflict: 'user_id,org_id' },
        );

    const salariesOperation = orgId
      ? existingSalariesResult?.data
        ? supabase.from('staff_salaries').update({ salaries }).eq('org_id', orgId)
        : supabase.from('staff_salaries').insert({ user_id: user.id, org_id: orgId, salaries })
      : supabase.from('staff_salaries').upsert(
          {
            user_id: user.id,
            org_id: null,
            salaries,
          },
          { onConflict: 'user_id,org_id' },
        );

    const [settingsResult, salariesResult] = await Promise.all([settingsOperation, salariesOperation]);

    if (settingsResult.error) {
      console.error('Supabase settings save failed:', settingsResult.error);
    }
    if (salariesResult.error) {
      console.error('Supabase staff save failed:', salariesResult.error);
    }

    return !settingsResult.error && !salariesResult.error;
  } catch (error) {
    console.error('Supabase settings save failed:', error);
    return false;
  }
}
