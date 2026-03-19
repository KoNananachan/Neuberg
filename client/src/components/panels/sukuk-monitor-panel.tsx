import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useSukukMonitor } from '../../api/hooks/use-sukuk-monitor';

const ACCENT = '#34d399'; // emerald-400
const ACCENT_DIM = 'rgba(52,211,153,0.02)';

type Tab = 'active' | 'pipeline' | 'market' | 'curves';

// -- Color helpers --

function ratingColor(rating: string): string {
  const r = rating.toUpperCase();
  if (r.startsWith('AAA')) return '#4ade80';
  if (r.startsWith('AA')) return '#a3e635';
  if (r.startsWith('A')) return '#facc15';
  if (r.startsWith('BBB')) return '#fb923c';
  return '#f87171';
}

function structureBadge(structure: string): { bg: string; text: string } {
  const s = structure.toLowerCase();
  if (s.includes('ijara')) return { bg: 'rgba(52,211,153,0.12)', text: '#34d399' };
  if (s.includes('wakala')) return { bg: 'rgba(96,165,250,0.12)', text: '#60a5fa' };
  if (s.includes('murabaha')) return { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' };
  if (s.includes('musharaka')) return { bg: 'rgba(192,132,252,0.12)', text: '#c084fc' };
  if (s.includes('mudaraba')) return { bg: 'rgba(34,211,238,0.12)', text: '#22d3ee' };
  if (s.includes('salam')) return { bg: 'rgba(251,146,60,0.12)', text: '#fb923c' };
  if (s.includes('istisna')) return { bg: 'rgba(244,114,182,0.12)', text: '#f472b6' };
  return { bg: 'rgba(107,114,128,0.12)', text: '#6b7280' };
}

function statusBadge(status: string): { bg: string; text: string } {
  const s = status.toLowerCase();
  if (s.includes('mandated') || s.includes('announced')) return { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' };
  if (s.includes('roadshow')) return { bg: 'rgba(96,165,250,0.12)', text: '#60a5fa' };
  if (s.includes('priced') || s.includes('allocated')) return { bg: 'rgba(52,211,153,0.12)', text: '#34d399' };
  if (s.includes('book')) return { bg: 'rgba(192,132,252,0.12)', text: '#c084fc' };
  return { bg: 'rgba(107,114,128,0.12)', text: '#6b7280' };
}

// -- Fallback data --

const FALLBACK = {
  summary: {
    totalOutstanding: '842B',
    ytdIssuance: '128B',
    avgProfitRate: '4.85%',
    avgSpread: '+112bps',
    sovereignWeight: '58.4%',
    corporateWeight: '41.6%',
  },
  activeIssues: [
    { issuer: 'Saudi Arabia', country: 'SA', structure: 'Ijara', maturity: '2034', profitRate: 4.75, yield: 4.82, spread: 78, rating: 'A+', amount: 5.0, currency: 'USD' },
    { issuer: 'Malaysia Sovereign', country: 'MY', structure: 'Wakala', maturity: '2031', profitRate: 3.95, yield: 4.02, spread: 62, rating: 'A-', amount: 3.5, currency: 'USD' },
    { issuer: 'IsDB Trust Services', country: 'INT', structure: 'Wakala', maturity: '2029', profitRate: 4.10, yield: 4.15, spread: 42, rating: 'AAA', amount: 2.5, currency: 'USD' },
    { issuer: 'Dubai Islamic Bank', country: 'AE', structure: 'Mudaraba', maturity: '2030', profitRate: 5.25, yield: 5.35, spread: 135, rating: 'A', amount: 1.0, currency: 'USD' },
    { issuer: 'Qatar International', country: 'QA', structure: 'Ijara', maturity: '2033', profitRate: 4.50, yield: 4.58, spread: 65, rating: 'AA-', amount: 4.0, currency: 'USD' },
    { issuer: 'Bahrain Sovereign', country: 'BH', structure: 'Ijara', maturity: '2032', profitRate: 6.25, yield: 6.38, spread: 248, rating: 'B+', amount: 2.0, currency: 'USD' },
    { issuer: 'Indonesia Republic', country: 'ID', structure: 'Wakala', maturity: '2035', profitRate: 5.10, yield: 5.18, spread: 125, rating: 'BBB', amount: 3.0, currency: 'USD' },
    { issuer: 'Turkey Republic', country: 'TR', structure: 'Ijara', maturity: '2028', profitRate: 7.50, yield: 7.68, spread: 385, rating: 'B', amount: 2.5, currency: 'USD' },
    { issuer: 'STC (Saudi Telecom)', country: 'SA', structure: 'Murabaha', maturity: '2029', profitRate: 4.85, yield: 4.92, spread: 98, rating: 'A', amount: 1.5, currency: 'USD' },
    { issuer: 'Etihad Airways', country: 'AE', structure: 'Ijara', maturity: '2031', profitRate: 5.75, yield: 5.88, spread: 185, rating: 'BBB-', amount: 1.0, currency: 'USD' },
    { issuer: 'ICD (Islamic Corp)', country: 'INT', structure: 'Wakala', maturity: '2027', profitRate: 4.30, yield: 4.35, spread: 48, rating: 'AA', amount: 1.5, currency: 'USD' },
    { issuer: 'DP World', country: 'AE', structure: 'Musharaka', maturity: '2033', profitRate: 5.45, yield: 5.55, spread: 155, rating: 'BBB+', amount: 2.0, currency: 'USD' },
    { issuer: 'Oman Sovereign', country: 'OM', structure: 'Ijara', maturity: '2030', profitRate: 5.85, yield: 5.95, spread: 195, rating: 'BB+', amount: 1.75, currency: 'USD' },
    { issuer: 'Kuwait Finance House', country: 'KW', structure: 'Mudaraba', maturity: '2029', profitRate: 4.60, yield: 4.68, spread: 82, rating: 'A', amount: 1.0, currency: 'USD' },
  ],
  pipeline: [
    { issuer: 'Saudi Arabia', country: 'SA', structure: 'Ijara', expectedSize: '5-6B', currency: 'USD', expectedTenor: '10Y', status: 'Mandated', leadManagers: 'HSBC / Citi / JPM', expectedDate: '2026-04' },
    { issuer: 'Malaysia Sovereign', country: 'MY', structure: 'Wakala', expectedSize: '2-3B', currency: 'USD', expectedTenor: '7Y', status: 'Roadshow', leadManagers: 'CIMB / StanChart', expectedDate: '2026-04' },
    { issuer: 'Emirates NBD', country: 'AE', structure: 'Mudaraba', expectedSize: '750M', currency: 'USD', expectedTenor: '5Y', status: 'Announced', leadManagers: 'ENBD / HSBC', expectedDate: '2026-05' },
    { issuer: 'Sharjah Govt', country: 'AE', structure: 'Ijara', expectedSize: '1-1.5B', currency: 'USD', expectedTenor: '10Y', status: 'Mandated', leadManagers: 'StanChart / HSBC', expectedDate: '2026-05' },
    { issuer: 'IsDB Trust', country: 'INT', structure: 'Wakala', expectedSize: '2B', currency: 'USD', expectedTenor: '5Y', status: 'Priced', leadManagers: 'IsDB / HSBC / Citi', expectedDate: '2026-04' },
    { issuer: 'Axiata Group', country: 'MY', structure: 'Musharaka', expectedSize: '500M', currency: 'MYR', expectedTenor: '7Y', status: 'Book Building', leadManagers: 'CIMB / Maybank', expectedDate: '2026-05' },
    { issuer: 'DAMAC Properties', country: 'AE', structure: 'Ijara', expectedSize: '500M', currency: 'USD', expectedTenor: '5Y', status: 'Announced', leadManagers: 'FAB / Emirates NBD', expectedDate: '2026-06' },
    { issuer: 'Pakistan Republic', country: 'PK', structure: 'Ijara', expectedSize: '1B', currency: 'USD', expectedTenor: '5Y', status: 'Roadshow', leadManagers: 'StanChart / Dubai Islamic', expectedDate: '2026-06' },
  ],
  marketBreakdown: {
    byCountry: [
      { name: 'Saudi Arabia', weight: 28.5, amount: 240 },
      { name: 'Malaysia', weight: 22.1, amount: 186 },
      { name: 'UAE', weight: 16.8, amount: 141 },
      { name: 'Indonesia', weight: 8.4, amount: 71 },
      { name: 'Qatar', weight: 7.2, amount: 61 },
      { name: 'Turkey', weight: 5.8, amount: 49 },
      { name: 'Bahrain', weight: 4.1, amount: 35 },
      { name: 'Kuwait', weight: 3.2, amount: 27 },
      { name: 'Oman', weight: 2.4, amount: 20 },
      { name: 'Others', weight: 1.5, amount: 12 },
    ],
    byStructure: [
      { name: 'Ijara', weight: 38.2, amount: 322 },
      { name: 'Wakala', weight: 28.5, amount: 240 },
      { name: 'Murabaha', weight: 14.8, amount: 125 },
      { name: 'Musharaka', weight: 8.2, amount: 69 },
      { name: 'Mudaraba', weight: 6.5, amount: 55 },
      { name: 'Salam', weight: 2.1, amount: 18 },
      { name: 'Istisna', weight: 1.7, amount: 13 },
    ],
    byCurrency: [
      { name: 'USD', weight: 52.4, amount: 441 },
      { name: 'MYR', weight: 18.5, amount: 156 },
      { name: 'SAR', weight: 12.8, amount: 108 },
      { name: 'IDR', weight: 6.2, amount: 52 },
      { name: 'TRY', weight: 4.1, amount: 35 },
      { name: 'Others', weight: 6.0, amount: 50 },
    ],
    bySector: [
      { name: 'Sovereign', weight: 42.5, amount: 358 },
      { name: 'Financial', weight: 22.8, amount: 192 },
      { name: 'Supranational', weight: 12.4, amount: 104 },
      { name: 'Energy', weight: 8.5, amount: 72 },
      { name: 'Telecom', weight: 5.2, amount: 44 },
      { name: 'Real Estate', weight: 4.8, amount: 40 },
      { name: 'Transport', weight: 3.8, amount: 32 },
    ],
  },
  yieldCurves: {
    tenors: ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'],
    curves: [
      { name: 'Saudi Arabia', rating: 'A+', yields: [4.15, 4.28, 4.38, 4.55, 4.68, 4.82, 5.02, 5.15, 5.28] },
      { name: 'Malaysia', rating: 'A-', yields: [3.72, 3.85, 3.92, 4.05, 4.18, 4.32, 4.52, 4.65, 4.78] },
      { name: 'Qatar', rating: 'AA-', yields: [3.95, 4.08, 4.18, 4.35, 4.48, 4.58, 4.72, 4.82, 4.92] },
      { name: 'Indonesia', rating: 'BBB', yields: [4.55, 4.72, 4.85, 5.05, 5.22, 5.38, 5.58, 5.72, 5.85] },
      { name: 'Bahrain', rating: 'B+', yields: [5.45, 5.68, 5.85, 6.12, 6.32, 6.48, 6.72, 6.88, 7.02] },
    ],
  },
};

const CURVE_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#c084fc', '#f87171'];

export function SukukMonitorPanel() {
  const { data, isLoading, refetch } = useSukukMonitor();
  const [tab, setTab] = useState<Tab>('active');

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-emerald-400/40 uppercase tracking-widest animate-pulse">
          Loading sukuk data...
        </div>
      </div>
    );
  }

  if (!data && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          Failed to load sukuk data
        </div>
      </div>
    );
  }

  const d = (data as any) ?? FALLBACK;
  const summary = d.summary ?? FALLBACK.summary;
  const activeIssues = d.activeIssues ?? FALLBACK.activeIssues;
  const pipeline = d.pipeline ?? FALLBACK.pipeline;
  const marketBreakdown = d.marketBreakdown ?? FALLBACK.marketBreakdown;
  const yieldCurves = d.yieldCurves ?? FALLBACK.yieldCurves;

  const byCountry = marketBreakdown.byCountry ?? FALLBACK.marketBreakdown.byCountry;
  const byStructure = marketBreakdown.byStructure ?? FALLBACK.marketBreakdown.byStructure;
  const byCurrency = marketBreakdown.byCurrency ?? FALLBACK.marketBreakdown.byCurrency;
  const bySector = marketBreakdown.bySector ?? FALLBACK.marketBreakdown.bySector;

  const maxCountryWeight = Math.max(...byCountry.map((c: any) => c.weight));
  const maxStructureWeight = Math.max(...byStructure.map((s: any) => s.weight));
  const maxCurrencyWeight = Math.max(...byCurrency.map((c: any) => c.weight));
  const maxSectorWeight = Math.max(...bySector.map((s: any) => s.weight));

  const tenors = yieldCurves.tenors ?? FALLBACK.yieldCurves.tenors;
  const curves = yieldCurves.curves ?? FALLBACK.yieldCurves.curves;
  const allYields = curves.flatMap((c: any) => c.yields ?? []);
  const minYield = Math.floor(Math.min(...allYields) * 10) / 10 - 0.2;
  const maxYield = Math.ceil(Math.max(...allYields) * 10) / 10 + 0.2;
  const yieldRange = maxYield - minYield || 1;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'active', label: 'ACTIVE ISSUES' },
    { key: 'pipeline', label: 'PIPELINE' },
    { key: 'market', label: 'MARKET' },
    { key: 'curves', label: 'CURVES' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden font-mono text-[9px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-emerald-400">
            Sukuk Monitor
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-6 border-b border-border/20 shrink-0">
        {[
          { label: 'TOTAL OUTSTANDING', value: `$${summary.totalOutstanding}` },
          { label: 'YTD ISSUANCE', value: `$${summary.ytdIssuance}` },
          { label: 'AVG PROFIT RATE', value: summary.avgProfitRate },
          { label: 'AVG SPREAD', value: summary.avgSpread },
          { label: 'SOVEREIGN', value: summary.sovereignWeight },
          { label: 'CORPORATE', value: summary.corporateWeight },
        ].map((stat) => (
          <div key={stat.label} className="px-2 py-1.5 border-r border-border/20 last:border-r-0">
            <div className="text-[7px] uppercase tracking-wider text-neutral-500 font-bold">{stat.label}</div>
            <div className="text-[10px] font-black tabular-nums" style={{ color: ACCENT }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors"
            style={{
              color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.3)',
              borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: tab === t.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto no-scrollbar">

        {/* Active Issues */}
        {tab === 'active' && (
          <table className="w-full">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Issuer</th>
                <th className="px-2 py-1.5 text-left font-bold">Ctry</th>
                <th className="px-2 py-1.5 text-left font-bold">Structure</th>
                <th className="px-2 py-1.5 text-left font-bold">Mat</th>
                <th className="px-2 py-1.5 text-right font-bold">Profit</th>
                <th className="px-2 py-1.5 text-right font-bold">Yield</th>
                <th className="px-2 py-1.5 text-right font-bold">Sprd</th>
                <th className="px-2 py-1.5 text-left font-bold">Rtg</th>
                <th className="px-2 py-1.5 text-right font-bold">Amt (B)</th>
                <th className="px-2 py-1.5 text-left font-bold">Ccy</th>
              </tr>
            </thead>
            <tbody>
              {activeIssues.map((s: any, i: number) => {
                const sBadge = structureBadge(s.structure ?? '');
                return (
                  <tr key={i} className="border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors">
                    <td className="px-2 py-1.5 font-bold text-white/90 truncate max-w-[130px]">{s.issuer}</td>
                    <td className="px-2 py-1.5 text-neutral-400">{s.country}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className="text-[8px] font-bold px-1.5 py-0.5"
                        style={{ color: sBadge.text, background: sBadge.bg }}
                      >
                        {(s.structure ?? '').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-neutral-400">{s.maturity}</td>
                    <td className="px-2 py-1.5 text-right text-white/70 tabular-nums">{(s.profitRate ?? 0).toFixed(2)}%</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums" style={{ color: ACCENT }}>
                      {(s.yield ?? 0).toFixed(2)}%
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/60 tabular-nums">+{s.spread ?? 0}</td>
                    <td className="px-2 py-1.5">
                      <span className="font-bold" style={{ color: ratingColor(s.rating ?? '') }}>
                        {s.rating}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold tabular-nums">
                      {(s.amount ?? 0).toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5 text-neutral-500">{s.currency}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pipeline */}
        {tab === 'pipeline' && (
          <table className="w-full">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Issuer</th>
                <th className="px-2 py-1.5 text-left font-bold">Ctry</th>
                <th className="px-2 py-1.5 text-left font-bold">Structure</th>
                <th className="px-2 py-1.5 text-right font-bold">Exp Size</th>
                <th className="px-2 py-1.5 text-left font-bold">Ccy</th>
                <th className="px-2 py-1.5 text-left font-bold">Tenor</th>
                <th className="px-2 py-1.5 text-left font-bold">Status</th>
                <th className="px-2 py-1.5 text-left font-bold">Lead Managers</th>
                <th className="px-2 py-1.5 text-left font-bold">Exp Date</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map((p: any, i: number) => {
                const sBadge = structureBadge(p.structure ?? '');
                const stBadge = statusBadge(p.status ?? '');
                return (
                  <tr key={i} className="border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors">
                    <td className="px-2 py-1.5 font-bold text-white/90 truncate max-w-[130px]">{p.issuer}</td>
                    <td className="px-2 py-1.5 text-neutral-400">{p.country}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className="text-[8px] font-bold px-1.5 py-0.5"
                        style={{ color: sBadge.text, background: sBadge.bg }}
                      >
                        {(p.structure ?? '').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums" style={{ color: ACCENT }}>
                      {p.expectedSize}
                    </td>
                    <td className="px-2 py-1.5 text-neutral-500">{p.currency}</td>
                    <td className="px-2 py-1.5 text-neutral-400">{p.expectedTenor}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className="text-[8px] font-bold px-1.5 py-0.5"
                        style={{ color: stBadge.text, background: stBadge.bg }}
                      >
                        {(p.status ?? '').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-neutral-500 truncate max-w-[140px]">{p.leadManagers}</td>
                    <td className="px-2 py-1.5 text-neutral-400">{p.expectedDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Market Breakdown */}
        {tab === 'market' && (
          <div className="px-2 py-2 space-y-4">
            {/* By Country */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 px-1">
                <div className="w-1 h-1 bg-emerald-400" />
                <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
                  By Country
                </span>
              </div>
              <div className="grid grid-cols-[1.2fr_0.6fr_0.7fr_2fr] gap-1 px-1 mb-1">
                {['COUNTRY', 'WEIGHT', 'AMOUNT ($B)', ''].map((h) => (
                  <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">{h}</span>
                ))}
              </div>
              {byCountry.map((c: any) => (
                <div
                  key={c.name}
                  className="grid grid-cols-[1.2fr_0.6fr_0.7fr_2fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors items-center"
                >
                  <span className="text-[8px] font-bold text-neutral-300 uppercase truncate">{c.name}</span>
                  <span className="text-[8px] font-bold tabular-nums" style={{ color: ACCENT }}>{(c.weight ?? 0).toFixed(1)}%</span>
                  <span className="text-[8px] text-white/70 tabular-nums">${c.amount}</span>
                  <div className="h-1.5 bg-neutral-900 relative">
                    <div
                      className="absolute top-0 left-0 h-full"
                      style={{ width: `${(c.weight / maxCountryWeight) * 100}%`, backgroundColor: ACCENT, opacity: 0.5 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* By Structure */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 px-1">
                <div className="w-1 h-1 bg-emerald-400" />
                <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
                  By Structure
                </span>
              </div>
              <div className="grid grid-cols-[1.2fr_0.6fr_0.7fr_2fr] gap-1 px-1 mb-1">
                {['STRUCTURE', 'WEIGHT', 'AMOUNT ($B)', ''].map((h) => (
                  <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">{h}</span>
                ))}
              </div>
              {byStructure.map((s: any) => {
                const badge = structureBadge(s.name ?? '');
                return (
                  <div
                    key={s.name}
                    className="grid grid-cols-[1.2fr_0.6fr_0.7fr_2fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors items-center"
                  >
                    <span className="text-[8px] font-bold px-1.5 py-0.5" style={{ color: badge.text, background: badge.bg }}>
                      {(s.name ?? '').toUpperCase()}
                    </span>
                    <span className="text-[8px] font-bold tabular-nums" style={{ color: ACCENT }}>{(s.weight ?? 0).toFixed(1)}%</span>
                    <span className="text-[8px] text-white/70 tabular-nums">${s.amount}</span>
                    <div className="h-1.5 bg-neutral-900 relative">
                      <div
                        className="absolute top-0 left-0 h-full"
                        style={{ width: `${(s.weight / maxStructureWeight) * 100}%`, backgroundColor: badge.text, opacity: 0.5 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* By Currency */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 px-1">
                <div className="w-1 h-1 bg-emerald-400" />
                <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
                  By Currency
                </span>
              </div>
              <div className="grid grid-cols-[1.2fr_0.6fr_0.7fr_2fr] gap-1 px-1 mb-1">
                {['CURRENCY', 'WEIGHT', 'AMOUNT ($B)', ''].map((h) => (
                  <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">{h}</span>
                ))}
              </div>
              {byCurrency.map((c: any) => (
                <div
                  key={c.name}
                  className="grid grid-cols-[1.2fr_0.6fr_0.7fr_2fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors items-center"
                >
                  <span className="text-[8px] font-bold text-neutral-300">{c.name}</span>
                  <span className="text-[8px] font-bold tabular-nums" style={{ color: ACCENT }}>{(c.weight ?? 0).toFixed(1)}%</span>
                  <span className="text-[8px] text-white/70 tabular-nums">${c.amount}</span>
                  <div className="h-1.5 bg-neutral-900 relative">
                    <div
                      className="absolute top-0 left-0 h-full"
                      style={{ width: `${(c.weight / maxCurrencyWeight) * 100}%`, backgroundColor: ACCENT, opacity: 0.5 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* By Sector */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 px-1">
                <div className="w-1 h-1 bg-emerald-400" />
                <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
                  By Sector
                </span>
              </div>
              <div className="grid grid-cols-[1.2fr_0.6fr_0.7fr_2fr] gap-1 px-1 mb-1">
                {['SECTOR', 'WEIGHT', 'AMOUNT ($B)', ''].map((h) => (
                  <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">{h}</span>
                ))}
              </div>
              {bySector.map((s: any) => (
                <div
                  key={s.name}
                  className="grid grid-cols-[1.2fr_0.6fr_0.7fr_2fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors items-center"
                >
                  <span className="text-[8px] font-bold text-neutral-300 uppercase truncate">{s.name}</span>
                  <span className="text-[8px] font-bold tabular-nums" style={{ color: ACCENT }}>{(s.weight ?? 0).toFixed(1)}%</span>
                  <span className="text-[8px] text-white/70 tabular-nums">${s.amount}</span>
                  <div className="h-1.5 bg-neutral-900 relative">
                    <div
                      className="absolute top-0 left-0 h-full"
                      style={{ width: `${(s.weight / maxSectorWeight) * 100}%`, backgroundColor: ACCENT, opacity: 0.5 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Yield Curves */}
        {tab === 'curves' && (
          <div className="px-2 py-2">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <div className="w-1 h-1 bg-emerald-400" />
              <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
                Sovereign Sukuk Yield Curves
              </span>
            </div>

            {/* SVG Curve Chart */}
            <div className="mx-1 mb-3">
              <svg viewBox="0 0 600 220" className="w-full" style={{ maxHeight: 220 }}>
                {/* Grid lines */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const y = 20 + (i * 180) / 4;
                  const yieldVal = maxYield - (i * yieldRange) / 4;
                  return (
                    <g key={i}>
                      <line x1={40} y1={y} x2={580} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                      <text x={36} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="monospace">
                        {yieldVal.toFixed(1)}%
                      </text>
                    </g>
                  );
                })}
                {/* X-axis labels */}
                {tenors.map((t: string, i: number) => {
                  const x = 40 + (i * 540) / (tenors.length - 1);
                  return (
                    <text key={t} x={x} y={212} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="monospace">
                      {t}
                    </text>
                  );
                })}
                {/* Curve lines */}
                {curves.map((curve: any, ci: number) => {
                  const yields = curve.yields ?? [];
                  const points = yields.map((y: number, ti: number) => {
                    const x = 40 + (ti * 540) / (tenors.length - 1);
                    const py = 20 + ((maxYield - y) / yieldRange) * 180;
                    return `${x},${py}`;
                  }).join(' ');
                  return (
                    <g key={ci}>
                      <polyline
                        points={points}
                        fill="none"
                        stroke={CURVE_COLORS[ci % CURVE_COLORS.length]}
                        strokeWidth={1.5}
                        opacity={0.8}
                      />
                      {yields.map((y: number, ti: number) => {
                        const x = 40 + (ti * 540) / (tenors.length - 1);
                        const py = 20 + ((maxYield - y) / yieldRange) * 180;
                        return (
                          <circle
                            key={ti}
                            cx={x}
                            cy={py}
                            r={1.5}
                            fill={CURVE_COLORS[ci % CURVE_COLORS.length]}
                            opacity={0.9}
                          />
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Curve Legend */}
            <div className="flex flex-wrap gap-3 px-1 mb-3">
              {curves.map((curve: any, ci: number) => (
                <div key={ci} className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5" style={{ backgroundColor: CURVE_COLORS[ci % CURVE_COLORS.length] }} />
                  <span className="text-[7px] text-neutral-400">{curve.name}</span>
                  <span className="text-[7px] font-bold" style={{ color: ratingColor(curve.rating ?? '') }}>
                    {curve.rating}
                  </span>
                </div>
              ))}
            </div>

            {/* Yield Data Table */}
            <table className="w-full">
              <thead className="text-neutral-500 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Issuer</th>
                  <th className="px-2 py-1.5 text-left font-bold">Rtg</th>
                  {tenors.map((t: string) => (
                    <th key={t} className="px-2 py-1.5 text-right font-bold">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {curves.map((curve: any, ci: number) => (
                  <tr key={ci} className="border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors">
                    <td className="px-2 py-1.5 font-bold text-white/90">{curve.name}</td>
                    <td className="px-2 py-1.5">
                      <span className="font-bold" style={{ color: ratingColor(curve.rating ?? '') }}>
                        {curve.rating}
                      </span>
                    </td>
                    {(curve.yields ?? []).map((y: number, ti: number) => (
                      <td
                        key={ti}
                        className="px-2 py-1.5 text-right tabular-nums"
                        style={{ color: CURVE_COLORS[ci % CURVE_COLORS.length] }}
                      >
                        {y.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
