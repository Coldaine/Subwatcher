import React from 'react';
import { SyncState } from '../types/vibeplan';
import { X, RefreshCw, CheckCircle2, AlertCircle, Database, Globe, ShieldCheck } from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: SyncState;
  onTriggerSync: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  syncState,
  onTriggerSync,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                VibePlan Data Synchronization
              </h3>
              <p className="text-xs text-slate-400">
                Official daily benchmark from vibeplan.cc
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Cards */}
        <div className="space-y-3 text-xs">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Active Source:</span>
              <span className="font-mono font-bold text-emerald-400 capitalize">
                {syncState.source === 'live' ? 'Live upstream feed' : syncState.source === 'cache' ? 'Local storage cache' : 'Verified local snapshot'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tracked Plans:</span>
              <span className="font-mono text-slate-200 font-semibold">
                {syncState.planCount} plans ({syncState.providerCount} providers)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Dataset Build Date:</span>
              <span className="font-mono text-slate-300">
                {new Date(syncState.generatedAt).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Last Synced:</span>
              <span className="font-mono text-slate-300">
                {new Date(syncState.lastSyncedAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 text-slate-300">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Upstream Origin</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Synchronizes directly with <code className="text-emerald-400">https://vibeplan.cc/data/latest.json</code>.
              The upstream CI repository runs automated rebuilds daily at 03:17 UTC and commits changes upon provider quota updates.
            </p>
          </div>

          {syncState.error && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-start gap-2 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Notice:</span>
                <span>{syncState.error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onTriggerSync}
            disabled={syncState.isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncState.isLoading ? 'animate-spin' : ''}`} />
            <span>{syncState.isLoading ? 'Fetching Upstream Data...' : 'Sync Fresh Data Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
