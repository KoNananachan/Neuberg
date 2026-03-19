import { useMemo } from 'react';
import { useRepoRateMonitor } from '../../api/hooks/use-repo-rate-monitor';
import { useT } from '../../i18n';
import { RefreshCw, Landmark } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const LIME = '#a3e635'; // lime-400
const LIME_DIM = 'rgba(163,230,53,0.06)';
const CHART_W = 320;
const CHART_H = 80;
const HIST_W = 320;
const HIST_H = 90;

// ── Formatting helpers ──

function fmtRate(n: number): string {
  return n.toFixed(3);
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(3)}`;
}

function fmtVolume(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtBn(n: number): string {
  return `$${n.toFixed(1)}B`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function changeSvgColor(n: number): string {
  if (n > 0) return '#f87171';
  if (n < 0) return '#4ade80';
  return '#737373';
}

function spreadColor(n: number): string {
  if (n < -50) return 'text-red-400';
  if (n < -20) return 'text-yellow-400';
  if (n < 0) return 'text-orange-400';
  return 'text-neutral-500';
}

function spreadSvgColor(n: number): string {
  if (n < -50) return '#f87171';
  if (n < -20) return '#facc15';
  if (n < 0) return '#fb923c';
  return '#737373';
}

function specialnessColor(n: number): string {
  if (n >= 80) return 'text-red-400';
  if (n >= 50) return 'text-yellow-400';
  if (n >= 20) return 'text-lime-400';
  return 'text-neutral-400';
}

function rrpUsageColor(pct: number): string {
  if (pct >= 80) return '#f87171';
  if (pct >= 50) return '#facc15';
  return '#a3e635';
}

// ── Interfaces ──

interface OvernightRate {
  name: string;
  rate: number;
  change: number;
  avg1w: number;
  avg1m: number;
}

interface TermPoint {
  tenor: string;
  days: number;
  gcRate: number;
  spreadToSOFR: number;
  volume: number;
}

interface CollateralRate {
  type: string;
  avgRate: number;
  spreadToTsy: number;
  haircut: number;
  volume: number;
  change1d: number;
}

interface HistoricalPoint {
  date: string;
  sofr: number;
  fedFunds: number;
  triParty: number;
  gcf: number;
  volume: number;
}

interface SpecialVsGC {
  security: string;
  specialRate: number;
  gcRate: number;
  spreadBps: number;
  specialness: number;
  reason: string;
}

interface RrpFacility {
  balance: number;
  capacity: number;
  rate: number;
  counterparties: number;
  change1d: number;
}

// ── SVG Helpers ──

function buildPolyline(
  data: number[],
  w: number,
  h: number,
  padX = 0,
  padY = 4,
): string {
  if (data.length < 2) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.01;
  return data
    .map((v, i) => {
      const x = padX + (i / (data.length - 1)) * (w - padX * 2);
      const y = padY + ((max - v) / range) * (h - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function svgYLabels(
  min: number,
  max: number,
  count: number,
): { value: number; y: number }[] {
  const labels: { value: number; y: number }[] = [];
  const range = max - min || 0.01;
  for (let i = 0; i < count; i++) {
    const value = min + (range * i) / (count - 1);
    const y = 4 + ((max - value) / range) * (CHART_H - 8);
    labels.push({ value, y });
  }
  return labels;
}

// ── Main Panel ──

export function RepoRateMonitorPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useRepoRateMonitor();

  const overnightRates = (data?.overnightRates ?? []) as OvernightRate[];
  const termStructure = (data?.termStructure ?? []) as TermPoint[];
  const collateralRates = (data?.collateralRates ?? []) as CollateralRate[];
  const historicalData = (data?.historicalData ?? []) as HistoricalPoint[];
  const specialVsGC = (data?.specialVsGC ?? []) as SpecialVsGC[];
  const rrpFacility = data?.rrpFacility as RrpFacility | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Landmark className="w-3 h-3 text-lime-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-lime-400">
            {tr(t, 'repoRateMonitorTitle', 'Repo Rate Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-lime-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-lime-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'repoMonNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {/* Overnight Rates Summary */}
            {overnightRates.length > 0 && (
              <OvernightRatesSummary rates={overnightRates} t={t} />
            )}

            {/* Fed RRP Facility Usage */}
            {rrpFacility && (
              <RrpFacilityIndicator facility={rrpFacility} t={t} />
            )}

            {/* Term Structure Chart */}
            {termStructure.length > 0 && (
              <TermStructureChart points={termStructure} t={t} />
            )}

            {/* Collateral Type Rate Differentials */}
            {collateralRates.length > 0 && (
              <CollateralRateTable rates={collateralRates} t={t} />
            )}

            {/* Special vs GC Spread Highlight */}
            {specialVsGC.length > 0 && (
              <SpecialGcSpreadSection items={specialVsGC} t={t} />
            )}

            {/* Historical 30-Day Rate Chart */}
            {historicalData.length > 0 && (
              <HistoricalRateChart data={historicalData} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Overnight Rates Summary ──

function OvernightRatesSummary({
  rates,
  t,
}: {
  rates: OvernightRate[];
  t: TFn;
}) {
  const sofr = rates.find((r) => r.name === 'SOFR');
  const fedFunds = rates.find((r) => r.name === 'Fed Funds' || r.name === 'EFFR');
  const triParty = rates.find((r) => r.name === 'Tri-Party' || r.name === 'TGCR');
  const gcf = rates.find((r) => r.name === 'GCF' || r.name === 'BGCR');

  const keyRates = [
    { label: 'SOFR', data: sofr },
    { label: 'FED FUNDS', data: fedFunds },
    { label: 'TRI-PARTY', data: triParty },
    { label: 'GCF', data: gcf },
  ];

  return (
    <div className="border-b border-border/30">
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoMonOvernightSummary', 'Overnight Rates')}
        </span>
      </div>

      {/* Key rates in grid */}
      <div className="grid grid-cols-4 gap-0 divide-x divide-lime-400/10 border-b border-border/20">
        {keyRates.map((item) => (
          <div key={item.label} className="px-2.5 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {item.label}
            </div>
            {item.data ? (
              <div className="flex items-baseline gap-1">
                <span className="text-[11px] font-mono font-bold text-white">
                  {fmtRate(item.data.rate)}%
                </span>
                <span className={`text-[7px] font-mono font-bold ${changeColor(item.data.change)}`}>
                  {fmtBps(item.data.change)}bp
                </span>
              </div>
            ) : (
              <span className="text-[9px] font-mono text-neutral-600">--</span>
            )}
          </div>
        ))}
      </div>

      {/* Full table */}
      <div className="grid grid-cols-[1fr_52px_52px_52px_52px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'repoMonName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonRate', 'Rate')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonChg', 'Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMon1wAvg', '1W Avg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'repoMon1mAvg', '1M Avg')}
        </span>
      </div>

      {rates.map((rate) => (
        <div
          key={rate.name}
          className="grid grid-cols-[1fr_52px_52px_52px_52px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400">{rate.name}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(rate.rate)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(rate.change)}`}>
            {fmtBps(rate.change)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate(rate.avg1w)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {fmtRate(rate.avg1m)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Fed RRP Facility Usage Indicator ──

function RrpFacilityIndicator({
  facility,
  t,
}: {
  facility: RrpFacility;
  t: TFn;
}) {
  const usagePct = facility.capacity > 0
    ? Math.min((facility.balance / facility.capacity) * 100, 100)
    : 0;
  const barColor = rrpUsageColor(usagePct);

  return (
    <div className="border-b border-border/30">
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoMonRrpFacility', 'Fed RRP Facility')}
        </span>
      </div>

      <div className="px-3 py-2">
        {/* Top stats row */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          <div>
            <div className="text-[7px] font-mono text-neutral-600 uppercase">Balance</div>
            <div className="text-[10px] font-mono font-bold text-white">{fmtBn(facility.balance)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-600 uppercase">Rate</div>
            <div className="text-[10px] font-mono font-bold text-lime-400">{fmtRate(facility.rate)}%</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-600 uppercase">Cpty</div>
            <div className="text-[10px] font-mono font-bold text-white">{facility.counterparties}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-600 uppercase">1D Chg</div>
            <div className={`text-[10px] font-mono font-bold ${changeColor(facility.change1d)}`}>
              {fmtBps(facility.change1d)}B
            </div>
          </div>
        </div>

        {/* Usage bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-neutral-900 relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full transition-all"
              style={{ width: `${usagePct}%`, backgroundColor: barColor, opacity: 0.7 }}
            />
            {/* Threshold markers */}
            <div className="absolute top-0 h-full w-px bg-neutral-600" style={{ left: '50%' }} />
            <div className="absolute top-0 h-full w-px bg-neutral-600" style={{ left: '80%' }} />
          </div>
          <span className="text-[8px] font-mono font-bold" style={{ color: barColor }}>
            {usagePct.toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[6px] font-mono text-neutral-600">0</span>
          <span className="text-[6px] font-mono text-neutral-600">{fmtBn(facility.capacity)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Term Structure Chart (SVG) ──

function TermStructureChart({
  points,
  t,
}: {
  points: TermPoint[];
  t: TFn;
}) {
  const sorted = useMemo(() => [...points].sort((a, b) => a.days - b.days), [points]);

  const rates = sorted.map((p) => p.gcRate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const range = maxRate - minRate || 0.01;
  const padX = 36;
  const padY = 8;
  const chartW = CHART_W;
  const chartH = CHART_H;
  const innerW = chartW - padX - 8;
  const innerH = chartH - padY * 2;

  const maxDays = Math.max(...sorted.map((p) => p.days));
  const minDays = Math.min(...sorted.map((p) => p.days));
  const dayRange = maxDays - minDays || 1;

  const linePoints = sorted
    .map((p) => {
      const x = padX + ((p.days - minDays) / dayRange) * innerW;
      const y = padY + ((maxRate - p.gcRate) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const yLabels = svgYLabels(minRate, maxRate, 4);

  // Volume bars
  const maxVol = Math.max(...sorted.map((p) => p.volume), 1);
  const volBarH = 20;

  return (
    <div className="border-b border-border/30">
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoMonTermStructure', 'Term Structure')}
        </span>
      </div>

      <div className="px-3 py-2">
        {/* Rate chart */}
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxHeight: 100 }}>
          {/* Y-axis grid lines and labels */}
          {yLabels.map((lbl, i) => (
            <g key={i}>
              <line
                x1={padX}
                y1={lbl.y}
                x2={chartW - 8}
                y2={lbl.y}
                stroke="#333"
                strokeWidth={0.5}
                strokeDasharray="2,2"
              />
              <text
                x={padX - 3}
                y={lbl.y + 1.5}
                textAnchor="end"
                fill="#666"
                fontSize={6}
                fontFamily="monospace"
              >
                {lbl.value.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Rate line */}
          <polyline
            points={linePoints}
            fill="none"
            stroke={LIME}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {sorted.map((p, i) => {
            const x = padX + ((p.days - minDays) / dayRange) * innerW;
            const y = padY + ((maxRate - p.gcRate) / range) * innerH;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={2} fill={LIME} />
                <text
                  x={x}
                  y={y - 5}
                  textAnchor="middle"
                  fill="#ccc"
                  fontSize={5}
                  fontFamily="monospace"
                >
                  {p.gcRate.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* X-axis tenor labels */}
          {sorted.map((p, i) => {
            const x = padX + ((p.days - minDays) / dayRange) * innerW;
            return (
              <text
                key={i}
                x={x}
                y={chartH - 1}
                textAnchor="middle"
                fill="#666"
                fontSize={5}
                fontFamily="monospace"
              >
                {p.tenor}
              </text>
            );
          })}
        </svg>

        {/* Volume bars beneath */}
        <div className="mt-1">
          <div className="text-[6px] font-mono text-neutral-600 uppercase mb-0.5">Volume</div>
          <svg viewBox={`0 0 ${chartW} ${volBarH}`} className="w-full" style={{ maxHeight: 24 }}>
            {sorted.map((p, i) => {
              const x = padX + ((p.days - minDays) / dayRange) * innerW;
              const barW = Math.max(innerW / sorted.length * 0.6, 6);
              const barH = (p.volume / maxVol) * (volBarH - 2);
              return (
                <g key={i}>
                  <rect
                    x={x - barW / 2}
                    y={volBarH - 2 - barH}
                    width={barW}
                    height={barH}
                    fill={LIME}
                    opacity={0.35}
                  />
                  <text
                    x={x}
                    y={volBarH - 2 - barH - 2}
                    textAnchor="middle"
                    fill="#888"
                    fontSize={4}
                    fontFamily="monospace"
                  >
                    {fmtVolume(p.volume)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Term data table */}
      <div className="grid grid-cols-[1fr_52px_60px_60px] gap-0 px-2 py-0.5 border-y border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'repoMonTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonGcRate', 'GC Rate')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonSprdSOFR', 'Sprd SOFR')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'repoMonVol', 'Volume')}
        </span>
      </div>
      {sorted.map((p) => (
        <div
          key={p.tenor}
          className="grid grid-cols-[1fr_52px_60px_60px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{p.tenor}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(p.gcRate)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(p.spreadToSOFR)}`}>
            {fmtBps(p.spreadToSOFR)}bp
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {fmtVolume(p.volume)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Collateral Type Rate Differentials ──

function CollateralRateTable({
  rates,
  t,
}: {
  rates: CollateralRate[];
  t: TFn;
}) {
  return (
    <div className="border-b border-border/30">
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoMonCollateralRates', 'Collateral Rate Differentials')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_48px_52px_40px_56px_44px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'repoMonType', 'Type')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonAvgRate', 'Avg Rate')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonSprdTsy', 'Sprd Tsy')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonHaircut', 'H/C')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonVol', 'Volume')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'repoMon1d', '1D')}
        </span>
      </div>

      {rates.map((rate) => (
        <div
          key={rate.type}
          className="grid grid-cols-[1fr_48px_52px_40px_56px_44px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {rate.type}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(rate.avgRate)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(rate.spreadToTsy)}`}>
            {fmtBps(rate.spreadToTsy)}bp
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {rate.haircut.toFixed(1)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtVolume(rate.volume)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(rate.change1d)}`}>
            {fmtBps(rate.change1d)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Special vs GC Spread Highlight ──

function SpecialGcSpreadSection({
  items,
  t,
}: {
  items: SpecialVsGC[];
  t: TFn;
}) {
  return (
    <div className="border-b border-border/30">
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-yellow-400" />
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'repoMonSpecialGc', 'Special vs GC Spread')}
          </span>
        </div>
      </div>

      {/* Visual spread bars */}
      <div className="px-3 py-2">
        {items.slice(0, 6).map((item, i) => {
          const absSpread = Math.abs(item.spreadBps);
          const maxSpread = Math.max(...items.map((s) => Math.abs(s.spreadBps)), 1);
          const barPct = Math.min((absSpread / maxSpread) * 100, 100);
          const color = spreadSvgColor(item.spreadBps);
          return (
            <div key={`${item.security}-${i}`} className="flex items-center gap-2 mb-1.5">
              <span className="text-[7px] font-mono font-bold text-lime-400 w-20 truncate shrink-0">
                {item.security}
              </span>
              <div className="flex-1 h-1.5 bg-neutral-900 relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{ width: `${barPct}%`, backgroundColor: color, opacity: 0.6 }}
                />
              </div>
              <span className={`text-[7px] font-mono font-bold w-12 text-right ${spreadColor(item.spreadBps)}`}>
                {fmtBps(item.spreadBps)}bp
              </span>
              <span className={`text-[7px] font-mono font-bold w-8 text-right ${specialnessColor(item.specialness)}`}>
                {item.specialness.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Detail table */}
      <div className="grid grid-cols-[1fr_44px_44px_44px_44px_72px] gap-0 px-2 py-0.5 border-y border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'repoMonSecurity', 'Security')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonSpcl', 'Spcl')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonGc', 'GC')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonSprd', 'Sprd')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonSpec', 'Spec%')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'repoMonReason', 'Reason')}
        </span>
      </div>
      {items.map((item, i) => (
        <div
          key={`${item.security}-${i}`}
          className="grid grid-cols-[1fr_44px_44px_44px_44px_72px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {item.security}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(item.specialRate)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate(item.gcRate)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(item.spreadBps)}`}>
            {fmtBps(item.spreadBps)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${specialnessColor(item.specialness)}`}>
            {item.specialness.toFixed(0)}%
          </span>
          <span className="text-[7px] font-mono text-neutral-500 text-right pr-2 truncate">
            {item.reason}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Historical 30-Day Rate Chart (SVG with multiple lines) ──

function HistoricalRateChart({
  data,
  t,
}: {
  data: HistoricalPoint[];
  t: TFn;
}) {
  const sofrLine = useMemo(() => buildPolyline(data.map((d) => d.sofr), HIST_W - 40, HIST_H - 20, 36, 6), [data]);
  const fedFundsLine = useMemo(() => buildPolyline(data.map((d) => d.fedFunds), HIST_W - 40, HIST_H - 20, 36, 6), [data]);
  const triPartyLine = useMemo(() => buildPolyline(data.map((d) => d.triParty), HIST_W - 40, HIST_H - 20, 36, 6), [data]);
  const gcfLine = useMemo(() => buildPolyline(data.map((d) => d.gcf), HIST_W - 40, HIST_H - 20, 36, 6), [data]);

  const allRates = data.flatMap((d) => [d.sofr, d.fedFunds, d.triParty, d.gcf]);
  const minRate = Math.min(...allRates);
  const maxRate = Math.max(...allRates);
  const rateRange = maxRate - minRate || 0.01;

  // Volume bars
  const maxVol = Math.max(...data.map((d) => d.volume), 1);
  const volH = 20;

  const lines: { label: string; points: string; color: string }[] = [
    { label: 'SOFR', points: sofrLine, color: LIME },
    { label: 'FED FUNDS', points: fedFundsLine, color: '#38bdf8' },
    { label: 'TRI-PARTY', points: triPartyLine, color: '#c084fc' },
    { label: 'GCF', points: gcfLine, color: '#fb923c' },
  ];

  // Y labels
  const yCount = 4;
  const yLabels: { value: number; y: number }[] = [];
  for (let i = 0; i < yCount; i++) {
    const value = minRate + (rateRange * i) / (yCount - 1);
    const y = 6 + ((maxRate - value) / rateRange) * (HIST_H - 20 - 12);
    yLabels.push({ value, y });
  }

  // X labels (first, middle, last)
  const xLabels: { label: string; x: number }[] = [];
  if (data.length > 0) {
    const fmtD = (d: string) => {
      try {
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } catch { return d; }
    };
    const innerW = HIST_W - 40 - 8;
    xLabels.push({ label: fmtD(data[0].date), x: 36 });
    if (data.length > 2) {
      const mid = Math.floor(data.length / 2);
      xLabels.push({ label: fmtD(data[mid].date), x: 36 + (mid / (data.length - 1)) * innerW });
    }
    xLabels.push({ label: fmtD(data[data.length - 1].date), x: 36 + innerW });
  }

  return (
    <div className="border-b border-border/30">
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoMonHistorical', '30-Day Rate History')}
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1 border-b border-border/20">
        {lines.map((l) => (
          <div key={l.label} className="flex items-center gap-1">
            <div className="w-2 h-0.5" style={{ backgroundColor: l.color }} />
            <span className="text-[6px] font-mono uppercase" style={{ color: l.color }}>
              {l.label}
            </span>
          </div>
        ))}
      </div>

      <div className="px-3 py-2">
        {/* Rate chart */}
        <svg viewBox={`0 0 ${HIST_W} ${HIST_H}`} className="w-full" style={{ maxHeight: 110 }}>
          {/* Y grid + labels */}
          {yLabels.map((lbl, i) => (
            <g key={i}>
              <line
                x1={36}
                y1={lbl.y}
                x2={HIST_W - 8}
                y2={lbl.y}
                stroke="#333"
                strokeWidth={0.5}
                strokeDasharray="2,2"
              />
              <text
                x={33}
                y={lbl.y + 1.5}
                textAnchor="end"
                fill="#666"
                fontSize={5.5}
                fontFamily="monospace"
              >
                {lbl.value.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Lines */}
          {lines.map((l) =>
            l.points ? (
              <polyline
                key={l.label}
                points={l.points}
                fill="none"
                stroke={l.color}
                strokeWidth={1}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.8}
              />
            ) : null,
          )}

          {/* X labels */}
          {xLabels.map((lbl, i) => (
            <text
              key={i}
              x={lbl.x}
              y={HIST_H - 2}
              textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
              fill="#666"
              fontSize={5}
              fontFamily="monospace"
            >
              {lbl.label}
            </text>
          ))}
        </svg>

        {/* Volume bars */}
        <div className="mt-1">
          <div className="text-[6px] font-mono text-neutral-600 uppercase mb-0.5">Volume</div>
          <svg viewBox={`0 0 ${HIST_W} ${volH}`} className="w-full" style={{ maxHeight: 24 }}>
            {data.map((d, i) => {
              const x = 36 + (i / Math.max(data.length - 1, 1)) * (HIST_W - 48);
              const barW = Math.max((HIST_W - 48) / data.length * 0.7, 3);
              const barH = (d.volume / maxVol) * (volH - 2);
              return (
                <rect
                  key={i}
                  x={x - barW / 2}
                  y={volH - 2 - barH}
                  width={barW}
                  height={barH}
                  fill={LIME}
                  opacity={0.25}
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
