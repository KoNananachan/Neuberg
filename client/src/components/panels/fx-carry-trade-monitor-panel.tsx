import { useState, useMemo } from 'react';
import { useFxCarryTradeMonitor } from '../../api/hooks/use-fx-carry-trade-monitor';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, TrendingUp, BarChart3, Activity, Landmark } from 'lucide-react';

// ── Types ──

interface G10Currency {
  code: string;
  rate: number;
}

interface CarryMatrixCell {
  long: string;
  short: string;
  carry: number;
}

interface EmCarryOpportunity {
  pair: string;
  carry: number;
  vol: number;
  carryToRisk: number;
  signal: 'attractive' | 'neutral' | 'dangerous';
  rank: number;
}

interface CarryToRiskEntry {
  pair: string;
  carryToRisk: number;
  carry: number;
  vol: number;
}

interface PnlDecomposition {
  pair: string;
  carryReturn: number;
  spotReturn: number;
  totalReturn: number;
}

interface HistoricalPoint {
  day: number;
  value: number;
}

interface VolTermPoint {
  tenor: string;
  vol: number;
}

interface VolTermStructure {
  pair: string;
  points: VolTermPoint[];
}

interface CentralBankRate {
  country: string;
  bank: string;
  rate: number;
  direction: 'hawkish' | 'dovish' | 'neutral';
  lastChange: string;
}

interface FxCarryTradeMonitorData {
  timestamp: string;
  g10Currencies: G10Currency[];
  carryMatrix: CarryMatrixCell[];
  emCarryOpportunities: EmCarryOpportunity[];
  carryToRisk: CarryToRiskEntry[];
  pnlDecomposition: PnlDecomposition[];
  historicalPerformance: HistoricalPoint[];
  volTermStructures: VolTermStructure[];
  centralBankRates: CentralBankRate[];
}

type TabMode = 'matrix' | 'em' | 'pnl' | 'history' | 'vol' | 'rates';

// ── Formatting helpers ──

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(0)}bp`;
}

function fmtRate(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtRatio(n: number): string {
  return n.toFixed(2);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function heatColor(carry: number, maxAbsCarry: number): string {
  if (maxAbsCarry === 0) return 'rgba(255,255,255,0.03)';
  const normalized = carry / maxAbsCarry;
  if (normalized > 0.6) return 'rgba(34,197,94,0.5)';
  if (normalized > 0.3) return 'rgba(34,197,94,0.3)';
  if (normalized > 0.1) return 'rgba(34,197,94,0.15)';
  if (normalized > -0.1) return 'rgba(255,255,255,0.03)';
  if (normalized > -0.3) return 'rgba(239,68,68,0.15)';
  if (normalized > -0.6) return 'rgba(239,68,68,0.3)';
  return 'rgba(239,68,68,0.5)';
}

function heatTextColor(carry: number, maxAbsCarry: number): string {
  if (maxAbsCarry === 0) return '#737373';
  const normalized = Math.abs(carry / maxAbsCarry);
  if (normalized > 0.3) return '#ffffff';
  return '#a3a3a3';
}

function signalBadge(signal: 'attractive' | 'neutral' | 'dangerous'): { text: string; bg: string; label: string } {
  if (signal === 'attractive') return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30', label: 'BUY' };
  if (signal === 'dangerous') return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', label: 'RISK' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', label: 'HOLD' };
}

function directionBadge(dir: 'hawkish' | 'dovish' | 'neutral'): { text: string; bg: string; label: string } {
  if (dir === 'hawkish') return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', label: 'HAWK' };
  if (dir === 'dovish') return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30', label: 'DOVE' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30', label: 'HOLD' };
}

// ── SVG Color for vol lines ──

const VOL_COLORS = ['#4ade80', '#22d3ee', '#a78bfa', '#f472b6', '#fb923c', '#facc15'];

// ── Main Panel ──

export function FxCarryTradeMonitorPanel() {
  const t = useT();
  const { data: rawData, isLoading, refetch } = useFxCarryTradeMonitor();
  const [tab, setTab] = useState<TabMode>('matrix');

  const data = rawData as FxCarryTradeMonitorData | undefined;

  const tabs: { key: TabMode; label: string; icon: React.ReactNode }[] = [
    { key: 'matrix', label: tr(t, 'fctmMatrix', 'Matrix'), icon: <BarChart3 className="w-2.5 h-2.5" /> },
    { key: 'em', label: tr(t, 'fctmEM', 'EM Carry'), icon: <TrendingUp className="w-2.5 h-2.5" /> },
    { key: 'pnl', label: tr(t, 'fctmPnL', 'P&L'), icon: <Activity className="w-2.5 h-2.5" /> },
    { key: 'history', label: tr(t, 'fctmHistory', '30D Perf'), icon: <TrendingUp className="w-2.5 h-2.5" /> },
    { key: 'vol', label: tr(t, 'fctmVol', 'Vol Term'), icon: <Activity className="w-2.5 h-2.5" /> },
    { key: 'rates', label: tr(t, 'fctmRates', 'CB Rates'), icon: <Landmark className="w-2.5 h-2.5" /> },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-green-400">
            {tr(t, 'fctmTitle', 'FX Carry Trade Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-green-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 bg-[#050505] shrink-0 overflow-x-auto no-scrollbar">
        {tabs.map((mode) => (
          <button
            key={mode.key}
            onClick={() => setTab(mode.key)}
            className={`flex items-center gap-1 px-2 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors shrink-0 ${
              tab === mode.key
                ? 'border-green-400/40 text-green-400 bg-green-400/10'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {mode.icon}
            {mode.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-green-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'fctmNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'matrix' && (
          <CarryMatrixSection
            currencies={data.g10Currencies}
            matrix={data.carryMatrix}
            carryToRisk={data.carryToRisk}
            t={t}
          />
        )}
        {data && tab === 'em' && <EmCarrySection opportunities={data.emCarryOpportunities} t={t} />}
        {data && tab === 'pnl' && <PnlSection decomposition={data.pnlDecomposition} t={t} />}
        {data && tab === 'history' && <HistoricalSection history={data.historicalPerformance} t={t} />}
        {data && tab === 'vol' && <VolTermSection structures={data.volTermStructures} t={t} />}
        {data && tab === 'rates' && <CentralBankSection rates={data.centralBankRates} t={t} />}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0 flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral-600">
          {data ? `${data.g10Currencies?.length ?? 0} G10` : '---'}
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          {data ? `${data.emCarryOpportunities?.length ?? 0} EM OPP` : '---'}
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          {data ? `${data.centralBankRates?.length ?? 0} CB` : '---'}
        </span>
      </div>
    </div>
  );
}

// ── Section 1: Carry Matrix Heatmap (SVG) + Carry-to-Risk Bars ──

function CarryMatrixSection({
  currencies,
  matrix,
  carryToRisk,
  t,
}: {
  currencies: G10Currency[];
  matrix: CarryMatrixCell[];
  carryToRisk: CarryToRiskEntry[];
  t: ReturnType<typeof useT>;
}) {
  const codes = useMemo(() => (currencies ?? []).map((c) => c.code), [currencies]);
  const n = codes.length;

  const matrixMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cell of matrix ?? []) {
      map[`${cell.long}-${cell.short}`] = cell.carry;
    }
    return map;
  }, [matrix]);

  const maxAbsCarry = useMemo(() => {
    const vals = (matrix ?? []).map((c) => Math.abs(c.carry));
    return Math.max(...vals, 0.01);
  }, [matrix]);

  const CELL = 28;
  const LABEL = 32;
  const W = LABEL + n * CELL;
  const H = LABEL + n * CELL;

  // Carry-to-risk bars
  const sortedCtr = useMemo(
    () => [...(carryToRisk ?? [])].sort((a, b) => b.carryToRisk - a.carryToRisk).slice(0, 10),
    [carryToRisk],
  );
  const maxCtr = useMemo(
    () => Math.max(...sortedCtr.map((e) => Math.abs(e.carryToRisk)), 0.01),
    [sortedCtr],
  );

  return (
    <div>
      {/* Heatmap header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-green-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fctmG10Matrix', 'G10 Carry Matrix')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 ml-auto">
          {tr(t, 'fctmLongRow', 'Row=Long / Col=Short')}
        </span>
      </div>

      {/* SVG Heatmap */}
      <div className="px-3 py-2 flex justify-center overflow-x-auto no-scrollbar">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="shrink-0">
          {/* Column labels (short) */}
          {codes.map((code, ci) => (
            <text
              key={`col-${code}`}
              x={LABEL + ci * CELL + CELL / 2}
              y={LABEL - 4}
              textAnchor="middle"
              fill="#737373"
              fontSize="7"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {code}
            </text>
          ))}

          {/* Row labels (long) + cells */}
          {codes.map((longCode, ri) => (
            <g key={`row-${longCode}`}>
              <text
                x={LABEL - 4}
                y={LABEL + ri * CELL + CELL / 2 + 3}
                textAnchor="end"
                fill="#737373"
                fontSize="7"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {longCode}
              </text>

              {codes.map((shortCode, ci) => {
                const carry = longCode === shortCode ? 0 : (matrixMap[`${longCode}-${shortCode}`] ?? 0);
                const isDiag = longCode === shortCode;
                const x = LABEL + ci * CELL;
                const y = LABEL + ri * CELL;

                return (
                  <g key={`${longCode}-${shortCode}`}>
                    <rect
                      x={x}
                      y={y}
                      width={CELL}
                      height={CELL}
                      fill={isDiag ? 'rgba(255,255,255,0.01)' : heatColor(carry, maxAbsCarry)}
                      stroke="rgba(255,255,255,0.04)"
                      strokeWidth="0.5"
                    />
                    {!isDiag && (
                      <text
                        x={x + CELL / 2}
                        y={y + CELL / 2 + 3}
                        textAnchor="middle"
                        fill={heatTextColor(carry, maxAbsCarry)}
                        fontSize="6.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {carry >= 0 ? '+' : ''}{(carry * 100).toFixed(0)}
                      </text>
                    )}
                    {isDiag && (
                      <line
                        x1={x}
                        y1={y}
                        x2={x + CELL}
                        y2={y + CELL}
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="0.5"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          ))}

          {/* Legend */}
          <text x={LABEL} y={H + 14} fill="#525252" fontSize="6" fontFamily="monospace">
            {tr(t, 'fctmBpsUnit', 'Values in bps | Green=Positive Carry | Red=Negative')}
          </text>
        </svg>
      </div>

      {/* Carry-to-Risk Bars */}
      <div className="px-3 py-1 border-t border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-green-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fctmCtrBars', 'Carry-to-Risk Ratio')}
        </span>
      </div>

      {sortedCtr.map((entry) => {
        const barWidth = maxCtr > 0 ? (Math.abs(entry.carryToRisk) / maxCtr) * 100 : 0;
        const isPositive = entry.carryToRisk >= 0;

        return (
          <div
            key={entry.pair}
            className="flex items-center gap-2 px-3 py-[3px] border-b border-border/5 hover:bg-green-400/[0.02] transition-colors"
          >
            <span className="text-[8px] font-mono font-bold text-white w-16 shrink-0">{entry.pair}</span>
            <div className="flex-1 h-[6px] bg-neutral-900 relative">
              <div
                className={`absolute left-0 top-0 h-full ${isPositive ? 'bg-green-500/70' : 'bg-red-500/70'}`}
                style={{ width: `${Math.min(barWidth, 100)}%` }}
              />
            </div>
            <span className={`text-[8px] font-mono font-bold w-10 text-right shrink-0 ${changeColor(entry.carryToRisk)}`}>
              {fmtRatio(entry.carryToRisk)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 2: EM Carry Opportunities ──

function EmCarrySection({
  opportunities,
  t,
}: {
  opportunities: EmCarryOpportunity[];
  t: ReturnType<typeof useT>;
}) {
  const sorted = useMemo(
    () => [...(opportunities ?? [])].sort((a, b) => a.rank - b.rank),
    [opportunities],
  );

  const maxCarry = useMemo(
    () => Math.max(...sorted.map((o) => Math.abs(o.carry)), 0.01),
    [sorted],
  );

  return (
    <div>
      {/* Header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-green-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fctmEmCarry', 'EM Carry Opportunities')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 ml-auto">
          {sorted.length} {tr(t, 'fctmPairs', 'pairs')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[28px_68px_52px_44px_52px_52px_1fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">#</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'fctmPair', 'Pair')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fctmCarry', 'Carry')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fctmVol', 'Vol')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fctmCtoR', 'C/R')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'fctmSignal', 'Signal')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">{tr(t, 'fctmBar', '')}</span>
      </div>

      {/* Rows */}
      {sorted.map((opp) => {
        const badge = signalBadge(opp.signal);
        const barWidth = maxCarry > 0 ? (Math.abs(opp.carry) / maxCarry) * 100 : 0;

        return (
          <div
            key={opp.pair}
            className="grid grid-cols-[28px_68px_52px_44px_52px_52px_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-green-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono text-neutral-600">{opp.rank}</span>
            <span className="text-[8px] font-mono font-bold text-white">{opp.pair}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(opp.carry)}`}>
              {fmtPct(opp.carry)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {opp.vol.toFixed(1)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(opp.carryToRisk)}`}>
              {fmtRatio(opp.carryToRisk)}
            </span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${badge.text} ${badge.bg}`}>
                {badge.label}
              </span>
            </div>
            <div className="flex justify-end pr-1">
              <div className="w-16 h-[3px] bg-neutral-800 relative">
                <div
                  className={`absolute left-0 top-0 h-full ${opp.carry >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(barWidth, 100)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 3: P&L Decomposition ──

function PnlSection({
  decomposition,
  t,
}: {
  decomposition: PnlDecomposition[];
  t: ReturnType<typeof useT>;
}) {
  const sorted = useMemo(
    () => [...(decomposition ?? [])].sort((a, b) => b.totalReturn - a.totalReturn),
    [decomposition],
  );

  const maxAbs = useMemo(
    () => Math.max(...sorted.map((d) => Math.max(Math.abs(d.carryReturn), Math.abs(d.spotReturn))), 0.01),
    [sorted],
  );

  // SVG stacked bar chart
  const BAR_H = 14;
  const LABEL_W = 60;
  const BAR_W = 200;
  const GAP = 2;
  const svgH = sorted.length * (BAR_H + GAP) + 24;
  const svgW = LABEL_W + BAR_W + 60;
  const CENTER_X = LABEL_W + BAR_W / 2;

  return (
    <div>
      {/* Header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-green-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fctmPnlDecomp', 'P&L Decomposition (Carry + Spot)')}
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1 border-b border-border/10">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500/70" />
          <span className="text-[7px] font-mono text-neutral-500 uppercase">{tr(t, 'fctmCarryRet', 'Carry')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-cyan-500/70" />
          <span className="text-[7px] font-mono text-neutral-500 uppercase">{tr(t, 'fctmSpotRet', 'Spot')}</span>
        </div>
      </div>

      {/* SVG Stacked Bars */}
      <div className="px-3 py-2 overflow-x-auto no-scrollbar">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} width={svgW} height={svgH} className="w-full" style={{ minWidth: svgW }}>
          {/* Center line */}
          <line
            x1={CENTER_X}
            y1="0"
            x2={CENTER_X}
            y2={svgH}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />

          {sorted.map((entry, i) => {
            const y = i * (BAR_H + GAP);
            const scale = (BAR_W / 2) / maxAbs;

            // Carry bar
            const carryW = Math.abs(entry.carryReturn) * scale;
            const carryX = entry.carryReturn >= 0 ? CENTER_X : CENTER_X - carryW;

            // Spot bar (stacked adjacent)
            const spotW = Math.abs(entry.spotReturn) * scale;
            const spotX = entry.spotReturn >= 0
              ? (entry.carryReturn >= 0 ? CENTER_X + carryW : CENTER_X)
              : (entry.carryReturn < 0 ? CENTER_X - carryW - spotW : CENTER_X - spotW);

            return (
              <g key={entry.pair}>
                {/* Label */}
                <text
                  x={LABEL_W - 4}
                  y={y + BAR_H / 2 + 3}
                  textAnchor="end"
                  fill="#ffffff"
                  fontSize="7"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {entry.pair}
                </text>

                {/* Carry bar */}
                <rect
                  x={carryX}
                  y={y + 1}
                  width={Math.max(carryW, 0.5)}
                  height={BAR_H - 2}
                  fill={entry.carryReturn >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'}
                />

                {/* Spot bar */}
                <rect
                  x={spotX}
                  y={y + 1}
                  width={Math.max(spotW, 0.5)}
                  height={BAR_H - 2}
                  fill={entry.spotReturn >= 0 ? 'rgba(34,211,238,0.6)' : 'rgba(251,146,60,0.6)'}
                />

                {/* Total label */}
                <text
                  x={LABEL_W + BAR_W + 4}
                  y={y + BAR_H / 2 + 3}
                  textAnchor="start"
                  fill={entry.totalReturn >= 0 ? '#4ade80' : '#ef4444'}
                  fontSize="7"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {entry.totalReturn >= 0 ? '+' : ''}{entry.totalReturn.toFixed(2)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Table detail */}
      <div className="px-3 py-1 border-t border-border/10">
        <div className="grid grid-cols-[72px_64px_64px_64px] gap-0 px-0 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'fctmPair', 'Pair')}</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fctmCarryCol', 'Carry')}</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fctmSpotCol', 'Spot')}</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fctmTotal', 'Total')}</span>
        </div>
        {sorted.map((entry) => (
          <div
            key={entry.pair}
            className="grid grid-cols-[72px_64px_64px_64px] gap-0 px-0 py-[3px] border-b border-border/5"
          >
            <span className="text-[8px] font-mono font-bold text-white">{entry.pair}</span>
            <span className={`text-[8px] font-mono text-right ${changeColor(entry.carryReturn)}`}>
              {fmtPct(entry.carryReturn)}
            </span>
            <span className={`text-[8px] font-mono text-right ${changeColor(entry.spotReturn)}`}>
              {fmtPct(entry.spotReturn)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(entry.totalReturn)}`}>
              {fmtPct(entry.totalReturn)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 4: Historical Performance Chart (SVG 30 Days) ──

function HistoricalSection({
  history,
  t,
}: {
  history: HistoricalPoint[];
  t: ReturnType<typeof useT>;
}) {
  const chartData = useMemo(() => {
    const points = history ?? [];
    if (points.length < 2) return null;

    const W = 380;
    const H = 160;
    const PAD_L = 36;
    const PAD_R = 8;
    const PAD_T = 12;
    const PAD_B = 20;

    const minV = Math.min(...points.map((p) => p.value));
    const maxV = Math.max(...points.map((p) => p.value));
    const rangeV = maxV - minV || 0.01;

    const scaleX = (i: number) => PAD_L + (i / (points.length - 1)) * (W - PAD_L - PAD_R);
    const scaleY = (v: number) => PAD_T + ((maxV - v) / rangeV) * (H - PAD_T - PAD_B);

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(p.value).toFixed(1)}`)
      .join(' ');

    // Area fill
    const areaPath = `${linePath} L ${scaleX(points.length - 1).toFixed(1)},${(H - PAD_B).toFixed(1)} L ${PAD_L.toFixed(1)},${(H - PAD_B).toFixed(1)} Z`;

    // Zero line
    const zeroY = scaleY(0);
    const showZero = minV < 0 && maxV > 0;

    // Grid lines
    const gridCount = 4;
    const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
      const val = maxV - (i / gridCount) * rangeV;
      return { y: scaleY(val), label: `${val >= 0 ? '+' : ''}${val.toFixed(2)}%` };
    });

    // X labels
    const xLabels = [
      { x: scaleX(0), label: `D-${points.length - 1}` },
      { x: scaleX(Math.floor(points.length / 2)), label: `D-${Math.floor(points.length / 2)}` },
      { x: scaleX(points.length - 1), label: 'NOW' },
    ];

    const lastPoint = points[points.length - 1];
    const isPositive = lastPoint.value >= 0;

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, linePath, areaPath, zeroY, showZero, gridLines, xLabels, isPositive, lastPoint, scaleX, scaleY };
  }, [history]);

  if (!chartData) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'fctmNoHistory', 'Insufficient data')}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-green-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fctmHistPerf', 'Historical Performance (30D)')}
        </span>
        <span className={`text-[8px] font-mono font-bold ml-auto ${changeColor(chartData.lastPoint.value)}`}>
          {fmtPct(chartData.lastPoint.value)}
        </span>
      </div>

      {/* SVG Chart */}
      <div className="px-3 py-2">
        <svg viewBox={`0 0 ${chartData.W} ${chartData.H}`} className="w-full" style={{ maxHeight: 180 }}>
          {/* Gradient */}
          <defs>
            <linearGradient id="fctm-hist-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartData.isPositive ? '#22c55e' : '#ef4444'} stopOpacity="0.2" />
              <stop offset="100%" stopColor={chartData.isPositive ? '#22c55e' : '#ef4444'} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {chartData.gridLines.map((gl, i) => (
            <g key={i}>
              <line
                x1={chartData.PAD_L}
                y1={gl.y}
                x2={chartData.W - chartData.PAD_R}
                y2={gl.y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="0.5"
              />
              <text
                x={chartData.PAD_L - 4}
                y={gl.y + 3}
                textAnchor="end"
                fill="#525252"
                fontSize="6"
                fontFamily="monospace"
              >
                {gl.label}
              </text>
            </g>
          ))}

          {/* Zero line */}
          {chartData.showZero && (
            <line
              x1={chartData.PAD_L}
              y1={chartData.zeroY}
              x2={chartData.W - chartData.PAD_R}
              y2={chartData.zeroY}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.5"
              strokeDasharray="3,3"
            />
          )}

          {/* Area fill */}
          <path d={chartData.areaPath} fill="url(#fctm-hist-grad)" />

          {/* Line */}
          <path
            d={chartData.linePath}
            fill="none"
            stroke={chartData.isPositive ? '#4ade80' : '#ef4444'}
            strokeWidth="1.5"
          />

          {/* End dot */}
          <circle
            cx={chartData.scaleX((history ?? []).length - 1)}
            cy={chartData.scaleY(chartData.lastPoint.value)}
            r="2.5"
            fill={chartData.isPositive ? '#4ade80' : '#ef4444'}
          />

          {/* X labels */}
          {chartData.xLabels.map((xl, i) => (
            <text
              key={i}
              x={xl.x}
              y={chartData.H - 4}
              textAnchor="middle"
              fill="#525252"
              fontSize="6"
              fontFamily="monospace"
            >
              {xl.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Section 5: Vol Term Structure (SVG multi-line) ──

function VolTermSection({
  structures,
  t,
}: {
  structures: VolTermStructure[];
  t: ReturnType<typeof useT>;
}) {
  const chartData = useMemo(() => {
    const pairs = structures ?? [];
    if (pairs.length === 0) return null;

    const maxTenors = Math.max(...pairs.map((p) => p.points.length));
    if (maxTenors < 2) return null;

    const W = 380;
    const H = 160;
    const PAD_L = 36;
    const PAD_R = 8;
    const PAD_T = 12;
    const PAD_B = 24;

    const allVols = pairs.flatMap((p) => p.points.map((pt) => pt.vol));
    const minVol = Math.min(...allVols);
    const maxVol = Math.max(...allVols);
    const rangeVol = maxVol - minVol || 0.01;

    const scaleX = (i: number, total: number) => PAD_L + (i / (total - 1)) * (W - PAD_L - PAD_R);
    const scaleY = (v: number) => PAD_T + ((maxVol - v) / rangeVol) * (H - PAD_T - PAD_B);

    // Grid
    const gridCount = 4;
    const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
      const val = maxVol - (i / gridCount) * rangeVol;
      return { y: scaleY(val), label: `${val.toFixed(1)}%` };
    });

    // Tenor labels from the pair with most points
    const longestPair = pairs.reduce((a, b) => (a.points.length >= b.points.length ? a : b));
    const tenorLabels = longestPair.points.map((pt, i) => ({
      x: scaleX(i, longestPair.points.length),
      label: pt.tenor,
    }));

    // Lines
    const lines = pairs.slice(0, 6).map((p, pi) => {
      const path = p.points
        .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i, p.points.length).toFixed(1)},${scaleY(pt.vol).toFixed(1)}`)
        .join(' ');
      return { pair: p.pair, path, color: VOL_COLORS[pi % VOL_COLORS.length] };
    });

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, gridLines, tenorLabels, lines };
  }, [structures]);

  if (!chartData) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'fctmNoVol', 'No vol data')}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-green-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fctmVolTerm', 'Vol Term Structure')}
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1 border-b border-border/10 flex-wrap">
        {chartData.lines.map((line) => (
          <div key={line.pair} className="flex items-center gap-1">
            <div className="w-2.5 h-[2px]" style={{ backgroundColor: line.color }} />
            <span className="text-[7px] font-mono text-neutral-400 uppercase">{line.pair}</span>
          </div>
        ))}
      </div>

      {/* SVG Chart */}
      <div className="px-3 py-2">
        <svg viewBox={`0 0 ${chartData.W} ${chartData.H}`} className="w-full" style={{ maxHeight: 180 }}>
          {/* Grid */}
          {chartData.gridLines.map((gl, i) => (
            <g key={i}>
              <line
                x1={chartData.PAD_L}
                y1={gl.y}
                x2={chartData.W - chartData.PAD_R}
                y2={gl.y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="0.5"
              />
              <text
                x={chartData.PAD_L - 4}
                y={gl.y + 3}
                textAnchor="end"
                fill="#525252"
                fontSize="6"
                fontFamily="monospace"
              >
                {gl.label}
              </text>
            </g>
          ))}

          {/* Lines */}
          {chartData.lines.map((line) => (
            <path
              key={line.pair}
              d={line.path}
              fill="none"
              stroke={line.color}
              strokeWidth="1.2"
            />
          ))}

          {/* Tenor X labels */}
          {chartData.tenorLabels.map((tl, i) => (
            <text
              key={i}
              x={tl.x}
              y={chartData.H - 4}
              textAnchor="middle"
              fill="#525252"
              fontSize="6"
              fontFamily="monospace"
            >
              {tl.label}
            </text>
          ))}
        </svg>
      </div>

      {/* Data table */}
      {(structures ?? []).slice(0, 6).map((s) => (
        <div key={s.pair} className="border-t border-border/5">
          <div className="flex items-center gap-2 px-3 py-[3px]">
            <span className="text-[8px] font-mono font-bold text-white w-16">{s.pair}</span>
            {s.points.map((pt) => (
              <div key={pt.tenor} className="text-center">
                <div className="text-[6px] font-mono text-neutral-600 uppercase">{pt.tenor}</div>
                <div className="text-[7px] font-mono text-neutral-300">{pt.vol.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section 6: Central Bank Rates Comparison ──

function CentralBankSection({
  rates,
  t,
}: {
  rates: CentralBankRate[];
  t: ReturnType<typeof useT>;
}) {
  const sorted = useMemo(
    () => [...(rates ?? [])].sort((a, b) => b.rate - a.rate),
    [rates],
  );

  const maxRate = useMemo(
    () => Math.max(...sorted.map((r) => r.rate), 0.01),
    [sorted],
  );

  // SVG horizontal bar chart
  const BAR_H = 16;
  const GAP = 2;
  const LABEL_W = 50;
  const BAR_W = 200;
  const VALUE_W = 50;
  const BADGE_W = 40;
  const svgW = LABEL_W + BAR_W + VALUE_W + BADGE_W;
  const svgH = sorted.length * (BAR_H + GAP) + 4;

  return (
    <div>
      {/* Header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-green-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fctmCBRates', 'Central Bank Rates')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 ml-auto">
          {sorted.length} {tr(t, 'fctmBanks', 'banks')}
        </span>
      </div>

      {/* SVG Bar Chart */}
      <div className="px-3 py-2 overflow-x-auto no-scrollbar">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} width={svgW} height={svgH} className="w-full" style={{ minWidth: svgW }}>
          {sorted.map((bank, i) => {
            const y = i * (BAR_H + GAP);
            const barW = maxRate > 0 ? (bank.rate / maxRate) * BAR_W : 0;
            const badge = directionBadge(bank.direction);
            const fillColor = bank.direction === 'hawkish'
              ? 'rgba(239,68,68,0.5)'
              : bank.direction === 'dovish'
                ? 'rgba(34,197,94,0.5)'
                : 'rgba(163,163,163,0.3)';

            return (
              <g key={bank.country}>
                {/* Country label */}
                <text
                  x={LABEL_W - 4}
                  y={y + BAR_H / 2 + 3}
                  textAnchor="end"
                  fill="#ffffff"
                  fontSize="7"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {bank.country}
                </text>

                {/* Bar background */}
                <rect
                  x={LABEL_W}
                  y={y + 2}
                  width={BAR_W}
                  height={BAR_H - 4}
                  fill="rgba(255,255,255,0.02)"
                />

                {/* Bar fill */}
                <rect
                  x={LABEL_W}
                  y={y + 2}
                  width={Math.max(barW, 1)}
                  height={BAR_H - 4}
                  fill={fillColor}
                />

                {/* Rate value */}
                <text
                  x={LABEL_W + BAR_W + 4}
                  y={y + BAR_H / 2 + 3}
                  textAnchor="start"
                  fill="#e5e5e5"
                  fontSize="7"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {fmtRate(bank.rate)}
                </text>

                {/* Direction badge */}
                <rect
                  x={LABEL_W + BAR_W + VALUE_W}
                  y={y + 3}
                  width={32}
                  height={BAR_H - 6}
                  fill={bank.direction === 'hawkish' ? 'rgba(239,68,68,0.15)' : bank.direction === 'dovish' ? 'rgba(34,197,94,0.15)' : 'rgba(163,163,163,0.1)'}
                  stroke={bank.direction === 'hawkish' ? 'rgba(239,68,68,0.3)' : bank.direction === 'dovish' ? 'rgba(34,197,94,0.3)' : 'rgba(163,163,163,0.2)'}
                  strokeWidth="0.5"
                />
                <text
                  x={LABEL_W + BAR_W + VALUE_W + 16}
                  y={y + BAR_H / 2 + 2.5}
                  textAnchor="middle"
                  fill={bank.direction === 'hawkish' ? '#f87171' : bank.direction === 'dovish' ? '#4ade80' : '#a3a3a3'}
                  fontSize="5.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {badge.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail table */}
      <div className="border-t border-border/10">
        <div className="grid grid-cols-[52px_80px_52px_64px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'fctmCtry', 'Ctry')}</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'fctmBank', 'Bank')}</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fctmRate', 'Rate')}</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fctmLastChg', 'Last Chg')}</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'fctmDir', 'Dir')}</span>
        </div>

        {sorted.map((bank) => {
          const badge = directionBadge(bank.direction);
          return (
            <div
              key={bank.country}
              className="grid grid-cols-[52px_80px_52px_64px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-green-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-white">{bank.country}</span>
              <span className="text-[8px] font-mono text-neutral-400 truncate">{bank.bank}</span>
              <span className="text-[8px] font-mono text-green-400/80 font-bold text-right">{fmtRate(bank.rate)}</span>
              <span className="text-[8px] font-mono text-neutral-500 text-right">{bank.lastChange}</span>
              <div className="flex justify-center">
                <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${badge.text} ${badge.bg}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
