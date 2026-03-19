import { useCreditValuationAdjustment } from '../../api/hooks/use-credit-valuation-adjustment';
import { useT } from '../../i18n';
import { RefreshCw, ShieldAlert, BarChart3, AlertTriangle, TrendingUp } from 'lucide-react';

// -- i18n fallback helper --

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// -- Types --

interface Counterparty {
  name: string;
  rating: string;
  cvaCharge: number;
  dva: number;
  bilateralCva: number;
  nettingBenefit: number;
  exposure: number;
  spreadBps: number;
  sparkline: number[];
}

interface NettingSet {
  id: string;
  counterparty: string;
  productType: string;
  grossExposure: number;
  nettedExposure: number;
  collateral: number;
  cva: number;
  nettingRatio: number;
}

interface CvaVarSummary {
  cvaVar99: number;
  cvaVar95: number;
  stressedCvaVar: number;
  incrementalCvaVar: number;
  expectedShortfall: number;
  holdingPeriod: string;
  regulatoryMultiplier: number;
  capitalCharge: number;
  change1d: number;
  change1w: number;
  historicalSeries: number[];
  stressedSeries: number[];
}

interface WrongWayRisk {
  counterparty: string;
  riskType: string;
  correlation: number;
  exposure: number;
  adjustedCva: number;
  riskLevel: string;
  indicator: number;
}

// -- Formatting helpers --

function fmtM(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(1);
}

function fmtBps(n: number): string {
  return n.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// -- Color helpers --

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function ratingColor(rating: string): string {
  if (rating.startsWith('AAA') || rating.startsWith('Aaa')) return 'text-emerald-400';
  if (rating.startsWith('AA') || rating.startsWith('Aa')) return 'text-green-400';
  if (rating.startsWith('A')) return 'text-blue-400';
  if (rating.startsWith('BBB') || rating.startsWith('Baa')) return 'text-yellow-400';
  if (rating.startsWith('BB') || rating.startsWith('Ba')) return 'text-orange-400';
  return 'text-red-400';
}

function riskLevelColor(level: string): string {
  const l = level.toUpperCase();
  if (l === 'HIGH' || l === 'SEVERE') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (l === 'MEDIUM' || l === 'MODERATE') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (l === 'LOW') return 'bg-green-400/20 text-green-400 border-green-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function riskIndicatorFill(val: number): string {
  if (val >= 0.7) return '#f43f5e';
  if (val >= 0.4) return '#facc15';
  return '#4ade80';
}

// -- SVG Mini Sparkline --

function MiniSparkline({ data, width = 48, height = 14, color = '#fb7185' }: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// -- Main Panel --

export function CreditValuationAdjustmentPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCreditValuationAdjustment();

  const counterparties = (data?.counterparties ?? []) as Counterparty[];
  const nettingSets = (data?.nettingSets ?? []) as NettingSet[];
  const cvaVarSummary = data?.cvaVarSummary as CvaVarSummary | undefined;
  const wrongWayRisks = (data?.wrongWayRisks ?? []) as WrongWayRisk[];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-rose-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-rose-400">
            {tr(t, 'panelCreditValuationAdjustment', 'Credit Valuation Adjustment')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data ? (
          <div className="text-center py-8 text-rose-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        ) : !data && !isLoading ? (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        ) : data ? (
          <>
            {cvaVarSummary && <CvaVarSection summary={cvaVarSummary} />}
            {counterparties.length > 0 && <CounterpartySection counterparties={counterparties} />}
            {nettingSets.length > 0 && <NettingSetSection nettingSets={nettingSets} />}
            {wrongWayRisks.length > 0 && <WrongWayRiskSection risks={wrongWayRisks} />}
          </>
        ) : null}
      </div>
    </div>
  );
}

// -- CVA VaR & Stressed CVA Section --

function CvaVarSection({ summary }: { summary: CvaVarSummary }) {
  return (
    <div className="border-b border-rose-400/30">
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-rose-400/10 bg-[#030303]">
        <TrendingUp className="w-2.5 h-2.5 text-rose-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CVA VaR & Stressed CVA
        </span>
      </div>

      {/* Top metrics */}
      <div className="flex items-center gap-0 divide-x divide-rose-400/10 border-b border-border/20 bg-[#020202]">
        <div className="flex-1 px-2.5 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">CVA VaR 99%</div>
          <div className="text-[10px] font-mono font-bold text-rose-400 tabular-nums">{fmtM(summary.cvaVar99)}</div>
        </div>
        <div className="flex-1 px-2.5 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">CVA VaR 95%</div>
          <div className="text-[10px] font-mono font-bold text-white tabular-nums">{fmtM(summary.cvaVar95)}</div>
        </div>
        <div className="flex-1 px-2.5 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Stressed</div>
          <div className="text-[10px] font-mono font-bold text-orange-400 tabular-nums">{fmtM(summary.stressedCvaVar)}</div>
        </div>
        <div className="flex-1 px-2.5 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Exp Shortfall</div>
          <div className="text-[10px] font-mono font-bold text-white tabular-nums">{fmtM(summary.expectedShortfall)}</div>
        </div>
      </div>

      {/* Second row */}
      <div className="flex items-center gap-0 divide-x divide-rose-400/10 border-b border-border/20 bg-[#020202]">
        <div className="flex-1 px-2.5 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Incr CVA VaR</div>
          <div className="text-[10px] font-mono font-bold text-neutral-300 tabular-nums">{fmtM(summary.incrementalCvaVar)}</div>
        </div>
        <div className="flex-1 px-2.5 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Capital Chg</div>
          <div className="text-[10px] font-mono font-bold text-rose-400 tabular-nums">{fmtM(summary.capitalCharge)}</div>
        </div>
        <div className="flex-1 px-2.5 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Multiplier</div>
          <div className="text-[10px] font-mono font-bold text-neutral-300 tabular-nums">{summary.regulatoryMultiplier.toFixed(1)}x</div>
        </div>
        <div className="flex-1 px-2.5 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Period</div>
          <div className="text-[10px] font-mono font-bold text-neutral-400 tabular-nums">{String(summary.holdingPeriod)}</div>
        </div>
      </div>

      {/* Changes + sparklines */}
      <div className="flex items-center gap-0 divide-x divide-rose-400/10 bg-[#020202]">
        <div className="flex-1 px-2.5 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">1D Chg</div>
          <div className={`text-[10px] font-mono font-bold tabular-nums ${changeColor(summary.change1d)}`}>{fmtChg(summary.change1d)}%</div>
        </div>
        <div className="flex-1 px-2.5 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">1W Chg</div>
          <div className={`text-[10px] font-mono font-bold tabular-nums ${changeColor(summary.change1w)}`}>{fmtChg(summary.change1w)}%</div>
        </div>
        <div className="flex-1 px-2.5 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center mb-0.5">Hist VaR</div>
          <div className="flex justify-center">
            <MiniSparkline data={summary.historicalSeries} width={56} height={14} color="#fb7185" />
          </div>
        </div>
        <div className="flex-1 px-2.5 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center mb-0.5">Stressed</div>
          <div className="flex justify-center">
            <MiniSparkline data={summary.stressedSeries} width={56} height={14} color="#fb923c" />
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Counterparty CVA Table --

function CounterpartySection({ counterparties }: { counterparties: Counterparty[] }) {
  return (
    <div className="border-b border-rose-400/30">
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-rose-400/10 bg-[#030303]">
        <BarChart3 className="w-2.5 h-2.5 text-rose-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Counterparty CVA
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_30px_48px_48px_48px_40px_48px_48px] gap-0 px-2 py-0.5 border-b border-rose-400/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Name</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Rtg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CVA</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">DVA</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Bilat</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Net%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Sprd</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">Trend</span>
      </div>

      {/* Rows */}
      {counterparties.map((cp, i) => (
        <div
          key={`${String(cp.name)}-${i}`}
          className="grid grid-cols-[1fr_30px_48px_48px_48px_40px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-rose-400 truncate">{String(cp.name)}</span>
          <span className={`text-[8px] font-mono font-bold text-center ${ratingColor(String(cp.rating))}`}>{String(cp.rating)}</span>
          <span className="text-[8px] font-mono font-bold tabular-nums text-right text-white">{fmtM(cp.cvaCharge)}</span>
          <span className="text-[8px] font-mono tabular-nums text-right text-green-400">{fmtM(cp.dva)}</span>
          <span className={`text-[8px] font-mono font-bold tabular-nums text-right ${cp.bilateralCva >= 0 ? 'text-red-400' : 'text-green-400'}`}>{fmtM(cp.bilateralCva)}</span>
          <span className="text-[8px] font-mono tabular-nums text-right text-neutral-400">{fmtPct(cp.nettingBenefit)}%</span>
          <span className="text-[8px] font-mono tabular-nums text-right text-neutral-400">{fmtBps(cp.spreadBps)}</span>
          <div className="flex justify-end pr-1">
            <MiniSparkline data={cp.sparkline} width={40} height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Netting Set Breakdown --

function NettingSetSection({ nettingSets }: { nettingSets: NettingSet[] }) {
  // Group by product type for the product bar summary
  const productMap = new Map<string, { gross: number; netted: number; cva: number }>();
  for (const ns of nettingSets) {
    const existing = productMap.get(ns.productType) ?? { gross: 0, netted: 0, cva: 0 };
    existing.gross += ns.grossExposure;
    existing.netted += ns.nettedExposure;
    existing.cva += ns.cva;
    productMap.set(ns.productType, existing);
  }
  const productBreakdown = Array.from(productMap.entries())
    .map(([type, vals]) => ({ type, ...vals }))
    .sort((a, b) => b.cva - a.cva);
  const maxProductCva = Math.max(...productBreakdown.map((p) => p.cva), 1);

  return (
    <div className="border-b border-rose-400/30">
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-rose-400/10 bg-[#030303]">
        <BarChart3 className="w-2.5 h-2.5 text-rose-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Netting Set Breakdown
        </span>
      </div>

      {/* Product type bars */}
      <div className="px-2 py-1.5 border-b border-border/20 bg-[#020202]">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">CVA by Product Type</div>
        <div className="space-y-1">
          {productBreakdown.map((prod) => (
            <div key={prod.type} className="flex items-center gap-1.5">
              <span className="text-[7px] font-mono text-neutral-400 w-14 truncate shrink-0">{prod.type}</span>
              <div className="flex-1 h-2 bg-neutral-900 relative">
                <div
                  className="absolute top-0 left-0 h-full bg-rose-400/60"
                  style={{ width: `${(prod.cva / maxProductCva) * 100}%` }}
                />
              </div>
              <span className="text-[7px] font-mono tabular-nums text-rose-400 w-10 text-right shrink-0">{fmtM(prod.cva)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Netting set table header */}
      <div className="grid grid-cols-[1fr_56px_56px_48px_48px_64px] gap-0 px-2 py-0.5 border-b border-rose-400/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Set / CP</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Gross</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Netted</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Coll</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CVA</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">Net Ratio</span>
      </div>

      {/* Rows */}
      {nettingSets.map((ns, i) => (
        <div
          key={`${String(ns.id)}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_48px_48px_64px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors items-center"
        >
          <div className="truncate">
            <span className="text-[8px] font-mono font-bold text-rose-400">{String(ns.id)}</span>
            <span className="text-[7px] font-mono text-neutral-600 ml-1">{String(ns.counterparty)}</span>
          </div>
          <span className="text-[8px] font-mono tabular-nums text-right text-neutral-300">{fmtM(ns.grossExposure)}</span>
          <span className="text-[8px] font-mono tabular-nums text-right text-white font-bold">{fmtM(ns.nettedExposure)}</span>
          <span className="text-[8px] font-mono tabular-nums text-right text-neutral-400">{fmtM(ns.collateral)}</span>
          <span className="text-[8px] font-mono font-bold tabular-nums text-right text-rose-400">{fmtM(ns.cva)}</span>
          {/* Netting ratio bar */}
          <div className="flex items-center gap-1 justify-end pr-1">
            <svg width={28} height={8} className="inline-block">
              <rect x={0} y={0} width={28} height={8} fill="#171717" />
              <rect
                x={0}
                y={0}
                width={Math.min(ns.nettingRatio, 1) * 28}
                height={8}
                fill={ns.nettingRatio >= 0.5 ? '#4ade80' : ns.nettingRatio >= 0.3 ? '#facc15' : '#f43f5e'}
                opacity={0.6}
              />
            </svg>
            <span className="text-[7px] font-mono tabular-nums text-neutral-400 w-7 text-right">{fmtPct(ns.nettingRatio * 100)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Wrong-Way Risk Section --

function WrongWayRiskSection({ risks }: { risks: WrongWayRisk[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-rose-400/10 bg-[#030303]">
        <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Wrong-Way Risk Indicators
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_44px_52px_52px_52px] gap-0 px-2 py-0.5 border-b border-rose-400/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Counterparty</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Type</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Corr</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Exp</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Adj CVA</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">Level</span>
      </div>

      {/* Rows */}
      {risks.map((risk, i) => (
        <div
          key={`${String(risk.counterparty)}-${i}`}
          className="grid grid-cols-[1fr_64px_44px_52px_52px_52px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors items-center"
        >
          <div className="flex items-center gap-1.5 truncate">
            <svg width={6} height={6} className="shrink-0">
              <circle cx={3} cy={3} r={3} fill={riskIndicatorFill(risk.indicator)} />
            </svg>
            <span className="text-[8px] font-mono font-bold text-rose-400 truncate">{String(risk.counterparty)}</span>
          </div>
          <span className="text-[8px] font-mono text-neutral-400 truncate">{String(risk.riskType)}</span>
          <span className="text-[8px] font-mono font-bold tabular-nums text-right text-white">{risk.correlation.toFixed(2)}</span>
          <span className="text-[8px] font-mono tabular-nums text-right text-neutral-300">{fmtM(risk.exposure)}</span>
          <span className="text-[8px] font-mono font-bold tabular-nums text-right text-rose-400">{fmtM(risk.adjustedCva)}</span>
          <div className="flex justify-end pr-1">
            <span className={`inline-block px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${riskLevelColor(String(risk.riskLevel))}`}>
              {String(risk.riskLevel)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
