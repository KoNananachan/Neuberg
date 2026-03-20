import { useCvaMonitor } from '../../api/hooks/use-cva-monitor';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtM(n: number): string {
  return n.toFixed(1);
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtBps(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// -- Color helpers --

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function riskColor(level: string): string {
  const l = level.toUpperCase();
  if (l === 'HIGH') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (l === 'MEDIUM') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (l === 'LOW') return 'bg-green-400/20 text-green-400 border-green-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function effectivenessColor(pct: number): string {
  if (pct >= 80) return 'text-green-400';
  if (pct >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function effectivenessBar(pct: number): string {
  if (pct >= 80) return 'bg-green-400';
  if (pct >= 50) return 'bg-yellow-400';
  return 'bg-red-400';
}

// -- Interfaces --

interface XvaSummary {
  cva: number;
  dva: number;
  fva: number;
  kva: number;
  mva: number;
}

interface CounterpartyExposure {
  counterparty: string;
  rating: string;
  pfe: number;
  expectedExposure: number;
  cvaCharge: number;
  change1d: number;
}

interface CvaByProduct {
  product: string;
  notional: number;
  cva: number;
  cvaPct: number;
  change1w: number;
}

interface WrongWayRisk {
  counterparty: string;
  riskType: string;
  correlation: number;
  exposure: number;
  riskLevel: string;
}

interface CvaHedge {
  instrument: string;
  notional: number;
  hedgeType: string;
  effectiveness: number;
  pnl1d: number;
}

interface RegulatoryCapital {
  approach: string;
  rwa: number;
  capitalCharge: number;
  change1q: number;
}

interface CvaPnlDriver {
  driver: string;
  impact: number;
  category: string;
  description: string;
}

// -- Main Panel --

export function CvaMonitorPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCvaMonitor();

  const xvaSummary = data?.xvaSummary as XvaSummary | undefined;
  const counterpartyExposures = data?.counterpartyExposures as CounterpartyExposure[] | undefined;
  const cvaByProduct = data?.cvaByProduct as CvaByProduct[] | undefined;
  const wrongWayRisks = data?.wrongWayRisks as WrongWayRisk[] | undefined;
  const cvaHedges = data?.cvaHedges as CvaHedge[] | undefined;
  const regulatoryCapital = data?.regulatoryCapital as RegulatoryCapital[] | undefined;
  const cvaPnlDrivers = data?.cvaPnlDrivers as CvaPnlDriver[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-fuchsia-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-fuchsia-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-fuchsia-400">
            {tr(t, 'panelCvaMonitor', 'CVA Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-fuchsia-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-fuchsia-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            {xvaSummary && <XvaSummaryBar summary={xvaSummary} />}
            {counterpartyExposures && counterpartyExposures.length > 0 && (
              <CounterpartyExposureSection exposures={counterpartyExposures} />
            )}
            {cvaByProduct && cvaByProduct.length > 0 && (
              <CvaByProductSection products={cvaByProduct} />
            )}
            {wrongWayRisks && wrongWayRisks.length > 0 && (
              <WrongWayRiskSection risks={wrongWayRisks} />
            )}
            {cvaHedges && cvaHedges.length > 0 && (
              <CvaHedgingSection hedges={cvaHedges} />
            )}
            {regulatoryCapital && regulatoryCapital.length > 0 && (
              <RegulatoryCapitalSection capital={regulatoryCapital} />
            )}
            {cvaPnlDrivers && cvaPnlDrivers.length > 0 && (
              <CvaPnlDriversSection drivers={cvaPnlDrivers} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- XVA Summary Bar --

function XvaSummaryBar({ summary }: { summary: XvaSummary }) {
  return (
    <div className="border-b border-fuchsia-400/30 bg-[#030303]">
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          XVA Summary ($M)
        </span>
      </div>
      <div className="flex items-center gap-0 divide-x divide-fuchsia-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">CVA</div>
          <div className="text-[10px] font-mono font-bold text-fuchsia-400">
            {fmtM(summary.cva)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">DVA</div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtM(summary.dva)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">FVA</div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtM(summary.fva)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">KVA</div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtM(summary.kva)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">MVA</div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtM(summary.mva)}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Counterparty Exposure Section --

function CounterpartyExposureSection({
  exposures,
}: {
  exposures: CounterpartyExposure[];
}) {
  return (
    <div className="border-b border-fuchsia-400/30">
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Counterparty Exposure
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_40px_56px_56px_56px_48px] gap-0 px-2 py-0.5 border-b border-fuchsia-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Counterparty
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Rtg
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          PFE $M
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          EE $M
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          CVA $M
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {'\u0394'}1D
        </span>
      </div>

      {/* Rows */}
      {exposures.map((exp, i) => (
        <div
          key={`${exp.counterparty}-${i}`}
          className="grid grid-cols-[1fr_40px_56px_56px_56px_48px] gap-0 px-2 py-[3px] border-b border-fuchsia-400/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-fuchsia-400 truncate">
            {exp.counterparty}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-center">
            {exp.rating}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtM(exp.pfe)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtM(exp.expectedExposure)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtM(exp.cvaCharge)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(exp.change1d)}`}>
            {fmtChg(exp.change1d)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- CVA by Product Section --

function CvaByProductSection({
  products,
}: {
  products: CvaByProduct[];
}) {
  return (
    <div className="border-b border-fuchsia-400/30">
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CVA by Product
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_56px_80px_48px] gap-0 px-2 py-0.5 border-b border-fuchsia-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Product
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Notl $M
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          CVA $M
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          CVA %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          1W Chg
        </span>
      </div>

      {/* Rows */}
      {products.map((prod) => (
        <div
          key={prod.product}
          className="grid grid-cols-[1fr_64px_56px_80px_48px] gap-0 px-2 py-[3px] border-b border-fuchsia-400/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-fuchsia-400 truncate">
            {prod.product}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtM(prod.notional)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtM(prod.cva)}
          </span>
          {/* CVA % bar */}
          <div className="flex items-center gap-1 justify-end">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-fuchsia-400"
                style={{ width: `${Math.min(prod.cvaPct, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-white w-8 text-right">
              {fmtPct(prod.cvaPct)}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(prod.change1w)}`}>
            {fmtChg(prod.change1w)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Wrong-Way Risk Section --

function WrongWayRiskSection({
  risks,
}: {
  risks: WrongWayRisk[];
}) {
  return (
    <div className="border-b border-fuchsia-400/30">
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Wrong-Way Risk
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_48px_56px_56px] gap-0 px-2 py-0.5 border-b border-fuchsia-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Counterparty
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Risk Type
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Corr
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Exp $M
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Level
        </span>
      </div>

      {/* Rows */}
      {risks.map((risk, i) => (
        <div
          key={`${risk.counterparty}-${i}`}
          className="grid grid-cols-[1fr_72px_48px_56px_56px] gap-0 px-2 py-[3px] border-b border-fuchsia-400/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-fuchsia-400 truncate">
            {risk.counterparty}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {risk.riskType}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {risk.correlation.toFixed(2)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtM(risk.exposure)}
          </span>
          <div className="flex justify-end pr-2">
            <span
              className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${riskColor(risk.riskLevel)}`}
            >
              {risk.riskLevel}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// -- CVA Hedging Section --

function CvaHedgingSection({
  hedges,
}: {
  hedges: CvaHedge[];
}) {
  return (
    <div className="border-b border-fuchsia-400/30">
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CVA Hedging Portfolio
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_64px_80px_48px] gap-0 px-2 py-0.5 border-b border-fuchsia-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Instrument
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Notl $M
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Type
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Eff %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          P&L 1D
        </span>
      </div>

      {/* Rows */}
      {hedges.map((hedge, i) => (
        <div
          key={`${hedge.instrument}-${i}`}
          className="grid grid-cols-[1fr_64px_64px_80px_48px] gap-0 px-2 py-[3px] border-b border-fuchsia-400/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-fuchsia-400 truncate">
            {hedge.instrument}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtM(hedge.notional)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {hedge.hedgeType}
          </span>
          {/* Effectiveness bar */}
          <div className="flex items-center gap-1 justify-end">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 left-0 h-full ${effectivenessBar(hedge.effectiveness)}`}
                style={{ width: `${Math.min(hedge.effectiveness, 100)}%` }}
              />
            </div>
            <span className={`text-[8px] font-mono font-bold w-8 text-right ${effectivenessColor(hedge.effectiveness)}`}>
              {fmtPct(hedge.effectiveness)}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(hedge.pnl1d)}`}>
            {fmtChg(hedge.pnl1d)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Regulatory Capital Section --

function RegulatoryCapitalSection({
  capital,
}: {
  capital: RegulatoryCapital[];
}) {
  return (
    <div className="border-b border-fuchsia-400/30">
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Regulatory Capital
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_72px_56px] gap-0 px-2 py-0.5 border-b border-fuchsia-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Approach
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          RWA $M
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Capital $M
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {'\u0394'}1Q
        </span>
      </div>

      {/* Rows */}
      {capital.map((cap) => (
        <div
          key={cap.approach}
          className="grid grid-cols-[1fr_72px_72px_56px] gap-0 px-2 py-[3px] border-b border-fuchsia-400/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-fuchsia-400">
            {cap.approach}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtM(cap.rwa)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtM(cap.capitalCharge)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(cap.change1q)}`}>
            {fmtChg(cap.change1q)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- CVA P&L Drivers Section --

function CvaPnlDriversSection({
  drivers,
}: {
  drivers: CvaPnlDriver[];
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Top CVA P&L Drivers
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_64px_1fr] gap-0 px-2 py-0.5 border-b border-fuchsia-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Driver
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Impact $M
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Category
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider pr-2">
          Description
        </span>
      </div>

      {/* Rows */}
      {drivers.map((drv, i) => (
        <div
          key={`${drv.driver}-${i}`}
          className="grid grid-cols-[1fr_56px_64px_1fr] gap-0 px-2 py-[3px] border-b border-fuchsia-400/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-fuchsia-400 truncate">
            {drv.driver}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(drv.impact)}`}>
            {fmtChg(drv.impact)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {drv.category}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 truncate pr-2">
            {drv.description}
          </span>
        </div>
      ))}
    </div>
  );
}
