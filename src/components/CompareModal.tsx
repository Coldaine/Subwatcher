import React from 'react';
import { Plan, Currency } from '../types/vibeplan';
import { formatPrice, formatTokens, getBestModelRow } from '../lib/vibeplan-engine';
import { X, GitCompare, ExternalLink, ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react';

interface CompareModalProps {
  plans: Plan[];
  currency: Currency;
  onClose: () => void;
  onRemovePlan: (planId: string) => void;
  onClearAll: () => void;
  onSelectPlan: (plan: Plan) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  plans,
  currency,
  onClose,
  onRemovePlan,
  onClearAll,
  onSelectPlan,
}) => {
  if (plans.length === 0) return null;

  // Find max tokens per dollar to highlight leader
  const bestRates = plans.map(p => {
    const bm = getBestModelRow(p);
    const pattern = bm?.patternUsed || { input: 800, cachedRead: 50000, output: 162 };
    const tokensPerReq = pattern.input + pattern.cachedRead + pattern.output;
    return (bm?.normalizedPer1 ?? 0) * tokensPerReq;
  });
  const maxRate = Math.max(...bestRates, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Head-to-Head Comparison Showdown
              </h2>
              <p className="text-xs text-slate-400">
                Comparing {plans.length} of max 4 plans side-by-side
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors px-2 py-1 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Comparison Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className={`grid gap-4 ${
            plans.length === 1 ? 'grid-cols-1' :
            plans.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            plans.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          }`}>
            {plans.map((plan) => {
              const bestModel = getBestModelRow(plan);
              const pattern = bestModel?.patternUsed || { input: 800, cachedRead: 50000, output: 162 };
              const tokensPerReq = pattern.input + pattern.cachedRead + pattern.output;
              const tokensPerDollar = (bestModel?.normalizedPer1 ?? 0) * tokensPerReq;
              const isLeader = tokensPerDollar > 0 && tokensPerDollar === maxRate;
              const windowCap = plan.windowCaps?.[0];

              return (
                <div
                  key={plan.id}
                  className={`flex flex-col border rounded-xl overflow-hidden bg-slate-950/60 ${
                    isLeader ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'border-slate-800'
                  }`}
                >
                  {/* Plan Top Strip */}
                  <div className="p-4 bg-slate-900/90 border-b border-slate-800 relative">
                    <button
                      type="button"
                      onClick={() => onRemovePlan(plan.id)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Remove from comparison"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      {plan.provider}
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5 line-clamp-1" title={plan.name}>
                      {plan.name}
                    </h3>

                    {/* Price Lockup */}
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-mono text-xl font-extrabold text-white">
                        {formatPrice(plan.price.monthlyUsd, currency)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {plan.price.billingNote || 'per month'}
                      </span>
                    </div>

                    {isLeader && (
                      <div className="mt-2 text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded text-center">
                        Highest Token Yield / $1
                      </div>
                    )}
                  </div>

                  {/* Comparison Metrics Body */}
                  <div className="p-4 space-y-4 flex-1 text-xs">
                    {/* Value Metrics */}
                    <div className="space-y-1.5 pb-3 border-b border-slate-800/80">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Token Economics</div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Tokens / $1:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {formatTokens(tokensPerDollar)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Requests / $1:</span>
                        <span className="font-mono text-slate-200">
                          {bestModel?.normalizedPer1 ? `${bestModel.normalizedPer1.toFixed(1)} req` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Monthly Tokens:</span>
                        <span className="font-mono text-slate-200">
                          {formatTokens(bestModel?.rawTokensPerMonth)}
                        </span>
                      </div>
                    </div>

                    {/* Quotas & Window Caps */}
                    <div className="space-y-1.5 pb-3 border-b border-slate-800/80">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Quotas & Throughput</div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Meter Type:</span>
                        <span className="font-mono text-slate-200 capitalize">
                          {plan.meter.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400">5-Hour Window Cap:</span>
                        <span className="font-mono text-right text-amber-400">
                          {windowCap ? `${windowCap.amount} ${windowCap.unit} / ${windowCap.window}` : 'No 5h cap reported'}
                        </span>
                      </div>
                      {plan.quotas && plan.quotas.length > 0 && (
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-slate-400">Reported Quota:</span>
                          <span className="font-mono text-right text-slate-200">
                            {plan.quotas[0].amount} {plan.quotas[0].unit} ({plan.quotas[0].window})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Model Lineup */}
                    <div className="space-y-1.5 pb-3 border-b border-slate-800/80">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Strongest Model</div>
                      <div className="text-slate-200 font-medium">
                        {bestModel?.model || '—'}
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Cost per req:</span>
                        <span className="font-mono text-slate-300">
                          ${(bestModel?.costPerRequest ?? 0).toFixed(4)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {plan.modelRows?.length || 0} models supported in catalog
                      </div>
                    </div>

                    {/* Privacy & Retention */}
                    <div className="space-y-1.5 pb-3 border-b border-slate-800/80">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Data Privacy & Retention</div>
                      <div className="flex items-center gap-1.5">
                        {plan.dataTier === 'A' || plan.dataTier === 'B' ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-200">
                          Data Tier {plan.dataTier || '—'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {plan.dataTierNote || (plan.dataTier === 'A' ? 'Zero data retention, no customer code training.' : 'Standard retention policy.')}
                      </p>
                    </div>

                    {/* Plan Notes */}
                    {plan.notes && (
                      <div className="space-y-1 text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded border border-slate-800">
                        <span className="font-mono text-[10px] text-slate-400 block uppercase">Notes</span>
                        <p className="line-clamp-3">{plan.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="p-3 bg-slate-900/60 border-t border-slate-800 mt-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectPlan(plan);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Full Model Breakdown</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Standard pattern: 800 input tokens · 50,000 cached read · 162 output tokens</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
