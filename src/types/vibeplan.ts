export interface PlanPrice {
  monthlyUsd: number | null;
  paidPrice: number | null;
  advertised: number | null;
  currency: string;
  monthlyCny: number | null;
  altPrice: number | null;
  yearlyUsd: number | null;
  waitlist: string | null;
  billingNote: string | null;
}

export interface PlanQuota {
  label: string;
  unit: string;
  amount: number;
  window: string;
  refresh?: string;
  disclosure?: string;
}

export interface WorkloadPattern {
  input: number;
  cachedRead: number;
  output: number;
}

export interface ModelRow {
  model: string;
  family: string;
  allowance: number | null;
  window: string;
  windowNote: string | null;
  costPerRequest: number;
  patternUsed: WorkloadPattern;
  creditsPerRequest: number | null;
  unit: string;
  requestsPerMonth: number | null;
  requestsRawInWindow: number | null;
  normalizedPer1: number | null;
  privacy: string | null;
  estimate: string | null;
  rawTokensPerMonth: number | null;
  derivedTokensPerMonth: number | null;
  score?: number | null;
}

export interface PlanWindowCap {
  label: string;
  amount: number;
  unit: string;
  window: string;
}

export interface Plan {
  id: string;
  name: string;
  provider: string;
  price: PlanPrice;
  meter: string;
  quotas?: PlanQuota[];
  windowCaps?: PlanWindowCap[];
  officialConversion?: string | null;
  disclosure: string;
  sourceIds?: string[];
  verifiedAt?: string;
  modelCount?: number;
  modelStats?: Record<string, unknown>;
  dataTier?: string; // "A" | "B" | "C" | "D"
  dataTierNote?: string;
  notes?: string;
  notesDe?: string;
  priceNote?: string;
  priceNoteDe?: string;
  priceNoteSource?: string;
  tag?: string;
  tagDe?: string;
  modelRows?: ModelRow[];
}

export interface Methodology {
  basis: string;
  costPerRequest: string;
  normalizedMetric: string;
  derivedMetrics: string;
  fallbackPattern: WorkloadPattern;
  drawThresholdPercent: number;
  patternUnification: string;
  fenster: string;
}

export interface VibeplanDataset {
  schemaVersion: number;
  generatedAt: string;
  targetMonthlyPrice: number;
  methodology: Methodology;
  sources?: Record<string, string | null>;
  staleSources?: string[];
  plans: Plan[];
}

export interface SyncState {
  source: 'live' | 'cache' | 'bundled';
  lastSyncedAt: string;
  generatedAt: string;
  planCount: number;
  providerCount: number;
  isLoading: boolean;
  error: string | null;
}

export type Currency = 'USD' | 'EUR' | 'CNY';
export type Language = 'en' | 'de';
