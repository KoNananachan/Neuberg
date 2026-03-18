import { useMemo, useState } from 'react';
import {
  useRepoRates,
  type RepoRatesData,
  type RepoRate,
  type FedFacility,
} from '../../api/hooks/use-repo-rates';
import { useT } from '../../i18n';
import { Landmark, RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Types ──

type Tab = 'rates' | 'facilities' | 'curve';
type CategoryFilter = 'all' | 'secured' | 'unsecured' | 'treasury' | 'term' | 'commercial_paper';

// ── Formatting helpers ──

function fmtRate(n: number): string {
  return n.toFixed(2);
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtVol(n: number | null): string {
  if (n == null) return '--';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}T` : `${n.toFixed(0)}`;
}

// ── Color helpers ──

function bpsColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function signalStyle(signal: string | null): { text: string; bg: string } | null {
  if (!signal) return null;
  switch (signal) {
    case 'TIGHTENING':
      return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
    case 'EASING':
      return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
    case 'STRESS':
      return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
    case 'FLOOR':
      return { text: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' };
    default:
      return null;
  }
}

// ── Main Panel ──

export function RepoRatesPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useRepoRates();
  const [activeTab, setActiveTab] = useState<Tab>('rates');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Landmark className="w-3 h-3 text-lime-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-lime-400">
            {tr(t, 'rrTitle', 'Repo Rate Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-lime-400 bg-lime-500/10 border border-lime-500/30">
              {fmtRate(data.fedTargetLower)}–{fmtRate(data.fedTargetUpper)}%
            </span>
          )}
          {data && (
            <span className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-neutral-400 bg-neutral-500/10 border border-neutral-500/30">
              FOMC {data.nextFomcDate}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-lime-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {(['rates', 'facilities', 'curve'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 text-[8px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'text-lime-400 border-b border-lime-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab === 'rates'
              ? tr(t, 'rrTabRates', 'Rates')
              : tab === 'facilities'
                ? tr(t, 'rrTabFacilities', 'Facilities')
                : tr(t, 'rrTabCurve', 'Curve')}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-lime-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'rrNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'rates' && <RatesTab data={data} t={t} />}
        {data && activeTab === 'facilities' && <FacilitiesTab data={data} t={t} />}
        {data && activeTab === 'curve' && <CurveTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── RATES TAB ──

function RatesTab({ data, t }: { data: RepoRatesData; t: ReturnType<typeof useT> }) {
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const filteredRates = useMemo(
    () => (filter === 'all' ? data.rates : data.rates.filter((r) => r.category === filter)),
    [data.rates, filter],
  );

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: tr(t, 'rrAll', 'All') },
    { key: 'secured', label: tr(t, 'rrSecured', 'Secured') },
    { key: 'unsecured', label: tr(t, 'rrUnsecured', 'Unsecured') },
    { key: 'treasury', label: tr(t, 'rrTreasury', 'Treasury') },
    { key: 'term', label: tr(t, 'rrTerm', 'Term') },
    { key: 'commercial_paper', label: tr(t, 'rrCP', 'CP') },
  ];

  return (
    <div>
      {/* Category filter */}
      <div className="flex gap-px px-2 py-1 border-b border-border/20 bg-[#030303]">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
              filter === cat.key
                ? 'text-lime-400 bg-lime-500/10'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[120px_52px_44px_44px_44px_80px_44px_52px_56px_1fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'rrName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rrRate', 'Rate %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rr1D', '1D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rr1W', '1W')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rr1M', '1M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'rr52W', '52W Range')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rrVol', 'Vol $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rrSpread', 'FF bps')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'rrSignal', 'Signal')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">
          {tr(t, 'rr30D', '30D')}
        </span>
      </div>

      {/* Table rows */}
      {filteredRates.map((rate) => (
        <RateRow key={rate.name} rate={rate} />
      ))}

      {/* Market implied rate footer */}
      <div className="px-3 py-1.5 border-t border-border/20">
        <span className="text-[7px] font-mono text-neutral-600">
          {tr(t, 'rrImplied', 'Market Implied Rate')}: {' '}
          <span className="text-lime-400 font-bold">{fmtRate(data.marketImpliedRate)}%</span>
        </span>
        <span className="text-[7px] font-mono text-neutral-700 ml-3">
          {tr(t, 'rrUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

function RateRow({ rate }: { rate: RepoRate }) {
  const sig = signalStyle(rate.signal);

  return (
    <div className="grid grid-cols-[120px_52px_44px_44px_44px_80px_44px_52px_56px_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors items-center">
      {/* Name */}
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-[8px] font-mono font-bold text-white truncate">{rate.name}</span>
      </div>

      {/* Rate */}
      <span className="text-[8px] font-mono font-bold text-white text-right">
        {fmtRate(rate.rate)}
      </span>

      {/* 1D change */}
      <span className={`text-[8px] font-mono font-bold text-right ${bpsColor(rate.change1d)}`}>
        {fmtBps(rate.change1d)}
      </span>

      {/* 1W change */}
      <span className={`text-[8px] font-mono font-bold text-right ${bpsColor(rate.change1w)}`}>
        {fmtBps(rate.change1w)}
      </span>

      {/* 1M change */}
      <span className={`text-[8px] font-mono font-bold text-right ${bpsColor(rate.change1m)}`}>
        {fmtBps(rate.change1m)}
      </span>

      {/* 52W Range mini bar */}
      <div className="flex items-center gap-1 px-1">
        <span className="text-[6px] font-mono text-neutral-600 w-7 text-right">
          {fmtRate(rate.low52w)}
        </span>
        <div className="flex-1 h-[3px] bg-neutral-800 relative">
          <div
            className="absolute left-0 top-0 h-full bg-lime-500/40"
            style={{ width: `${Math.min(Math.max(rate.percentile, 0), 100)}%` }}
          />
          <div
            className="absolute top-[-1px] w-[3px] h-[5px] bg-lime-400"
            style={{ left: `${Math.min(Math.max(rate.percentile, 0), 100)}%` }}
          />
        </div>
        <span className="text-[6px] font-mono text-neutral-600 w-7">
          {fmtRate(rate.high52w)}
        </span>
      </div>

      {/* Volume */}
      <span className="text-[8px] font-mono text-neutral-400 text-right">
        {fmtVol(rate.volume)}
      </span>

      {/* Spread to FF */}
      <span
        className={`text-[8px] font-mono font-bold text-right ${
          rate.spreadToFedFunds > 0
            ? 'text-yellow-400'
            : rate.spreadToFedFunds < 0
              ? 'text-blue-400'
              : 'text-neutral-500'
        }`}
      >
        {fmtBps(rate.spreadToFedFunds)}
      </span>

      {/* Signal */}
      <div className="flex justify-center">
        {sig ? (
          <span
            className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${sig.text} ${sig.bg}`}
          >
            {rate.signal}
          </span>
        ) : (
          <span className="text-[6px] font-mono text-neutral-700">--</span>
        )}
      </div>

      {/* Sparkline */}
      <div className="flex justify-end pr-1">
        <MiniSparkline data={rate.rateHistory} />
      </div>
    </div>
  );
}

// ── Mini Sparkline ──

function MiniSparkline({ data }: { data: number[] }) {
  const path = useMemo(() => {
    if (data.length < 2) return null;
    const W = 48;
    const H = 14;
    const PAD = 1;

    const minV = Math.min(...data);
    const maxV = Math.max(...data);
    const rangeV = maxV - minV || 0.001;

    const scaleX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const scaleY = (v: number) => PAD + ((maxV - v) / rangeV) * (H - PAD * 2);

    const linePath = data
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    return { linePath, W, H };
  }, [data]);

  if (!path) return null;

  // Color based on whether last > first (rising = green)
  const rising = data[data.length - 1] > data[0];
  const color = rising ? '#84cc16' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${path.W} ${path.H}`} width={48} height={14}>
      <path d={path.linePath} fill="none" stroke={color} strokeWidth={1} />
    </svg>
  );
}

// ── FACILITIES TAB ──

function FacilitiesTab({ data, t }: { data: RepoRatesData; t: ReturnType<typeof useT> }) {
  return (
    <div className="p-3">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'rrFedFacilities', 'Fed Facilities')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {data.facilities.map((fac) => (
          <FacilityCard key={fac.name} facility={fac} t={t} />
        ))}
      </div>

      {/* Timestamp */}
      <div className="mt-3 pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'rrUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

function FacilityCard({ facility, t }: { facility: FedFacility; t: ReturnType<typeof useT> }) {
  const isUp = facility.usageChange >= 0;

  // Area chart from usage history
  const chartData = useMemo(() => {
    const history = facility.usageHistory;
    if (history.length < 2) return null;

    const W = 200;
    const H = 70;
    const PAD_X = 4;
    const PAD_Y = 6;

    const minV = Math.min(...history) * 0.9;
    const maxV = Math.max(...history) * 1.05;
    const rangeV = maxV - minV || 1;

    const scaleX = (i: number) => PAD_X + (i / (history.length - 1)) * (W - PAD_X * 2);
    const scaleY = (v: number) => PAD_Y + ((maxV - v) / rangeV) * (H - PAD_Y * 2);

    const linePath = history
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    const fillPath = `${linePath} L ${scaleX(history.length - 1).toFixed(1)},${H} L ${scaleX(0).toFixed(1)},${H} Z`;

    return { linePath, fillPath, W, H };
  }, [facility.usageHistory]);

  return (
    <div className="bg-[#050505] border border-border/20 p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] font-mono font-bold text-white uppercase tracking-wider">
          {facility.name}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'rrUsage', 'Usage ($B)')}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[11px] font-mono font-bold text-white">
              {facility.usage.toFixed(1)}
            </span>
            <span className={`text-[8px] font-mono font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
              {isUp ? '+' : ''}{facility.usageChange.toFixed(1)}
            </span>
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'rrCounterparties', 'Counterparties')}
          </div>
          <div className="text-[11px] font-mono font-bold text-white">
            {facility.counterparties}
          </div>
        </div>
      </div>

      <div className="mb-2">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'rrAwardRate', 'Award Rate')}
        </div>
        <div className="text-[10px] font-mono font-bold text-lime-400">
          {fmtRate(facility.awardRate)}%
        </div>
      </div>

      {/* Area chart */}
      {chartData && (
        <svg viewBox={`0 0 ${chartData.W} ${chartData.H}`} className="w-full" style={{ height: 56 }}>
          <path d={chartData.fillPath} fill="rgba(132,204,22,0.08)" />
          <path d={chartData.linePath} fill="none" stroke="#84cc16" strokeWidth={1.5} />
        </svg>
      )}
    </div>
  );
}

// ── CURVE TAB ──

function CurveTab({ data, t }: { data: RepoRatesData; t: ReturnType<typeof useT> }) {
  const curveData = useMemo(() => {
    // Extract rates for plotting on the yield curve
    const getRate = (name: string) => data.rates.find((r) => r.name === name);

    // Tenor points (in months) for x-axis positioning
    const curvePoints: { name: string; tenor: number; rate: number; color: string; group: string }[] = [];

    // Treasury bills
    const tb1m = getRate('T-Bill 1M');
    const tb3m = getRate('T-Bill 3M');
    const tb6m = getRate('T-Bill 6M');
    const tb1y = getRate('T-Bill 1Y');
    if (tb1m) curvePoints.push({ name: 'T-Bill 1M', tenor: 1, rate: tb1m.rate, color: '#60a5fa', group: 'treasury' });
    if (tb3m) curvePoints.push({ name: 'T-Bill 3M', tenor: 3, rate: tb3m.rate, color: '#60a5fa', group: 'treasury' });
    if (tb6m) curvePoints.push({ name: 'T-Bill 6M', tenor: 6, rate: tb6m.rate, color: '#60a5fa', group: 'treasury' });
    if (tb1y) curvePoints.push({ name: 'T-Bill 1Y', tenor: 12, rate: tb1y.rate, color: '#60a5fa', group: 'treasury' });

    // Term SOFR
    const ts1m = getRate('Term SOFR 1M');
    const ts3m = getRate('Term SOFR 3M');
    if (ts1m) curvePoints.push({ name: 'Term SOFR 1M', tenor: 1, rate: ts1m.rate, color: '#84cc16', group: 'sofr' });
    if (ts3m) curvePoints.push({ name: 'Term SOFR 3M', tenor: 3, rate: ts3m.rate, color: '#84cc16', group: 'sofr' });

    // Commercial paper
    const cpFin = getRate('AA Financial CP 90D');
    const cpNon = getRate('AA Nonfinancial CP 90D');
    if (cpFin) curvePoints.push({ name: 'AA Fin CP', tenor: 3, rate: cpFin.rate, color: '#f59e0b', group: 'cp' });
    if (cpNon) curvePoints.push({ name: 'AA NonFin CP', tenor: 3, rate: cpNon.rate, color: '#f59e0b', group: 'cp' });

    // Reference rates (overnight = ~0 tenor for display, shifted to 0.5 for visibility)
    const sofr = getRate('SOFR');
    const effff = getRate('Effective Fed Funds');
    if (sofr) curvePoints.push({ name: 'SOFR', tenor: 0.5, rate: sofr.rate, color: '#22c55e', group: 'reference' });
    if (effff) curvePoints.push({ name: 'Eff FF', tenor: 0.5, rate: effff.rate, color: '#a855f7', group: 'reference' });

    return curvePoints;
  }, [data.rates]);

  // SVG dimensions
  const W = 420;
  const H = 200;
  const PAD_L = 40;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 30;

  // Scale
  const allRates = curveData.map((p) => p.rate);
  const minRate = Math.min(...allRates, data.fedTargetLower) - 0.1;
  const maxRate = Math.max(...allRates, data.fedTargetUpper) + 0.1;
  const rateRange = maxRate - minRate || 1;

  const maxTenor = 14; // months
  const scaleX = (tenor: number) => PAD_L + (tenor / maxTenor) * (W - PAD_L - PAD_R);
  const scaleY = (rate: number) => PAD_T + ((maxRate - rate) / rateRange) * (H - PAD_T - PAD_B);

  // Fed target corridor Y positions
  const corridorTopY = scaleY(data.fedTargetUpper);
  const corridorBottomY = scaleY(data.fedTargetLower);

  // Group treasury points for a line
  const treasuryPoints = curveData
    .filter((p) => p.group === 'treasury')
    .sort((a, b) => a.tenor - b.tenor);

  const treasuryPath = treasuryPoints.length >= 2
    ? treasuryPoints
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.tenor).toFixed(1)},${scaleY(p.rate).toFixed(1)}`)
        .join(' ')
    : null;

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = 0.1;
  for (let r = Math.ceil(minRate / step) * step; r <= maxRate; r += step) {
    yTicks.push(Math.round(r * 100) / 100);
  }

  // X-axis labels
  const xLabels = [
    { tenor: 0.5, label: 'O/N' },
    { tenor: 1, label: '1M' },
    { tenor: 3, label: '3M' },
    { tenor: 6, label: '6M' },
    { tenor: 12, label: '1Y' },
  ];

  return (
    <div className="p-3">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'rrMoneyMarketCurve', 'Money Market Yield Curve')}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
        {/* Grid lines */}
        {yTicks.map((r) => (
          <g key={r}>
            <line
              x1={PAD_L}
              y1={scaleY(r)}
              x2={W - PAD_R}
              y2={scaleY(r)}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="2,3"
            />
            <text
              x={PAD_L - 4}
              y={scaleY(r) + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.25)"
              fontSize={7}
              fontFamily="monospace"
            >
              {r.toFixed(1)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {xLabels.map((xl) => (
          <g key={xl.label}>
            <line
              x1={scaleX(xl.tenor)}
              y1={PAD_T}
              x2={scaleX(xl.tenor)}
              y2={H - PAD_B}
              stroke="rgba(255,255,255,0.03)"
              strokeDasharray="2,3"
            />
            <text
              x={scaleX(xl.tenor)}
              y={H - PAD_B + 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize={7}
              fontFamily="monospace"
            >
              {xl.label}
            </text>
          </g>
        ))}

        {/* Fed target corridor band */}
        <rect
          x={PAD_L}
          y={corridorTopY}
          width={W - PAD_L - PAD_R}
          height={corridorBottomY - corridorTopY}
          fill="rgba(132,204,22,0.06)"
          stroke="rgba(132,204,22,0.15)"
          strokeWidth={0.5}
          strokeDasharray="4,2"
        />
        <text
          x={W - PAD_R - 2}
          y={corridorTopY - 3}
          textAnchor="end"
          fill="rgba(132,204,22,0.4)"
          fontSize={6}
          fontFamily="monospace"
        >
          {fmtRate(data.fedTargetUpper)}% (UPPER)
        </text>
        <text
          x={W - PAD_R - 2}
          y={corridorBottomY + 9}
          textAnchor="end"
          fill="rgba(132,204,22,0.4)"
          fontSize={6}
          fontFamily="monospace"
        >
          {fmtRate(data.fedTargetLower)}% (LOWER)
        </text>

        {/* Treasury curve line */}
        {treasuryPath && (
          <path d={treasuryPath} fill="none" stroke="#60a5fa" strokeWidth={1.5} />
        )}

        {/* Data points */}
        {curveData.map((pt) => (
          <g key={`${pt.name}-${pt.tenor}`}>
            <circle
              cx={scaleX(pt.tenor)}
              cy={scaleY(pt.rate)}
              r={3}
              fill={pt.color}
              stroke="black"
              strokeWidth={0.5}
            />
            <text
              x={scaleX(pt.tenor)}
              y={scaleY(pt.rate) - 6}
              textAnchor="middle"
              fill={pt.color}
              fontSize={6}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {pt.name}
            </text>
            <text
              x={scaleX(pt.tenor)}
              y={scaleY(pt.rate) + 10}
              textAnchor="middle"
              fill="white"
              fontSize={6}
              fontFamily="monospace"
            >
              {fmtRate(pt.rate)}%
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 px-1">
        <LegendItem color="#60a5fa" label={tr(t, 'rrTBills', 'T-Bills')} />
        <LegendItem color="#84cc16" label={tr(t, 'rrTermSOFR', 'Term SOFR')} />
        <LegendItem color="#f59e0b" label={tr(t, 'rrCommPaper', 'Comm Paper')} />
        <LegendItem color="#22c55e" label={tr(t, 'rrSOFR', 'SOFR')} />
        <LegendItem color="#a855f7" label={tr(t, 'rrEffFF', 'Eff Fed Funds')} />
      </div>

      {/* Timestamp */}
      <div className="mt-3 pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'rrUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-[2px]" style={{ backgroundColor: color }} />
      <span className="text-[7px] font-mono text-neutral-500">{label}</span>
    </div>
  );
}
