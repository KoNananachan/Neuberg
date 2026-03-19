import { useState } from 'react';
import { useGreenBond } from '../../api/hooks/use-green-bond';

const ACCENT = '#4ade80'; // green-400
const ACCENT_DIM = 'rgba(74,222,128,0.02)';

const UOP_COLORS: Record<string, string> = {
  'Renewable Energy': '#4ade80',
  'Energy Efficiency': '#2dd4bf',
  'Clean Transport': '#60a5fa',
  'Green Buildings': '#fbbf24',
  'Water Management': '#22d3ee',
  'Waste Management': '#fb923c',
};

function uopColor(category: string): string {
  for (const [key, color] of Object.entries(UOP_COLORS)) {
    if (category.toLowerCase().includes(key.toLowerCase().split(' ')[0].toLowerCase())) return color;
  }
  return '#6b7280';
}

function typeBadgeStyle(type: string): { bg: string; text: string } {
  switch (type.toLowerCase()) {
    case 'sovereign': return { bg: 'rgba(96,165,250,0.12)', text: '#60a5fa' };
    case 'corporate': return { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af' };
    case 'supranational': return { bg: 'rgba(192,132,252,0.12)', text: '#c084fc' };
    default: return { bg: 'rgba(107,114,128,0.12)', text: '#6b7280' };
  }
}

type Tab = 'issuance' | 'issuers' | 'sectors' | 'proceeds' | 'regions';

const FALLBACK = {
  summary: {
    totalOutstanding: '2.84T',
    ytdIssuance: '412B',
    greenium: '-4.2bps',
    avgYield: '3.82%',
    avgSpread: '+87bps',
    sdgAlignment: '94.2%',
  },
  indices: [
    { name: 'Bloomberg MSCI Green Bond', ticker: 'GBIOL', level: 142.38, return1m: 0.82, returnYtd: 2.14 },
    { name: 'ICE BofA Green Bond', ticker: 'GREN', level: 108.94, return1m: 0.65, returnYtd: 1.87 },
    { name: 'S&P Green Bond Index', ticker: 'SPGRN', level: 96.52, return1m: 0.71, returnYtd: 1.93 },
  ],
  recentIssuance: [
    { issuer: 'Republic of Germany', country: 'DE', size: 6.5, currency: 'EUR', coupon: 2.30, tenor: '10Y', spread: 42, rating: 'AAA', useOfProceeds: 'Renewable Energy', verifier: 'ISS ESG', framework: 'ICMA GBP' },
    { issuer: 'EDF', country: 'FR', size: 3.0, currency: 'EUR', coupon: 3.15, tenor: '7Y', spread: 68, rating: 'A-', useOfProceeds: 'Clean Transport', verifier: 'V.E', framework: 'ICMA GBP' },
    { issuer: 'IBRD World Bank', country: 'INT', size: 5.0, currency: 'USD', coupon: 4.10, tenor: '5Y', spread: 12, rating: 'AAA', useOfProceeds: 'Energy Efficiency', verifier: 'CICERO', framework: 'WB Green' },
    { issuer: 'Apple Inc', country: 'US', size: 2.5, currency: 'USD', coupon: 4.45, tenor: '10Y', spread: 55, rating: 'AA+', useOfProceeds: 'Renewable Energy', verifier: 'S&P', framework: 'ICMA GBP' },
    { issuer: 'Republic of France', country: 'FR', size: 8.0, currency: 'EUR', coupon: 2.75, tenor: '30Y', spread: 38, rating: 'AA-', useOfProceeds: 'Green Buildings', verifier: 'V.E', framework: 'OAT Verte' },
    { issuer: 'Iberdrola', country: 'ES', size: 1.5, currency: 'EUR', coupon: 3.45, tenor: '8Y', spread: 78, rating: 'BBB+', useOfProceeds: 'Renewable Energy', verifier: 'ISS ESG', framework: 'ICMA GBP' },
    { issuer: 'KfW', country: 'DE', size: 4.0, currency: 'EUR', coupon: 2.50, tenor: '5Y', spread: 8, rating: 'AAA', useOfProceeds: 'Energy Efficiency', verifier: 'CICERO', framework: 'KfW Green' },
    { issuer: 'Toyota Motor', country: 'JP', size: 1.8, currency: 'JPY', coupon: 0.85, tenor: '5Y', spread: 22, rating: 'A+', useOfProceeds: 'Clean Transport', verifier: 'JCR', framework: 'ICMA GBP' },
    { issuer: 'ING Group', country: 'NL', size: 2.0, currency: 'EUR', coupon: 3.20, tenor: '6Y', spread: 72, rating: 'A+', useOfProceeds: 'Renewable Energy', verifier: 'ISS ESG', framework: 'ICMA GBP' },
    { issuer: 'Asian Dev Bank', country: 'INT', size: 3.5, currency: 'USD', coupon: 4.05, tenor: '7Y', spread: 15, rating: 'AAA', useOfProceeds: 'Water Management', verifier: 'CICERO', framework: 'ADB Green' },
    { issuer: 'Enel SpA', country: 'IT', size: 1.2, currency: 'EUR', coupon: 3.60, tenor: '10Y', spread: 92, rating: 'BBB+', useOfProceeds: 'Renewable Energy', verifier: 'V.E', framework: 'ICMA GBP' },
    { issuer: 'Republic of Chile', country: 'CL', size: 2.0, currency: 'USD', coupon: 4.80, tenor: '15Y', spread: 115, rating: 'A', useOfProceeds: 'Clean Transport', verifier: 'ISS ESG', framework: 'Chile Green' },
  ],
  topIssuers: [
    { issuer: 'Republic of France', country: 'FR', type: 'Sovereign', outstanding: 82.5, bondCount: 12, avgCoupon: 2.45, avgRating: 'AA-' },
    { issuer: 'Republic of Germany', country: 'DE', type: 'Sovereign', outstanding: 68.2, bondCount: 8, avgCoupon: 2.10, avgRating: 'AAA' },
    { issuer: 'IBRD World Bank', country: 'INT', type: 'Supranational', outstanding: 55.8, bondCount: 42, avgCoupon: 3.15, avgRating: 'AAA' },
    { issuer: 'EIB', country: 'INT', type: 'Supranational', outstanding: 48.2, bondCount: 35, avgCoupon: 2.85, avgRating: 'AAA' },
    { issuer: 'KfW', country: 'DE', type: 'Supranational', outstanding: 42.0, bondCount: 28, avgCoupon: 2.30, avgRating: 'AAA' },
    { issuer: 'Republic of Netherlands', country: 'NL', type: 'Sovereign', outstanding: 38.5, bondCount: 5, avgCoupon: 1.95, avgRating: 'AAA' },
    { issuer: 'Apple Inc', country: 'US', type: 'Corporate', outstanding: 28.4, bondCount: 8, avgCoupon: 3.85, avgRating: 'AA+' },
    { issuer: 'Iberdrola', country: 'ES', type: 'Corporate', outstanding: 24.8, bondCount: 18, avgCoupon: 3.20, avgRating: 'BBB+' },
    { issuer: 'Enel SpA', country: 'IT', type: 'Corporate', outstanding: 22.1, bondCount: 15, avgCoupon: 3.40, avgRating: 'BBB+' },
    { issuer: 'Asian Dev Bank', country: 'INT', type: 'Supranational', outstanding: 21.5, bondCount: 22, avgCoupon: 3.05, avgRating: 'AAA' },
    { issuer: 'ING Group', country: 'NL', type: 'Corporate', outstanding: 18.2, bondCount: 12, avgCoupon: 3.10, avgRating: 'A+' },
    { issuer: 'Republic of Belgium', country: 'BE', type: 'Sovereign', outstanding: 16.8, bondCount: 4, avgCoupon: 2.25, avgRating: 'AA-' },
    { issuer: 'Engie SA', country: 'FR', type: 'Corporate', outstanding: 15.4, bondCount: 14, avgCoupon: 3.30, avgRating: 'BBB+' },
    { issuer: 'Toyota Motor', country: 'JP', type: 'Corporate', outstanding: 14.2, bondCount: 10, avgCoupon: 1.15, avgRating: 'A+' },
    { issuer: 'AfDB', country: 'INT', type: 'Supranational', outstanding: 12.8, bondCount: 18, avgCoupon: 3.50, avgRating: 'AAA' },
  ],
  sectorAllocation: [
    { sector: 'Sovereign', weight: 28.5, totalAmount: 809, avgSpread: 35, bondCount: 142 },
    { sector: 'Utilities', weight: 22.1, totalAmount: 628, avgSpread: 82, bondCount: 385 },
    { sector: 'Supranational', weight: 18.4, totalAmount: 522, avgSpread: 12, bondCount: 210 },
    { sector: 'Financial', weight: 14.2, totalAmount: 403, avgSpread: 68, bondCount: 298 },
    { sector: 'Industrial', weight: 8.3, totalAmount: 236, avgSpread: 95, bondCount: 165 },
    { sector: 'Real Estate', weight: 4.8, totalAmount: 136, avgSpread: 105, bondCount: 92 },
    { sector: 'Technology', weight: 2.4, totalAmount: 68, avgSpread: 58, bondCount: 38 },
    { sector: 'Other', weight: 1.3, totalAmount: 37, avgSpread: 88, bondCount: 45 },
  ],
  useOfProceeds: [
    { category: 'Renewable Energy', allocation: 38.2, totalAmount: 1085 },
    { category: 'Energy Efficiency', allocation: 22.5, totalAmount: 639 },
    { category: 'Clean Transport', allocation: 16.8, totalAmount: 477 },
    { category: 'Green Buildings', allocation: 12.1, totalAmount: 344 },
    { category: 'Water Management', allocation: 6.2, totalAmount: 176 },
    { category: 'Waste Management', allocation: 4.2, totalAmount: 119 },
  ],
  regionBreakdown: [
    { region: 'Europe', issuance: 198, outstanding: 1420, weight: 50.0 },
    { region: 'Asia-Pacific', issuance: 95, outstanding: 625, weight: 22.0 },
    { region: 'North America', issuance: 68, outstanding: 445, weight: 15.7 },
    { region: 'Supranational', issuance: 32, outstanding: 218, weight: 7.7 },
    { region: 'Latin America', issuance: 12, outstanding: 82, weight: 2.9 },
    { region: 'Middle East & Africa', issuance: 7, outstanding: 50, weight: 1.7 },
  ],
};

export function GreenBondPanel() {
  const { data: rawData, isLoading, error } = useGreenBond();
  const [tab, setTab] = useState<Tab>('issuance');

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-green-400/40 uppercase tracking-widest animate-pulse">
          Loading green bond data...
        </div>
      </div>
    );
  }

  if (error && !rawData) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          Failed to load green bond data
        </div>
      </div>
    );
  }

  const d = (rawData as Record<string, any>) ?? FALLBACK;
  const summary = d.summary ?? FALLBACK.summary;
  const indices = d.indices ?? FALLBACK.indices;
  const recentIssuance = d.recentIssuance ?? FALLBACK.recentIssuance;
  const topIssuers = d.topIssuers ?? FALLBACK.topIssuers;
  const sectorAllocation = d.sectorAllocation ?? FALLBACK.sectorAllocation;
  const useOfProceeds = d.useOfProceeds ?? FALLBACK.useOfProceeds;
  const regionBreakdown = d.regionBreakdown ?? FALLBACK.regionBreakdown;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'issuance', label: 'ISSUANCE' },
    { key: 'issuers', label: 'ISSUERS' },
    { key: 'sectors', label: 'SECTORS' },
    { key: 'proceeds', label: 'PROCEEDS' },
    { key: 'regions', label: 'REGIONS' },
  ];

  const maxSectorWeight = Math.max(...sectorAllocation.map((s: any) => s.weight));
  const maxRegionWeight = Math.max(...regionBreakdown.map((r: any) => r.weight));

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden font-mono text-[9px]">
      {/* Summary Bar */}
      <div className="grid grid-cols-6 border-b border-border/20 shrink-0">
        {[
          { label: 'TOTAL OUTSTANDING', value: `$${summary.totalOutstanding}` },
          { label: 'YTD ISSUANCE', value: `$${summary.ytdIssuance}` },
          { label: 'GREENIUM', value: summary.greenium },
          { label: 'AVG YIELD', value: summary.avgYield },
          { label: 'AVG SPREAD', value: summary.avgSpread },
          { label: 'SDG ALIGNMENT', value: summary.sdgAlignment },
        ].map((stat) => (
          <div key={stat.label} className="px-2 py-1.5 border-r border-border/20 last:border-r-0">
            <div className="text-[7px] uppercase tracking-wider text-neutral-500 font-bold">{stat.label}</div>
            <div className="text-[10px] font-black text-green-400 tabular-nums">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Green Bond Indices */}
      <div className="grid grid-cols-3 border-b border-border/20 shrink-0">
        {indices.map((idx: any) => (
          <div key={idx.ticker} className="px-2 py-1.5 border-r border-border/20 last:border-r-0">
            <div className="flex items-center justify-between">
              <span className="text-[7px] uppercase tracking-wider text-neutral-500 font-bold">{idx.name}</span>
              <span className="text-[7px] text-neutral-600">{idx.ticker}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] font-black text-white tabular-nums">{idx.level}</span>
              <span className={`text-[8px] font-bold tabular-nums ${idx.return1m >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                1M {idx.return1m >= 0 ? '+' : ''}{idx.return1m}%
              </span>
              <span className={`text-[8px] font-bold tabular-nums ${idx.returnYtd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                YTD {idx.returnYtd >= 0 ? '+' : ''}{idx.returnYtd}%
              </span>
            </div>
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
                <th className="px-2 py-1.5 text-left font-bold">Tenor</th>
                <th className="px-2 py-1.5 text-right font-bold">Sprd</th>
                <th className="px-2 py-1.5 text-left font-bold">Rtg</th>
                <th className="px-2 py-1.5 text-left font-bold">Use of Proceeds</th>
                <th className="px-2 py-1.5 text-left font-bold">Verifier</th>
                <th className="px-2 py-1.5 text-left font-bold">Framework</th>
              </tr>
            </thead>
            <tbody>
              {recentIssuance.map((bond: any, i: number) => (
                <tr key={i} className="border-b border-border/5 hover:bg-green-400/[0.02] transition-colors">
                  <td className="px-2 py-1.5 font-bold text-white/90 truncate max-w-[120px]">{bond.issuer}</td>
                  <td className="px-2 py-1.5 text-neutral-400">{bond.country}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold tabular-nums">{bond.size.toFixed(1)}B</td>
                  <td className="px-2 py-1.5 text-neutral-500">{bond.currency}</td>
                  <td className="px-2 py-1.5 text-right text-white/70 tabular-nums">{bond.coupon.toFixed(2)}%</td>
                  <td className="px-2 py-1.5 text-neutral-400">{bond.tenor}</td>
                  <td className="px-2 py-1.5 text-right text-white/60 tabular-nums">+{bond.spread}</td>
                  <td className="px-2 py-1.5 text-white/70 font-bold">{bond.rating}</td>
                  <td className="px-2 py-1.5">
                    <span
                      className="text-[8px] font-bold px-1.5 py-0.5"
                      style={{
                        color: uopColor(bond.useOfProceeds),
                        background: `${uopColor(bond.useOfProceeds)}15`,
                      }}
                    >
                      {bond.useOfProceeds}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-neutral-500">{bond.verifier}</td>
                  <td className="px-2 py-1.5 text-neutral-600">{bond.framework}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Top Issuers */}
        {tab === 'issuers' && (
          <table className="w-full">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Issuer</th>
                <th className="px-2 py-1.5 text-left font-bold">Ctry</th>
                <th className="px-2 py-1.5 text-left font-bold">Type</th>
                <th className="px-2 py-1.5 text-right font-bold">Outstanding ($B)</th>
                <th className="px-2 py-1.5 text-right font-bold">Bonds</th>
                <th className="px-2 py-1.5 text-right font-bold">Avg Cpn</th>
                <th className="px-2 py-1.5 text-left font-bold">Avg Rtg</th>
              </tr>
            </thead>
            <tbody>
              {topIssuers.map((issuer: any, i: number) => {
                const badge = typeBadgeStyle(issuer.type);
                return (
                  <tr key={i} className="border-b border-border/5 hover:bg-green-400/[0.02] transition-colors">
                    <td className="px-2 py-1.5 font-bold text-white/90 truncate max-w-[140px]">{issuer.issuer}</td>
                    <td className="px-2 py-1.5 text-neutral-400">{issuer.country}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className="text-[8px] font-bold px-1.5 py-0.5"
                        style={{ color: badge.text, background: badge.bg }}
                      >
                        {issuer.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums" style={{ color: ACCENT }}>
                      {issuer.outstanding.toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/50 tabular-nums">{issuer.bondCount}</td>
                    <td className="px-2 py-1.5 text-right text-white/60 tabular-nums">{issuer.avgCoupon.toFixed(2)}%</td>
                    <td className="px-2 py-1.5 text-white/70 font-bold">{issuer.avgRating}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Sector Allocation */}
        {tab === 'sectors' && (
          <div className="px-2 py-2">
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <div className="w-1 h-1 bg-green-400" />
              <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
                Sector Allocation
              </span>
            </div>

            <div className="grid grid-cols-[1.2fr_0.6fr_2fr_0.7fr_0.6fr_0.5fr] gap-1 px-1 mb-1">
              {['SECTOR', 'WEIGHT', '', 'AMOUNT ($B)', 'AVG SPRD', 'BONDS'].map((h) => (
                <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">{h}</span>
              ))}
            </div>

            {sectorAllocation.map((s: any) => (
              <div
                key={s.sector}
                className="grid grid-cols-[1.2fr_0.6fr_2fr_0.7fr_0.6fr_0.5fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors items-center"
              >
                <span className="text-[8px] font-bold text-neutral-300 uppercase truncate">{s.sector}</span>
                <span className="text-[8px] font-bold tabular-nums" style={{ color: ACCENT }}>{s.weight.toFixed(1)}%</span>
                <div className="h-1.5 bg-neutral-900 relative">
                  <div
                    className="absolute top-0 left-0 h-full"
                    style={{ width: `${(s.weight / maxSectorWeight) * 100}%`, backgroundColor: ACCENT, opacity: 0.5 }}
                  />
                </div>
                <span className="text-[8px] text-white/70 tabular-nums">${s.totalAmount}</span>
                <span className="text-[8px] text-white/50 tabular-nums">+{s.avgSpread}</span>
                <span className="text-[8px] text-neutral-500 tabular-nums">{s.bondCount}</span>
              </div>
            ))}
          </div>
        )}

        {/* Use of Proceeds */}
        {tab === 'proceeds' && (
          <div className="px-2 py-2">
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <div className="w-1 h-1 bg-green-400" />
              <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
                Use of Proceeds Distribution
              </span>
            </div>

            {/* Distribution Bar */}
            <div className="flex h-3 mx-1 mb-3 overflow-hidden">
              {useOfProceeds.map((p: any) => (
                <div
                  key={p.category}
                  style={{
                    width: `${p.allocation}%`,
                    backgroundColor: uopColor(p.category),
                    opacity: 0.7,
                  }}
                  title={`${p.category}: ${p.allocation}%`}
                />
              ))}
            </div>

            <div className="grid grid-cols-[1.5fr_0.6fr_0.8fr_2fr] gap-1 px-1 mb-1">
              {['CATEGORY', 'ALLOC %', 'AMOUNT ($B)', ''].map((h) => (
                <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">{h}</span>
              ))}
            </div>

            {useOfProceeds.map((p: any) => {
              const color = uopColor(p.category);
              return (
                <div
                  key={p.category}
                  className="grid grid-cols-[1.5fr_0.6fr_0.8fr_2fr] gap-1 px-1 py-1 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors items-center"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[8px] font-bold text-neutral-300">{p.category}</span>
                  </div>
                  <span className="text-[8px] font-bold tabular-nums" style={{ color }}>{p.allocation.toFixed(1)}%</span>
                  <span className="text-[8px] text-white/70 tabular-nums">${p.totalAmount}</span>
                  <div className="h-1.5 bg-neutral-900 relative">
                    <div
                      className="absolute top-0 left-0 h-full"
                      style={{ width: `${p.allocation}%`, backgroundColor: color, opacity: 0.5 }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 px-1">
              {Object.entries(UOP_COLORS).map(([label, color]) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5" style={{ backgroundColor: color }} />
                  <span className="text-[7px] text-neutral-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Region Breakdown */}
        {tab === 'regions' && (
          <div className="px-2 py-2">
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <div className="w-1 h-1 bg-green-400" />
              <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
                Regional Breakdown
              </span>
            </div>

            <div className="grid grid-cols-[1.2fr_0.7fr_0.8fr_0.5fr_2fr] gap-1 px-1 mb-1">
              {['REGION', 'YTD ISS ($B)', 'OUTST ($B)', 'WEIGHT', ''].map((h) => (
                <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">{h}</span>
              ))}
            </div>

            {regionBreakdown.map((r: any) => (
              <div
                key={r.region}
                className="grid grid-cols-[1.2fr_0.7fr_0.8fr_0.5fr_2fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors items-center"
              >
                <span className="text-[8px] font-bold text-neutral-300 uppercase truncate">{r.region}</span>
                <span className="text-[8px] text-white/70 tabular-nums">${r.issuance}</span>
                <span className="text-[8px] font-bold tabular-nums" style={{ color: ACCENT }}>${r.outstanding}</span>
                <span className="text-[8px] text-white/60 tabular-nums">{r.weight.toFixed(1)}%</span>
                <div className="h-1.5 bg-neutral-900 relative">
                  <div
                    className="absolute top-0 left-0 h-full"
                    style={{ width: `${(r.weight / maxRegionWeight) * 100}%`, backgroundColor: ACCENT, opacity: 0.5 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
