import { useState, useMemo } from 'react';
import { useSecuritiesLendingRevenue } from '../../api/hooks/use-securities-lending-revenue';
import { useT } from '../../i18n';
import { RefreshCw, TrendingUp, DollarSign, BarChart3, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// -- i18n fallback helper --

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// -- Constants --

const ACCENT = '#f472b6'; // pink-400
const ACCENT_DIM = 'rgba(244,114,182,0.08)';

const TABS = ['revenue', 'assetClass', 'fees', 'trend', 'shortInterest', 'borrowers'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  revenue: 'TOP REVENUE',
  assetClass: 'ASSET CLASS',
  fees: 'FEE DIST',
  trend: 'TREND',
  shortInterest: 'SI CHANGES',
  borrowers: 'BORROWERS',
};

// -- Formatting helpers --

function fmtMoney(n: unknown): string {
  const v = Number(n);
  if (Number.isNaN(v)) return '--';
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtPct(n: unknown): string {
  const v = Number(n);
  if (Number.isNaN(v)) return '--';
  return `${v.toFixed(1)}%`;
}

function fmtBps(n: unknown): string {
  const v = Number(n);
  if (Number.isNaN(v)) return '--';
  return `${v.toFixed(1)}bp`;
}

function fmtRevenue(n: unknown): string {
  const v = Number(n);
  if (Number.isNaN(v)) return '--';
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtChange(n: unknown): string {
  const v = Number(n);
  if (Number.isNaN(v)) return '--';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

// -- Color helpers --

function revenueColor(n: unknown): string {
  const v = Number(n);
  if (v >= 1e6) return ACCENT;
  if (v >= 1e5) return '#f9a8d4'; // pink-300
  return 'rgba(255,255,255,0.5)';
}

function utilColor(pct: unknown): string {
  const v = Number(pct);
  if (Number.isNaN(v)) return 'rgba(255,255,255,0.4)';
  if (v >= 90) return '#ef4444';
  if (v >= 70) return '#f97316';
  if (v >= 50) return '#fbbf24';
  return '#22c55e';
}

function changeColor(n: unknown): string {
  const v = Number(n);
  if (v > 0) return 'text-green-400';
  if (v < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function changeColorHex(n: unknown): string {
  const v = Number(n);
  if (v > 0) return '#4ade80';
  if (v < 0) return '#f87171';
  return '#737373';
}

// -- SVG Chart Constants --

const CHART_W = 280;
const CHART_H = 80;
const DONUT_R = 40;
const DONUT_INNER = 24;

// -- SVG Helpers --

function buildLinePath(values: number[], w: number, h: number, padding = 4): string {
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (w - padding * 2) / Math.max(values.length - 1, 1);
  return values
    .map((v, i) => {
      const x = padding + i * stepX;
      const y = h - padding - ((v - min) / range) * (h - padding * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildAreaPath(values: number[], w: number, h: number, padding = 4): string {
  if (!values.length) return '';
  const linePath = buildLinePath(values, w, h, padding);
  const stepX = (w - padding * 2) / Math.max(values.length - 1, 1);
  const lastX = padding + (values.length - 1) * stepX;
  return `${linePath} L${lastX.toFixed(1)},${(h - padding).toFixed(1)} L${padding},${(h - padding).toFixed(1)} Z`;
}

function donutSlice(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = { x: cx + outerR * Math.cos(toRad(startAngle)), y: cy + outerR * Math.sin(toRad(startAngle)) };
  const outerEnd = { x: cx + outerR * Math.cos(toRad(endAngle)), y: cy + outerR * Math.sin(toRad(endAngle)) };
  const innerStart = { x: cx + innerR * Math.cos(toRad(endAngle)), y: cy + innerR * Math.sin(toRad(endAngle)) };
  const innerEnd = { x: cx + innerR * Math.cos(toRad(startAngle)), y: cy + innerR * Math.sin(toRad(startAngle)) };
  return [
    `M${outerStart.x.toFixed(2)},${outerStart.y.toFixed(2)}`,
    `A${outerR},${outerR} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)},${outerEnd.y.toFixed(2)}`,
    `L${innerStart.x.toFixed(2)},${innerStart.y.toFixed(2)}`,
    `A${innerR},${innerR} 0 ${largeArc} 0 ${innerEnd.x.toFixed(2)},${innerEnd.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

// -- Asset class bar colors --

const ASSET_COLORS: Record<string, string> = {
  equity: '#f472b6',
  'fixed income': '#a78bfa',
  etf: '#38bdf8',
  adr: '#fb923c',
  reit: '#34d399',
  convertible: '#fbbf24',
  preferred: '#f87171',
};

function getAssetColor(cls: string): string {
  const key = cls.toLowerCase();
  for (const [k, v] of Object.entries(ASSET_COLORS)) {
    if (key.includes(k)) return v;
  }
  return ACCENT;
}

// -- Borrower donut colors --

const BORROWER_COLORS = ['#f472b6', '#a78bfa', '#38bdf8', '#34d399', '#fbbf24', '#fb923c', '#f87171', '#818cf8'];

// -- Main Panel --

export function SecuritiesLendingRevenuePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSecuritiesLendingRevenue();
  const [activeTab, setActiveTab] = useState<Tab>('revenue');
  const [sortCol, setSortCol] = useState<string>('revenue');
  const [sortAsc, setSortAsc] = useState(false);

  const sortedSecurities = useMemo(() => {
    const items = data?.topSecurities || data?.securities || [];
    if (!items.length) return [];
    const arr = [...items];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arr.sort((a: any, b: any) => {
      const va = a[sortCol] ?? 0;
      const vb = b[sortCol] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-pink-400/40 uppercase tracking-widest animate-pulse">
          Loading securities lending revenue...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          Failed to load data
        </div>
      </div>
    );
  }

  const summary = data.summary || {};

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th
      className={`px-2 py-1 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(col)}
    >
      {label}{sortCol === col ? (sortAsc ? ' \u25B2' : ' \u25BC') : ''}
    </th>
  );

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ background: ACCENT }} />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: ACCENT }}>
            {tr(t, 'slrTitle', 'Securities Lending Revenue')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-pink-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-5 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-2.5 h-2.5" />
            Total Revenue
          </div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>
            {fmtRevenue(summary.totalRevenue)}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">On-Loan Value</div>
          <div className="text-[11px] font-mono font-black text-white/80">
            {fmtMoney(summary.totalOnLoan)}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-2.5 h-2.5" />
            Avg Fee
          </div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>
            {fmtBps(summary.avgFeeBps)}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Avg Util</div>
          <div className="text-[11px] font-mono font-black" style={{ color: utilColor(summary.avgUtilization) }}>
            {fmtPct(summary.avgUtilization)}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Rev Change</div>
          <div className={`text-[11px] font-mono font-black ${changeColor(summary.revenueChange)}`}>
            {fmtChange(summary.revenueChange)}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-2 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: activeTab === tab ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: activeTab === tab ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: activeTab === tab ? ACCENT_DIM : 'transparent',
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto no-scrollbar">

        {/* ── Top Revenue Securities Table ── */}
        {activeTab === 'revenue' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <SortHeader col="name" label="Name" />
                <SortHeader col="feeBps" label="Fee BPS" right />
                <SortHeader col="utilization" label="Util%" right />
                <SortHeader col="onLoanValue" label="On-Loan" right />
                <SortHeader col="revenue" label="Revenue" right />
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {sortedSecurities.map((s: any, i: number) => (
                <tr
                  key={s.ticker || s.name || i}
                  className="border-b border-border/5 hover:bg-pink-400/[0.02]"
                >
                  <td className="px-2 py-1">
                    <span className="font-bold" style={{ color: ACCENT }}>{s.ticker || s.symbol || '--'}</span>
                    {s.name && <span className="text-neutral-600 ml-1.5 text-[7px]">{s.name}</span>}
                  </td>
                  <td className="px-2 py-1 text-right font-bold" style={{ color: Number(s.feeBps) >= 200 ? '#ef4444' : Number(s.feeBps) >= 50 ? '#fbbf24' : 'rgba(255,255,255,0.6)' }}>
                    {fmtBps(s.feeBps)}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <div className="w-12 h-[3px] bg-neutral-800 relative">
                        <div
                          className="absolute left-0 top-0 h-full"
                          style={{
                            width: `${Math.min(Number(s.utilization) || 0, 100)}%`,
                            backgroundColor: utilColor(s.utilization),
                          }}
                        />
                      </div>
                      <span style={{ color: utilColor(s.utilization) }} className="text-[8px]">
                        {fmtPct(s.utilization)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1 text-right text-white/60">
                    {fmtMoney(s.onLoanValue)}
                  </td>
                  <td className="px-2 py-1 text-right font-bold" style={{ color: revenueColor(s.revenue) }}>
                    {fmtRevenue(s.revenue)}
                  </td>
                </tr>
              ))}
              {sortedSecurities.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-neutral-600">No revenue data</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* ── Asset Class Breakdown Bars (SVG) ── */}
        {activeTab === 'assetClass' && (
          <AssetClassSection data={data} t={t} />
        )}

        {/* ── Fee Distribution ── */}
        {activeTab === 'fees' && (
          <FeeDistributionSection data={data} t={t} />
        )}

        {/* ── Revenue Trend Chart (SVG) ── */}
        {activeTab === 'trend' && (
          <RevenueTrendSection data={data} t={t} />
        )}

        {/* ── Short Interest Changes ── */}
        {activeTab === 'shortInterest' && (
          <ShortInterestSection data={data} t={t} />
        )}

        {/* ── Borrower Concentration Donut (SVG) ── */}
        {activeTab === 'borrowers' && (
          <BorrowerConcentrationSection data={data} t={t} />
        )}
      </div>
    </div>
  );
}

// ── Section: Asset Class Breakdown ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AssetClassSection({ data, t }: { data: any; t: TFn }) {
  const assetClasses = data.assetClassBreakdown || data.assetClasses || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxRevenue = Math.max(...assetClasses.map((a: any) => Number(a.revenue) || 0), 1);

  return (
    <div className="p-3">
      <div className="flex items-center gap-1.5 mb-3">
        <BarChart3 className="w-3 h-3" style={{ color: ACCENT }} />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'slrAssetClass', 'Revenue by Asset Class')}
        </span>
      </div>

      <div className="space-y-2">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {assetClasses.map((a: any, i: number) => {
          const rev = Number(a.revenue) || 0;
          const pct = (rev / maxRevenue) * 100;
          const color = getAssetColor(a.assetClass || a.name || '');
          return (
            <div key={a.assetClass || a.name || i}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[8px] font-mono font-bold uppercase" style={{ color }}>{a.assetClass || a.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[7px] font-mono text-neutral-500">{fmtPct(a.utilization)} util</span>
                  <span className="text-[8px] font-mono font-bold" style={{ color }}>{fmtRevenue(a.revenue)}</span>
                </div>
              </div>
              <svg width="100%" height="12" className="block">
                <rect x="0" y="2" width="100%" height="8" fill="rgba(255,255,255,0.03)" />
                <rect x="0" y="2" width={`${pct}%`} height="8" fill={color} opacity="0.6" />
              </svg>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[7px] font-mono text-neutral-600">
                  {fmtMoney(a.onLoanValue)} on-loan
                </span>
                <span className="text-[7px] font-mono text-neutral-600">
                  {fmtBps(a.avgFeeBps)} avg fee
                </span>
              </div>
            </div>
          );
        })}

        {assetClasses.length === 0 && (
          <div className="text-[9px] font-mono text-neutral-600 text-center py-6">
            No asset class data
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section: Fee Distribution (GC / Special / Warm) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FeeDistributionSection({ data, t }: { data: any; t: TFn }) {
  const dist = data.feeDistribution || {};
  const gc = dist.gc || dist.GC || {};
  const special = dist.special || dist.Special || {};
  const warm = dist.warm || dist.Warm || {};

  const tiers = [
    { key: 'GC', label: 'GENERAL COLLATERAL', data: gc, color: '#4ade80', bgDim: 'rgba(74,222,128,0.06)' },
    { key: 'SPECIAL', label: 'SPECIAL', data: special, color: '#ef4444', bgDim: 'rgba(239,68,68,0.06)' },
    { key: 'WARM', label: 'WARM', data: warm, color: '#fbbf24', bgDim: 'rgba(251,191,36,0.06)' },
  ];

  const totalPct = Number(gc.percentage || 0) + Number(special.percentage || 0) + Number(warm.percentage || 0);

  return (
    <div className="p-3">
      <div className="flex items-center gap-1.5 mb-3">
        <PieChart className="w-3 h-3" style={{ color: ACCENT }} />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'slrFeeDist', 'Fee Distribution')}
        </span>
      </div>

      {/* Stacked bar showing proportions */}
      <div className="mb-4">
        <svg width="100%" height="20" className="block">
          {(() => {
            let offset = 0;
            return tiers.map((tier) => {
              const pct = totalPct > 0 ? (Number(tier.data.percentage || 0) / totalPct) * 100 : 33.3;
              const el = (
                <rect
                  key={tier.key}
                  x={`${offset}%`}
                  y="2"
                  width={`${pct}%`}
                  height="16"
                  fill={tier.color}
                  opacity="0.5"
                />
              );
              offset += pct;
              return el;
            });
          })()}
        </svg>
      </div>

      {/* Tier cards */}
      <div className="space-y-2">
        {tiers.map((tier) => (
          <div key={tier.key} className="border border-border/20 p-2.5" style={{ background: tier.bgDim }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2" style={{ background: tier.color }} />
                <span className="text-[9px] font-mono font-black uppercase" style={{ color: tier.color }}>
                  {tier.label}
                </span>
              </div>
              <span className="text-[10px] font-mono font-black" style={{ color: tier.color }}>
                {fmtPct(tier.data.percentage)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[8px] font-mono">
              <div>
                <div className="text-neutral-500">Count</div>
                <div className="text-white/70 font-bold">{tier.data.count ?? '--'}</div>
              </div>
              <div>
                <div className="text-neutral-500">Avg Fee</div>
                <div className="text-white/70 font-bold">{fmtBps(tier.data.avgFeeBps)}</div>
              </div>
              <div>
                <div className="text-neutral-500">Revenue</div>
                <div className="font-bold" style={{ color: tier.color }}>{fmtRevenue(tier.data.revenue)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section: Revenue Trend Chart (SVG 30-day line) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RevenueTrendSection({ data, t }: { data: any; t: TFn }) {
  const trend = data.revenueTrend || data.trend || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values = trend.map((d: any) => Number(d.revenue) || Number(d.value) || 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const labels = trend.map((d: any) => d.date || d.day || '');

  const linePath = buildLinePath(values, CHART_W, CHART_H);
  const areaPath = buildAreaPath(values, CHART_W, CHART_H);

  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const latest = values.length ? values[values.length - 1] : 0;
  const prev = values.length >= 2 ? values[values.length - 2] : latest;
  const dayChange = latest - prev;

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3" style={{ color: ACCENT }} />
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'slrTrend', '30-Day Revenue Trend')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>
            {fmtRevenue(latest)}
          </span>
          <span className={`text-[8px] font-mono font-bold ${changeColor(dayChange)}`}>
            {dayChange >= 0 ? '+' : ''}{fmtRevenue(dayChange)}
          </span>
        </div>
      </div>

      {values.length > 0 ? (
        <div className="border border-border/10 bg-[#030303] p-2">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            width="100%"
            height="auto"
            preserveAspectRatio="xMidYMid meet"
            className="block"
          >
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((frac) => (
              <line
                key={frac}
                x1="4"
                y1={4 + (CHART_H - 8) * frac}
                x2={CHART_W - 4}
                y2={4 + (CHART_H - 8) * frac}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="0.5"
              />
            ))}

            {/* Area fill */}
            <path d={areaPath} fill={ACCENT} opacity="0.08" />

            {/* Line */}
            <path d={linePath} fill="none" stroke={ACCENT} strokeWidth="1.5" />

            {/* End dot */}
            {values.length > 0 && (() => {
              const range = max - min || 1;
              const lastX = 4 + ((values.length - 1) / Math.max(values.length - 1, 1)) * (CHART_W - 8);
              const lastY = CHART_H - 4 - ((latest - min) / range) * (CHART_H - 8);
              return (
                <>
                  <circle cx={lastX} cy={lastY} r="3" fill="#000" stroke={ACCENT} strokeWidth="1.5" />
                  <circle cx={lastX} cy={lastY} r="1" fill={ACCENT} />
                </>
              );
            })()}
          </svg>

          {/* Labels */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-[6px] font-mono text-neutral-600">{labels[0] || 'D-30'}</span>
            <span className="text-[6px] font-mono text-neutral-600">{labels[Math.floor(labels.length / 2)] || 'D-15'}</span>
            <span className="text-[6px] font-mono text-neutral-600">{labels[labels.length - 1] || 'TODAY'}</span>
          </div>

          {/* Min/Max */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-[7px] font-mono text-neutral-500">LOW {fmtRevenue(min)}</span>
            <span className="text-[7px] font-mono text-neutral-500">HIGH {fmtRevenue(max)}</span>
          </div>
        </div>
      ) : (
        <div className="text-[9px] font-mono text-neutral-600 text-center py-6">No trend data</div>
      )}
    </div>
  );
}

// ── Section: Short Interest Changes ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ShortInterestSection({ data, t }: { data: any; t: TFn }) {
  const changes = data.shortInterestChanges || data.shortInterest || [];

  return (
    <div className="p-3">
      <div className="flex items-center gap-1.5 mb-3">
        <BarChart3 className="w-3 h-3" style={{ color: ACCENT }} />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'slrSiChanges', 'Short Interest Changes')}
        </span>
      </div>

      <div className="space-y-1">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {changes.map((c: any, i: number) => {
          const chg = Number(c.change) || Number(c.siChange) || 0;
          const isUp = chg > 0;
          return (
            <div
              key={c.ticker || c.symbol || i}
              className="flex items-center gap-2 px-2 py-1.5 border-b border-border/5 hover:bg-pink-400/[0.02]"
            >
              <div className="w-3 h-3 flex items-center justify-center shrink-0">
                {isUp ? (
                  <ArrowUpRight className="w-3 h-3 text-red-400" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-green-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
                    {c.ticker || c.symbol}
                  </span>
                  {c.name && (
                    <span className="text-[7px] font-mono text-neutral-600 truncate">{c.name}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-[7px] font-mono text-neutral-500">SI RATIO</div>
                  <div className="text-[8px] font-mono text-white/60">{fmtPct(c.siRatio || c.shortInterestRatio)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[7px] font-mono text-neutral-500">CHANGE</div>
                  <div className={`text-[8px] font-mono font-bold ${isUp ? 'text-red-400' : 'text-green-400'}`}>
                    {isUp ? '+' : ''}{fmtPct(chg)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[7px] font-mono text-neutral-500">FEE IMPACT</div>
                  <div className="text-[8px] font-mono font-bold" style={{ color: changeColorHex(c.feeImpact) }}>
                    {c.feeImpact != null ? `${Number(c.feeImpact) > 0 ? '+' : ''}${fmtBps(c.feeImpact)}` : '--'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {changes.length === 0 && (
          <div className="text-[9px] font-mono text-neutral-600 text-center py-6">
            No short interest changes
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section: Borrower Concentration Donut (SVG) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BorrowerConcentrationSection({ data, t }: { data: any; t: TFn }) {
  const borrowers = data.borrowerConcentration || data.borrowers || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPct = borrowers.reduce((sum: number, b: any) => sum + (Number(b.percentage) || Number(b.share) || 0), 0);

  const cx = DONUT_R + 8;
  const cy = DONUT_R + 8;
  const svgSize = (DONUT_R + 8) * 2;

  // Build donut slices
  const slices = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: { path: string; color: string; name: string; pct: number; value: number }[] = [];
    let startAngle = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    borrowers.forEach((b: any, i: number) => {
      const pct = Number(b.percentage) || Number(b.share) || 0;
      const normPct = totalPct > 0 ? (pct / totalPct) * 100 : 0;
      const sweep = (normPct / 100) * 360;
      if (sweep <= 0) return;
      const endAngle = startAngle + Math.max(sweep - 0.5, 0.1);
      const color = BORROWER_COLORS[i % BORROWER_COLORS.length];
      result.push({
        path: donutSlice(cx, cy, DONUT_R, DONUT_INNER, startAngle, endAngle),
        color,
        name: b.name || b.borrower || `Borrower ${i + 1}`,
        pct,
        value: Number(b.value) || Number(b.onLoanValue) || 0,
      });
      startAngle += sweep;
    });
    return result;
  }, [borrowers, totalPct, cx, cy]);

  return (
    <div className="p-3">
      <div className="flex items-center gap-1.5 mb-3">
        <PieChart className="w-3 h-3" style={{ color: ACCENT }} />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'slrBorrowers', 'Borrower Concentration')}
        </span>
      </div>

      {borrowers.length > 0 ? (
        <div className="flex items-start gap-4">
          {/* Donut */}
          <div className="shrink-0">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
              {/* Background ring */}
              <circle cx={cx} cy={cy} r={DONUT_R} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={DONUT_R - DONUT_INNER} />

              {/* Slices */}
              {slices.map((s, i) => (
                <path key={i} d={s.path} fill={s.color} opacity="0.7" />
              ))}

              {/* Center label */}
              <text x={cx} y={cy - 3} textAnchor="middle" className="text-[7px] font-mono" fill="rgba(255,255,255,0.4)">
                TOTAL
              </text>
              <text x={cx} y={cy + 8} textAnchor="middle" className="text-[9px] font-mono font-bold" fill={ACCENT}>
                {borrowers.length}
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-1">
            {slices.map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-1 py-0.5">
                <div className="w-2 h-2 shrink-0" style={{ background: s.color }} />
                <div className="flex-1 min-w-0">
                  <span className="text-[8px] font-mono font-bold text-white/80 truncate block">{s.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[8px] font-mono font-bold" style={{ color: s.color }}>
                    {fmtPct(s.pct)}
                  </span>
                  {s.value > 0 && (
                    <span className="text-[7px] font-mono text-neutral-500">
                      {fmtMoney(s.value)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-[9px] font-mono text-neutral-600 text-center py-6">
          No borrower data
        </div>
      )}

      {/* HHI / Concentration Index if provided */}
      {data.concentrationIndex != null && (
        <div className="mt-3 border border-border/10 p-2">
          <div className="flex items-center justify-between">
            <span className="text-[7px] font-mono text-neutral-500 uppercase">Herfindahl-Hirschman Index</span>
            <span className="text-[9px] font-mono font-bold" style={{ color: Number(data.concentrationIndex) >= 2500 ? '#ef4444' : Number(data.concentrationIndex) >= 1500 ? '#fbbf24' : ACCENT }}>
              {Number(data.concentrationIndex).toFixed(0)}
            </span>
          </div>
          <div className="mt-1 h-[3px] bg-neutral-800 relative">
            <div
              className="absolute left-0 top-0 h-full"
              style={{
                width: `${Math.min((Number(data.concentrationIndex) / 10000) * 100, 100)}%`,
                background: Number(data.concentrationIndex) >= 2500 ? '#ef4444' : Number(data.concentrationIndex) >= 1500 ? '#fbbf24' : ACCENT,
                opacity: 0.6,
              }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[6px] font-mono text-neutral-700">LOW</span>
            <span className="text-[6px] font-mono text-neutral-700">MODERATE</span>
            <span className="text-[6px] font-mono text-neutral-700">HIGH</span>
          </div>
        </div>
      )}
    </div>
  );
}
