import { expect, test } from '@playwright/test';
import type { DbData } from '../../src/types';
import { prepareDbDataForBackup, validateDbDataPayload } from '../../src/lib/db';
import { validateBillImageFile, validateWorkspaceDocumentFile } from '../../src/lib/fileStorage';

const validDb: DbData = {
  projects: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Office Fitout',
      description: 'Workspace renovation',
      status: 'ongoing',
      budget: 250000,
      clientName: 'Acme Ltd',
      address: 'Pune',
      createdAt: '2026-06-03',
    },
  ],
  payments: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      projectId: '11111111-1111-4111-8111-111111111111',
      type: 'out',
      amount: 12500,
      party: 'Stone Supplier',
      partyRole: 'supplier',
      paymentMode: 'bank_transfer',
      remark: 'Material advance',
      date: '2026-06-03',
      billPhoto: 'data:image/png;base64,inline-bill',
      billPhotoStoragePath: 'user/workspace/payments/bill.png',
    },
  ],
  contacts: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Stone Supplier',
      role: 'supplier',
      phone: '',
      email: '',
      company: 'Stone Supplier',
    },
  ],
  documents: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      projectId: '11111111-1111-4111-8111-111111111111',
      name: 'contract.pdf',
      category: 'contract',
      size: 1024,
      uploadedAt: '2026-06-03',
      syncStatus: 'synced',
      fileType: 'application/pdf',
      dataUrl: 'data:application/pdf;base64,inline-doc',
      storagePath: 'user/workspace/documents/contract.pdf',
    },
  ],
};

function fileStub(type: string, size: number): File {
  return { type, size } as File;
}

test('accepts a valid backup payload', () => {
  const result = validateDbDataPayload(validDb);

  expect(result.valid).toBe(true);
  if ('message' in result) throw new Error(result.message);
  expect(result.data.projects).toHaveLength(1);
  expect(result.data.payments[0].partyRole).toBe('supplier');
});

test('rejects payments that reference a missing project', () => {
  const result = validateDbDataPayload({
    ...validDb,
    payments: [{ ...validDb.payments[0], projectId: 'missing-project' }],
  });

  expect(result.valid).toBe(false);
  if (!('message' in result)) throw new Error('Expected validation to fail');
  expect(result.message).toContain('references a missing project');
});

test('rejects duplicate ids in backup payloads', () => {
  const result = validateDbDataPayload({
    ...validDb,
    projects: [validDb.projects[0], { ...validDb.projects[0] }],
  });

  expect(result.valid).toBe(false);
  if (!('message' in result)) throw new Error('Expected validation to fail');
  expect(result.message).toContain('Duplicate project id');
});

test('sanitizes storage-backed attachments from backup exports', () => {
  const backup = prepareDbDataForBackup(validDb);

  expect(backup.payments[0].billPhoto).toBeUndefined();
  expect(backup.payments[0].billPhotoStoragePath).toBe(validDb.payments[0].billPhotoStoragePath);
  expect(backup.documents[0].dataUrl).toBeUndefined();
  expect(backup.documents[0].storagePath).toBe(validDb.documents[0].storagePath);
});

test('validates bill image type and size', () => {
  expect(validateBillImageFile(fileStub('image/png', 1024))).toBeNull();
  expect(validateBillImageFile(fileStub('application/pdf', 1024))).toContain('JPEG');
  expect(validateBillImageFile(fileStub('image/png', 6 * 1024 * 1024))).toContain('5 MB');
});

test('validates workspace document type and size', () => {
  expect(validateWorkspaceDocumentFile(fileStub('application/pdf', 1024))).toBeNull();
  expect(validateWorkspaceDocumentFile(fileStub('application/x-msdownload', 1024))).toContain('PDF');
  expect(validateWorkspaceDocumentFile(fileStub('application/pdf', 11 * 1024 * 1024))).toContain('10 MB');
});
