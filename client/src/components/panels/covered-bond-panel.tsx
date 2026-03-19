import { useState } from 'react';
import { useCoveredBond } from '../../api/hooks/use-covered-bond';

const ACCENT = '#60a5fa'; // blue-400
const ACCENT_DIM = 'rgba(96,165,250,0.02)';

// ── Formatting helpers ──

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(0) + 'bps';
}

function fmtChgBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1);
}

function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals) + '%';
}

function fmtReturn(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

// ── Color helpers ──

function spreadColor(spread: number): string {
  if (spread <= 20) return '#4ade80';
  if (spread <= 40) return '#a3e635';
  if (spread <= 60) return '#facc15';
  if (spread <= 80) return '#fb923c';
  return '#f87171';
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function returnColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function ratingColor(rating: string): string {
  const r = rating.toUpperCase();
  if (r.startsWith('AAA')) return '#4ade80';
  if (r.startsWith('AA')) return '#a3e635';
  if (r.startsWith('A')) return '#facc15';
  if (r.startsWith('BBB')) return '#fb923c';
  return '#f87171';
}

function coverTypeBadge(type: string): { bg: string; text: string } {
  switch (type.toLowerCase()) {
    case 'mortgage': return { bg: 'rgba(96,165,250,0.12)', text: '#60a5fa' };
    case 'public sector': return { bg: 'rgba(192,132,252,0.12)', text: '#c084fc' };
    case 'mixed': return { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' };
    case 'shipping': return { bg: 'rgba(34,211,238,0.12)', text: '#22d3ee' };
    default: return { bg: 'rgba(107,114,128,0.12)', text: '#6b7280' };
  }
}

function benchmarkBadge(benchmark: string | undefined): { bg: string; text: string } | null {
  if (!benchmark) return null;
  const b = benchmark.toUpperCase();
  if (b.includes('BENCHMARK') || b.includes('BMK')) return { bg: 'rgba(96,165,250,0.15)', text: '#60a5fa' };
  if (b.includes('TAP') || b.includes('REOPEN')) return { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af' };
  return { bg: 'rgba(74,222,128,0.12)', text: '#4ade80' };
}

// ── Tabs ──

type Tab = 'country' | 'spreads' | 'issuers' | 'issuance';

// ── Fallback Data ──

const FALLBACK = {
  summary: {
    totalMarket: '2.98T',
    avgSpreadVsSwap: '+18bps',
    spreadTrend: 'Tightening',
    newSupplyPace: '42B/mo',
    qualityIndicator: 'Strong',
  },
  indices: [
    { name: 'iBoxx EUR Covered', ticker: 'IBXXCV', level: 108.42, return1m: 0.38, returnYtd: 1.52 },
    { name: 'iBoxx GBP Covered', ticker: 'IBXGCV', level: 104.18, return1m: 0.22, returnYtd: 0.94 },
    { name: 'Bloomberg Covered Bond', ticker: 'BCVRD', level: 112.65, return1m: 0.45, returnYtd: 1.78 },
  ],
  coverPoolMetrics: {
    avgLTV: 52.4,
    avgSeasoning: '6.2Y',
    geographicDiversification: 78.5,
    delinquencyRate: 0.82,
    overcollateralization: 34.8,
  },
  byCountry: [
    { country: 'Germany', outstanding: 412.5, avgSpread: 12, avgCoupon: 2.85, wal: 4.2, coverRatio: 142.5, delinquency: 0.4 },
    { country: 'Denmark', outstanding: 385.2, avgSpread: 15, avgCoupon: 3.10, wal: 5.8, coverRatio: 138.2, delinquency: 0.3 },
    { country: 'France', outstanding: 342.8, avgSpread: 18, avgCoupon: 2.95, wal: 4.5, coverRatio: 135.8, delinquency: 0.6 },
    { country: 'Spain', outstanding: 248.4, avgSpread: 32, avgCoupon: 3.25, wal: 5.2, coverRatio: 128.4, delinquency: 1.2 },
    { country: 'Sweden', outstanding: 218.6, avgSpread: 14, avgCoupon: 2.70, wal: 3.8, coverRatio: 140.1, delinquency: 0.5 },
    { country: 'Norway', outstanding: 185.3, avgSpread: 16, avgCoupon: 3.05, wal: 4.1, coverRatio: 136.5, delinquency: 0.4 },
    { country: 'Netherlands', outstanding: 162.1, avgSpread: 20, avgCoupon: 2.90, wal: 4.8, coverRatio: 132.8, delinquency: 0.7 },
    { country: 'Italy', outstanding: 148.7, avgSpread: 42, avgCoupon: 3.45, wal: 5.5, coverRatio: 125.2, delinquency: 1.5 },
    { country: 'Canada', outstanding: 132.4, avgSpread: 22, avgCoupon: 3.60, wal: 4.0, coverRatio: 134.6, delinquency: 0.6 },
    { country: 'Australia', outstanding: 98.5, avgSpread: 28, avgCoupon: 4.15, wal: 3.5, coverRatio: 130.2, delinquency: 0.8 },
  ],
  spreadAnalysis: [
    { tenor: '2Y', spreadVsSwap: 8, change1w: -1.2, change1m: -3.5, low52w: 5, high52w: 22 },
    { tenor: '3Y', spreadVsSwap: 12, change1w: -0.8, change1m: -2.8, low52w: 8, high52w: 28 },
    { tenor: '5Y', spreadVsSwap: 18, change1w: -1.5, change1m: -4.2, low52w: 12, high52w: 35 },
    { tenor: '7Y', spreadVsSwap: 24, change1w: -0.5, change1m: -3.0, low52w: 16, high52w: 42 },
    { tenor: '10Y', spreadVsSwap: 32, change1w: 0.3, change1m: -1.8, low52w: 22, high52w: 55 },
  ],
  topIssuers: [
    { issuer: 'Danske Bank', country: 'DK', outstanding: 82.4, bondCount: 145, avgSpread: 14, rating: 'AAA', coverPoolType: 'Mortgage' },
    { issuer: 'Nykredit', country: 'DK', outstanding: 78.2, bondCount: 132, avgSpread: 15, rating: 'AAA', coverPoolType: 'Mortgage' },
    { issuer: 'Deutsche Pfandbriefbank', country: 'DE', outstanding: 62.5, bondCount: 48, avgSpread: 18, rating: 'AA+', coverPoolType: 'Public Sector' },
    { issuer: 'Credit Agricole HB', country: 'FR', outstanding: 55.8, bondCount: 42, avgSpread: 16, rating: 'AAA', coverPoolType: 'Mortgage' },
    { issuer: 'BNP Paribas Home Loan', country: 'FR', outstanding: 52.1, bondCount: 38, avgSpread: 17, rating: 'AAA', coverPoolType: 'Mortgage' },
    { issuer: 'Nordea Hypotek', country: 'SE', outstanding: 48.6, bondCount: 35, avgSpread: 13, rating: 'AAA', coverPoolType: 'Mortgage' },
    { issuer: 'Commerzbank', country: 'DE', outstanding: 45.2, bondCount: 32, avgSpread: 20, rating: 'AA-', coverPoolType: 'Mixed' },
    { issuer: 'Santander', country: 'ES', outstanding: 42.8, bondCount: 28, avgSpread: 30, rating: 'AA', coverPoolType: 'Mortgage' },
    { issuer: 'DNB Boligkreditt', country: 'NO', outstanding: 38.5, bondCount: 25, avgSpread: 15, rating: 'AAA', coverPoolType: 'Mortgage' },
    { issuer: 'National Australia Bank', country: 'AU', outstanding: 35.2, bondCount: 22, avgSpread: 26, rating: 'AA-', coverPoolType: 'Mortgage' },
    { issuer: 'ING Bank', country: 'NL', outstanding: 32.8, bondCount: 20, avgSpread: 19, rating: 'AAA', coverPoolType: 'Mortgage' },
    { issuer: 'Caixabank', country: 'ES', outstanding: 28.4, bondCount: 18, avgSpread: 34, rating: 'A+', coverPoolType: 'Mortgage' },
  ],
  recentIssuance: [
    { issuer: 'Deutsche Pfandbriefbank', country: 'DE', size: 1.5, currency: 'EUR', coupon: 2.75, maturity: '2029', spread: 12, rating: 'AA+', coverType: 'Public Sector', benchmark: 'Benchmark' },
    { issuer: 'Credit Agricole HB', country: 'FR', size: 2.0, currency: 'EUR', coupon: 3.00, maturity: '2031', spread: 16, rating: 'AAA', coverType: 'Mortgage', benchmark: 'Benchmark' },
    { issuer: 'Danske Bank', country: 'DK', size: 1.0, currency: 'EUR', coupon: 2.85, maturity: '2028', spread: 14, rating: 'AAA', coverType: 'Mortgage', benchmark: 'Tap' },
    { issuer: 'Nordea Hypotek', country: 'SE', size: 1.25, currency: 'SEK', coupon: 2.60, maturity: '2030', spread: 13, rating: 'AAA', coverType: 'Mortgage', benchmark: 'Benchmark' },
    { issuer: 'Santander', country: 'ES', size: 1.5, currency: 'EUR', coupon: 3.35, maturity: '2032', spread: 28, rating: 'AA', coverType: 'Mortgage', benchmark: 'Benchmark' },
    { issuer: 'Commerzbank', country: 'DE', size: 0.75, currency: 'EUR', coupon: 2.90, maturity: '2029', spread: 18, rating: 'AA-', coverType: 'Mixed', benchmark: 'Tap' },
    { issuer: 'BNP Paribas Home Loan', country: 'FR', size: 1.75, currency: 'EUR', coupon: 3.10, maturity: '2033', spread: 17, rating: 'AAA', coverType: 'Mortgage', benchmark: 'Benchmark' },
    { issuer: 'National Australia Bank', country: 'AU', size: 1.0, currency: 'EUR', coupon: 3.20, maturity: '2030', spread: 25, rating: 'AA-', coverType: 'Mortgage', benchmark: 'Benchmark' },
    { issuer: 'DNB Boligkreditt', country: 'NO', size: 1.5, currency: 'NOK', coupon: 3.40, maturity: '2031', spread: 15, rating: 'AAA', coverType: 'Mortgage', benchmark: 'Benchmark' },
    { issuer: 'ING Bank', country: 'NL', size: 1.25, currency: 'EUR', coupon: 2.95, maturity: '2029', spread: 19, rating: 'AAA', coverType: 'Mortgage', benchmark: 'Tap' },
  ],
};

export function CoveredBondPanel() {
  const { data: rawData, isLoading, error } = useCoveredBond();
  const [tab, setTab] = useState<Tab>('country');

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-blue-400/40 uppercase tracking-widest animate-pulse">
          Loading covered bond data...
        </div>
      </div>
    );
  }

  if (error && !rawData) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          Failed to load covered bond data
        </div>
      </div>
    );
  }

  const d = (rawData as Record<string, any>) ?? FALLBACK;
  const summary = d.summary ?? FALLBACK.summary;
  const indices = d.indices ?? FALLBACK.indices;
  const coverPoolMetrics = d.coverPoolMetrics ?? FALLBACK.coverPoolMetrics;
  const byCountry = d.byCountry ?? FALLBACK.byCountry;
  const spreadAnalysis = d.spreadAnalysis ?? FALLBACK.spreadAnalysis;
  const topIssuers = d.topIssuers ?? FALLBACK.topIssuers;
  const recentIssuance = d.recentIssuance ?? FALLBACK.recentIssuance;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'country', label: 'BY COUNTRY' },
    { key: 'spreads', label: 'SPREAD ANALYSIS' },
    { key: 'issuers', label: 'TOP ISSUERS' },
    { key: 'issuance', label: 'RECENT ISSUANCE' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden font-mono text-[9px]">
      {/* Summary Bar */}
      <div className="grid grid-cols-5 border-b border-border/20 shrink-0">
        {[
          { label: 'TOTAL MARKET', value: summary.totalMarket },
          { label: 'AVG SPREAD VS SWAP', value: summary.avgSpreadVsSwap },
          { label: 'SPREAD TREND', value: summary.spreadTrend },
          { label: 'NEW SUPPLY PACE', value: summary.newSupplyPace },
          { label: 'QUALITY', value: summary.qualityIndicator },
        ].map((stat) => (
          <div key={stat.label} className="px-2 py-1.5 border-r border-border/20 last:border-r-0">
            <div className="text-[7px] uppercase tracking-wider text-neutral-500 font-bold">{stat.label}</div>
            <div className="text-[10px] font-black tabular-nums" style={{ color: ACCENT }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Performance Indices */}
      <div className="grid grid-cols-3 border-b border-border/20 shrink-0">
        {indices.map((idx: any) => (
          <div key={idx.ticker} className="px-2 py-1.5 border-r border-border/20 last:border-r-0">
            <div className="flex items-center justify-between">
              <span className="text-[7px] uppercase tracking-wider text-neutral-500 font-bold">{idx.name}</span>
              <span className="text-[7px] text-neutral-600">{idx.ticker}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] font-black text-white tabular-nums">{idx.level}</span>
              <span className={`text-[8px] font-bold tabular-nums ${returnColor(idx.return1m)}`}>
                1M {fmtReturn(idx.return1m)}
              </span>
              <span className={`text-[8px] font-bold tabular-nums ${returnColor(idx.returnYtd)}`}>
                YTD {fmtReturn(idx.returnYtd)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Cover Pool Metrics */}
      <div className="grid grid-cols-5 border-b border-border/20 shrink-0">
        {[
          { label: 'AVG LTV', value: fmtPct(coverPoolMetrics.avgLTV) },
          { label: 'AVG SEASONING', value: coverPoolMetrics.avgSeasoning },
          { label: 'GEO DIVERSIFICATION', value: fmtPct(coverPoolMetrics.geographicDiversification) },
          { label: 'DELINQUENCY', value: fmtPct(coverPoolMetrics.delinquencyRate) },
          { label: 'OVERCOLLATERAL', value: fmtPct(coverPoolMetrics.overcollateralization) },
        ].map((m) => (
          <div key={m.label} className="px-2 py-1.5 border-r border-border/20 last:border-r-0">
            <div className="text-[7px] uppercase tracking-wider text-neutral-500 font-bold">{m.label}</div>
            <div className="text-[10px] font-black text-white/90 tabular-nums">{m.value}</div>
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

        {/* By Country */}
        {tab === 'country' && (
          <table className="w-full">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Country</th>
                <th className="px-2 py-1.5 text-right font-bold">Outstanding (B)</th>
                <th className="px-2 py-1.5 text-right font-bold">Avg Sprd</th>
                <th className="px-2 py-1.5 text-right font-bold">Avg Cpn</th>
                <th className="px-2 py-1.5 text-right font-bold">WAL</th>
                <th className="px-2 py-1.5 text-right font-bold">Cover %</th>
                <th className="px-2 py-1.5 text-right font-bold">Delinq %</th>
              </tr>
            </thead>
            <tbody>
              {byCountry.map((row: any, i: number) => (
                <tr key={i} className="border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors">
                  <td className="px-2 py-1.5 font-bold text-white/90">{row.country}</td>
                  <td className="px-2 py-1.5 text-right font-bold tabular-nums" style={{ color: ACCENT }}>
                    {fmt(row.outstanding, 1)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    <span style={{ color: spreadColor(row.avgSpread) }}>
                      +{row.avgSpread}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/70 tabular-nums">{fmt(row.avgCoupon)}%</td>
                  <td className="px-2 py-1.5 text-right text-white/60 tabular-nums">{fmt(row.wal, 1)}Y</td>
                  <td className="px-2 py-1.5 text-right text-white/70 tabular-nums">{fmt(row.coverRatio, 1)}%</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    <span style={{ color: row.delinquency > 1.0 ? '#fb923c' : row.delinquency > 0.5 ? '#facc15' : '#4ade80' }}>
                      {fmt(row.delinquency, 1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Spread Analysis */}
        {tab === 'spreads' && (
          <div className="px-2 py-2">
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <div className="w-1 h-1" style={{ backgroundColor: ACCENT }} />
              <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
                Spread vs Swap by Tenor
              </span>
            </div>

            <table className="w-full">
              <thead className="text-neutral-500 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Tenor</th>
                  <th className="px-2 py-1.5 text-right font-bold">Sprd vs Swap</th>
                  <th className="px-2 py-1.5 text-right font-bold">1W Chg</th>
                  <th className="px-2 py-1.5 text-right font-bold">1M Chg</th>
                  <th className="px-2 py-1.5 text-left font-bold pl-4">52W Range</th>
                </tr>
              </thead>
              <tbody>
                {spreadAnalysis.map((row: any, i: number) => {
                  const rangeWidth = row.high52w - row.low52w;
                  const currentPos = rangeWidth > 0
                    ? ((row.spreadVsSwap - row.low52w) / rangeWidth) * 100
                    : 50;
                  return (
                    <tr key={i} className="border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors">
                      <td className="px-2 py-2 font-bold text-white/90">{row.tenor}</td>
                      <td className="px-2 py-2 text-right font-bold tabular-nums" style={{ color: ACCENT }}>
                        {fmtBps(row.spreadVsSwap)}
                      </td>
                      <td className={`px-2 py-2 text-right font-bold tabular-nums ${changeColor(row.change1w)}`}>
                        {fmtChgBps(row.change1w)}
                      </td>
                      <td className={`px-2 py-2 text-right font-bold tabular-nums ${changeColor(row.change1m)}`}>
                        {fmtChgBps(row.change1m)}
                      </td>
                      <td className="px-2 py-2 pl-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[7px] text-neutral-600 tabular-nums w-6 text-right">{row.low52w}</span>
                          <div className="flex-1 h-1.5 bg-neutral-900 relative min-w-[80px]">
                            <div
                              className="absolute top-0 left-0 h-full bg-neutral-700"
                              style={{ width: '100%' }}
                            />
                            <div
                              className="absolute top-[-1px] w-[3px] h-[8px]"
                              style={{
                                left: `${Math.max(0, Math.min(100, currentPos))}%`,
                                backgroundColor: ACCENT,
                                transform: 'translateX(-50%)',
                              }}
                            />
                          </div>
                          <span className="text-[7px] text-neutral-600 tabular-nums w-6">{row.high52w}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Top Issuers */}
        {tab === 'issuers' && (
          <table className="w-full">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Issuer</th>
                <th className="px-2 py-1.5 text-left font-bold">Ctry</th>
                <th className="px-2 py-1.5 text-right font-bold">Outstanding (B)</th>
                <th className="px-2 py-1.5 text-right font-bold">Bonds</th>
                <th className="px-2 py-1.5 text-right font-bold">Avg Sprd</th>
                <th className="px-2 py-1.5 text-left font-bold">Rating</th>
                <th className="px-2 py-1.5 text-left font-bold">Cover Pool</th>
              </tr>
            </thead>
            <tbody>
              {topIssuers.map((row: any, i: number) => {
                const badge = coverTypeBadge(row.coverPoolType);
                return (
                  <tr key={i} className="border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors">
                    <td className="px-2 py-1.5 font-bold text-white/90 truncate max-w-[140px]">{row.issuer}</td>
                    <td className="px-2 py-1.5 text-neutral-400">{row.country}</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums" style={{ color: ACCENT }}>
                      {fmt(row.outstanding, 1)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/50 tabular-nums">{row.bondCount}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      <span style={{ color: spreadColor(row.avgSpread) }}>+{row.avgSpread}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="font-bold" style={{ color: ratingColor(row.rating) }}>{row.rating}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className="text-[8px] font-bold px-1.5 py-0.5"
                        style={{ color: badge.text, background: badge.bg }}
                      >
                        {row.coverPoolType.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Recent Issuance */}
        {tab === 'issuance' && (
          <table className="w-full">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Issuer</th>
                <th className="px-2 py-1.5 text-left font-bold">Ctry</th>
                <th className="px-2 py-1.5 text-right font-bold">Size</th>
                <th className="px-2 py-1.5 text-left font-bold">Ccy</th>
                <th className="px-2 py-1.5 text-right font-bold">Cpn</th>
                <th className="px-2 py-1.5 text-left font-bold">Mat</th>
                <th className="px-2 py-1.5 text-right font-bold">Sprd</th>
                <th className="px-2 py-1.5 text-left font-bold">Rtg</th>
                <th className="px-2 py-1.5 text-left font-bold">Cover Type</th>
                <th className="px-2 py-1.5 text-left font-bold">Bmk</th>
              </tr>
            </thead>
            <tbody>
              {recentIssuance.map((bond: any, i: number) => {
                const ctBadge = coverTypeBadge(bond.coverType);
                const bmkBadge = benchmarkBadge(bond.benchmark);
                return (
                  <tr key={i} className="border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors">
                    <td className="px-2 py-1.5 font-bold text-white/90 truncate max-w-[140px]">{bond.issuer}</td>
                    <td className="px-2 py-1.5 text-neutral-400">{bond.country}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold tabular-nums">{fmt(bond.size, 1)}B</td>
                    <td className="px-2 py-1.5 text-neutral-500">{bond.currency}</td>
                    <td className="px-2 py-1.5 text-right text-white/70 tabular-nums">{fmt(bond.coupon)}%</td>
                    <td className="px-2 py-1.5 text-neutral-400">{bond.maturity}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      <span style={{ color: spreadColor(bond.spread) }}>+{bond.spread}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="font-bold" style={{ color: ratingColor(bond.rating) }}>{bond.rating}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className="text-[8px] font-bold px-1.5 py-0.5"
                        style={{ color: ctBadge.text, background: ctBadge.bg }}
                      >
                        {bond.coverType.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      {bmkBadge && (
                        <span
                          className="text-[8px] font-bold px-1.5 py-0.5"
                          style={{ color: bmkBadge.text, background: bmkBadge.bg }}
                        >
                          {bond.benchmark.toUpperCase()}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
}
