import { ContactRole } from '../types';

export type ImportedContactInput = {
  name: string;
  role: ContactRole;
  phone: string;
  email: string;
  company: string;
  gstNumber?: string;
  address?: string;
};

const getCsvRows = (input: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
};

const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, '');

const getCsvValue = (record: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (value) return value.trim();
  }
  return '';
};

const parseCsvContacts = (text: string, fallbackRole: ContactRole): ImportedContactInput[] => {
  const rows = getCsvRows(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  return rows
    .slice(1)
    .map((row) => {
      const record = headers.reduce<Record<string, string>>((current, header, index) => {
        current[header] = row[index] || '';
        return current;
      }, {});
      const firstName = getCsvValue(record, ['firstname', 'givenname']);
      const lastName = getCsvValue(record, ['lastname', 'familyname']);
      const name = getCsvValue(record, ['name', 'fullname', 'displayname']) || [firstName, lastName].filter(Boolean).join(' ');
      const company = getCsvValue(record, ['company', 'organization', 'org']);

      return {
        name,
        role: fallbackRole,
        phone: getCsvValue(record, ['phone', 'phone1value', 'mobile', 'mobilephone', 'primaryphone']),
        email: getCsvValue(record, ['email', 'email1value', 'primaryemail']),
        company,
        gstNumber: getCsvValue(record, ['gst', 'gstin', 'gstnumber']) || undefined,
        address: getCsvValue(record, ['address', 'homeaddress', 'businessaddress']) || undefined,
      };
    })
    .filter((contact) => contact.name);
};

const getVcardField = (card: string, fieldName: string) => {
  const escapedName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = card.match(new RegExp(`^${escapedName}(?:;[^:]*)?:(.*)$`, 'im'));
  return match?.[1]?.replace(/\\n/g, ', ').trim() || '';
};

const parseVcardContacts = (text: string, fallbackRole: ContactRole): ImportedContactInput[] =>
  text
    .split(/BEGIN:VCARD/i)
    .slice(1)
    .map((card) => {
      const name = getVcardField(card, 'FN') || getVcardField(card, 'N').split(';').filter(Boolean).reverse().join(' ');
      return {
        name,
        role: fallbackRole,
        phone: getVcardField(card, 'TEL'),
        email: getVcardField(card, 'EMAIL'),
        company: getVcardField(card, 'ORG'),
        address: getVcardField(card, 'ADR') || undefined,
      };
    })
    .filter((contact) => contact.name);

export const parseContactImportText = (text: string, fileName: string, fallbackRole: ContactRole = 'other') => {
  if (fileName.toLowerCase().endsWith('.vcf') || /BEGIN:VCARD/i.test(text)) {
    return parseVcardContacts(text, fallbackRole);
  }
  return parseCsvContacts(text, fallbackRole);
};

export const readContactImportFile = (file: File, fallbackRole: ContactRole = 'other') =>
  new Promise<ImportedContactInput[]>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read contact file.'));
    reader.onload = () => resolve(parseContactImportText(String(reader.result || ''), file.name, fallbackRole));
    reader.readAsText(file);
  });
