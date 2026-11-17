import fs from 'fs';
import YAML from 'yaml';
import { z } from 'zod';
import { sha1 } from '../util/text';

export const CHECKS = [
  'min-pass-rate',
  'no-unwaived-blocking-defects',
  'no-validated-high-impact-new-defects',
  'business-critical-functionality-passed',
  'risk-within-threshold',
  'known-defects-approved',
  'critical-validation-complete',
  'integrations-available',
  'sufficient-evidence',
] as const;

export type CheckId = (typeof CHECKS)[number];

const severity = z.enum(['Blocker', 'Critical', 'Major', 'Minor', 'Trivial']);
const priority = z.enum(['Highest', 'High', 'Medium', 'Low', 'Lowest']);

export const PolicySchema = z.object({
  policy: z.object({
    name: z.string(),
    version: z.string(),
    owner: z.string().optional(),
    effectiveFrom: z.string().optional(),
  }),
  thresholds: z.object({
    minPassRate: z.number().min(0).max(100),
    maxRiskScore: z.number().min(0).max(100),
    minConfidenceForCritical: z.number().min(0).max(1),
  }),
  blockingDefects: z.object({
    severities: z.array(severity),
    priorities: z.array(priority),
  }),
  validation: z.object({
    enabled: z.boolean(),
    attempts: z.number().int().min(1).max(10),
    reproductionSimilarityThreshold: z.number().min(0).max(1),
    inconclusiveScope: z.enum(['business-critical', 'all']),
  }),
  risk: z.object({
    levels: z.object({ low: z.number(), medium: z.number(), high: z.number() }),
    severityWeights: z.record(severity, z.number()),
    waivedMultiplier: z.number().min(0).max(1),
    classificationWeights: z.record(z.string(), z.number()),
    businessCriticalMultiplier: z.number().min(1),
    passRatePenaltyPerPoint: z.number().min(0),
  }),
  rules: z
    .array(
      z.object({
        id: z.string(),
        check: z.enum(CHECKS),
        name: z.string(),
        description: z.string().optional(),
        onFail: z.enum(['NO_GO', 'HOLD']),
        enabled: z.boolean().default(true),
      }),
    )
    .min(1),
});

export type ReleasePolicy = z.infer<typeof PolicySchema> & { hash: string };

export function parsePolicy(yamlText: string): ReleasePolicy {
  const parsed = PolicySchema.parse(YAML.parse(yamlText));
  return { ...parsed, hash: sha1(yamlText, 12) };
}

export function loadPolicy(filePath: string): ReleasePolicy {
  return parsePolicy(fs.readFileSync(filePath, 'utf8'));
}
