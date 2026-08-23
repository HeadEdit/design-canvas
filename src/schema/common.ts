import { z } from 'zod';

export const nonblankString = z.string().trim().min(1);

const unsafeRecordKeys = new Set(['__proto__', 'prototype', 'constructor']);

export function isSafeRecordKey(name: string): boolean {
  return !unsafeRecordKeys.has(name);
}

export const recordKeyName = nonblankString.refine(isSafeRecordKey);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasUnsafeOwnKey(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).some((key) => !isSafeRecordKey(key));
}
