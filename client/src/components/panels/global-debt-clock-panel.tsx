import { useState, useMemo } from 'react';
import { useGlobalDebtClock } from '../../api/hooks/use-global-debt-clock';
import { Banknote } from 'lucide-react';

// ── Formatting helpers ──

function fmtTrillions(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}Q`;
  return `$${n.toFixed(2)}T`;
}

function fmtBillions(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(2)}T`;
  return `$${n.toFixed(0)}B`;
}

function fmtPerCapita(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ── Color helpers ──

function debtGdpColor(v: number): string {
  if (v > 150) return 'text-red-400';
  if (v > 100) return 'text-orange-400';
  if (v > 60) return 'text-yellow-400';
  return 'text-green-400';
}

function ratingColor(rating: string): string {
  if (rating.startsWith('AAA')) return 'text-emerald-400';
  if (rating.startsWith('AA')) return 'text-green-400';
  if (rating.startsWith('A')) return 'text-yellow-400';
  if (rating.startsWith('BBB')) return 'text-orange-400';
  return 'text-red-400';
}

function ratingBg(rating: string): string {
  if (rating.startsWith('AAA')) return 'bg-emerald-400/10 border-emerald-400/30';
  if (rating.startsWith('AA')) return 'bg-green-400/10 border-green-400/30';
  if (rating.startsWith('A')) return 'bg-yellow-400/10 border-yellow-400/30';
  if (rating.startsWith('BBB')) return 'bg-orange-400/10 border-orange-400/30';
  return 'bg-red-400/10 border-red-400/30';
}

function deficitColor(v: number): string {
  if (v < 0) return 'text-red-400';
  return 'text-emerald-400';
}

function interestRevenueColor(v: number): string {
  if (v > 25) return 'text-red-400';
  if (v > 15) return 'text-orange-400';
  if (v > 10) return 'text-yellow-400';
  return 'text-green-400';
}

// ── Fallback data ──

const FALLBACK_DATA = {
  timestamp: '2026-03-19T00:00:00Z',
  globalAggregate: {
    totalGlobalDebt: 315.0,
    governmentDebt: 97.2,
    corporateDebt: 96.8,
    householdDebt: 58.5,
    financialDebt: 62.5,
    debtToGdp: 333.0,
    growthRate: 3.8,
  },
  sovereignDebt: [
    { country: 'United States', flag: '\u{1F1FA}\u{1F1F8}', totalDebt: 35.8, debtToGdp: 123.0, deficit: -6.3, interestPayments: 1120, interestToRevenue: 22.5, rating: 'AA+', perCapita: 106800, domesticPct: 72, foreignPct: 28, shortTermPct: 30, longTermPct: 70, fixedPct: 88, floatingPct: 12, projections: [123.0, 126.5, 130.2, 134.0, 138.1] },
    { country: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', totalDebt: 11.2, debtToGdp: 255.0, deficit: -4.1, interestPayments: 195, interestToRevenue: 14.5, rating: 'A+', perCapita: 91200, domesticPct: 90, foreignPct: 10, shortTermPct: 15, longTermPct: 85, fixedPct: 95, floatingPct: 5, projections: [255.0, 258.2, 261.0, 263.5, 265.0] },
    { country: 'China', flag: '\u{1F1E8}\u{1F1F3}', totalDebt: 15.6, debtToGdp: 84.0, deficit: -7.1, interestPayments: 580, interestToRevenue: 17.8, rating: 'A+', perCapita: 11000, domesticPct: 92, foreignPct: 8, shortTermPct: 25, longTermPct: 75, fixedPct: 82, floatingPct: 18, projections: [84.0, 88.5, 93.0, 97.5, 102.0] },
    { country: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}', totalDebt: 3.52, debtToGdp: 101.0, deficit: -4.8, interestPayments: 125, interestToRevenue: 10.8, rating: 'AA', perCapita: 52200, domesticPct: 68, foreignPct: 32, shortTermPct: 20, longTermPct: 80, fixedPct: 75, floatingPct: 25, projections: [101.0, 104.0, 107.5, 110.0, 112.5] },
    { country: 'France', flag: '\u{1F1EB}\u{1F1F7}', totalDebt: 3.47, debtToGdp: 112.0, deficit: -5.5, interestPayments: 62, interestToRevenue: 7.2, rating: 'AA-', perCapita: 51500, domesticPct: 45, foreignPct: 55, shortTermPct: 18, longTermPct: 82, fixedPct: 90, floatingPct: 10, projections: [112.0, 115.0, 118.5, 121.0, 123.5] },
    { country: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', totalDebt: 3.28, debtToGdp: 142.0, deficit: -4.3, interestPayments: 88, interestToRevenue: 9.5, rating: 'BBB', perCapita: 55700, domesticPct: 65, foreignPct: 35, shortTermPct: 22, longTermPct: 78, fixedPct: 85, floatingPct: 15, projections: [142.0, 144.5, 147.0, 149.0, 151.0] },
    { country: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', totalDebt: 2.89, debtToGdp: 64.0, deficit: -1.5, interestPayments: 38, interestToRevenue: 4.2, rating: 'AAA', perCapita: 34600, domesticPct: 55, foreignPct: 45, shortTermPct: 12, longTermPct: 88, fixedPct: 92, floatingPct: 8, projections: [64.0, 65.5, 67.0, 68.0, 69.0] },
    { country: 'India', flag: '\u{1F1EE}\u{1F1F3}', totalDebt: 3.24, debtToGdp: 83.0, deficit: -6.4, interestPayments: 195, interestToRevenue: 28.5, rating: 'BBB-', perCapita: 2250, domesticPct: 95, foreignPct: 5, shortTermPct: 35, longTermPct: 65, fixedPct: 70, floatingPct: 30, projections: [83.0, 85.0, 87.5, 89.5, 91.0] },
    { country: 'Canada', flag: '\u{1F1E8}\u{1F1E6}', totalDebt: 2.24, debtToGdp: 107.0, deficit: -1.4, interestPayments: 48, interestToRevenue: 10.5, rating: 'AAA', perCapita: 57100, domesticPct: 70, foreignPct: 30, shortTermPct: 28, longTermPct: 72, fixedPct: 80, floatingPct: 20, projections: [107.0, 108.5, 110.0, 111.0, 112.0] },
    { country: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', totalDebt: 1.67, debtToGdp: 76.0, deficit: -8.0, interestPayments: 210, interestToRevenue: 31.2, rating: 'BB', perCapita: 7800, domesticPct: 88, foreignPct: 12, shortTermPct: 32, longTermPct: 68, fixedPct: 55, floatingPct: 45, projections: [76.0, 79.5, 83.0, 87.0, 91.0] },
    { country: 'South Korea', flag: '\u{1F1F0}\u{1F1F7}', totalDebt: 0.93, debtToGdp: 54.0, deficit: -2.6, interestPayments: 21, interestToRevenue: 5.8, rating: 'AA', perCapita: 18100, domesticPct: 82, foreignPct: 18, shortTermPct: 20, longTermPct: 80, fixedPct: 88, floatingPct: 12, projections: [54.0, 56.0, 58.0, 60.0, 62.0] },
    { country: 'Australia', flag: '\u{1F1E6}\u{1F1FA}', totalDebt: 0.94, debtToGdp: 52.0, deficit: -1.8, interestPayments: 22, interestToRevenue: 5.1, rating: 'AAA', perCapita: 35600, domesticPct: 60, foreignPct: 40, shortTermPct: 18, longTermPct: 82, fixedPct: 85, floatingPct: 15, projections: [52.0, 53.5, 55.0, 56.0, 57.0] },
    { country: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', totalDebt: 1.82, debtToGdp: 108.0, deficit: -3.9, interestPayments: 38, interestToRevenue: 7.0, rating: 'A', perCapita: 38200, domesticPct: 50, foreignPct: 50, shortTermPct: 16, longTermPct: 84, fixedPct: 91, floatingPct: 9, projections: [108.0, 109.5, 111.0, 112.0, 113.0] },
    { country: 'Mexico', flag: '\u{1F1F2}\u{1F1FD}', totalDebt: 0.82, debtToGdp: 54.0, deficit: -3.3, interestPayments: 58, interestToRevenue: 16.2, rating: 'BBB', perCapita: 6200, domesticPct: 78, foreignPct: 22, shortTermPct: 25, longTermPct: 75, fixedPct: 72, floatingPct: 28, projections: [54.0, 56.5, 59.0, 62.0, 65.0] },
    { country: 'Greece', flag: '\u{1F1EC}\u{1F1F7}', totalDebt: 0.43, debtToGdp: 163.0, deficit: -1.6, interestPayments: 6.8, interestToRevenue: 6.2, rating: 'BBB-', perCapita: 41200, domesticPct: 20, foreignPct: 80, shortTermPct: 10, longTermPct: 90, fixedPct: 96, floatingPct: 4, projections: [163.0, 158.0, 153.0, 149.0, 145.0] },
  ],
  debtGrowthTrajectory: [
    { country: 'United States', flag: '\u{1F1FA}\u{1F1F8}', y2026: 123.0, y2027: 126.5, y2028: 130.2, y2029: 134.0, y2030: 138.1 },
    { country: 'China', flag: '\u{1F1E8}\u{1F1F3}', y2026: 84.0, y2027: 88.5, y2028: 93.0, y2029: 97.5, y2030: 102.0 },
    { country: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', y2026: 255.0, y2027: 258.2, y2028: 261.0, y2029: 263.5, y2030: 265.0 },
    { country: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', y2026: 64.0, y2027: 65.5, y2028: 67.0, y2029: 68.0, y2030: 69.0 },
    { country: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}', y2026: 101.0, y2027: 104.0, y2028: 107.5, y2029: 110.0, y2030: 112.5 },
    { country: 'France', flag: '\u{1F1EB}\u{1F1F7}', y2026: 112.0, y2027: 115.0, y2028: 118.5, y2029: 121.0, y2030: 123.5 },
    { country: 'India', flag: '\u{1F1EE}\u{1F1F3}', y2026: 83.0, y2027: 85.0, y2028: 87.5, y2029: 89.5, y2030: 91.0 },
    { country: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', y2026: 142.0, y2027: 144.5, y2028: 147.0, y2029: 149.0, y2030: 151.0 },
    { country: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', y2026: 76.0, y2027: 79.5, y2028: 83.0, y2029: 87.0, y2030: 91.0 },
    { country: 'Canada', flag: '\u{1F1E8}\u{1F1E6}', y2026: 107.0, y2027: 108.5, y2028: 110.0, y2029: 111.0, y2030: 112.0 },
  ],
  globalInterestBurden: {
    totalInterest: 13.2,
    asPercentOfGdp: 5.1,
    fastestGrowing: [
      { country: 'United States', flag: '\u{1F1FA}\u{1F1F8}', interest: 1120, growthRate: 12.5 },
      { country: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', interest: 210, growthRate: 18.2 },
      { country: 'India', flag: '\u{1F1EE}\u{1F1F3}', interest: 195, growthRate: 14.8 },
      { country: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', interest: 195, growthRate: 8.5 },
      { country: 'China', flag: '\u{1F1E8}\u{1F1F3}', interest: 580, growthRate: 11.2 },
      { country: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}', interest: 125, growthRate: 9.8 },
    ],
  },
};

// ── Section header component ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-red-400/30">
      <div className="w-1 h-1 bg-red-400" />
      <span className="text-[7px] font-black uppercase tracking-widest text-red-400">{title}</span>
    </div>
  );
}

// ── Main Component ──

export function GlobalDebtClockPanel() {
  const { data: hookData } = useGlobalDebtClock();
  const raw = hookData || FALLBACK_DATA;
  const data: any = raw;

  const [selectedCountry, setSelectedCountry] = useState<string>('United States');

  const selectedDetail = useMemo(() => {
    return data.sovereignDebt.find((c: any) => c.country === selectedCountry) || data.sovereignDebt[0];
  }, [data, selectedCountry]);

  const sortedSovereign = useMemo(() => {
    return [...data.sovereignDebt].sort((a: any, b: any) => b.totalDebt - a.totalDebt);
  }, [data]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-red-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            GLOBAL DEBT CLOCK
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-black text-white tabular-nums">
            {fmtTrillions(data.globalAggregate.totalGlobalDebt)}
          </span>
          <span className="text-[8px] font-bold text-red-400 tabular-nums">
            +{data.globalAggregate.growthRate}% YoY
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Section 2: Global Aggregate */}
        <SectionHeader title="GLOBAL DEBT AGGREGATE" />
        <div className="grid grid-cols-3 gap-px bg-border/10">
          {[
            { label: 'TOTAL GLOBAL DEBT', value: fmtTrillions(data.globalAggregate.totalGlobalDebt), sub: `${fmtPct(data.globalAggregate.debtToGdp)} OF GDP` },
            { label: 'GOVERNMENT DEBT', value: fmtTrillions(data.globalAggregate.governmentDebt), sub: 'SOVEREIGN' },
            { label: 'CORPORATE DEBT', value: fmtTrillions(data.globalAggregate.corporateDebt), sub: 'NON-FINANCIAL' },
            { label: 'HOUSEHOLD DEBT', value: fmtTrillions(data.globalAggregate.householdDebt), sub: 'CONSUMER' },
            { label: 'FINANCIAL DEBT', value: fmtTrillions(data.globalAggregate.financialDebt), sub: 'BANKS & FI' },
            { label: 'DEBT-TO-GDP', value: fmtPct(data.globalAggregate.debtToGdp), sub: `+${data.globalAggregate.growthRate}% GROWTH` },
          ].map((item: any) => (
            <div key={item.label} className="bg-black px-3 py-2 hover:bg-red-400/[0.02] transition-colors">
              <div className="text-[7px] font-bold text-neutral-500 uppercase tracking-wider">{item.label}</div>
              <div className="text-[14px] font-black text-white mt-0.5 tabular-nums">{item.value}</div>
              <div className="text-[6px] text-neutral-600 uppercase">{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Section 3: Sovereign Debt Table */}
        <SectionHeader title="SOVEREIGN DEBT RANKINGS" />
        <div className="overflow-x-auto">
          <table className="w-full text-[8px] font-mono">
            <thead>
              <tr className="border-b border-red-400/30 bg-white/[0.02]">
                <th className="text-left py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">COUNTRY</th>
                <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">TOTAL DEBT</th>
                <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">DEBT/GDP</th>
                <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">DEFICIT</th>
                <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">INTEREST</th>
                <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">INT/REV</th>
                <th className="text-center py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">RATING</th>
                <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">PER CAPITA</th>
              </tr>
            </thead>
            <tbody>
              {sortedSovereign.map((c: any, i: any) => (
                <tr
                  key={c.country}
                  onClick={() => setSelectedCountry(c.country)}
                  className={`border-b border-border/20 hover:bg-red-400/[0.02] transition-colors cursor-pointer ${
                    selectedCountry === c.country ? 'bg-red-400/[0.04]' : i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
                  }`}
                >
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    <span className="mr-1">{c.flag}</span>
                    <span className="text-white font-bold text-[8px]">{c.country}</span>
                  </td>
                  <td className="text-right py-1.5 px-2 text-white font-bold tabular-nums">{fmtTrillions(c.totalDebt)}</td>
                  <td className={`text-right py-1.5 px-2 font-bold tabular-nums ${debtGdpColor(c.debtToGdp)}`}>{fmtPct(c.debtToGdp)}</td>
                  <td className={`text-right py-1.5 px-2 font-bold tabular-nums ${deficitColor(c.deficit)}`}>{c.deficit > 0 ? '+' : ''}{c.deficit.toFixed(1)}%</td>
                  <td className="text-right py-1.5 px-2 text-neutral-400 tabular-nums">{fmtBillions(c.interestPayments)}</td>
                  <td className={`text-right py-1.5 px-2 font-bold tabular-nums ${interestRevenueColor(c.interestToRevenue)}`}>{fmtPct(c.interestToRevenue)}</td>
                  <td className="text-center py-1.5 px-2">
                    <span className={`px-1.5 py-0.5 text-[6px] font-black border ${ratingColor(c.rating)} ${ratingBg(c.rating)}`}>
                      {c.rating}
                    </span>
                  </td>
                  <td className="text-right py-1.5 px-2 text-neutral-400 tabular-nums">{fmtPerCapita(c.perCapita)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4: Selected Country Detail */}
        {selectedDetail && (
          <>
            <SectionHeader title={`${selectedDetail.flag} ${selectedDetail.country.toUpperCase()} - DEBT DETAIL`} />
            <div className="px-3 py-2">
              {/* Debt Sustainability Indicators */}
              <div className="grid grid-cols-4 gap-px bg-border/10 mb-2">
                {[
                  { label: 'DEBT/GDP', value: fmtPct(selectedDetail.debtToGdp), color: debtGdpColor(selectedDetail.debtToGdp) },
                  { label: 'DEFICIT/GDP', value: `${selectedDetail.deficit > 0 ? '+' : ''}${selectedDetail.deficit.toFixed(1)}%`, color: deficitColor(selectedDetail.deficit) },
                  { label: 'INT/REVENUE', value: fmtPct(selectedDetail.interestToRevenue), color: interestRevenueColor(selectedDetail.interestToRevenue) },
                  { label: 'PER CAPITA', value: fmtPerCapita(selectedDetail.perCapita), color: 'text-white' },
                ].map((ind: any) => (
                  <div key={ind.label} className="bg-black px-2 py-1.5 hover:bg-red-400/[0.02] transition-colors">
                    <div className="text-[6px] font-bold text-neutral-600 uppercase tracking-wider">{ind.label}</div>
                    <div className={`text-[11px] font-black tabular-nums ${ind.color}`}>{ind.value}</div>
                  </div>
                ))}
              </div>

              {/* Composition bars */}
              <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">DEBT COMPOSITION</div>
              <div className="space-y-1.5 mb-2">
                {/* Domestic vs Foreign */}
                <div>
                  <div className="flex justify-between text-[6px] text-neutral-500 mb-0.5">
                    <span>DOMESTIC {selectedDetail.domesticPct}%</span>
                    <span>FOREIGN {selectedDetail.foreignPct}%</span>
                  </div>
                  <div className="flex h-1.5 bg-white/[0.03] overflow-hidden">
                    <div className="bg-red-400/60" style={{ width: `${selectedDetail.domesticPct}%` }} />
                    <div className="bg-orange-400/60" style={{ width: `${selectedDetail.foreignPct}%` }} />
                  </div>
                </div>
                {/* Short vs Long Term */}
                <div>
                  <div className="flex justify-between text-[6px] text-neutral-500 mb-0.5">
                    <span>SHORT-TERM {selectedDetail.shortTermPct}%</span>
                    <span>LONG-TERM {selectedDetail.longTermPct}%</span>
                  </div>
                  <div className="flex h-1.5 bg-white/[0.03] overflow-hidden">
                    <div className="bg-yellow-400/60" style={{ width: `${selectedDetail.shortTermPct}%` }} />
                    <div className="bg-emerald-400/60" style={{ width: `${selectedDetail.longTermPct}%` }} />
                  </div>
                </div>
                {/* Fixed vs Floating */}
                <div>
                  <div className="flex justify-between text-[6px] text-neutral-500 mb-0.5">
                    <span>FIXED {selectedDetail.fixedPct}%</span>
                    <span>FLOATING {selectedDetail.floatingPct}%</span>
                  </div>
                  <div className="flex h-1.5 bg-white/[0.03] overflow-hidden">
                    <div className="bg-sky-400/60" style={{ width: `${selectedDetail.fixedPct}%` }} />
                    <div className="bg-purple-400/60" style={{ width: `${selectedDetail.floatingPct}%` }} />
                  </div>
                </div>
              </div>

              {/* 5-Year Debt Trajectory */}
              <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1">DEBT/GDP TRAJECTORY (5Y)</div>
              <DebtTrajectoryChart projections={selectedDetail.projections} />
            </div>
          </>
        )}

        {/* Section 5: Debt Growth Trajectory Table */}
        <SectionHeader title="DEBT/GDP PROJECTIONS - TOP 10 ECONOMIES" />
        <div className="overflow-x-auto">
          <table className="w-full text-[8px] font-mono">
            <thead>
              <tr className="border-b border-red-400/30 bg-white/[0.02]">
                <th className="text-left py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">COUNTRY</th>
                <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">2026</th>
                <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">2027</th>
                <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">2028</th>
                <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">2029</th>
                <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">2030</th>
                <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider whitespace-nowrap">CHG</th>
              </tr>
            </thead>
            <tbody>
              {data.debtGrowthTrajectory.map((c: any, i: any) => {
                const change = c.y2030 - c.y2026;
                return (
                  <tr
                    key={c.country}
                    className={`border-b border-border/20 hover:bg-red-400/[0.02] transition-colors ${
                      i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
                    }`}
                  >
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <span className="mr-1">{c.flag}</span>
                      <span className="text-white font-bold text-[8px]">{c.country}</span>
                    </td>
                    <td className={`text-right py-1.5 px-2 tabular-nums ${debtGdpColor(c.y2026)}`}>{fmtPct(c.y2026)}</td>
                    <td className={`text-right py-1.5 px-2 tabular-nums ${debtGdpColor(c.y2027)}`}>{fmtPct(c.y2027)}</td>
                    <td className={`text-right py-1.5 px-2 tabular-nums ${debtGdpColor(c.y2028)}`}>{fmtPct(c.y2028)}</td>
                    <td className={`text-right py-1.5 px-2 tabular-nums ${debtGdpColor(c.y2029)}`}>{fmtPct(c.y2029)}</td>
                    <td className={`text-right py-1.5 px-2 font-bold tabular-nums ${debtGdpColor(c.y2030)}`}>{fmtPct(c.y2030)}</td>
                    <td className={`text-right py-1.5 px-2 font-bold tabular-nums ${change > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}pp
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Section 6: Global Interest Burden */}
        <SectionHeader title="GLOBAL INTEREST BURDEN" />
        <div className="px-3 py-2">
          <div className="grid grid-cols-2 gap-px bg-border/10 mb-2">
            <div className="bg-black px-3 py-2 hover:bg-red-400/[0.02] transition-colors">
              <div className="text-[7px] font-bold text-neutral-500 uppercase tracking-wider">TOTAL GLOBAL INTEREST</div>
              <div className="text-[16px] font-black text-red-400 mt-0.5 tabular-nums">{fmtTrillions(data.globalInterestBurden.totalInterest)}</div>
            </div>
            <div className="bg-black px-3 py-2 hover:bg-red-400/[0.02] transition-colors">
              <div className="text-[7px] font-bold text-neutral-500 uppercase tracking-wider">AS % OF GLOBAL GDP</div>
              <div className="text-[16px] font-black text-orange-400 mt-0.5 tabular-nums">{fmtPct(data.globalInterestBurden.asPercentOfGdp)}</div>
            </div>
          </div>

          <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1">FASTEST GROWING INTEREST BURDEN</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[8px] font-mono">
              <thead>
                <tr className="border-b border-red-400/30 bg-white/[0.02]">
                  <th className="text-left py-1 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider">COUNTRY</th>
                  <th className="text-right py-1 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider">INTEREST</th>
                  <th className="text-right py-1 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider">GROWTH</th>
                  <th className="text-left py-1 px-2 text-[7px] font-black text-neutral-500 uppercase tracking-wider">BURDEN</th>
                </tr>
              </thead>
              <tbody>
                {data.globalInterestBurden.fastestGrowing.map((c: any, i: any) => {
                  const maxInterest = Math.max(...data.globalInterestBurden.fastestGrowing.map((x: any) => x.interest));
                  const barPct = maxInterest > 0 ? (c.interest / maxInterest) * 100 : 0;
                  return (
                    <tr
                      key={c.country}
                      className={`border-b border-border/20 hover:bg-red-400/[0.02] transition-colors ${
                        i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
                      }`}
                    >
                      <td className="py-1 px-2 whitespace-nowrap">
                        <span className="mr-1">{c.flag}</span>
                        <span className="text-white font-bold">{c.country}</span>
                      </td>
                      <td className="text-right py-1 px-2 text-neutral-400 tabular-nums">{fmtBillions(c.interest)}</td>
                      <td className="text-right py-1 px-2 text-red-400 font-bold tabular-nums">+{c.growthRate.toFixed(1)}%</td>
                      <td className="py-1 px-2 w-24">
                        <div className="h-1.5 bg-white/[0.03] overflow-hidden">
                          <div className="h-full bg-red-400/50" style={{ width: `${barPct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 7: Debt Composition by Country */}
        <SectionHeader title="DEBT COMPOSITION BY COUNTRY" />
        <div className="px-3 py-2">
          <div className="flex items-center gap-4 mb-2 text-[6px] font-mono text-neutral-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-1.5 bg-red-400/60" />
              <span>DOMESTIC</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-1.5 bg-orange-400/60" />
              <span>FOREIGN</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-1.5 bg-yellow-400/60" />
              <span>SHORT-TERM</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-1.5 bg-emerald-400/60" />
              <span>LONG-TERM</span>
            </div>
          </div>
          {sortedSovereign.slice(0, 10).map((c: any) => (
            <div key={c.country} className="mb-1.5 hover:bg-red-400/[0.02] transition-colors px-1 py-0.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] font-bold text-white/60">
                  <span className="mr-1">{c.flag}</span>{c.country}
                </span>
                <span className="text-[7px] text-neutral-500 tabular-nums">{fmtTrillions(c.totalDebt)}</span>
              </div>
              {/* Domestic/Foreign bar */}
              <div className="flex h-1 bg-white/[0.03] overflow-hidden mb-0.5">
                <div className="bg-red-400/60 h-full" style={{ width: `${c.domesticPct}%` }} />
                <div className="bg-orange-400/60 h-full" style={{ width: `${c.foreignPct}%` }} />
              </div>
              {/* Short/Long term bar */}
              <div className="flex h-1 bg-white/[0.03] overflow-hidden">
                <div className="bg-yellow-400/60 h-full" style={{ width: `${c.shortTermPct}%` }} />
                <div className="bg-emerald-400/60 h-full" style={{ width: `${c.longTermPct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-red-400/30">
          <p className="text-[7px] font-mono text-neutral-600 leading-relaxed">
            Data sourced from IMF, World Bank, BIS, and national treasury departments. Reference data as of Q1 2026. Projections based on IMF WEO baseline scenario. Not real-time.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Debt Trajectory Mini Chart ──

function DebtTrajectoryChart({ projections }: { projections: number[] }) {
  if (!projections || projections.length < 2) return null;

  const W = 200;
  const H = 40;
  const PAD_X = 4;
  const PAD_Y = 6;

  const minV = Math.min(...projections) - 2;
  const maxV = Math.max(...projections) + 2;
  const rangeV = maxV - minV || 1;

  const scaleX = (i: number) => PAD_X + (i / (projections.length - 1)) * (W - PAD_X * 2);
  const scaleY = (v: number) => PAD_Y + ((maxV - v) / rangeV) * (H - PAD_Y * 2);

  const linePath = projections
    .map((v: any, i: any) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
    .join(' ');

  const fillPath = `${linePath} L ${scaleX(projections.length - 1).toFixed(1)},${H} L ${scaleX(0).toFixed(1)},${H} Z`;

  const increasing = projections[projections.length - 1] > projections[0];
  const lineColor = increasing ? '#f87171' : '#4ade80';
  const fillColor = increasing ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.08)';

  const years = ['2026', '2027', '2028', '2029', '2030'];

  return (
    <svg viewBox={`0 0 ${W} ${H + 10}`} className="w-full" style={{ height: 45 }}>
      <path d={fillPath} fill={fillColor} />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={1.5} />
      {projections.map((v: any, i: any) => (
        <g key={i}>
          <circle cx={scaleX(i)} cy={scaleY(v)} r={1.5} fill={lineColor} />
          <text
            x={scaleX(i)}
            y={H + 8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.2)"
            fontSize={5}
            fontFamily="monospace"
          >
            {years[i]}
          </text>
        </g>
      ))}
      {/* Start and end labels */}
      <text
        x={scaleX(0)}
        y={scaleY(projections[0]) - 4}
        textAnchor="start"
        fill={lineColor}
        fontSize={6}
        fontFamily="monospace"
        fontWeight="bold"
      >
        {projections[0].toFixed(0)}%
      </text>
      <text
        x={scaleX(projections.length - 1)}
        y={scaleY(projections[projections.length - 1]) - 4}
        textAnchor="end"
        fill={lineColor}
        fontSize={6}
        fontFamily="monospace"
        fontWeight="bold"
      >
        {projections[projections.length - 1].toFixed(0)}%
      </text>
    </svg>
  );
}
