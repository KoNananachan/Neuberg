import { useState } from 'react';
import { useRegulatoryCapital } from '../../api/hooks/use-regulatory-capital';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Types ──

interface BankCapitalRatios {
  name: string;
  ticker: string;
  cet1: number;
  tier1: number;
  totalCapital: number;
  leverage: number;
  gsibSurcharge: number;
  cet1Min: number;
  tier1Min: number;
  totalCapitalMin: number;
  leverageMin: number;
}

interface RwaBreakdown {
  bank: string;
  credit: number;
  market: number;
  operational: number;
  cva: number;
  total: number;
}

interface StressTestResult {
  bank: string;
  baseline: { cet1: number; losses: number };
  adverse: { cet1: number; losses: number };
  severelyAdverse: { cet1: number; losses: number };
}

interface RegulatoryEvent {
  date: string;
  event: string;
  authority: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

interface RegulatoryCapitalData {
  timestamp: string;
  capitalRatios: BankCapitalRatios[];
  rwaBreakdown: RwaBreakdown[];
  stressTests: StressTestResult[];
  regulatoryTimeline: RegulatoryEvent[];
}

// ── Formatting helpers ──

function fmtPct(n: number): string {
  return n.toFixed(2) + '%';
}

function fmtBn(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'T';
  return n.toFixed(0) + 'B';
}

// ── Color helpers ──

function ratioColor(value: number, minimum: number): string {
  const buffer = value - minimum;
  if (buffer < 0) return 'text-red-400';
  if (buffer < 1.5) return 'text-yellow-400';
  return 'text-green-400';
}

function ratioBgColor(value: number, minimum: number): string {
  const buffer = value - minimum;
  if (buffer < 0) return 'bg-red-400/10';
  if (buffer < 1.5) return 'bg-yellow-400/5';
  return '';
}

function stressCet1Color(cet1: number): string {
  if (cet1 < 4.5) return 'text-red-400';
  if (cet1 < 6.0) return 'text-yellow-400';
  return 'text-green-400';
}

function impactBadge(impact: 'high' | 'medium' | 'low'): { text: string; color: string; bg: string } {
  switch (impact) {
    case 'high':
      return { text: 'HIGH', color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
    case 'medium':
      return { text: 'MED', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
    case 'low':
      return { text: 'LOW', color: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  }
}

// ── Tab type ──

type TabId = 'ratios' | 'rwa' | 'stress' | 'timeline';

// ── Main Panel ──

export function RegulatoryCapitalPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useRegulatoryCapital() as {
    data: RegulatoryCapitalData | undefined;
    isLoading: boolean;
    refetch: () => void;
  };
  const [activeTab, setActiveTab] = useState<TabId>('ratios');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'ratios', label: tr(t, 'rcTabRatios', 'Capital Ratios') },
    { id: 'rwa', label: tr(t, 'rcTabRwa', 'RWA') },
    { id: 'stress', label: tr(t, 'rcTabStress', 'Stress Tests') },
    { id: 'timeline', label: tr(t, 'rcTabTimeline', 'Timeline') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-rose-400">
            {tr(t, 'rcTitle', 'Regulatory Capital Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-border/20 shrink-0 bg-[#050505]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 text-[8px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? 'text-rose-400 border-b border-rose-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-rose-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'rcNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'ratios' && (
          <CapitalRatiosSection ratios={data.capitalRatios} t={t} />
        )}
        {data && activeTab === 'rwa' && (
          <RwaBreakdownSection breakdown={data.rwaBreakdown} t={t} />
        )}
        {data && activeTab === 'stress' && (
          <StressTestSection results={data.stressTests} t={t} />
        )}
        {data && activeTab === 'timeline' && (
          <RegulatoryTimelineSection events={data.regulatoryTimeline} t={t} />
        )}
      </div>
    </div>
  );
}

// ── Section 1: Capital Ratios ──

function CapitalRatiosSection({
  ratios,
  t,
}: {
  ratios: BankCapitalRatios[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'rcCapitalRatios', 'Bank Capital Adequacy Ratios')}
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">
        <span className="w-20 shrink-0">Bank</span>
        <span className="w-14 text-right shrink-0">CET1</span>
        <span className="w-14 text-right shrink-0">Tier 1</span>
        <span className="w-14 text-right shrink-0">Total</span>
        <span className="w-14 text-right shrink-0">Lev.</span>
        <span className="w-14 text-right shrink-0">G-SIB</span>
        <span className="flex-1 text-right">Buffer</span>
      </div>

      {ratios.map((bank) => {
        const cet1Buffer = bank.cet1 - bank.cet1Min - bank.gsibSurcharge;
        return (
          <div
            key={bank.ticker}
            className={`flex items-center px-2 py-1 border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors ${ratioBgColor(bank.cet1, bank.cet1Min + bank.gsibSurcharge)}`}
          >
            <div className="w-20 shrink-0">
              <div className="text-[8px] font-mono font-bold text-white">{bank.ticker}</div>
              <div className="text-[6px] font-mono text-neutral-600 truncate">{bank.name}</div>
            </div>
            <span className={`w-14 text-right text-[9px] font-mono font-bold shrink-0 ${ratioColor(bank.cet1, bank.cet1Min + bank.gsibSurcharge)}`}>
              {fmtPct(bank.cet1)}
            </span>
            <span className={`w-14 text-right text-[9px] font-mono font-bold shrink-0 ${ratioColor(bank.tier1, bank.tier1Min)}`}>
              {fmtPct(bank.tier1)}
            </span>
            <span className={`w-14 text-right text-[9px] font-mono font-bold shrink-0 ${ratioColor(bank.totalCapital, bank.totalCapitalMin)}`}>
              {fmtPct(bank.totalCapital)}
            </span>
            <span className={`w-14 text-right text-[9px] font-mono font-bold shrink-0 ${ratioColor(bank.leverage, bank.leverageMin)}`}>
              {fmtPct(bank.leverage)}
            </span>
            <span className="w-14 text-right text-[9px] font-mono text-rose-400/70 shrink-0">
              {fmtPct(bank.gsibSurcharge)}
            </span>
            <span className={`flex-1 text-right text-[8px] font-mono font-bold ${cet1Buffer < 0 ? 'text-red-400' : cet1Buffer < 1.0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {cet1Buffer >= 0 ? '+' : ''}{cet1Buffer.toFixed(2)}%
            </span>
          </div>
        );
      })}

      {/* Minimum requirements legend */}
      <div className="px-3 py-1.5 border-t border-border/10">
        <div className="text-[7px] font-mono text-neutral-700 uppercase tracking-wider mb-1">
          {tr(t, 'rcMinReq', 'Minimum Requirements')}
        </div>
        <div className="flex gap-4 text-[7px] font-mono text-neutral-600">
          <span>CET1: 4.5%</span>
          <span>Tier 1: 6.0%</span>
          <span>Total: 8.0%</span>
          <span>Leverage: 3.0%</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[7px] font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2 h-1 bg-green-400/60 inline-block" />
            <span className="text-neutral-600">{tr(t, 'rcWellAbove', 'Well Above Min')}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-1 bg-yellow-400/60 inline-block" />
            <span className="text-neutral-600">{tr(t, 'rcCloseToMin', 'Close to Min')}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-1 bg-red-400/60 inline-block" />
            <span className="text-neutral-600">{tr(t, 'rcBelowMin', 'Below Min')}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Section 2: RWA Breakdown ──

function RwaBreakdownSection({
  breakdown,
  t,
}: {
  breakdown: RwaBreakdown[];
  t: ReturnType<typeof useT>;
}) {
  const riskTypes = ['credit', 'market', 'operational', 'cva'] as const;
  const riskColors: Record<string, { bar: string; text: string }> = {
    credit: { bar: 'bg-rose-400/60', text: 'text-rose-400' },
    market: { bar: 'bg-amber-400/60', text: 'text-amber-400' },
    operational: { bar: 'bg-blue-400/60', text: 'text-blue-400' },
    cva: { bar: 'bg-purple-400/60', text: 'text-purple-400' },
  };

  const maxTotal = Math.max(...breakdown.map((b) => b.total), 1);

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'rcRwaBreakdown', 'Risk-Weighted Assets by Category')}
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1 border-b border-border/10">
        {riskTypes.map((type) => (
          <span key={type} className="flex items-center gap-1">
            <span className={`w-2 h-1.5 ${riskColors[type].bar} inline-block`} />
            <span className={`text-[7px] font-mono font-bold uppercase ${riskColors[type].text}`}>{type}</span>
          </span>
        ))}
      </div>

      {/* Column headers */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">
        <span className="w-16 shrink-0">Bank</span>
        <span className="w-14 text-right shrink-0">Credit</span>
        <span className="w-14 text-right shrink-0">Market</span>
        <span className="w-12 text-right shrink-0">Oper.</span>
        <span className="w-12 text-right shrink-0">CVA</span>
        <span className="w-14 text-right shrink-0">Total</span>
        <span className="flex-1 pl-2">Distribution</span>
      </div>

      {breakdown.map((bank) => (
        <div
          key={bank.bank}
          className="flex items-center px-2 py-1.5 border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors"
        >
          <span className="w-16 text-[8px] font-mono font-bold text-white shrink-0">{bank.bank}</span>
          <span className="w-14 text-right text-[8px] font-mono text-rose-400 shrink-0">{fmtBn(bank.credit)}</span>
          <span className="w-14 text-right text-[8px] font-mono text-amber-400 shrink-0">{fmtBn(bank.market)}</span>
          <span className="w-12 text-right text-[8px] font-mono text-blue-400 shrink-0">{fmtBn(bank.operational)}</span>
          <span className="w-12 text-right text-[8px] font-mono text-purple-400 shrink-0">{fmtBn(bank.cva)}</span>
          <span className="w-14 text-right text-[9px] font-mono font-bold text-white shrink-0">{fmtBn(bank.total)}</span>
          <div className="flex-1 pl-2">
            <RwaBar bank={bank} maxTotal={maxTotal} riskColors={riskColors} />
          </div>
        </div>
      ))}

      {/* Aggregate totals */}
      <div className="px-3 py-1.5 border-t border-border/20">
        <div className="text-[7px] font-mono text-neutral-700 uppercase tracking-wider mb-1">
          {tr(t, 'rcAggregateRwa', 'Aggregate Composition')}
        </div>
        <div className="flex gap-3">
          {riskTypes.map((type) => {
            const total = breakdown.reduce((sum, b) => sum + b[type], 0);
            const grandTotal = breakdown.reduce((sum, b) => sum + b.total, 0);
            const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
            return (
              <div key={type}>
                <span className={`text-[8px] font-mono font-bold ${riskColors[type].text}`}>
                  {pct.toFixed(1)}%
                </span>
                <span className="text-[7px] font-mono text-neutral-600 ml-1 uppercase">{type}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RwaBar({
  bank,
  maxTotal,
  riskColors,
}: {
  bank: RwaBreakdown;
  maxTotal: number;
  riskColors: Record<string, { bar: string; text: string }>;
}) {
  const scale = maxTotal > 0 ? 100 / maxTotal : 0;
  const segments = [
    { key: 'credit', value: bank.credit },
    { key: 'market', value: bank.market },
    { key: 'operational', value: bank.operational },
    { key: 'cva', value: bank.cva },
  ];

  return (
    <div className="flex h-2.5 w-full bg-white/[0.02] overflow-hidden">
      {segments.map((seg) => {
        const widthPct = seg.value * scale;
        if (widthPct < 0.1) return null;
        return (
          <div
            key={seg.key}
            className={`h-full ${riskColors[seg.key].bar}`}
            style={{ width: `${widthPct}%` }}
          />
        );
      })}
    </div>
  );
}

// ── Section 3: Stress Test Results ──

function StressTestSection({
  results,
  t,
}: {
  results: StressTestResult[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'rcStressTests', 'CCAR / DFAST Stress Test Results')}
        </span>
      </div>

      {/* Scenario headers */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">
        <span className="w-16 shrink-0">Bank</span>
        <span className="w-24 text-center shrink-0 border-l border-border/10 px-1">
          {tr(t, 'rcBaseline', 'Baseline')}
        </span>
        <span className="w-24 text-center shrink-0 border-l border-border/10 px-1">
          {tr(t, 'rcAdverse', 'Adverse')}
        </span>
        <span className="flex-1 text-center border-l border-border/10 px-1">
          {tr(t, 'rcSeverelyAdverse', 'Severely Adverse')}
        </span>
      </div>

      {/* Sub-headers */}
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 text-[6px] font-mono text-neutral-700 uppercase">
        <span className="w-16 shrink-0" />
        <span className="w-12 text-right shrink-0 border-l border-border/10">CET1</span>
        <span className="w-12 text-right shrink-0">Loss</span>
        <span className="w-12 text-right shrink-0 border-l border-border/10">CET1</span>
        <span className="w-12 text-right shrink-0">Loss</span>
        <span className="w-12 text-right shrink-0 border-l border-border/10">CET1</span>
        <span className="flex-1 text-right">Loss</span>
      </div>

      {results.map((res) => (
        <div
          key={res.bank}
          className="flex items-center px-2 py-1 border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors"
        >
          <span className="w-16 text-[8px] font-mono font-bold text-white shrink-0">{res.bank}</span>

          {/* Baseline */}
          <span className={`w-12 text-right text-[9px] font-mono font-bold shrink-0 border-l border-border/10 ${stressCet1Color(res.baseline.cet1)}`}>
            {fmtPct(res.baseline.cet1)}
          </span>
          <span className="w-12 text-right text-[8px] font-mono text-neutral-500 shrink-0">
            {fmtBn(res.baseline.losses)}
          </span>

          {/* Adverse */}
          <span className={`w-12 text-right text-[9px] font-mono font-bold shrink-0 border-l border-border/10 ${stressCet1Color(res.adverse.cet1)}`}>
            {fmtPct(res.adverse.cet1)}
          </span>
          <span className="w-12 text-right text-[8px] font-mono text-neutral-500 shrink-0">
            {fmtBn(res.adverse.losses)}
          </span>

          {/* Severely Adverse */}
          <span className={`w-12 text-right text-[9px] font-mono font-bold shrink-0 border-l border-border/10 ${stressCet1Color(res.severelyAdverse.cet1)}`}>
            {fmtPct(res.severelyAdverse.cet1)}
          </span>
          <span className="flex-1 text-right text-[8px] font-mono text-neutral-500">
            {fmtBn(res.severelyAdverse.losses)}
          </span>
        </div>
      ))}

      {/* CET1 minimum reference */}
      <div className="px-3 py-1.5 border-t border-border/10">
        <div className="flex items-center gap-2 text-[7px] font-mono text-neutral-600">
          <span className="text-red-400">&#9632;</span>
          <span>{tr(t, 'rcStressNote', 'CET1 below 4.5% = fails minimum capital requirement under stress')}</span>
        </div>
      </div>

      {/* Stress scenario CET1 comparison chart */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="text-[7px] font-mono text-neutral-700 uppercase tracking-wider mb-1.5">
          {tr(t, 'rcCet1Comparison', 'CET1 Under Stress (Visual)')}
        </div>
        {results.map((res) => (
          <div key={`chart-${res.bank}`} className="flex items-center gap-1.5 mb-1">
            <span className="w-12 text-[7px] font-mono font-bold text-neutral-500 shrink-0">{res.bank}</span>
            <div className="flex-1 flex items-center gap-px h-3">
              <StressBar value={res.baseline.cet1} maxValue={16} color="bg-green-400/50" />
              <StressBar value={res.adverse.cet1} maxValue={16} color="bg-yellow-400/50" />
              <StressBar value={res.severelyAdverse.cet1} maxValue={16} color="bg-red-400/50" />
            </div>
            <span className="text-[6px] font-mono text-neutral-600 w-20 text-right shrink-0">
              {fmtPct(res.baseline.cet1)} / {fmtPct(res.severelyAdverse.cet1)}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-1 text-[6px] font-mono text-neutral-700">
          <span className="flex items-center gap-1"><span className="w-2 h-1 bg-green-400/50 inline-block" /> Base</span>
          <span className="flex items-center gap-1"><span className="w-2 h-1 bg-yellow-400/50 inline-block" /> Adv</span>
          <span className="flex items-center gap-1"><span className="w-2 h-1 bg-red-400/50 inline-block" /> Sev. Adv</span>
        </div>
      </div>
    </div>
  );
}

function StressBar({
  value,
  maxValue,
  color,
}: {
  value: number;
  maxValue: number;
  color: string;
}) {
  const widthPct = Math.max((value / maxValue) * 100, 0.5);
  return (
    <div className="flex-1 h-full bg-white/[0.02] relative">
      <div
        className={`absolute top-0 left-0 h-full ${color}`}
        style={{ width: `${widthPct}%` }}
      />
      {/* 4.5% minimum line */}
      <div
        className="absolute top-0 h-full w-px bg-red-400/40"
        style={{ left: `${(4.5 / maxValue) * 100}%` }}
      />
    </div>
  );
}

// ── Section 4: Regulatory Timeline ──

function RegulatoryTimelineSection({
  events,
  t,
}: {
  events: RegulatoryEvent[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'rcTimeline', 'Upcoming Regulatory Events & Deadlines')}
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">
        <span className="w-16 shrink-0">Date</span>
        <span className="w-14 shrink-0">Impact</span>
        <span className="w-16 shrink-0">Authority</span>
        <span className="flex-1">Event</span>
      </div>

      {events.map((event, i) => {
        const badge = impactBadge(event.impact);
        return (
          <div
            key={i}
            className="flex items-start px-2 py-1.5 border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors"
          >
            <span className="w-16 text-[8px] font-mono text-neutral-400 shrink-0">
              {event.date}
            </span>
            <span className="w-14 shrink-0">
              <span className={`text-[6px] font-black font-mono uppercase px-1 py-0.5 ${badge.color} ${badge.bg}`}>
                {badge.text}
              </span>
            </span>
            <span className="w-16 text-[7px] font-mono font-bold text-rose-400/70 shrink-0">
              {event.authority}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[8px] font-mono font-bold text-white leading-tight">
                {event.event}
              </div>
              <div className="text-[7px] font-mono text-neutral-600 leading-tight mt-0.5">
                {event.description}
              </div>
            </div>
          </div>
        );
      })}

      {events.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
          {tr(t, 'rcNoEvents', 'No upcoming events')}
        </div>
      )}
    </div>
  );
}
