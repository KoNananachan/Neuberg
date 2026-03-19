import { useState } from 'react';
import { useCreditDefaultSwaps } from '../../api/hooks/use-credit-default-swaps';
import { Shield } from 'lucide-react';

// ── Fallback Data ──

const FALLBACK_DATA = {
  indexOverview: [
    { name: 'CDX IG', series: 'S41', level: 52.3, change: -1.2, changePct: -2.24, dailyRange: '51.8 - 53.1', prev: 53.5 },
    { name: 'CDX HY', series: 'S41', level: 312.5, change: 3.8, changePct: 1.23, dailyRange: '308.2 - 314.7', prev: 308.7 },
    { name: 'iTraxx Europe', series: 'S40', level: 58.7, change: -0.9, changePct: -1.51, dailyRange: '57.9 - 59.4', prev: 59.6 },
    { name: 'iTraxx Xover', series: 'S40', level: 298.4, change: 2.1, changePct: 0.71, dailyRange: '295.1 - 300.3', prev: 296.3 },
  ],
  singleNameCds: [
    { entity: 'Goldman Sachs', sector: 'Financials', rating: 'A+', spread5y: 58.2, change: -2.1, recoveryRate: 40.0, impliedPd: 0.97 },
    { entity: 'JPMorgan Chase', sector: 'Financials', rating: 'A+', spread5y: 48.5, change: -1.8, recoveryRate: 40.0, impliedPd: 0.81 },
    { entity: 'Ford Motor', sector: 'Auto', rating: 'BB+', spread5y: 185.3, change: 5.4, recoveryRate: 35.0, impliedPd: 3.09 },
    { entity: 'General Electric', sector: 'Industrials', rating: 'BBB+', spread5y: 72.1, change: 0.8, recoveryRate: 40.0, impliedPd: 1.20 },
    { entity: 'Meta Platforms', sector: 'Technology', rating: 'AA-', spread5y: 38.4, change: -0.5, recoveryRate: 40.0, impliedPd: 0.64 },
    { entity: 'Boeing Co', sector: 'Industrials', rating: 'BBB-', spread5y: 142.7, change: 8.3, recoveryRate: 35.0, impliedPd: 2.38 },
    { entity: 'AT&T Inc', sector: 'Telecom', rating: 'BBB', spread5y: 89.6, change: 1.2, recoveryRate: 40.0, impliedPd: 1.49 },
    { entity: 'Citigroup', sector: 'Financials', rating: 'A-', spread5y: 63.8, change: -1.5, recoveryRate: 40.0, impliedPd: 1.06 },
    { entity: 'Tesla Inc', sector: 'Auto', rating: 'BBB-', spread5y: 128.9, change: 3.7, recoveryRate: 35.0, impliedPd: 2.15 },
    { entity: 'Verizon Comms', sector: 'Telecom', rating: 'BBB+', spread5y: 74.2, change: 0.3, recoveryRate: 40.0, impliedPd: 1.24 },
    { entity: 'Amazon.com', sector: 'Technology', rating: 'AA', spread5y: 32.1, change: -0.9, recoveryRate: 40.0, impliedPd: 0.54 },
    { entity: 'Kraft Heinz', sector: 'Consumer', rating: 'BB+', spread5y: 168.4, change: 4.2, recoveryRate: 35.0, impliedPd: 2.81 },
  ],
  sectorAggregates: [
    { sector: 'Financials', avgSpread: 56.8, spreadRange: '32.1 - 89.4', widening: 3, tightening: 8, trend30d: 'down' },
    { sector: 'Technology', avgSpread: 42.3, spreadRange: '28.5 - 72.1', widening: 2, tightening: 6, trend30d: 'down' },
    { sector: 'Industrials', avgSpread: 95.7, spreadRange: '48.2 - 162.3', widening: 5, tightening: 4, trend30d: 'up' },
    { sector: 'Auto', avgSpread: 157.1, spreadRange: '98.4 - 215.8', widening: 6, tightening: 2, trend30d: 'up' },
    { sector: 'Telecom', avgSpread: 81.9, spreadRange: '52.3 - 118.7', widening: 3, tightening: 5, trend30d: 'flat' },
    { sector: 'Energy', avgSpread: 78.4, spreadRange: '41.2 - 135.6', widening: 4, tightening: 5, trend30d: 'down' },
    { sector: 'Consumer', avgSpread: 112.5, spreadRange: '62.1 - 185.3', widening: 5, tightening: 3, trend30d: 'up' },
    { sector: 'Healthcare', avgSpread: 65.2, spreadRange: '35.8 - 102.4', widening: 2, tightening: 7, trend30d: 'down' },
  ],
  cdsBasis: [
    { issuer: 'Goldman Sachs', cdsSpread: 58.2, cashSpread: 62.5, basis: -4.3, trend: 'narrowing' },
    { issuer: 'JPMorgan Chase', cdsSpread: 48.5, cashSpread: 51.2, basis: -2.7, trend: 'stable' },
    { issuer: 'Ford Motor', cdsSpread: 185.3, cashSpread: 178.1, basis: 7.2, trend: 'widening' },
    { issuer: 'Boeing Co', cdsSpread: 142.7, cashSpread: 138.4, basis: 4.3, trend: 'widening' },
    { issuer: 'AT&T Inc', cdsSpread: 89.6, cashSpread: 92.1, basis: -2.5, trend: 'narrowing' },
    { issuer: 'Tesla Inc', cdsSpread: 128.9, cashSpread: 122.3, basis: 6.6, trend: 'widening' },
    { issuer: 'Meta Platforms', cdsSpread: 38.4, cashSpread: 40.1, basis: -1.7, trend: 'stable' },
    { issuer: 'Citigroup', cdsSpread: 63.8, cashSpread: 67.2, basis: -3.4, trend: 'narrowing' },
  ],
  significantMoves: [
    { entity: 'Boeing Co', direction: 'WIDER', moveBps: 8.3, currentSpread: 142.7, catalyst: 'FAA investigation into quality concerns' },
    { entity: 'Ford Motor', direction: 'WIDER', moveBps: 5.4, currentSpread: 185.3, catalyst: 'EV transition costs exceed estimates' },
    { entity: 'Kraft Heinz', direction: 'WIDER', moveBps: 4.2, currentSpread: 168.4, catalyst: 'Consumer spending weakness signals' },
    { entity: 'JPMorgan Chase', direction: 'TIGHTER', moveBps: 1.8, currentSpread: 48.5, catalyst: 'Strong Q4 earnings beat estimates' },
    { entity: 'Goldman Sachs', direction: 'TIGHTER', moveBps: 2.1, currentSpread: 58.2, catalyst: 'Asset management revenue growth' },
    { entity: 'Amazon.com', direction: 'TIGHTER', moveBps: 0.9, currentSpread: 32.1, catalyst: 'AWS revenue acceleration' },
  ],
  termStructure: [
    {
      entity: 'Goldman Sachs',
      tenors: [
        { tenor: '1Y', spread: 22.5 },
        { tenor: '2Y', spread: 34.8 },
        { tenor: '3Y', spread: 45.2 },
        { tenor: '5Y', spread: 58.2 },
        { tenor: '7Y', spread: 68.4 },
        { tenor: '10Y', spread: 78.9 },
      ],
    },
    {
      entity: 'Ford Motor',
      tenors: [
        { tenor: '1Y', spread: 85.3 },
        { tenor: '2Y', spread: 118.7 },
        { tenor: '3Y', spread: 148.2 },
        { tenor: '5Y', spread: 185.3 },
        { tenor: '7Y', spread: 198.6 },
        { tenor: '10Y', spread: 212.4 },
      ],
    },
    {
      entity: 'Boeing Co',
      tenors: [
        { tenor: '1Y', spread: 68.1 },
        { tenor: '2Y', spread: 95.4 },
        { tenor: '3Y', spread: 118.3 },
        { tenor: '5Y', spread: 142.7 },
        { tenor: '7Y', spread: 155.2 },
        { tenor: '10Y', spread: 168.8 },
      ],
    },
    {
      entity: 'Meta Platforms',
      tenors: [
        { tenor: '1Y', spread: 15.2 },
        { tenor: '2Y', spread: 22.8 },
        { tenor: '3Y', spread: 29.5 },
        { tenor: '5Y', spread: 38.4 },
        { tenor: '7Y', spread: 44.1 },
        { tenor: '10Y', spread: 51.3 },
      ],
    },
  ],
  timestamp: new Date().toISOString(),
};

// ── Color / format helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function changeBg(n: number): string {
  if (n > 0) return 'bg-red-500/10 border border-red-500/30 text-red-400';
  if (n < 0) return 'bg-green-500/10 border border-green-500/30 text-green-400';
  return 'bg-neutral-500/10 border border-neutral-500/30 text-neutral-500';
}

function ratingColor(rating: string): string {
  if (rating === 'AAA') return 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30';
  if (rating.startsWith('AA')) return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30';
  if (rating.startsWith('A')) return 'text-blue-400 bg-blue-500/10 border border-blue-500/30';
  if (rating.startsWith('BBB')) return 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30';
  if (rating.startsWith('BB')) return 'text-orange-400 bg-orange-500/10 border border-orange-500/30';
  return 'text-red-400 bg-red-500/10 border border-red-500/30';
}

function fmtSign(n: number): string {
  return n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1);
}

function trendArrow(trend: string): string {
  if (trend === 'up') return '\u2191';
  if (trend === 'down') return '\u2193';
  return '\u2192';
}

function trendColor(trend: string): string {
  if (trend === 'up') return 'text-red-400';
  if (trend === 'down') return 'text-green-400';
  return 'text-neutral-500';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 border-b border-sky-400/30">
      <div className="w-1 h-1 bg-sky-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-sky-400">
        {title}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function CreditDefaultSwapsPanel() {
  const { data: apiData, isLoading } = useCreditDefaultSwaps();
  const data = apiData || FALLBACK_DATA;

  const [termEntity, setTermEntity] = useState(0);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-sky-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-sky-400">
            CDS Market Monitor
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-black uppercase px-1.5 py-0.5 text-blue-400 bg-blue-400/10 border border-blue-400/30">
            CDX IG {(data as any).indexOverview?.[0]?.level ?? '—'}
          </span>
          <span className="text-[7px] font-black uppercase px-1.5 py-0.5 text-orange-400 bg-orange-400/10 border border-orange-400/30">
            CDX HY {(data as any).indexOverview?.[1]?.level ?? '—'}
          </span>
          {isLoading && (
            <div className="w-2 h-2 border border-sky-400 border-t-transparent animate-spin" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* 1. Index Overview */}
        <SectionHeader title="Index Overview" />
        <div className="grid grid-cols-4 gap-px bg-border/10">
          {(data as any).indexOverview?.map((idx: any) => (
            <div key={idx.name} className="px-2 py-1.5 bg-black hover:bg-sky-400/[0.02] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-white">{idx.name}</span>
                <span className="text-[6px] text-neutral-600">{idx.series}</span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-[11px] font-bold text-white tabular-nums">{idx.level.toFixed(1)}</span>
                <span className={`text-[7px] font-bold px-1 py-px ${changeBg(idx.change)} tabular-nums`}>
                  {fmtSign(idx.change)}
                </span>
              </div>
              <div className="text-[6px] text-neutral-600 mt-0.5 tabular-nums">{idx.dailyRange}</div>
            </div>
          ))}
        </div>

        {/* 2. Single-Name CDS Table */}
        <SectionHeader title="Single-Name CDS" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#080808] z-10">
              <tr className="border-b border-border/20">
                <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500">Entity</th>
                <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500">Sector</th>
                <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500">Rating</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">5Y Spread</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">Change</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">Recovery</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">Impl PD</th>
              </tr>
            </thead>
            <tbody>
              {(data as any).singleNameCds?.map((row: any) => (
                <tr key={row.entity} className="border-b border-border/20 hover:bg-sky-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 text-white font-bold whitespace-nowrap">{row.entity}</td>
                  <td className="px-1.5 py-1 text-neutral-500 whitespace-nowrap">{row.sector}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span className={`text-[7px] font-bold px-1 py-px ${ratingColor(row.rating)}`}>
                      {row.rating}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 text-right text-white font-bold whitespace-nowrap tabular-nums">
                    {row.spread5y.toFixed(1)}
                  </td>
                  <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap tabular-nums ${changeColor(row.change)}`}>
                    {fmtSign(row.change)}
                  </td>
                  <td className="px-1.5 py-1 text-right text-neutral-400 whitespace-nowrap tabular-nums">
                    {row.recoveryRate.toFixed(0)}%
                  </td>
                  <td className="px-1.5 py-1 text-right text-neutral-400 whitespace-nowrap tabular-nums">
                    {row.impliedPd.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 3. Sector Aggregates */}
        <SectionHeader title="Sector Aggregates" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#080808] z-10">
              <tr className="border-b border-border/20">
                <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500">Sector</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">Avg Spread</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">Range</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">Widening</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">Tightening</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">30D Trend</th>
              </tr>
            </thead>
            <tbody>
              {(data as any).sectorAggregates?.map((row: any) => (
                <tr key={row.sector} className="border-b border-border/20 hover:bg-sky-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 text-white font-bold whitespace-nowrap">{row.sector}</td>
                  <td className="px-1.5 py-1 text-right text-white font-bold whitespace-nowrap tabular-nums">
                    {row.avgSpread.toFixed(1)}
                  </td>
                  <td className="px-1.5 py-1 text-right text-neutral-500 whitespace-nowrap tabular-nums">
                    {row.spreadRange}
                  </td>
                  <td className="px-1.5 py-1 text-right text-red-400 whitespace-nowrap tabular-nums">
                    {row.widening}
                  </td>
                  <td className="px-1.5 py-1 text-right text-green-400 whitespace-nowrap tabular-nums">
                    {row.tightening}
                  </td>
                  <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap ${trendColor(row.trend30d)}`}>
                    {trendArrow(row.trend30d)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. CDS Basis */}
        <SectionHeader title="CDS-Bond Basis" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#080808] z-10">
              <tr className="border-b border-border/20">
                <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500">Issuer</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">CDS Spread</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">Cash Spread</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">Basis</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">Trend</th>
              </tr>
            </thead>
            <tbody>
              {(data as any).cdsBasis?.map((row: any) => (
                <tr key={row.issuer} className="border-b border-border/20 hover:bg-sky-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 text-white font-bold whitespace-nowrap">{row.issuer}</td>
                  <td className="px-1.5 py-1 text-right text-neutral-300 whitespace-nowrap tabular-nums">
                    {row.cdsSpread.toFixed(1)}
                  </td>
                  <td className="px-1.5 py-1 text-right text-neutral-300 whitespace-nowrap tabular-nums">
                    {row.cashSpread.toFixed(1)}
                  </td>
                  <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap tabular-nums ${
                    row.basis >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {row.basis >= 0 ? '+' : ''}{row.basis.toFixed(1)}
                  </td>
                  <td className="px-1.5 py-1 text-right text-neutral-500 whitespace-nowrap">
                    {row.trend}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 5. Significant Moves */}
        <SectionHeader title="Significant Moves" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#080808] z-10">
              <tr className="border-b border-border/20">
                <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500">Entity</th>
                <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500">Direction</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">Move</th>
                <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">Current</th>
                <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500">Catalyst</th>
              </tr>
            </thead>
            <tbody>
              {(data as any).significantMoves?.map((row: any, i: any) => (
                <tr key={`${row.entity}-${i}`} className="border-b border-border/20 hover:bg-sky-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 text-white font-bold whitespace-nowrap">{row.entity}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span className={`text-[7px] font-bold px-1 py-px ${
                      row.direction === 'WIDER'
                        ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                        : 'text-green-400 bg-green-500/10 border border-green-500/30'
                    }`}>
                      {row.direction}
                    </span>
                  </td>
                  <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap tabular-nums ${
                    row.direction === 'WIDER' ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {row.moveBps.toFixed(1)} bps
                  </td>
                  <td className="px-1.5 py-1 text-right text-white font-bold whitespace-nowrap tabular-nums">
                    {row.currentSpread.toFixed(1)}
                  </td>
                  <td className="px-1.5 py-1 text-neutral-500 truncate max-w-[200px]">{row.catalyst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 6. Term Structure */}
        <SectionHeader title="Term Structure" />
        <div className="px-3 py-2">
          {/* Entity tabs */}
          <div className="flex items-center gap-0.5 mb-2 flex-wrap">
            {(data as any).termStructure?.map((ts: any, i: any) => (
              <button
                key={ts.entity}
                onClick={() => setTermEntity(i)}
                className={`text-[7px] font-bold uppercase px-1.5 py-0.5 transition-colors whitespace-nowrap ${
                  termEntity === i
                    ? 'text-sky-400 bg-sky-400/15 border border-sky-400/30'
                    : 'text-neutral-600 hover:text-neutral-400'
                }`}
              >
                {ts.entity}
              </button>
            ))}
          </div>

          {/* Term structure display */}
          {(data as any).termStructure?.[termEntity] && (
            <div>
              {/* SVG curve */}
              <TermStructureChart tenors={(data as any).termStructure[termEntity].tenors} />

              {/* Tenor grid */}
              <div className="grid grid-cols-6 gap-px mt-2 bg-border/10">
                {(data as any).termStructure[termEntity].tenors.map((t: any) => (
                  <div key={t.tenor} className="bg-black px-2 py-1 text-center hover:bg-sky-400/[0.02] transition-colors">
                    <div className="text-[7px] text-neutral-600 uppercase">{t.tenor}</div>
                    <div className="text-[9px] font-bold text-white tabular-nums">{t.spread.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="px-3 py-1 border-t border-border/10">
          <span className="text-[7px] text-neutral-700">
            Last update: {new Date((data as any).timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Term Structure SVG Chart ──

function TermStructureChart({ tenors }: { tenors: any[] }) {
  const W = 280;
  const H = 70;
  const PAD_X = 20;
  const PAD_Y = 12;

  if (tenors.length < 2) return null;

  const values = tenors.map((t: any) => t.spread);
  const minV = Math.min(...values) * 0.85;
  const maxV = Math.max(...values) * 1.05;
  const rangeV = maxV - minV || 1;

  const scaleX = (i: number) => PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2);
  const scaleY = (v: number) => PAD_Y + ((maxV - v) / rangeV) * (H - PAD_Y * 2);

  const pathD = values
    .map((v: any, i: any) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
    .join(' ');

  const fillD = `${pathD} L ${scaleX(values.length - 1).toFixed(1)},${H - 2} L ${scaleX(0).toFixed(1)},${H - 2} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 60 }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((pct: any) => {
        const y = PAD_Y + pct * (H - PAD_Y * 2);
        return (
          <line
            key={pct}
            x1={PAD_X}
            y1={y}
            x2={W - PAD_X}
            y2={y}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2,3"
          />
        );
      })}

      {/* Fill */}
      <path d={fillD} fill="rgba(56,189,248,0.06)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth={1.5} />

      {/* Points + labels */}
      {values.map((v: any, i: any) => (
        <g key={i}>
          <circle cx={scaleX(i)} cy={scaleY(v)} r={2.5} fill="#38bdf8" />
          <text
            x={scaleX(i)}
            y={scaleY(v) - 5}
            textAnchor="middle"
            fill="white"
            fontSize={6}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {v.toFixed(0)}
          </text>
          <text
            x={scaleX(i)}
            y={H - 1}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={6}
            fontFamily="monospace"
          >
            {tenors[i].tenor}
          </text>
        </g>
      ))}
    </svg>
  );
}
