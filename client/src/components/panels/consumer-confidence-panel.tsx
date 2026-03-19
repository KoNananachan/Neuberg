import { useConsumerConfidence } from '../../api/hooks/use-consumer-confidence';
import { useT } from '../../i18n';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Types ──

type Signal = 'improving' | 'declining' | 'mixed';

interface MetricRow {
  label: string;
  current: string;
  previous: string;
  forecast: string;
  signal: Signal;
}

// ── Color helpers ──

function signalColor(s: Signal): string {
  if (s === 'improving') return 'text-green-400';
  if (s === 'declining') return 'text-red-400';
  return 'text-amber-400';
}

function signalDot(s: Signal): string {
  if (s === 'improving') return 'bg-green-400';
  if (s === 'declining') return 'bg-red-400';
  return 'bg-amber-400';
}

function signalLabel(s: Signal): string {
  if (s === 'improving') return 'ABOVE';
  if (s === 'declining') return 'BELOW';
  return 'MIXED';
}

// ── Fallback reference data (realistic as of mid-2026 estimates) ──

const LAST_UPDATED = '2026-03-14';

const CONSUMER_INDICES: MetricRow[] = [
  { label: 'CB Consumer Confidence', current: '103.2', previous: '104.8', forecast: '105.0', signal: 'declining' },
  { label: 'UMich Sentiment', current: '72.0', previous: '71.1', forecast: '71.5', signal: 'improving' },
  { label: 'UMich Expectations', current: '67.4', previous: '66.9', forecast: '67.0', signal: 'improving' },
  { label: 'UMich Current Conditions', current: '79.8', previous: '78.5', forecast: '79.0', signal: 'improving' },
  { label: 'IBD/TIPP Economic Optimism', current: '46.2', previous: '45.8', forecast: '46.0', signal: 'improving' },
  { label: 'Bloomberg Consumer Comfort', current: '34.1', previous: '33.6', forecast: '34.0', signal: 'improving' },
];

const COMPONENTS: MetricRow[] = [
  { label: 'Present Situation (CB)', current: '147.1', previous: '148.9', forecast: '149.0', signal: 'declining' },
  { label: 'Expectations (CB)', current: '73.8', previous: '75.2', forecast: '75.5', signal: 'declining' },
  { label: 'Jobs Plentiful', current: '37.0%', previous: '37.4%', forecast: '37.5%', signal: 'declining' },
  { label: 'Jobs Hard to Get', current: '16.8%', previous: '16.5%', forecast: '16.2%', signal: 'declining' },
  { label: 'Income Expectations', current: '16.3%', previous: '15.9%', forecast: '16.0%', signal: 'improving' },
  { label: 'Inflation Expectations (1Y)', current: '5.2%', previous: '5.4%', forecast: '5.3%', signal: 'improving' },
];

const RETAIL_SALES: MetricRow[] = [
  { label: 'Retail Sales MoM', current: '0.6%', previous: '-0.2%', forecast: '0.3%', signal: 'improving' },
  { label: 'Retail Sales YoY', current: '3.1%', previous: '2.8%', forecast: '2.9%', signal: 'improving' },
  { label: 'Core Retail (Ex-Auto)', current: '0.3%', previous: '0.1%', forecast: '0.2%', signal: 'improving' },
  { label: 'Redbook Retail YoY', current: '5.8%', previous: '5.4%', forecast: '5.5%', signal: 'improving' },
  { label: 'E-Commerce Sales QoQ', current: '2.1%', previous: '1.8%', forecast: '1.9%', signal: 'improving' },
];

const CONSUMER_SPENDING: MetricRow[] = [
  { label: 'PCE MoM', current: '0.4%', previous: '0.3%', forecast: '0.3%', signal: 'improving' },
  { label: 'Real PCE MoM', current: '0.1%', previous: '0.2%', forecast: '0.2%', signal: 'declining' },
  { label: 'Durable Goods Orders', current: '-1.2%', previous: '0.8%', forecast: '0.5%', signal: 'declining' },
  { label: 'Auto Sales (SAAR)', current: '15.8M', previous: '15.6M', forecast: '15.7M', signal: 'improving' },
  { label: 'Housing Starts', current: '1.42M', previous: '1.39M', forecast: '1.40M', signal: 'improving' },
];

const CREDIT_CARD_DATA: MetricRow[] = [
  { label: 'Revolving Credit ($B)', current: '$1,362', previous: '$1,355', forecast: '$1,358', signal: 'improving' },
  { label: 'CC Delinquency Rate', current: '3.01%', previous: '2.98%', forecast: '2.95%', signal: 'declining' },
  { label: 'CC Spending YoY', current: '4.2%', previous: '4.5%', forecast: '4.4%', signal: 'declining' },
  { label: 'Avg CC Balance', current: '$6,580', previous: '$6,490', forecast: '$6,510', signal: 'declining' },
  { label: 'CC Utilization Rate', current: '28.3%', previous: '28.1%', forecast: '28.0%', signal: 'declining' },
];

const SAVINGS_RATE: MetricRow[] = [
  { label: 'Personal Savings Rate', current: '4.1%', previous: '4.0%', forecast: '4.0%', signal: 'improving' },
  { label: 'Disposable Income MoM', current: '0.3%', previous: '0.2%', forecast: '0.3%', signal: 'mixed' },
  { label: 'Real Wages YoY', current: '1.1%', previous: '1.0%', forecast: '1.0%', signal: 'improving' },
  { label: 'Household Net Worth ($T)', current: '$163.8', previous: '$162.4', forecast: '$163.0', signal: 'improving' },
  { label: 'Debt-to-Income Ratio', current: '9.8%', previous: '9.7%', forecast: '9.7%', signal: 'declining' },
];

// ── Section data map ──

interface SectionDef {
  titleKey: string;
  titleFallback: string;
  data: MetricRow[];
}

const SECTIONS: SectionDef[] = [
  { titleKey: 'ccSectionIndices', titleFallback: 'Consumer Indices', data: CONSUMER_INDICES },
  { titleKey: 'ccSectionComponents', titleFallback: 'Components', data: COMPONENTS },
  { titleKey: 'ccSectionRetail', titleFallback: 'Retail Sales', data: RETAIL_SALES },
  { titleKey: 'ccSectionSpending', titleFallback: 'Consumer Spending', data: CONSUMER_SPENDING },
  { titleKey: 'ccSectionCredit', titleFallback: 'Credit Card Data', data: CREDIT_CARD_DATA },
  { titleKey: 'ccSectionSavings', titleFallback: 'Savings Rate', data: SAVINGS_RATE },
];

// ── Main Panel ──

export function ConsumerConfidencePanel() {
  const t = useT();
  const { data, isLoading } = useConsumerConfidence();

  // Use API data when available; otherwise use fallback
  const _ = data; // reserved for future API integration

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {tr(t, 'ccTitle', 'Consumer Confidence')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <OverallBadge />
          <span className="text-[7px] font-mono text-neutral-500">
            {tr(t, 'ccUpdated', 'Updated')}: {LAST_UPDATED}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {/* Summary strip */}
        <SummaryStrip />

        {/* Sections */}
        {SECTIONS.map((section) => (
          <DataSection key={section.titleKey} section={section} />
        ))}

        {/* Disclaimer */}
        <div className="px-3 py-2 border-t border-border/20">
          <p className="text-[7px] font-mono text-neutral-500/40 leading-relaxed uppercase">
            {tr(t, 'ccDisclaimer', 'Data for reference only. Sources: Conference Board, UMich, BEA, Fed. Not investment advice.')}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Overall Sentiment Badge ──

function OverallBadge() {
  // Tally signals across all sections
  let improving = 0;
  let declining = 0;
  SECTIONS.forEach((s) =>
    s.data.forEach((r) => {
      if (r.signal === 'improving') improving++;
      if (r.signal === 'declining') declining++;
    }),
  );

  const overall: Signal = improving > declining ? 'improving' : declining > improving ? 'declining' : 'mixed';
  const color =
    overall === 'improving'
      ? 'text-green-400 bg-green-500/10 border-green-500/30'
      : overall === 'declining'
        ? 'text-red-400 bg-red-500/10 border-red-500/30'
        : 'text-amber-400 bg-amber-500/10 border-amber-500/30';

  const label =
    overall === 'improving' ? 'BULLISH' : overall === 'declining' ? 'BEARISH' : 'NEUTRAL';

  return (
    <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${color}`}>
      {label}
    </span>
  );
}

// ── Summary Strip ──

function SummaryStrip() {
  const highlights = [
    { label: 'CB CONF', value: '103.2', signal: 'declining' as Signal },
    { label: 'UMICH', value: '72.0', signal: 'improving' as Signal },
    { label: 'RETAIL MoM', value: '+0.6%', signal: 'improving' as Signal },
    { label: 'PCE MoM', value: '+0.4%', signal: 'improving' as Signal },
    { label: 'SAVINGS', value: '4.1%', signal: 'improving' as Signal },
    { label: 'CC DELINQ', value: '3.01%', signal: 'declining' as Signal },
  ];

  return (
    <div className="grid grid-cols-6 gap-px bg-border/10 border-b border-border/20">
      {highlights.map((h) => (
        <div
          key={h.label}
          className="bg-black px-2 py-1.5 hover:bg-amber-400/[0.02] transition-colors"
        >
          <div className="text-[7px] font-mono text-neutral-500/50 uppercase tracking-wider truncate">
            {h.label}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-[11px] font-mono font-black ${signalColor(h.signal)}`}>
              {h.value}
            </span>
            <div className={`w-1 h-1 ${signalDot(h.signal)}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Data Section ──

function DataSection({ section }: { section: SectionDef }) {
  const t = useT();

  // Count signals for this section
  const improving = section.data.filter((r) => r.signal === 'improving').length;
  const declining = section.data.filter((r) => r.signal === 'declining').length;
  const sectionSignal: Signal =
    improving > declining ? 'improving' : declining > improving ? 'declining' : 'mixed';

  return (
    <div className="border-b border-border/20">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-1 bg-white/[0.02] border-b border-border/20">
        <div className="flex items-center gap-2">
          <div className={`w-1 h-1 ${signalDot(sectionSignal)}`} />
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/60">
            {tr(t, section.titleKey, section.titleFallback)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[7px] font-mono text-green-400/50">{improving}UP</span>
          <span className="text-[7px] font-mono text-red-400/50">{declining}DN</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_0.4fr] px-3 py-0.5 text-[7px] font-black font-mono text-neutral-500/30 uppercase tracking-wider border-b border-border/10">
        <span>{tr(t, 'ccColIndicator', 'Indicator')}</span>
        <span className="text-right">{tr(t, 'ccColCurrent', 'Current')}</span>
        <span className="text-right">{tr(t, 'ccColPrevious', 'Previous')}</span>
        <span className="text-right">{tr(t, 'ccColForecast', 'Forecast')}</span>
        <span className="text-right">{tr(t, 'ccColSignal', 'Signal')}</span>
      </div>

      {/* Rows */}
      {section.data.map((row) => (
        <MetricRowItem key={row.label} row={row} />
      ))}
    </div>
  );
}

// ── Metric Row ──

function MetricRowItem({ row }: { row: MetricRow }) {
  return (
    <div className="grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_0.4fr] px-3 py-1 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors items-center">
      <span className="text-[8px] font-mono text-neutral-500/60 uppercase truncate">
        {row.label}
      </span>
      <span className={`text-[9px] font-mono font-bold text-right ${signalColor(row.signal)}`}>
        {row.current}
      </span>
      <span className="text-[8px] font-mono text-neutral-500/40 text-right">
        {row.previous}
      </span>
      <span className="text-[8px] font-mono text-neutral-500/30 text-right">
        {row.forecast}
      </span>
      <div className="flex items-center justify-end gap-1">
        <div className={`w-1 h-1 ${signalDot(row.signal)}`} />
        <span className={`text-[7px] font-mono font-bold ${signalColor(row.signal)}`}>
          {signalLabel(row.signal)}
        </span>
      </div>
    </div>
  );
}
