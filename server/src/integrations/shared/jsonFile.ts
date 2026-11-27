import fs from 'fs';
import type { HealthCheckResult } from '../types';

export function readJsonArray<T>(file: string): T[] {
  if (!fs.existsSync(file)) throw new Error(`${file} does not exist`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  if (!Array.isArray(data)) throw new Error(`${file} must contain a JSON array`);
  return data as T[];
}

export const fileHealth = (file: string): HealthCheckResult => (fs.existsSync(file) ? { ok: true } : { ok: false, message: `${file} does not exist` });
