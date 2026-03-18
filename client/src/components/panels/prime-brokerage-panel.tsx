import { usePrimeBrokerage } from '../../api/hooks/use-prime-brokerage';
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

function fmtAum(n: number): string {
  return n.toFixed(1);
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtRate(n: number): string {
  return n.toFixed(2);
}

function fmtBps(n: number): string {
  return n.toFixed(0);
}

function fmtNotional(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// -- Color helpers --

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendArrow(n: number): string {
  if (n > 0) return '\u25B2';
  if (n < 0) return '\u25BC';
  return '\u25C6';
}

function utilizationColor(pct: number): string {
  if (pct >= 90) return 'text-red-400';
  if (pct >= 75) return 'text-yellow-400';
  if (pct >= 50) return 'text-cyan-400';
  return 'text-neutral-400';
}

function utilizationBar(pct: number): string {
  if (pct >= 90) return 'bg-red-400';
  if (pct >= 75) return 'bg-yellow-400';
  if (pct >= 50) return 'bg-cyan-400';
  return 'bg-neutral-500';
}

// -- Interfaces --

interface BrokerRanking {
  name: string;
  aum: number;
  clients: number;
  marketShare: number;
  change1q: number;
}

interface MarginFinancing {
  collateralType: string;
  rate: number;
  spread: number;
  change1w: number;
  haircut: number;
}

interface SecuritiesLending {
  ticker: string;
  borrowCost: number;
  utilization: number;
  availableQty: number;
  hardToBorrow: boolean;
  change1d: number;
}

interface SyntheticFinancing {
  underlying: string;
  trsRate: number;
  swapNotional: number;
  tenor: string;
  change1w: number;
}

interface ClientFlow {
  strategy: string;
  netExposure: number;
  grossExposure: number;
  longPct: number;
  shortPct: number;
  trend: number;
}

interface CapitalIntro {
  event: string;
  date: string;
  participants: number;
  aumRaised: number;
  status: string;
}

interface RegulatoryImpact {
  metric: string;
  value: string;
  threshold: string;
  change1m: number;
  trend: number;
}

// -- Main Panel --

export function PrimeBrokeragePanel() {
  const t = useT();
  const { data, isLoading, refetch } = usePrimeBrokerage();

  const brokerRankings = data?.brokerRankings as BrokerRanking[] | undefined;
  const marginFinancing = data?.marginFinancing as MarginFinancing[] | undefined;
  const securitiesLending = data?.securitiesLending as SecuritiesLending[] | undefined;
  const syntheticFinancing = data?.syntheticFinancing as SyntheticFinancing[] | undefined;
  const clientFlows = data?.clientFlows as ClientFlow[] | undefined;
  const capitalIntro = data?.capitalIntro as CapitalIntro[] | undefined;
  const regulatoryImpact = data?.regulatoryImpact as RegulatoryImpact[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-cyan-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-cyan-400">
            {tr(t, 'panelPrimeBrokerage', 'Prime Brokerage')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
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
            {brokerRankings && brokerRankings.length > 0 && (
              <BrokerRankingsSection rankings={brokerRankings} t={t} />
            )}
            {marginFinancing && marginFinancing.length > 0 && (
              <MarginFinancingSection items={marginFinancing} t={t} />
            )}
            {securitiesLending && securitiesLending.length > 0 && (
              <SecuritiesLendingSection items={securitiesLending} t={t} />
            )}
            {syntheticFinancing && syntheticFinancing.length > 0 && (
              <SyntheticFinancingSection items={syntheticFinancing} t={t} />
            )}
            {clientFlows && clientFlows.length > 0 && (
              <ClientFlowsSection flows={clientFlows} t={t} />
            )}
            {capitalIntro && capitalIntro.length > 0 && (
              <CapitalIntroSection events={capitalIntro} t={t} />
            )}
            {regulatoryImpact && regulatoryImpact.length > 0 && (
              <RegulatoryImpactSection metrics={regulatoryImpact} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Broker Rankings Section --

function BrokerRankingsSection({
  rankings,
  t,
}: {
  rankings: BrokerRanking[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-cyan-400/30">
      <div className="px-3 py-1 border-b border-cyan-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'pbBrokerRankings', 'Broker Rankings')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_64px_48px] gap-0 px-2 py-0.5 border-b border-cyan-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Broker
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          AUM $B
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Clients
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Mkt Share
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          1Q Chg
        </span>
      </div>

      {/* Rows */}
      {rankings.map((r, i) => (
        <div
          key={`${r.name}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_64px_48px] gap-0 px-2 py-[3px] border-b border-cyan-400/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-cyan-400 truncate">
            {r.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtAum(r.aum)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {r.clients.toLocaleString()}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-10 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-cyan-400"
                style={{ width: `${Math.min(r.marketShare, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-white w-8 text-right">
              {fmtPct(r.marketShare)}%
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(r.change1q)}`}>
            {fmtChg(r.change1q)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Margin Financing Section --

function MarginFinancingSection({
  items,
  t,
}: {
  items: MarginFinancing[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-cyan-400/30">
      <div className="px-3 py-1 border-b border-cyan-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'pbMarginFinancing', 'Margin Financing')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_48px_48px] gap-0 px-2 py-0.5 border-b border-cyan-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Collateral
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Rate %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Spread
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          1W Chg
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Haircut
        </span>
      </div>

      {/* Rows */}
      {items.map((m, i) => (
        <div
          key={`${m.collateralType}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_48px_48px] gap-0 px-2 py-[3px] border-b border-cyan-400/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-cyan-400 truncate">
            {m.collateralType}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(m.rate)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtBps(m.spread)}bp
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(m.change1w)}`}>
            {fmtChg(m.change1w)}bp
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {fmtPct(m.haircut)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Securities Lending Section --

function SecuritiesLendingSection({
  items,
  t,
}: {
  items: SecuritiesLending[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-cyan-400/30">
      <div className="px-3 py-1 border-b border-cyan-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'pbSecLending', 'Securities Lending')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[64px_56px_64px_56px_40px_48px] gap-0 px-2 py-0.5 border-b border-cyan-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Ticker
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Cost %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Utiliz
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Avail K
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          HTB
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          1D Chg
        </span>
      </div>

      {/* Rows */}
      {items.map((s, i) => (
        <div
          key={`${s.ticker}-${i}`}
          className="grid grid-cols-[64px_56px_64px_56px_40px_48px] gap-0 px-2 py-[3px] border-b border-cyan-400/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-cyan-400 truncate">
            {s.ticker}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(s.borrowCost)}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-10 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 left-0 h-full ${utilizationBar(s.utilization)}`}
                style={{ width: `${Math.min(s.utilization, 100)}%` }}
              />
            </div>
            <span className={`text-[8px] font-mono font-bold w-7 text-right ${utilizationColor(s.utilization)}`}>
              {fmtPct(s.utilization)}
            </span>
          </div>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {s.availableQty.toLocaleString()}
          </span>
          <span className="text-[8px] font-mono text-center">
            {s.hardToBorrow ? (
              <span className="text-red-400 font-bold">YES</span>
            ) : (
              <span className="text-neutral-600">NO</span>
            )}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(s.change1d)}`}>
            {fmtChg(s.change1d)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Synthetic Financing Section --

function SyntheticFinancingSection({
  items,
  t,
}: {
  items: SyntheticFinancing[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-cyan-400/30">
      <div className="px-3 py-1 border-b border-cyan-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'pbSyntheticFinancing', 'Synthetic Financing')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_64px_48px_48px] gap-0 px-2 py-0.5 border-b border-cyan-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Underlying
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          TRS %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Notional $M
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Tenor
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          1W Chg
        </span>
      </div>

      {/* Rows */}
      {items.map((s, i) => (
        <div
          key={`${s.underlying}-${i}`}
          className="grid grid-cols-[1fr_56px_64px_48px_48px] gap-0 px-2 py-[3px] border-b border-cyan-400/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-cyan-400 truncate">
            {s.underlying}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(s.trsRate)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtNotional(s.swapNotional)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {s.tenor}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(s.change1w)}`}>
            {fmtChg(s.change1w)}bp
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Client Flows Section --

function ClientFlowsSection({
  flows,
  t,
}: {
  flows: ClientFlow[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-cyan-400/30">
      <div className="px-3 py-1 border-b border-cyan-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'pbClientFlows', 'Client Flows')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_80px_32px] gap-0 px-2 py-0.5 border-b border-cyan-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Strategy
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Net Exp %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Gross %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Long / Short
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Trend
        </span>
      </div>

      {/* Rows */}
      {flows.map((f, i) => (
        <div
          key={`${f.strategy}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_80px_32px] gap-0 px-2 py-[3px] border-b border-cyan-400/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-cyan-400 truncate">
            {f.strategy}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(f.netExposure)}`}>
            {fmtChg(f.netExposure)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(f.grossExposure)}
          </span>
          {/* Long/Short bar */}
          <div className="flex items-center gap-0.5 justify-end">
            <span className="text-[7px] font-mono text-green-400 w-6 text-right">
              {fmtPct(f.longPct)}
            </span>
            <div className="w-16 h-1.5 bg-neutral-800 relative flex">
              <div
                className="h-full bg-green-400/60"
                style={{ width: `${f.longPct}%` }}
              />
              <div
                className="h-full bg-red-400/60"
                style={{ width: `${f.shortPct}%` }}
              />
            </div>
            <span className="text-[7px] font-mono text-red-400 w-6">
              {fmtPct(f.shortPct)}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(f.trend)}`}>
            {trendArrow(f.trend)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Capital Introduction Section --

function CapitalIntroSection({
  events,
  t,
}: {
  events: CapitalIntro[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-cyan-400/30">
      <div className="px-3 py-1 border-b border-cyan-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'pbCapitalIntro', 'Capital Introduction')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-cyan-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Event
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Date
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Attendees
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          AUM $M
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Status
        </span>
      </div>

      {/* Rows */}
      {events.map((e, i) => (
        <div
          key={`${e.event}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-cyan-400/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-cyan-400 truncate">
            {e.event}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {e.date}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {e.participants.toLocaleString()}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtNotional(e.aumRaised)}
          </span>
          <span className="text-[8px] font-mono text-right pr-2">
            {e.status.toUpperCase() === 'ACTIVE' ? (
              <span className="text-green-400 font-bold">{e.status}</span>
            ) : e.status.toUpperCase() === 'UPCOMING' ? (
              <span className="text-cyan-400 font-bold">{e.status}</span>
            ) : (
              <span className="text-neutral-500">{e.status}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Regulatory Impact Section --

function RegulatoryImpactSection({
  metrics,
  t,
}: {
  metrics: RegulatoryImpact[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-cyan-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'pbRegulatoryImpact', 'Regulatory Impact')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_64px_48px_32px] gap-0 px-2 py-0.5 border-b border-cyan-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Metric
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Value
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Threshold
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          1M Chg
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Trend
        </span>
      </div>

      {/* Rows */}
      {metrics.map((m, i) => (
        <div
          key={`${m.metric}-${i}`}
          className="grid grid-cols-[1fr_64px_64px_48px_32px] gap-0 px-2 py-[3px] border-b border-cyan-400/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {m.metric}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {m.value}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {m.threshold}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(m.change1m)}`}>
            {fmtChg(m.change1m)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(m.trend)}`}>
            {trendArrow(m.trend)}
          </span>
        </div>
      ))}
    </div>
  );
}
