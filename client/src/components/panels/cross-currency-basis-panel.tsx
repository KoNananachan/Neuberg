import { useState, useMemo } from 'react';
import { useCrossCurrencyBasis } from '../../api/hooks/use-cross-currency-basis';

// ── Constants ──

const TENORS = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '10Y'] as const;
type Tenor = (typeof TENORS)[number];

const PAIRS = [
  'EUR/USD', 'JPY/USD', 'GBP/USD', 'CHF/USD', 'AUD/USD',
  'CAD/USD', 'SEK/USD', 'NOK/USD', 'NZD/USD', 'KRW/USD',
] as const;

type TabMode = 'basis' | 'historical' | 'swapLines' | 'forwards' | 'termStructure';

const PAIR_COLORS: Record<string, string> = {
  'EUR/USD': '#a78bfa',
  'JPY/USD': '#38bdf8',
  'GBP/USD': '#4ade80',
  'CHF/USD': '#fb923c',
  'AUD/USD': '#f472b6',
  'CAD/USD': '#f87171',
  'SEK/USD': '#facc15',
  'NOK/USD': '#2dd4bf',
  'NZD/USD': '#e879f9',
  'KRW/USD': '#60a5fa',
};

// ── Formatting helpers ──

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '-';
  return `${n.toFixed(2)}%`;
}

function fmtSpot(n: number | null | undefined): string {
  if (n == null) return '-';
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(5);
}

function fmtBillions(n: number | null | undefined): string {
  if (n == null) return '-';
  return `$${n.toFixed(1)}B`;
}

// ── Color helpers ──

function basisColor(bps: number): string {
  if (bps < -50) return 'text-red-400';
  if (bps < -30) return 'text-orange-400';
  if (bps < -15) return 'text-orange-300';
  if (bps < -5) return 'text-yellow-400';
  if (bps < 0) return 'text-yellow-300';
  return 'text-green-400';
}

function basisCellBg(bps: number): string {
  if (bps < -50) return 'bg-red-500/[0.12]';
  if (bps < -30) return 'bg-orange-500/[0.08]';
  if (bps < -15) return 'bg-orange-500/[0.04]';
  if (bps < -5) return 'bg-yellow-500/[0.03]';
  return '';
}

function changeColor(n: number): string {
  if (n > 0.5) return 'text-green-400';
  if (n < -0.5) return 'text-red-400';
  return 'text-neutral-500';
}

function stressLevelColor(level: string): string {
  const l = (level || '').toUpperCase();
  if (l === 'HIGH' || l === 'SEVERE') return 'text-red-400';
  if (l === 'ELEVATED') return 'text-orange-400';
  if (l === 'MODERATE') return 'text-yellow-400';
  return 'text-green-400';
}

function stressBadgeClass(level: string): string {
  const l = (level || '').toUpperCase();
  if (l === 'HIGH' || l === 'SEVERE') return 'bg-red-400/20 text-red-400 border border-red-400/30';
  if (l === 'ELEVATED') return 'bg-orange-400/20 text-orange-400 border border-orange-400/30';
  if (l === 'MODERATE') return 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30';
  return 'bg-green-400/20 text-green-400 border border-green-400/30';
}

function utilizationColor(utilized: number, limit: number): string {
  if (limit <= 0) return 'text-neutral-400';
  const pct = utilized / limit;
  if (pct > 0.8) return 'text-red-400';
  if (pct > 0.5) return 'text-yellow-400';
  return 'text-neutral-300';
}

function trendArrow(trend: string | null | undefined): string {
  if (!trend) return '-';
  const t = trend.toUpperCase();
  if (t === 'WIDENING' || t === 'WORSENING') return '\u25BC';
  if (t === 'TIGHTENING' || t === 'IMPROVING') return '\u25B2';
  return '\u25C6';
}

function trendColor(trend: string | null | undefined): string {
  if (!trend) return 'text-neutral-600';
  const t = trend.toUpperCase();
  if (t === 'WIDENING' || t === 'WORSENING') return 'text-red-400';
  if (t === 'TIGHTENING' || t === 'IMPROVING') return 'text-green-400';
  return 'text-neutral-500';
}

function dollarStrengthColor(indicator: string | null | undefined): string {
  if (!indicator) return 'text-neutral-500';
  const i = indicator.toUpperCase();
  if (i === 'STRONG') return 'text-red-400';
  if (i === 'STRENGTHENING') return 'text-orange-400';
  if (i === 'WEAKENING') return 'text-green-400';
  if (i === 'WEAK') return 'text-green-300';
  return 'text-neutral-400';
}

// ── Main Panel ──

export function CrossCurrencyBasisPanel() {
  const { data, isLoading, error } = useCrossCurrencyBasis();
  const [tab, setTab] = useState<TabMode>('basis');
  const [selectedPair, setSelectedPair] = useState<string>('EUR/USD');
  const [showAllPairs, setShowAllPairs] = useState(true);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-violet-400 uppercase tracking-widest animate-pulse">
          Loading cross-currency basis data...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          Failed to load cross-currency basis data
        </div>
      </div>
    );
  }

  const tabs: { key: TabMode; label: string }[] = [
    { key: 'basis', label: 'BASIS SWAPS' },
    { key: 'historical', label: 'HISTORICAL' },
    { key: 'swapLines', label: 'CB SWAP LINES' },
    { key: 'forwards', label: 'FX FORWARDS' },
    { key: 'termStructure', label: 'TERM STRUCTURE' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Summary bar */}
      <SummaryBar data={data} />

      {/* Dollar Funding metrics */}
      <DollarFundingBar data={data} />

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
              tab === t.key
                ? 'text-violet-400 bg-violet-400/[0.06] border-b border-violet-400'
                : 'text-neutral-600 hover:text-neutral-400 border-b border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'basis' && (
          <BasisSwapsSection
            data={data}
            selectedPair={selectedPair}
            showAllPairs={showAllPairs}
            onSelectPair={setSelectedPair}
            onToggleAll={setShowAllPairs}
          />
        )}
        {tab === 'historical' && <HistoricalSection data={data} />}
        {tab === 'swapLines' && <SwapLinesSection data={data} />}
        {tab === 'forwards' && <ForwardsSection data={data} />}
        {tab === 'termStructure' && (
          <TermStructureSection data={data} selectedPair={selectedPair} onSelectPair={setSelectedPair} />
        )}
      </div>

      {/* Timestamp */}
      {data.timestamp && (
        <div className="px-3 py-1 border-t border-border/10 shrink-0">
          <span className="text-[7px] font-mono text-neutral-700">
            Last update: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ data }: { data: any }) {
  const summary = data.summary || {};
  return (
    <div className="grid grid-cols-5 gap-0 border-b border-border/20 px-3 py-1.5 shrink-0 bg-[#050505]">
      <div>
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">AVG EUR/USD</div>
        <div className={`text-[11px] font-mono font-black ${basisColor(summary.avgEurUsdBasis ?? 0)}`}>
          {fmtBps(summary.avgEurUsdBasis)}
          <span className="text-[7px] text-neutral-600 ml-0.5">bp</span>
        </div>
      </div>
      <div>
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">AVG JPY/USD</div>
        <div className={`text-[11px] font-mono font-black ${basisColor(summary.avgJpyUsdBasis ?? 0)}`}>
          {fmtBps(summary.avgJpyUsdBasis)}
          <span className="text-[7px] text-neutral-600 ml-0.5">bp</span>
        </div>
      </div>
      <div>
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">BASIS TREND</div>
        <div className={`text-[11px] font-mono font-black ${trendColor(summary.basisTrend)}`}>
          {trendArrow(summary.basisTrend)}{' '}
          <span className="text-[9px]">{summary.basisTrend || '-'}</span>
        </div>
      </div>
      <div>
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">USD STRENGTH</div>
        <div className={`text-[11px] font-mono font-black ${dollarStrengthColor(summary.dollarStrength)}`}>
          {summary.dollarStrength || '-'}
        </div>
      </div>
      <div>
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">FUNDING STRESS</div>
        <div className={`text-[11px] font-mono font-black ${stressLevelColor(summary.fundingStressLevel || '')}`}>
          {summary.fundingStressIndex != null ? summary.fundingStressIndex.toFixed(0) : '-'}
          <span className="text-[7px] text-neutral-600 ml-0.5">
            {summary.fundingStressLevel || ''}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Dollar Funding Bar ──

function DollarFundingBar({ data }: { data: any }) {
  const funding = data.dollarFunding || {};
  return (
    <div className="grid grid-cols-5 gap-0 border-b border-border/20 px-3 py-1.5 shrink-0">
      <MetricCell label="LIBOR-OIS" value={fmtBps(funding.liborOis)} color={basisColor(-(funding.liborOis ?? 0))} />
      <MetricCell label="XCCY 3M EUR" value={fmtBps(funding.xccyBasis3mEur)} color={basisColor(funding.xccyBasis3mEur ?? 0)} suffix="bp" />
      <MetricCell label="FED FUNDS VS REPO" value={fmtBps(funding.fedFundsVsRepo)} color={changeColor(funding.fedFundsVsRepo ?? 0)} suffix="bp" />
      <MetricCell label="CP SPREAD" value={fmtBps(funding.cpSpread)} color={basisColor(-(funding.cpSpread ?? 0))} suffix="bp" />
      <div>
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">STRESS LEVEL</div>
        <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 inline-block ${stressBadgeClass(funding.stressLevel || 'LOW')}`}>
          {funding.stressLevel || 'LOW'}
        </span>
      </div>
    </div>
  );
}

function MetricCell({ label, value, color, suffix }: { label: string; value: string; color: string; suffix?: string }) {
  return (
    <div>
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-[10px] font-mono font-bold ${color}`}>
        {value}
        {suffix && <span className="text-[7px] text-neutral-600 ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}

// ── Basis Swaps Section ──

function BasisSwapsSection({
  data,
  selectedPair,
  showAllPairs,
  onSelectPair,
  onToggleAll,
}: {
  data: any;
  selectedPair: string;
  showAllPairs: boolean;
  onSelectPair: (p: string) => void;
  onToggleAll: (v: boolean) => void;
}) {
  const basisSwaps = data.basisSwaps || [];

  const filteredSwaps = useMemo(() => {
    if (showAllPairs) return basisSwaps;
    return basisSwaps.filter((s: any) => s.pair === selectedPair);
  }, [basisSwaps, selectedPair, showAllPairs]);

  // Build a map: pair -> { tenor -> spread }
  const pairTenorMap = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const entry of filteredSwaps) {
      if (!map.has(entry.pair)) map.set(entry.pair, {});
      map.get(entry.pair)![entry.tenor] = entry.spread;
    }
    return map;
  }, [filteredSwaps]);

  const pairs = useMemo(() => Array.from(pairTenorMap.keys()), [pairTenorMap]);

  return (
    <div>
      {/* Pair selector */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/10">
        <button
          onClick={() => onToggleAll(true)}
          className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${
            showAllPairs ? 'text-violet-400 bg-violet-400/10' : 'text-neutral-600 hover:text-neutral-400'
          }`}
        >
          ALL
        </button>
        {(PAIRS as readonly string[]).map((p) => (
          <button
            key={p}
            onClick={() => { onSelectPair(p); onToggleAll(false); }}
            className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${
              !showAllPairs && selectedPair === p
                ? 'text-violet-400 bg-violet-400/10'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {p.split('/')[0]}
          </button>
        ))}
      </div>

      {/* Basis grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono border-collapse">
          <thead className="sticky top-0 bg-black/95">
            <tr className="border-b border-border/20">
              <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-left">PAIR</th>
              {TENORS.map((t) => (
                <th key={t} className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => {
              const tenors = pairTenorMap.get(pair) || {};
              return (
                <tr key={pair} className="border-b border-border/10 hover:bg-violet-400/[0.02]">
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1" style={{ backgroundColor: PAIR_COLORS[pair] || '#a78bfa' }} />
                      <span className="font-bold text-white">{pair}</span>
                    </div>
                  </td>
                  {TENORS.map((t) => {
                    const spread = tenors[t];
                    return (
                      <td key={t} className={`px-2 py-1 text-right ${spread != null ? basisCellBg(spread) : ''}`}>
                        <span className={spread != null ? basisColor(spread) : 'text-neutral-700'}>
                          {spread != null ? fmtBps(spread) : '-'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {pairs.length === 0 && (
              <tr>
                <td colSpan={TENORS.length + 1} className="px-2 py-4 text-center text-neutral-600 text-[8px] uppercase">
                  No basis swap data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Historical Levels Section ──

function HistoricalSection({ data }: { data: any }) {
  const historical = data.historicalLevels || [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono border-collapse">
        <thead className="sticky top-0 bg-black/95">
          <tr className="border-b border-border/20">
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-left">PAIR</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">CURRENT</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">3M AVG</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">6M AVG</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">1Y AVG</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-left min-w-[100px]">PERCENTILE</th>
          </tr>
        </thead>
        <tbody>
          {historical.map((h: any) => {
            const pct = Math.max(0, Math.min(100, h.percentile ?? 0));
            return (
              <tr key={h.pair} className="border-b border-border/10 hover:bg-violet-400/[0.02]">
                <td className="px-2 py-1">
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1" style={{ backgroundColor: PAIR_COLORS[h.pair] || '#a78bfa' }} />
                    <span className="font-bold text-white">{h.pair}</span>
                  </div>
                </td>
                <td className={`px-2 py-1 text-right font-bold ${basisColor(h.current ?? 0)}`}>
                  {fmtBps(h.current)}
                </td>
                <td className="px-2 py-1 text-right text-neutral-400">{fmtBps(h.avg3m)}</td>
                <td className="px-2 py-1 text-right text-neutral-400">{fmtBps(h.avg6m)}</td>
                <td className="px-2 py-1 text-right text-neutral-400">{fmtBps(h.avg1y)}</td>
                <td className="px-2 py-1">
                  <PercentileBar percentile={pct} />
                </td>
              </tr>
            );
          })}
          {historical.length === 0 && (
            <tr>
              <td colSpan={6} className="px-2 py-4 text-center text-neutral-600 text-[8px] uppercase">
                No historical data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PercentileBar({ percentile }: { percentile: number }) {
  const barColor = percentile > 75 ? 'bg-red-400' : percentile > 50 ? 'bg-orange-400' : percentile > 25 ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-neutral-800 relative">
        <div className={`absolute top-0 left-0 h-full ${barColor}`} style={{ width: `${percentile}%` }} />
      </div>
      <span className="text-[7px] text-neutral-500 w-6 text-right">{percentile.toFixed(0)}%</span>
    </div>
  );
}

// ── Central Bank Swap Lines Section ──

function SwapLinesSection({ data }: { data: any }) {
  const swapLines = data.centralBankSwapLines || [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono border-collapse">
        <thead className="sticky top-0 bg-black/95">
          <tr className="border-b border-border/20">
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-left">COUNTERPARTY</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">UTILIZED</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">LIMIT</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">UTILIZATION</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">RATE</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">LAST DRAW</th>
          </tr>
        </thead>
        <tbody>
          {swapLines.map((line: any) => {
            const utilPct = line.limit > 0 ? (line.utilized / line.limit) * 100 : 0;
            return (
              <tr key={line.counterparty} className="border-b border-border/10 hover:bg-violet-400/[0.02]">
                <td className="px-2 py-1 font-bold text-violet-400">{line.counterparty}</td>
                <td className={`px-2 py-1 text-right font-bold ${utilizationColor(line.utilized ?? 0, line.limit ?? 1)}`}>
                  {fmtBillions(line.utilized)}
                </td>
                <td className="px-2 py-1 text-right text-neutral-400">{fmtBillions(line.limit)}</td>
                <td className="px-2 py-1 text-right">
                  <UtilizationBadge pct={utilPct} />
                </td>
                <td className="px-2 py-1 text-right text-neutral-300">{fmtPct(line.rate)}</td>
                <td className="px-2 py-1 text-right text-neutral-500">{line.lastDraw || '-'}</td>
              </tr>
            );
          })}
          {swapLines.length === 0 && (
            <tr>
              <td colSpan={6} className="px-2 py-4 text-center text-neutral-600 text-[8px] uppercase">
                No swap line data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function UtilizationBadge({ pct }: { pct: number }) {
  const cls =
    pct > 80
      ? 'text-red-400 bg-red-400/10'
      : pct > 50
        ? 'text-yellow-400 bg-yellow-400/10'
        : 'text-neutral-400';
  return (
    <span className={`text-[8px] font-mono font-bold px-1 py-px ${cls}`}>
      {pct.toFixed(0)}%
    </span>
  );
}

// ── FX Forwards Section ──

function ForwardsSection({ data }: { data: any }) {
  const forwards = data.fxForwards || [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono border-collapse">
        <thead className="sticky top-0 bg-black/95">
          <tr className="border-b border-border/20">
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-left">PAIR</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">SPOT</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">3M FWD</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">1Y FWD</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">IMPLIED RATE</th>
            <th className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">CIP DEV</th>
          </tr>
        </thead>
        <tbody>
          {forwards.map((f: any) => (
            <tr key={f.pair} className="border-b border-border/10 hover:bg-violet-400/[0.02]">
              <td className="px-2 py-1">
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1" style={{ backgroundColor: PAIR_COLORS[f.pair] || '#a78bfa' }} />
                  <span className="font-bold text-white">{f.pair}</span>
                </div>
              </td>
              <td className="px-2 py-1 text-right text-neutral-300">{fmtSpot(f.spot)}</td>
              <td className="px-2 py-1 text-right text-neutral-300">{fmtSpot(f.forward3m)}</td>
              <td className="px-2 py-1 text-right text-neutral-300">{fmtSpot(f.forward1y)}</td>
              <td className="px-2 py-1 text-right text-neutral-400">{fmtPct(f.impliedRate)}</td>
              <td className={`px-2 py-1 text-right font-bold ${basisColor(f.cipDeviation ?? 0)}`}>
                {fmtBps(f.cipDeviation)}
                <span className="text-[7px] text-neutral-600 ml-0.5">bp</span>
              </td>
            </tr>
          ))}
          {forwards.length === 0 && (
            <tr>
              <td colSpan={6} className="px-2 py-4 text-center text-neutral-600 text-[8px] uppercase">
                No FX forward data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Term Structure Section ──

function TermStructureSection({
  data,
  selectedPair,
  onSelectPair,
}: {
  data: any;
  selectedPair: string;
  onSelectPair: (p: string) => void;
}) {
  const basisSwaps = data.basisSwaps || [];

  // Group entries by pair
  const pairData = useMemo(() => {
    const map = new Map<string, { tenor: string; spread: number }[]>();
    for (const entry of basisSwaps) {
      if (!map.has(entry.pair)) map.set(entry.pair, []);
      map.get(entry.pair)!.push({ tenor: entry.tenor, spread: entry.spread });
    }
    for (const [, vals] of map) {
      vals.sort((a, b) => TENORS.indexOf(a.tenor as Tenor) - TENORS.indexOf(b.tenor as Tenor));
    }
    return map;
  }, [basisSwaps]);

  const selectedData = pairData.get(selectedPair) || [];
  const allPairsWithData = useMemo(() => Array.from(pairData.keys()), [pairData]);

  // Compute chart scales
  const allSpreads = basisSwaps.map((e: any) => e.spread as number);
  const minSpread = allSpreads.length > 0 ? Math.min(...allSpreads, 0) : -60;
  const maxSpread = allSpreads.length > 0 ? Math.max(...allSpreads, 0) : 10;
  const spreadRange = maxSpread - minSpread || 1;

  const W = 480;
  const H = 220;
  const PAD_L = 40;
  const PAD_R = 10;
  const PAD_T = 12;
  const PAD_B = 22;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const scaleX = (idx: number) => PAD_L + (idx / (TENORS.length - 1)) * chartW;
  const scaleY = (spread: number) => PAD_T + ((maxSpread - spread) / spreadRange) * chartH;

  const zeroY = scaleY(0);

  return (
    <div className="px-3 py-2">
      {/* Pair selector */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {allPairsWithData.map((pair) => (
          <button
            key={pair}
            onClick={() => onSelectPair(pair)}
            className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${
              selectedPair === pair
                ? 'text-violet-400 bg-violet-400/10'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {pair}
          </button>
        ))}
      </div>

      {/* SVG chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
        {/* Grid lines */}
        {Array.from({ length: 5 }, (_, i) => {
          const spread = minSpread + (spreadRange / 4) * i;
          const y = scaleY(spread);
          return (
            <g key={i}>
              <line
                x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3"
              />
              <text
                x={PAD_L - 4} y={y + 3} textAnchor="end"
                fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace"
              >
                {spread.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Zero line */}
        {zeroY >= PAD_T && zeroY <= PAD_T + chartH && (
          <line
            x1={PAD_L} y1={zeroY} x2={W - PAD_R} y2={zeroY}
            stroke="rgba(255,255,255,0.12)" strokeWidth={1}
          />
        )}

        {/* Tenor labels */}
        {TENORS.map((tenor, i) => (
          <text
            key={tenor}
            x={scaleX(i)} y={H - 4} textAnchor="middle"
            fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="monospace"
          >
            {tenor}
          </text>
        ))}

        {/* Faded lines for all other pairs */}
        {allPairsWithData
          .filter((p) => p !== selectedPair)
          .map((pair) => {
            const vals = pairData.get(pair);
            if (!vals || vals.length < 2) return null;
            const pathD = vals
              .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(TENORS.indexOf(v.tenor as Tenor)).toFixed(1)},${scaleY(v.spread).toFixed(1)}`)
              .join(' ');
            return (
              <path
                key={pair}
                d={pathD}
                fill="none"
                stroke={PAIR_COLORS[pair] || '#a78bfa'}
                strokeWidth={0.8}
                opacity={0.15}
              />
            );
          })}

        {/* Selected pair line */}
        {selectedData.length >= 2 && (() => {
          const pathD = selectedData
            .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(TENORS.indexOf(v.tenor as Tenor)).toFixed(1)},${scaleY(v.spread).toFixed(1)}`)
            .join(' ');
          const color = PAIR_COLORS[selectedPair] || '#a78bfa';
          return (
            <g>
              <path d={pathD} fill="none" stroke={color} strokeWidth={2} opacity={0.9} />
              {selectedData.map((v, i) => (
                <circle
                  key={i}
                  cx={scaleX(TENORS.indexOf(v.tenor as Tenor))}
                  cy={scaleY(v.spread)}
                  r={2.5}
                  fill={color}
                />
              ))}
              {/* Labels on data points */}
              {selectedData.map((v, i) => (
                <text
                  key={`label-${i}`}
                  x={scaleX(TENORS.indexOf(v.tenor as Tenor))}
                  y={scaleY(v.spread) - 6}
                  textAnchor="middle"
                  fill={color}
                  fontSize={6}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {v.spread.toFixed(1)}
                </text>
              ))}
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
        {allPairsWithData.map((pair) => {
          const color = PAIR_COLORS[pair] || '#a78bfa';
          const isSelected = pair === selectedPair;
          return (
            <button
              key={pair}
              onClick={() => onSelectPair(pair)}
              className={`flex items-center gap-1 text-[7px] font-mono transition-colors ${
                isSelected ? 'text-neutral-300 font-bold' : 'text-neutral-600'
              }`}
            >
              <div className="w-2 h-0.5" style={{ backgroundColor: color, opacity: isSelected ? 1 : 0.4 }} />
              {pair}
            </button>
          );
        })}
      </div>
    </div>
  );
}
