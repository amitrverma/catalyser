type StaffSalary = { id: string; name: string; role: string; salary: number };
type Overhead = { id: string; label: string; amount: number };

export const DEFAULT_COMPANY_SETTINGS = {
  companyName: 'Catalyser Design',
  address: 'Unit number 809, 99 Avenue, Lullanagar, Pune - 411040',
  gstNumber: '27AAECC4524C1Z9',
  email: 'contact@catalyserdesign.com',
  phone: '+91 98765 43210',
  bankAccountName: 'Catalyser Design',
  bankName: 'HDFC Bank Ltd',
  bankAccountNumber: '50200012345678',
  bankAccountType: 'Current',
  bankIfscCode: 'HDFC0001234',
};

export const DEFAULT_STAFF_SALARIES: StaffSalary[] = [
  { id: 'st-1', name: 'Ar. Rohit Sharma', role: 'Senior Landscape Architect', salary: 55000 },
  { id: 'st-2', name: 'Ananya Mehta', role: 'Interior & Space Designer', salary: 38000 },
  { id: 'st-3', name: 'Kabir Verma', role: '3D Visualiser & Renderer', salary: 28000 },
];

export const DEFAULT_CUSTOM_OVERHEADS: Overhead[] = [
  { id: 'oh-1', label: 'Pro Design Softwares (AutoCAD, Revit, SketchUp)', amount: 15400 },
  { id: 'oh-2', label: 'Studio Base Rent & Electric Utilities', amount: 35000 },
  { id: 'oh-3', label: 'Admin Staff & Site Logistics Reimbursement', amount: 8000 },
];

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
