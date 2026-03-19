import { useTradeFinance } from '../../api/hooks/use-trade-finance';
import { useT } from '../../i18n';
import { RefreshCw, Ship } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Fallback data ──

const FALLBACK_DATA = {
  timestamp: new Date().toISOString(),
  overview: {
    totalVolume: 5.2e12,
    tradeFinanceGap: 2.5e12,
    lcVolume: 2.8e12,
    scfVolume: 1.1e12,
    factoringVolume: 820e9,
    forfaitingVolume: 470e9,
  },
  lcRates: [
    { corridor: 'Asia-Europe', pricingBps: 85, confirmationFee: 0.15, tenor: '90D', avgSize: 2.4e6, defaultRate: 0.04, trend: 'stable' },
    { corridor: 'US-Asia', pricingBps: 72, confirmationFee: 0.12, tenor: '60D', avgSize: 3.1e6, defaultRate: 0.03, trend: 'tightening' },
    { corridor: 'Europe-Africa', pricingBps: 145, confirmationFee: 0.35, tenor: '120D', avgSize: 1.2e6, defaultRate: 0.12, trend: 'widening' },
    { corridor: 'Intra-Asia', pricingBps: 55, confirmationFee: 0.08, tenor: '45D', avgSize: 1.8e6, defaultRate: 0.02, trend: 'tightening' },
    { corridor: 'US-Europe', pricingBps: 48, confirmationFee: 0.06, tenor: '60D', avgSize: 5.6e6, defaultRate: 0.01, trend: 'stable' },
    { corridor: 'ME-Asia', pricingBps: 110, confirmationFee: 0.22, tenor: '90D', avgSize: 4.2e6, defaultRate: 0.06, trend: 'widening' },
    { corridor: 'LatAm-US', pricingBps: 125, confirmationFee: 0.28, tenor: '90D', avgSize: 1.5e6, defaultRate: 0.09, trend: 'stable' },
    { corridor: 'Africa-Europe', pricingBps: 165, confirmationFee: 0.42, tenor: '150D', avgSize: 0.8e6, defaultRate: 0.15, trend: 'widening' },
  ],
  supplyChainFinance: [
    { buyer: 'Samsung Elec.', facility: 1.2e9, utilization: 78.4, discountRate: 4.85, supplierCount: 342, paymentTerms: '120D' },
    { buyer: 'Apple Inc.', facility: 2.5e9, utilization: 65.2, discountRate: 4.15, supplierCount: 518, paymentTerms: '90D' },
    { buyer: 'Volkswagen AG', facility: 1.8e9, utilization: 82.1, discountRate: 5.10, supplierCount: 1245, paymentTerms: '105D' },
    { buyer: 'Toyota Motor', facility: 1.5e9, utilization: 71.6, discountRate: 3.90, supplierCount: 876, paymentTerms: '90D' },
    { buyer: 'Walmart Inc.', facility: 3.2e9, utilization: 88.3, discountRate: 4.55, supplierCount: 2100, paymentTerms: '120D' },
    { buyer: 'Siemens AG', facility: 0.9e9, utilization: 59.8, discountRate: 4.70, supplierCount: 430, paymentTerms: '75D' },
  ],
  tradeReceivables: {
    outstanding: 3.8e12,
    securitized: 1.2e12,
    avgYield: 5.42,
    defaultRate: 0.78,
    byRegion: [
      { region: 'Asia-Pacific', amount: 1.4e12, share: 36.8, yield: 5.15, defaultRate: 0.52 },
      { region: 'Europe', amount: 1.1e12, share: 28.9, yield: 4.85, defaultRate: 0.38 },
      { region: 'North America', amount: 0.8e12, share: 21.1, yield: 5.92, defaultRate: 0.25 },
      { region: 'Middle East', amount: 0.3e12, share: 7.9, yield: 6.20, defaultRate: 0.91 },
      { region: 'Latin America', amount: 0.15e12, share: 3.9, yield: 7.45, defaultRate: 1.65 },
      { region: 'Africa', amount: 0.05e12, share: 1.4, yield: 9.10, defaultRate: 3.20 },
    ],
  },
  countryRisk: [
    { country: 'Bangladesh', stRisk: 5, mtRisk: 6, premiumBps: 320, paymentDelay: 45, coverAvailability: 'restricted' },
    { country: 'Nigeria', stRisk: 6, mtRisk: 7, premiumBps: 480, paymentDelay: 62, coverAvailability: 'limited' },
    { country: 'Turkey', stRisk: 5, mtRisk: 5, premiumBps: 275, paymentDelay: 38, coverAvailability: 'available' },
    { country: 'Vietnam', stRisk: 3, mtRisk: 3, premiumBps: 145, paymentDelay: 22, coverAvailability: 'available' },
    { country: 'Egypt', stRisk: 6, mtRisk: 6, premiumBps: 410, paymentDelay: 55, coverAvailability: 'restricted' },
    { country: 'India', stRisk: 3, mtRisk: 3, premiumBps: 130, paymentDelay: 18, coverAvailability: 'available' },
    { country: 'Pakistan', stRisk: 7, mtRisk: 7, premiumBps: 560, paymentDelay: 78, coverAvailability: 'off_cover' },
    { country: 'Argentina', stRisk: 7, mtRisk: 7, premiumBps: 620, paymentDelay: 85, coverAvailability: 'off_cover' },
    { country: 'Ethiopia', stRisk: 7, mtRisk: 7, premiumBps: 540, paymentDelay: 90, coverAvailability: 'off_cover' },
    { country: 'Indonesia', stRisk: 3, mtRisk: 4, premiumBps: 155, paymentDelay: 20, coverAvailability: 'available' },
  ],
  digitalization: {
    blockchainLcPct: 4.2,
    eblPenetration: 2.8,
    eblGrowthPct: 68.5,
    platforms: [
      { name: 'Contour', type: 'Blockchain LC', status: 'active', transactions: 12500, volume: 45e9 },
      { name: 'Marco Polo', type: 'Trade Finance', status: 'restructuring', transactions: 3200, volume: 12e9 },
      { name: 'TradeLens', type: 'Supply Chain', status: 'discontinued', transactions: 0, volume: 0 },
      { name: 'Komgo', type: 'Commodity TF', status: 'active', transactions: 8900, volume: 32e9 },
      { name: 'WAVE BL', type: 'e-BL', status: 'active', transactions: 18200, volume: 28e9 },
      { name: 'Bolero', type: 'e-BL', status: 'active', transactions: 6500, volume: 15e9 },
    ],
  },
};

// ── Formatting helpers ──

function fmtVol(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + n.toFixed(0);
}

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(2) + '%';
}

function fmtBps(n: number): string {
  return n.toFixed(0) + 'bp';
}

// ── Color helpers ──

function trendBadgeStyle(trend: string): { text: string; bg: string; label: string } {
  if (trend === 'tightening') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30', label: 'TIGHT' };
  if (trend === 'widening') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30', label: 'WIDE' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30', label: 'STABLE' };
}

function riskColor(n: number): string {
  if (n <= 2) return 'text-green-400';
  if (n <= 3) return 'text-emerald-400';
  if (n <= 4) return 'text-yellow-400';
  if (n <= 5) return 'text-orange-400';
  if (n <= 6) return 'text-red-400';
  return 'text-red-500';
}

function riskBg(n: number): string {
  if (n <= 2) return 'bg-green-500/10';
  if (n <= 3) return 'bg-emerald-500/10';
  if (n <= 4) return 'bg-yellow-500/10';
  if (n <= 5) return 'bg-orange-500/10';
  if (n <= 6) return 'bg-red-500/10';
  return 'bg-red-500/20';
}

function coverBadgeStyle(cover: string): { text: string; bg: string; label: string } {
  if (cover === 'available') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30', label: 'AVAILABLE' };
  if (cover === 'restricted') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30', label: 'RESTRICTED' };
  if (cover === 'limited') return { text: 'text-orange-400', bg: 'bg-orange-500/10 border border-orange-500/30', label: 'LIMITED' };
  return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30', label: 'OFF COVER' };
}

function statusBadgeStyle(status: string): { text: string; bg: string } {
  if (status === 'active') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (status === 'restructuring') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
  return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
}

function utilizationColor(pct: number): string {
  if (pct >= 85) return 'text-red-400';
  if (pct >= 70) return 'text-yellow-400';
  return 'text-green-400';
}

function utilizationBarColor(pct: number): string {
  if (pct >= 85) return 'bg-red-500';
  if (pct >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

// ── Section Header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 border-b border-yellow-400/30 flex items-center gap-2">
      <div className="w-1 h-1 bg-yellow-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-yellow-400">
        {label}
      </span>
    </div>
  );
}

// ── Overview Section ──

function OverviewSection({ overview, t }: { overview: any; t: ReturnType<typeof useT> }) {
  const metrics = [
    { label: tr(t, 'tfTotalVol', 'Total Volume'), value: fmtVol(overview.totalVolume) },
    { label: tr(t, 'tfGap', 'Finance Gap'), value: fmtVol(overview.tradeFinanceGap) },
    { label: tr(t, 'tfLcVol', 'LC Volume'), value: fmtVol(overview.lcVolume) },
    { label: tr(t, 'tfScfVol', 'SCF Volume'), value: fmtVol(overview.scfVolume) },
    { label: tr(t, 'tfFactoring', 'Factoring'), value: fmtVol(overview.factoringVolume) },
    { label: tr(t, 'tfForfaiting', 'Forfaiting'), value: fmtVol(overview.forfaitingVolume) },
  ];

  return (
    <div className="border-b border-yellow-400/30">
      <SectionHeader label={tr(t, 'tfOverview', 'Overview')} />
      <div className="grid grid-cols-6 gap-px bg-border/10">
        {metrics.map((m: any) => (
          <div key={m.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {m.label}
            </div>
            <div className="text-[9px] font-mono font-bold text-white tabular-nums">
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── LC Rates Table ──

function LcRatesSection({ lcRates, t }: { lcRates: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-yellow-400/30">
      <SectionHeader label={tr(t, 'tfLcRates', 'Letter of Credit Rates')} />
      <div className="grid grid-cols-[1fr_52px_52px_40px_56px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Corridor</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Price</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Conf Fee</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Tenor</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Avg Size</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Default</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">Trend</span>
      </div>
      {lcRates.map((row: any) => {
        const badge = trendBadgeStyle(row.trend);
        return (
          <div
            key={row.corridor}
            className="grid grid-cols-[1fr_52px_52px_40px_56px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">{row.corridor}</span>
            <span className="text-[8px] font-mono text-yellow-400/80 text-right tabular-nums">{fmtBps(row.pricingBps)}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">{fmtPct(row.confirmationFee)}</span>
            <span className="text-[8px] font-mono text-neutral-500 text-right">{row.tenor}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">{fmtVol(row.avgSize)}</span>
            <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums">{fmtPct(row.defaultRate)}</span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase ${badge.text} ${badge.bg}`}>
                {badge.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Supply Chain Finance Section ──

function ScfSection({ scf, t }: { scf: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-yellow-400/30">
      <SectionHeader label={tr(t, 'tfScf', 'Supply Chain Finance')} />
      <div className="grid grid-cols-[1fr_56px_64px_52px_48px_44px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Buyer</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Facility</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Util %</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Disc Rate</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Suppliers</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Terms</span>
      </div>
      {scf.map((row: any) => (
        <div
          key={row.buyer}
          className="grid grid-cols-[1fr_56px_64px_52px_48px_44px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">{row.buyer}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">{fmtVol(row.facility)}</span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-10 h-[3px] bg-neutral-800 relative">
              <div
                className={`absolute left-0 top-0 h-full ${utilizationBarColor(row.utilization)}`}
                style={{ width: `${Math.min(row.utilization, 100)}%` }}
              />
            </div>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${utilizationColor(row.utilization)}`}>
              {fmtPct(row.utilization)}
            </span>
          </div>
          <span className="text-[8px] font-mono text-yellow-400/80 text-right tabular-nums">{fmtPct(row.discountRate)}</span>
          <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums">{row.supplierCount.toLocaleString()}</span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">{row.paymentTerms}</span>
        </div>
      ))}
    </div>
  );
}

// ── Trade Receivables Section ──

function ReceivablesSection({ receivables, t }: { receivables: any; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-yellow-400/30">
      <SectionHeader label={tr(t, 'tfReceivables', 'Trade Receivables')} />
      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-px bg-border/10 border-b border-border/20">
        {[
          { label: tr(t, 'tfOutstanding', 'Outstanding'), value: fmtVol(receivables.outstanding) },
          { label: tr(t, 'tfSecuritized', 'Securitized'), value: fmtVol(receivables.securitized) },
          { label: tr(t, 'tfAvgYield', 'Avg Yield'), value: fmtPct(receivables.avgYield) },
          { label: tr(t, 'tfDefaultRate', 'Default Rate'), value: fmtPct(receivables.defaultRate) },
        ].map((m: any) => (
          <div key={m.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{m.label}</div>
            <div className="text-[9px] font-mono font-bold text-white tabular-nums">{m.value}</div>
          </div>
        ))}
      </div>
      {/* By region breakdown */}
      <div className="grid grid-cols-[1fr_56px_44px_44px_44px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Region</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Amount</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Share</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Yield</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Default</span>
      </div>
      {receivables.byRegion.map((row: any) => (
        <div
          key={row.region}
          className="grid grid-cols-[1fr_56px_44px_44px_44px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{row.region}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">{fmtVol(row.amount)}</span>
          <span className="text-[8px] font-mono text-yellow-400/80 text-right tabular-nums">{fmtPct(row.share)}</span>
          <span className="text-[8px] font-mono text-green-400/80 text-right tabular-nums">{fmtPct(row.yield)}</span>
          <span className={`text-[8px] font-mono text-right tabular-nums ${row.defaultRate >= 1.0 ? 'text-red-400' : 'text-neutral-500'}`}>
            {fmtPct(row.defaultRate)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Country Risk Premiums Section ──

function CountryRiskSection({ risks, t }: { risks: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-yellow-400/30">
      <SectionHeader label={tr(t, 'tfCountryRisk', 'Country Risk Premiums')} />
      <div className="grid grid-cols-[1fr_36px_36px_52px_44px_64px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Country</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">ST</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">MT</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Premium</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Delay</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">Cover</span>
      </div>
      {risks.map((row: any) => {
        const cover = coverBadgeStyle(row.coverAvailability);
        return (
          <div
            key={row.country}
            className="grid grid-cols-[1fr_36px_36px_52px_44px_64px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">{row.country}</span>
            <div className="flex justify-center">
              <span className={`w-5 h-4 flex items-center justify-center text-[8px] font-mono font-bold tabular-nums ${riskColor(row.stRisk)} ${riskBg(row.stRisk)}`}>
                {row.stRisk}
              </span>
            </div>
            <div className="flex justify-center">
              <span className={`w-5 h-4 flex items-center justify-center text-[8px] font-mono font-bold tabular-nums ${riskColor(row.mtRisk)} ${riskBg(row.mtRisk)}`}>
                {row.mtRisk}
              </span>
            </div>
            <span className="text-[8px] font-mono text-yellow-400/80 text-right tabular-nums">{fmtBps(row.premiumBps)}</span>
            <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums">{row.paymentDelay}d</span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase ${cover.text} ${cover.bg}`}>
                {cover.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Digitalization Section ──

function DigitalizationSection({ digi, t }: { digi: any; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-yellow-400/30">
      <SectionHeader label={tr(t, 'tfDigital', 'Digitalization')} />
      {/* KPI metrics */}
      <div className="grid grid-cols-3 gap-px bg-border/10 border-b border-border/20">
        {[
          { label: tr(t, 'tfBlockchainLc', 'Blockchain LC'), value: fmtPct(digi.blockchainLcPct), sub: 'of total LC' },
          { label: tr(t, 'tfEbl', 'e-BL Penetration'), value: fmtPct(digi.eblPenetration), sub: 'of ocean trade' },
          { label: tr(t, 'tfEblGrowth', 'e-BL Growth'), value: '+' + fmtPct(digi.eblGrowthPct), sub: 'YoY' },
        ].map((m: any) => (
          <div key={m.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{m.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-[9px] font-mono font-bold text-yellow-400 tabular-nums">{m.value}</span>
              <span className="text-[6px] font-mono text-neutral-700">{m.sub}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Platform status table */}
      <div className="grid grid-cols-[1fr_72px_56px_56px_52px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Platform</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Type</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">Status</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Txns</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Volume</span>
      </div>
      {digi.platforms.map((p: any) => {
        const sBadge = statusBadgeStyle(p.status);
        return (
          <div
            key={p.name}
            className="grid grid-cols-[1fr_72px_56px_56px_52px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">{p.name}</span>
            <span className="text-[7px] font-mono text-neutral-500 truncate">{p.type}</span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase ${sBadge.text} ${sBadge.bg}`}>
                {p.status.toUpperCase()}
              </span>
            </div>
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {p.transactions > 0 ? p.transactions.toLocaleString() : '-'}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {p.volume > 0 ? fmtCompact(p.volume) : '-'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function TradeFinancePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useTradeFinance();

  const d = data || FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-yellow-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Ship className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-yellow-400">
            {tr(t, 'tfTitle', 'Trade Finance')}
          </span>
          {d.overview && (
            <span className="text-[7px] font-mono text-neutral-600 ml-1">
              Vol {fmtVol(d.overview.totalVolume)}
            </span>
          )}
          {d.overview && (
            <span className="text-[7px] font-mono text-red-400/70 ml-1">
              Gap {fmtVol(d.overview.tradeFinanceGap)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {d.timestamp && (
            <span className="text-[6px] font-mono text-neutral-700">
              {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar text-[9px] font-mono">
        {isLoading && !data && (
          <div className="text-center py-8 text-yellow-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!isLoading && !data && !FALLBACK_DATA && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'tfNoData', 'No data available')}
          </div>
        )}

        {d && (
          <>
            <OverviewSection overview={d.overview} t={t} />
            <LcRatesSection lcRates={d.lcRates} t={t} />
            <ScfSection scf={d.supplyChainFinance} t={t} />
            <ReceivablesSection receivables={d.tradeReceivables} t={t} />
            <CountryRiskSection risks={d.countryRisk} t={t} />
            <DigitalizationSection digi={d.digitalization} t={t} />
          </>
        )}
      </div>
    </div>
  );
}
