import { isSupabaseConfigured, supabase } from './supabase';

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
  'custom_stamp_base64',
  'custom_stamp_sign_base64',
  'custom_sign_base64',
  'cc_storage_type',
  'cc_storage_local_prefix',
  'cc_storage_cloud_endpoint',
  'cc_storage_cloud_auth',
  'cc_custom_overheads',
  'cc_tax_rate',
  'cc_gst_rate',
  'cc_selected_fy',
];

const STAFF_SALARIES_KEY = 'cc_staff_salaries';
const SYNCABLE_KEYS = new Set([...SETTINGS_KEYS, STAFF_SALARIES_KEY]);

let persistenceInstalled = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function canSync() {
  return Boolean(isSupabaseConfigured && supabase);
}

function readJsonValue<T>(key: string, fallback: T): T {
  const value = localStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeNullableLocalValue(key: string, value: unknown) {
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
    return;
  }

  localStorage.setItem(key, String(value));
}

export async function hydrateSettingsFromSupabase() {
  if (!canSync() || !supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const [settingsResult, salariesResult] = await Promise.all([
    supabase.from('company_settings').select('settings').eq('user_id', user.id).maybeSingle(),
    supabase.from('staff_salaries').select('salaries').eq('user_id', user.id).maybeSingle(),
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

  if (salariesResult.data?.salaries) {
    localStorage.setItem(STAFF_SALARIES_KEY, JSON.stringify(salariesResult.data.salaries));
  }

  window.dispatchEvent(new Event('custom-logo-updated'));
  window.dispatchEvent(new Event('custom-stamp-updated'));
  window.dispatchEvent(new Event('custom-sign-updated'));
  window.dispatchEvent(new Event('custom-settings-updated'));
}

export async function persistSettingsToSupabase() {
  if (!canSync() || !supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const settings = SETTINGS_KEYS.reduce<Record<string, string | null>>((acc, key) => {
    acc[key] = localStorage.getItem(key);
    return acc;
  }, {});

  const salaries = readJsonValue(STAFF_SALARIES_KEY, []);

  const [settingsResult, salariesResult] = await Promise.all([
    supabase.from('company_settings').upsert(
      {
        user_id: user.id,
        settings,
      },
      { onConflict: 'user_id' },
    ),
    supabase.from('staff_salaries').upsert(
      {
        user_id: user.id,
        salaries,
      },
      { onConflict: 'user_id' },
    ),
  ]);

  if (settingsResult.error) {
    console.error('Supabase settings save failed:', settingsResult.error);
  }
  if (salariesResult.error) {
    console.error('Supabase staff save failed:', salariesResult.error);
  }
}

export function scheduleSettingsPersist() {
  if (!canSync()) return;
  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    saveTimer = null;
    void persistSettingsToSupabase();
  }, 500);
}

export function installSettingsPersistence() {
  if (persistenceInstalled || typeof window === 'undefined') return;
  persistenceInstalled = true;

  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
    originalSetItem.call(this, key, value);
    if (this === window.localStorage && SYNCABLE_KEYS.has(key)) {
      scheduleSettingsPersist();
    }
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key: string) {
    originalRemoveItem.call(this, key);
    if (this === window.localStorage && SYNCABLE_KEYS.has(key)) {
      scheduleSettingsPersist();
    }
  };
}
