import React, { useState, useMemo } from 'react';
import { Plan, Currency } from '../types/vibeplan';
import { formatPrice, formatTokens, getBestModelRow, formatNumber } from '../lib/vibeplan-engine';
import { Calculator, Sliders, ShieldCheck, Check, Plus, AlertTriangle, ArrowRight } from 'lucide-react';

interface CalculatorViewProps {
  plans: Plan[];
  currency: Currency;
  onSelectPlan: (plan: Plan) => void;
  comparePlanIds: string[];
  onToggleCompare: (planId: string) => void;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  plans,
  currency,
  onSelectPlan,
  comparePlanIds,
  onToggleCompare,
}) => {
  // Developer workload sliders
  const [dailyRequests, setDailyRequests] = useState<number>(80);
  const [inputTokens, setInputTokens] = useState<number>(1000);
  const [cacheRatio, setCacheRatio] = useState<number>(85); // 85% cached
  const [outputTokens, setOutputTokens] = useState<number>(200);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(30);
  const [onlyZeroRetention, setOnlyZeroRetention] = useState<boolean>(true);

  // Derived developer monthly workload
  const workingDays = 22;
  const monthlyRequestsNeeded = dailyRequests * workingDays;
  const cachedReadTokens = Math.round((inputTokens * (cacheRatio / 100)) * 50); // Typical 50k context cached read
  const totalTokensPerReq = inputTokens + cachedReadTokens + outputTokens;
  const monthlyTokensNeeded = monthlyRequestsNeeded * totalTokensPerReq;

  // Evaluate matching plans
  const evaluatedPlans = useMemo(() => {
    const list: Array<{
      plan: Plan;
      bestModel: ReturnType<typeof getBestModelRow>;
      planMonthlyTokens: number;
      headroomPercent: number; // >0 means has headroom, <0 means throttled/exceeded
      leftoverBudget: number;
      priceUsd: number;
      costPerReq: number;
    }> = [];

    for (const plan of plans) {
      const price = plan.price.monthlyUsd ?? 0;
      if (price > monthlyBudget) continue;

      if (onlyZeroRetention && (plan.dataTier === 'D' || plan.dataTier === 'C')) {
        continue;
      }

      const bestModel = getBestModelRow(plan);
      if (!bestModel) continue;

      const pattern = bestModel.patternUsed || { input: 800, cachedRead: 50000, output: 162 };
      const tokensPerReq = pattern.input + pattern.cachedRead + pattern.output;
      const tokensPerDollar = (bestModel.normalizedPer1 ?? 0) * tokensPerReq;
      const planMonthlyTokens = bestModel.rawTokensPerMonth ?? (tokensPerDollar * (price || 1));

      if (planMonthlyTokens <= 0) continue;

      // Headroom calculation: how much capacity is left after meeting developer's monthly needs
      const headroomPercent = ((planMonthlyTokens - monthlyTokensNeeded) / monthlyTokensNeeded) * 100;
      const leftoverBudget = monthlyBudget - price;

      list.push({
        plan,
        bestModel,
        planMonthlyTokens,
        headroomPercent,
        leftoverBudget,
        priceUsd: price,
        costPerReq: bestModel.costPerRequest ?? 0,
      });
    }

    // Rank plans: first those with sufficient capacity (headroom >= 0) sorted by highest headroom, then by price
    return list.sort((a, b) => {
      if (a.headroomPercent >= 0 && b.headroomPercent < 0) return -1;
      if (b.headroomPercent >= 0 && a.headroomPercent < 0) return 1;
      return b.headroomPercent - a.headroomPercent;
    });
  }, [plans, monthlyBudget, onlyZeroRetention, monthlyTokensNeeded]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6">
        <div className="max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Calculator className="w-3.5 h-3.5" />
            <span>DEVELOPER QUOTA & WORKLOAD SIZER</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Find the Best Subscription for Your Daily Coding Habits
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Configure your typical daily usage patterns below. We calculate your true monthly token throughput and
            rank subscription plans by whether they fit your workload without triggering rate limits or 5-hour window throttling.
          </p>
        </div>
      </div>

      {/* Main Grid: Controls + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Sliders (5 cols) */}
        <div className="lg:col-span-5 border border-slate-800 bg-slate-900/50 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Usage Parameters</span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {workingDays} dev days / mo
            </span>
          </div>

          {/* Slider 1: Daily Requests */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Daily Agent / Code Requests</span>
              <span className="font-mono font-bold text-emerald-400">{dailyRequests} req/day</span>
            </div>
            <input
              type="range"
              min="10"
              max="400"
              step="5"
              value={dailyRequests}
              onChange={(e) => setDailyRequests(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-950 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>10 (light)</span>
              <span>80 (average full-time)</span>
              <span>400 (power agent)</span>
            </div>
          </div>

          {/* Slider 2: Input Context Size */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">New Prompt / Input Tokens</span>
              <span className="font-mono font-bold text-slate-200">{formatNumber(inputTokens)} tokens</span>
            </div>
            <input
              type="range"
              min="200"
              max="5000"
              step="100"
              value={inputTokens}
              onChange={(e) => setInputTokens(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-950 rounded-lg cursor-pointer h-2"
            />
          </div>

          {/* Slider 3: Cache Hit Ratio */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Prompt Cache Hit Ratio</span>
              <span className="font-mono font-bold text-emerald-400">{cacheRatio}%</span>
            </div>
            <input
              type="range"
              min="30"
              max="98"
              step="1"
              value={cacheRatio}
              onChange={(e) => setCacheRatio(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-950 rounded-lg cursor-pointer h-2"
            />
            <div className="text-[11px] text-slate-400">
              Includes typical ~50k repository context cached read.
            </div>
          </div>

          {/* Slider 4: Output Tokens */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Generated Code Length</span>
              <span className="font-mono font-bold text-slate-200">{outputTokens} tokens</span>
            </div>
            <input
              type="range"
              min="50"
              max="1500"
              step="25"
              value={outputTokens}
              onChange={(e) => setOutputTokens(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-950 rounded-lg cursor-pointer h-2"
            />
          </div>

          {/* Slider 5: Monthly Budget */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Max Monthly Budget</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                ${monthlyBudget} / mo
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-950 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>$0 (Free only)</span>
              <span>$20 (Standard Pro)</span>
              <span>$200 (Team / Max)</span>
            </div>
          </div>

          {/* Checkbox: Data Retention */}
          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyZeroRetention}
                onChange={(e) => setOnlyZeroRetention(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500"
              />
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero data retention plans only</span>
              </span>
            </label>
          </div>

          {/* Workload Summary KPI Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs font-mono">
            <div className="text-[11px] text-slate-400 uppercase">Your Monthly Workload:</div>
            <div className="flex justify-between">
              <span className="text-slate-400">Monthly Requests:</span>
              <span className="font-bold text-white">{formatNumber(monthlyRequestsNeeded)} req</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Required Tokens:</span>
              <span className="font-bold text-emerald-400">{formatTokens(monthlyTokensNeeded)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Ranked Fit Recommendations (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>{evaluatedPlans.length} plans within ${monthlyBudget}/mo budget</span>
            <span>Sorted by capacity headroom</span>
          </div>

          {evaluatedPlans.length === 0 ? (
            <div className="p-12 text-center border border-slate-800 rounded-xl bg-slate-900/40 text-slate-400 text-sm">
              No plans fit within ${monthlyBudget}/mo. Try increasing your monthly budget slider on the left.
            </div>
          ) : (
            <div className="space-y-3">
              {evaluatedPlans.map((item, idx) => {
                const isCompared = comparePlanIds.includes(item.plan.id);
                const hasHeadroom = item.headroomPercent >= 0;

                return (
                  <div
                    key={item.plan.id}
                    className={`border rounded-xl p-4 transition-all bg-slate-900/70 ${
                      hasHeadroom
                        ? idx === 0
                          ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/5 bg-slate-900/90'
                          : 'border-slate-800 hover:border-slate-700'
                        : 'border-rose-900/40 bg-slate-950/40 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left Plan Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onSelectPlan(item.plan)}
                            className="font-bold text-white hover:text-emerald-400 text-sm transition-colors text-left"
                          >
                            {item.plan.name}
                          </button>
                          <span className="text-xs text-slate-400 capitalize">
                            by {item.plan.provider}
                          </span>
                          {idx === 0 && hasHeadroom && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold">
                              TOP FIT
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                          <span className="text-emerald-400 font-medium">
                            {item.bestModel?.model}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Monthly allowance: {formatTokens(item.planMonthlyTokens)} tokens</span>
                        </div>
                      </div>

                      {/* Right Price & Headroom */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-right">
                          <div className="font-mono text-sm font-bold text-white">
                            {formatPrice(item.priceUsd, currency)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.leftoverBudget > 0 ? `$${item.leftoverBudget.toFixed(0)} leftover` : 'At budget'}
                          </div>
                        </div>

                        {/* Headroom Badge */}
                        <div className="text-right min-w-[100px]">
                          {hasHeadroom ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-1 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                              <span>+{item.headroomPercent.toFixed(0)}%</span>
                              <span className="text-[10px] font-normal text-emerald-400/80">headroom</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-1 rounded bg-rose-950/80 border border-rose-500/30 text-rose-300">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>{Math.abs(item.headroomPercent).toFixed(0)}% short</span>
                            </span>
                          )}
                        </div>

                        {/* Compare + Inspect */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onToggleCompare(item.plan.id)}
                            className={`p-1.5 rounded border transition-colors ${
                              isCompared
                                ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                            title={isCompared ? 'In comparison tray' : 'Add to compare tray'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar Showing Usage vs Allowance */}
                    <div className="mt-3 pt-2 border-t border-slate-800/60">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Workload consumption:</span>
                        <span>
                          {hasHeadroom
                            ? `${((monthlyTokensNeeded / item.planMonthlyTokens) * 100).toFixed(0)}% of quota used`
                            : 'Exceeds monthly allowance'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            hasHeadroom ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (monthlyTokensNeeded / item.planMonthlyTokens) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
