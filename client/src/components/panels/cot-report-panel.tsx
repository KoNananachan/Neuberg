import { useState, useMemo } from 'react';
import { useCotReport, type CotEntry } from '../../api/hooks/use-cot-report';
import { useT, tr, TFn } from '../../i18n';
import { BarChart3, RefreshCw } from 'lucide-react';

// ── Types ──

type CategoryFilter = 'all' | 'equity_index' | 'metal' | 'energy' | 'currency' | 'agriculture' | 'bond';

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'equity_index', label: 'EQUITY INDEX' },
  { key: 'metal', label: 'METAL' },
  { key: 'energy', label: 'ENERGY' },
  { key: 'currency', label: 'CURRENCY' },
  { key: 'agriculture', label: 'AGRICULTURE' },
  { key: 'bond', label: 'BOND' },
];

// ── Formatting helpers ──

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${fmtCompact(n)}`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

// ── Color helpers ──

function netColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400/70';
  if (n < 0) return 'text-red-400/70';
  return 'text-neutral-600';
}

function percentileColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 60) return 'bg-green-500/60';
  if (pct >= 40) return 'bg-amber-500/60';
  if (pct >= 20) return 'bg-red-500/60';
  return 'bg-red-500';
}

// ── Sparkline component ──

function Sparkline({ data, width = 48, height = 16 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  });

  const lastVal = data[data.length - 1];
  const strokeColor = lastVal >= 0 ? '#4ade80' : '#f87171';

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Main Panel ──

export function CotReportPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCotReport();
  const [category, setCategory] = useState<CategoryFilter>('all');

  const filtered = useMemo(() => {
    if (!data) return [];
    if (category === 'all') return data.entries;
    return data.entries.filter((e) => e.category === category);
  }, [data, category]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {tr(t, 'cotTitle', 'COT Report')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="px-1.5 py-0.5 text-[7px] font-mono text-amber-400/70 bg-amber-500/10 border border-amber-500/20">
              {data.reportDate}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCategory(tab.key)}
            className={`px-2 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              category === tab.key
                ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                : 'text-neutral-600 hover:text-neutral-400 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cotNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {/* Table */}
            <CotTable entries={filtered} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Table Header ──

function CotTableHeader() {
  return (
    <div className="grid grid-cols-[72px_88px_88px_56px_72px_52px_64px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303] sticky top-0 z-10">
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Symbol</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Commercial</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Spec</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Small</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">OI</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Spec%OI</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Percentile</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Signal</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">12W</span>
    </div>
  );
}

// ── Table ──

function CotTable({ entries }: { entries: CotEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-600 text-[8px] font-mono uppercase">
        No contracts in this category
      </div>
    );
  }

  return (
    <div>
      <CotTableHeader />
      {entries.map((entry) => (
        <CotRow key={entry.symbol} entry={entry} />
      ))}
    </div>
  );
}

// ── Table Row ──

function CotRow({ entry }: { entry: CotEntry }) {
  return (
    <div className="grid grid-cols-[72px_88px_88px_56px_72px_52px_64px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors items-center">
      {/* Symbol + Name */}
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] font-mono font-bold text-white leading-tight">{entry.symbol}</span>
        <span className="text-[7px] font-mono text-neutral-600 leading-tight truncate">{entry.name}</span>
      </div>

      {/* Commercial Net + Change */}
      <div className="flex flex-col items-end min-w-0">
        <span className={`text-[9px] font-mono font-bold leading-tight ${netColor(entry.commercialNet)}`}>
          {fmtCompact(entry.commercialNet)}
        </span>
        <span className={`text-[7px] font-mono leading-tight ${changeColor(entry.commercialNetChange)}`}>
          {fmtChange(entry.commercialNetChange)}
        </span>
      </div>

      {/* Spec Net + Change */}
      <div className="flex flex-col items-end min-w-0">
        <span className={`text-[9px] font-mono font-bold leading-tight ${netColor(entry.specNet)}`}>
          {fmtCompact(entry.specNet)}
        </span>
        <span className={`text-[7px] font-mono leading-tight ${changeColor(entry.specNetChange)}`}>
          {fmtChange(entry.specNetChange)}
        </span>
      </div>

      {/* Small Net */}
      <div className="flex items-center justify-end">
        <span className={`text-[8px] font-mono leading-tight ${netColor(entry.smallNet)}`}>
          {fmtCompact(entry.smallNet)}
        </span>
      </div>

      {/* OI + Change */}
      <div className="flex flex-col items-end min-w-0">
        <span className="text-[9px] font-mono text-neutral-300 leading-tight">
          {fmtCompact(entry.openInterest)}
        </span>
        <span className={`text-[7px] font-mono leading-tight ${changeColor(entry.oiChange)}`}>
          {fmtChange(entry.oiChange)}
        </span>
      </div>

      {/* Spec % OI */}
      <div className="flex items-center justify-end">
        <span className={`text-[8px] font-mono leading-tight ${netColor(entry.specNetPctOI)}`}>
          {fmtPct(entry.specNetPctOI)}
        </span>
      </div>

      {/* Percentile bar */}
      <div className="flex items-center justify-center px-1">
        <div className="w-full h-3 bg-white/[0.04] relative">
          <div
            className={`h-full ${percentileColor(entry.specNetPercentile)} transition-all`}
            style={{ width: `${entry.specNetPercentile}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-mono font-bold text-white/80">
            {entry.specNetPercentile}
          </span>
        </div>
      </div>

      {/* Signal badge */}
      <div className="flex items-center justify-center">
        {entry.extremeSignal && <SignalBadge signal={entry.extremeSignal} />}
      </div>

      {/* Sparkline */}
      <div className="flex items-center justify-end pr-1">
        <Sparkline data={entry.specNetHistory} />
      </div>
    </div>
  );
}

// ── Signal Badge ──

function SignalBadge({ signal }: { signal: string }) {
  const isLong = signal === 'EXTREME_LONG';
  const bgClass = isLong ? 'bg-green-500/15 border-green-500/30' : 'bg-red-500/15 border-red-500/30';
  const textClass = isLong ? 'text-green-400' : 'text-red-400';
  const label = isLong ? 'LONG' : 'SHORT';

  return (
    <span className={`px-1 py-0.5 text-[6px] font-mono font-black uppercase tracking-wider border ${bgClass} ${textClass}`}>
      {label}
    </span>
  );
}
