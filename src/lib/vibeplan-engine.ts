import { VibeplanDataset, Plan, Currency, SyncState, WorkloadPattern } from '../types/vibeplan';

const LOCAL_STORAGE_KEY = 'vibeplan_cached_data_v2';
const SYNC_TIMESTAMP_KEY = 'vibeplan_last_synced_at';
const UPSTREAM_DATA_URL = 'https://vibeplan.cc/data/latest.json';
const LOCAL_STATIC_URL = '/data/latest.json';

export const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1.0,
  EUR: 0.92,
  CNY: 7.24,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  CNY: '¥',
};

export const STANDARD_WORKLOAD: WorkloadPattern = {
  input: 800,
  cachedRead: 50000,
  output: 162,
};

export function formatTokens(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '—';
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(0)}k`;
  }
  return num.toLocaleString();
}

export function formatPrice(priceUsd: number | null | undefined, currency: Currency = 'USD'): string {
  if (priceUsd === null || priceUsd === undefined) return 'Free';
  if (priceUsd === 0) return 'Free';
  const rate = EXCHANGE_RATES[currency] || 1;
  const converted = priceUsd * rate;
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${converted.toFixed(converted % 1 === 0 ? 0 : 2)}/mo`;
}

export function formatNumber(num: number | null | undefined, decimals = 0): string {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Calculate the cost per request using vibeplan's cache-aware formula:
// (0.05 * input + 0.95 * cachedWrite) * pattern.input + cachedRead * pattern.cachedRead + output * pattern.output / 1,000,000
export function calculateRequestCost(
  inputTokens: number,
  cachedTokens: number,
  outputTokens: number,
  inputPricePer1M = 3.0,
  cacheWritePer1M = 3.75,
  cacheReadPer1M = 0.30,
  outputPricePer1M = 15.0
): number {
  const blendedInputRate = (0.05 * inputPricePer1M + 0.95 * cacheWritePer1M);
  const cost = (blendedInputRate * inputTokens + cacheReadPer1M * cachedTokens + outputPricePer1M * outputTokens) / 1_000_000;
  return cost;
}

// Extract best model row per plan for Pareto ranking
export function getBestModelRow(plan: Plan) {
  if (!plan.modelRows || plan.modelRows.length === 0) return null;
  // Sort by rawTokensPerMonth descending, then normalizedPer1
  const sorted = [...plan.modelRows].sort((a, b) => {
    const aVal = a.rawTokensPerMonth ?? (a.normalizedPer1 ? a.normalizedPer1 * (plan.price.monthlyUsd || 1) : 0);
    const bVal = b.rawTokensPerMonth ?? (b.normalizedPer1 ? b.normalizedPer1 * (plan.price.monthlyUsd || 1) : 0);
    return bVal - aVal;
  });
  return sorted[0];
}

// Compute 2D Pareto frontier: x = price, y = tokensPerDollar or monthlyTokens
export function computeParetoFrontier(
  plans: Plan[],
  xMetric: (p: Plan) => number,
  yMetric: (p: Plan) => number,
  xDirection: 'min' | 'max' = 'min',
  yDirection: 'min' | 'max' = 'max'
) {
  const points = plans
    .map(plan => ({
      plan,
      x: xMetric(plan),
      y: yMetric(plan),
    }))
    .filter(pt => pt.x > 0 && pt.y > 0 && !isNaN(pt.x) && !isNaN(pt.y));

  const isBetter = (a: number, b: number, dir: 'min' | 'max') => (dir === 'min' ? a < b : a > b);
  const isAtLeast = (a: number, b: number, dir: 'min' | 'max') => (dir === 'min' ? a <= b : a >= b);

  const frontier: typeof points = [];

  for (const p of points) {
    let dominated = false;
    for (const q of points) {
      if (q === p) continue;
      const qBetterX = isBetter(q.x, p.x, xDirection);
      const qAtLeastX = isAtLeast(q.x, p.x, xDirection);
      const qBetterY = isBetter(q.y, p.y, yDirection);
      const qAtLeastY = isAtLeast(q.y, p.y, yDirection);

      if ((qBetterX && qAtLeastY) || (qAtLeastX && qBetterY)) {
        dominated = true;
        break;
      }
    }
    if (!dominated) {
      frontier.push(p);
    }
  }

  return frontier.sort((a, b) => a.x - b.x);
}

// Data loading with graceful fallback:
// 1. Check localStorage for fast instant render
// 2. Load from local static bundle (/data/latest.json)
// 3. Optionally fetch fresh from vibeplan.cc
export async function loadVibeplanData(forceRefresh = false): Promise<{
  data: VibeplanDataset;
  syncState: SyncState;
}> {
  // If not forcing refresh, check cached data in localStorage
  if (!forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const lastSynced = localStorage.getItem(SYNC_TIMESTAMP_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as VibeplanDataset;
        if (cached && cached.plans && cached.plans.length > 50) {
          const providers = new Set(cached.plans.map(p => p.provider)).size;
          return {
            data: cached,
            syncState: {
              source: 'cache',
              lastSyncedAt: lastSynced || cached.generatedAt,
              generatedAt: cached.generatedAt,
              planCount: cached.plans.length,
              providerCount: providers,
              isLoading: false,
              error: null,
            },
          };
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }

  // Next try local static file /data/latest.json
  try {
    const res = await fetch(LOCAL_STATIC_URL, { cache: forceRefresh ? 'reload' : 'default' });
    if (res.ok) {
      const localData = (await res.json()) as VibeplanDataset;
      const providers = new Set(localData.plans.map(p => p.provider)).size;
      return {
        data: localData,
        syncState: {
          source: 'bundled',
          lastSyncedAt: localData.generatedAt,
          generatedAt: localData.generatedAt,
          planCount: localData.plans.length,
          providerCount: providers,
          isLoading: false,
          error: null,
        },
      };
    }
  } catch (err) {
    console.warn('Failed to load local static dataset:', err);
  }

  // If local static fails or forceRefresh, try upstream live endpoint
  try {
    const liveRes = await fetch(UPSTREAM_DATA_URL, { cache: 'no-cache' });
    if (liveRes.ok) {
      const liveData = (await liveRes.json()) as VibeplanDataset;
      const now = new Date().toISOString();
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(liveData));
        localStorage.setItem(SYNC_TIMESTAMP_KEY, now);
      } catch {
        // Ignore storage quota
      }
      const providers = new Set(liveData.plans.map(p => p.provider)).size;
      return {
        data: liveData,
        syncState: {
          source: 'live',
          lastSyncedAt: now,
          generatedAt: liveData.generatedAt,
          planCount: liveData.plans.length,
          providerCount: providers,
          isLoading: false,
          error: null,
        },
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load dataset: ${msg}`);
  }

  throw new Error('Could not load VibePlan dataset from any source.');
}

// Fetch live update explicitly from vibeplan.cc and persist to localStorage
export async function syncLiveVibeplanData(): Promise<{
  data: VibeplanDataset;
  syncState: SyncState;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(UPSTREAM_DATA_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const liveData = (await res.json()) as VibeplanDataset;
    const now = new Date().toISOString();

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(liveData));
      localStorage.setItem(SYNC_TIMESTAMP_KEY, now);
    } catch {
      // Ignore quota
    }

    const providers = new Set(liveData.plans.map(p => p.provider)).size;

    return {
      data: liveData,
      syncState: {
        source: 'live',
        lastSyncedAt: now,
        generatedAt: liveData.generatedAt,
        planCount: liveData.plans.length,
        providerCount: providers,
        isLoading: false,
        error: null,
      },
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Live sync failed: ${msg}. You can continue using the verified bundled dataset.`);
  }
}
