import { useState, useMemo } from 'react';
import { useFxVolatilitySurface } from '../../api/hooks/use-fx-volatility-surface';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

const ACCENT = '#2dd4bf'; // teal-400
const ACCENT_DIM = 'rgba(45,212,191,0.02)';

const DELTAS = ['10DP', '25DP', 'ATM', '25DC', '10DC'];
const TENORS = ['1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y'];
const G10_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD'];

type Tab = 'surface' | 'riskReversal' | 'butterfly' | 'termStructure' | 'movers';

// ── Formatting helpers ──

function fmtNum(v: unknown, decimals = 2): string {
  if (v == null || typeof v !== 'number' || isNaN(v)) return '-';
  return v.toFixed(decimals);
}

function fmtChange(v: unknown, decimals = 2): string {
  if (v == null || typeof v !== 'number' || isNaN(v)) return '-';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(decimals)}`;
}

function changeColor(v: number): string {
  if (v > 0) return 'text-emerald-400';
  if (v < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Vol heat-map color (blue=low -> yellow -> red/orange=high) ──

function volHeatColor(vol: number, minVol: number, maxVol: number): string {
  if (maxVol <= minVol) return 'rgba(45,212,191,0.15)';
  const p = Math.min(1, Math.max(0, (vol - minVol) / (maxVol - minVol)));
  if (p < 0.25) {
    const t = p / 0.25;
    const r = Math.round(59 + (45 - 59) * t);
    const g = Math.round(130 + (212 - 130) * t);
    const b = Math.round(246 + (191 - 246) * t);
    return `rgba(${r},${g},${b},0.35)`;
  }
  if (p < 0.5) {
    const t = (p - 0.25) / 0.25;
    const r = Math.round(45 + (250 - 45) * t);
    const g = Math.round(212 + (204 - 212) * t);
    const b = Math.round(191 + (21 - 191) * t);
    return `rgba(${r},${g},${b},0.35)`;
  }
  if (p < 0.75) {
    const t = (p - 0.5) / 0.25;
    const r = Math.round(250 + (249 - 250) * t);
    const g = Math.round(204 + (115 - 204) * t);
    const b = Math.round(21 + (22 - 21) * t);
    return `rgba(${r},${g},${b},0.4)`;
  }
  const t = (p - 0.75) / 0.25;
  const r = Math.round(249 + (239 - 249) * t);
  const g = Math.round(115 + (68 - 115) * t);
  const b = Math.round(22 + (68 - 22) * t);
  return `rgba(${r},${g},${b},0.45)`;
}

function regimeBadge(regime: string): { bg: string; text: string; label: string } {
  const r = (regime || '').toUpperCase();
  if (r.includes('CRISIS'))
    return { bg: 'bg-red-500/15 border border-red-500/30', text: 'text-red-400', label: 'CRISIS' };
  if (r.includes('ELEVATED'))
    return { bg: 'bg-orange-500/15 border border-orange-500/30', text: 'text-orange-400', label: 'ELEVATED' };
  if (r.includes('NORMAL'))
    return { bg: 'bg-yellow-500/15 border border-yellow-500/30', text: 'text-yellow-400', label: 'NORMAL' };
  if (r.includes('LOW'))
    return { bg: 'bg-emerald-500/15 border border-emerald-500/30', text: 'text-emerald-400', label: 'LOW' };
  return { bg: 'bg-white/5 border border-white/10', text: 'text-white/60', label: r || 'N/A' };
}

function skewDirBadge(dir: string): { label: string; cls: string } {
  const d = (dir || '').toLowerCase();
  if (d.includes('put') || d.includes('bearish'))
    return { label: 'PUT SKEW', cls: 'bg-red-500/15 text-red-400 border border-red-500/20' };
  if (d.includes('call') || d.includes('bullish'))
    return { label: 'CALL SKEW', cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' };
  return { label: 'NEUTRAL', cls: 'bg-white/5 text-neutral-400 border border-white/10' };
}

function pctBarColor(pct: number): string {
  if (pct >= 75) return 'bg-red-500';
  if (pct >= 50) return 'bg-yellow-500';
  if (pct >= 25) return 'bg-emerald-500';
  return 'bg-blue-500';
}

// ── Main Panel ──

export function FxVolatilitySurfacePanel() {
  const t = useT();
  const { data: rawData, isLoading, error, refetch } = useFxVolatilitySurface();
  const [tab, setTab] = useState<Tab>('surface');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = rawData as any;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-teal-400/60 uppercase tracking-widest animate-pulse">
          {tr(t, 'fxvsLoading', 'LOADING VOL DATA...')}
        </div>
      </div>
    );
  }

  if (error || !d) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          FAILED TO LOAD
        </div>
        <button
          onClick={() => refetch()}
          className="px-2 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-teal-400 border border-teal-400/30 hover:bg-teal-400/10 transition-colors"
        >
          RETRY
        </button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'surface', label: 'SURFACE' },
    { key: 'riskReversal', label: 'RISK REVERSAL' },
    { key: 'butterfly', label: 'BUTTERFLY' },
    { key: 'termStructure', label: 'TERM STRUCTURE' },
    { key: 'movers', label: 'MOVERS' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-teal-400">
            {tr(t, 'fxvsTitle', 'FX Volatility Surface')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-teal-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary bar */}
      <SummaryBar data={d} />

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 bg-[#050505] shrink-0">
        {tabs.map((tb: any) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-2.5 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
              tab === tb.key
                ? 'border-teal-400/40 text-teal-400 bg-teal-400/10'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'surface' && <SurfaceTab data={d} />}
        {tab === 'riskReversal' && <RiskReversalTab data={d} />}
        {tab === 'butterfly' && <ButterflyTab data={d} />}
        {tab === 'termStructure' && <TermStructureTab data={d} />}
        {tab === 'movers' && <MoversTab data={d} />}
      </div>
    </div>
  );
}

// ── Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SummaryBar({ data }: { data: any }) {
  const s = data?.summary;
  if (!s) return null;

  const badge = regimeBadge(s.regime || '');

  const cells = [
    { label: 'FX VOL INDEX', value: fmtNum(s.fxVolIndex, 2), accent: true },
    { label: 'REGIME', badge: true },
    { label: 'MOST VOLATILE', value: s.mostVolatile || '-', accent: true },
    { label: 'LEAST VOLATILE', value: s.leastVolatile || '-' },
  ];

  return (
    <div className="grid grid-cols-4 border-b border-border/20 shrink-0">
      {cells.map((c: any) => (
        <div key={c.label} className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
          <div className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider">{c.label}</div>
          {c.badge ? (
            <span className={`inline-block px-1.5 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          ) : (
            <div
              className="text-[9px] font-mono font-bold text-white/80"
              style={c.accent ? { color: ACCENT } : undefined}
            >
              {c.value}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Surface Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SurfaceTab({ data }: { data: any }) {
  const surface = data?.surface;
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const pairs = data?.surfacePairs || G10_PAIRS;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grid = useMemo(() => {
    if (!surface) return null;
    const pairSurface = surface[selectedPair] || surface[Object.keys(surface)[0]];
    if (!pairSurface) return null;
    return pairSurface;
  }, [surface, selectedPair]);

  // Compute min/max vol for heat coloring
  const { minVol, maxVol } = useMemo(() => {
    if (!grid) return { minVol: 5, maxVol: 25 };
    let mn = Infinity;
    let mx = -Infinity;
    TENORS.forEach((tenor: any) => {
      const row = grid[tenor];
      if (!row) return;
      DELTAS.forEach((delta: any) => {
        const v = row[delta];
        if (typeof v === 'number' && !isNaN(v)) {
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
      });
    });
    return { minVol: mn === Infinity ? 5 : mn, maxVol: mx === -Infinity ? 25 : mx };
  }, [grid]);

  return (
    <div className="p-2">
      {/* Pair selector */}
      <div className="flex flex-wrap gap-1 mb-2">
        {pairs.map((pair: any) => (
          <button
            key={pair}
            onClick={() => setSelectedPair(pair)}
            className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
              selectedPair === pair
                ? 'border-teal-400/40 text-teal-400 bg-teal-400/10'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {pair}
          </button>
        ))}
      </div>

      {/* Vol surface grid */}
      {grid ? (
        <table className="w-full text-[9px] font-mono">
          <thead className="text-neutral-500 uppercase tracking-wider border-b border-border/10">
            <tr>
              <th className="px-2 py-1.5 text-left text-[7px] font-black">TENOR</th>
              {DELTAS.map((delta: any) => (
                <th key={delta} className="px-2 py-1.5 text-right text-[7px] font-black">{delta}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TENORS.map((tenor: any) => {
              const row = grid[tenor];
              return (
                <tr key={tenor} className="border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors">
                  <td className="px-2 py-1.5 font-bold text-teal-400">{tenor}</td>
                  {DELTAS.map((delta: any) => {
                    const val = row?.[delta];
                    const bg = typeof val === 'number' ? volHeatColor(val, minVol, maxVol) : 'transparent';
                    return (
                      <td
                        key={delta}
                        className="px-2 py-1.5 text-right font-bold text-white/90"
                        style={{ backgroundColor: bg }}
                      >
                        {fmtNum(val, 2)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No surface data for {selectedPair}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 px-2">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Low Vol</span>
        <div className="flex h-2 flex-1 max-w-[120px]">
          <div className="flex-1" style={{ background: 'rgba(59,130,246,0.35)' }} />
          <div className="flex-1" style={{ background: 'rgba(45,212,191,0.35)' }} />
          <div className="flex-1" style={{ background: 'rgba(250,204,21,0.35)' }} />
          <div className="flex-1" style={{ background: 'rgba(249,115,22,0.4)' }} />
          <div className="flex-1" style={{ background: 'rgba(239,68,68,0.45)' }} />
        </div>
        <span className="text-[7px] font-mono text-neutral-600 uppercase">High Vol</span>
      </div>
    </div>
  );
}

// ── Risk Reversal Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RiskReversalTab({ data }: { data: any }) {
  const rr = data?.riskReversals;
  if (!rr?.length) {
    return <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">No risk reversal data</div>;
  }

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left text-[7px] font-black">PAIR</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">25D RR 1M</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">25D RR 3M</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">10D RR 1M</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">10D RR 3M</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">1D CHG</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">SKEW</th>
        </tr>
      </thead>
      <tbody>
        {rr.map((row: any) => {
          const badge = skewDirBadge(row.skewDirection);
          return (
            <tr key={row.pair} className="border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors">
              <td className="px-2 py-1.5 font-bold text-teal-400">{row.pair}</td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.rr25d1m ?? 0)}`}>
                {fmtNum(row.rr25d1m, 2)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.rr25d3m ?? 0)}`}>
                {fmtNum(row.rr25d3m, 2)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.rr10d1m ?? 0)}`}>
                {fmtNum(row.rr10d1m, 2)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.rr10d3m ?? 0)}`}>
                {fmtNum(row.rr10d3m, 2)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.dailyChange ?? 0)}`}>
                {fmtChange(row.dailyChange, 2)}
              </td>
              <td className="px-2 py-1.5 text-right">
                <span className={`inline-block px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider ${badge.cls}`}>
                  {badge.label}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Butterfly Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ButterflyTab({ data }: { data: any }) {
  const bf = data?.butterflies;
  if (!bf?.length) {
    return <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">No butterfly data</div>;
  }

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left text-[7px] font-black">PAIR</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">25D BF 1M</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">25D BF 3M</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">10D BF 1M</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">10D BF 3M</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">1D CHG</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">WING PREM</th>
        </tr>
      </thead>
      <tbody>
        {bf.map((row: any) => {
          const wingPrem = row.wingPremium ?? 0;
          const wingLabel = wingPrem > 0.5 ? 'HIGH' : wingPrem > 0.2 ? 'MODERATE' : 'LOW';
          const wingCls =
            wingPrem > 0.5
              ? 'bg-red-500/15 text-red-400 border border-red-500/20'
              : wingPrem > 0.2
                ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
          return (
            <tr key={row.pair} className="border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors">
              <td className="px-2 py-1.5 font-bold text-teal-400">{row.pair}</td>
              <td className="px-2 py-1.5 text-right font-bold text-white/70">
                {fmtNum(row.bf25d1m, 2)}
              </td>
              <td className="px-2 py-1.5 text-right font-bold text-white/70">
                {fmtNum(row.bf25d3m, 2)}
              </td>
              <td className="px-2 py-1.5 text-right font-bold text-white/70">
                {fmtNum(row.bf10d1m, 2)}
              </td>
              <td className="px-2 py-1.5 text-right font-bold text-white/70">
                {fmtNum(row.bf10d3m, 2)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.dailyChange ?? 0)}`}>
                {fmtChange(row.dailyChange, 2)}
              </td>
              <td className="px-2 py-1.5 text-right">
                <span className={`inline-block px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider ${wingCls}`}>
                  {wingLabel}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Term Structure Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TermStructureTab({ data }: { data: any }) {
  const ts = data?.termStructure;
  if (!ts?.length) {
    return <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">No term structure data</div>;
  }

  return (
    <div className="p-2 space-y-1">
      {/* Header row */}
      <div className="flex items-center px-2 py-1 border-b border-border/10">
        <div className="w-16 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider">PAIR</div>
        <div className="flex-1 grid grid-cols-8 gap-0">
          {TENORS.map((tenor: any) => (
            <div key={tenor} className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider text-center">
              {tenor}
            </div>
          ))}
        </div>
      </div>

      {/* Pair rows */}
      {ts.map((row: any) => {
        // Find max vol in this row for bar scaling
        const vols = TENORS.map((tn: any) => row.vols?.[tn] ?? 0);
        const maxV = Math.max(...vols, 1);

        return (
          <div key={row.pair} className="flex items-center px-2 py-1.5 border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors">
            <div className="w-16 text-[9px] font-mono font-bold text-teal-400">{row.pair}</div>
            <div className="flex-1 grid grid-cols-8 gap-0.5">
              {TENORS.map((tenor: any) => {
                const vol = row.vols?.[tenor];
                const pct = typeof vol === 'number' ? (vol / maxV) * 100 : 0;
                return (
                  <div key={tenor} className="flex flex-col items-center gap-0.5">
                    <span className="text-[8px] font-mono text-white/70 font-bold">{fmtNum(vol, 1)}</span>
                    <div className="w-full h-1.5 bg-white/[0.03] overflow-hidden">
                      <div
                        className="h-full bg-teal-400/40"
                        style={{ width: `${Math.min(Math.max(pct, 2), 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Movers Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MoversTab({ data }: { data: any }) {
  const movers = data?.movers;
  if (!movers?.length) {
    return <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">No movers data</div>;
  }

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left text-[7px] font-black">PAIR</th>
          <th className="px-2 py-1.5 text-left text-[7px] font-black">TENOR</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">VOL</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">1D CHG</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">1W CHG</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black w-28">52W PCTL</th>
        </tr>
      </thead>
      <tbody>
        {movers.map((row: any, idx: any) => {
          const pctl = row.percentile52w ?? 0;
          return (
            <tr key={`${row.pair}-${row.tenor}-${idx}`} className="border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors">
              <td className="px-2 py-1.5 font-bold text-teal-400">{row.pair}</td>
              <td className="px-2 py-1.5 text-white/60">{row.tenor}</td>
              <td className="px-2 py-1.5 text-right font-bold text-white/80">{fmtNum(row.vol, 2)}</td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.change1d ?? 0)}`}>
                {fmtChange(row.change1d, 2)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.change1w ?? 0)}`}>
                {fmtChange(row.change1w, 2)}
              </td>
              <td className="px-2 py-1.5 text-right">
                <div className="flex items-center gap-1 justify-end">
                  <div className="w-14 h-2 bg-white/[0.03] overflow-hidden">
                    <div
                      className={`h-full ${pctBarColor(pctl)}`}
                      style={{ width: `${Math.min(Math.max(pctl, 2), 100)}%`, opacity: 0.7 }}
                    />
                  </div>
                  <span className="text-[8px] text-neutral-500 w-7 text-right">{pctl}%</span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
