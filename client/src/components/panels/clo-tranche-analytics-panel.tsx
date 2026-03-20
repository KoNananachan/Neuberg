import { useState } from 'react';
import { useCloTrancheAnalytics } from '../../api/hooks/use-clo-tranche-analytics';
import { useT, tr, TFn } from '../../i18n';
import {
  RefreshCw,
  Layers,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  Trophy,
  Rocket,
  Activity,
} from 'lucide-react';

const ACCENT = '#22d3ee'; // cyan-400
const DIM = 'rgba(34,211,238,0.08)';

// ── Tranche colors (AAA -> Equity) ──

const TRANCHE_COLORS: Record<string, string> = {
  AAA: '#22d3ee',
  AA: '#38bdf8',
  A: '#818cf8',
  BBB: '#a78bfa',
  BB: '#f472b6',
  B: '#fb923c',
  EQUITY: '#ef4444',
};

function trancheColor(rating: string | null | undefined): string {
  if (!rating) return '#6b7280';
  const key = rating.toUpperCase().replace(/[+-]/g, '');
  return TRANCHE_COLORS[key] ?? '#6b7280';
}

// ── Formatting helpers ──

function fmtB(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return `${n.toFixed(0)}bp`;
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '--';
  return `${n.toFixed(decimals)}%`;
}

function fmtX(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return `${n.toFixed(2)}x`;
}

function fmtNum(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(decimals);
}

function fmtWal(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return `${n.toFixed(1)}y`;
}

// ── Color helpers ──

function spreadColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 300) return 'text-red-400';
  if (n > 150) return 'text-orange-400';
  if (n > 80) return 'text-yellow-400';
  return 'text-cyan-400';
}

function warfColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 3000) return 'text-red-400';
  if (n >= 2800) return 'text-orange-400';
  if (n >= 2600) return 'text-yellow-400';
  return 'text-green-400';
}

function diversityColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 80) return 'text-green-400';
  if (n >= 60) return 'text-yellow-400';
  if (n >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function passFailBadge(status: string | null | undefined): { text: string; cls: string } {
  const s = status?.toLowerCase() ?? '';
  if (s === 'pass') return { text: 'PASS', cls: 'text-green-400 bg-green-500/15 border-green-500/30' };
  if (s === 'warning' || s === 'warn') return { text: 'WARN', cls: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' };
  if (s === 'fail') return { text: 'FAIL', cls: 'text-red-400 bg-red-500/15 border-red-500/30' };
  return { text: (status ?? '--').toUpperCase(), cls: 'text-neutral-500 bg-neutral-500/10 border-neutral-500/20' };
}

function statusColor(status: string | null | undefined): string {
  const s = status?.toLowerCase() ?? '';
  if (s === 'pricing' || s === 'priced') return 'text-green-400';
  if (s === 'in market' || s === 'marketing') return 'text-yellow-400';
  if (s === 'mandated') return 'text-cyan-400';
  if (s === 'pre-marketing') return 'text-orange-400';
  return 'text-neutral-400';
}

// ── Section header ──

function SectionHeader({
  title,
  icon: Icon,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/10 bg-[#030303]">
      {Icon && <Icon className="w-3 h-3 text-cyan-400/60" />}
      <div className="w-[2px] h-3 bg-cyan-400" />
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-cyan-400">
        {title}
      </span>
    </div>
  );
}

// ── Tab type ──

type Tab = 'DEALS' | 'WATERFALL' | 'QUALITY' | 'PIPELINE' | 'SPREADS';

// ── SVG Icon ──

function CloTrancheIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="1" y="1" width="14" height="2" fill="#22d3ee" opacity="0.9" />
      <rect x="2" y="4" width="12" height="2" fill="#38bdf8" opacity="0.7" />
      <rect x="3" y="7" width="10" height="2" fill="#818cf8" opacity="0.55" />
      <rect x="4" y="10" width="8" height="2" fill="#a78bfa" opacity="0.4" />
      <rect x="5" y="13" width="6" height="2" fill="#ef4444" opacity="0.3" />
    </svg>
  );
}

// ── Main Panel ──

export function CloTrancheAnalyticsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCloTrancheAnalytics();
  const [tab, setTab] = useState<Tab>('DEALS');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <CloTrancheIcon />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr(t, 'cloTrancheAnalytics', 'CLO Tranche Analytics')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['DEALS', 'WATERFALL', 'QUALITY', 'PIPELINE', 'SPREADS'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t_}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!d && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cloNoData', 'No data available')}
          </div>
        )}

        {d && tab === 'DEALS' && <DealsTab data={d} t={t} />}
        {d && tab === 'WATERFALL' && <WaterfallTab data={d} t={t} />}
        {d && tab === 'QUALITY' && <QualityTab data={d} t={t} />}
        {d && tab === 'PIPELINE' && <PipelineTab data={d} t={t} />}
        {d && tab === 'SPREADS' && <SpreadsTab data={d} t={t} />}
      </div>

      {/* Timestamp */}
      {d?.timestamp && (
        <div className="px-3 py-1 border-t border-border/10 shrink-0">
          <span className="text-[7px] font-mono text-neutral-700">
            {tr(t, 'cloLastUpdate', 'Last update')}: {new Date(d.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── DEALS TAB: Deal Universe Table + Manager League Table
// ══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DealsTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deals: any[] = data?.dealUniverse ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const managers: any[] = data?.managerLeagueTable ?? [];

  return (
    <div>
      {/* Deal Universe Table */}
      <SectionHeader title={tr(t, 'cloDealUniverse', 'Deal Universe')} icon={Layers} />
      {deals.length === 0 ? (
        <div className="text-center py-4 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'cloNoDeals', 'No deal data')}
        </div>
      ) : (
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
            <tr>
              <th className="px-2 py-1.5 text-left font-bold">Manager</th>
              <th className="px-2 py-1.5 text-right font-bold">Vintage</th>
              <th className="px-2 py-1.5 text-right font-bold">AUM</th>
              <th className="px-2 py-1.5 text-right font-bold">WAL</th>
              <th className="px-2 py-1.5 text-right font-bold">WARF</th>
              <th className="px-2 py-1.5 text-right font-bold">Diversity</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {deals.map((deal: any, i: number) => (
              <tr key={`${deal?.manager}-${deal?.vintage}-${i}`} className="border-b border-border/5 hover:bg-cyan-400/[0.02]">
                <td className="px-2 py-1.5 font-bold truncate max-w-[100px]" style={{ color: ACCENT }}>
                  {deal?.manager ?? '--'}
                </td>
                <td className="px-2 py-1.5 text-right text-white/80">
                  {deal?.vintage ?? '--'}
                </td>
                <td className="px-2 py-1.5 text-right text-white/80">
                  {fmtB(deal?.aum)}
                </td>
                <td className="px-2 py-1.5 text-right text-white/70">
                  {fmtWal(deal?.wal)}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${warfColor(deal?.warf)}`}>
                  {fmtNum(deal?.warf, 0)}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${diversityColor(deal?.diversity)}`}>
                  {fmtNum(deal?.diversity, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Manager League Table */}
      <SectionHeader title={tr(t, 'cloManagerLeague', 'Manager League Table')} icon={Trophy} />
      {managers.length === 0 ? (
        <div className="text-center py-4 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'cloNoManagers', 'No manager data')}
        </div>
      ) : (
        <ManagerLeagueTable managers={managers} />
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ManagerLeagueTable({ managers }: { managers: any[] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxAum = Math.max(...managers.map((m: any) => m?.aum ?? 0), 1);

  return (
    <div className="px-2 py-1.5">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {managers.map((m: any, i: number) => {
        const aumVal = m?.aum ?? 0;
        const barPct = (aumVal / maxAum) * 100;
        return (
          <div key={`${m?.name}-${i}`} className="flex items-center gap-2 py-1 hover:bg-cyan-400/[0.02]">
            <span className="text-[8px] font-mono font-bold text-neutral-500 w-4 text-right shrink-0">
              {i + 1}
            </span>
            <span className="text-[8px] font-mono font-bold text-white/90 w-[80px] truncate shrink-0">
              {m?.name ?? '--'}
            </span>
            <div className="flex-1 h-3 bg-neutral-900 relative">
              <div
                className="absolute inset-y-0 left-0 bg-cyan-400/30"
                style={{ width: `${barPct}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-cyan-400/60"
                style={{ width: `${barPct}%`, maxWidth: '2px' }}
              />
              <svg
                width="100%"
                height="12"
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
                className="absolute inset-0"
              >
                <rect
                  x={0}
                  y={0}
                  width={barPct * 2}
                  height={12}
                  fill="rgba(34,211,238,0.25)"
                />
                <rect
                  x={0}
                  y={0}
                  width={barPct * 2}
                  height={1}
                  fill="rgba(34,211,238,0.5)"
                />
              </svg>
            </div>
            <span className="text-[8px] font-mono font-bold text-cyan-400 w-[48px] text-right shrink-0">
              {fmtB(aumVal)}
            </span>
            {m?.deals != null && (
              <span className="text-[7px] font-mono text-neutral-600 w-[28px] text-right shrink-0">
                {m.deals}d
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── WATERFALL TAB: Tranche Waterfall Visualization
// ══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WaterfallTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tranches: any[] = data?.trancheWaterfall ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ocIcTests: any[] = data?.ocIcTests ?? [];

  return (
    <div>
      {/* Tranche Waterfall SVG */}
      <SectionHeader title={tr(t, 'cloTrancheWaterfall', 'Tranche Waterfall')} icon={Layers} />
      {tranches.length === 0 ? (
        <div className="text-center py-4 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'cloNoTranches', 'No tranche data')}
        </div>
      ) : (
        <TrancheWaterfallChart tranches={tranches} />
      )}

      {/* OC/IC Test Indicators */}
      <SectionHeader title={tr(t, 'cloOcIcTests', 'OC / IC Test Results')} icon={ShieldCheck} />
      {ocIcTests.length === 0 ? (
        <div className="text-center py-4 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'cloNoTests', 'No test data')}
        </div>
      ) : (
        <OcIcTestGrid tests={ocIcTests} />
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TrancheWaterfallChart({ tranches }: { tranches: any[] }) {
  const chartWidth = 300;
  const chartHeight = 180;
  const barWidth = 32;
  const gapX = 6;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPct = tranches.reduce((s: number, tr: any) => s + (tr?.pct ?? tr?.size ?? 0), 0) || 100;

  // Stacked vertical bar: each tranche is a horizontal slice from top (AAA) to bottom (Equity)
  let offsetY = 0;
  const segments = tranches.map((tr_: any) => {
    const pct = tr_?.pct ?? tr_?.size ?? 0;
    const h = (pct / totalPct) * chartHeight;
    const seg = {
      y: offsetY,
      h,
      pct,
      rating: tr_?.rating ?? tr_?.tranche ?? '--',
      spread: tr_?.spread,
      coupon: tr_?.coupon,
      color: trancheColor(tr_?.rating ?? tr_?.tranche),
    };
    offsetY += h;
    return seg;
  });

  // Also show individual bars side-by-side for size comparison
  const maxSpread = Math.max(...tranches.map((tr_: any) => tr_?.spread ?? 0), 1);

  return (
    <div className="px-3 py-2">
      <div className="flex gap-4">
        {/* Stacked waterfall */}
        <div className="shrink-0">
          <svg
            width={barWidth + 80}
            height={chartHeight + 4}
            viewBox={`0 0 ${barWidth + 80} ${chartHeight + 4}`}
            className="overflow-visible"
          >
            {segments.map((seg, i) => (
              <g key={i}>
                <rect
                  x={0}
                  y={seg.y + 2}
                  width={barWidth}
                  height={Math.max(seg.h - 1, 1)}
                  fill={seg.color}
                  opacity={0.5}
                />
                <rect
                  x={0}
                  y={seg.y + 2}
                  width={barWidth}
                  height={Math.max(seg.h - 1, 1)}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={0.5}
                  opacity={0.8}
                />
                {seg.h > 10 && (
                  <>
                    <text
                      x={barWidth + 4}
                      y={seg.y + 2 + seg.h / 2 + 1}
                      fill={seg.color}
                      fontSize="7"
                      fontFamily="monospace"
                      fontWeight="bold"
                      dominantBaseline="middle"
                    >
                      {seg.rating}
                    </text>
                    <text
                      x={barWidth + 40}
                      y={seg.y + 2 + seg.h / 2 + 1}
                      fill="rgba(255,255,255,0.5)"
                      fontSize="7"
                      fontFamily="monospace"
                      dominantBaseline="middle"
                    >
                      {fmtPct(seg.pct, 1)}
                    </text>
                  </>
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* Spread bars */}
        <div className="flex-1 min-w-0">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
            Spread (bp)
          </div>
          <svg
            width="100%"
            height={chartHeight}
            viewBox={`0 0 200 ${chartHeight}`}
            preserveAspectRatio="none"
            className="overflow-visible"
          >
            {segments.map((seg, i) => {
              const spreadVal = tranches[i]?.spread ?? 0;
              const barW = (spreadVal / maxSpread) * 160;
              const barH = Math.max(seg.h - 2, 4);
              return (
                <g key={i}>
                  <rect
                    x={0}
                    y={seg.y + 2}
                    width={Math.max(barW, 1)}
                    height={barH}
                    fill={seg.color}
                    opacity={0.3}
                  />
                  <rect
                    x={0}
                    y={seg.y + 2}
                    width={Math.max(barW, 1)}
                    height={1}
                    fill={seg.color}
                    opacity={0.7}
                  />
                  {barH > 8 && (
                    <text
                      x={Math.max(barW, 1) + 4}
                      y={seg.y + 2 + barH / 2 + 1}
                      fill="rgba(255,255,255,0.4)"
                      fontSize="7"
                      fontFamily="monospace"
                      dominantBaseline="middle"
                    >
                      {fmtBps(spreadVal)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OcIcTestGrid({ tests }: { tests: any[] }) {
  return (
    <div className="grid grid-cols-2 gap-px bg-border/10">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {tests.map((test: any, i: number) => {
        const badge = passFailBadge(test?.status);
        const Icon = test?.status?.toLowerCase() === 'pass' ? ShieldCheck : ShieldAlert;
        return (
          <div key={`${test?.name}-${i}`} className="flex items-center justify-between px-2 py-1.5 bg-black hover:bg-cyan-400/[0.02]">
            <div className="flex items-center gap-1.5 min-w-0">
              <Icon className={`w-3 h-3 shrink-0 ${badge.cls.split(' ')[0]}`} />
              <div className="min-w-0">
                <div className="text-[8px] font-mono font-bold text-white/80 uppercase truncate">
                  {test?.name ?? '--'}
                </div>
                <div className="text-[7px] font-mono text-neutral-600">
                  {test?.tranche ?? ''} {test?.actual != null ? `Actual: ${fmtPct(test.actual)}` : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {test?.trigger != null && (
                <span className="text-[7px] font-mono text-neutral-600">
                  Trig: {fmtPct(test.trigger)}
                </span>
              )}
              {test?.cushion != null && (
                <span className={`text-[7px] font-mono font-bold ${test.cushion >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {test.cushion >= 0 ? '+' : ''}{fmtPct(test.cushion)}
                </span>
              )}
              <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 uppercase border ${badge.cls}`}>
                {badge.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── QUALITY TAB: Collateral Quality Metrics
// ══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function QualityTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metrics: any[] = data?.collateralQuality ?? [];

  return (
    <div>
      <SectionHeader title={tr(t, 'cloCollateralQuality', 'Collateral Quality Metrics')} icon={Activity} />
      {metrics.length === 0 ? (
        <div className="text-center py-4 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'cloNoQuality', 'No quality data')}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-px bg-border/10">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {metrics.map((m: any, i: number) => (
            <CollateralMetricCard key={`${m?.name}-${i}`} metric={m} />
          ))}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CollateralMetricCard({ metric }: { metric: any }) {
  const name = metric?.name ?? '--';
  const value = metric?.value;
  const limit = metric?.limit;
  const unit = metric?.unit ?? '';
  const status = metric?.status;
  const badge = status ? passFailBadge(status) : null;

  let displayVal = '--';
  if (value != null) {
    if (unit === 'bp' || unit === 'bps') displayVal = fmtBps(value);
    else if (unit === '%' || unit === 'pct') displayVal = fmtPct(value);
    else if (unit === 'x') displayVal = fmtX(value);
    else if (unit === 'y' || unit === 'yr') displayVal = fmtWal(value);
    else displayVal = fmtNum(value);
  }

  let limitDisplay = '';
  if (limit != null) {
    if (unit === 'bp' || unit === 'bps') limitDisplay = fmtBps(limit);
    else if (unit === '%' || unit === 'pct') limitDisplay = fmtPct(limit);
    else if (unit === 'x') limitDisplay = fmtX(limit);
    else limitDisplay = fmtNum(limit);
  }

  return (
    <div className="px-2 py-2 bg-black hover:bg-cyan-400/[0.02]">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
        {name}
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-[10px] font-mono font-bold text-white">
          {displayVal}
        </span>
        {badge && (
          <span className={`text-[6px] font-mono font-bold px-1 py-px uppercase border ${badge.cls}`}>
            {badge.text}
          </span>
        )}
      </div>
      {limitDisplay && (
        <div className="mt-0.5">
          <span className="text-[7px] font-mono text-neutral-700">Limit: {limitDisplay}</span>
        </div>
      )}
      {/* Mini gauge bar */}
      {value != null && limit != null && limit > 0 && (
        <div className="mt-1 h-1 bg-neutral-900 relative">
          <div
            className={`absolute inset-y-0 left-0 ${
              status?.toLowerCase() === 'fail'
                ? 'bg-red-400/50'
                : status?.toLowerCase() === 'warning' || status?.toLowerCase() === 'warn'
                  ? 'bg-yellow-400/50'
                  : 'bg-cyan-400/40'
            }`}
            style={{ width: `${Math.min((value / limit) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── PIPELINE TAB: New Issue Pipeline
// ══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PipelineTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pipeline: any[] = data?.newIssuePipeline ?? [];

  return (
    <div>
      <SectionHeader title={tr(t, 'cloNewIssuePipeline', 'New Issue Pipeline')} icon={Rocket} />
      {pipeline.length === 0 ? (
        <div className="text-center py-4 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'cloNoPipeline', 'No pipeline data')}
        </div>
      ) : (
        <>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Deal</th>
                <th className="px-2 py-1.5 text-left font-bold">Manager</th>
                <th className="px-2 py-1.5 text-right font-bold">Size</th>
                <th className="px-2 py-1.5 text-right font-bold">AAA Spd</th>
                <th className="px-2 py-1.5 text-center font-bold">Status</th>
                <th className="px-2 py-1.5 text-right font-bold">Pricing</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {pipeline.map((deal: any, i: number) => (
                <tr key={`${deal?.name}-${i}`} className="border-b border-border/5 hover:bg-cyan-400/[0.02]">
                  <td className="px-2 py-1.5 font-bold truncate max-w-[90px]" style={{ color: ACCENT }}>
                    {deal?.name ?? deal?.deal ?? '--'}
                  </td>
                  <td className="px-2 py-1.5 text-white/70 truncate max-w-[80px]">
                    {deal?.manager ?? '--'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/80">
                    {fmtB(deal?.size)}
                  </td>
                  <td className={`px-2 py-1.5 text-right ${spreadColor(deal?.aaaSpread)}`}>
                    {deal?.aaaSpread != null ? fmtBps(deal.aaaSpread) : '--'}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 uppercase ${statusColor(deal?.status)}`}>
                      {deal?.status ?? '--'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-neutral-400">
                    {deal?.pricingDate ?? deal?.expectedDate ?? '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pipeline summary */}
          <div className="px-3 py-2 border-t border-border/10" style={{ backgroundColor: DIM }}>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[7px] font-mono text-neutral-600 uppercase">Total Deals</span>
                <span className="text-[9px] font-mono font-bold text-white ml-1.5">{pipeline.length}</span>
              </div>
              <div>
                <span className="text-[7px] font-mono text-neutral-600 uppercase">Total Volume</span>
                <span className="text-[9px] font-mono font-bold text-white ml-1.5">
                  {fmtB(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    pipeline.reduce((sum: number, d: any) => sum + (d?.size ?? 0), 0),
                  )}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── SPREADS TAB: Market Tranche Spread Comparison (Grouped Bars)
// ══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpreadsTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spreads: any[] = data?.trancheSpreadComparison ?? [];

  return (
    <div>
      <SectionHeader title={tr(t, 'cloSpreadComparison', 'Market Tranche Spread Comparison')} icon={BarChart3} />
      {spreads.length === 0 ? (
        <div className="text-center py-4 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'cloNoSpreads', 'No spread data')}
        </div>
      ) : (
        <>
          <SpreadGroupedBarChart spreads={spreads} />
          <SpreadTable spreads={spreads} />
        </>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpreadGroupedBarChart({ spreads }: { spreads: any[] }) {
  // Each entry: { rating, current, weekAgo, monthAgo, yearAgo }
  const chartWidth = 300;
  const chartHeight = 120;
  const ratings = spreads.map((s: any) => s?.rating ?? '--');
  const groupWidth = chartWidth / Math.max(ratings.length, 1);
  const barCount = 4; // current, weekAgo, monthAgo, yearAgo
  const barGap = 1;
  const barWidth = Math.max((groupWidth - 10) / barCount - barGap, 3);

  const allVals = spreads.flatMap((s: any) => [
    s?.current ?? 0,
    s?.weekAgo ?? 0,
    s?.monthAgo ?? 0,
    s?.yearAgo ?? 0,
  ]);
  const maxVal = Math.max(...allVals, 1);

  const barColors = ['#22d3ee', '#38bdf8', '#818cf8', '#6b7280'];
  const barLabels = ['Current', '1W Ago', '1M Ago', '1Y Ago'];

  return (
    <div className="px-3 py-2">
      <svg
        width="100%"
        height={chartHeight + 30}
        viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}
        className="overflow-visible"
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = chartHeight - frac * chartHeight;
          return (
            <g key={frac}>
              <line
                x1={0}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={0.5}
              />
              <text
                x={-2}
                y={y + 2}
                fill="rgba(255,255,255,0.2)"
                fontSize="6"
                fontFamily="monospace"
                textAnchor="end"
              >
                {Math.round(frac * maxVal)}
              </text>
            </g>
          );
        })}

        {/* Grouped bars */}
        {spreads.map((s: any, gi: number) => {
          const groupX = gi * groupWidth + 5;
          const vals = [s?.current ?? 0, s?.weekAgo ?? 0, s?.monthAgo ?? 0, s?.yearAgo ?? 0];

          return (
            <g key={gi}>
              {vals.map((v, bi) => {
                const barH = Math.max((v / maxVal) * chartHeight, 1);
                const x = groupX + bi * (barWidth + barGap);
                const y = chartHeight - barH;
                return (
                  <g key={bi}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barH}
                      fill={barColors[bi]}
                      opacity={0.35}
                    />
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={1}
                      fill={barColors[bi]}
                      opacity={0.8}
                    />
                  </g>
                );
              })}
              {/* Rating label */}
              <text
                x={groupX + (barCount * (barWidth + barGap)) / 2}
                y={chartHeight + 10}
                fill="rgba(34,211,238,0.8)"
                fontSize="7"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {s?.rating ?? '--'}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-1">
        {barLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2 h-1.5" style={{ backgroundColor: barColors[i], opacity: 0.6 }} />
            <span className="text-[6px] font-mono text-neutral-600 uppercase">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpreadTable({ spreads }: { spreads: any[] }) {
  return (
    <div className="border-t border-border/10">
      <table className="w-full text-[9px] font-mono">
        <thead className="bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Rating</th>
            <th className="px-2 py-1.5 text-right font-bold">Current</th>
            <th className="px-2 py-1.5 text-right font-bold">1W Ago</th>
            <th className="px-2 py-1.5 text-right font-bold">1M Ago</th>
            <th className="px-2 py-1.5 text-right font-bold">1Y Ago</th>
            <th className="px-2 py-1.5 text-right font-bold">1W Chg</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {spreads.map((s: any, i: number) => {
            const weekChg = s?.current != null && s?.weekAgo != null ? s.current - s.weekAgo : null;
            return (
              <tr key={`${s?.rating}-${i}`} className="border-b border-border/5 hover:bg-cyan-400/[0.02]">
                <td className="px-2 py-1.5 font-bold" style={{ color: trancheColor(s?.rating) }}>
                  {s?.rating ?? '--'}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${spreadColor(s?.current)}`}>
                  {fmtBps(s?.current)}
                </td>
                <td className="px-2 py-1.5 text-right text-white/60">
                  {fmtBps(s?.weekAgo)}
                </td>
                <td className="px-2 py-1.5 text-right text-white/50">
                  {fmtBps(s?.monthAgo)}
                </td>
                <td className="px-2 py-1.5 text-right text-white/40">
                  {fmtBps(s?.yearAgo)}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${
                  weekChg != null && weekChg > 0
                    ? 'text-red-400'
                    : weekChg != null && weekChg < 0
                      ? 'text-green-400'
                      : 'text-neutral-500'
                }`}>
                  {weekChg != null ? `${weekChg >= 0 ? '+' : ''}${weekChg.toFixed(0)}bp` : '--'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
