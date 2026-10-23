import React, { useState } from 'react';
import { Plan, Currency } from '../types/vibeplan';
import { formatPrice, formatTokens, formatNumber } from '../lib/vibeplan-engine';
import { X, ExternalLink, ShieldCheck, ShieldAlert, GitCompare, Check, Code, Clock } from 'lucide-react';

interface PlanDetailModalProps {
  plan: Plan | null;
  currency: Currency;
  onClose: () => void;
  isCompared: boolean;
  onToggleCompare: () => void;
}

export const PlanDetailModal: React.FC<PlanDetailModalProps> = ({
  plan,
  currency,
  onClose,
  isCompared,
  onToggleCompare,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'sources' | 'json'>('overview');

  if (!plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                {plan.provider}
              </span>
              {plan.dataTier && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  plan.dataTier === 'A'
                    ? 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-800 border border-slate-700 text-slate-300'
                }`}>
                  Tier {plan.dataTier}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {plan.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleCompare}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isCompared
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{isCompared ? 'In Compare Tray' : 'Add to Compare'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex px-6 border-b border-slate-800 bg-slate-950/40 text-xs font-medium gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview & Quotas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('models')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'models'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Models ({plan.modelRows?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'sources'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sources & Privacy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'json'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw JSON
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs font-mono text-slate-400 block">PRICE</span>
                  <div className="text-xl font-bold font-mono text-white">
                    {formatPrice(plan.price.monthlyUsd, currency)}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {plan.price.billingNote || 'Standard billing'}
                  </span>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs font-mono text-slate-400 block">METERING</span>
                  <div className="text-base font-bold font-mono text-white capitalize">
                    {plan.meter.replace('_', ' ')}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Disclosure: {plan.disclosure}
                  </span>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs font-mono text-slate-400 block">DATA PRIVACY</span>
                  <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                    {plan.dataTier === 'A' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4 text-amber-400" />}
                    <span>Tier {plan.dataTier || 'Unspecified'}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 truncate block">
                    {plan.dataTierNote || 'Customer data policy'}
                  </span>
                </div>
              </div>

              {/* Quotas & Throughput Caps */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Quotas & Throughput Caps</h3>
                <div className="space-y-2">
                  {plan.quotas && plan.quotas.length > 0 ? (
                    plan.quotas.map((q, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-200">{q.label}</span>
                          <span className="text-slate-400 ml-2">({q.window})</span>
                        </div>
                        <div className="font-mono text-emerald-400 font-bold">
                          {q.amount} {q.unit}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 p-3 bg-slate-950 rounded-lg border border-slate-800">
                      No explicit quota caps reported. Plan operates on standard account credit pool.
                    </div>
                  )}

                  {plan.windowCaps && plan.windowCaps.length > 0 && (
                    <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                        <Clock className="w-4 h-4" />
                        <span>5-Hour Rolling Window Cap</span>
                      </div>
                      <p className="text-slate-300">
                        {plan.windowCaps[0].amount} {plan.windowCaps[0].unit} per {plan.windowCaps[0].window}.
                        Throughput throttle to prevent burst saturation.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Official Conversion / Notes */}
              {plan.notes && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
                  <span className="font-mono text-slate-400 block uppercase">Official Notes</span>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{plan.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>{plan.modelRows?.length || 0} models supported</span>
                <span>Values calculated per standard 800 in / 50k cached / 162 out workload</span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[10px]">
                      <th className="py-2.5 px-3">Model</th>
                      <th className="py-2.5 px-3">Allowance / Window</th>
                      <th className="py-2.5 px-3 text-right">Cost / Req</th>
                      <th className="py-2.5 px-3 text-right">Requests / Mo</th>
                      <th className="py-2.5 px-3 text-right">Tokens / Mo</th>
                      <th className="py-2.5 px-3 text-right">Tokens / $1</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {plan.modelRows?.map((m, idx) => {
                      const mPattern = m.patternUsed || { input: 800, cachedRead: 50000, output: 162 };
                      const mTokensPerReq = mPattern.input + mPattern.cachedRead + mPattern.output;
                      const mTokensPerDollar = (m.normalizedPer1 ?? 0) * mTokensPerReq;

                      return (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="py-2.5 px-3 text-slate-200 font-medium">
                            {m.model}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {m.allowance ? `${m.allowance} ${m.unit || 'req'} / ${m.window}` : 'Credit pool'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            ${(m.costPerRequest ?? 0).toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {m.requestsPerMonth ? formatNumber(m.requestsPerMonth, 0) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {formatTokens(m.rawTokensPerMonth)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                            {formatTokens(mTokensPerDollar)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="font-mono text-slate-400 block uppercase">DATA PRIVACY & CODE RETENTION</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">Tier {plan.dataTier || '—'}</span>
                  <span className="text-slate-400">· {plan.dataTierNote || 'No specific privacy note'}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="font-mono text-slate-400 block uppercase">VERIFICATION & SOURCES</span>
                <div className="text-slate-300">
                  Last verified: <span className="font-mono font-medium text-white">{plan.verifiedAt || 'Official source build'}</span>
                </div>
                {plan.sourceIds && plan.sourceIds.length > 0 && (
                  <div className="space-y-1 pt-2">
                    <span className="text-slate-400">Official documentation sources tracked:</span>
                    <ul className="list-disc list-inside text-emerald-400 font-mono space-y-0.5">
                      {plan.sourceIds.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs font-mono text-emerald-300 leading-relaxed">
                {JSON.stringify(plan, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs text-slate-400 shrink-0">
          <span>Plan ID: {plan.id}</span>
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
