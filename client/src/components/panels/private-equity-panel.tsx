import { usePrivateEquity } from '../../api/hooks/use-private-equity';
import { Briefcase } from 'lucide-react';

// ── Constants ──

const LIME = '#a3e635'; // lime-400
const GREEN = '#34d399';
const RED = '#f87171';
const BLUE = '#60a5fa';
const YELLOW = '#fbbf24';
const ORANGE = '#fb923c';
const PURPLE = '#c084fc';

// ── Formatting helpers ──

function fmtValue(n: number): string {
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'T';
  if (Math.abs(n) >= 1) return '$' + n.toFixed(1) + 'B';
  return '$' + (n * 1_000).toFixed(0) + 'M';
}

function fmtValueShort(n: number): string {
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'T';
  if (Math.abs(n) >= 1) return n.toFixed(1) + 'B';
  return (n * 1_000).toFixed(0) + 'M';
}

function fmtPct(n: number | null): string {
  if (n == null) return '--';
  return n.toFixed(1) + '%';
}

function fmtMultiple(n: number | null): string {
  if (n == null) return '--';
  return n.toFixed(2) + 'x';
}

function fmtIrr(n: number | null): string {
  if (n == null) return '--';
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

// ── Color helpers ──

function irrColor(n: number | null): string {
  if (n == null) return 'rgba(255,255,255,0.3)';
  if (n >= 20) return GREEN;
  if (n >= 10) return LIME;
  if (n >= 0) return YELLOW;
  return RED;
}

function quartileColor(quartile: number): string {
  switch (quartile) {
    case 1: return GREEN;
    case 2: return LIME;
    case 3: return YELLOW;
    case 4: return RED;
    default: return 'rgba(255,255,255,0.3)';
  }
}

function quartileLabel(quartile: number): string {
  switch (quartile) {
    case 1: return 'Q1';
    case 2: return 'Q2';
    case 3: return 'Q3';
    case 4: return 'Q4';
    default: return '--';
  }
}

function strategyStyle(strategy: string): { color: string; bg: string } {
  switch (strategy.toLowerCase()) {
    case 'buyout': return { color: BLUE, bg: 'rgba(96,165,250,0.12)' };
    case 'growth': return { color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'venture': return { color: PURPLE, bg: 'rgba(192,132,252,0.12)' };
    case 'credit': return { color: ORANGE, bg: 'rgba(251,146,60,0.12)' };
    case 'infrastructure': return { color: '#67e8f9', bg: 'rgba(103,232,249,0.12)' };
    case 'real assets': return { color: YELLOW, bg: 'rgba(251,191,36,0.12)' };
    case 'secondaries': return { color: '#f472b6', bg: 'rgba(244,114,182,0.12)' };
    case 'distressed': return { color: RED, bg: 'rgba(248,113,113,0.12)' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
  }
}

function sectorBadgeStyle(sector: string): { color: string; bg: string } {
  const colors: Record<string, { color: string; bg: string }> = {
    'Technology': { color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
    'Healthcare': { color: GREEN, bg: 'rgba(52,211,153,0.12)' },
    'Financials': { color: YELLOW, bg: 'rgba(251,191,36,0.12)' },
    'Industrials': { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    'Consumer': { color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
    'Energy': { color: ORANGE, bg: 'rgba(251,146,60,0.12)' },
    'Infrastructure': { color: '#67e8f9', bg: 'rgba(103,232,249,0.12)' },
    'Real Estate': { color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' },
    'Business Services': { color: BLUE, bg: 'rgba(96,165,250,0.12)' },
    'Software': { color: PURPLE, bg: 'rgba(192,132,252,0.12)' },
  };
  return colors[sector] ?? { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.04)' };
}

function financingStyle(type: string): { color: string; bg: string } {
  switch (type.toLowerCase()) {
    case 'lbo': return { color: BLUE, bg: 'rgba(96,165,250,0.12)' };
    case 'all equity': return { color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'growth equity': return { color: PURPLE, bg: 'rgba(192,132,252,0.12)' };
    case 'club deal': return { color: YELLOW, bg: 'rgba(251,191,36,0.12)' };
    case 'take-private': return { color: ORANGE, bg: 'rgba(251,146,60,0.12)' };
    case 'recap': return { color: '#f472b6', bg: 'rgba(244,114,182,0.12)' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
  }
}

function dealStatusStyle(status: string): { color: string; bg: string } {
  switch (status.toLowerCase()) {
    case 'closed': return { color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'announced': return { color: BLUE, bg: 'rgba(96,165,250,0.12)' };
    case 'pending': return { color: YELLOW, bg: 'rgba(251,191,36,0.12)' };
    case 'loi signed': return { color: ORANGE, bg: 'rgba(251,146,60,0.12)' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
  }
}

function exitTypeStyle(type: string): { color: string; bg: string } {
  switch (type.toLowerCase()) {
    case 'ipo': return { color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'strategic': return { color: BLUE, bg: 'rgba(96,165,250,0.12)' };
    case 'secondary': return { color: YELLOW, bg: 'rgba(251,191,36,0.12)' };
    case 'recap': return { color: ORANGE, bg: 'rgba(251,146,60,0.12)' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
  }
}

// ── Fallback data ──

const FALLBACK_DATA = {
  timestamp: '2026-03-19T14:30:00Z',
  overview: {
    totalAum: 8420,
    dryPowder: 2180,
    fundraisingYtd: 312.5,
    dealActivity: 1247,
    exitVolume: 198.6,
    avgEntryMultiple: 12.8,
  },
  topFirms: [
    { firm: 'Blackstone', aum: 1050, latestFundSize: 30.4, netIrr: 18.2, tvpi: 1.87, dpi: 0.94, dealsYtd: 42, strategy: 'Buyout' },
    { firm: 'Apollo Global', aum: 671, latestFundSize: 24.7, netIrr: 21.4, tvpi: 2.12, dpi: 1.28, dealsYtd: 38, strategy: 'Credit' },
    { firm: 'KKR', aum: 578, latestFundSize: 19.0, netIrr: 16.8, tvpi: 1.74, dpi: 0.87, dealsYtd: 35, strategy: 'Buyout' },
    { firm: 'Carlyle Group', aum: 425, latestFundSize: 22.0, netIrr: 14.5, tvpi: 1.62, dpi: 0.76, dealsYtd: 29, strategy: 'Buyout' },
    { firm: 'TPG', aum: 222, latestFundSize: 14.8, netIrr: 19.7, tvpi: 1.95, dpi: 1.05, dealsYtd: 24, strategy: 'Growth' },
    { firm: 'Warburg Pincus', aum: 83, latestFundSize: 17.3, netIrr: 15.9, tvpi: 1.71, dpi: 0.92, dealsYtd: 21, strategy: 'Growth' },
    { firm: 'Thoma Bravo', aum: 131, latestFundSize: 22.8, netIrr: 24.1, tvpi: 2.34, dpi: 1.41, dealsYtd: 31, strategy: 'Buyout' },
    { firm: 'Vista Equity', aum: 101, latestFundSize: 20.0, netIrr: 22.3, tvpi: 2.18, dpi: 1.32, dealsYtd: 27, strategy: 'Buyout' },
    { firm: 'Silver Lake', aum: 102, latestFundSize: 18.5, netIrr: 20.6, tvpi: 2.05, dpi: 1.18, dealsYtd: 19, strategy: 'Growth' },
    { firm: 'Advent International', aum: 91, latestFundSize: 12.5, netIrr: 17.3, tvpi: 1.82, dpi: 0.98, dealsYtd: 16, strategy: 'Buyout' },
  ],
  recentDeals: [
    { acquirer: 'Blackstone', target: 'Emerson Climate Tech', value: 14.0, sector: 'Industrials', entryMultiple: 11.2, financingType: 'LBO', status: 'Closed' },
    { acquirer: 'Thoma Bravo', target: 'Coupa Software', value: 8.0, sector: 'Software', entryMultiple: 28.4, financingType: 'Take-Private', status: 'Closed' },
    { acquirer: 'KKR', target: 'Epicor Software', value: 9.2, sector: 'Technology', entryMultiple: 16.5, financingType: 'LBO', status: 'Pending' },
    { acquirer: 'Apollo Global', target: 'Univision Holdings', value: 18.5, sector: 'Consumer', entryMultiple: 9.8, financingType: 'LBO', status: 'Announced' },
    { acquirer: 'Vista Equity', target: 'Citrix Systems', value: 16.5, sector: 'Software', entryMultiple: 24.2, financingType: 'Club Deal', status: 'Closed' },
    { acquirer: 'TPG', target: 'McAfee Corp.', value: 12.0, sector: 'Technology', entryMultiple: 18.7, financingType: 'LBO', status: 'Closed' },
    { acquirer: 'Carlyle Group', target: 'ManTech Intl.', value: 4.2, sector: 'Business Services', entryMultiple: 14.3, financingType: 'All Equity', status: 'Closed' },
    { acquirer: 'Silver Lake', target: 'Qualtrics', value: 12.5, sector: 'Software', entryMultiple: 21.6, financingType: 'Take-Private', status: 'Pending' },
    { acquirer: 'Warburg Pincus', target: 'Kforce Inc.', value: 2.8, sector: 'Business Services', entryMultiple: 10.1, financingType: 'Growth Equity', status: 'LOI Signed' },
    { acquirer: 'Advent International', target: 'Encora Digital', value: 1.5, sector: 'Technology', entryMultiple: 15.8, financingType: 'Growth Equity', status: 'Announced' },
  ],
  fundraising: {
    totalRaised: 312.5,
    breakdown: [
      { strategy: 'Buyout', raised: 124.8, pctOfTotal: 39.9, fundCount: 47, avgFundSize: 2.66 },
      { strategy: 'Growth', raised: 58.3, pctOfTotal: 18.7, fundCount: 62, avgFundSize: 0.94 },
      { strategy: 'Venture', raised: 48.7, pctOfTotal: 15.6, fundCount: 187, avgFundSize: 0.26 },
      { strategy: 'Credit', raised: 36.2, pctOfTotal: 11.6, fundCount: 28, avgFundSize: 1.29 },
      { strategy: 'Infrastructure', raised: 22.1, pctOfTotal: 7.1, fundCount: 15, avgFundSize: 1.47 },
      { strategy: 'Real Assets', raised: 12.8, pctOfTotal: 4.1, fundCount: 11, avgFundSize: 1.16 },
      { strategy: 'Secondaries', raised: 6.4, pctOfTotal: 2.0, fundCount: 8, avgFundSize: 0.80 },
      { strategy: 'Distressed', raised: 3.2, pctOfTotal: 1.0, fundCount: 5, avgFundSize: 0.64 },
    ],
  },
  recentExits: [
    { firm: 'Blackstone', company: 'Refinitiv', exitType: 'Strategic', entryYear: 2018, exitValue: 27.0, moic: 3.2, grossIrr: 38.5 },
    { firm: 'KKR', company: 'GoDaddy', exitType: 'IPO', entryYear: 2014, exitValue: 8.5, moic: 4.1, grossIrr: 42.3 },
    { firm: 'Carlyle Group', company: 'ZoomInfo', exitType: 'IPO', entryYear: 2019, exitValue: 6.2, moic: 5.8, grossIrr: 68.2 },
    { firm: 'Thoma Bravo', company: 'Sailpoint', exitType: 'Strategic', entryYear: 2022, exitValue: 6.9, moic: 2.1, grossIrr: 28.4 },
    { firm: 'Apollo Global', company: 'Athene Holding', exitType: 'Strategic', entryYear: 2009, exitValue: 11.0, moic: 6.4, grossIrr: 29.1 },
    { firm: 'Vista Equity', company: 'Datto', exitType: 'Secondary', entryYear: 2017, exitValue: 6.2, moic: 3.8, grossIrr: 35.6 },
    { firm: 'TPG', company: 'CAA (Creative Artists)', exitType: 'Recap', entryYear: 2014, exitValue: 7.5, moic: 2.6, grossIrr: 22.1 },
    { firm: 'Silver Lake', company: 'Airbnb', exitType: 'IPO', entryYear: 2020, exitValue: 4.8, moic: 7.2, grossIrr: 112.0 },
    { firm: 'Warburg Pincus', company: 'Ant Group', exitType: 'Secondary', entryYear: 2016, exitValue: 3.4, moic: 4.5, grossIrr: 33.7 },
    { firm: 'Advent International', company: 'Olaplex', exitType: 'IPO', entryYear: 2019, exitValue: 2.8, moic: 9.1, grossIrr: 95.4 },
  ],
  performanceBenchmarks: [
    { vintageYear: 2024, netIrr: 8.2, tvpi: 1.12, dpi: 0.05, irrQuartile: 2, tvpiQuartile: 2, dpiQuartile: 3 },
    { vintageYear: 2023, netIrr: 12.4, tvpi: 1.28, dpi: 0.11, irrQuartile: 2, tvpiQuartile: 2, dpiQuartile: 2 },
    { vintageYear: 2022, netIrr: 15.1, tvpi: 1.45, dpi: 0.32, irrQuartile: 1, tvpiQuartile: 1, dpiQuartile: 2 },
    { vintageYear: 2021, netIrr: 11.7, tvpi: 1.38, dpi: 0.48, irrQuartile: 3, tvpiQuartile: 2, dpiQuartile: 2 },
    { vintageYear: 2020, netIrr: 19.8, tvpi: 1.82, dpi: 0.87, irrQuartile: 1, tvpiQuartile: 1, dpiQuartile: 1 },
    { vintageYear: 2019, netIrr: 22.1, tvpi: 2.05, dpi: 1.24, irrQuartile: 1, tvpiQuartile: 1, dpiQuartile: 1 },
    { vintageYear: 2018, netIrr: 18.4, tvpi: 1.91, dpi: 1.52, irrQuartile: 1, tvpiQuartile: 1, dpiQuartile: 1 },
    { vintageYear: 2017, netIrr: 16.2, tvpi: 1.78, dpi: 1.61, irrQuartile: 2, tvpiQuartile: 2, dpiQuartile: 1 },
    { vintageYear: 2016, netIrr: 14.8, tvpi: 1.68, dpi: 1.55, irrQuartile: 2, tvpiQuartile: 2, dpiQuartile: 2 },
    { vintageYear: 2015, netIrr: 13.5, tvpi: 1.62, dpi: 1.58, irrQuartile: 3, tvpiQuartile: 3, dpiQuartile: 2 },
  ],
};

// ── Main Panel ──

export function PrivateEquityPanel() {
  const { data: hookData, isLoading, refetch } = usePrivateEquity();
  const data = hookData ?? FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-lime-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Briefcase className="w-3 h-3 text-lime-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-lime-400">
            Private Equity
          </span>
        </div>
        <div className="flex items-center gap-3 text-[8px] text-neutral-400">
          <span>AUM <span className="text-lime-400 font-bold">{fmtValue(data.overview.totalAum)}</span></span>
          <span>Dry Powder <span className="text-lime-400 font-bold">{fmtValue(data.overview.dryPowder)}</span></span>
          <button
            onClick={() => refetch()}
            className="text-neutral-500 hover:text-lime-400 transition-colors"
          >
            <svg className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <OverviewBar overview={data.overview} />

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        <TopFirmsSection firms={data.topFirms} />
        <RecentDealsSection deals={data.recentDeals} />
        <FundraisingSection fundraising={data.fundraising} />
        <RecentExitsSection exits={data.recentExits} />
        <PerformanceBenchmarksSection benchmarks={data.performanceBenchmarks} />
      </div>
    </div>
  );
}

// ── Overview Stats Bar ──

function OverviewBar({ overview }: { overview: any }) {
  const stats = [
    { label: 'TOTAL AUM', value: fmtValue(overview.totalAum) },
    { label: 'DRY POWDER', value: fmtValue(overview.dryPowder) },
    { label: 'FUNDRAISING YTD', value: fmtValue(overview.fundraisingYtd) },
    { label: 'DEAL ACTIVITY', value: overview.dealActivity.toLocaleString() },
    { label: 'EXIT VOLUME', value: fmtValue(overview.exitVolume) },
    { label: 'AVG ENTRY MULT', value: fmtMultiple(overview.avgEntryMultiple) },
  ];

  return (
    <div className="shrink-0 grid grid-cols-6 border-b border-lime-400/30">
      {stats.map((s: any, i: any) => (
        <div key={i} className="flex flex-col items-center py-1.5 px-1 border-r border-border/20 last:border-r-0">
          <span className="text-[7px] uppercase tracking-widest font-black text-neutral-500">{s.label}</span>
          <span className="text-[10px] font-bold tabular-nums text-lime-400">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Top Firms Table ──

function TopFirmsSection({ firms }: { firms: any[] }) {
  return (
    <div className="border-b border-lime-400/30">
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border/20">
        <div className="w-1 h-1 bg-lime-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-lime-400">Top Firms</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_55px_50px_45px_40px_40px_60px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Firm</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">AUM</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Fund</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Net IRR</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">TVPI</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">DPI</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Deals</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Strategy</span>
      </div>

      {/* Rows */}
      {firms.map((f: any, i: any) => {
        const ss = strategyStyle(f.strategy);
        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_55px_55px_50px_45px_40px_40px_60px] px-3 py-1 border-b border-border/20 hover:bg-lime-400/[0.02] transition-colors items-center"
          >
            <span className="text-neutral-300 font-bold truncate">{f.firm}</span>
            <span className="text-neutral-300 text-right tabular-nums">{fmtValueShort(f.aum)}</span>
            <span className="text-neutral-300 text-right tabular-nums">{fmtValueShort(f.latestFundSize)}</span>
            <span className="text-right tabular-nums font-bold" style={{ color: irrColor(f.netIrr) }}>
              {fmtIrr(f.netIrr)}
            </span>
            <span className="text-neutral-300 text-right tabular-nums">{fmtMultiple(f.tvpi)}</span>
            <span className="text-neutral-300 text-right tabular-nums">{fmtMultiple(f.dpi)}</span>
            <span className="text-neutral-300 text-right tabular-nums">{f.dealsYtd}</span>
            <div className="flex justify-center">
              <span
                className="text-[6px] font-black uppercase px-1 py-0 truncate"
                style={{ color: ss.color, backgroundColor: ss.bg }}
              >
                {f.strategy}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Recent Deals Section ──

function RecentDealsSection({ deals }: { deals: any[] }) {
  return (
    <div className="border-b border-lime-400/30">
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border/20">
        <div className="w-1 h-1 bg-lime-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-lime-400">Recent Deals</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[80px_1fr_55px_65px_50px_65px_55px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Acquirer</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Target</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Value</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Sector</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Entry X</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Financing</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Status</span>
      </div>

      {/* Rows */}
      {deals.map((d: any, i: any) => {
        const sec = sectorBadgeStyle(d.sector);
        const fin = financingStyle(d.financingType);
        const st = dealStatusStyle(d.status);
        return (
          <div
            key={i}
            className="grid grid-cols-[80px_1fr_55px_65px_50px_65px_55px] px-3 py-1 border-b border-border/20 hover:bg-lime-400/[0.02] transition-colors items-center"
          >
            <span className="text-neutral-300 font-bold truncate">{d.acquirer}</span>
            <span className="text-neutral-400 truncate">{d.target}</span>
            <span className="text-neutral-300 text-right tabular-nums">{fmtValue(d.value)}</span>
            <div className="flex justify-center">
              <span
                className="text-[6px] font-black uppercase px-1 py-0 truncate"
                style={{ color: sec.color, backgroundColor: sec.bg }}
              >
                {d.sector}
              </span>
            </div>
            <span className="text-neutral-300 text-right tabular-nums">{fmtMultiple(d.entryMultiple)}</span>
            <div className="flex justify-center">
              <span
                className="text-[6px] font-black uppercase px-1 py-0 truncate"
                style={{ color: fin.color, backgroundColor: fin.bg }}
              >
                {d.financingType}
              </span>
            </div>
            <div className="flex justify-center">
              <span
                className="text-[6px] font-black uppercase px-1 py-0"
                style={{ color: st.color, backgroundColor: st.bg }}
              >
                {d.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Fundraising Section ──

function FundraisingSection({ fundraising }: { fundraising: any }) {
  const maxRaised = Math.max(...fundraising.breakdown.map((b: any) => b.raised), 1);

  return (
    <div className="border-b border-lime-400/30">
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border/20">
        <div className="w-1 h-1 bg-lime-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-lime-400">Fundraising</span>
        <span className="text-[8px] text-neutral-400 ml-auto">
          Total Raised <span className="text-lime-400 font-bold">{fmtValue(fundraising.totalRaised)}</span>
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_60px_50px_40px_55px_80px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Strategy</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Raised</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">% Total</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Funds</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Avg Size</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Share</span>
      </div>

      {/* Rows */}
      {fundraising.breakdown.map((b: any, i: any) => {
        const ss = strategyStyle(b.strategy);
        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_60px_50px_40px_55px_80px] px-3 py-1 border-b border-border/20 hover:bg-lime-400/[0.02] transition-colors items-center"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 shrink-0" style={{ backgroundColor: ss.color }} />
              <span className="text-neutral-300">{b.strategy}</span>
            </div>
            <span className="text-neutral-300 text-right tabular-nums">{fmtValue(b.raised)}</span>
            <span className="text-neutral-400 text-right tabular-nums">{fmtPct(b.pctOfTotal)}</span>
            <span className="text-neutral-300 text-right tabular-nums">{b.fundCount}</span>
            <span className="text-neutral-300 text-right tabular-nums">{fmtValue(b.avgFundSize)}</span>
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-lime-400 tabular-nums text-[8px] font-bold">{b.pctOfTotal.toFixed(1)}%</span>
              <div className="w-[40px] h-[4px] bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full bg-lime-400/40"
                  style={{ width: `${(b.raised / maxRaised) * 100}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Recent Exits Section ──

function RecentExitsSection({ exits }: { exits: any[] }) {
  return (
    <div className="border-b border-lime-400/30">
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border/20">
        <div className="w-1 h-1 bg-lime-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-lime-400">Recent Exits</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[80px_1fr_60px_40px_55px_45px_50px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Firm</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Company</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Exit Type</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Entry</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Exit Val</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">MOIC</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Gross IRR</span>
      </div>

      {/* Rows */}
      {exits.map((e: any, i: any) => {
        const et = exitTypeStyle(e.exitType);
        return (
          <div
            key={i}
            className="grid grid-cols-[80px_1fr_60px_40px_55px_45px_50px] px-3 py-1 border-b border-border/20 hover:bg-lime-400/[0.02] transition-colors items-center"
          >
            <span className="text-neutral-300 font-bold truncate">{e.firm}</span>
            <span className="text-neutral-400 truncate">{e.company}</span>
            <div className="flex justify-center">
              <span
                className="text-[6px] font-black uppercase px-1 py-0"
                style={{ color: et.color, backgroundColor: et.bg }}
              >
                {e.exitType}
              </span>
            </div>
            <span className="text-neutral-400 text-right tabular-nums">{e.entryYear}</span>
            <span className="text-neutral-300 text-right tabular-nums">{fmtValue(e.exitValue)}</span>
            <span className="text-right tabular-nums font-bold" style={{ color: e.moic >= 3 ? GREEN : e.moic >= 2 ? LIME : YELLOW }}>
              {fmtMultiple(e.moic)}
            </span>
            <span className="text-right tabular-nums font-bold" style={{ color: irrColor(e.grossIrr) }}>
              {fmtIrr(e.grossIrr)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Performance Benchmarks Section ──

function PerformanceBenchmarksSection({ benchmarks }: { benchmarks: any[] }) {
  return (
    <div className="border-b border-lime-400/30">
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border/20">
        <div className="w-1 h-1 bg-lime-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-lime-400">Performance Benchmarks</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[55px_65px_35px_55px_35px_50px_35px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Vintage</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Net IRR</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Q</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">TVPI</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Q</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">DPI</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Q</span>
      </div>

      {/* Rows */}
      {benchmarks.map((b: any, i: any) => (
        <div
          key={i}
          className="grid grid-cols-[55px_65px_35px_55px_35px_50px_35px] px-3 py-1 border-b border-border/20 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-neutral-300 font-bold tabular-nums">{b.vintageYear}</span>
          <span className="text-right tabular-nums font-bold" style={{ color: irrColor(b.netIrr) }}>
            {fmtIrr(b.netIrr)}
          </span>
          <div className="flex justify-center">
            <span
              className="text-[6px] font-black px-1 py-0"
              style={{ color: quartileColor(b.irrQuartile), backgroundColor: quartileColor(b.irrQuartile) + '18' }}
            >
              {quartileLabel(b.irrQuartile)}
            </span>
          </div>
          <span className="text-neutral-300 text-right tabular-nums">{fmtMultiple(b.tvpi)}</span>
          <div className="flex justify-center">
            <span
              className="text-[6px] font-black px-1 py-0"
              style={{ color: quartileColor(b.tvpiQuartile), backgroundColor: quartileColor(b.tvpiQuartile) + '18' }}
            >
              {quartileLabel(b.tvpiQuartile)}
            </span>
          </div>
          <span className="text-neutral-300 text-right tabular-nums">{fmtMultiple(b.dpi)}</span>
          <div className="flex justify-center">
            <span
              className="text-[6px] font-black px-1 py-0"
              style={{ color: quartileColor(b.dpiQuartile), backgroundColor: quartileColor(b.dpiQuartile) + '18' }}
            >
              {quartileLabel(b.dpiQuartile)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
