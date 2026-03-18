import { useState, useMemo } from 'react';
import { useFxVolatility } from '../../api/hooks/use-fx-volatility';

const ACCENT = '#c084fc'; // purple-400
const ACCENT_DIM = 'rgba(192,132,252,0.08)';

type Tab = 'pairs' | 'termStructure' | 'riskReversals' | 'regime';

// ── Helpers ──

function fmtNum(v: unknown, decimals = 2): string {
  if (v == null || typeof v !== 'number' || isNaN(v)) return '-';
  return v.toFixed(decimals);
}

function changeColor(v: number): string {
  if (v > 0) return 'text-emerald-400';
  if (v < 0) return 'text-red-400';
  return 'text-neutral/50';
}

function pctBarColor(pct: number): string {
  if (pct >= 75) return 'bg-red-500';
  if (pct >= 50) return 'bg-yellow-500';
  if (pct >= 25) return 'bg-emerald-500';
  return 'bg-blue-500';
}

function regimeBadge(regime: string): { bg: string; text: string } {
  const r = (regime || '').toLowerCase();
  if (r.includes('crisis') || r.includes('extreme'))
    return { bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400' };
  if (r.includes('high') || r.includes('elevated'))
    return { bg: 'bg-orange-500/15 border-orange-500/30', text: 'text-orange-400' };
  if (r.includes('normal') || r.includes('moderate'))
    return { bg: 'bg-yellow-500/15 border-yellow-500/30', text: 'text-yellow-400' };
  if (r.includes('low') || r.includes('calm'))
    return { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400' };
  return { bg: 'bg-white/5 border-white/10', text: 'text-white/60' };
}

function skewDirBadge(dir: string): { label: string; cls: string } {
  const d = (dir || '').toLowerCase();
  if (d.includes('put') || d.includes('bearish'))
    return { label: 'PUTS', cls: 'bg-red-500/15 text-red-400 border border-red-500/20' };
  if (d.includes('call') || d.includes('bullish'))
    return { label: 'CALLS', cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' };
  return { label: 'NEUTRAL', cls: 'bg-white/5 text-neutral/40 border border-white/10' };
}

// ── Main Panel ──

export function FxVolatilityPanel() {
  const { data, isLoading, error } = useFxVolatility();
  const [tab, setTab] = useState<Tab>('pairs');
  const [selectedPair, setSelectedPair] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;

  const activePair = useMemo(() => {
    if (!d?.pairs?.length) return d?.pairs?.[0] ?? null;
    return d.pairs.find((p: any) => p.pair === selectedPair) || d.pairs[0];
  }, [d, selectedPair]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">
          Loading FX volatility data...
        </div>
      </div>
    );
  }

  if (error || !d) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">
          Failed to load data
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pairs', label: 'PAIRS' },
    { key: 'termStructure', label: 'TERM STRUCT' },
    { key: 'riskReversals', label: 'RISK REV' },
    { key: 'regime', label: 'REGIME' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: tab === t.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      <SummaryBar data={d} />

      {/* Tab content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'pairs' && <PairsTab data={d} selectedPair={selectedPair} onSelect={setSelectedPair} />}
        {tab === 'termStructure' && <TermStructureTab data={d} activePair={activePair} onSelect={setSelectedPair} />}
        {tab === 'riskReversals' && <RiskReversalsTab data={d} />}
        {tab === 'regime' && <RegimeTab data={d} />}
      </div>
    </div>
  );
}

// ── Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SummaryBar({ data }: { data: any }) {
  const s = data?.summary;
  if (!s) return null;

  const cells = [
    { label: 'AVG IV', value: fmtNum(s.avgIV, 1) + '%' },
    { label: 'AVG RV', value: fmtNum(s.avgRV, 1) + '%' },
    { label: 'VOL SPREAD', value: fmtNum(s.volSpread, 1), color: changeColor(s.volSpread ?? 0) },
    { label: 'MOST VOL', value: s.mostVolatile || '-', accent: true },
    { label: 'LEAST VOL', value: s.leastVolatile || '-', accent: false },
  ];

  return (
    <div className="grid grid-cols-5 border-b border-border/20 shrink-0">
      {cells.map((c) => (
        <div key={c.label} className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">{c.label}</div>
          <div
            className={`text-[9px] font-mono font-bold ${c.accent ? '' : c.color || 'text-white/80'}`}
            style={c.accent ? { color: ACCENT } : undefined}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pairs Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PairsTab({ data, selectedPair, onSelect }: { data: any; selectedPair: string | null; onSelect: (p: string) => void }) {
  const pairs = data?.pairs;
  if (!pairs?.length) {
    return <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">No pairs data</div>;
  }

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left">Pair</th>
          <th className="px-2 py-1.5 text-right">Spot</th>
          <th className="px-2 py-1.5 text-right">IV 1M</th>
          <th className="px-2 py-1.5 text-right">RV 1M</th>
          <th className="px-2 py-1.5 text-right">Vol Spd</th>
          <th className="px-2 py-1.5 text-right">RR 25d</th>
          <th className="px-2 py-1.5 text-right">BF</th>
          <th className="px-2 py-1.5 text-right">1D Chg</th>
          <th className="px-2 py-1.5 text-right w-24">Pctl</th>
        </tr>
      </thead>
      <tbody>
        {pairs.map((p: any) => {
          const spread = (p.iv1m ?? 0) - (p.rv1m ?? 0);
          const pctl = p.percentile ?? 0;
          return (
            <tr
              key={p.pair}
              className={`border-b border-border/5 cursor-pointer transition-colors ${
                selectedPair === p.pair ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
              }`}
              onClick={() => onSelect(p.pair)}
            >
              <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>
                {p.pair}
              </td>
              <td className="px-2 py-1.5 text-right text-white/60">{fmtNum(p.spot, 4)}</td>
              <td className="px-2 py-1.5 text-right text-white/70 font-bold">{fmtNum(p.iv1m, 1)}%</td>
              <td className="px-2 py-1.5 text-right text-white/60">{fmtNum(p.rv1m, 1)}%</td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(spread)}`}>
                {fmtNum(spread, 1)}
              </td>
              <td className={`px-2 py-1.5 text-right ${changeColor(p.rr25d ?? 0)}`}>
                {fmtNum(p.rr25d, 2)}
              </td>
              <td className="px-2 py-1.5 text-right text-white/50">{fmtNum(p.butterfly, 2)}</td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(p.change1d ?? 0)}`}>
                {(p.change1d ?? 0) >= 0 ? '+' : ''}{fmtNum(p.change1d, 2)}
              </td>
              <td className="px-2 py-1.5 text-right">
                <div className="flex items-center gap-1 justify-end">
                  <div className="w-12 h-2 bg-white/[0.03] overflow-hidden">
                    <div
                      className={`h-full ${pctBarColor(pctl)}`}
                      style={{ width: `${Math.min(Math.max(pctl, 2), 100)}%`, opacity: 0.7 }}
                    />
                  </div>
                  <span className="text-[8px] text-neutral/50 w-7 text-right">{pctl}%</span>
                </div>
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
function TermStructureTab({ data, activePair, onSelect }: { data: any; activePair: any; onSelect: (p: string) => void }) {
  const pairs = data?.pairs;
  if (!pairs?.length) {
    return <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">No data</div>;
  }

  const termStructure = activePair?.termStructure;

  return (
    <div className="p-3">
      {/* Pair selector */}
      <div className="flex flex-wrap gap-1 mb-3">
        {pairs.map((p: any) => (
          <button
            key={p.pair}
            onClick={() => onSelect(p.pair)}
            className="px-2 py-1 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors border"
            style={{
              color: activePair?.pair === p.pair ? ACCENT : 'rgba(255,255,255,0.35)',
              borderColor: activePair?.pair === p.pair ? ACCENT : 'rgba(255,255,255,0.08)',
              background: activePair?.pair === p.pair ? ACCENT_DIM : 'transparent',
            }}
          >
            {p.pair}
          </button>
        ))}
      </div>

      {/* Term structure table */}
      {termStructure?.length ? (
        <table className="w-full text-[9px] font-mono">
          <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
            <tr>
              <th className="px-2 py-1.5 text-left">Tenor</th>
              <th className="px-2 py-1.5 text-right">Implied Vol (%)</th>
              <th className="px-2 py-1.5 text-right">1D Chg</th>
            </tr>
          </thead>
          <tbody>
            {termStructure.map((t: any) => (
              <tr key={t.tenor} className="border-b border-border/5 hover:bg-white/[0.02] transition-colors">
                <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>
                  {t.tenor}
                </td>
                <td className="px-2 py-1.5 text-right text-white/70 font-bold">
                  {fmtNum(t.impliedVol, 2)}%
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(t.change1d ?? 0)}`}>
                  {(t.change1d ?? 0) >= 0 ? '+' : ''}{fmtNum(t.change1d, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-center py-6 text-neutral/30 text-[8px] font-mono uppercase">
          No term structure data for {activePair?.pair || 'selected pair'}
        </div>
      )}
    </div>
  );
}

// ── Risk Reversals Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RiskReversalsTab({ data }: { data: any }) {
  const pairs = data?.pairs;
  if (!pairs?.length) {
    return <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">No data</div>;
  }

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left">Pair</th>
          <th className="px-2 py-1.5 text-right">RR 25d 1M</th>
          <th className="px-2 py-1.5 text-right">RR 25d 3M</th>
          <th className="px-2 py-1.5 text-right">RR 10d 1M</th>
          <th className="px-2 py-1.5 text-right">Skew Dir</th>
        </tr>
      </thead>
      <tbody>
        {pairs.map((p: any) => {
          const badge = skewDirBadge(p.skewDirection);
          return (
            <tr key={p.pair} className="border-b border-border/5 hover:bg-white/[0.02] transition-colors">
              <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>
                {p.pair}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(p.rr25d1m ?? 0)}`}>
                {fmtNum(p.rr25d1m, 2)}%
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(p.rr25d3m ?? 0)}`}>
                {fmtNum(p.rr25d3m, 2)}%
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(p.rr10d1m ?? 0)}`}>
                {fmtNum(p.rr10d1m, 2)}%
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

// ── Regime Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RegimeTab({ data }: { data: any }) {
  const regime = data?.regime;
  if (!regime) {
    return <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">No regime data</div>;
  }

  const badge = regimeBadge(regime.current);
  const pctl = regime.percentile ?? 0;

  const metrics = [
    { label: 'VIX', value: fmtNum(regime.vix, 2) },
    { label: 'CVIX', value: fmtNum(regime.cvix, 2) },
    { label: 'JPM FX VOL', value: fmtNum(regime.jpmFxVol, 2) },
  ];

  return (
    <div className="p-3 space-y-3">
      {/* Current regime card */}
      <div className="border border-border/10 p-3">
        <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-2">Current Regime</div>
        <span className={`inline-block px-2 py-1 text-[10px] font-mono font-black uppercase tracking-wider border ${badge.bg} ${badge.text}`}>
          {regime.current || 'Unknown'}
        </span>
      </div>

      {/* Index cards */}
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="border border-border/10 p-2">
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-[12px] font-mono font-bold text-white">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Percentile */}
      <div className="border border-border/10 p-3">
        <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-2">Volatility Percentile</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-3 bg-white/[0.03] overflow-hidden">
            <div
              className={`h-full transition-all ${pctBarColor(pctl)}`}
              style={{ width: `${Math.min(Math.max(pctl, 2), 100)}%`, opacity: 0.7 }}
            />
          </div>
          <span className="text-[11px] font-mono font-black text-white">{pctl}%</span>
        </div>
      </div>
    </div>
  );
}
