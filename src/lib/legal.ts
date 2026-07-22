export const LEGAL_DOCUMENT_VERSION = '2026-07-21';

export const LEGAL_OPERATOR = {
  name: 'Гретченко Дмитрий Ростиславович',
  status: 'плательщик налога на профессиональный доход (самозанятый)',
  address: 'г. Мариуполь, проспект Ильича, дом 52',
  email: 'dimagret1997@yandex.com',
} as const;

export const LEGAL_DOCUMENTS = ['privacy', 'consent', 'cookies'] as const;
export type LegalDocumentId = (typeof LEGAL_DOCUMENTS)[number];

export function isLegalDocumentId(value: string): value is LegalDocumentId {
  return LEGAL_DOCUMENTS.includes(value as LegalDocumentId);
}
