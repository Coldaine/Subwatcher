import React from 'react';
import { Plan } from '../types/vibeplan';
import { GitCompare, X, ArrowRight } from 'lucide-react';

interface CompareTrayProps {
  plans: Plan[];
  comparePlanIds: string[];
  onRemovePlan: (planId: string) => void;
  onClearAll: () => void;
  onOpenModal: () => void;
}

export const CompareTray: React.FC<CompareTrayProps> = ({
  plans,
  comparePlanIds,
  onRemovePlan,
  onClearAll,
  onOpenModal,
}) => {
  if (comparePlanIds.length === 0) return null;

  const selectedPlans = plans.filter((p) => comparePlanIds.includes(p.id));

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4">
      <div className="bg-slate-900/95 border border-emerald-500/40 rounded-xl shadow-2xl backdrop-blur-md p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left items: count + chips */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-semibold px-2 py-1 bg-emerald-950/80 rounded border border-emerald-500/30 shrink-0">
            <GitCompare className="w-3.5 h-3.5" />
            <span>{selectedPlans.length}/4</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {selectedPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center gap-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 shrink-0"
              >
                <span className="font-medium truncate max-w-[120px]">{plan.name}</span>
                <button
                  type="button"
                  onClick={() => onRemovePlan(plan.id)}
                  className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                  aria-label={`Remove ${plan.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right items: Clear + Compare CTA */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded transition-colors"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={onOpenModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <span>Compare Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
