import { useState, useMemo } from 'react';
import { useCommoditySeasonality } from '../../api/hooks/use-commodity-seasonality';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const ACCENT = '#fbbf24';
const ACCENT_DIM = 'rgba(251,191,36,0.08)';

type TabId = 'overview' | 'monthly' | 'opportunities' | 'tracking';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'tracking', label: 'Tracking' },
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Types ──

interface MonthlyReturn {
  month: number;
  avgReturn: number;
  winRate: number;
  bestYear: { year: number; return: number };
  worstYear: { year: number; return: number };
}

interface CommodityEntry {
  name: string;
  symbol: string;
  currentSignal: 'Bullish' | 'Bearish' | 'Neutral';
  monthlyReturns: MonthlyReturn[];
}

interface Opportunity {
  commodity: string;
  direction: 'Long' | 'Short';
  winRate: number;
  avgReturn: number;
  period: string;
  confidence: 'High' | 'Medium' | 'Low';
}

interface TrackingEntry {
  commodity: string;
  ytdReturn: number;
  seasonalExpected: number;
  deviation: number;
  onTrack: boolean;
}

interface SeasonalityData {
  commodities: CommodityEntry[];
  opportunities: Opportunity[];
  tracking: TrackingEntry[];
  summary: {
    strongestMonth: string;
    weakestMonth: string;
    avgSeasonalReturn: number;
    topOpportunity: string;
  };
}

// ── Helpers ──

function signalBadge(signal: 'Bullish' | 'Bearish' | 'Neutral') {
  if (signal === 'Bullish') return 'text-green-400 bg-green-500/10 border border-green-500/30';
  if (signal === 'Bearish') return 'text-red-400 bg-red-500/10 border border-red-500/30';
  return 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30';
}

function directionBadge(direction: 'Long' | 'Short') {
  if (direction === 'Long') return 'text-green-400 bg-green-500/10 border border-green-500/30';
  return 'text-red-400 bg-red-500/10 border border-red-500/30';
}

function confidenceBadge(confidence: 'High' | 'Medium' | 'Low') {
  if (confidence === 'High') return 'text-green-400 bg-green-500/10 border border-green-500/30';
  if (confidence === 'Medium') return 'text-amber-400 bg-amber-500/10 border border-amber-500/30';
  return 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30';
}

function returnColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function returnBgColor(n: number): string {
  if (n > 0.5) return 'bg-green-500/20';
  if (n > 0) return 'bg-green-500/10';
  if (n < -0.5) return 'bg-red-500/20';
  if (n < 0) return 'bg-red-500/10';
  return 'bg-transparent';
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

// ── Main Panel ──

export function CommoditySeasonalityPanel() {
  const { data, isLoading, refetch } = useCommoditySeasonality();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedCommodity, setSelectedCommodity] = useState<string | null>(null);

  const seasonalityData = data as SeasonalityData | undefined;

  // Default to first commodity when data loads
  const effectiveCommodity = useMemo(() => {
    if (selectedCommodity) return selectedCommodity;
    if (seasonalityData?.commodities?.length) return seasonalityData.commodities[0].name;
    return null;
  }, [selectedCommodity, seasonalityData]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            Commodity Seasonality
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !seasonalityData && (
          <div
            className="text-center py-8 text-[9px] font-mono uppercase animate-pulse"
            style={{ color: ACCENT }}
          >
            Loading...
          </div>
        )}

        {!seasonalityData && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {seasonalityData && (
          <>
            {/* Summary bar */}
            <SummaryBar summary={seasonalityData.summary} />

            {activeTab === 'overview' && (
              <OverviewTab commodities={seasonalityData.commodities} />
            )}
            {activeTab === 'monthly' && (
              <MonthlyTab
                commodities={seasonalityData.commodities}
                selected={effectiveCommodity}
                onSelect={setSelectedCommodity}
              />
            )}
            {activeTab === 'opportunities' && (
              <OpportunitiesTab opportunities={seasonalityData.opportunities} />
            )}
            {activeTab === 'tracking' && (
              <TrackingTab tracking={seasonalityData.tracking} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ summary }: { summary: SeasonalityData['summary'] }) {
  return (
    <div
      className="grid grid-cols-4 gap-px border-b border-border/20 shrink-0"
      style={{ backgroundColor: ACCENT_DIM }}
    >
      <SummaryCell label="Strongest Month" value={summary.strongestMonth} />
      <SummaryCell label="Weakest Month" value={summary.weakestMonth} />
      <SummaryCell
        label="Avg Seasonal Return"
        value={fmtPct(summary.avgSeasonalReturn)}
        color={summary.avgSeasonalReturn >= 0 ? 'text-green-400' : 'text-red-400'}
      />
      <SummaryCell label="Top Opportunity" value={summary.topOpportunity} />
    </div>
  );
}

function SummaryCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="px-2 py-1.5 bg-black">
      <div className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`text-[9px] font-mono font-bold truncate ${color ?? 'text-white'}`}
      >
        {value}
      </div>
    </div>
  );
}

// ── Overview Tab ──

function OverviewTab({ commodities }: { commodities: CommodityEntry[] }) {
  return (
    <div className="px-1">
      {/* Column header */}
      <div className="grid grid-cols-[1fr_70px_repeat(12,minmax(0,1fr))] gap-0 px-2 py-1 border-b border-border/20 text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">
        <span>Commodity</span>
        <span className="text-center">Signal</span>
        {MONTH_LABELS.map((m) => (
          <span key={m} className="text-center">
            {m}
          </span>
        ))}
      </div>

      {/* Rows */}
      {commodities.map((c) => (
        <div
          key={c.symbol}
          className="grid grid-cols-[1fr_70px_repeat(12,minmax(0,1fr))] gap-0 px-2 py-1 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>
            {c.name}
          </span>
          <span className="text-center">
            <span
              className={`text-[6px] font-mono font-bold px-1.5 py-px uppercase ${signalBadge(c.currentSignal)}`}
            >
              {c.currentSignal}
            </span>
          </span>
          {MONTH_LABELS.map((_, mi) => {
            const mr = c.monthlyReturns.find((r) => r.month === mi + 1);
            const val = mr?.avgReturn ?? 0;
            return (
              <span
                key={mi}
                className={`text-center text-[6px] font-mono font-bold py-0.5 ${returnColor(val)} ${returnBgColor(val)}`}
              >
                {val >= 0 ? '+' : ''}
                {val.toFixed(1)}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Monthly Tab ──

function MonthlyTab({
  commodities,
  selected,
  onSelect,
}: {
  commodities: CommodityEntry[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const commodity = commodities.find((c) => c.name === selected);

  const maxAbsReturn = useMemo(() => {
    if (!commodity) return 1;
    return Math.max(
      ...commodity.monthlyReturns.map((r) => Math.abs(r.avgReturn)),
      0.1
    );
  }, [commodity]);

  return (
    <div className="px-3 py-2">
      {/* Commodity selector buttons */}
      <div className="flex flex-wrap gap-1 mb-3">
        {commodities.map((c) => (
          <button
            key={c.symbol}
            onClick={() => onSelect(c.name)}
            className={`px-2 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${
              selected === c.name
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-neutral-500 hover:text-white border border-border/10 hover:bg-white/[0.02]'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {!commodity && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          Select a commodity
        </div>
      )}

      {commodity && (
        <>
          {/* Column header */}
          <div className="grid grid-cols-[60px_1fr_80px_80px_90px_90px] gap-0 pb-1 mb-1 border-b border-border/20 text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">
            <span>Month</span>
            <span>Return</span>
            <span className="text-right">Avg Return</span>
            <span className="text-right">Win Rate</span>
            <span className="text-right">Best Year</span>
            <span className="text-right">Worst Year</span>
          </div>

          {/* Monthly rows */}
          {commodity.monthlyReturns
            .slice()
            .sort((a, b) => a.month - b.month)
            .map((mr) => {
              const barWidth = (Math.abs(mr.avgReturn) / maxAbsReturn) * 100;
              return (
                <div
                  key={mr.month}
                  className="grid grid-cols-[60px_1fr_80px_80px_90px_90px] gap-0 py-1 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
                >
                  <span
                    className="text-[8px] font-mono font-bold"
                    style={{ color: ACCENT }}
                  >
                    {MONTH_LABELS[mr.month - 1]}
                  </span>
                  {/* Bar visualization */}
                  <div className="flex items-center h-full px-1">
                    <div className="relative w-full h-3">
                      <div
                        className={`absolute top-0 h-full ${
                          mr.avgReturn >= 0 ? 'bg-green-500/30' : 'bg-red-500/30'
                        }`}
                        style={{
                          width: `${barWidth}%`,
                          [mr.avgReturn >= 0 ? 'left' : 'right']: 0,
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className={`text-[8px] font-mono font-bold text-right ${returnColor(mr.avgReturn)}`}
                  >
                    {fmtPct(mr.avgReturn)}
                  </span>
                  <span
                    className={`text-[8px] font-mono text-right ${
                      mr.winRate >= 50 ? 'text-green-400/70' : 'text-red-400/70'
                    }`}
                  >
                    {mr.winRate.toFixed(1)}%
                  </span>
                  <span className="text-[7px] font-mono text-right text-green-400/50">
                    +{mr.bestYear.return.toFixed(1)}% ({mr.bestYear.year})
                  </span>
                  <span className="text-[7px] font-mono text-right text-red-400/50">
                    {mr.worstYear.return.toFixed(1)}% ({mr.worstYear.year})
                  </span>
                </div>
              );
            })}
        </>
      )}
    </div>
  );
}

// ── Opportunities Tab ──

function OpportunitiesTab({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <div className="px-1">
      {/* Column header */}
      <div className="grid grid-cols-[1fr_60px_60px_70px_1fr_70px] gap-0 px-2 py-1 border-b border-border/20 text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">
        <span>Commodity</span>
        <span className="text-center">Direction</span>
        <span className="text-right">Win Rate</span>
        <span className="text-right">Avg Return</span>
        <span className="text-center">Period</span>
        <span className="text-center">Confidence</span>
      </div>

      {/* Rows */}
      {opportunities.map((o, i) => (
        <div
          key={`${o.commodity}-${i}`}
          className="grid grid-cols-[1fr_60px_60px_70px_1fr_70px] gap-0 px-2 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>
            {o.commodity}
          </span>
          <span className="text-center">
            <span
              className={`text-[6px] font-mono font-bold px-1.5 py-px uppercase ${directionBadge(o.direction)}`}
            >
              {o.direction}
            </span>
          </span>
          <span className="text-[8px] font-mono text-right text-white">
            {o.winRate.toFixed(1)}%
          </span>
          <span
            className={`text-[8px] font-mono font-bold text-right ${returnColor(o.avgReturn)}`}
          >
            {fmtPct(o.avgReturn)}
          </span>
          <span className="text-[7px] font-mono text-center text-neutral-400">
            {o.period}
          </span>
          <span className="text-center">
            <span
              className={`text-[6px] font-mono font-bold px-1.5 py-px uppercase ${confidenceBadge(o.confidence)}`}
            >
              {o.confidence}
            </span>
          </span>
        </div>
      ))}

      {opportunities.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No opportunities available
        </div>
      )}
    </div>
  );
}

// ── Tracking Tab ──

function TrackingTab({ tracking }: { tracking: TrackingEntry[] }) {
  return (
    <div className="px-1">
      {/* Column header */}
      <div className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-0 px-2 py-1 border-b border-border/20 text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">
        <span>Commodity</span>
        <span className="text-right">YTD Return</span>
        <span className="text-right">Seasonal Exp</span>
        <span className="text-right">Deviation</span>
        <span className="text-center">On Track</span>
      </div>

      {/* Rows */}
      {tracking.map((t) => (
        <div
          key={t.commodity}
          className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-0 px-2 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>
            {t.commodity}
          </span>
          <span
            className={`text-[8px] font-mono font-bold text-right ${returnColor(t.ytdReturn)}`}
          >
            {fmtPct(t.ytdReturn)}
          </span>
          <span
            className={`text-[8px] font-mono text-right ${returnColor(t.seasonalExpected)}`}
          >
            {fmtPct(t.seasonalExpected)}
          </span>
          <span
            className={`text-[8px] font-mono font-bold text-right ${returnColor(t.deviation)}`}
          >
            {fmtPct(t.deviation)}
          </span>
          <span className="text-center text-[9px] font-mono">
            {t.onTrack ? (
              <span className="text-green-400">{'\u2713'}</span>
            ) : (
              <span className="text-red-400">{'\u2717'}</span>
            )}
          </span>
        </div>
      ))}

      {tracking.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No tracking data available
        </div>
      )}
    </div>
  );
}
