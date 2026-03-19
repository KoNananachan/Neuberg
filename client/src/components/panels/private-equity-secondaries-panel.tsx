import { useState } from 'react';
import { usePrivateEquitySecondaries } from '../../api/hooks/use-private-equity-secondaries';

// ── Constants ──

const PURPLE = '#c084fc'; // purple-400
const GREEN = '#34d399';
const RED = '#f87171';
const AMBER = '#fbbf24';
const BLUE = '#60a5fa';
const CYAN = '#67e8f9';
const PINK = '#f472b6';

type TabId = 'deals' | 'pricing' | 'volume' | 'participants' | 'trends';

const TABS: { id: TabId; label: string }[] = [
  { id: 'deals', label: 'DEALS' },
  { id: 'pricing', label: 'PRICING' },
  { id: 'volume', label: 'VOLUME' },
  { id: 'participants', label: 'PARTICIPANTS' },
  { id: 'trends', label: 'TRENDS' },
];

// ── Formatting helpers ──

function fmtValue(n: number): string {
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'T';
  if (Math.abs(n) >= 1) return '$' + n.toFixed(1) + 'B';
  return '$' + (n * 1_000).toFixed(0) + 'M';
}

function fmtPct(n: number | null): string {
  if (n == null) return '--';
  return n.toFixed(1) + '%';
}

function fmtPctSigned(n: number | null): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}

function fmtDiscount(n: number | null): string {
  if (n == null) return '--';
  if (n < 0) return n.toFixed(1) + '%';
  if (n > 0) return '+' + n.toFixed(1) + '%';
  return 'PAR';
}

// ── Color helpers ──

function discountColor(n: number | null): string {
  if (n == null) return 'rgba(255,255,255,0.3)';
  if (n < 0) return RED;   // discount = red
  if (n > 0) return GREEN;  // premium = green
  return 'rgba(255,255,255,0.5)';
}

function volumeColor(n: number | null, threshold: number): string {
  if (n == null) return 'rgba(255,255,255,0.3)';
  if (n >= threshold) return GREEN;
  return 'rgba(255,255,255,0.5)';
}

function strategyColor(strategy: string): string {
  switch (strategy.toLowerCase()) {
    case 'buyout': return BLUE;
    case 'venture': return AMBER;
    case 'growth': return GREEN;
    case 'real estate': return CYAN;
    case 'infrastructure': return CYAN;
    case 'credit': return PINK;
    case 'energy': return '#fb923c';
    case 'diversified': return PURPLE;
    default: return 'rgba(255,255,255,0.4)';
  }
}

function strategyBg(strategy: string): string {
  switch (strategy.toLowerCase()) {
    case 'buyout': return 'rgba(96,165,250,0.12)';
    case 'venture': return 'rgba(251,191,36,0.12)';
    case 'growth': return 'rgba(52,211,153,0.12)';
    case 'real estate': return 'rgba(103,232,249,0.12)';
    case 'infrastructure': return 'rgba(103,232,249,0.12)';
    case 'credit': return 'rgba(244,114,182,0.12)';
    case 'energy': return 'rgba(251,146,60,0.12)';
    case 'diversified': return 'rgba(192,132,252,0.12)';
    default: return 'rgba(255,255,255,0.04)';
  }
}

function percentileColor(pctile: number): string {
  if (pctile >= 75) return GREEN;
  if (pctile >= 50) return AMBER;
  if (pctile >= 25) return '#fb923c';
  return RED;
}

// ── Fallback data ──

const FALLBACK_DATA = {
  timestamp: '2026-03-19T14:30:00Z',
  summary: {
    totalVolume: 152.0,
    dealCount: 487,
    avgDiscount: -8.4,
    gpLedPct: 52.3,
    lpLedPct: 47.7,
    yoyChange: 18.2,
  },
  deals: [
    { fund: 'Apollo IX', strategy: 'Buyout', vintage: 2019, nav: 2.4, priceNavPct: 92.5, discount: -7.5, buyer: 'Lexington Partners' },
    { fund: 'Sequoia Growth IV', strategy: 'Venture', vintage: 2021, nav: 1.8, priceNavPct: 78.2, discount: -21.8, buyer: 'Ardian' },
    { fund: 'Blackstone RE VII', strategy: 'Real Estate', vintage: 2018, nav: 3.1, priceNavPct: 88.0, discount: -12.0, buyer: 'Coller Capital' },
    { fund: 'KKR Americas XII', strategy: 'Buyout', vintage: 2017, nav: 4.2, priceNavPct: 96.8, discount: -3.2, buyer: 'Alpinvest' },
    { fund: 'Insight Venture XI', strategy: 'Growth', vintage: 2020, nav: 1.5, priceNavPct: 85.4, discount: -14.6, buyer: 'HarbourVest' },
    { fund: 'Carlyle Infra III', strategy: 'Infrastructure', vintage: 2016, nav: 2.8, priceNavPct: 101.2, discount: 1.2, buyer: 'StepStone' },
    { fund: 'Tiger Global PIP XV', strategy: 'Venture', vintage: 2022, nav: 0.9, priceNavPct: 62.5, discount: -37.5, buyer: 'Ares Management' },
    { fund: 'TPG Growth V', strategy: 'Growth', vintage: 2019, nav: 1.9, priceNavPct: 90.1, discount: -9.9, buyer: 'Pantheon' },
    { fund: 'Warburg Pincus XIII', strategy: 'Buyout', vintage: 2020, nav: 3.5, priceNavPct: 94.3, discount: -5.7, buyer: 'ICG' },
    { fund: 'a16z Crypto III', strategy: 'Venture', vintage: 2022, nav: 0.6, priceNavPct: 55.0, discount: -45.0, buyer: 'Lexington Partners' },
  ],
  pricing: [
    { strategy: 'Buyout', currentDiscount: -5.8, prevQuarter: -7.2, yearAgo: -10.1, bidAskSpread: 3.2, dealCount: 142 },
    { strategy: 'Venture', currentDiscount: -28.4, prevQuarter: -32.1, yearAgo: -38.5, bidAskSpread: 8.7, dealCount: 68 },
    { strategy: 'Growth', currentDiscount: -12.3, prevQuarter: -14.8, yearAgo: -18.2, bidAskSpread: 5.1, dealCount: 85 },
    { strategy: 'Real Estate', currentDiscount: -14.7, prevQuarter: -16.2, yearAgo: -19.8, bidAskSpread: 4.8, dealCount: 52 },
    { strategy: 'Infrastructure', currentDiscount: -2.1, prevQuarter: -3.4, yearAgo: -5.8, bidAskSpread: 2.1, dealCount: 38 },
    { strategy: 'Credit', currentDiscount: -3.5, prevQuarter: -4.1, yearAgo: -6.2, bidAskSpread: 1.8, dealCount: 61 },
    { strategy: 'Energy', currentDiscount: -8.9, prevQuarter: -10.5, yearAgo: -14.3, bidAskSpread: 4.2, dealCount: 25 },
    { strategy: 'Diversified', currentDiscount: -6.4, prevQuarter: -7.8, yearAgo: -9.5, bidAskSpread: 3.5, dealCount: 16 },
  ],
  volume: [
    { quarter: 'Q1 2025', totalVolume: 28.5, gpLed: 14.8, lpLed: 13.7, yoyChange: 22.4, dealCount: 98 },
    { quarter: 'Q2 2025', totalVolume: 34.2, gpLed: 18.1, lpLed: 16.1, yoyChange: 15.8, dealCount: 112 },
    { quarter: 'Q3 2025', totalVolume: 41.8, gpLed: 21.5, lpLed: 20.3, yoyChange: 28.3, dealCount: 134 },
    { quarter: 'Q4 2025', totalVolume: 47.5, gpLed: 25.2, lpLed: 22.3, yoyChange: 12.1, dealCount: 143 },
    { quarter: 'Q1 2026', totalVolume: 38.6, gpLed: 20.1, lpLed: 18.5, yoyChange: 35.4, dealCount: 121 },
  ],
  participants: {
    topBuyers: [
      { name: 'Lexington Partners', volume: 18.2, dealCount: 42, type: 'Dedicated Secondary' },
      { name: 'Ardian', volume: 15.8, dealCount: 38, type: 'Dedicated Secondary' },
      { name: 'Coller Capital', volume: 12.4, dealCount: 31, type: 'Dedicated Secondary' },
      { name: 'HarbourVest', volume: 11.9, dealCount: 35, type: 'Dedicated Secondary' },
      { name: 'Alpinvest', volume: 10.5, dealCount: 28, type: 'Dedicated Secondary' },
      { name: 'StepStone', volume: 8.7, dealCount: 24, type: 'Advisor/Buyer' },
      { name: 'Pantheon', volume: 7.2, dealCount: 22, type: 'Dedicated Secondary' },
      { name: 'Ares Management', volume: 6.8, dealCount: 19, type: 'Multi-Strategy' },
    ],
    topSellers: [
      { name: 'CalPERS', volume: 8.5, dealCount: 12, type: 'Public Pension' },
      { name: 'CPPIB', volume: 7.2, dealCount: 9, type: 'Sovereign Wealth' },
      { name: 'GIC', volume: 6.8, dealCount: 8, type: 'Sovereign Wealth' },
      { name: 'Ontario Teachers', volume: 5.4, dealCount: 7, type: 'Public Pension' },
      { name: 'Yale Endowment', volume: 4.1, dealCount: 6, type: 'Endowment' },
      { name: 'Harvard Management', volume: 3.8, dealCount: 5, type: 'Endowment' },
    ],
    buyerTypeBreakdown: [
      { type: 'Dedicated Secondary', pct: 48.2, volume: 73.3 },
      { type: 'Multi-Strategy', pct: 18.5, volume: 28.1 },
      { type: 'Pension/SWF', pct: 14.8, volume: 22.5 },
      { type: 'GP-Led Continuation', pct: 12.1, volume: 18.4 },
      { type: 'Other', pct: 6.4, volume: 9.7 },
    ],
  },
  trends: [
    { strategy: 'Buyout', q1_2025: -7.2, q2_2025: -6.8, q3_2025: -6.1, q4_2025: -5.8, q1_2026: -5.4, percentile: 72 },
    { strategy: 'Venture', q1_2025: -35.1, q2_2025: -33.2, q3_2025: -30.8, q4_2025: -28.4, q1_2026: -26.1, percentile: 18 },
    { strategy: 'Growth', q1_2025: -18.2, q2_2025: -16.5, q3_2025: -14.1, q4_2025: -12.3, q1_2026: -11.0, percentile: 35 },
    { strategy: 'Real Estate', q1_2025: -19.8, q2_2025: -18.1, q3_2025: -16.4, q4_2025: -14.7, q1_2026: -13.2, percentile: 28 },
    { strategy: 'Infrastructure', q1_2025: -5.8, q2_2025: -4.5, q3_2025: -3.1, q4_2025: -2.1, q1_2026: -1.5, percentile: 85 },
    { strategy: 'Credit', q1_2025: -6.2, q2_2025: -5.4, q3_2025: -4.5, q4_2025: -3.5, q1_2026: -2.8, percentile: 78 },
    { strategy: 'Energy', q1_2025: -14.3, q2_2025: -12.8, q3_2025: -11.2, q4_2025: -8.9, q1_2026: -7.5, percentile: 42 },
  ],
};

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border/20 bg-[#030303]">
      <div className="w-1 h-1 bg-purple-400" />
      <span className="text-[7px] font-black uppercase tracking-widest text-purple-400">
        {title}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function PrivateEquitySecondariesPanel() {
  const { data: hookData, isLoading } = usePrivateEquitySecondaries();
  const [activeTab, setActiveTab] = useState<TabId>('deals');

  const d = (hookData as any) ?? FALLBACK_DATA;

  if (isLoading && !hookData) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-purple-400/40 uppercase tracking-widest animate-pulse">
          LOADING PE SECONDARIES DATA...
        </span>
      </div>
    );
  }

  if (!hookData && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider">
          FAILED TO LOAD PE SECONDARIES DATA
        </span>
      </div>
    );
  }

  const summary = d?.summary ?? d?.overview ?? {};
  const deals = d?.deals ?? [];
  const pricing = d?.pricing ?? [];
  const volume = d?.volume ?? [];
  const participants = d?.participants ?? {};
  const trends = d?.trends ?? [];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#050505] border-b border-purple-400/30 shrink-0">
        <div className="w-[3px] h-4 bg-purple-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-tighter text-purple-400">
          PE SECONDARIES
        </span>
        <div className="ml-auto flex items-center gap-3 text-[8px] text-neutral-400">
          <span>
            Vol <span className="text-purple-400 font-bold">{fmtValue(summary.totalVolume ?? 0)}</span>
          </span>
          <span>
            Avg Disc{' '}
            <span style={{ color: discountColor(summary.avgDiscount ?? null) }} className="font-bold">
              {fmtDiscount(summary.avgDiscount ?? null)}
            </span>
          </span>
        </div>
      </div>

      {/* Summary Stats Bar */}
      <SummaryBar summary={summary} />

      {/* Tab Bar */}
      <div className="flex shrink-0 border-b border-purple-400/30 bg-[#030303]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1 text-[7px] font-black uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? 'text-purple-400 border-b border-purple-400 bg-purple-400/[0.04]'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'deals' && <DealsTab deals={deals} />}
        {activeTab === 'pricing' && <PricingTab pricing={pricing} />}
        {activeTab === 'volume' && <VolumeTab volume={volume} />}
        {activeTab === 'participants' && <ParticipantsTab participants={participants} />}
        {activeTab === 'trends' && <TrendsTab trends={trends} />}
      </div>
    </div>
  );
}

// ── Summary Stats Bar ──

function SummaryBar({ summary }: { summary: any }) {
  const stats = [
    { label: 'TOTAL VOLUME', value: fmtValue(summary.totalVolume ?? 0), accent: true },
    { label: 'DEAL COUNT', value: String(summary.dealCount ?? '--'), accent: false },
    { label: 'AVG DISCOUNT', value: fmtDiscount(summary.avgDiscount ?? null), color: discountColor(summary.avgDiscount ?? null) },
    { label: 'GP-LED', value: fmtPct(summary.gpLedPct ?? null), accent: false },
    { label: 'LP-LED', value: fmtPct(summary.lpLedPct ?? null), accent: false },
    { label: 'YOY CHANGE', value: fmtPctSigned(summary.yoyChange ?? null), color: (summary.yoyChange ?? 0) >= 0 ? GREEN : RED },
  ];

  return (
    <div className="shrink-0 grid grid-cols-6 border-b border-purple-400/30">
      {stats.map((s, i) => (
        <div key={i} className="flex flex-col items-center py-1.5 px-1 border-r border-border/20 last:border-r-0">
          <span className="text-[7px] uppercase tracking-widest font-black text-neutral-500">{s.label}</span>
          <span
            className="text-[10px] font-bold tabular-nums"
            style={{ color: s.color ?? (s.accent ? PURPLE : 'rgba(255,255,255,0.6)') }}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Deals Tab ──

function DealsTab({ deals }: { deals: any[] }) {
  if (deals.length === 0) {
    return <EmptyState label="NO DEAL DATA AVAILABLE" />;
  }

  return (
    <div>
      <SectionHeader title="Recent Secondary Transactions" />

      {/* Table header */}
      <div className="grid grid-cols-[1fr_60px_40px_50px_50px_50px_80px] px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Fund</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Strategy</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Vntg</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">NAV</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">% NAV</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Disc</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Buyer</span>
      </div>

      {deals.map((d: any, i: number) => {
        const sColor = strategyColor(d.strategy ?? '');
        const sBg = strategyBg(d.strategy ?? '');
        const dColor = discountColor(d.discount ?? null);

        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_60px_40px_50px_50px_50px_80px] px-3 py-1 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            <span className="text-neutral-300 font-bold truncate">{d.fund ?? '--'}</span>
            <div className="flex justify-center">
              <span
                className="text-[6px] font-black uppercase px-1 py-0 truncate"
                style={{ color: sColor, backgroundColor: sBg }}
              >
                {d.strategy ?? '--'}
              </span>
            </div>
            <span className="text-neutral-400 text-right tabular-nums">{d.vintage ?? '--'}</span>
            <span className="text-neutral-300 text-right tabular-nums">{fmtValue(d.nav ?? 0)}</span>
            <span className="text-neutral-300 text-right tabular-nums">{fmtPct(d.priceNavPct ?? null)}</span>
            <span className="text-right tabular-nums font-bold" style={{ color: dColor }}>
              {fmtDiscount(d.discount ?? null)}
            </span>
            <span className="text-neutral-400 text-right truncate">{d.buyer ?? '--'}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Pricing Tab ──

function PricingTab({ pricing }: { pricing: any[] }) {
  if (pricing.length === 0) {
    return <EmptyState label="NO PRICING DATA AVAILABLE" />;
  }

  return (
    <div>
      <SectionHeader title="Market Pricing by Strategy" />

      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_55px_55px_50px_40px] px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Strategy</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Current</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Prev Q</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Yr Ago</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Spread</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Deals</span>
      </div>

      {pricing.map((p: any, i: number) => {
        const sColor = strategyColor(p.strategy ?? '');
        const sBg = strategyBg(p.strategy ?? '');
        const isVenture = (p.strategy ?? '').toLowerCase() === 'venture';

        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_55px_55px_55px_50px_40px] px-3 py-1 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 shrink-0" style={{ backgroundColor: sColor }} />
              <span
                className="text-[6px] font-black uppercase px-1 py-0"
                style={{ color: sColor, backgroundColor: sBg }}
              >
                {p.strategy ?? '--'}
              </span>
            </div>
            <span
              className="text-right tabular-nums font-bold"
              style={{ color: isVenture ? AMBER : discountColor(p.currentDiscount ?? null) }}
            >
              {fmtDiscount(p.currentDiscount ?? null)}
            </span>
            <span className="text-neutral-400 text-right tabular-nums">
              {fmtDiscount(p.prevQuarter ?? null)}
            </span>
            <span className="text-neutral-500 text-right tabular-nums">
              {fmtDiscount(p.yearAgo ?? null)}
            </span>
            <span className="text-neutral-300 text-right tabular-nums">
              {p.bidAskSpread != null ? p.bidAskSpread.toFixed(1) + 'pp' : '--'}
            </span>
            <span className="text-neutral-400 text-right tabular-nums">{p.dealCount ?? '--'}</span>
          </div>
        );
      })}

      {/* Discount bar visualization */}
      <div className="px-3 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
          NAV DISCOUNT SPECTRUM
        </div>
        {pricing.map((p: any, i: number) => {
          const sColor = strategyColor(p.strategy ?? '');
          const discount = Math.abs(p.currentDiscount ?? 0);
          const maxDiscount = 50;
          const barWidth = Math.min((discount / maxDiscount) * 100, 100);
          const isVenture = (p.strategy ?? '').toLowerCase() === 'venture';

          return (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="text-[7px] text-neutral-500 w-[60px] truncate uppercase">
                {p.strategy}
              </span>
              <div className="flex-1 h-[3px] bg-white/[0.04]">
                <div
                  className="h-full"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: isVenture ? AMBER : sColor,
                    opacity: 0.6,
                  }}
                />
              </div>
              <span
                className="text-[7px] tabular-nums font-bold w-[36px] text-right"
                style={{ color: isVenture ? AMBER : sColor }}
              >
                {fmtDiscount(p.currentDiscount ?? null)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Volume Tab ──

function VolumeTab({ volume }: { volume: any[] }) {
  if (volume.length === 0) {
    return <EmptyState label="NO VOLUME DATA AVAILABLE" />;
  }

  const maxVol = Math.max(...volume.map((v: any) => v.totalVolume ?? 0), 1);
  const highVolumeThreshold = maxVol * 0.7;

  return (
    <div>
      <SectionHeader title="Quarterly Deal Volume" />

      {/* Table header */}
      <div className="grid grid-cols-[70px_55px_55px_55px_55px_40px] px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Quarter</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Total</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">GP-Led</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">LP-Led</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">YoY</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Deals</span>
      </div>

      {volume.map((v: any, i: number) => {
        const yoyColor = (v.yoyChange ?? 0) >= 0 ? GREEN : RED;
        const volColor = volumeColor(v.totalVolume, highVolumeThreshold);

        return (
          <div
            key={i}
            className="grid grid-cols-[70px_55px_55px_55px_55px_40px] px-3 py-1 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            <span className="text-neutral-300 font-bold">{v.quarter ?? '--'}</span>
            <span className="text-right tabular-nums font-bold" style={{ color: volColor }}>
              {fmtValue(v.totalVolume ?? 0)}
            </span>
            <span className="text-neutral-300 text-right tabular-nums">{fmtValue(v.gpLed ?? 0)}</span>
            <span className="text-neutral-300 text-right tabular-nums">{fmtValue(v.lpLed ?? 0)}</span>
            <span className="text-right tabular-nums font-bold" style={{ color: yoyColor }}>
              {fmtPctSigned(v.yoyChange ?? null)}
            </span>
            <span className="text-neutral-400 text-right tabular-nums">{v.dealCount ?? '--'}</span>
          </div>
        );
      })}

      {/* GP-Led vs LP-Led split visualization */}
      <div className="px-3 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
          GP-LED VS LP-LED SPLIT
        </div>
        {volume.map((v: any, i: number) => {
          const total = (v.gpLed ?? 0) + (v.lpLed ?? 0);
          const gpPct = total > 0 ? ((v.gpLed ?? 0) / total) * 100 : 50;

          return (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="text-[7px] text-neutral-500 w-[50px]">{v.quarter}</span>
              <div className="flex-1 h-[4px] flex">
                <div
                  className="h-full"
                  style={{ width: `${gpPct}%`, backgroundColor: PURPLE, opacity: 0.6 }}
                />
                <div
                  className="h-full"
                  style={{ width: `${100 - gpPct}%`, backgroundColor: BLUE, opacity: 0.4 }}
                />
              </div>
              <span className="text-[7px] tabular-nums text-purple-400 w-[28px] text-right">
                {gpPct.toFixed(0)}%
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-[3px] bg-purple-400/60" />
            <span className="text-[6px] text-neutral-500 uppercase">GP-Led</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-[3px] bg-blue-400/40" />
            <span className="text-[6px] text-neutral-500 uppercase">LP-Led</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Participants Tab ──

function ParticipantsTab({ participants }: { participants: any }) {
  const topBuyers = participants?.topBuyers ?? [];
  const topSellers = participants?.topSellers ?? [];
  const buyerTypeBreakdown = participants?.buyerTypeBreakdown ?? [];

  if (topBuyers.length === 0 && topSellers.length === 0) {
    return <EmptyState label="NO PARTICIPANT DATA AVAILABLE" />;
  }

  const maxBuyerVol = Math.max(...topBuyers.map((b: any) => b.volume ?? 0), 1);
  const maxSellerVol = Math.max(...topSellers.map((s: any) => s.volume ?? 0), 1);

  return (
    <div>
      {/* Top Buyers */}
      {topBuyers.length > 0 && (
        <div>
          <SectionHeader title="Top Buyers" />

          <div className="grid grid-cols-[1fr_50px_35px_80px_60px] px-3 py-1 border-b border-border/20 bg-[#030303]">
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Name</span>
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Volume</span>
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Deals</span>
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Type</span>
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Share</span>
          </div>

          {topBuyers.map((b: any, i: number) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_50px_35px_80px_60px] px-3 py-1 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors items-center"
            >
              <span className="text-purple-400 font-bold truncate">{b.name ?? '--'}</span>
              <span className="text-neutral-300 text-right tabular-nums">{fmtValue(b.volume ?? 0)}</span>
              <span className="text-neutral-400 text-right tabular-nums">{b.dealCount ?? '--'}</span>
              <div className="flex justify-center">
                <span className="text-[6px] font-black uppercase px-1 py-0 text-neutral-400 bg-white/[0.04] truncate">
                  {b.type ?? '--'}
                </span>
              </div>
              <div className="flex items-center justify-end gap-1">
                <div className="w-[30px] h-[3px] bg-white/[0.04]">
                  <div
                    className="h-full bg-purple-400/40"
                    style={{ width: `${((b.volume ?? 0) / maxBuyerVol) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Sellers */}
      {topSellers.length > 0 && (
        <div>
          <SectionHeader title="Top Sellers" />

          <div className="grid grid-cols-[1fr_50px_35px_80px_60px] px-3 py-1 border-b border-border/20 bg-[#030303]">
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Name</span>
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Volume</span>
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Deals</span>
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Type</span>
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Share</span>
          </div>

          {topSellers.map((s: any, i: number) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_50px_35px_80px_60px] px-3 py-1 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors items-center"
            >
              <span className="text-neutral-300 font-bold truncate">{s.name ?? '--'}</span>
              <span className="text-neutral-300 text-right tabular-nums">{fmtValue(s.volume ?? 0)}</span>
              <span className="text-neutral-400 text-right tabular-nums">{s.dealCount ?? '--'}</span>
              <div className="flex justify-center">
                <span className="text-[6px] font-black uppercase px-1 py-0 text-neutral-400 bg-white/[0.04] truncate">
                  {s.type ?? '--'}
                </span>
              </div>
              <div className="flex items-center justify-end gap-1">
                <div className="w-[30px] h-[3px] bg-white/[0.04]">
                  <div
                    className="h-full bg-neutral-400/40"
                    style={{ width: `${((s.volume ?? 0) / maxSellerVol) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Buyer Type Breakdown */}
      {buyerTypeBreakdown.length > 0 && (
        <div>
          <SectionHeader title="Buyer Type Breakdown" />

          <div className="grid grid-cols-[1fr_50px_50px_80px] px-3 py-1 border-b border-border/20 bg-[#030303]">
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Type</span>
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">% Share</span>
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Volume</span>
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Distribution</span>
          </div>

          {buyerTypeBreakdown.map((bt: any, i: number) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_50px_50px_80px] px-3 py-1 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors items-center"
            >
              <span className="text-neutral-300 font-bold truncate">{bt.type ?? '--'}</span>
              <span className="text-purple-400 text-right tabular-nums font-bold">{fmtPct(bt.pct ?? null)}</span>
              <span className="text-neutral-400 text-right tabular-nums">{fmtValue(bt.volume ?? 0)}</span>
              <div className="flex items-center justify-end gap-1.5">
                <div className="w-[50px] h-[4px] bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full bg-purple-400/40"
                    style={{ width: `${bt.pct ?? 0}%` }}
                  />
                </div>
                <span className="text-[7px] tabular-nums text-purple-400 w-[24px] text-right">
                  {(bt.pct ?? 0).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Trends Tab ──

function TrendsTab({ trends }: { trends: any[] }) {
  if (trends.length === 0) {
    return <EmptyState label="NO TREND DATA AVAILABLE" />;
  }

  const quarters = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026'];
  const qKeys = ['q1_2025', 'q2_2025', 'q3_2025', 'q4_2025', 'q1_2026'] as const;

  return (
    <div>
      {/* Pricing Trends Table */}
      <SectionHeader title="Pricing Trends by Strategy" />

      <div className="grid grid-cols-[1fr_48px_48px_48px_48px_48px] px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Strategy</span>
        {quarters.map((q) => (
          <span key={q} className="text-[6px] font-bold uppercase tracking-wider text-neutral-500 text-right">
            {q}
          </span>
        ))}
      </div>

      {trends.map((t: any, i: number) => {
        const sColor = strategyColor(t.strategy ?? '');
        const isVenture = (t.strategy ?? '').toLowerCase() === 'venture';

        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_48px_48px_48px_48px_48px] px-3 py-1 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 shrink-0" style={{ backgroundColor: sColor }} />
              <span className="text-neutral-300 font-bold truncate">{t.strategy ?? '--'}</span>
            </div>
            {qKeys.map((qk) => {
              const val = t[qk] ?? null;
              return (
                <span
                  key={qk}
                  className="text-right tabular-nums"
                  style={{ color: isVenture ? AMBER : discountColor(val) }}
                >
                  {fmtDiscount(val)}
                </span>
              );
            })}
          </div>
        );
      })}

      {/* Sparkline-style trend arrows */}
      <div className="px-3 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
          DISCOUNT TRAJECTORY (Q1 2025 TO Q1 2026)
        </div>
        {trends.map((t: any, i: number) => {
          const sColor = strategyColor(t.strategy ?? '');
          const isVenture = (t.strategy ?? '').toLowerCase() === 'venture';
          const first = Math.abs(t.q1_2025 ?? 0);
          const last = Math.abs(t.q1_2026 ?? 0);
          const improvement = first - last;
          const maxDiscount = 50;

          return (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="text-[7px] text-neutral-500 w-[65px] truncate uppercase">
                {t.strategy}
              </span>
              <div className="flex-1 h-[3px] bg-white/[0.04] relative">
                <div
                  className="absolute h-full top-0 left-0"
                  style={{
                    width: `${Math.min((first / maxDiscount) * 100, 100)}%`,
                    backgroundColor: isVenture ? AMBER : sColor,
                    opacity: 0.2,
                  }}
                />
                <div
                  className="absolute h-full top-0 left-0"
                  style={{
                    width: `${Math.min((last / maxDiscount) * 100, 100)}%`,
                    backgroundColor: isVenture ? AMBER : sColor,
                    opacity: 0.6,
                  }}
                />
              </div>
              <span
                className="text-[7px] tabular-nums font-bold w-[36px] text-right"
                style={{ color: improvement > 0 ? GREEN : RED }}
              >
                {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}pp
              </span>
            </div>
          );
        })}
      </div>

      {/* NAV Discount Percentile Rankings */}
      <SectionHeader title="NAV Discount Percentile Rankings" />

      <div className="grid grid-cols-[1fr_55px_80px] px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Strategy</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Pctile</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Distribution</span>
      </div>

      {trends.map((t: any, i: number) => {
        const pctile = t.percentile ?? 50;
        const pColor = percentileColor(pctile);
        const isVenture = (t.strategy ?? '').toLowerCase() === 'venture';

        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_55px_80px] px-3 py-1 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-1 h-1 shrink-0"
                style={{ backgroundColor: isVenture ? AMBER : strategyColor(t.strategy ?? '') }}
              />
              <span className="text-neutral-300 font-bold truncate">{t.strategy ?? '--'}</span>
            </div>
            <span className="text-right tabular-nums font-bold" style={{ color: pColor }}>
              {pctile}th
            </span>
            <div className="flex items-center justify-end gap-1.5">
              <div className="w-[50px] h-[4px] bg-white/[0.04] overflow-hidden relative">
                <div
                  className="absolute h-full top-0 left-0"
                  style={{ width: `${pctile}%`, backgroundColor: pColor, opacity: 0.5 }}
                />
                <div
                  className="absolute w-[2px] h-full top-0"
                  style={{ left: `${pctile}%`, backgroundColor: pColor }}
                />
              </div>
              <span className="text-[7px] tabular-nums w-[20px] text-right" style={{ color: pColor }}>
                {pctile}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Empty State ──

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}
