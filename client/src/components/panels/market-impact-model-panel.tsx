import { useState } from 'react';
import { useMarketImpactModel } from '../../api/hooks/use-market-impact-model';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Types ──

interface ImpactEstimate {
  symbol: string;
  name: string;
  adv: number;
  spreadBps: number;
  orderSize: number;
  orderPctAdv: number;
  permanentImpact: number;
  temporaryImpact: number;
  totalImpact: number;
  estimatedCost: number;
}

interface ExecutedOrder {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  arrivalPrice: number;
  avgFillPrice: number;
  decisionPrice: number;
  delaySlippage: number;
  marketImpact: number;
  totalShortfall: number;
  shortfallBps: number;
  timestamp: string;
}

interface ExecutionStrategy {
  strategy: string;
  participationRate: number;
  expectedCostBps: number;
  costStdDev: number;
  riskBps: number;
  durationMin: number;
  tradeoff: number;
}

interface LiquidityMetrics {
  avgSpreadBps: number;
  avgDepthMM: number;
  volumeConcentration: number;
  resiliencyScore: number;
  toxicityIndex: number;
  kyleλ: number;
  amihudRatio: number;
  rollSpread: number;
}

interface MarketImpactData {
  impactEstimates: ImpactEstimate[];
  executedOrders: ExecutedOrder[];
  strategies: ExecutionStrategy[];
  liquidityMetrics: LiquidityMetrics;
  timestamp: string;
}

// ── Constants ──

const ACCENT = '#60a5fa'; // blue-400
const GREEN = '#22c55e';
const RED = '#ef4444';
const YELLOW = '#facc15';
const ORANGE = '#fb923c';

type Tab = 'impact' | 'shortfall' | 'execution' | 'liquidity';

// ── Color helpers ──

function valColor(n: number): string {
  if (n > 0) return RED;
  if (n < 0) return GREEN;
  return '#71717a';
}

function costColor(bps: number): string {
  if (bps < 5) return GREEN;
  if (bps < 15) return YELLOW;
  if (bps < 30) return ORANGE;
  return RED;
}

function scoreColor(score: number): string {
  if (score >= 80) return GREEN;
  if (score >= 60) return '#34d399';
  if (score >= 40) return YELLOW;
  if (score >= 20) return ORANGE;
  return RED;
}

// ── Formatters ──

function fmtVol(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

function fmtBps(n: number): string {
  return n.toFixed(1) + ' bps';
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(2) + '%';
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtDollars(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toFixed(2) + 'M';
  if (abs >= 1_000) return sign + '$' + (abs / 1_000).toFixed(1) + 'K';
  return sign + '$' + abs.toFixed(0);
}

// ── Impact Estimates Tab ──

function ImpactEstimatesTab({ estimates }: { estimates: ImpactEstimate[] }) {
  const t = useT();

  return (
    <div className="px-1 py-1">
      {/* Header */}
      <div className="grid grid-cols-[48px_56px_44px_36px_44px_44px_44px_44px_52px] gap-0 px-1 py-1 border-b border-border/20">
        {[
          tr(t, 'mimSymbol', 'Symbol'),
          tr(t, 'mimAdv', 'ADV'),
          tr(t, 'mimSpread', 'Spread'),
          tr(t, 'mimSize', 'Size%'),
          tr(t, 'mimPerm', 'Perm'),
          tr(t, 'mimTemp', 'Temp'),
          tr(t, 'mimTotal', 'Total'),
          tr(t, 'mimImpact', 'Impact'),
          tr(t, 'mimCost', 'Est Cost'),
        ].map((h, i) => (
          <span
            key={i}
            className={`text-[6px] font-mono text-neutral-600 uppercase tracking-wider ${i > 0 ? 'text-right' : ''}`}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {estimates.map(est => (
        <div
          key={est.symbol}
          className="grid grid-cols-[48px_56px_44px_36px_44px_44px_44px_44px_52px] gap-0 px-1 py-[3px] hover:bg-blue-400/[0.02] border-b border-border/10 items-center"
        >
          {/* Symbol */}
          <div className="flex flex-col">
            <span className="text-[8px] font-mono font-bold text-neutral-200">{est.symbol}</span>
            <span className="text-[5px] font-mono text-neutral-600 truncate">{est.name}</span>
          </div>

          {/* ADV */}
          <span className="text-[7px] font-mono tabular-nums text-right text-neutral-400">
            {fmtVol(est.adv)}
          </span>

          {/* Spread */}
          <span
            className="text-[7px] font-mono tabular-nums text-right"
            style={{ color: est.spreadBps < 5 ? GREEN : est.spreadBps < 15 ? YELLOW : RED }}
          >
            {est.spreadBps.toFixed(1)}
          </span>

          {/* Order size % of ADV */}
          <span className="text-[7px] font-mono tabular-nums text-right text-neutral-300">
            {(est.orderPctAdv * 100).toFixed(1)}
          </span>

          {/* Permanent impact */}
          <span
            className="text-[7px] font-mono font-bold tabular-nums text-right"
            style={{ color: costColor(est.permanentImpact) }}
          >
            {est.permanentImpact.toFixed(1)}
          </span>

          {/* Temporary impact */}
          <span
            className="text-[7px] font-mono font-bold tabular-nums text-right"
            style={{ color: costColor(est.temporaryImpact) }}
          >
            {est.temporaryImpact.toFixed(1)}
          </span>

          {/* Total impact */}
          <span
            className="text-[7px] font-mono font-black tabular-nums text-right"
            style={{ color: costColor(est.totalImpact) }}
          >
            {est.totalImpact.toFixed(1)}
          </span>

          {/* Impact bar */}
          <div className="flex items-center justify-end gap-0.5">
            <div className="w-[24px] h-[4px] bg-white/[0.04] relative">
              <div
                className="absolute left-0 top-0 h-full"
                style={{
                  width: `${Math.min((est.totalImpact / 50) * 100, 100)}%`,
                  background: costColor(est.totalImpact),
                  opacity: 0.7,
                }}
              />
            </div>
            <span className="text-[5px] font-mono text-neutral-600">bps</span>
          </div>

          {/* Estimated cost */}
          <span
            className="text-[7px] font-mono font-bold tabular-nums text-right"
            style={{ color: costColor(est.totalImpact) }}
          >
            {fmtDollars(est.estimatedCost)}
          </span>
        </div>
      ))}

      {/* Column legend */}
      <div className="px-2 py-1.5 text-[5px] font-mono text-neutral-700">
        ADV = Avg Daily Volume | Spread/Impact in bps | Size% = Order % of ADV
      </div>
    </div>
  );
}

// ── Implementation Shortfall Tab ──

function ShortfallTab({ orders }: { orders: ExecutedOrder[] }) {
  const t = useT();

  return (
    <div className="px-1 py-1">
      {/* Header */}
      <div className="grid grid-cols-[44px_32px_44px_48px_48px_44px_44px_48px_44px] gap-0 px-1 py-1 border-b border-border/20">
        {[
          tr(t, 'mimOrdSym', 'Symbol'),
          tr(t, 'mimOrdSide', 'Side'),
          tr(t, 'mimOrdQty', 'Qty'),
          tr(t, 'mimOrdArrival', 'Arrival'),
          tr(t, 'mimOrdFill', 'Avg Fill'),
          tr(t, 'mimOrdDelay', 'Delay'),
          tr(t, 'mimOrdMktImp', 'Mkt Imp'),
          tr(t, 'mimOrdTotalIS', 'Total IS'),
          tr(t, 'mimOrdIsBps', 'IS bps'),
        ].map((h, i) => (
          <span
            key={i}
            className={`text-[6px] font-mono text-neutral-600 uppercase tracking-wider ${i > 1 ? 'text-right' : i === 1 ? 'text-center' : ''}`}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {orders.map(ord => {
        const isBuy = ord.side === 'buy';
        const sideColor = isBuy ? '#38bdf8' : '#f87171';

        return (
          <div
            key={ord.orderId}
            className="grid grid-cols-[44px_32px_44px_48px_48px_44px_44px_48px_44px] gap-0 px-1 py-[3px] hover:bg-blue-400/[0.02] border-b border-border/10 items-center"
          >
            {/* Symbol */}
            <span className="text-[8px] font-mono font-bold text-neutral-200">{ord.symbol}</span>

            {/* Side badge */}
            <span
              className="text-[6px] font-mono font-black text-center uppercase px-1 py-0.5"
              style={{
                color: sideColor,
                backgroundColor: isBuy ? 'rgba(56,189,248,0.1)' : 'rgba(248,113,113,0.1)',
              }}
            >
              {ord.side}
            </span>

            {/* Qty */}
            <span className="text-[7px] font-mono tabular-nums text-right text-neutral-400">
              {fmtVol(ord.qty)}
            </span>

            {/* Arrival price */}
            <span className="text-[7px] font-mono tabular-nums text-right text-neutral-400">
              {fmtPrice(ord.arrivalPrice)}
            </span>

            {/* Avg fill price */}
            <span className="text-[7px] font-mono font-bold tabular-nums text-right text-neutral-300">
              {fmtPrice(ord.avgFillPrice)}
            </span>

            {/* Delay slippage */}
            <span
              className="text-[7px] font-mono tabular-nums text-right"
              style={{ color: valColor(ord.delaySlippage) }}
            >
              {fmtBps(ord.delaySlippage)}
            </span>

            {/* Market impact */}
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: costColor(Math.abs(ord.marketImpact)) }}
            >
              {fmtBps(ord.marketImpact)}
            </span>

            {/* Total IS */}
            <span
              className="text-[7px] font-mono font-black tabular-nums text-right"
              style={{ color: costColor(Math.abs(ord.shortfallBps)) }}
            >
              {fmtDollars(ord.totalShortfall)}
            </span>

            {/* IS bps with bar */}
            <div className="flex items-center justify-end gap-0.5">
              <div className="w-[20px] h-[4px] bg-white/[0.04] relative">
                <div
                  className="absolute left-0 top-0 h-full"
                  style={{
                    width: `${Math.min((Math.abs(ord.shortfallBps) / 50) * 100, 100)}%`,
                    background: costColor(Math.abs(ord.shortfallBps)),
                    opacity: 0.7,
                  }}
                />
              </div>
              <span
                className="text-[7px] font-mono font-bold tabular-nums"
                style={{ color: costColor(Math.abs(ord.shortfallBps)) }}
              >
                {ord.shortfallBps.toFixed(1)}
              </span>
            </div>
          </div>
        );
      })}

      {/* Aggregate row */}
      {orders.length > 0 && <ShortfallSummary orders={orders} />}
    </div>
  );
}

function ShortfallSummary({ orders }: { orders: ExecutedOrder[] }) {
  const t = useT();
  const avgIS = orders.reduce((s, o) => s + o.shortfallBps, 0) / orders.length;
  const totalCost = orders.reduce((s, o) => s + o.totalShortfall, 0);
  const avgDelay = orders.reduce((s, o) => s + o.delaySlippage, 0) / orders.length;
  const avgImpact = orders.reduce((s, o) => s + o.marketImpact, 0) / orders.length;

  const stats = [
    { label: tr(t, 'mimAvgIS', 'Avg IS'), value: fmtBps(avgIS), color: costColor(Math.abs(avgIS)) },
    { label: tr(t, 'mimTotalCost', 'Total Cost'), value: fmtDollars(totalCost), color: costColor(Math.abs(avgIS)) },
    { label: tr(t, 'mimAvgDelay', 'Avg Delay'), value: fmtBps(avgDelay), color: valColor(avgDelay) },
    { label: tr(t, 'mimAvgImpact', 'Avg Impact'), value: fmtBps(avgImpact), color: costColor(Math.abs(avgImpact)) },
  ];

  return (
    <div className="grid grid-cols-4 gap-px bg-border/10 border-t border-blue-400/20 mt-1">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="bg-[#050505] px-2 py-1.5 flex flex-col items-center">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">{label}</span>
          <span className="text-[9px] font-mono font-black tabular-nums" style={{ color }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Optimal Execution Tab ──

function ExecutionTab({ strategies }: { strategies: ExecutionStrategy[] }) {
  const t = useT();
  const maxCost = Math.max(...strategies.map(s => s.expectedCostBps + s.costStdDev), 1);
  const maxRisk = Math.max(...strategies.map(s => s.riskBps), 1);

  return (
    <div className="px-1 py-1">
      {/* Strategy table */}
      <div className="px-1 py-0.5 mb-1">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mimStrategyComparison', 'Strategy Comparison')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[72px_48px_52px_48px_48px_48px_1fr] gap-0 px-1 py-1 border-b border-border/20">
        {[
          tr(t, 'mimStrategy', 'Strategy'),
          tr(t, 'mimPartRate', 'Part Rate'),
          tr(t, 'mimExpCost', 'Exp Cost'),
          tr(t, 'mimStdDev', 'Std Dev'),
          tr(t, 'mimRisk', 'Risk'),
          tr(t, 'mimDuration', 'Duration'),
          tr(t, 'mimCostRisk', 'Cost / Risk'),
        ].map((h, i) => (
          <span
            key={i}
            className={`text-[6px] font-mono text-neutral-600 uppercase tracking-wider ${i > 0 && i < 6 ? 'text-right' : i === 6 ? 'text-center' : ''}`}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {strategies.map(strat => {
        const isOptimal = strat.tradeoff === Math.min(...strategies.map(s => s.tradeoff));

        return (
          <div
            key={strat.strategy}
            className={`grid grid-cols-[72px_48px_52px_48px_48px_48px_1fr] gap-0 px-1 py-[4px] hover:bg-blue-400/[0.02] border-b border-border/10 items-center ${
              isOptimal ? 'bg-blue-400/[0.03]' : ''
            }`}
          >
            {/* Strategy name */}
            <div className="flex items-center gap-1">
              {isOptimal && (
                <span
                  className="text-[5px] font-mono font-black px-0.5 py-px"
                  style={{ color: ACCENT, backgroundColor: 'rgba(96,165,250,0.12)' }}
                >
                  OPT
                </span>
              )}
              <span className={`text-[8px] font-mono font-bold uppercase ${isOptimal ? 'text-blue-400' : 'text-neutral-200'}`}>
                {strat.strategy}
              </span>
            </div>

            {/* Participation rate */}
            <span className="text-[7px] font-mono tabular-nums text-right text-neutral-400">
              {(strat.participationRate * 100).toFixed(0)}%
            </span>

            {/* Expected cost */}
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: costColor(strat.expectedCostBps) }}
            >
              {strat.expectedCostBps.toFixed(1)}
            </span>

            {/* Std dev */}
            <span className="text-[7px] font-mono tabular-nums text-right text-neutral-500">
              {strat.costStdDev.toFixed(1)}
            </span>

            {/* Risk */}
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: costColor(strat.riskBps) }}
            >
              {strat.riskBps.toFixed(1)}
            </span>

            {/* Duration */}
            <span className="text-[7px] font-mono tabular-nums text-right text-neutral-400">
              {strat.durationMin}m
            </span>

            {/* Cost/Risk visual */}
            <div className="flex items-center justify-center px-1">
              <CostRiskBar
                cost={strat.expectedCostBps}
                risk={strat.riskBps}
                maxCost={maxCost}
                maxRisk={maxRisk}
                isOptimal={isOptimal}
              />
            </div>
          </div>
        );
      })}

      {/* Frontier chart */}
      <div className="mt-2 px-1">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mimFrontier', 'Efficient Frontier')}
        </span>
        <FrontierChart strategies={strategies} />
      </div>
    </div>
  );
}

function CostRiskBar({ cost, risk, maxCost, maxRisk, isOptimal }: {
  cost: number;
  risk: number;
  maxCost: number;
  maxRisk: number;
  isOptimal: boolean;
}) {
  const W = 80;
  const H = 10;
  const costW = (cost / maxCost) * (W * 0.5);
  const riskW = (risk / maxRisk) * (W * 0.5);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.02)" />
      {/* Cost bar (left side) */}
      <rect x={0} y={1} width={costW} height={H - 2} fill={ACCENT} opacity={isOptimal ? 0.8 : 0.4} />
      {/* Risk bar (right side) */}
      <rect x={W * 0.5} y={1} width={riskW} height={H - 2} fill={ORANGE} opacity={isOptimal ? 0.6 : 0.3} />
      {/* Divider */}
      <line x1={W * 0.5} y1={0} x2={W * 0.5} y2={H} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
      {/* Labels */}
      <text x={2} y={H / 2 + 0.5} dominantBaseline="middle" fill="rgba(255,255,255,0.3)" fontSize={4} fontFamily="monospace">
        COST
      </text>
      <text x={W * 0.5 + 2} y={H / 2 + 0.5} dominantBaseline="middle" fill="rgba(255,255,255,0.3)" fontSize={4} fontFamily="monospace">
        RISK
      </text>
    </svg>
  );
}

function FrontierChart({ strategies }: { strategies: ExecutionStrategy[] }) {
  const W = 280;
  const H = 100;
  const PAD = { top: 12, right: 20, bottom: 18, left: 32 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  if (strategies.length < 2) return null;

  const minRisk = Math.min(...strategies.map(s => s.riskBps));
  const maxRisk = Math.max(...strategies.map(s => s.riskBps));
  const minCost = Math.min(...strategies.map(s => s.expectedCostBps));
  const maxCost = Math.max(...strategies.map(s => s.expectedCostBps));
  const riskRange = maxRisk - minRisk || 1;
  const costRange = maxCost - minCost || 1;

  const xScale = (risk: number) => PAD.left + ((risk - minRisk) / riskRange) * plotW;
  const yScale = (cost: number) => PAD.top + plotH - ((cost - minCost) / costRange) * plotH;

  const optimal = strategies.reduce((a, b) => a.tradeoff < b.tradeoff ? a : b);

  // Sort by risk for the line
  const sorted = [...strategies].sort((a, b) => a.riskBps - b.riskBps);
  const linePath = sorted.map((s, i) =>
    `${i === 0 ? 'M' : 'L'}${xScale(s.riskBps).toFixed(1)},${yScale(s.expectedCostBps).toFixed(1)}`
  ).join(' ');

  return (
    <div className="py-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 100 }}>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = PAD.top + plotH * (1 - pct);
          const val = minCost + costRange * pct;
          return (
            <g key={pct}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
              <text x={PAD.left - 3} y={y + 1.5} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
        <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />

        {/* Axis labels */}
        <text x={W / 2} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">
          RISK (bps)
        </text>
        <text
          x={6}
          y={PAD.top + plotH / 2}
          textAnchor="middle"
          fill="rgba(255,255,255,0.2)"
          fontSize={5}
          fontFamily="monospace"
          transform={`rotate(-90, 6, ${PAD.top + plotH / 2})`}
        >
          COST (bps)
        </text>

        {/* Frontier line */}
        <path d={linePath} fill="none" stroke={ACCENT} strokeWidth={1} strokeOpacity={0.5} />

        {/* Strategy points */}
        {strategies.map(s => {
          const isOpt = s === optimal;
          return (
            <g key={s.strategy}>
              <circle
                cx={xScale(s.riskBps)}
                cy={yScale(s.expectedCostBps)}
                r={isOpt ? 4 : 2.5}
                fill={isOpt ? ACCENT : 'rgba(255,255,255,0.3)'}
                stroke={isOpt ? 'white' : 'none'}
                strokeWidth={isOpt ? 0.5 : 0}
              />
              <text
                x={xScale(s.riskBps)}
                y={yScale(s.expectedCostBps) - 5}
                textAnchor="middle"
                fill={isOpt ? ACCENT : 'rgba(255,255,255,0.4)'}
                fontSize={5}
                fontFamily="monospace"
                fontWeight={isOpt ? 'bold' : 'normal'}
              >
                {s.strategy.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Liquidity Metrics Tab ──

function LiquidityTab({ metrics }: { metrics: LiquidityMetrics }) {
  const t = useT();

  const rows: Array<{ label: string; value: string; color: string; desc: string }> = [
    {
      label: tr(t, 'mimAvgSpread', 'Avg Spread'),
      value: fmtBps(metrics.avgSpreadBps),
      color: costColor(metrics.avgSpreadBps),
      desc: 'Average quoted bid-ask spread',
    },
    {
      label: tr(t, 'mimAvgDepth', 'Avg Depth'),
      value: fmtDollars(metrics.avgDepthMM * 1_000_000),
      color: metrics.avgDepthMM > 5 ? GREEN : metrics.avgDepthMM > 1 ? YELLOW : RED,
      desc: 'Average market depth at best bid/ask',
    },
    {
      label: tr(t, 'mimVolConc', 'Vol Concentration'),
      value: fmtPct(metrics.volumeConcentration),
      color: metrics.volumeConcentration < 0.3 ? GREEN : metrics.volumeConcentration < 0.5 ? YELLOW : RED,
      desc: 'Volume concentration in top decile',
    },
    {
      label: tr(t, 'mimResiliency', 'Resiliency Score'),
      value: metrics.resiliencyScore.toFixed(1),
      color: scoreColor(metrics.resiliencyScore),
      desc: 'Speed of book recovery after large trades',
    },
    {
      label: tr(t, 'mimToxicity', 'Toxicity Index'),
      value: metrics.toxicityIndex.toFixed(2),
      color: metrics.toxicityIndex < 0.3 ? GREEN : metrics.toxicityIndex < 0.5 ? YELLOW : RED,
      desc: 'VPIN-based flow toxicity measure',
    },
    {
      label: tr(t, 'mimKyleLambda', "Kyle's Lambda"),
      value: metrics.kyleλ.toFixed(4),
      color: metrics.kyleλ < 0.001 ? GREEN : metrics.kyleλ < 0.005 ? YELLOW : RED,
      desc: 'Price impact per unit of order flow',
    },
    {
      label: tr(t, 'mimAmihud', 'Amihud Ratio'),
      value: (metrics.amihudRatio * 1e6).toFixed(2),
      color: metrics.amihudRatio * 1e6 < 0.5 ? GREEN : metrics.amihudRatio * 1e6 < 2 ? YELLOW : RED,
      desc: 'Illiquidity ratio (|ret| / volume) x10^6',
    },
    {
      label: tr(t, 'mimRollSpread', 'Roll Spread'),
      value: fmtBps(metrics.rollSpread),
      color: costColor(metrics.rollSpread),
      desc: 'Estimated effective spread (Roll model)',
    },
  ];

  return (
    <div className="px-2 py-1.5">
      <div className="flex flex-col gap-0">
        {rows.map(({ label, value, color, desc }) => (
          <div
            key={label}
            className="flex items-center justify-between py-1.5 border-b border-border/10 hover:bg-blue-400/[0.02]"
          >
            <div className="flex flex-col">
              <span className="text-[8px] font-mono font-bold text-neutral-300">{label}</span>
              <span className="text-[5px] font-mono text-neutral-700">{desc}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Mini gauge bar */}
              <MetricBar value={parseFloat(value)} label={label} />
              <span className="text-[10px] font-mono font-black tabular-nums" style={{ color }}>
                {value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Aggregate quality assessment */}
      <div className="mt-2 border border-border/20 px-2 py-1.5">
        <QualityGauge metrics={metrics} />
      </div>
    </div>
  );
}

function MetricBar({ value: _value, label }: { value: number; label: string }) {
  // Normalize to 0-1 based on metric type
  let normalized: number;
  let inverted = false;

  if (label.includes('Resiliency')) {
    normalized = _value / 100;
  } else if (label.includes('Toxicity')) {
    normalized = _value;
    inverted = true;
  } else if (label.includes('Depth')) {
    normalized = Math.min(_value / 10_000_000, 1);
  } else {
    normalized = Math.min(_value / 30, 1);
    inverted = true;
  }

  if (inverted) normalized = 1 - normalized;
  const clamped = Math.max(0, Math.min(1, normalized));

  const W = 32;
  const H = 4;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.03)" />
      <rect
        x={0}
        y={0}
        width={clamped * W}
        height={H}
        fill={clamped > 0.6 ? GREEN : clamped > 0.3 ? YELLOW : RED}
        opacity={0.5}
      />
    </svg>
  );
}

function QualityGauge({ metrics }: { metrics: LiquidityMetrics }) {
  const t = useT();

  // Composite quality score (higher is better)
  const spreadScore = Math.max(0, 100 - metrics.avgSpreadBps * 5);
  const depthScore = Math.min(100, metrics.avgDepthMM * 15);
  const resiliency = metrics.resiliencyScore;
  const toxScore = Math.max(0, 100 - metrics.toxicityIndex * 200);

  const composite = (spreadScore + depthScore + resiliency + toxScore) / 4;
  const quality = composite >= 75 ? 'HIGH' : composite >= 50 ? 'MODERATE' : composite >= 25 ? 'LOW' : 'POOR';
  const qualityColor = composite >= 75 ? GREEN : composite >= 50 ? YELLOW : composite >= 25 ? ORANGE : RED;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mimOverallQuality', 'Overall Market Quality')}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] font-mono font-black tabular-nums" style={{ color: qualityColor }}>
            {composite.toFixed(0)}
          </span>
          <span
            className="text-[6px] font-mono font-black uppercase px-1 py-0.5"
            style={{ color: qualityColor, backgroundColor: qualityColor + '18' }}
          >
            {quality}
          </span>
        </div>
      </div>
      {/* Score bar */}
      <div className="flex-1 max-w-[120px] ml-4">
        <svg viewBox="0 0 120 12" className="w-full" style={{ maxHeight: 12 }}>
          <rect x={0} y={2} width={120} height={8} fill="rgba(255,255,255,0.03)" />
          <rect
            x={0}
            y={2}
            width={(composite / 100) * 120}
            height={8}
            fill={qualityColor}
            opacity={0.5}
          />
          {/* Zone markers */}
          {[25, 50, 75].map(pct => (
            <line
              key={pct}
              x1={(pct / 100) * 120}
              y1={2}
              x2={(pct / 100) * 120}
              y2={10}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={0.5}
            />
          ))}
          {/* Marker */}
          <line
            x1={(composite / 100) * 120}
            y1={0}
            x2={(composite / 100) * 120}
            y2={12}
            stroke="white"
            strokeWidth={1}
          />
        </svg>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function MarketImpactModelPanel() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('impact');
  const { data, isLoading, error, refetch } = useMarketImpactModel();

  const d = data as MarketImpactData | undefined;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'impact', label: tr(t, 'mimImpactEst', 'IMPACT') },
    { key: 'shortfall', label: tr(t, 'mimShortfall', 'SHORTFALL') },
    { key: 'execution', label: tr(t, 'mimExecution', 'EXECUTION') },
    { key: 'liquidity', label: tr(t, 'mimLiquidity', 'LIQUIDITY') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          {/* Icon */}
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
            <path d="M2 14L6 6L10 10L14 2" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="6" r="1.5" fill={ACCENT} opacity="0.6" />
            <circle cx="10" cy="10" r="1.5" fill={ACCENT} opacity="0.6" />
            <circle cx="14" cy="2" r="1.5" fill={ACCENT} opacity="0.8" />
          </svg>
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'mimTitle', 'Market Impact Model')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d && (
            <span className="text-[6px] text-neutral-600">
              {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-blue-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-1 text-[7px] font-mono font-black uppercase tracking-wider transition-colors ${
              tab === key
                ? 'text-blue-400 border-b border-blue-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading state */}
        {isLoading && !d && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !d && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 px-4">
              <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
                {tr(t, 'mimError', 'Error loading data')}
              </span>
              <span className="text-[7px] font-mono text-neutral-600 text-center">
                {(error as Error)?.message || 'Unknown error'}
              </span>
              <button
                onClick={() => refetch()}
                className="mt-1 px-3 py-1 text-[7px] font-mono font-bold uppercase text-blue-400 border border-blue-400/30 hover:bg-blue-400/[0.05] transition-colors"
              >
                {tr(t, 'mimRetry', 'Retry')}
              </button>
            </div>
          </div>
        )}

        {/* No data state */}
        {!d && !isLoading && !error && (
          <div className="flex items-center justify-center h-full text-[10px] font-mono text-neutral-500 uppercase">
            {tr(t, 'mimNoData', 'No data available')}
          </div>
        )}

        {/* Data */}
        {d && (
          <>
            {tab === 'impact' && <ImpactEstimatesTab estimates={d.impactEstimates} />}
            {tab === 'shortfall' && <ShortfallTab orders={d.executedOrders} />}
            {tab === 'execution' && <ExecutionTab strategies={d.strategies} />}
            {tab === 'liquidity' && <LiquidityTab metrics={d.liquidityMetrics} />}
          </>
        )}
      </div>
    </div>
  );
}
