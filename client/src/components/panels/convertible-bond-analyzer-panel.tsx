import { useState } from 'react';
import { useConvertibleBondAnalyzer } from '../../api/hooks/use-convertible-bond-analyzer';
import { useT } from '../../i18n';
import { RefreshCw, Activity, TrendingUp, BarChart3, Layers, PlusCircle, LineChart } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtVol(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtB(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function richCheapLabel(n: number): { text: string; cls: string } {
  if (n >= 2)
    return { text: 'CHEAP', cls: 'bg-green-500/10 text-green-400 border border-green-500/30' };
  if (n >= 0.5)
    return { text: 'CHEAP', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' };
  if (n >= -0.5)
    return { text: 'FAIR', cls: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' };
  if (n >= -2)
    return { text: 'RICH', cls: 'bg-orange-500/10 text-orange-400 border border-orange-500/30' };
  return { text: 'RICH', cls: 'bg-red-500/10 text-red-400 border border-red-500/30' };
}

// ── Constants ──

const ACCENT = '#818cf8'; // indigo-400
const ACCENT_DIM = 'rgba(129,140,248,0.08)';

type Tab = 'UNIVERSE' | 'GREEKS' | 'VALUATION' | 'PIPELINE';

// ── SVG Icon ──

function CBAIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <rect x="1" y="2" width="8" height="10" rx="0" fill={ACCENT} opacity="0.25" />
      <path d="M3 7H9" stroke={ACCENT} strokeWidth="0.8" opacity="0.8" />
      <path d="M3 5H7" stroke={ACCENT} strokeWidth="0.6" opacity="0.5" />
      <path d="M3 9H8" stroke={ACCENT} strokeWidth="0.6" opacity="0.5" />
      <circle cx="11" cy="4" r="2.5" fill="none" stroke={ACCENT} strokeWidth="0.8" opacity="0.9" />
      <path d="M10 3.5L11 4.5L12.5 2.5" stroke={ACCENT} strokeWidth="0.6" opacity="0.9" />
    </svg>
  );
}

// ── Main Panel ──

export function ConvertibleBondAnalyzerPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useConvertibleBondAnalyzer();
  const [tab, setTab] = useState<Tab>('UNIVERSE');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <CBAIcon />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'cbaTitle', 'Convertible Bond Analyzer')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(
          [
            { key: 'UNIVERSE' as Tab, icon: Layers, label: 'Universe' },
            { key: 'GREEKS' as Tab, icon: Activity, label: 'Greeks' },
            { key: 'VALUATION' as Tab, icon: BarChart3, label: 'Valuation' },
            { key: 'PIPELINE' as Tab, icon: PlusCircle, label: 'Pipeline' },
          ] as const
        ).map((t_) => (
          <button
            key={t_.key}
            onClick={() => setTab(t_.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_.key
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <t_.icon className="w-2.5 h-2.5" />
            {t_.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-indigo-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cbaNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'UNIVERSE' && <UniverseTab data={data} t={t} />}
        {data && tab === 'GREEKS' && <GreeksTab data={data} t={t} />}
        {data && tab === 'VALUATION' && <ValuationTab data={data} t={t} />}
        {data && tab === 'PIPELINE' && <PipelineTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── UNIVERSE TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function UniverseTab({ data, t }: { data: any; t: TFn }) {
  const bonds = data?.bonds;

  return (
    <div>
      {/* Bond Universe Table */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cbaBondUniverse', 'Bond Universe')}
          </span>
        </div>
        {bonds && bonds.length > 0 ? (
          <div className="min-w-[900px]">
            {/* Header */}
            <div className="grid grid-cols-[minmax(80px,1.2fr)_40px_55px_55px_45px_50px_45px_45px_55px] px-2 py-1 border-b border-border/20 sticky top-0 bg-black z-10">
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'cbaIssuer', 'Issuer')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbaCpn', 'CPN')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbaMat', 'MAT')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbaConvPx', 'CONV PX')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbaParity', 'PAR')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbaPrem', 'PREM')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbaDelta', 'DLT')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbaIvol', 'IVOL')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">
                {tr(t, 'cbaRichCheap', 'R/C')}
              </span>
            </div>
            {/* Rows */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {bonds.map((b: any, i: number) => {
              const badge = b?.cheapness != null ? richCheapLabel(b.cheapness) : null;
              return (
                <div
                  key={b?.issuer ?? i}
                  className="grid grid-cols-[minmax(80px,1.2fr)_40px_55px_55px_45px_50px_45px_45px_55px] px-2 py-1 border-b border-border/10 hover:bg-indigo-400/[0.02] transition-colors items-center"
                >
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold text-white truncate block">
                      {b?.issuer ?? '--'}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-neutral-400 text-right">
                    {b?.coupon != null ? fmtPct(b.coupon) : '--'}
                  </span>
                  <span className="text-[8px] font-mono text-neutral-500 text-right">
                    {b?.maturity ?? '--'}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-400 text-right">
                    {b?.conversionPrice != null ? `$${fmtPrice(b.conversionPrice)}` : '--'}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-400 text-right">
                    {b?.parity != null ? fmtPrice(b.parity) : '--'}
                  </span>
                  <span className="text-[9px] font-mono text-indigo-400 text-right">
                    {b?.premium != null ? fmtPct(b.premium) : '--'}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-400 text-right">
                    {b?.delta != null ? b.delta.toFixed(2) : '--'}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-400 text-right">
                    {b?.impliedVol != null ? fmtVol(b.impliedVol) : '--'}
                  </span>
                  <div className="flex justify-center">
                    {badge ? (
                      <span className={`px-1 py-0 text-[6px] font-mono font-bold uppercase ${badge.cls}`}>
                        {badge.text}
                      </span>
                    ) : (
                      <span className="text-[7px] font-mono text-neutral-600">--</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cbaNoBonds', 'No bond data available')}
          </div>
        )}
      </div>

      {/* Sector Breakdown Bars */}
      <SectorBreakdown data={data} t={t} />
    </div>
  );
}

// ── SECTOR BREAKDOWN ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectorBreakdown({ data, t }: { data: any; t: TFn }) {
  const sectors = data?.sectors;
  if (!sectors || sectors.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxWeight = Math.max(...sectors.map((s: any) => s?.weight ?? 0), 1);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cbaSectorBreakdown', 'Sector Breakdown')}
        </span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {sectors.map((s: any, i: number) => (
          <div key={s?.name ?? i} className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-neutral-400 w-20 truncate shrink-0">
              {s?.name ?? '--'}
            </span>
            <div className="flex-1 h-[6px] bg-white/[0.03] relative">
              <div
                className="absolute top-0 left-0 h-full transition-all"
                style={{
                  width: `${((s?.weight ?? 0) / maxWeight) * 100}%`,
                  backgroundColor: ACCENT,
                  opacity: 0.4 + i * 0.06,
                }}
              />
            </div>
            <span className="text-[8px] font-mono text-indigo-400 w-10 text-right shrink-0">
              {s?.weight != null ? fmtPct(s.weight) : '--'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── GREEKS TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GreeksTab({ data, t }: { data: any; t: TFn }) {
  const greeks = data?.greeks;

  const greekEntries = [
    {
      name: 'Delta',
      icon: TrendingUp,
      value: greeks?.delta,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(3),
      desc: tr(t, 'cbaDeltaDesc', 'Equity sensitivity'),
    },
    {
      name: 'Gamma',
      icon: Activity,
      value: greeks?.gamma,
      min: 0,
      max: 0.1,
      format: (v: number) => v.toFixed(4),
      desc: tr(t, 'cbaGammaDesc', 'Delta rate of change'),
    },
    {
      name: 'Vega',
      icon: BarChart3,
      value: greeks?.vega,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(3),
      desc: tr(t, 'cbaVegaDesc', 'Volatility sensitivity'),
    },
    {
      name: 'Theta',
      icon: LineChart,
      value: greeks?.theta,
      min: -0.5,
      max: 0,
      format: (v: number) => v.toFixed(4),
      desc: tr(t, 'cbaThetaDesc', 'Time decay'),
    },
    {
      name: 'Rho',
      icon: Layers,
      value: greeks?.rho,
      min: -1,
      max: 1,
      format: (v: number) => v.toFixed(3),
      desc: tr(t, 'cbaRhoDesc', 'Interest rate sensitivity'),
    },
  ];

  return (
    <div>
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cbaGreeksSummary', 'Portfolio Greeks Summary')}
          </span>
        </div>

        {greeks ? (
          <div className="grid grid-cols-5 gap-px bg-border/10">
            {greekEntries.map((g) => {
              const Icon = g.icon;
              const pct =
                g.value != null
                  ? Math.min(
                      Math.max(((g.value - g.min) / (g.max - g.min)) * 100, 0),
                      100
                    )
                  : 0;

              return (
                <div key={g.name} className="bg-black px-2 py-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <Icon className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                    <span className="text-[8px] font-mono font-black text-indigo-400 uppercase">
                      {g.name}
                    </span>
                  </div>
                  <div className="text-[12px] font-mono font-black text-white leading-tight">
                    {g.value != null ? g.format(g.value) : '--'}
                  </div>
                  <div className="text-[7px] font-mono text-neutral-600 mt-0.5">{g.desc}</div>
                  {/* Gauge */}
                  <div className="relative h-[4px] bg-white/[0.04] mt-1.5 w-full">
                    {g.value != null && (
                      <>
                        <div
                          className="absolute top-0 h-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: ACCENT,
                            opacity: 0.6,
                          }}
                        />
                        <div
                          className="absolute top-[-2px] w-[2px] h-[8px] bg-white"
                          style={{ left: `calc(${pct}% - 1px)` }}
                        />
                      </>
                    )}
                  </div>
                  {/* 1D Change */}
                  {greeks?.[`${g.name.toLowerCase()}Change`] != null && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="text-[6px] font-mono text-neutral-600 uppercase">1D</span>
                      <span
                        className={`text-[8px] font-mono font-bold ${changeColor(greeks[`${g.name.toLowerCase()}Change`])}`}
                      >
                        {greeks[`${g.name.toLowerCase()}Change`] >= 0 ? '+' : ''}
                        {greeks[`${g.name.toLowerCase()}Change`].toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cbaNoGreeks', 'No greeks data available')}
          </div>
        )}
      </div>

      {/* Greeks Distribution SVG */}
      {greeks?.distribution && <GreeksDistributionChart distribution={greeks.distribution} t={t} />}
    </div>
  );
}

// ── GREEKS DISTRIBUTION CHART (SVG) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GreeksDistributionChart({ distribution, t }: { distribution: any[]; t: TFn }) {
  const W = 320;
  const H = 60;
  const PAD = { top: 5, bottom: 14, left: 2, right: 2 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const barW = distribution.length > 0 ? plotW / distribution.length : 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxCount = Math.max(...distribution.map((d: any) => d?.count ?? 0), 1);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cbaDeltaDist', 'Delta Distribution')}
        </span>
      </div>
      <div className="px-3 py-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {distribution.map((d: any, i: number) => {
            const barH = ((d?.count ?? 0) / maxCount) * plotH;
            const x = PAD.left + i * barW;
            const y = PAD.top + plotH - barH;
            return (
              <g key={i}>
                <rect
                  x={x + 1}
                  y={y}
                  width={Math.max(barW - 2, 1)}
                  height={barH}
                  fill={ACCENT}
                  opacity={0.3 + i * 0.08}
                />
                <text
                  x={x + barW / 2}
                  y={H - 2}
                  textAnchor="middle"
                  fill="#525252"
                  fontSize="5"
                  fontFamily="monospace"
                >
                  {d?.range ?? ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── VALUATION TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ValuationTab({ data, t }: { data: any; t: TFn }) {
  return (
    <div>
      {/* Cheapness Scatter/Bar Chart */}
      <CheapnessChart data={data} t={t} />

      {/* Historical Premium Trend */}
      <PremiumTrendChart data={data} t={t} />
    </div>
  );
}

// ── CHEAPNESS CHART (SVG) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CheapnessChart({ data, t }: { data: any; t: TFn }) {
  const bonds = data?.bonds;
  if (!bonds || bonds.length === 0) {
    return (
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cbaCheapness', 'Theoretical vs Market')}
          </span>
        </div>
        <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'cbaNoBonds', 'No bond data available')}
        </div>
      </div>
    );
  }

  const W = 360;
  const H = 120;
  const PAD = { top: 10, bottom: 22, left: 30, right: 10 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Filter bonds with both theoretical and market price
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validBonds = bonds.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (b: any) => b?.theoreticalPrice != null && b?.marketPrice != null
  );

  if (validBonds.length === 0) {
    // Fallback: cheapness bar chart using cheapness scores
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cheapBonds = bonds.filter((b: any) => b?.cheapness != null).slice(0, 15);
    if (cheapBonds.length === 0) {
      return (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'cbaCheapness', 'Theoretical vs Market')}
            </span>
          </div>
          <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cbaNoValuation', 'No valuation data')}
          </div>
        </div>
      );
    }

    const barW = plotW / cheapBonds.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maxAbs = Math.max(...cheapBonds.map((b: any) => Math.abs(b.cheapness)), 1);
    const midY = PAD.top + plotH / 2;

    return (
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cbaCheapnessScore', 'Cheapness Score')}
          </span>
        </div>
        <div className="px-3 py-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            {/* Zero line */}
            <line
              x1={PAD.left}
              y1={midY}
              x2={W - PAD.right}
              y2={midY}
              stroke="#333"
              strokeWidth="0.5"
            />
            {/* Y-axis labels */}
            <text x={PAD.left - 3} y={PAD.top + 4} textAnchor="end" fill="#525252" fontSize="5" fontFamily="monospace">
              +{maxAbs.toFixed(1)}
            </text>
            <text x={PAD.left - 3} y={midY + 2} textAnchor="end" fill="#525252" fontSize="5" fontFamily="monospace">
              0
            </text>
            <text x={PAD.left - 3} y={PAD.top + plotH + 2} textAnchor="end" fill="#525252" fontSize="5" fontFamily="monospace">
              -{maxAbs.toFixed(1)}
            </text>
            {/* Bars */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {cheapBonds.map((b: any, i: number) => {
              const x = PAD.left + i * barW;
              const barH = (Math.abs(b.cheapness) / maxAbs) * (plotH / 2);
              const isPositive = b.cheapness >= 0;
              const y = isPositive ? midY - barH : midY;
              const color = isPositive ? '#4ade80' : '#f87171';

              return (
                <g key={b?.issuer ?? i}>
                  <rect
                    x={x + 2}
                    y={y}
                    width={Math.max(barW - 4, 2)}
                    height={barH}
                    fill={color}
                    opacity="0.5"
                  />
                  <text
                    x={x + barW / 2}
                    y={H - 4}
                    textAnchor="middle"
                    fill="#525252"
                    fontSize="4"
                    fontFamily="monospace"
                    transform={`rotate(-45, ${x + barW / 2}, ${H - 4})`}
                  >
                    {(b?.issuer ?? '').slice(0, 6)}
                  </text>
                </g>
              );
            })}
            {/* Labels */}
            <text x={W - PAD.right} y={PAD.top + 4} textAnchor="end" fill="#4ade80" fontSize="5" fontFamily="monospace">
              CHEAP
            </text>
            <text x={W - PAD.right} y={PAD.top + plotH + 2} textAnchor="end" fill="#f87171" fontSize="5" fontFamily="monospace">
              RICH
            </text>
          </svg>
        </div>
      </div>
    );
  }

  // Scatter plot: theoretical (x) vs market (y)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPrices = validBonds.flatMap((b: any) => [b.theoreticalPrice, b.marketPrice]);
  const minP = Math.min(...allPrices) * 0.95;
  const maxP = Math.max(...allPrices) * 1.05;
  const range = maxP - minP || 1;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cbaCheapness', 'Theoretical vs Market')}
        </span>
      </div>
      <div className="px-3 py-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
            <g key={frac}>
              <line
                x1={PAD.left}
                y1={PAD.top + frac * plotH}
                x2={W - PAD.right}
                y2={PAD.top + frac * plotH}
                stroke="#222"
                strokeWidth="0.3"
              />
              <text
                x={PAD.left - 3}
                y={PAD.top + frac * plotH + 2}
                textAnchor="end"
                fill="#525252"
                fontSize="5"
                fontFamily="monospace"
              >
                {(maxP - frac * range).toFixed(0)}
              </text>
            </g>
          ))}
          {/* 45-degree fair value line */}
          <line
            x1={PAD.left}
            y1={PAD.top + plotH}
            x2={PAD.left + plotW}
            y2={PAD.top}
            stroke={ACCENT}
            strokeWidth="0.5"
            strokeDasharray="3 2"
            opacity="0.4"
          />
          {/* Dots */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {validBonds.map((b: any, i: number) => {
            const x = PAD.left + ((b.theoreticalPrice - minP) / range) * plotW;
            const y = PAD.top + plotH - ((b.marketPrice - minP) / range) * plotH;
            const isCheap = b.marketPrice < b.theoreticalPrice;
            return (
              <circle
                key={b?.issuer ?? i}
                cx={x}
                cy={y}
                r="2.5"
                fill={isCheap ? '#4ade80' : '#f87171'}
                opacity="0.6"
              />
            );
          })}
          {/* Axis labels */}
          <text x={PAD.left + plotW / 2} y={H - 2} textAnchor="middle" fill="#525252" fontSize="5" fontFamily="monospace">
            THEORETICAL
          </text>
          <text
            x={4}
            y={PAD.top + plotH / 2}
            textAnchor="middle"
            fill="#525252"
            fontSize="5"
            fontFamily="monospace"
            transform={`rotate(-90, 4, ${PAD.top + plotH / 2})`}
          >
            MARKET
          </text>
        </svg>
        {/* Legend */}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 opacity-60" />
            <span className="text-[7px] font-mono text-neutral-500 uppercase">Cheap</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-400 opacity-60" />
            <span className="text-[7px] font-mono text-neutral-500 uppercase">Rich</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-[1px] border-t border-dashed border-indigo-400 opacity-40" />
            <span className="text-[7px] font-mono text-neutral-500 uppercase">Fair Value</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PREMIUM TREND CHART (SVG LINE) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PremiumTrendChart({ data, t }: { data: any; t: TFn }) {
  const history = data?.premiumHistory;
  if (!history || history.length === 0) return null;

  const W = 360;
  const H = 90;
  const PAD = { top: 8, bottom: 16, left: 30, right: 10 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values = history.map((h: any) => h?.premium ?? 0);
  const minV = Math.min(...values) * 0.95;
  const maxV = Math.max(...values) * 1.05;
  const range = maxV - minV || 1;

  const points = history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((h: any, i: number) => {
      const x = PAD.left + (i / Math.max(history.length - 1, 1)) * plotW;
      const y = PAD.top + plotH - (((h?.premium ?? 0) - minV) / range) * plotH;
      return `${x},${y}`;
    })
    .join(' ');

  // Area fill path
  const firstX = PAD.left;
  const lastX = PAD.left + ((history.length - 1) / Math.max(history.length - 1, 1)) * plotW;
  const bottomY = PAD.top + plotH;
  const areaPath = `M${firstX},${bottomY} L${points.replace(/ /g, ' L')} L${lastX},${bottomY} Z`;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-1.5">
        <LineChart className="w-2.5 h-2.5 text-neutral-500" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cbaPremiumTrend', 'Avg Premium Trend (30D)')}
        </span>
      </div>
      <div className="px-3 py-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Horizontal grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
            <g key={frac}>
              <line
                x1={PAD.left}
                y1={PAD.top + frac * plotH}
                x2={W - PAD.right}
                y2={PAD.top + frac * plotH}
                stroke="#1a1a1a"
                strokeWidth="0.3"
              />
              <text
                x={PAD.left - 3}
                y={PAD.top + frac * plotH + 2}
                textAnchor="end"
                fill="#525252"
                fontSize="5"
                fontFamily="monospace"
              >
                {(maxV - frac * range).toFixed(1)}%
              </text>
            </g>
          ))}
          {/* Area fill */}
          <path d={areaPath} fill={ACCENT} opacity="0.08" />
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke={ACCENT}
            strokeWidth="1.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Latest dot */}
          {history.length > 0 && (() => {
            const lastI = history.length - 1;
            const lx = PAD.left + (lastI / Math.max(history.length - 1, 1)) * plotW;
            const ly =
              PAD.top +
              plotH -
              (((history[lastI]?.premium ?? 0) - minV) / range) * plotH;
            return (
              <>
                <circle cx={lx} cy={ly} r="2" fill={ACCENT} />
                <circle cx={lx} cy={ly} r="4" fill={ACCENT} opacity="0.2" />
              </>
            );
          })()}
          {/* X-axis date labels (first, mid, last) */}
          {[0, Math.floor(history.length / 2), history.length - 1].map((idx) => {
            if (idx >= history.length) return null;
            const x = PAD.left + (idx / Math.max(history.length - 1, 1)) * plotW;
            const label = history[idx]?.date ?? '';
            return (
              <text
                key={idx}
                x={x}
                y={H - 2}
                textAnchor="middle"
                fill="#525252"
                fontSize="5"
                fontFamily="monospace"
              >
                {label}
              </text>
            );
          })}
        </svg>
        {/* Current value */}
        {history.length > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">Current</span>
            <span className="text-[9px] font-mono font-bold text-indigo-400">
              {fmtPct(history[history.length - 1]?.premium ?? 0)}
            </span>
            {history.length >= 2 && (() => {
              const diff =
                (history[history.length - 1]?.premium ?? 0) -
                (history[history.length - 2]?.premium ?? 0);
              return (
                <span className={`text-[8px] font-mono font-bold ${changeColor(diff)}`}>
                  {diff >= 0 ? '+' : ''}
                  {diff.toFixed(2)}
                </span>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PIPELINE TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PipelineTab({ data, t }: { data: any; t: TFn }) {
  const pipeline = data?.pipeline;

  return (
    <div>
      {/* New Issuance Pipeline */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10 flex items-center gap-1.5">
          <PlusCircle className="w-2.5 h-2.5 text-neutral-500" />
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cbaNewIssuance', 'New Issuance Pipeline')}
          </span>
        </div>
        {pipeline && pipeline.length > 0 ? (
          <div>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {pipeline.map((p: any, i: number) => (
              <div
                key={p?.issuer ?? i}
                className="px-3 py-2 border-b border-border/10 hover:bg-indigo-400/[0.02] transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1 h-4 shrink-0" style={{ backgroundColor: ACCENT, opacity: 0.5 + i * 0.05 }} />
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono font-bold text-white block truncate">
                        {p?.issuer ?? '--'}
                      </span>
                      {p?.sector && (
                        <span className="text-[7px] font-mono text-neutral-600">{p.sector}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p?.size != null && (
                      <span className="text-[9px] font-mono font-bold text-white">
                        {fmtB(p.size)}
                      </span>
                    )}
                    {p?.status && (
                      <span
                        className={`px-1 py-0 text-[6px] font-mono font-bold uppercase border ${
                          p.status === 'PRICED'
                            ? 'bg-green-500/10 text-green-400 border-green-500/30'
                            : p.status === 'LAUNCHED'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  {p?.coupon != null && (
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] font-mono text-neutral-600 uppercase">Cpn</span>
                      <span className="text-[8px] font-mono text-neutral-400">{fmtPct(p.coupon)}</span>
                    </div>
                  )}
                  {p?.premium != null && (
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] font-mono text-neutral-600 uppercase">Prem</span>
                      <span className="text-[8px] font-mono text-indigo-400">{fmtPct(p.premium)}</span>
                    </div>
                  )}
                  {p?.maturity && (
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] font-mono text-neutral-600 uppercase">Mat</span>
                      <span className="text-[8px] font-mono text-neutral-400">{p.maturity}</span>
                    </div>
                  )}
                  {p?.expectedDate && (
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] font-mono text-neutral-600 uppercase">Exp</span>
                      <span className="text-[8px] font-mono text-neutral-500">{p.expectedDate}</span>
                    </div>
                  )}
                  {p?.underwriter && (
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] font-mono text-neutral-600 uppercase">Lead</span>
                      <span className="text-[8px] font-mono text-neutral-400 truncate max-w-[80px]">
                        {p.underwriter}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cbaNoPipeline', 'No pipeline data available')}
          </div>
        )}
      </div>

      {/* Sector Breakdown (also shown in pipeline tab for context) */}
      <SectorBreakdown data={data} t={t} />
    </div>
  );
}
