import { useCollateralManagement } from '../../api/hooks/use-collateral-management';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Formatting helpers --

function fmtAmt(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(1);
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtBps(n: number): string {
  return n.toFixed(0);
}

function fmtRate(n: number): string {
  return n.toFixed(2);
}

// -- Color helpers --

function utilizationColor(pct: number): string {
  if (pct >= 90) return 'text-red-400';
  if (pct >= 75) return 'text-yellow-400';
  if (pct >= 50) return 'text-lime-400';
  return 'text-neutral-400';
}

function utilizationBarColor(pct: number): string {
  if (pct >= 90) return 'bg-red-400';
  if (pct >= 75) return 'bg-yellow-400';
  return 'bg-lime-400';
}

function thresholdColor(status: string): string {
  const s = status.toUpperCase();
  if (s === 'BREACH' || s === 'EXCEEDED') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (s === 'WARNING' || s === 'NEAR') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (s === 'OK' || s === 'PASS' || s === 'COMPLIANT') return 'bg-green-400/20 text-green-400 border-green-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function complianceColor(compliant: boolean): string {
  return compliant ? 'text-green-400' : 'text-red-400';
}

// -- Interfaces --

interface CollateralPoolItem {
  type: string;
  available: number;
  pledged: number;
  free: number;
  haircut: number;
}

interface MarginRequirement {
  product: string;
  initialMargin: number;
  variationMargin: number;
  threshold: number;
  status: string;
}

interface HaircutScheduleItem {
  assetClass: string;
  tenor: string;
  standardHaircut: number;
  stressedHaircut: number;
  regulatoryMin: number;
}

interface ConcentrationLimit {
  issuer: string;
  limit: number;
  current: number;
  utilization: number;
}

interface TripartyBalance {
  agent: string;
  totalCollateral: number;
  cashPortion: number;
  nonCashPortion: number;
  netExposure: number;
}

interface RegulatoryMetric {
  metric: string;
  value: string;
  requirement: string;
  compliant: boolean;
}

interface CtdItem {
  security: string;
  type: string;
  availableQty: number;
  haircut: number;
  deliveryCost: number;
  savingsVsNext: number;
}

// -- Main Panel --

export function CollateralManagementPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCollateralManagement();

  const collateralPool = data?.collateralPool as CollateralPoolItem[] | undefined;
  const marginRequirements = data?.marginRequirements as MarginRequirement[] | undefined;
  const haircutSchedule = data?.haircutSchedule as HaircutScheduleItem[] | undefined;
  const concentrationLimits = data?.concentrationLimits as ConcentrationLimit[] | undefined;
  const tripartyBalances = data?.tripartyBalances as TripartyBalance[] | undefined;
  const regulatoryMetrics = data?.regulatoryMetrics as RegulatoryMetric[] | undefined;
  const ctdAnalysis = data?.ctdAnalysis as CtdItem[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-lime-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-lime-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-lime-400">
            {tr(t, 'panelCollateralManagement', 'Collateral Management')}
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
            {collateralPool && collateralPool.length > 0 && (
              <CollateralPoolSection items={collateralPool} />
            )}
            {marginRequirements && marginRequirements.length > 0 && (
              <MarginRequirementsSection items={marginRequirements} />
            )}
            {haircutSchedule && haircutSchedule.length > 0 && (
              <HaircutScheduleSection items={haircutSchedule} />
            )}
            {concentrationLimits && concentrationLimits.length > 0 && (
              <ConcentrationLimitsSection items={concentrationLimits} />
            )}
            {tripartyBalances && tripartyBalances.length > 0 && (
              <TripartyBalancesSection items={tripartyBalances} />
            )}
            {regulatoryMetrics && regulatoryMetrics.length > 0 && (
              <RegulatoryMetricsSection items={regulatoryMetrics} />
            )}
            {ctdAnalysis && ctdAnalysis.length > 0 && (
              <CtdAnalysisSection items={ctdAnalysis} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Collateral Pool Section --

function CollateralPoolSection({ items }: { items: CollateralPoolItem[] }) {
  return (
    <div className="border-b border-lime-400/30">
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Collateral Pool
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_64px_64px_48px] gap-0 px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Type
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Available
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Pledged
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Free
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Haircut
        </span>
      </div>

      {/* Rows */}
      {items.map((item) => (
        <div
          key={item.type}
          className="grid grid-cols-[1fr_64px_64px_64px_48px] gap-0 px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {item.type}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtAmt(item.available)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtAmt(item.pledged)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtAmt(item.free)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {fmtPct(item.haircut)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Margin Requirements Section --

function MarginRequirementsSection({ items }: { items: MarginRequirement[] }) {
  return (
    <div className="border-b border-lime-400/30">
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Margin Requirements
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_64px_56px_56px] gap-0 px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Product
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          IM
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          VM
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Threshold
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Status
        </span>
      </div>

      {/* Rows */}
      {items.map((item) => (
        <div
          key={item.product}
          className="grid grid-cols-[1fr_64px_64px_56px_56px] gap-0 px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {item.product}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtAmt(item.initialMargin)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtAmt(item.variationMargin)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtAmt(item.threshold)}
          </span>
          <div className="flex justify-end pr-2">
            <span
              className={`inline-block px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${thresholdColor(item.status)}`}
            >
              {item.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Haircut Schedule Section --

function HaircutScheduleSection({ items }: { items: HaircutScheduleItem[] }) {
  return (
    <div className="border-b border-lime-400/30">
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Haircut Schedule
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Asset Class
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Tenor
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Standard
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Stressed
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Reg Min
        </span>
      </div>

      {/* Rows */}
      {items.map((item, i) => (
        <div
          key={`${item.assetClass}-${item.tenor}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {item.assetClass}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {item.tenor}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(item.standardHaircut)}%
          </span>
          <span className="text-[8px] font-mono text-yellow-400 text-right">
            {fmtPct(item.stressedHaircut)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {fmtPct(item.regulatoryMin)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Concentration Limits Section --

function ConcentrationLimitsSection({ items }: { items: ConcentrationLimit[] }) {
  return (
    <div className="border-b border-lime-400/30">
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Concentration Limits
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_48px_72px] gap-0 px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Issuer
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Limit
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Current
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Util %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Capacity
        </span>
      </div>

      {/* Rows */}
      {items.map((item) => (
        <div
          key={item.issuer}
          className="grid grid-cols-[1fr_56px_56px_48px_72px] gap-0 px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {item.issuer}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtAmt(item.limit)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtAmt(item.current)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${utilizationColor(item.utilization)}`}>
            {fmtPct(item.utilization)}
          </span>
          {/* Utilization bar */}
          <div className="flex items-center gap-1 justify-end pr-2">
            <div className="w-14 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 left-0 h-full ${utilizationBarColor(item.utilization)}`}
                style={{ width: `${Math.min(item.utilization, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Triparty Balances Section --

function TripartyBalancesSection({ items }: { items: TripartyBalance[] }) {
  return (
    <div className="border-b border-lime-400/30">
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Triparty Balances
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_56px_56px_64px] gap-0 px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Agent
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Total
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Cash
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Non-Cash
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Net Exp
        </span>
      </div>

      {/* Rows */}
      {items.map((item) => (
        <div
          key={item.agent}
          className="grid grid-cols-[1fr_64px_56px_56px_64px] gap-0 px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {item.agent}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtAmt(item.totalCollateral)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtAmt(item.cashPortion)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtAmt(item.nonCashPortion)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right pr-2">
            {fmtAmt(item.netExposure)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Regulatory Metrics Section (UMR Compliance) --

function RegulatoryMetricsSection({ items }: { items: RegulatoryMetric[] }) {
  return (
    <div className="border-b border-lime-400/30">
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Regulatory Metrics (UMR)
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_72px_56px] gap-0 px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Metric
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Value
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Requirement
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Status
        </span>
      </div>

      {/* Rows */}
      {items.map((item) => (
        <div
          key={item.metric}
          className="grid grid-cols-[1fr_72px_72px_56px] gap-0 px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {item.metric}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {item.value}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {item.requirement}
          </span>
          <div className="flex justify-end pr-2">
            <span className={`text-[8px] font-mono font-bold ${complianceColor(item.compliant)}`}>
              {item.compliant ? 'PASS' : 'FAIL'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Cheapest-to-Deliver Analysis Section --

function CtdAnalysisSection({ items }: { items: CtdItem[] }) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Optimization: Cheapest-to-Deliver
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_48px_56px_56px] gap-0 px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Security
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Type
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Avail Qty
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Haircut
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Dlv Cost
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Savings
        </span>
      </div>

      {/* Rows */}
      {items.map((item, i) => (
        <div
          key={`${item.security}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_48px_56px_56px] gap-0 px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {item.security}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {item.type}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtAmt(item.availableQty)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtPct(item.haircut)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtRate(item.deliveryCost)}bp
          </span>
          <span className="text-[8px] font-mono font-bold text-green-400 text-right pr-2">
            {fmtBps(item.savingsVsNext)}bp
          </span>
        </div>
      ))}
    </div>
  );
}
