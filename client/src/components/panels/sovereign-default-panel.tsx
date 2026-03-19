import { useState } from 'react';
import { useSovereignDefault } from '../../api/hooks/use-sovereign-default';
import { useT } from '../../i18n';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// i18n fallback helper
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Fallback Data ──

const FALLBACK_DATA = {
  summary: {
    sovereignsInDistress: 12,
    totalDistressedDebt: 412.6,
    avgRecoveryRate: 34.2,
    activeIMFPrograms: 8,
  },
  countries: [
    {
      country: 'Argentina',
      code: 'AR',
      rating: 'CCC-',
      ratingTier: 'distressed',
      cdsSpread: 2847,
      cdsChange: +124,
      debtToGdp: 89.4,
      defaultProb1Y: 38.2,
      defaultProb5Y: 72.6,
      riskTier: 'critical',
      detail: {
        primaryBalance: -2.8,
        interestToRevenue: 18.4,
        externalDebtPct: 64.2,
        fxReserves: 21.3,
        reserveMonths: 3.1,
        reserveTrend: 'declining',
        capitalAccess: 'restricted',
        lastAuction: '2026-02-14',
        auctionResult: 'partially covered',
      },
    },
    {
      country: 'Pakistan',
      code: 'PK',
      rating: 'CCC+',
      ratingTier: 'distressed',
      cdsSpread: 1923,
      cdsChange: +87,
      debtToGdp: 78.1,
      defaultProb1Y: 24.6,
      defaultProb5Y: 58.3,
      riskTier: 'high',
      detail: {
        primaryBalance: -3.1,
        interestToRevenue: 42.6,
        externalDebtPct: 36.8,
        fxReserves: 8.2,
        reserveMonths: 1.4,
        reserveTrend: 'stable',
        capitalAccess: 'limited',
        lastAuction: '2026-03-01',
        auctionResult: 'covered',
      },
    },
    {
      country: 'Sri Lanka',
      code: 'LK',
      rating: 'SD',
      ratingTier: 'default',
      cdsSpread: 4521,
      cdsChange: -32,
      debtToGdp: 128.4,
      defaultProb1Y: 95.0,
      defaultProb5Y: 98.2,
      riskTier: 'default',
      detail: {
        primaryBalance: -1.2,
        interestToRevenue: 71.3,
        externalDebtPct: 52.7,
        fxReserves: 3.1,
        reserveMonths: 1.8,
        reserveTrend: 'recovering',
        capitalAccess: 'none',
        lastAuction: 'N/A',
        auctionResult: 'N/A',
      },
    },
    {
      country: 'Ghana',
      code: 'GH',
      rating: 'SD',
      ratingTier: 'default',
      cdsSpread: 3876,
      cdsChange: -18,
      debtToGdp: 104.6,
      defaultProb1Y: 92.3,
      defaultProb5Y: 97.1,
      riskTier: 'default',
      detail: {
        primaryBalance: -0.8,
        interestToRevenue: 58.4,
        externalDebtPct: 48.3,
        fxReserves: 5.6,
        reserveMonths: 2.4,
        reserveTrend: 'stable',
        capitalAccess: 'none',
        lastAuction: 'N/A',
        auctionResult: 'N/A',
      },
    },
    {
      country: 'Egypt',
      code: 'EG',
      rating: 'B-',
      ratingTier: 'speculative',
      cdsSpread: 987,
      cdsChange: +42,
      debtToGdp: 92.7,
      defaultProb1Y: 12.4,
      defaultProb5Y: 38.1,
      riskTier: 'elevated',
      detail: {
        primaryBalance: 0.4,
        interestToRevenue: 38.7,
        externalDebtPct: 33.1,
        fxReserves: 34.8,
        reserveMonths: 4.6,
        reserveTrend: 'recovering',
        capitalAccess: 'limited',
        lastAuction: '2026-03-10',
        auctionResult: 'covered',
      },
    },
    {
      country: 'Tunisia',
      code: 'TN',
      rating: 'CCC-',
      ratingTier: 'distressed',
      cdsSpread: 1456,
      cdsChange: +63,
      debtToGdp: 83.2,
      defaultProb1Y: 22.8,
      defaultProb5Y: 54.7,
      riskTier: 'high',
      detail: {
        primaryBalance: -3.6,
        interestToRevenue: 24.3,
        externalDebtPct: 72.8,
        fxReserves: 7.9,
        reserveMonths: 2.8,
        reserveTrend: 'declining',
        capitalAccess: 'restricted',
        lastAuction: '2026-01-22',
        auctionResult: 'partially covered',
      },
    },
    {
      country: 'Ethiopia',
      code: 'ET',
      rating: 'CCC',
      ratingTier: 'distressed',
      cdsSpread: 2134,
      cdsChange: +96,
      debtToGdp: 57.3,
      defaultProb1Y: 28.4,
      defaultProb5Y: 61.9,
      riskTier: 'high',
      detail: {
        primaryBalance: -2.4,
        interestToRevenue: 12.8,
        externalDebtPct: 28.6,
        fxReserves: 1.4,
        reserveMonths: 0.8,
        reserveTrend: 'declining',
        capitalAccess: 'restricted',
        lastAuction: 'N/A',
        auctionResult: 'N/A',
      },
    },
    {
      country: 'Ukraine',
      code: 'UA',
      rating: 'CC',
      ratingTier: 'distressed',
      cdsSpread: 5672,
      cdsChange: +213,
      debtToGdp: 96.8,
      defaultProb1Y: 64.2,
      defaultProb5Y: 88.7,
      riskTier: 'critical',
      detail: {
        primaryBalance: -16.2,
        interestToRevenue: 8.4,
        externalDebtPct: 74.1,
        fxReserves: 38.7,
        reserveMonths: 5.2,
        reserveTrend: 'stable',
        capitalAccess: 'none',
        lastAuction: '2026-03-05',
        auctionResult: 'domestic only',
      },
    },
    {
      country: 'Bolivia',
      code: 'BO',
      rating: 'CCC',
      ratingTier: 'distressed',
      cdsSpread: 1876,
      cdsChange: +142,
      debtToGdp: 81.4,
      defaultProb1Y: 31.7,
      defaultProb5Y: 66.2,
      riskTier: 'critical',
      detail: {
        primaryBalance: -7.8,
        interestToRevenue: 9.2,
        externalDebtPct: 31.6,
        fxReserves: 1.7,
        reserveMonths: 0.6,
        reserveTrend: 'declining',
        capitalAccess: 'restricted',
        lastAuction: '2025-12-18',
        auctionResult: 'partially covered',
      },
    },
    {
      country: 'Lebanon',
      code: 'LB',
      rating: 'SD',
      ratingTier: 'default',
      cdsSpread: 8234,
      cdsChange: -5,
      debtToGdp: 283.2,
      defaultProb1Y: 99.1,
      defaultProb5Y: 99.8,
      riskTier: 'default',
      detail: {
        primaryBalance: -4.2,
        interestToRevenue: 52.1,
        externalDebtPct: 178.4,
        fxReserves: 8.6,
        reserveMonths: 8.4,
        reserveTrend: 'declining',
        capitalAccess: 'none',
        lastAuction: 'N/A',
        auctionResult: 'N/A',
      },
    },
    {
      country: 'Zambia',
      code: 'ZM',
      rating: 'CCC+',
      ratingTier: 'distressed',
      cdsSpread: 1234,
      cdsChange: -48,
      debtToGdp: 73.8,
      defaultProb1Y: 14.2,
      defaultProb5Y: 42.6,
      riskTier: 'elevated',
      detail: {
        primaryBalance: -1.6,
        interestToRevenue: 22.7,
        externalDebtPct: 52.4,
        fxReserves: 2.9,
        reserveMonths: 2.1,
        reserveTrend: 'recovering',
        capitalAccess: 'limited',
        lastAuction: '2026-02-28',
        auctionResult: 'covered',
      },
    },
    {
      country: 'El Salvador',
      code: 'SV',
      rating: 'CCC+',
      ratingTier: 'distressed',
      cdsSpread: 824,
      cdsChange: -36,
      debtToGdp: 82.6,
      defaultProb1Y: 8.7,
      defaultProb5Y: 34.1,
      riskTier: 'elevated',
      detail: {
        primaryBalance: -2.1,
        interestToRevenue: 16.8,
        externalDebtPct: 46.2,
        fxReserves: 2.8,
        reserveMonths: 2.4,
        reserveTrend: 'stable',
        capitalAccess: 'limited',
        lastAuction: '2026-03-08',
        auctionResult: 'covered',
      },
    },
  ],
  events: [
    {
      date: '2026-03-18',
      country: 'Argentina',
      type: 'rating_action',
      description: 'S&P affirms CCC- rating with negative outlook citing persistent fiscal deficits and reserve depletion',
      impact: 'negative',
    },
    {
      date: '2026-03-17',
      country: 'Pakistan',
      type: 'imf_program',
      description: 'IMF completes 2nd review of $3B Stand-By Arrangement, releases $700M tranche',
      impact: 'positive',
    },
    {
      date: '2026-03-15',
      country: 'Sri Lanka',
      type: 'restructuring',
      description: 'Bilateral creditors agree to 30% haircut on $12.5B external debt under Common Framework',
      impact: 'positive',
    },
    {
      date: '2026-03-14',
      country: 'Ukraine',
      type: 'payment_miss',
      description: 'Wartime moratorium extended on $24B Eurobond payments through Dec 2026',
      impact: 'neutral',
    },
    {
      date: '2026-03-12',
      country: 'Ghana',
      type: 'restructuring',
      description: 'Domestic debt exchange program reaches 85% participation, Eurobond negotiations ongoing',
      impact: 'positive',
    },
    {
      date: '2026-03-10',
      country: 'Bolivia',
      type: 'reserves_crisis',
      description: 'FX reserves fall below $1.7B, central bank imposes new capital controls',
      impact: 'negative',
    },
    {
      date: '2026-03-08',
      country: 'Egypt',
      type: 'auction',
      description: 'T-bill auction sees strong demand at 26.4% yield, bid-to-cover ratio 2.8x',
      impact: 'positive',
    },
    {
      date: '2026-03-06',
      country: 'Tunisia',
      type: 'rating_action',
      description: 'Fitch downgrades to CCC- from CCC, warns of financing gap widening in 2026',
      impact: 'negative',
    },
  ],
  contagion: [
    { country1: 'Argentina', country2: 'Bolivia', correlation: 0.87, channel: 'Regional trade / FX contagion' },
    { country1: 'Sri Lanka', country2: 'Pakistan', correlation: 0.74, channel: 'EM sovereign distress spillover' },
    { country1: 'Ghana', country2: 'Zambia', correlation: 0.71, channel: 'Sub-Saharan African debt cluster' },
    { country1: 'Egypt', country2: 'Tunisia', correlation: 0.68, channel: 'North African fiscal stress' },
    { country1: 'Ukraine', country2: 'Lebanon', correlation: 0.42, channel: 'Geopolitical risk / conflict default' },
  ],
};

// ── Color / Badge helpers ──

function ratingColor(tier: string): string {
  switch (tier) {
    case 'default': return 'text-red-400 bg-red-500/15 border-red-500/30';
    case 'distressed': return 'text-orange-400 bg-orange-500/15 border-orange-500/30';
    case 'speculative': return 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30';
    case 'investment': return 'text-green-400 bg-green-500/15 border-green-500/30';
    default: return 'text-neutral-400 bg-neutral-500/15 border-neutral-500/30';
  }
}

function riskTierColor(tier: string): string {
  switch (tier) {
    case 'default': return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'critical': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'high': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'elevated': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    case 'moderate': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    default: return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/30';
  }
}

function eventTypeColor(type: string): string {
  switch (type) {
    case 'rating_action': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'restructuring': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    case 'payment_miss': return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'imf_program': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    case 'reserves_crisis': return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'auction': return 'text-green-400 bg-green-500/10 border-green-500/30';
    default: return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/30';
  }
}

function eventTypeLabel(type: string): string {
  switch (type) {
    case 'rating_action': return 'RATING';
    case 'restructuring': return 'RESTRUCT';
    case 'payment_miss': return 'MISSED PMT';
    case 'imf_program': return 'IMF';
    case 'reserves_crisis': return 'FX RESERVE';
    case 'auction': return 'AUCTION';
    default: return type.toUpperCase();
  }
}

function impactColor(impact: string): string {
  switch (impact) {
    case 'positive': return 'text-green-400';
    case 'negative': return 'text-red-400';
    default: return 'text-neutral-500';
  }
}

function impactArrow(impact: string): string {
  switch (impact) {
    case 'positive': return '\u2191';
    case 'negative': return '\u2193';
    default: return '\u2192';
  }
}

function cdsChangeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function probColor(prob: number): string {
  if (prob >= 80) return 'text-red-400';
  if (prob >= 50) return 'text-orange-400';
  if (prob >= 25) return 'text-amber-400';
  if (prob >= 10) return 'text-yellow-400';
  return 'text-neutral-300';
}

function reserveTrendColor(trend: string): string {
  switch (trend) {
    case 'recovering': return 'text-green-400';
    case 'stable': return 'text-neutral-400';
    case 'declining': return 'text-red-400';
    default: return 'text-neutral-500';
  }
}

function capitalAccessColor(access: string): string {
  switch (access) {
    case 'none': return 'text-red-400 bg-red-500/10';
    case 'restricted': return 'text-orange-400 bg-orange-500/10';
    case 'limited': return 'text-yellow-400 bg-yellow-500/10';
    case 'full': return 'text-green-400 bg-green-500/10';
    default: return 'text-neutral-400 bg-neutral-500/10';
  }
}

function correlationColor(corr: number): string {
  if (corr >= 0.8) return 'text-red-400';
  if (corr >= 0.6) return 'text-orange-400';
  if (corr >= 0.4) return 'text-yellow-400';
  return 'text-neutral-400';
}

function correlationBarWidth(corr: number): string {
  return `${Math.round(corr * 100)}%`;
}

function fmtBps(n: number): string {
  return n.toLocaleString() + ' bps';
}

function fmtBpsChange(n: number): string {
  const sign = n > 0 ? '+' : '';
  return sign + n.toLocaleString();
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtUsd(n: number): string {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'T';
  return '$' + n.toFixed(1) + 'B';
}

// ── Main Panel ──

export function SovereignDefaultPanel() {
  const t = useT();
  const { data: raw, isLoading, refetch } = useSovereignDefault();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const data = raw || FALLBACK_DATA;
  const summary = data.summary;
  const countries = data.countries || [];
  const events = data.events || [];
  const contagion = data.contagion || [];

  const selected = countries.find((c: any) => c.code === selectedCountry);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            {tr(t, 'sdTitle', 'Sovereign Default Risk')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {summary && (
            <span className="text-[7px] font-mono text-red-400 uppercase tracking-wider">
              {summary.sovereignsInDistress} {tr(t, 'sdInDistress', 'in distress')}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-orange-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !raw && (
          <div className="text-center py-8 text-orange-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'sdNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {/* Overview Stats Bar */}
            <OverviewBar summary={summary} t={t} />

            {/* Country Risk Table */}
            <CountryTable
              countries={countries}
              selectedCode={selectedCountry}
              onSelect={(code: string) => setSelectedCountry(selectedCountry === code ? null : code)}
              t={t}
            />

            {/* Selected Country Detail */}
            {selected && <CountryDetail country={selected} t={t} />}

            {/* Recent Events */}
            <EventsFeed events={events} t={t} />

            {/* Contagion Risk */}
            <ContagionRisk pairs={contagion} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Overview Stats Bar ──

function OverviewBar({ summary, t }: { summary: any; t: ReturnType<typeof useT> }) {
  const stats = [
    { label: tr(t, 'sdDistressed', 'Sovereigns in Distress'), value: String(summary.sovereignsInDistress), color: 'text-red-400' },
    { label: tr(t, 'sdTotalDebt', 'Total Distressed Debt'), value: fmtUsd(summary.totalDistressedDebt), color: 'text-orange-400' },
    { label: tr(t, 'sdAvgRecovery', 'Avg Recovery Rate'), value: fmtPct(summary.avgRecoveryRate), color: 'text-yellow-400' },
    { label: tr(t, 'sdIMFPrograms', 'Active IMF Programs'), value: String(summary.activeIMFPrograms), color: 'text-cyan-400' },
  ];

  return (
    <div className="grid grid-cols-4 border-b border-orange-400/30 shrink-0">
      {stats.map((s: any, i: number) => (
        <div
          key={i}
          className={`px-3 py-2 text-center ${i < 3 ? 'border-r border-orange-400/30' : ''}`}
        >
          <div className="text-[7px] font-mono uppercase tracking-widest text-neutral-500 mb-0.5">
            {s.label}
          </div>
          <div className={`text-[11px] font-black font-mono tabular-nums ${s.color}`}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Country Risk Table ──

function CountryTable({
  countries,
  selectedCode,
  onSelect,
  t,
}: {
  countries: any[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-orange-400/30">
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#030303]">
        <div className="w-1 h-1 bg-orange-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-400">
          {tr(t, 'sdCountryRisk', 'Country Risk Monitor')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_52px_72px_56px_52px_52px_56px] gap-0 px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sdCountry', 'Country')}
        </span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">
          {tr(t, 'sdRating', 'Rating')}
        </span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">
          {tr(t, 'sdCDS', 'CDS Spread')}
        </span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">
          {tr(t, 'sdDebtGDP', 'Debt/GDP')}
        </span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">
          {tr(t, 'sdProb1Y', 'PD 1Y')}
        </span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">
          {tr(t, 'sdProb5Y', 'PD 5Y')}
        </span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">
          {tr(t, 'sdRiskTier', 'Risk Tier')}
        </span>
      </div>

      {/* Table rows */}
      {countries.map((c: any) => (
        <button
          key={c.code}
          onClick={() => onSelect(c.code)}
          className={`w-full grid grid-cols-[1fr_52px_72px_56px_52px_52px_56px] gap-0 px-3 py-1 border-b border-border/20 text-left transition-colors hover:bg-orange-400/[0.02] ${
            selectedCode === c.code ? 'bg-orange-400/[0.05]' : ''
          }`}
        >
          {/* Country name */}
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-mono text-neutral-500">{c.code}</span>
            <span className="text-[9px] font-mono text-neutral-300">{c.country}</span>
          </div>

          {/* Rating badge */}
          <div className="flex items-center justify-end">
            <span className={`text-[7px] font-black font-mono px-1 py-0.5 border ${ratingColor(c.ratingTier)}`}>
              {c.rating}
            </span>
          </div>

          {/* CDS spread */}
          <div className="flex items-center justify-end gap-1">
            <span className="text-[9px] font-mono tabular-nums text-neutral-300">
              {fmtBps(c.cdsSpread)}
            </span>
            <span className={`text-[7px] font-mono tabular-nums ${cdsChangeColor(c.cdsChange)}`}>
              {fmtBpsChange(c.cdsChange)}
            </span>
          </div>

          {/* Debt/GDP */}
          <span className="text-[9px] font-mono tabular-nums text-neutral-300 text-right">
            {fmtPct(c.debtToGdp)}
          </span>

          {/* Default prob 1Y */}
          <span className={`text-[9px] font-mono tabular-nums text-right ${probColor(c.defaultProb1Y)}`}>
            {fmtPct(c.defaultProb1Y)}
          </span>

          {/* Default prob 5Y */}
          <span className={`text-[9px] font-mono tabular-nums text-right ${probColor(c.defaultProb5Y)}`}>
            {fmtPct(c.defaultProb5Y)}
          </span>

          {/* Risk tier badge */}
          <div className="flex items-center justify-end">
            <span className={`text-[7px] font-black font-mono uppercase px-1 py-0.5 border ${riskTierColor(c.riskTier)}`}>
              {c.riskTier}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Country Detail View ──

function CountryDetail({ country, t }: { country: any; t: ReturnType<typeof useT> }) {
  const d = country.detail;
  if (!d) return null;

  return (
    <div className="border-b border-orange-400/30 bg-[#030303]">
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <div className="w-1 h-1 bg-orange-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-400">
          {country.country} {tr(t, 'sdDetailView', 'Detail')}
        </span>
        <span className={`text-[7px] font-black font-mono uppercase px-1 py-0.5 border ml-auto ${ratingColor(country.ratingTier)}`}>
          {country.rating}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-0">
        {/* Debt Sustainability */}
        <div className="px-3 py-2 border-r border-border/20">
          <div className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
            {tr(t, 'sdDebtSustain', 'Debt Sustainability')}
          </div>
          <div className="space-y-1">
            <DetailRow
              label={tr(t, 'sdPrimaryBalance', 'Primary Balance')}
              value={`${d.primaryBalance >= 0 ? '+' : ''}${d.primaryBalance.toFixed(1)}% GDP`}
              color={d.primaryBalance >= 0 ? 'text-green-400' : 'text-red-400'}
            />
            <DetailRow
              label={tr(t, 'sdInterestRevenue', 'Interest/Revenue')}
              value={fmtPct(d.interestToRevenue)}
              color={d.interestToRevenue > 40 ? 'text-red-400' : d.interestToRevenue > 20 ? 'text-amber-400' : 'text-neutral-300'}
            />
            <DetailRow
              label={tr(t, 'sdExtDebt', 'External Debt/GDP')}
              value={fmtPct(d.externalDebtPct)}
              color="text-neutral-300"
            />
          </div>
        </div>

        {/* FX Reserves */}
        <div className="px-3 py-2 border-r border-border/20">
          <div className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
            {tr(t, 'sdFxReserves', 'FX Reserves')}
          </div>
          <div className="space-y-1">
            <DetailRow
              label={tr(t, 'sdReserveLevel', 'Reserves')}
              value={fmtUsd(d.fxReserves)}
              color="text-neutral-300"
            />
            <DetailRow
              label={tr(t, 'sdImportCover', 'Import Cover')}
              value={`${d.reserveMonths.toFixed(1)} mo`}
              color={d.reserveMonths < 3 ? 'text-red-400' : d.reserveMonths < 6 ? 'text-amber-400' : 'text-green-400'}
            />
            <DetailRow
              label={tr(t, 'sdTrend', 'Trend')}
              value={d.reserveTrend.toUpperCase()}
              color={reserveTrendColor(d.reserveTrend)}
            />
          </div>
        </div>

        {/* Capital Market Access */}
        <div className="px-3 py-2">
          <div className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
            {tr(t, 'sdCapitalAccess', 'Capital Markets')}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[7px] font-mono text-neutral-500">{tr(t, 'sdAccess', 'Access')}</span>
              <span className={`text-[7px] font-black font-mono uppercase px-1 py-0.5 ${capitalAccessColor(d.capitalAccess)}`}>
                {d.capitalAccess}
              </span>
            </div>
            <DetailRow
              label={tr(t, 'sdLastAuction', 'Last Auction')}
              value={d.lastAuction}
              color="text-neutral-300"
            />
            <DetailRow
              label={tr(t, 'sdAuctionResult', 'Result')}
              value={d.auctionResult}
              color="text-neutral-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[7px] font-mono text-neutral-500">{label}</span>
      <span className={`text-[8px] font-mono tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

// ── Recent Sovereign Events ──

function EventsFeed({ events, t }: { events: any[]; t: ReturnType<typeof useT> }) {
  if (!events.length) return null;

  return (
    <div className="border-b border-orange-400/30">
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#030303]">
        <div className="w-1 h-1 bg-orange-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-400">
          {tr(t, 'sdRecentEvents', 'Recent Sovereign Events')}
        </span>
      </div>

      {events.map((ev: any, i: number) => (
        <div
          key={i}
          className="flex items-start gap-2 px-3 py-1.5 border-b border-border/20 hover:bg-orange-400/[0.02] transition-colors"
        >
          {/* Date */}
          <span className="text-[7px] font-mono tabular-nums text-neutral-500 shrink-0 w-14 pt-0.5">
            {ev.date}
          </span>

          {/* Country */}
          <span className="text-[8px] font-mono text-neutral-400 shrink-0 w-16 pt-0.5">
            {ev.country}
          </span>

          {/* Event type badge */}
          <span className={`text-[6px] font-black font-mono uppercase px-1 py-0.5 border shrink-0 ${eventTypeColor(ev.type)}`}>
            {eventTypeLabel(ev.type)}
          </span>

          {/* Description */}
          <span className="text-[8px] font-mono text-neutral-300 flex-1 leading-tight">
            {ev.description}
          </span>

          {/* Market impact */}
          <span className={`text-[8px] font-mono shrink-0 ${impactColor(ev.impact)}`}>
            {impactArrow(ev.impact)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Contagion Risk Section ──

function ContagionRisk({ pairs, t }: { pairs: any[]; t: ReturnType<typeof useT> }) {
  if (!pairs.length) return null;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#030303]">
        <div className="w-1 h-1 bg-orange-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-400">
          {tr(t, 'sdContagion', 'Contagion Risk')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_64px_1fr] gap-0 px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sdCountry1', 'Country A')}
        </span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sdCountry2', 'Country B')}
        </span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">
          {tr(t, 'sdCorrelation', 'Correl')}
        </span>
        <span className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-right">
          {tr(t, 'sdChannel', 'Channel')}
        </span>
      </div>

      {pairs.map((p: any, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1fr_64px_1fr] gap-0 px-3 py-1.5 border-b border-border/20 hover:bg-orange-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono text-neutral-300">{p.country1}</span>
          <span className="text-[9px] font-mono text-neutral-300">{p.country2}</span>
          <div className="flex items-center justify-end gap-1.5">
            {/* Mini bar */}
            <div className="w-12 h-1 bg-neutral-800 relative">
              <div
                className={`h-full ${p.correlation >= 0.7 ? 'bg-red-400' : p.correlation >= 0.5 ? 'bg-orange-400' : 'bg-yellow-400'}`}
                style={{ width: correlationBarWidth(p.correlation) }}
              />
            </div>
            <span className={`text-[8px] font-mono tabular-nums ${correlationColor(p.correlation)}`}>
              {p.correlation.toFixed(2)}
            </span>
          </div>
          <span className="text-[7px] font-mono text-neutral-500 text-right">
            {p.channel}
          </span>
        </div>
      ))}
    </div>
  );
}
