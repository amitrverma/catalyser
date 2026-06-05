type StaffSalary = { id: string; name: string; role: string; salary: number };
type Overhead = { id: string; label: string; amount: number };

export const DEFAULT_COMPANY_SETTINGS = {
  companyName: '',
  address: '',
  gstNumber: '',
  email: '',
  phone: '',
  bankAccountName: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountType: '',
  bankIfscCode: '',
};

export const DEFAULT_STAFF_SALARIES: StaffSalary[] = [];

export const DEFAULT_CUSTOM_OVERHEADS: Overhead[] = [];

const settingsMemory = new Map<string, string>();

const initialValues: Record<string, string> = {
  cc_company_name: DEFAULT_COMPANY_SETTINGS.companyName,
  cc_company_address: DEFAULT_COMPANY_SETTINGS.address,
  cc_company_gst: DEFAULT_COMPANY_SETTINGS.gstNumber,
  cc_company_email: DEFAULT_COMPANY_SETTINGS.email,
  cc_company_phone: DEFAULT_COMPANY_SETTINGS.phone,
  cc_bank_account_name: DEFAULT_COMPANY_SETTINGS.bankAccountName,
  cc_bank_name: DEFAULT_COMPANY_SETTINGS.bankName,
  cc_bank_account_number: DEFAULT_COMPANY_SETTINGS.bankAccountNumber,
  cc_bank_account_type: DEFAULT_COMPANY_SETTINGS.bankAccountType,
  cc_bank_ifsc: DEFAULT_COMPANY_SETTINGS.bankIfscCode,
  cc_tax_rate: '20',
  cc_gst_rate: '18',
  cc_selected_fy: 'all',
  cc_custom_overheads: JSON.stringify(DEFAULT_CUSTOM_OVERHEADS),
  cc_staff_salaries: JSON.stringify(DEFAULT_STAFF_SALARIES),
};

Object.entries(initialValues).forEach(([key, value]) => settingsMemory.set(key, value));

export function getSetting(key: string) {
  return settingsMemory.get(key) ?? null;
}

export function setSetting(key: string, value: unknown) {
  if (value === null || value === undefined) {
    settingsMemory.delete(key);
    return;
  }
  settingsMemory.set(key, String(value));
}

export function removeSetting(key: string) {
  settingsMemory.delete(key);
}

export function readJsonSetting<T>(key: string, fallback: T): T {
  const value = getSetting(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function snapshotSettings(keys: string[]) {
  return keys.reduce<Record<string, string | null>>((acc, key) => {
    acc[key] = getSetting(key);
    return acc;
  }, {});
}

export function resetSettingsMemory() {
  settingsMemory.clear();
  Object.entries(initialValues).forEach(([key, value]) => settingsMemory.set(key, value));
}
