import React from 'react';
import { Methodology } from '../types/vibeplan';
import { BookOpen, ShieldCheck, Cpu, Clock, GitBranch, ExternalLink, Terminal } from 'lucide-react';

interface MethodologyViewProps {
  methodology?: Methodology;
}

export const MethodologyView: React.FC<MethodologyViewProps> = ({ methodology }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
          <BookOpen className="w-3.5 h-3.5" />
          <span>SCIENTIFIC BENCHMARKING METHODOLOGY</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          How Coding Plan Economics Are Calculated
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Marketing claims such as “Unlimited requests” or “500 fast requests” conceal critical differences in model allowances,
          prompt caching, and throughput throttles. Here is the open-source mathematical framework behind every metric shown.
        </p>
      </div>

      {/* Formula Card */}
      <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>Cache-Aware Cost per Request Formula</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs sm:text-sm text-emerald-300 overflow-x-auto leading-relaxed">
          Cost per Request = [ (0.05 × Input + 0.95 × CachedWrite) × Pattern.Input + CachedRead × Pattern.CachedRead + Output × Pattern.Output ] / 1,000,000
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg space-y-1">
            <span className="font-mono text-slate-400 font-semibold block">800 Input Tokens</span>
            <span className="text-slate-300">
              The fresh developer prompt, diff instruction, or incremental message.
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg space-y-1">
            <span className="font-mono text-slate-400 font-semibold block">50,000 Cached Read</span>
            <span className="text-slate-300">
              Repository context, file buffers, and AST tree loaded from prompt cache.
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg space-y-1">
            <span className="font-mono text-slate-400 font-semibold block">162 Output Tokens</span>
            <span className="text-slate-300">
              Generated code diff, response explanations, and edit operations.
            </span>
          </div>
        </div>
      </div>

      {/* Core Principles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Principle 1 */}
        <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>5-Hour Window Caps Are Throughput Limits</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Many providers (such as Anthropic and OpenAI) enforce strict rolling 5-hour rate limits.
            These window limits are throughput caps to prevent burst exhaustion; they are <strong>never multiplied</strong> into monthly quotas because no developer operates continuously at 100% capacity for 720 hours a month.
          </p>
        </div>

        {/* Principle 2 */}
        <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Data Privacy & Training Tiers</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>Tier A:</strong> Zero data retention, customer code is never trained on.<br />
            <strong>Tier B:</strong> Business opt-out available.<br />
            <strong>Tier C:</strong> Stored for 30-day abuse review.<br />
            <strong>Tier D:</strong> Model training or unverified third-party proxy.
          </p>
        </div>
      </div>

      {/* Undisclosed Rule */}
      <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Terminal className="w-4 h-4 text-slate-300" />
          <span>The Zero-Invention Rule</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          If a provider does not publish concrete token or request quotas (labeling their tier as “fair use” or “unlimited”),
          the quota is left as <strong>undisclosed</strong>. We never hallucinate or invent synthetic numbers to populate tables.
          Official documentation links and verification timestamps are maintained for every source.
        </p>
      </div>

      {/* Open Source License & Attribution */}
      <div className="border border-slate-800 bg-slate-900/80 rounded-xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <span>Open Source Attribution</span>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            MIT License
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          This project incorporates the open dataset, parser pipelines, and test suites maintained by{' '}
          <strong className="text-white">harrytyp/coding-plan-comparison</strong> on GitHub and deployed at{' '}
          <a
            href="https://vibeplan.cc"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            vibeplan.cc
          </a>. Provider trademarks and official quotas belong to their respective owners.
        </p>

        <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono">
          <a
            href="https://github.com/harrytyp/coding-plan-comparison"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <span>GitHub Repository</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://vibeplan.cc/data/latest.json"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <span>Raw JSON Feed</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
