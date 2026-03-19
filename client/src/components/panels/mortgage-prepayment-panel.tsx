import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useMortgagePrepayment } from '../../api/hooks/use-mortgage-prepayment';
import { useT } from '../../i18n';

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => { try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; } };

type View = 'POOLS' | 'SPEEDS' | 'VINTAGE' | 'SEASONAL' | 'DECOMP';

// ── Type definitions ──

interface Pool {
  id: string;
  agency: string;
  coupon: number;
  cpr: number;
  cdr: number;
  smm: number;
  wac: number;
  wam: number;
  wala: number;
  factor: number;
  originalBalance: number;
  currentBalance: number;
  psa: number;
  sato: number;
}

interface SpeedTrend {
  date: string;
  cpr: number;
  smm: number;
  psa: number;
}

interface PsaBenchmark {
  month: number;
  psa100: number;
  psa150: number;
  psa200: number;
  actual: number;
}

interface VintageData {
  year: number;
  cpr: number;
  cdr: number;
  burnoutFactor: number;
  refinanceIncentive: number;
  poolCount: number;
  avgWala: number;
}

interface SeasonalFactor {
  month: string;
  factor: number;
  historicalAvg: number;
  currentYear: number;
}

interface DecompData {
  turnoverRate: number;
  refinanceRate: number;
  curtailmentRate: number;
  relocationRate: number;
  defaultRate: number;
  totalCPR: number;
}

interface SatoAnalysis {
  bucket: string;
  sato: number;
  cpr: number;
  refiShare: number;
  turnoverShare: number;
}

// ── Formatting helpers ──

function fmtBal(v: number): string {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(0) + 'M';
  return '$' + (v / 1e3).toFixed(0) + 'K';
}

function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v == null || isNaN(v)) return '-';
  return v.toFixed(decimals) + '%';
}

// ── Color helpers ──

function cprColor(cpr: number): string {
  if (cpr >= 30) return 'text-red-400';
  if (cpr >= 20) return 'text-amber-400';
  if (cpr >= 10) return 'text-yellow-400';
  return 'text-green-400';
}

function burnoutColor(factor: number): string {
  if (factor >= 0.8) return 'text-green-400';
  if (factor >= 0.5) return 'text-yellow-400';
  if (factor >= 0.3) return 'text-amber-400';
  return 'text-red-400';
}

function seasonalColor(factor: number): string {
  if (factor >= 1.15) return 'text-red-400';
  if (factor >= 1.05) return 'text-amber-400';
  if (factor <= 0.85) return 'text-green-400';
  if (factor <= 0.95) return 'text-cyan-400';
  return 'text-neutral-300';
}

function satoColor(sato: number): string {
  if (sato >= 100) return 'text-red-400';
  if (sato >= 50) return 'text-amber-400';
  if (sato >= 0) return 'text-yellow-400';
  return 'text-green-400';
}

// ── Main panel ──

export function MortgagePrepaymentPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMortgagePrepayment();
  const [view, setView] = useState<View>('POOLS');
  const [agencyFilter, setAgencyFilter] = useState('ALL');

  const pools = useMemo(() => (data?.pools ?? []) as Pool[], [data]);
  const agencies = useMemo(() => ['ALL', ...new Set(pools.map(p => p.agency))], [pools]);
  const filtered = useMemo(() => {
    if (agencyFilter === 'ALL') return pools;
    return pools.filter(p => p.agency === agencyFilter);
  }, [pools, agencyFilter]);

  const VIEWS: View[] = ['POOLS', 'SPEEDS', 'VINTAGE', 'SEASONAL', 'DECOMP'];
  const VIEW_LABELS: Record<View, string> = {
    POOLS: 'POOLS',
    SPEEDS: 'SPEEDS',
    VINTAGE: 'VINTAGE',
    SEASONAL: 'SEASONAL',
    DECOMP: 'DECOMPOSITION',
  };

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr(t, 'panelMortgagePrepayment', 'Mortgage Prepayment')}
          </span>
          {data && (
            <span className="text-[7px] font-mono text-neutral-500">MTGE | {filtered.length} pools</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${view === v ? 'text-cyan-400 bg-cyan-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{VIEW_LABELS[v]}</button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-cyan-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Agency filter for Pools view */}
      {view === 'POOLS' && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
          {agencies.map(a => (
            <button key={a} onClick={() => setAgencyFilter(a)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase whitespace-nowrap transition-colors ${agencyFilter === a ? 'text-cyan-400 bg-cyan-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{a}</button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!isLoading && !data && (
          <div className="text-center py-8 text-neutral-600 text-[9px] font-mono uppercase">
            No prepayment data available
          </div>
        )}

        {view === 'POOLS' && data && <PoolsView pools={filtered} summary={data.summary} />}
        {view === 'SPEEDS' && data && <SpeedsView speedTrends={data.speedTrends ?? []} psaBenchmarks={data.psaBenchmarks ?? []} />}
        {view === 'VINTAGE' && data && <VintageView vintages={data.vintages ?? []} />}
        {view === 'SEASONAL' && data && <SeasonalView factors={data.seasonalFactors ?? []} />}
        {view === 'DECOMP' && data && <DecompositionView decomp={data.decomposition} satoAnalysis={data.satoAnalysis ?? []} />}
      </div>
    </div>
  );
}

// ── Pools Tab ──

function PoolsView({ pools, summary }: {
  pools: Pool[];
  summary?: { totalPools: number; totalBalance: number; avgCPR: number; avgCDR: number; avgSMM: number; avgPSA: number; avgWAC: number; avgWAM: number };
}) {
  if (!summary) return null;

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-8 gap-1 p-2">
        {[
          { label: 'TOTAL BAL', value: fmtBal(summary.totalBalance) },
          { label: 'AVG CPR', value: fmtPct(summary.avgCPR, 1) },
          { label: 'AVG CDR', value: fmtPct(summary.avgCDR, 2) },
          { label: 'AVG SMM', value: summary.avgSMM.toFixed(4) },
          { label: 'AVG PSA', value: summary.avgPSA + '%' },
          { label: 'AVG WAC', value: fmtPct(summary.avgWAC, 2) },
          { label: 'AVG WAM', value: summary.avgWAM + 'mo' },
          { label: 'POOLS', value: summary.totalPools.toString() },
        ].map(s => (
          <div key={s.label} className="bg-[#050505] border border-border/10 px-1.5 py-1">
            <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">{s.label}</div>
            <div className="text-[9px] font-mono font-bold text-cyan-400">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Pool table header */}
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[64px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider">POOL</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider">AGY</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CPN</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CPR</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CDR</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">SMM</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">WAC</span>
        <span className="w-[30px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">WAM</span>
        <span className="w-[30px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">WALA</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">PSA</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">SATO</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">FCT</span>
      </div>

      {/* Pool rows */}
      {pools.map(p => (
        <div key={p.id} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors">
          <span className="w-[64px] text-[7px] font-mono font-bold text-white truncate">{p.id}</span>
          <span className="w-[36px] text-[8px] font-mono text-neutral-400">{p.agency}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-cyan-400">{p.coupon.toFixed(1)}</span>
          <span className={`w-[36px] text-[8px] font-mono text-right font-bold ${cprColor(p.cpr)}`}>{p.cpr.toFixed(1)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{p.cdr.toFixed(2)}</span>
          <span className="w-[40px] text-[8px] font-mono text-right text-neutral-300">{p.smm.toFixed(4)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{p.wac.toFixed(2)}</span>
          <span className="w-[30px] text-[8px] font-mono text-right text-neutral-300">{p.wam}</span>
          <span className="w-[30px] text-[8px] font-mono text-right text-neutral-300">{p.wala}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{p.psa}</span>
          <span className={`w-[36px] text-[8px] font-mono text-right ${satoColor(p.sato)}`}>{p.sato > 0 ? '+' : ''}{p.sato}</span>
          <span className="w-[36px] text-[7px] font-mono text-right text-neutral-500 pr-1">{p.factor.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Speeds Tab ──

function SpeedsView({ speedTrends, psaBenchmarks }: { speedTrends: SpeedTrend[]; psaBenchmarks: PsaBenchmark[] }) {
  const maxCPR = Math.max(...speedTrends.map(s => s.cpr), 1);
  const maxPsa = Math.max(...psaBenchmarks.map(b => Math.max(b.psa100, b.psa150, b.psa200, b.actual)), 1);

  return (
    <div className="p-2">
      {/* PSA Benchmark Comparison */}
      <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1.5 tracking-wider">PSA Benchmark Comparison</div>

      <div className="mb-4">
        {/* Legend */}
        <div className="flex items-center gap-3 mb-1.5 px-1">
          <span className="flex items-center gap-1"><span className="w-2 h-1 bg-neutral-600 inline-block" /><span className="text-[6px] font-mono text-neutral-500">100 PSA</span></span>
          <span className="flex items-center gap-1"><span className="w-2 h-1 bg-yellow-400/50 inline-block" /><span className="text-[6px] font-mono text-neutral-500">150 PSA</span></span>
          <span className="flex items-center gap-1"><span className="w-2 h-1 bg-amber-400/50 inline-block" /><span className="text-[6px] font-mono text-neutral-500">200 PSA</span></span>
          <span className="flex items-center gap-1"><span className="w-2 h-1 bg-cyan-400 inline-block" /><span className="text-[6px] font-mono text-neutral-500">ACTUAL</span></span>
        </div>

        {/* Text-based chart */}
        <div className="flex items-end gap-0.5 h-24 px-1 border-b border-border/10">
          {psaBenchmarks.map((b, i) => {
            const h100 = (b.psa100 / maxPsa) * 100;
            const h150 = (b.psa150 / maxPsa) * 100;
            const h200 = (b.psa200 / maxPsa) * 100;
            const hAct = (b.actual / maxPsa) * 100;
            return (
              <div key={i} className="flex-1 flex items-end justify-center gap-px" title={`Mo ${b.month}`}>
                <div className="w-1 bg-neutral-700" style={{ height: `${h100}%` }} />
                <div className="w-1 bg-yellow-400/50" style={{ height: `${h150}%` }} />
                <div className="w-1 bg-amber-400/50" style={{ height: `${h200}%` }} />
                <div className="w-1 bg-cyan-400" style={{ height: `${hAct}%` }} />
              </div>
            );
          })}
        </div>
        <div className="flex gap-0.5 px-1 mt-0.5">
          {psaBenchmarks.map((b, i) => (
            <div key={i} className="flex-1 text-center text-[5px] font-mono text-neutral-600">{b.month}</div>
          ))}
        </div>
      </div>

      {/* Speed trend table */}
      <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1.5 tracking-wider">Speed Trends (CPR / SMM / PSA)</div>

      <div className="flex items-center px-1 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[52px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider">DATE</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CPR</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">SMM</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">PSA</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">CPR BAR</span>
      </div>

      {speedTrends.map((s, i) => (
        <div key={i} className="flex items-center px-1 py-[3px] border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors">
          <span className="w-[52px] text-[7px] font-mono text-neutral-500">{s.date}</span>
          <span className={`w-[36px] text-[8px] font-mono text-right font-bold ${cprColor(s.cpr)}`}>{s.cpr.toFixed(1)}</span>
          <span className="w-[44px] text-[8px] font-mono text-right text-neutral-300">{s.smm.toFixed(4)}</span>
          <span className="w-[36px] text-[8px] font-mono text-right text-neutral-300">{s.psa}</span>
          <div className="flex-1 px-2">
            <div className="h-2 bg-neutral-900 relative">
              <div className={`absolute left-0 top-0 h-full ${s.cpr >= 25 ? 'bg-red-400/40' : s.cpr >= 15 ? 'bg-amber-400/40' : 'bg-cyan-400/40'}`}
                style={{ width: `${(s.cpr / maxCPR) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Vintage Tab ──

function VintageView({ vintages }: { vintages: VintageData[] }) {
  const maxCPR = Math.max(...vintages.map(v => v.cpr), 1);

  return (
    <div className="p-2">
      <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1.5 tracking-wider">Prepayment by Origination Year - Burnout Analysis</div>

      {/* Vintage table header */}
      <div className="flex items-center px-1 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider">YEAR</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CPR</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CDR</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">BURNOUT</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">REFI INC</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">WALA</span>
        <span className="w-[28px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CNT</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">CPR / BURNOUT</span>
      </div>

      {vintages.map(v => (
        <div key={v.year} className="flex items-center px-1 py-[3px] border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors">
          <span className="w-[40px] text-[8px] font-mono font-bold text-white">{v.year}</span>
          <span className={`w-[36px] text-[8px] font-mono text-right font-bold ${cprColor(v.cpr)}`}>{v.cpr.toFixed(1)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{v.cdr.toFixed(2)}</span>
          <span className={`w-[48px] text-[8px] font-mono text-right font-bold ${burnoutColor(v.burnoutFactor)}`}>{v.burnoutFactor.toFixed(2)}</span>
          <span className={`w-[44px] text-[8px] font-mono text-right ${v.refinanceIncentive > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {v.refinanceIncentive > 0 ? '+' : ''}{v.refinanceIncentive}bp
          </span>
          <span className="w-[36px] text-[8px] font-mono text-right text-neutral-400">{v.avgWala}mo</span>
          <span className="w-[28px] text-[8px] font-mono text-right text-neutral-500">{v.poolCount}</span>
          <div className="flex-1 px-2 flex items-center gap-1">
            <div className="flex-1 h-3 bg-neutral-900 relative">
              {/* CPR bar */}
              <div className={`absolute left-0 top-0 h-1.5 ${v.cpr >= 25 ? 'bg-red-400/50' : v.cpr >= 15 ? 'bg-amber-400/50' : 'bg-cyan-400/50'}`}
                style={{ width: `${(v.cpr / maxCPR) * 100}%` }} />
              {/* Burnout bar */}
              <div className={`absolute left-0 bottom-0 h-1.5 ${burnoutColor(v.burnoutFactor).replace('text-', 'bg-')}/30`}
                style={{ width: `${v.burnoutFactor * 100}%` }} />
            </div>
          </div>
        </div>
      ))}

      {/* Burnout legend */}
      <div className="flex items-center gap-3 mt-2 px-1">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">BURNOUT FACTOR:</span>
        <span className="flex items-center gap-1"><span className="w-2 h-1 bg-green-400/40 inline-block" /><span className="text-[6px] font-mono text-neutral-500">&gt;0.8 LOW</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-1 bg-yellow-400/40 inline-block" /><span className="text-[6px] font-mono text-neutral-500">0.5-0.8 MOD</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-1 bg-amber-400/40 inline-block" /><span className="text-[6px] font-mono text-neutral-500">0.3-0.5 HIGH</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-1 bg-red-400/40 inline-block" /><span className="text-[6px] font-mono text-neutral-500">&lt;0.3 SEVERE</span></span>
      </div>
    </div>
  );
}

// ── Seasonal Tab ──

function SeasonalView({ factors }: { factors: SeasonalFactor[] }) {
  const maxFactor = Math.max(...factors.map(f => Math.max(f.factor, f.historicalAvg, f.currentYear)), 1.3);

  return (
    <div className="p-2">
      <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1.5 tracking-wider">Monthly Seasonal Adjustment Factors</div>

      {/* Factor table header */}
      <div className="flex items-center px-1 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider">MONTH</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">FACTOR</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">HIST AVG</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CUR YR</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">VS HIST</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">FACTOR BAR</span>
      </div>

      {factors.map((f, i) => {
        const vsHist = ((f.currentYear - f.historicalAvg) / f.historicalAvg) * 100;
        return (
          <div key={i} className="flex items-center px-1 py-[3px] border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors">
            <span className="w-[40px] text-[8px] font-mono font-bold text-white uppercase">{f.month}</span>
            <span className={`w-[48px] text-[8px] font-mono text-right font-bold ${seasonalColor(f.factor)}`}>{f.factor.toFixed(3)}</span>
            <span className="w-[48px] text-[8px] font-mono text-right text-neutral-400">{f.historicalAvg.toFixed(3)}</span>
            <span className={`w-[48px] text-[8px] font-mono text-right ${seasonalColor(f.currentYear)}`}>{f.currentYear.toFixed(3)}</span>
            <span className={`w-[44px] text-[8px] font-mono text-right ${vsHist > 5 ? 'text-red-400' : vsHist < -5 ? 'text-green-400' : 'text-neutral-400'}`}>
              {vsHist > 0 ? '+' : ''}{vsHist.toFixed(1)}%
            </span>
            <div className="flex-1 px-2">
              <div className="h-3 bg-neutral-900 relative">
                {/* 1.0 baseline marker */}
                <div className="absolute top-0 h-full w-px bg-neutral-600" style={{ left: `${(1.0 / maxFactor) * 100}%` }} />
                {/* Current factor bar */}
                <div className={`absolute top-0 h-1.5 ${f.factor >= 1.0 ? 'bg-amber-400/40' : 'bg-cyan-400/40'}`}
                  style={{
                    left: f.factor >= 1.0 ? `${(1.0 / maxFactor) * 100}%` : `${(f.factor / maxFactor) * 100}%`,
                    width: f.factor >= 1.0 ? `${((f.factor - 1.0) / maxFactor) * 100}%` : `${((1.0 - f.factor) / maxFactor) * 100}%`,
                  }} />
                {/* Historical bar */}
                <div className="absolute bottom-0 h-1.5 bg-neutral-600/30"
                  style={{
                    left: f.historicalAvg >= 1.0 ? `${(1.0 / maxFactor) * 100}%` : `${(f.historicalAvg / maxFactor) * 100}%`,
                    width: f.historicalAvg >= 1.0 ? `${((f.historicalAvg - 1.0) / maxFactor) * 100}%` : `${((1.0 - f.historicalAvg) / maxFactor) * 100}%`,
                  }} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Seasonal legend */}
      <div className="flex items-center gap-3 mt-2 px-1">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">SEASONAL:</span>
        <span className="flex items-center gap-1"><span className="w-2 h-1 bg-red-400/40 inline-block" /><span className="text-[6px] font-mono text-neutral-500">&gt;1.15 PEAK</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-1 bg-amber-400/40 inline-block" /><span className="text-[6px] font-mono text-neutral-500">1.05-1.15 ELEVATED</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-1 bg-neutral-400/40 inline-block" /><span className="text-[6px] font-mono text-neutral-500">0.95-1.05 NEUTRAL</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-1 bg-cyan-400/40 inline-block" /><span className="text-[6px] font-mono text-neutral-500">&lt;0.95 LOW</span></span>
      </div>
    </div>
  );
}

// ── Decomposition Tab ──

function DecompositionView({ decomp, satoAnalysis }: { decomp?: DecompData; satoAnalysis: SatoAnalysis[] }) {
  if (!decomp) return <div className="text-center py-8 text-neutral-600 text-[9px] font-mono uppercase">No decomposition data</div>;

  const components = [
    { label: 'REFINANCE', value: decomp.refinanceRate, color: 'bg-red-400' },
    { label: 'TURNOVER', value: decomp.turnoverRate, color: 'bg-cyan-400' },
    { label: 'CURTAILMENT', value: decomp.curtailmentRate, color: 'bg-yellow-400' },
    { label: 'RELOCATION', value: decomp.relocationRate, color: 'bg-green-400' },
    { label: 'DEFAULT', value: decomp.defaultRate, color: 'bg-amber-400' },
  ];

  const maxComponent = Math.max(...components.map(c => c.value), 1);

  return (
    <div className="p-2">
      {/* Total CPR header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-[#050505] border border-border/10 px-3 py-1.5">
          <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">TOTAL CPR</div>
          <div className={`text-[14px] font-mono font-bold ${cprColor(decomp.totalCPR)}`}>{decomp.totalCPR.toFixed(1)}%</div>
        </div>
        <div className="flex-1">
          {/* Stacked decomposition bar */}
          <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider mb-1">CPR Decomposition</div>
          <div className="h-4 flex">
            {components.map(c => (
              <div key={c.label} className={`${c.color}/60 border-r border-black/30`}
                style={{ width: `${(c.value / decomp.totalCPR) * 100}%` }}
                title={`${c.label}: ${c.value.toFixed(2)}%`} />
            ))}
          </div>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1.5 tracking-wider">Turnover vs Refinance Breakdown</div>

      <div className="flex items-center px-1 py-0.5 border-b border-border/10 bg-[#030303] mb-0.5">
        <span className="w-[72px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider">COMPONENT</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">RATE</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">SHARE</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">BAR</span>
      </div>

      {components.map(c => (
        <div key={c.label} className="flex items-center px-1 py-[3px] border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors">
          <span className="w-[72px] text-[8px] font-mono font-bold text-white flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 ${c.color}`} />
            {c.label}
          </span>
          <span className="w-[48px] text-[8px] font-mono text-right text-neutral-300">{c.value.toFixed(2)}%</span>
          <span className="w-[44px] text-[8px] font-mono text-right text-cyan-400">{((c.value / decomp.totalCPR) * 100).toFixed(1)}%</span>
          <div className="flex-1 px-2">
            <div className="h-2 bg-neutral-900 relative">
              <div className={`absolute left-0 top-0 h-full ${c.color}/40`}
                style={{ width: `${(c.value / maxComponent) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}

      {/* SATO Analysis */}
      <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1.5 mt-4 tracking-wider">SATO Analysis (Spread at Origination)</div>

      <div className="flex items-center px-1 py-0.5 border-b border-border/10 bg-[#030303] mb-0.5">
        <span className="w-[64px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider">BUCKET</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">SATO</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CPR</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">REFI %</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">TURN %</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">REFI / TURN</span>
      </div>

      {satoAnalysis.map((s, i) => (
        <div key={i} className="flex items-center px-1 py-[3px] border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors">
          <span className="w-[64px] text-[8px] font-mono font-bold text-white">{s.bucket}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right font-bold ${satoColor(s.sato)}`}>
            {s.sato > 0 ? '+' : ''}{s.sato}bp
          </span>
          <span className={`w-[36px] text-[8px] font-mono text-right ${cprColor(s.cpr)}`}>{s.cpr.toFixed(1)}</span>
          <span className="w-[48px] text-[8px] font-mono text-right text-red-400">{s.refiShare.toFixed(1)}%</span>
          <span className="w-[48px] text-[8px] font-mono text-right text-cyan-400">{s.turnoverShare.toFixed(1)}%</span>
          <div className="flex-1 px-2">
            <div className="h-2 bg-neutral-900 relative flex">
              <div className="h-full bg-red-400/40" style={{ width: `${s.refiShare}%` }} />
              <div className="h-full bg-cyan-400/40" style={{ width: `${s.turnoverShare}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
