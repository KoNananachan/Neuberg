import { useElectionRisk } from '../../api/hooks/use-election-risk';
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

function fmtPct(n: number): string {
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

function riskColor(level: string): string {
  const l = level.toUpperCase();
  if (l === 'HIGH' || l === 'CRITICAL') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (l === 'MEDIUM' || l === 'MODERATE') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (l === 'LOW') return 'bg-green-400/20 text-green-400 border-green-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function severityColor(level: string): string {
  const l = level.toUpperCase();
  if (l === 'HIGH' || l === 'CRITICAL') return 'text-red-400';
  if (l === 'MEDIUM' || l === 'ELEVATED') return 'text-yellow-400';
  if (l === 'LOW') return 'text-green-400';
  return 'text-neutral-500';
}

function oddsBarWidth(pct: number): number {
  return Math.min(Math.max(pct, 0), 100);
}

// -- Interfaces --

interface UpcomingElection {
  country: string;
  date: string;
  type: string;
  frontrunner: string;
  pollingMargin: number;
}

interface PolicyRisk {
  country: string;
  fiscal: string;
  trade: string;
  monetary: string;
  regulatory: string;
  overall: string;
}

interface MarketSensitivity {
  scenario: string;
  equities: number;
  bonds: number;
  fx: number;
  commodities: number;
  probability: number;
}

interface HistoricalPattern {
  event: string;
  year: number;
  preElectionVol: number;
  postElectionMove: number;
  settleDays: number;
  asset: string;
}

interface PredictionMarket {
  market: string;
  candidate: string;
  odds: number;
  change24h: number;
  volume: number;
}

interface GeopoliticalHotspot {
  region: string;
  riskLevel: string;
  trigger: string;
  affectedAssets: string;
  probability: number;
}

interface LegislativeItem {
  bill: string;
  status: string;
  sector: string;
  impact: string;
  passOdds: number;
}

// -- Main Panel --

export function ElectionRiskPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useElectionRisk();

  const upcomingElections = data?.upcomingElections as UpcomingElection[] | undefined;
  const policyRisks = data?.policyRisks as PolicyRisk[] | undefined;
  const marketSensitivity = data?.marketSensitivity as MarketSensitivity[] | undefined;
  const historicalPatterns = data?.historicalPatterns as HistoricalPattern[] | undefined;
  const predictionMarkets = data?.predictionMarkets as PredictionMarket[] | undefined;
  const geopoliticalHotspots = data?.geopoliticalHotspots as GeopoliticalHotspot[] | undefined;
  const legislativeTracker = data?.legislativeTracker as LegislativeItem[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-red-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-red-400">
            {tr(t, 'panelElectionRisk', 'Election Risk Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
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
            {upcomingElections && upcomingElections.length > 0 && (
              <UpcomingElectionsSection elections={upcomingElections} />
            )}
            {policyRisks && policyRisks.length > 0 && (
              <PolicyRiskSection risks={policyRisks} />
            )}
            {marketSensitivity && marketSensitivity.length > 0 && (
              <MarketSensitivitySection scenarios={marketSensitivity} />
            )}
            {historicalPatterns && historicalPatterns.length > 0 && (
              <HistoricalPatternsSection patterns={historicalPatterns} />
            )}
            {predictionMarkets && predictionMarkets.length > 0 && (
              <PredictionMarketsSection markets={predictionMarkets} />
            )}
            {geopoliticalHotspots && geopoliticalHotspots.length > 0 && (
              <GeopoliticalHotspotsSection hotspots={geopoliticalHotspots} />
            )}
            {legislativeTracker && legislativeTracker.length > 0 && (
              <LegislativeTrackerSection items={legislativeTracker} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Upcoming Elections Section --

function UpcomingElectionsSection({ elections }: { elections: UpcomingElection[] }) {
  return (
    <div className="border-b border-red-400/30">
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Upcoming Elections
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_64px_1fr_56px] gap-0 px-2 py-0.5 border-b border-red-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Country
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Date
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Type
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Frontrunner
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Margin
        </span>
      </div>

      {/* Rows */}
      {elections.map((e, i) => (
        <div
          key={`${e.country}-${e.date}-${i}`}
          className="grid grid-cols-[1fr_72px_64px_1fr_56px] gap-0 px-2 py-[3px] border-b border-red-400/5 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-red-400 truncate">
            {e.country}
          </span>
          <span className="text-[8px] font-mono text-neutral-400">
            {e.date}
          </span>
          <span className="text-[8px] font-mono text-neutral-500">
            {e.type}
          </span>
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {e.frontrunner}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${e.pollingMargin >= 10 ? 'text-green-400' : e.pollingMargin >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
            {fmtChg(e.pollingMargin)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Policy Risk Matrix Section --

function PolicyRiskSection({ risks }: { risks: PolicyRisk[] }) {
  return (
    <div className="border-b border-red-400/30">
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Policy Risk Matrix
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-red-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Country
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Fiscal
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Trade
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Monetary
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Regulatory
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center pr-2">
          Overall
        </span>
      </div>

      {/* Rows */}
      {risks.map((r) => (
        <div
          key={r.country}
          className="grid grid-cols-[1fr_56px_56px_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-red-400/5 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-red-400 truncate">
            {r.country}
          </span>
          <span className={`text-[7px] font-mono font-bold text-center ${severityColor(r.fiscal)}`}>
            {r.fiscal.toUpperCase()}
          </span>
          <span className={`text-[7px] font-mono font-bold text-center ${severityColor(r.trade)}`}>
            {r.trade.toUpperCase()}
          </span>
          <span className={`text-[7px] font-mono font-bold text-center ${severityColor(r.monetary)}`}>
            {r.monetary.toUpperCase()}
          </span>
          <span className={`text-[7px] font-mono font-bold text-center ${severityColor(r.regulatory)}`}>
            {r.regulatory.toUpperCase()}
          </span>
          <div className="flex justify-center pr-2">
            <span
              className={`inline-block px-1.5 py-0.5 text-[6px] font-mono font-bold uppercase tracking-wider border ${riskColor(r.overall)}`}
            >
              {r.overall}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Market Sensitivity Section --

function MarketSensitivitySection({ scenarios }: { scenarios: MarketSensitivity[] }) {
  return (
    <div className="border-b border-red-400/30">
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Market Sensitivity Scenarios
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_48px_48px_56px_48px] gap-0 px-2 py-0.5 border-b border-red-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Scenario
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Equities
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Bonds
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          FX
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Cmdty
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Prob %
        </span>
      </div>

      {/* Rows */}
      {scenarios.map((s, i) => (
        <div
          key={`${s.scenario}-${i}`}
          className="grid grid-cols-[1fr_48px_48px_48px_56px_48px] gap-0 px-2 py-[3px] border-b border-red-400/5 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {s.scenario}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.equities)}`}>
            {fmtChg(s.equities)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.bonds)}`}>
            {fmtChg(s.bonds)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.fx)}`}>
            {fmtChg(s.fx)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.commodities)}`}>
            {fmtChg(s.commodities)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {fmtPct(s.probability)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Historical Patterns Section --

function HistoricalPatternsSection({ patterns }: { patterns: HistoricalPattern[] }) {
  return (
    <div className="border-b border-red-400/30">
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Historical Patterns
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_40px_56px_56px_48px_64px] gap-0 px-2 py-0.5 border-b border-red-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Event
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Year
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Pre-Vol
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Post Move
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Days
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Asset
        </span>
      </div>

      {/* Rows */}
      {patterns.map((p, i) => (
        <div
          key={`${p.event}-${p.year}-${i}`}
          className="grid grid-cols-[1fr_40px_56px_56px_48px_64px] gap-0 px-2 py-[3px] border-b border-red-400/5 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {p.event}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {p.year}
          </span>
          <span className="text-[8px] font-mono font-bold text-yellow-400 text-right">
            {fmtPct(p.preElectionVol)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(p.postElectionMove)}`}>
            {fmtChg(p.postElectionMove)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {p.settleDays}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate">
            {p.asset}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Prediction Markets Section --

function PredictionMarketsSection({ markets }: { markets: PredictionMarket[] }) {
  return (
    <div className="border-b border-red-400/30">
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Prediction Market Odds
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_80px_48px_56px] gap-0 px-2 py-0.5 border-b border-red-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Market
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Candidate
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Odds
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          24h Chg
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Vol $K
        </span>
      </div>

      {/* Rows */}
      {markets.map((m, i) => (
        <div
          key={`${m.market}-${m.candidate}-${i}`}
          className="grid grid-cols-[1fr_1fr_80px_48px_56px] gap-0 px-2 py-[3px] border-b border-red-400/5 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {m.market}
          </span>
          <span className="text-[8px] font-mono font-bold text-red-400 truncate">
            {m.candidate}
          </span>
          <div className="flex items-center gap-1">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-red-400"
                style={{ width: `${oddsBarWidth(m.odds)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-white w-8 text-right">
              {fmtPct(m.odds)}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(m.change24h)}`}>
            {fmtChg(m.change24h)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {m.volume.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Geopolitical Hotspots Section --

function GeopoliticalHotspotsSection({ hotspots }: { hotspots: GeopoliticalHotspot[] }) {
  return (
    <div className="border-b border-red-400/30">
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Geopolitical Hotspots
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_56px_1fr_1fr_48px] gap-0 px-2 py-0.5 border-b border-red-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Region
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Risk
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Trigger
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Affected Assets
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Prob %
        </span>
      </div>

      {/* Rows */}
      {hotspots.map((h, i) => (
        <div
          key={`${h.region}-${i}`}
          className="grid grid-cols-[72px_56px_1fr_1fr_48px] gap-0 px-2 py-[3px] border-b border-red-400/5 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-red-400 truncate">
            {h.region}
          </span>
          <div className="flex justify-center">
            <span
              className={`inline-block px-1.5 py-0.5 text-[6px] font-mono font-bold uppercase tracking-wider border ${riskColor(h.riskLevel)}`}
            >
              {h.riskLevel}
            </span>
          </div>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {h.trigger}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 truncate">
            {h.affectedAssets}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${h.probability >= 50 ? 'text-red-400' : h.probability >= 25 ? 'text-yellow-400' : 'text-neutral-400'}`}>
            {fmtPct(h.probability)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Legislative Tracker Section --

function LegislativeTrackerSection({ items }: { items: LegislativeItem[] }) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Legislative Tracker
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_64px_56px_56px] gap-0 px-2 py-0.5 border-b border-red-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Bill
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Status
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Sector
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Impact
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Pass %
        </span>
      </div>

      {/* Rows */}
      {items.map((item, i) => (
        <div
          key={`${item.bill}-${i}`}
          className="grid grid-cols-[1fr_64px_64px_56px_56px] gap-0 px-2 py-[3px] border-b border-red-400/5 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {item.bill}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {item.status}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 truncate">
            {item.sector}
          </span>
          <div className="flex justify-center">
            <span
              className={`inline-block px-1.5 py-0.5 text-[6px] font-mono font-bold uppercase tracking-wider border ${riskColor(item.impact)}`}
            >
              {item.impact}
            </span>
          </div>
          <div className="flex items-center gap-1 justify-end pr-2">
            <div className="w-10 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-red-400"
                style={{ width: `${oddsBarWidth(item.passOdds)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-white w-6 text-right">
              {fmtPct(item.passOdds)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
