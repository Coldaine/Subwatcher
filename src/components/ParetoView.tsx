import React, { useState, useMemo } from 'react';
import { Plan, Currency } from '../types/vibeplan';
import { formatPrice, formatTokens, getBestModelRow } from '../lib/vibeplan-engine';
import { Plus, Check, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

interface ParetoViewProps {
  plans: Plan[];
  currency: Currency;
  onSelectPlan: (plan: Plan) => void;
  comparePlanIds: string[];
  onToggleCompare: (planId: string) => void;
}

export const ParetoView: React.FC<ParetoViewProps> = ({
  plans,
  currency,
  onSelectPlan,
  comparePlanIds,
  onToggleCompare,
}) => {
  const [onlyZeroRetention, setOnlyZeroRetention] = useState<boolean>(true);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(500);

  // Compute ranked best value items
  const rankedItems = useMemo(() => {
    const list: Array<{
      plan: Plan;
      bestModel: ReturnType<typeof getBestModelRow>;
      tokensPerDollar: number;
      monthlyTokens: number;
      requestsPerDollar: number;
    }> = [];

    for (const plan of plans) {
      // Must have price
      const price = plan.price.monthlyUsd;
      if (price === null || price === undefined || price <= 0) continue;
      if (price < minPrice || price > maxPrice) continue;

      // Filter zero retention / no training if enabled
      if (onlyZeroRetention) {
        if (plan.dataTier === 'D' || plan.dataTier === 'C') continue;
      }

      const bestModel = getBestModelRow(plan);
      if (!bestModel || !bestModel.normalizedPer1 || bestModel.normalizedPer1 <= 0) continue;

      // In vibeplan, normalizedPer1 is requests per $1 paid, and tokensPerDollar = normalizedPer1 * (input+cachedRead+output)
      const pattern = bestModel.patternUsed || { input: 800, cachedRead: 50000, output: 162 };
      const tokensPerReq = pattern.input + pattern.cachedRead + pattern.output;
      const tokensPerDollar = bestModel.normalizedPer1 * tokensPerReq;
      const monthlyTokens = bestModel.rawTokensPerMonth ?? (tokensPerDollar * price);

      list.push({
        plan,
        bestModel,
        tokensPerDollar,
        monthlyTokens,
        requestsPerDollar: bestModel.normalizedPer1,
      });
    }

    // Rank descending by tokens per dollar paid
    return list.sort((a, b) => b.tokensPerDollar - a.tokensPerDollar);
  }, [plans, onlyZeroRetention, minPrice, maxPrice]);

  // Max tokens per dollar for relative bar calculation
  const maxTokensPerDollar = rankedItems[0]?.tokensPerDollar || 1;

  return (
    <div className="space-y-6">
      {/* Hero Explainer Header */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 relative overflow-hidden">
        <div className="max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
            <span>PARETO VALUE FRONTIER</span>
            <span aria-hidden="true">·</span>
            <span>TOKEN EFFICIENCY BENCHMARK</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Best Value AI Coding Plans Right Now
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            One row per plan evaluated against its strongest model, ranked by verified tokens delivered per dollar paid.
            Standardized using cache-aware developer workloads (800 input, 50k cached read, 162 output).
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyZeroRetention}
                onChange={(e) => setOnlyZeroRetention(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950"
              />
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero data retention only (No model training)</span>
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3 text-slate-400 font-mono">
            <span>Price:</span>
            <button
              type="button"
              onClick={() => { setMinPrice(0); setMaxPrice(500); }}
              className={`px-2 py-1 rounded transition-colors ${maxPrice === 500 && minPrice === 0 ? 'bg-slate-800 text-emerald-400' : 'hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => { setMinPrice(0); setMaxPrice(20); }}
              className={`px-2 py-1 rounded transition-colors ${maxPrice === 20 ? 'bg-slate-800 text-emerald-400' : 'hover:text-slate-200'}`}
            >
              ≤ $20
            </button>
            <button
              type="button"
              onClick={() => { setMinPrice(20); setMaxPrice(50); }}
              className={`px-2 py-1 rounded transition-colors ${minPrice === 20 && maxPrice === 50 ? 'bg-slate-800 text-emerald-400' : 'hover:text-slate-200'}`}
            >
              $20–$50
            </button>
            <button
              type="button"
              onClick={() => { setMinPrice(50); setMaxPrice(1000); }}
              className={`px-2 py-1 rounded transition-colors ${minPrice === 50 ? 'bg-slate-800 text-emerald-400' : 'hover:text-slate-200'}`}
            >
              &gt; $50
            </button>
          </div>
        </div>
      </div>

      {/* Ranked List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-3 font-mono">
          <span>Showing {rankedItems.length} verified plans ranked by tokens / $1</span>
          <span>Bars share unified scale (100% = {formatTokens(maxTokensPerDollar)} / $1)</span>
        </div>

        {rankedItems.length === 0 ? (
          <div className="p-12 text-center border border-slate-800 rounded-xl bg-slate-900/40 text-slate-400">
            No plans match the selected filters. Try broadening the price or data retention settings.
          </div>
        ) : (
          rankedItems.map((item, index) => {
            const isSelectedForCompare = comparePlanIds.includes(item.plan.id);
            const barWidthPercent = Math.min(100, Math.max(3, (item.tokensPerDollar / maxTokensPerDollar) * 100));
            const windowCap = item.plan.windowCaps?.[0];

            return (
              <div
                key={item.plan.id}
                className="group relative border border-slate-800/90 hover:border-slate-700 bg-slate-900/70 hover:bg-slate-900/90 rounded-lg p-4 transition-all"
              >
                {/* Background scale bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-500/[0.04] rounded-l-lg pointer-events-none transition-all duration-300"
                  style={{ width: `${barWidthPercent}%` }}
                />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Column: Rank + Plan Info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <span className="flex items-center justify-center w-7 h-7 rounded bg-slate-950 border border-slate-800 font-mono text-xs font-semibold text-slate-300 shrink-0">
                      {index + 1}
                    </span>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onSelectPlan(item.plan)}
                          className="font-semibold text-white hover:text-emerald-400 transition-colors text-base text-left truncate"
                        >
                          {item.plan.name}
                        </button>
                        <span className="text-xs text-slate-400">
                          by <span className="text-slate-300 font-medium capitalize">{item.plan.provider}</span>
                        </span>
                        {item.plan.dataTier && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              item.plan.dataTier === 'A'
                                ? 'bg-emerald-950/70 border border-emerald-500/30 text-emerald-300'
                                : 'bg-slate-800 border border-slate-700 text-slate-300'
                            }`}
                            title={item.plan.dataTierNote || `Data retention tier ${item.plan.dataTier}`}
                          >
                            Tier {item.plan.dataTier}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                        <span className="text-emerald-400/90 font-medium">
                          Model: {item.bestModel?.model}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Cost/req: ${(item.bestModel?.costPerRequest ?? 0).toFixed(4)}
                        </span>
                        {windowCap && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-400/90 font-mono text-[11px]">
                              Cap: {windowCap.amount} {windowCap.unit}/{windowCap.window}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Metrics + Compare Action */}
                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                    {/* Monthly Price */}
                    <div className="text-right min-w-[80px]">
                      <div className="font-mono text-sm font-semibold text-white">
                        {formatPrice(item.plan.price.monthlyUsd, currency)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.plan.price.billingNote || 'billed monthly'}
                      </div>
                    </div>

                    {/* Tokens per $1 */}
                    <div className="text-right min-w-[110px]">
                      <div className="font-mono text-base font-bold text-emerald-400">
                        {formatTokens(item.tokensPerDollar)}
                        <span className="text-xs font-normal text-emerald-500/80"> / $1</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        ~{formatTokens(item.monthlyTokens)} / mo
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleCompare(item.plan.id)}
                        className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                          isSelectedForCompare
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                        title={isSelectedForCompare ? 'Remove from compare' : 'Add to compare tray'}
                      >
                        {isSelectedForCompare ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectPlan(item.plan)}
                        className="px-3 py-1.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors flex items-center gap-1"
                      >
                        <span>Details</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
