import React from 'react';
import { Currency, SyncState } from '../types/vibeplan';
import { RefreshCw, CheckCircle2, AlertCircle, GitCompare, Calculator, BarChart3, Layers, Info } from 'lucide-react';

interface HeaderProps {
  currentTab: 'pareto' | 'matrix' | 'calculator' | 'methodology';
  setCurrentTab: (tab: 'pareto' | 'matrix' | 'calculator' | 'methodology') => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  syncState: SyncState;
  onSyncClick: () => void;
  compareCount: number;
  onOpenCompare: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  currency,
  setCurrency,
  syncState,
  onSyncClick,
  compareCount,
  onOpenCompare,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        
        {/* Zone 1: Single text element Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentTab('pareto');
            }}
            className="flex items-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 transition-colors">
              <span className="font-mono text-xs font-bold">VP</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
              VibePlan Matrix
            </span>
          </a>
        </div>

        {/* Zone 2: Navigation Links (single-line, clean unboxed typography) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setCurrentTab('pareto')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              currentTab === 'pareto'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Best Value</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              currentTab === 'matrix'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Plans Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('calculator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              currentTab === 'calculator'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Quota Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('methodology')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              currentTab === 'methodology'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Methodology</span>
          </button>
        </nav>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Currency Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5 text-xs font-mono">
            {(['USD', 'EUR', 'CNY'] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`px-2 py-1 rounded transition-colors ${
                  currency === c
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Compare Button Trigger (if plans selected) */}
          {compareCount > 0 && (
            <button
              type="button"
              onClick={onOpenCompare}
              className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 rounded-md hover:bg-emerald-900/60 transition-colors whitespace-nowrap"
            >
              <GitCompare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Compare ({compareCount})</span>
            </button>
          )}

          {/* Sync Status Button */}
          <button
            type="button"
            onClick={onSyncClick}
            disabled={syncState.isLoading}
            title={`Dataset: ${syncState.source} (${syncState.planCount} plans, ${syncState.providerCount} providers). Click to refresh.`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors whitespace-nowrap"
          >
            {syncState.isLoading ? (
              <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
            ) : syncState.error ? (
              <AlertCircle className="w-3 h-3 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            )}
            <span className="hidden sm:inline">
              {syncState.isLoading ? 'Syncing...' : 'Live Sync'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="flex md:hidden px-4 py-2 border-t border-slate-800/60 bg-slate-950/95 overflow-x-auto gap-2">
        <button
          type="button"
          onClick={() => setCurrentTab('pareto')}
          className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
            currentTab === 'pareto' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
          }`}
        >
          Best Value
        </button>
        <button
          type="button"
          onClick={() => setCurrentTab('matrix')}
          className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
            currentTab === 'matrix' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
          }`}
        >
          All Plans
        </button>
        <button
          type="button"
          onClick={() => setCurrentTab('calculator')}
          className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
            currentTab === 'calculator' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
          }`}
        >
          Calculator
        </button>
        <button
          type="button"
          onClick={() => setCurrentTab('methodology')}
          className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
            currentTab === 'methodology' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
          }`}
        >
          Methodology
        </button>
      </div>
    </header>
  );
};
