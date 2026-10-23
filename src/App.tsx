import React, { useState, useEffect } from 'react';
import { VibeplanDataset, Plan, Currency, SyncState } from './types/vibeplan';
import { loadVibeplanData, syncLiveVibeplanData } from './lib/vibeplan-engine';
import { Header } from './components/Header';
import { ParetoView } from './components/ParetoView';
import { PlansMatrix } from './components/PlansMatrix';
import { CalculatorView } from './components/CalculatorView';
import { MethodologyView } from './components/MethodologyView';
import { CompareTray } from './components/CompareTray';
import { CompareModal } from './components/CompareModal';
import { PlanDetailModal } from './components/PlanDetailModal';
import { SyncModal } from './components/SyncModal';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [dataset, setDataset] = useState<VibeplanDataset | null>(null);
  const [syncState, setSyncState] = useState<SyncState>({
    source: 'bundled',
    lastSyncedAt: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    planCount: 0,
    providerCount: 0,
    isLoading: true,
    error: null,
  });

  const [currentTab, setCurrentTab] = useState<'pareto' | 'matrix' | 'calculator' | 'methodology'>('pareto');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [comparePlanIds, setComparePlanIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Load dataset on initial mount
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const { data, syncState: loadedSyncState } = await loadVibeplanData();
        if (isMounted) {
          setDataset(data);
          setSyncState(loadedSyncState);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : String(err);
          setSyncState(prev => ({
            ...prev,
            isLoading: false,
            error: msg,
          }));
        }
      }
    }
    init();
    return () => { isMounted = false; };
  }, []);

  // Handle manual sync trigger
  const handleTriggerSync = async () => {
    setSyncState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { data, syncState: freshSyncState } = await syncLiveVibeplanData();
      setDataset(data);
      setSyncState(freshSyncState);
      showToast(`Successfully synced ${freshSyncState.planCount} plans from vibeplan.cc!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncState(prev => ({
        ...prev,
        isLoading: false,
        error: msg,
      }));
      showToast(`Sync failed: using verified local dataset.`);
    }
  };

  // Toggle plan in comparison tray (max 4)
  const handleToggleCompare = (planId: string) => {
    setComparePlanIds(prev => {
      if (prev.includes(planId)) {
        return prev.filter(id => id !== planId);
      }
      if (prev.length >= 4) {
        showToast('Maximum 4 plans can be compared simultaneously.');
        return prev;
      }
      showToast('Added to comparison tray');
      return [...prev, planId];
    });
  };

  const handleRemoveCompare = (planId: string) => {
    setComparePlanIds(prev => prev.filter(id => id !== planId));
  };

  const handleClearCompare = () => {
    setComparePlanIds([]);
  };

  const comparedPlans = dataset?.plans.filter(p => comparePlanIds.includes(p.id)) || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currency={currency}
        setCurrency={setCurrency}
        syncState={syncState}
        onSyncClick={() => setIsSyncModalOpen(true)}
        compareCount={comparePlanIds.length}
        onOpenCompare={() => setIsCompareModalOpen(true)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-emerald-300 px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {syncState.isLoading && !dataset ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm font-mono text-slate-400">
              Loading 139+ coding subscription models & quotas...
            </p>
          </div>
        ) : !dataset ? (
          <div className="p-8 border border-rose-900/40 bg-rose-950/20 rounded-xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Failed to load dataset</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{syncState.error}</p>
            <button
              type="button"
              onClick={handleTriggerSync}
              className="px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-lg"
            >
              Retry Sync
            </button>
          </div>
        ) : (
          <div>
            {currentTab === 'pareto' && (
              <ParetoView
                plans={dataset.plans}
                currency={currency}
                onSelectPlan={setSelectedPlan}
                comparePlanIds={comparePlanIds}
                onToggleCompare={handleToggleCompare}
              />
            )}

            {currentTab === 'matrix' && (
              <PlansMatrix
                plans={dataset.plans}
                currency={currency}
                onSelectPlan={setSelectedPlan}
                comparePlanIds={comparePlanIds}
                onToggleCompare={handleToggleCompare}
              />
            )}

            {currentTab === 'calculator' && (
              <CalculatorView
                plans={dataset.plans}
                currency={currency}
                onSelectPlan={setSelectedPlan}
                comparePlanIds={comparePlanIds}
                onToggleCompare={handleToggleCompare}
              />
            )}

            {currentTab === 'methodology' && (
              <MethodologyView methodology={dataset.methodology} />
            )}
          </div>
        )}
      </main>

      {/* Floating Compare Tray */}
      {dataset && (
        <CompareTray
          plans={dataset.plans}
          comparePlanIds={comparePlanIds}
          onRemovePlan={handleRemoveCompare}
          onClearAll={handleClearCompare}
          onOpenModal={() => setIsCompareModalOpen(true)}
        />
      )}

      {/* Compare Modal */}
      {isCompareModalOpen && (
        <CompareModal
          plans={comparedPlans}
          currency={currency}
          onClose={() => setIsCompareModalOpen(false)}
          onRemovePlan={handleRemoveCompare}
          onClearAll={handleClearCompare}
          onSelectPlan={setSelectedPlan}
        />
      )}

      {/* Plan Detail Modal */}
      {selectedPlan && (
        <PlanDetailModal
          plan={selectedPlan}
          currency={currency}
          onClose={() => setSelectedPlan(null)}
          isCompared={comparePlanIds.includes(selectedPlan.id)}
          onToggleCompare={() => handleToggleCompare(selectedPlan.id)}
        />
      )}

      {/* Sync Status & Action Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncState={syncState}
        onTriggerSync={handleTriggerSync}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 mt-16 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">VibePlan Matrix</span>
            <span aria-hidden="true">·</span>
            <span>Based on open-source code from <code className="text-slate-300">harrytyp/coding-plan-comparison</code> (MIT)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <a
              href="https://github.com/harrytyp/coding-plan-comparison"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-200 transition-colors"
            >
              GitHub Repo
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://vibeplan.cc"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-200 transition-colors"
            >
              vibeplan.cc
            </a>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="text-emerald-400 hover:underline"
            >
              Data Sync Status
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
