import { useState, useMemo } from 'react';
import { useSecuritiesValuation } from '../../api/hooks/use-securities-valuation';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValuationData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Security = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PriceChallenge = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StaleAlert = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MethodologyDetail = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PortfolioStats = any;

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtNum(n: number, decimals = 2): string {
  return n?.toFixed(decimals) ?? '--';
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

function fmtPrice(n: number): string {
  return n?.toFixed(4) ?? '--';
}

function fmtHours(n: number): string {
  if (n >= 24) return Math.floor(n / 24) + 'd ' + (n % 24) + 'h';
  return n.toFixed(0) + 'h';
}

// -- Color helpers --

function confidenceColor(score: number): string {
  if (score >= 90) return 'bg-emerald-400';
  if (score >= 70) return 'bg-indigo-400';
  if (score >= 50) return 'bg-yellow-400';
  if (score >= 30) return 'bg-orange-400';
  return 'bg-red-400';
}

function confidenceTextColor(score: number): string {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 70) return 'text-indigo-400';
  if (score >= 50) return 'text-yellow-400';
  if (score >= 30) return 'text-orange-400';
  return 'text-red-400';
}

function diffColor(diff: number): string {
  const abs = Math.abs(diff);
  if (abs >= 2) return 'text-red-400';
  if (abs >= 1) return 'text-orange-400';
  if (abs >= 0.5) return 'text-yellow-400';
  return 'text-neutral-400';
}

function sourceColor(source: string): string {
  const s = source?.toUpperCase() ?? '';
  if (s === 'BVAL') return 'bg-indigo-400/20 text-indigo-400 border-indigo-400/30';
  if (s === 'TRACE') return 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30';
  if (s === 'EXCHANGE') return 'bg-cyan-400/20 text-cyan-400 border-cyan-400/30';
  if (s === 'MODEL') return 'bg-purple-400/20 text-purple-400 border-purple-400/30';
  if (s === 'DEALER') return 'bg-amber-400/20 text-amber-400 border-amber-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function levelColor(level: number): string {
  if (level === 1) return 'bg-emerald-400';
  if (level === 2) return 'bg-indigo-400';
  return 'bg-amber-400';
}

function levelTextColor(level: number): string {
  if (level === 1) return 'text-emerald-400';
  if (level === 2) return 'text-indigo-400';
  return 'text-amber-400';
}

// -- Main Panel --

export function SecuritiesValuationPanel() {
  const t = useT();
  const { data: rawData, isLoading, error, refetch } = useSecuritiesValuation();
  const data = rawData as ValuationData | undefined;

  const stats = data?.stats as PortfolioStats | undefined;
  const securities = data?.securities as Security[] | undefined;
  const challenges = data?.challenges as PriceChallenge[] | undefined;
  const staleAlerts = data?.staleAlerts as StaleAlert[] | undefined;
  const methodologies = data?.methodologies as MethodologyDetail[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-indigo-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-indigo-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-indigo-400">
            {tr(t, 'panelSecuritiesValuation', 'Securities Valuation')}
          </span>
          {securities && (
            <span className="text-[7px] font-mono text-neutral-600">
              {securities.length} securities
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-indigo-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            Failed to load valuation data
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            {stats && <PortfolioStatsBar stats={stats} t={t} />}
            {stats && <FairValueHierarchyBar stats={stats} t={t} />}
            {securities && securities.length > 0 && (
              <ValuationTable securities={securities} t={t} />
            )}
            {challenges && challenges.length > 0 && (
              <PriceChallengesSection challenges={challenges} t={t} />
            )}
            {staleAlerts && staleAlerts.length > 0 && (
              <StalePricingSection alerts={staleAlerts} t={t} />
            )}
            {methodologies && methodologies.length > 0 && (
              <MethodologySection methodologies={methodologies} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// 1. Portfolio Stats
// ────────────────────────────────────────────────────

function PortfolioStatsBar({
  stats,
  t,
}: {
  stats: PortfolioStats;
  t: ReturnType<typeof useT>;
}) {
  const l1Pct = stats?.level1Pct ?? 0;
  const l2Pct = stats?.level2Pct ?? 0;
  const l3Pct = stats?.level3Pct ?? 0;

  return (
    <div className="border-b border-indigo-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-indigo-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'svAvgConfidence', 'Avg Confidence')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${confidenceTextColor(stats?.avgConfidence ?? 0)}`}>
            {fmtNum(stats?.avgConfidence ?? 0, 1)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'svLevel1', 'Level 1')}
          </div>
          <div className="text-[10px] font-mono font-bold text-emerald-400">
            {fmtNum(l1Pct * 100, 1)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'svLevel2', 'Level 2')}
          </div>
          <div className="text-[10px] font-mono font-bold text-indigo-400">
            {fmtNum(l2Pct * 100, 1)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'svLevel3', 'Level 3')}
          </div>
          <div className="text-[10px] font-mono font-bold text-amber-400">
            {fmtNum(l3Pct * 100, 1)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'svAvgStaleness', 'Avg Staleness')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtHours(stats?.avgStalenessHours ?? 0)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'svChallenged', 'Challenged')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${(stats?.challengedCount ?? 0) > 0 ? 'text-red-400' : 'text-neutral-500'}`}>
            {stats?.challengedCount ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// 2. Fair Value Hierarchy Bar
// ────────────────────────────────────────────────────

function FairValueHierarchyBar({
  stats,
  t,
}: {
  stats: PortfolioStats;
  t: ReturnType<typeof useT>;
}) {
  const l1 = (stats?.level1Pct ?? 0) * 100;
  const l2 = (stats?.level2Pct ?? 0) * 100;
  const l3 = (stats?.level3Pct ?? 0) * 100;

  return (
    <div className="px-3 py-2 border-b border-border/20 bg-[#030303]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'svFairValueHierarchy', 'Fair Value Hierarchy')}
        </span>
        <div className="flex items-center gap-3">
          {[1, 2, 3].map((level) => (
            <div key={level} className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 ${levelColor(level)}`} />
              <span className={`text-[7px] font-mono ${levelTextColor(level)}`}>
                L{level}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="h-2.5 bg-white/[0.02] flex overflow-hidden">
        {l1 > 0 && (
          <div
            className="h-full bg-emerald-400/60 border-r border-black/40"
            style={{ width: `${l1}%` }}
          />
        )}
        {l2 > 0 && (
          <div
            className="h-full bg-indigo-400/60 border-r border-black/40"
            style={{ width: `${l2}%` }}
          />
        )}
        {l3 > 0 && (
          <div
            className="h-full bg-amber-400/60"
            style={{ width: `${l3}%` }}
          />
        )}
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[7px] font-mono text-emerald-400/60">
          {l1.toFixed(1)}%
        </span>
        <span className="text-[7px] font-mono text-indigo-400/60">
          {l2.toFixed(1)}%
        </span>
        <span className="text-[7px] font-mono text-amber-400/60">
          {l3.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// 3. Valuation Table
// ────────────────────────────────────────────────────

function ValuationTable({
  securities,
  t,
}: {
  securities: Security[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-indigo-400/30">
      <div className="px-3 py-1 border-b border-indigo-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'svValuationTable', 'Valuation Table')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_1fr_56px_64px_80px_56px_48px] gap-0 px-2 py-0.5 border-b border-indigo-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'svCUSIP', 'CUSIP')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'svName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'svType', 'Type')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'svMidPrice', 'Mid Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'svConfidence', 'Confidence')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'svSource', 'Source')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'svStaleness', 'Stale')}
        </span>
      </div>

      {/* Rows */}
      {securities.map((sec: Security, i: number) => {
        const confidence = sec?.confidenceScore ?? 0;
        const stalenessHours = sec?.stalenessHours ?? 0;

        return (
          <div
            key={sec?.cusip ?? i}
            className={`grid grid-cols-[72px_1fr_56px_64px_80px_56px_48px] gap-0 px-2 py-[3px] border-b border-border/10 transition-colors hover:bg-indigo-400/[0.02] items-center ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <span className="text-[8px] font-mono font-bold text-indigo-400 truncate">
              {sec?.cusip ?? '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-300 truncate pr-1">
              {sec?.name ?? '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-500 text-center uppercase">
              {sec?.type ?? '--'}
            </span>
            <span className="text-[8px] font-mono font-bold text-white text-right">
              {fmtPrice(sec?.midPrice ?? 0)}
            </span>
            <div className="flex items-center gap-1 justify-center">
              <div className="w-12 h-1.5 bg-white/[0.03] relative">
                <div
                  className={`absolute top-0 left-0 h-full ${confidenceColor(confidence)}`}
                  style={{ width: `${Math.min(confidence, 100)}%` }}
                />
              </div>
              <span className={`text-[7px] font-mono font-bold ${confidenceTextColor(confidence)}`}>
                {fmtNum(confidence, 0)}
              </span>
            </div>
            <div className="flex justify-center">
              <span
                className={`inline-block px-1 py-0 text-[7px] font-mono font-bold uppercase tracking-wider border ${sourceColor(sec?.source)}`}
              >
                {sec?.source ?? '--'}
              </span>
            </div>
            <span className={`text-[8px] font-mono text-right pr-2 ${stalenessHours > 24 ? 'text-red-400 font-bold' : stalenessHours > 8 ? 'text-yellow-400' : 'text-neutral-500'}`}>
              {fmtHours(stalenessHours)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────
// 4. Price Challenges
// ────────────────────────────────────────────────────

function PriceChallengesSection({
  challenges,
  t,
}: {
  challenges: PriceChallenge[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-indigo-400/30">
      <div className="px-3 py-1 border-b border-red-400/20 bg-red-400/[0.03]">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 bg-red-400" />
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-red-400">
            {tr(t, 'svPriceChallenges', 'Price Challenges')}
          </span>
          <span className="text-[7px] font-mono text-red-400/60">
            {challenges.length}
          </span>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_1fr_64px_64px_56px_80px] gap-0 px-2 py-0.5 border-b border-indigo-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'svCUSIP', 'CUSIP')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'svName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'svInternalPrice', 'Internal')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'svBVALPrice', 'BVAL')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'svDiff', 'Diff')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'svDiffBar', 'Deviation')}
        </span>
      </div>

      {/* Rows */}
      {challenges.map((ch: PriceChallenge, i: number) => {
        const diff = ch?.difference ?? 0;
        const absDiff = Math.abs(diff);

        return (
          <div
            key={ch?.cusip ?? i}
            className="grid grid-cols-[72px_1fr_64px_64px_56px_80px] gap-0 px-2 py-[3px] border-b border-red-400/10 transition-colors hover:bg-indigo-400/[0.02] items-center bg-red-400/[0.01]"
          >
            <span className="text-[8px] font-mono font-bold text-indigo-400 truncate">
              {ch?.cusip ?? '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-300 truncate pr-1">
              {ch?.name ?? '--'}
            </span>
            <span className="text-[8px] font-mono font-bold text-white text-right">
              {fmtPrice(ch?.internalPrice ?? 0)}
            </span>
            <span className="text-[8px] font-mono font-bold text-indigo-400 text-right">
              {fmtPrice(ch?.bvalPrice ?? 0)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${diffColor(diff)}`}>
              {diff >= 0 ? '+' : ''}{fmtNum(diff, 2)}
            </span>
            <div className="flex items-center gap-1 justify-end pr-2">
              <div className="w-14 h-1.5 bg-white/[0.03] relative">
                <div
                  className={`absolute top-0 h-full ${absDiff >= 2 ? 'bg-red-400/60' : absDiff >= 1 ? 'bg-orange-400/60' : 'bg-yellow-400/40'}`}
                  style={{
                    width: `${Math.min(absDiff * 20, 100)}%`,
                    left: diff >= 0 ? '50%' : undefined,
                    right: diff >= 0 ? undefined : '50%',
                  }}
                />
                <div className="absolute top-0 h-full w-px bg-neutral-600" style={{ left: '50%' }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────
// 5. Stale Pricing Alerts
// ────────────────────────────────────────────────────

function StalePricingSection({
  alerts,
  t,
}: {
  alerts: StaleAlert[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-indigo-400/30">
      <div className="px-3 py-1 border-b border-yellow-400/20 bg-yellow-400/[0.03]">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 bg-yellow-400" />
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-yellow-400">
            {tr(t, 'svStalePricing', 'Stale Pricing Alerts')}
          </span>
          <span className="text-[7px] font-mono text-yellow-400/60">
            {alerts.length}
          </span>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_1fr_56px_64px_56px_64px] gap-0 px-2 py-0.5 border-b border-indigo-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'svCUSIP', 'CUSIP')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'svName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'svType', 'Type')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'svLastPrice', 'Last Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'svHoursSince', 'Hours')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'svStalenessBar', 'Staleness')}
        </span>
      </div>

      {/* Rows */}
      {alerts.map((alert: StaleAlert, i: number) => {
        const hours = alert?.hoursSinceUpdate ?? 0;
        const severity = hours >= 72 ? 'bg-red-400/[0.04]' : hours >= 48 ? 'bg-orange-400/[0.03]' : 'bg-yellow-400/[0.02]';
        const hoursColor = hours >= 72 ? 'text-red-400' : hours >= 48 ? 'text-orange-400' : 'text-yellow-400';

        return (
          <div
            key={alert?.cusip ?? i}
            className={`grid grid-cols-[72px_1fr_56px_64px_56px_64px] gap-0 px-2 py-[3px] border-b border-yellow-400/10 transition-colors hover:bg-indigo-400/[0.02] items-center ${severity}`}
          >
            <span className="text-[8px] font-mono font-bold text-indigo-400 truncate">
              {alert?.cusip ?? '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-300 truncate pr-1">
              {alert?.name ?? '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-500 text-center uppercase">
              {alert?.type ?? '--'}
            </span>
            <span className="text-[8px] font-mono font-bold text-white text-right">
              {fmtPrice(alert?.lastPrice ?? 0)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${hoursColor}`}>
              {fmtHours(hours)}
            </span>
            <div className="flex items-center justify-end pr-2">
              <div className="w-12 h-1.5 bg-white/[0.03] relative">
                <div
                  className={`absolute top-0 left-0 h-full ${hours >= 72 ? 'bg-red-400/60' : hours >= 48 ? 'bg-orange-400/60' : 'bg-yellow-400/40'}`}
                  style={{ width: `${Math.min((hours / 96) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────
// 6. Methodology Details (Expandable)
// ────────────────────────────────────────────────────

function MethodologySection({
  methodologies,
  t,
}: {
  methodologies: MethodologyDetail[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-indigo-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'svMethodology', 'Methodology Details')}
        </span>
      </div>

      {methodologies.map((method: MethodologyDetail, i: number) => (
        <MethodologyCard key={method?.cusip ?? i} method={method} t={t} />
      ))}
    </div>
  );
}

function MethodologyCard({
  method,
  t,
}: {
  method: MethodologyDetail;
  t: ReturnType<typeof useT>;
}) {
  const [expanded, setExpanded] = useState(false);
  const inputs = method?.inputs as { label: string; value: string }[] | undefined;
  const dataPoints = method?.dataPoints ?? 0;

  return (
    <div className="border-b border-border/10">
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2 py-[4px] hover:bg-indigo-400/[0.02] transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-2.5 h-2.5 text-indigo-400/60 shrink-0" />
        ) : (
          <ChevronRight className="w-2.5 h-2.5 text-neutral-600 shrink-0" />
        )}
        <span className="text-[8px] font-mono font-bold text-indigo-400 truncate">
          {method?.cusip ?? '--'}
        </span>
        <span className="text-[8px] font-mono text-neutral-400 truncate flex-1 text-left">
          {method?.name ?? '--'}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase shrink-0">
          {method?.methodology ?? '--'}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 shrink-0">
          {dataPoints} pts
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-2 bg-white/[0.01]">
          {/* Methodology label */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'svMethodologyType', 'Methodology')}:
            </span>
            <span className="text-[8px] font-mono font-bold text-indigo-400">
              {method?.methodology ?? '--'}
            </span>
            <span className="text-[7px] font-mono text-neutral-600">|</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'svDataPoints', 'Data Points')}:
            </span>
            <span className="text-[8px] font-mono font-bold text-white">
              {dataPoints}
            </span>
          </div>

          {/* Inputs table */}
          {inputs && inputs.length > 0 && (
            <div className="border border-border/10">
              <div className="grid grid-cols-[1fr_1fr] px-2 py-0.5 border-b border-border/10 bg-[#030303]">
                <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                  {tr(t, 'svInput', 'Input')}
                </span>
                <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
                  {tr(t, 'svValue', 'Value')}
                </span>
              </div>
              {inputs.map((input: { label: string; value: string }, j: number) => (
                <div
                  key={j}
                  className={`grid grid-cols-[1fr_1fr] px-2 py-[2px] border-b border-border/5 ${
                    j % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
                  }`}
                >
                  <span className="text-[8px] font-mono text-neutral-400">
                    {input?.label ?? '--'}
                  </span>
                  <span className="text-[8px] font-mono font-bold text-white text-right">
                    {input?.value ?? '--'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
