import { useState } from 'react';
import { useGDPNowcast } from '../../api/hooks/use-gdp-nowcast';

// --- Constants ---

const ACCENT = '#2dd4bf'; // teal-400
const ACCENT_DIM = 'rgba(45,212,191,0.08)';

const ECONOMY_TABS = [
  { code: 'US', label: 'US' },
  { code: 'EU', label: 'EU' },
  { code: 'UK', label: 'UK' },
  { code: 'JP', label: 'JP' },
  { code: 'CN', label: 'CN' },
  { code: 'IN', label: 'IN' },
  { code: 'BR', label: 'BR' },
  { code: 'CA', label: 'CA' },
  { code: 'AU', label: 'AU' },
  { code: 'KR', label: 'KR' },
  { code: 'MX', label: 'MX' },
  { code: 'ID', label: 'ID' },
] as const;

// --- Formatting Helpers ---

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(decimals);
}

function fmtSigned(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '--';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(decimals) + '%';
}

// --- Color Helpers ---

function growthColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 3) return 'text-emerald-400';
  if (n >= 1.5) return 'text-emerald-400/80';
  if (n >= 0) return 'text-yellow-400';
  if (n >= -1) return 'text-orange-400';
  return 'text-red-400';
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function contributionColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function impactBadgeClass(impact: string | null | undefined): string {
  if (impact === 'positive') return 'bg-emerald-400/15 text-emerald-400';
  if (impact === 'negative') return 'bg-red-400/15 text-red-400';
  return 'bg-neutral-400/10 text-neutral-500';
}

function confidenceColor(n: number | null | undefined): string {
  if (n == null) return '#525252';
  if (n >= 80) return '#2dd4bf';
  if (n >= 60) return '#4ade80';
  if (n >= 40) return '#fbbf24';
  return '#f97316';
}

function trendArrow(trend: string | null | undefined): string {
  if (trend === 'rising' || trend === 'up') return '\u2191';
  if (trend === 'falling' || trend === 'down') return '\u2193';
  if (trend === 'stable' || trend === 'flat') return '\u2192';
  return '\u2192';
}

function trendColor(trend: string | null | undefined): string {
  if (trend === 'rising' || trend === 'up') return 'text-emerald-400';
  if (trend === 'falling' || trend === 'down') return 'text-red-400';
  return 'text-neutral-500';
}

// --- Section Header ---

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-2 py-1 bg-[#080808] border-b border-border/20 sticky top-0 z-10">
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-teal-400">
        {title}
      </span>
    </div>
  );
}

// --- Main Nowcast Display ---

function NowcastDisplay({ economy }: { economy: any }) {
  if (!economy) {
    return (
      <div className="px-3 py-6 text-center">
        <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-wider">
          NO DATA AVAILABLE
        </span>
      </div>
    );
  }

  const nowcast = economy?.nowcast;
  const revision = economy?.revision;
  const officialForecast = economy?.officialForecast;
  const consensus = economy?.consensus;
  const previousQuarter = economy?.previousQuarter;
  const confidence = economy?.confidence;

  return (
    <div className="border-b border-border/20">
      {/* Large nowcast number */}
      <div className="flex items-center gap-4 px-3 py-3 border-b border-border/10">
        <div className="flex flex-col">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            GDP NOWCAST (QoQ SAAR)
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-[22px] font-mono font-black tabular-nums ${growthColor(nowcast)}`}>
              {fmtNum(nowcast)}
              <span className="text-[10px] text-neutral-500 ml-0.5">%</span>
            </span>
            {revision != null && revision !== 0 && (
              <span className={`text-[10px] font-mono font-bold ${revision > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {revision > 0 ? '\u25B2' : '\u25BC'} {fmtSigned(revision)}
              </span>
            )}
          </div>
        </div>

        {/* Comparisons */}
        <div className="flex-1 grid grid-cols-3 gap-0">
          <div className="px-2 border-r border-border/10">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              VS OFFICIAL
            </div>
            <div className={`text-[11px] font-mono font-bold tabular-nums ${changeColor(nowcast != null && officialForecast != null ? nowcast - officialForecast : null)}`}>
              {nowcast != null && officialForecast != null ? fmtSigned(nowcast - officialForecast) : '--'}
            </div>
            <div className="text-[7px] font-mono text-neutral-600 tabular-nums">
              {fmtNum(officialForecast)}%
            </div>
          </div>
          <div className="px-2 border-r border-border/10">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              VS CONSNS
            </div>
            <div className={`text-[11px] font-mono font-bold tabular-nums ${changeColor(nowcast != null && consensus != null ? nowcast - consensus : null)}`}>
              {nowcast != null && consensus != null ? fmtSigned(nowcast - consensus) : '--'}
            </div>
            <div className="text-[7px] font-mono text-neutral-600 tabular-nums">
              {fmtNum(consensus)}%
            </div>
          </div>
          <div className="px-2">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              VS PREV Q
            </div>
            <div className={`text-[11px] font-mono font-bold tabular-nums ${changeColor(nowcast != null && previousQuarter != null ? nowcast - previousQuarter : null)}`}>
              {nowcast != null && previousQuarter != null ? fmtSigned(nowcast - previousQuarter) : '--'}
            </div>
            <div className="text-[7px] font-mono text-neutral-600 tabular-nums">
              {fmtNum(previousQuarter)}%
            </div>
          </div>
        </div>
      </div>

      {/* Model confidence bar */}
      <div className="px-3 py-1.5 flex items-center gap-2 border-b border-border/10">
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider shrink-0">
          MODEL CONFIDENCE
        </span>
        <div className="flex-1 h-2 bg-white/[0.03] relative">
          <div
            className="h-full transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, confidence ?? 0))}%`,
              background: confidenceColor(confidence),
              opacity: 0.7,
            }}
          />
        </div>
        <span
          className="text-[8px] font-mono font-bold tabular-nums w-8 text-right"
          style={{ color: confidenceColor(confidence) }}
        >
          {confidence != null ? `${confidence}%` : '--'}
        </span>
      </div>
    </div>
  );
}

// --- Component Breakdown Table ---

function ComponentBreakdown({ components }: { components?: any[] }) {
  const items = components ?? [];
  if (items.length === 0) return null;

  const maxAbsContrib = Math.max(
    ...items.map((c: any) => Math.abs(c?.contribution ?? 0)),
    0.01,
  );

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Component Breakdown" />

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_44px_52px_28px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          COMPONENT
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          CONTRIB
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          WEIGHT
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          LATEST
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          TRD
        </span>
      </div>

      {/* Rows */}
      {items.map((c: any, i: number) => {
        const contrib = c?.contribution ?? 0;
        const barPct = maxAbsContrib > 0 ? (Math.abs(contrib) / maxAbsContrib) * 50 : 0;
        const isPositive = contrib >= 0;

        return (
          <div
            key={c?.name ?? i}
            className="grid grid-cols-[1fr_64px_44px_52px_28px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">
              {c?.name ?? '--'}
            </span>

            {/* Contribution with inline bar */}
            <div className="flex items-center justify-end gap-1">
              <div className="w-[32px] h-2 relative bg-white/[0.03]">
                {isPositive ? (
                  <div
                    className="absolute top-0 left-1/2 h-full bg-emerald-400/60"
                    style={{ width: `${barPct}%` }}
                  />
                ) : (
                  <div
                    className="absolute top-0 h-full bg-red-400/60"
                    style={{
                      width: `${barPct}%`,
                      right: '50%',
                    }}
                  />
                )}
              </div>
              <span className={`text-[8px] font-mono font-bold tabular-nums ${contributionColor(contrib)}`}>
                {fmtSigned(contrib)}
              </span>
            </div>

            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {c?.weight != null ? fmtPct(c.weight) : '--'}
            </span>
            <span className="text-[8px] font-mono text-white text-right tabular-nums">
              {fmtNum(c?.latest)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-center ${trendColor(c?.trend)}`}>
              {trendArrow(c?.trend)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// --- Data Inputs Feed ---

function DataInputsFeed({ inputs }: { inputs?: any[] }) {
  const items = inputs ?? [];
  if (items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Data Inputs" />

      <div className="max-h-[160px] overflow-auto no-scrollbar">
        {items.map((item: any, i: number) => (
          <div
            key={item?.id ?? i}
            className="flex items-center gap-2 px-2 py-1.5 border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors"
          >
            {/* Timestamp */}
            <span className="text-[7px] font-mono text-neutral-600 shrink-0 w-14">
              {item?.date ?? '--'}
            </span>

            {/* Indicator name */}
            <span className="text-[8px] font-mono font-bold text-white truncate flex-1 min-w-0">
              {item?.indicator ?? '--'}
            </span>

            {/* Actual vs Expected */}
            {item?.actual != null && (
              <span className="text-[8px] font-mono tabular-nums text-neutral-300 shrink-0">
                {fmtNum(item.actual)}
              </span>
            )}
            {item?.expected != null && (
              <span className="text-[7px] font-mono text-neutral-600 shrink-0">
                exp {fmtNum(item.expected)}
              </span>
            )}

            {/* Impact badge */}
            <span className={`text-[7px] font-mono font-bold uppercase px-1 py-0.5 shrink-0 ${impactBadgeClass(item?.impact)}`}>
              {item?.impact === 'positive' ? 'POS' : item?.impact === 'negative' ? 'NEG' : 'NTL'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Historical Accuracy ---

function HistoricalAccuracy({ history }: { history?: any[] }) {
  const items = history ?? [];
  if (items.length === 0) return null;

  return (
    <div>
      <SectionHeader title="Historical Accuracy (Last 8Q)" />

      {/* Table header */}
      <div className="grid grid-cols-[1fr_52px_52px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          QUARTER
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          NOWCAST
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          ACTUAL
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          ERROR
        </span>
      </div>

      {items.slice(0, 8).map((q: any, i: number) => {
        const error = q?.nowcast != null && q?.actual != null ? q.nowcast - q.actual : null;
        return (
          <div
            key={q?.quarter ?? i}
            className="grid grid-cols-[1fr_52px_52px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-teal-400/80">
              {q?.quarter ?? '--'}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${growthColor(q?.nowcast)}`}>
              {fmtNum(q?.nowcast)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${growthColor(q?.actual)}`}>
              {fmtNum(q?.actual)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${error != null && Math.abs(error) <= 0.3 ? 'text-emerald-400' : error != null && Math.abs(error) <= 0.7 ? 'text-yellow-400' : 'text-red-400'}`}>
              {error != null ? fmtSigned(error) : '--'}
            </span>
          </div>
        );
      })}

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border/20">
        <span className="text-[7px] text-neutral-600/50 font-mono">
          Model estimates are not investment advice. Past accuracy does not guarantee future results.
        </span>
      </div>
    </div>
  );
}

// --- Main Panel ---

export function GDPNowcastPanel() {
  const { data, isLoading } = useGDPNowcast();
  const [selectedEconomy, setSelectedEconomy] = useState<string>('US');

  const d = data as any;

  if (isLoading && !d) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-teal-400/60 uppercase tracking-widest animate-pulse">
          LOADING GDP NOWCAST...
        </div>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-teal-400/60 uppercase tracking-widest">
          NO DATA AVAILABLE
        </div>
      </div>
    );
  }

  const economy = d?.economies?.[selectedEconomy];
  const globalSummary = d?.globalSummary;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-teal-400" viewBox="0 0 16 16" fill="none">
            <path d="M2 12V8l2-3 2 4 2-5 2 3 2-1 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
            <line x1="2" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter text-teal-400">
            GDP NOWCAST
          </span>
        </div>
        <div className="flex items-center gap-3">
          {globalSummary?.globalGrowth != null && (
            <span className="text-[7px] text-neutral-500 uppercase tracking-wider">
              GLOBAL{' '}
              <span className={`font-bold ${growthColor(globalSummary.globalGrowth)}`}>
                {fmtNum(globalSummary.globalGrowth)}%
              </span>
            </span>
          )}
          {d?.lastUpdated && (
            <span className="text-[7px] text-neutral-600">
              UPD {d.lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* Economy selector tabs */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-border/20 bg-black/40 shrink-0 overflow-x-auto no-scrollbar">
        {ECONOMY_TABS.map((e) => (
          <button
            key={e.code}
            onClick={() => setSelectedEconomy(e.code)}
            className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider transition-all shrink-0 ${
              selectedEconomy === e.code
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-neutral-500 hover:text-white border-b-2 border-transparent'
            }`}
            style={selectedEconomy === e.code ? { background: ACCENT_DIM } : undefined}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Main nowcast display */}
        <NowcastDisplay economy={economy} />

        {/* Component breakdown */}
        <ComponentBreakdown components={economy?.components} />

        {/* Data inputs feed */}
        <DataInputsFeed inputs={economy?.dataInputs} />

        {/* Historical accuracy */}
        <HistoricalAccuracy history={economy?.history} />
      </div>
    </div>
  );
}
