import React, { useState, useMemo } from 'react';
import { Plan, Currency } from '../types/vibeplan';
import { formatPrice, formatTokens, getBestModelRow, formatNumber } from '../lib/vibeplan-engine';
import { Search, ChevronDown, ChevronRight, Check, Plus, ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react';

interface PlansMatrixProps {
  plans: Plan[];
  currency: Currency;
  onSelectPlan: (plan: Plan) => void;
  comparePlanIds: string[];
  onToggleCompare: (planId: string) => void;
}

export const PlansMatrix: React.FC<PlansMatrixProps> = ({
  plans,
  currency,
  onSelectPlan,
  comparePlanIds,
  onToggleCompare,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedPriceTier, setSelectedPriceTier] = useState<string>('all');
  const [selectedMeter, setSelectedMeter] = useState<string>('all');
  const [selectedDataTier, setSelectedDataTier] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'tokensPerDollar' | 'priceAsc' | 'priceDesc' | 'monthlyTokens' | 'name'>('tokensPerDollar');
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set());

  // Distinct providers list with counts
  const providerOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of plans) {
      counts.set(p.provider, (counts.get(p.provider) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return sorted;
  }, [plans]);

  // Popular providers for quick chips
  const popularProviders = useMemo(() => {
    return ['all', 'cursor', 'anthropic', 'openai', 'github', 'google', 'windsurf', 'cognition', 'opencode'];
  }, []);

  const toggleExpand = (planId: string) => {
    setExpandedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  // Filtered and sorted plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = plan.name.toLowerCase().includes(query);
        const matchesProvider = plan.provider.toLowerCase().includes(query);
        const matchesModel = plan.modelRows?.some(m => m.model.toLowerCase().includes(query));
        if (!matchesName && !matchesProvider && !matchesModel) return false;
      }

      // Provider filter
      if (selectedProvider !== 'all' && plan.provider !== selectedProvider) {
        return false;
      }

      // Price filter
      const price = plan.price.monthlyUsd ?? 0;
      if (selectedPriceTier === 'free' && price > 0) return false;
      if (selectedPriceTier === 'under20' && (price <= 0 || price > 20)) return false;
      if (selectedPriceTier === '20to50' && (price < 20 || price > 50)) return false;
      if (selectedPriceTier === 'over50' && price <= 50) return false;

      // Meter filter
      if (selectedMeter !== 'all' && plan.meter !== selectedMeter) {
        return false;
      }

      // Data tier filter
      if (selectedDataTier === 'zero-retention' && (plan.dataTier === 'D' || plan.dataTier === 'C')) {
        return false;
      }
      if (selectedDataTier === 'tier-a' && plan.dataTier !== 'A') {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const bestA = getBestModelRow(a);
      const bestB = getBestModelRow(b);
      const patternA = bestA?.patternUsed || { input: 800, cachedRead: 50000, output: 162 };
      const patternB = bestB?.patternUsed || { input: 800, cachedRead: 50000, output: 162 };
      const tokensPerReqA = patternA.input + patternA.cachedRead + patternA.output;
      const tokensPerReqB = patternB.input + patternB.cachedRead + patternB.output;

      const rateA = (bestA?.normalizedPer1 ?? 0) * tokensPerReqA;
      const rateB = (bestB?.normalizedPer1 ?? 0) * tokensPerReqB;

      const priceA = a.price.monthlyUsd ?? 0;
      const priceB = b.price.monthlyUsd ?? 0;

      const monthlyTokensA = bestA?.rawTokensPerMonth ?? (rateA * priceA);
      const monthlyTokensB = bestB?.rawTokensPerMonth ?? (rateB * priceB);

      switch (sortBy) {
        case 'tokensPerDollar':
          return rateB - rateA;
        case 'priceAsc':
          return priceA - priceB;
        case 'priceDesc':
          return priceB - priceA;
        case 'monthlyTokens':
          return monthlyTokensB - monthlyTokensA;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [plans, searchQuery, selectedProvider, selectedPriceTier, selectedMeter, selectedDataTier, sortBy]);

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-5 space-y-4">
        {/* Search input + Dropdowns */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 139+ plans by name, provider, or model (e.g. Cursor, Sonnet, o3-mini)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-colors"
            />
          </div>

          {/* Provider Dropdown */}
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Providers ({plans.length})</option>
            {providerOptions.map(([prov, count]) => (
              <option key={prov} value={prov}>
                {prov} ({count})
              </option>
            ))}
          </select>

          {/* Price Tier Dropdown */}
          <select
            value={selectedPriceTier}
            onChange={(e) => setSelectedPriceTier(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Prices</option>
            <option value="free">Free / $0</option>
            <option value="under20">≤ $20/mo</option>
            <option value="20to50">$20 – $50/mo</option>
            <option value="over50">&gt; $50/mo</option>
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="tokensPerDollar">Sort: Value (Tokens/$1)</option>
            <option value="priceAsc">Sort: Price (Low to High)</option>
            <option value="priceDesc">Sort: Price (High to Low)</option>
            <option value="monthlyTokens">Sort: Monthly Token Volume</option>
            <option value="name">Sort: Plan Name (A-Z)</option>
          </select>
        </div>

        {/* Quick Provider Chips & Data Retention Switch */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-mono text-[11px] mr-1">Popular:</span>
            {popularProviders.map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => setSelectedProvider(prov)}
                className={`px-2.5 py-1 rounded-md transition-colors capitalize ${
                  selectedProvider === prov
                    ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-medium'
                    : 'bg-slate-950/80 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDataTier(prev => prev === 'zero-retention' ? 'all' : 'zero-retention')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                selectedDataTier === 'zero-retention'
                  ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero data retention only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Count & Meta Info */}
      <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-400">
        <span>Showing {filteredPlans.length} plans</span>
        <span>Click row to view all supported models & allowances</span>
      </div>

      {/* Plans Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px]">
                <th className="py-3 px-3 w-10 text-center">Compare</th>
                <th className="py-3 px-4">Plan & Provider</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4">Meter & Window Cap</th>
                <th className="py-3 px-4">Top Model Included</th>
                <th className="py-3 px-4 text-right">Tokens / $1</th>
                <th className="py-3 px-4 text-right">Tokens / Mo</th>
                <th className="py-3 px-3 text-center">Privacy</th>
                <th className="py-3 px-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No plans match the search criteria.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => {
                  const isExpanded = expandedPlanIds.has(plan.id);
                  const isCompared = comparePlanIds.includes(plan.id);
                  const bestModel = getBestModelRow(plan);
                  const pattern = bestModel?.patternUsed || { input: 800, cachedRead: 50000, output: 162 };
                  const tokensPerReq = pattern.input + pattern.cachedRead + pattern.output;
                  const tokensPerDollar = (bestModel?.normalizedPer1 ?? 0) * tokensPerReq;
                  const monthlyTokens = bestModel?.rawTokensPerMonth ?? (tokensPerDollar * (plan.price.monthlyUsd || 1));
                  const windowCap = plan.windowCaps?.[0];

                  return (
                    <React.Fragment key={plan.id}>
                      <tr className="hover:bg-slate-800/40 transition-colors group">
                        {/* Compare check */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onToggleCompare(plan.id)}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors mx-auto ${
                              isCompared
                                ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                                : 'border-slate-700 hover:border-slate-500 bg-slate-950 text-transparent'
                            }`}
                            title={isCompared ? 'Remove from comparison tray' : 'Add to compare tray'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </td>

                        {/* Plan & Provider */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleExpand(plan.id)}
                              className="text-slate-400 hover:text-white p-0.5"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <div>
                              <button
                                type="button"
                                onClick={() => onSelectPlan(plan)}
                                className="font-semibold text-white hover:text-emerald-400 text-left transition-colors"
                              >
                                {plan.name}
                              </button>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <span className="capitalize">{plan.provider}</span>
                                {plan.modelCount && plan.modelCount > 1 && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>{plan.modelCount} models</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Monthly Price */}
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-semibold text-white">
                            {formatPrice(plan.price.monthlyUsd, currency)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {plan.price.billingNote || (plan.price.monthlyUsd === 0 ? 'No credit card' : 'Monthly')}
                          </div>
                        </td>

                        {/* Meter & Window Cap */}
                        <td className="py-3 px-4">
                          <div className="text-slate-300 font-mono text-[11px] capitalize">
                            {plan.meter.replace('_', ' ')}
                          </div>
                          {windowCap ? (
                            <div className="text-amber-400/90 font-mono text-[10px]">
                              {windowCap.amount} {windowCap.unit}/{windowCap.window}
                            </div>
                          ) : (
                            <div className="text-slate-500 text-[10px]">No 5h cap</div>
                          )}
                        </td>

                        {/* Top Model */}
                        <td className="py-3 px-4">
                          {bestModel ? (
                            <div>
                              <div className="text-slate-200 font-medium">
                                {bestModel.model}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Cost/req: ${(bestModel.costPerRequest ?? 0).toFixed(4)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* Tokens / $1 */}
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-semibold text-emerald-400">
                            {formatTokens(tokensPerDollar)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {bestModel?.normalizedPer1 ? `${bestModel.normalizedPer1.toFixed(1)} req/$` : '—'}
                          </div>
                        </td>

                        {/* Tokens / Mo */}
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-semibold text-slate-200">
                            {formatTokens(monthlyTokens)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {bestModel?.requestsPerMonth ? `${formatNumber(bestModel.requestsPerMonth, 0)} req` : '—'}
                          </div>
                        </td>

                        {/* Privacy Tier */}
                        <td className="py-3 px-3 text-center">
                          {plan.dataTier ? (
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                plan.dataTier === 'A'
                                  ? 'bg-emerald-950/70 border border-emerald-500/30 text-emerald-300'
                                  : plan.dataTier === 'B'
                                  ? 'bg-blue-950/70 border border-blue-500/30 text-blue-300'
                                  : plan.dataTier === 'C'
                                  ? 'bg-amber-950/70 border border-amber-500/30 text-amber-300'
                                  : 'bg-rose-950/70 border border-rose-500/30 text-rose-300'
                              }`}
                              title={plan.dataTierNote || `Tier ${plan.dataTier}`}
                            >
                              Tier {plan.dataTier}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* Details */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onSelectPlan(plan)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Inspect plan breakdown"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Model Rows Accordion */}
                      {isExpanded && plan.modelRows && plan.modelRows.length > 0 && (
                        <tr className="bg-slate-950/70">
                          <td colSpan={9} className="p-4 border-y border-slate-800/80">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-1 border-b border-slate-800">
                                <span>MODEL BREAKDOWN ({plan.modelRows.length} models)</span>
                                <span>Pattern: 800 in · 50k cached · 162 out</span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs font-mono">
                                  <thead>
                                    <tr className="text-slate-400 text-[10px]">
                                      <th className="py-1">Model</th>
                                      <th className="py-1">Allowance / Window</th>
                                      <th className="py-1 text-right">Cost / Request</th>
                                      <th className="py-1 text-right">Requests / Mo</th>
                                      <th className="py-1 text-right">Tokens / Mo</th>
                                      <th className="py-1 text-right">Tokens / $1</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/40">
                                    {plan.modelRows.map((m, mIdx) => {
                                      const mPattern = m.patternUsed || { input: 800, cachedRead: 50000, output: 162 };
                                      const mTokensPerReq = mPattern.input + mPattern.cachedRead + mPattern.output;
                                      const mTokensPerDollar = (m.normalizedPer1 ?? 0) * mTokensPerReq;

                                      return (
                                        <tr key={mIdx} className="hover:bg-slate-900/50">
                                          <td className="py-1.5 text-slate-200 font-medium">
                                            {m.model}
                                          </td>
                                          <td className="py-1.5 text-slate-400">
                                            {m.allowance ? `${m.allowance} ${m.unit || 'req'} / ${m.window}` : 'Uncapped / quota'}
                                          </td>
                                          <td className="py-1.5 text-right text-slate-300">
                                            ${(m.costPerRequest ?? 0).toFixed(4)}
                                          </td>
                                          <td className="py-1.5 text-right text-slate-300">
                                            {m.requestsPerMonth ? formatNumber(m.requestsPerMonth, 0) : '—'}
                                          </td>
                                          <td className="py-1.5 text-right text-slate-300">
                                            {formatTokens(m.rawTokensPerMonth)}
                                          </td>
                                          <td className="py-1.5 text-right text-emerald-400 font-semibold">
                                            {formatTokens(mTokensPerDollar)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
