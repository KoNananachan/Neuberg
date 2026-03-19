import { useInsuranceMarket } from '../../api/hooks/use-insurance-market';
import { Shield } from 'lucide-react';

// ── Fallback Mock Data ──

const FALLBACK_DATA = {
  overview: {
    globalPremiums: 7.12,
    premiumGrowth: 4.8,
    combinedRatio: 95.2,
    catLossesYTD: 68.4,
    reinsuranceCapital: 725,
  },
  pcLines: [
    { line: 'Property', rateChange: 8.2, lossRatio: 62.5, combinedRatio: 92.3, marketCycle: 'HARD' },
    { line: 'Casualty', rateChange: 5.4, lossRatio: 68.2, combinedRatio: 98.3, marketCycle: 'STABLE' },
    { line: 'Auto', rateChange: 12.6, lossRatio: 71.4, combinedRatio: 97.9, marketCycle: 'HARD' },
    { line: 'Workers Comp', rateChange: -2.1, lossRatio: 58.4, combinedRatio: 86.6, marketCycle: 'SOFT' },
    { line: 'Marine', rateChange: 3.8, lossRatio: 55.2, combinedRatio: 87.8, marketCycle: 'STABLE' },
    { line: 'Cyber', rateChange: 18.4, lossRatio: 42.6, combinedRatio: 81.0, marketCycle: 'HARD' },
    { line: 'D&O', rateChange: -6.8, lossRatio: 48.5, combinedRatio: 82.7, marketCycle: 'SOFT' },
    { line: 'Professional Liability', rateChange: 2.4, lossRatio: 64.8, combinedRatio: 96.3, marketCycle: 'STABLE' },
  ],
  reinsuranceRates: [
    { program: 'US Property Cat', rateOnLine: 12.4, yoyChange: 15.2, capacity: 'constrained' },
    { program: 'Europe Windstorm', rateOnLine: 8.8, yoyChange: 8.6, capacity: 'adequate' },
    { program: 'Japan Typhoon', rateOnLine: 9.2, yoyChange: 6.4, capacity: 'adequate' },
    { program: 'Global Marine', rateOnLine: 5.6, yoyChange: 3.1, capacity: 'adequate' },
    { program: 'US Casualty XL', rateOnLine: 7.8, yoyChange: -1.8, capacity: 'adequate' },
    { program: 'Caribbean Hurricane', rateOnLine: 18.6, yoyChange: 22.4, capacity: 'scarce' },
    { program: 'Australia Flood', rateOnLine: 14.2, yoyChange: 18.8, capacity: 'constrained' },
    { program: 'Global Retro', rateOnLine: 22.4, yoyChange: 12.6, capacity: 'scarce' },
  ],
  catBonds: {
    outstanding: 47.2,
    newIssuance: 16.8,
    recentDeals: [
      { name: 'Everglades Re 2026-1', peril: 'Hurricane', size: 350, spread: 825, expectedLoss: 2.14 },
      { name: 'Sierra Re 2025-2', peril: 'Earthquake', size: 500, spread: 675, expectedLoss: 1.82 },
      { name: 'Golden State Re III', peril: 'Wildfire', size: 200, spread: 1150, expectedLoss: 3.45 },
      { name: 'Windmill Re 2026-A', peril: 'Windstorm', size: 425, spread: 540, expectedLoss: 1.28 },
      { name: 'Pacific Re 2025-1', peril: 'Typhoon', size: 300, spread: 780, expectedLoss: 2.56 },
      { name: 'Rhine Re IV', peril: 'Flood', size: 275, spread: 480, expectedLoss: 0.98 },
      { name: 'Atlas Re 2026-B', peril: 'Multi-Peril', size: 600, spread: 920, expectedLoss: 2.88 },
    ],
  },
  lossEvents: [
    { event: 'Hurricane Milton', date: '2025-10-08', region: 'US Southeast', insuredLoss: 32.4, line: 'Property' },
    { event: 'California Wildfire Complex', date: '2025-09-15', region: 'US West', insuredLoss: 14.2, line: 'Property' },
    { event: 'Rhine Valley Flooding', date: '2025-07-22', region: 'Europe', insuredLoss: 9.8, line: 'Property' },
    { event: 'Tohoku Earthquake', date: '2025-08-14', region: 'Japan', insuredLoss: 8.6, line: 'Property' },
    { event: 'Texas Hailstorm', date: '2025-06-18', region: 'US Central', insuredLoss: 5.2, line: 'Auto' },
    { event: 'Cyclone Nivar', date: '2025-11-02', region: 'Indian Ocean', insuredLoss: 2.1, line: 'Marine' },
  ],
  insurerPerformance: [
    { company: 'Chubb (CB)', premiums: 52.8, combinedRatio: 88.5, investmentReturn: 4.2, stockYTD: 12.4 },
    { company: 'Progressive (PGR)', premiums: 62.4, combinedRatio: 89.4, investmentReturn: 3.8, stockYTD: 18.6 },
    { company: 'AIG', premiums: 46.2, combinedRatio: 97.3, investmentReturn: 3.6, stockYTD: 4.2 },
    { company: 'Allstate (ALL)', premiums: 54.8, combinedRatio: 93.1, investmentReturn: 4.1, stockYTD: 8.8 },
    { company: 'Travelers (TRV)', premiums: 42.6, combinedRatio: 95.1, investmentReturn: 3.9, stockYTD: 6.2 },
    { company: 'Hartford (HIG)', premiums: 24.8, combinedRatio: 94.8, investmentReturn: 4.4, stockYTD: -2.8 },
    { company: 'Markel (MKL)', premiums: 12.4, combinedRatio: 92.6, investmentReturn: 5.2, stockYTD: 9.4 },
    { company: 'RenaissanceRe (RNR)', premiums: 8.6, combinedRatio: 86.4, investmentReturn: 4.8, stockYTD: 14.2 },
    { company: 'Everest Re (RE)', premiums: 14.2, combinedRatio: 91.2, investmentReturn: 4.6, stockYTD: 10.8 },
    { company: 'MetLife (MET)', premiums: 68.4, combinedRatio: 96.2, investmentReturn: 3.4, stockYTD: 2.6 },
  ],
  generatedAt: new Date().toISOString(),
};

// ── Color / badge helpers ──

function marketCycleBadge(cycle: string): string {
  if (cycle === 'HARD') return 'text-red-400 bg-red-500/10 border border-red-500/30';
  if (cycle === 'STABLE') return 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30';
  if (cycle === 'SOFT') return 'text-green-400 bg-green-500/10 border border-green-500/30';
  return 'text-neutral-500 bg-neutral-500/10 border border-neutral-500/30';
}

function capacityBadge(cap: string): string {
  if (cap === 'adequate') return 'text-green-400 bg-green-500/10 border border-green-500/30';
  if (cap === 'constrained') return 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30';
  if (cap === 'scarce') return 'text-red-400 bg-red-500/10 border border-red-500/30';
  return 'text-neutral-500 bg-neutral-500/10 border border-neutral-500/30';
}

function combinedColor(ratio: number): string {
  return ratio < 100 ? 'text-green-400' : 'text-red-400';
}

function lineBadgeColor(line: string): string {
  if (line === 'Property') return 'text-orange-400 bg-orange-500/10 border border-orange-500/30';
  if (line === 'Auto') return 'text-blue-400 bg-blue-500/10 border border-blue-500/30';
  if (line === 'Marine') return 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30';
  if (line === 'Casualty') return 'text-purple-400 bg-purple-500/10 border border-purple-500/30';
  return 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30';
}

// ── Section Header Component ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 border-b border-teal-400/30">
      <div className="w-1 h-1 bg-teal-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-teal-400">
        {title}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function InsuranceMarketPanel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawData, isLoading, error } = useInsuranceMarket() as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (rawData as any) || FALLBACK_DATA;

  if (isLoading && !rawData) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest animate-pulse">
          Loading insurance data...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          Failed to load insurance data
        </div>
      </div>
    );
  }

  const overview = data.overview || FALLBACK_DATA.overview;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-teal-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3 text-teal-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-teal-400">
            Insurance Market
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[7px] text-neutral-600 uppercase">Premiums</span>
          <span className="text-[9px] font-bold text-white tabular-nums">${overview.globalPremiums}T</span>
          <span className="text-[7px] text-neutral-600 uppercase">Combined</span>
          <span className={`text-[9px] font-bold tabular-nums ${combinedColor(overview.combinedRatio)}`}>
            {overview.combinedRatio}%
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* ── 1. Overview Stats ── */}
        <div className="border-b border-teal-400/30">
          <div className="grid grid-cols-5 gap-px bg-border/10">
            {[
              { label: 'Global Premiums', value: `$${overview.globalPremiums}T`, color: 'text-white' },
              { label: 'Premium Growth', value: `${overview.premiumGrowth}%`, color: 'text-teal-400' },
              { label: 'Combined Ratio', value: `${overview.combinedRatio}%`, color: combinedColor(overview.combinedRatio) },
              { label: 'Cat Losses YTD', value: `$${overview.catLossesYTD}B`, color: 'text-red-400' },
              { label: 'Reinsurance Capital', value: `$${overview.reinsuranceCapital}B`, color: 'text-white' },
            ].map((m: any) => (
              <div key={m.label} className="px-2 py-1.5 bg-black hover:bg-teal-400/[0.02]">
                <div className="text-[7px] text-neutral-600 uppercase tracking-wider">{m.label}</div>
                <div className={`text-[10px] font-bold tabular-nums ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. P&C Lines ── */}
        <div className="border-b border-teal-400/30">
          <SectionHeader title="P&C Lines" />
          <div className="grid grid-cols-[1fr_56px_52px_52px_56px] px-2 py-1 border-b border-border/20 bg-[#030303]">
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Line</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Rate Chg</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Loss R</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Comb R</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Cycle</span>
          </div>
          {(data.pcLines || FALLBACK_DATA.pcLines).map((p: any) => (
            <div
              key={p.line}
              className="grid grid-cols-[1fr_56px_52px_52px_56px] px-2 py-1 border-b border-border/20 hover:bg-teal-400/[0.02]"
            >
              <span className="text-[8px] font-bold text-white truncate">{p.line}</span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${p.rateChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {p.rateChange >= 0 ? '+' : ''}{p.rateChange}%
              </span>
              <span className="text-[8px] text-neutral-400 text-right tabular-nums">{p.lossRatio}%</span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${combinedColor(p.combinedRatio)}`}>
                {p.combinedRatio}%
              </span>
              <span className="text-right">
                <span className={`text-[6px] font-bold px-1 py-0.5 ${marketCycleBadge(p.marketCycle)}`}>
                  {p.marketCycle}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* ── 3. Reinsurance Rates ── */}
        <div className="border-b border-teal-400/30">
          <SectionHeader title="Reinsurance Rates" />
          <div className="grid grid-cols-[1fr_52px_52px_64px] px-2 py-1 border-b border-border/20 bg-[#030303]">
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Program</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">ROL</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">YoY</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Capacity</span>
          </div>
          {(data.reinsuranceRates || FALLBACK_DATA.reinsuranceRates).map((r: any) => (
            <div
              key={r.program}
              className="grid grid-cols-[1fr_52px_52px_64px] px-2 py-1 border-b border-border/20 hover:bg-teal-400/[0.02]"
            >
              <span className="text-[8px] text-white/80 truncate">{r.program}</span>
              <span className="text-[8px] font-bold text-teal-400 text-right tabular-nums">{r.rateOnLine}%</span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${r.yoyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {r.yoyChange >= 0 ? '+' : ''}{r.yoyChange}%
              </span>
              <span className="text-right">
                <span className={`text-[6px] font-bold px-1 py-0.5 uppercase ${capacityBadge(r.capacity)}`}>
                  {r.capacity}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* ── 4. Cat Bonds ── */}
        <div className="border-b border-teal-400/30">
          <SectionHeader title="Catastrophe Bonds" />
          <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border/20">
            <div>
              <div className="text-[7px] text-neutral-600 uppercase">Outstanding</div>
              <div className="text-[10px] font-bold text-white tabular-nums">
                ${(data.catBonds || FALLBACK_DATA.catBonds).outstanding}B
              </div>
            </div>
            <div>
              <div className="text-[7px] text-neutral-600 uppercase">New Issuance YTD</div>
              <div className="text-[10px] font-bold text-teal-400 tabular-nums">
                ${(data.catBonds || FALLBACK_DATA.catBonds).newIssuance}B
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_60px_48px_48px_48px] px-2 py-1 border-b border-border/20 bg-[#030303]">
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Deal</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Peril</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Size</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Spread</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">EL</span>
          </div>
          {(data.catBonds || FALLBACK_DATA.catBonds).recentDeals.map((d: any) => (
            <div
              key={d.name}
              className="grid grid-cols-[1fr_60px_48px_48px_48px] px-2 py-1 border-b border-border/20 hover:bg-teal-400/[0.02]"
            >
              <span className="text-[8px] font-bold text-teal-400 truncate">{d.name}</span>
              <span className="text-[8px] text-neutral-400 text-right">{d.peril}</span>
              <span className="text-[8px] font-bold text-white text-right tabular-nums">${d.size}M</span>
              <span className="text-[8px] text-neutral-400 text-right tabular-nums">{d.spread}bp</span>
              <span className="text-[8px] text-red-400 text-right tabular-nums">{d.expectedLoss}%</span>
            </div>
          ))}
        </div>

        {/* ── 5. Loss Events YTD ── */}
        <div className="border-b border-teal-400/30">
          <SectionHeader title="Loss Events YTD" />
          <div className="grid grid-cols-[1fr_64px_64px_56px_52px] px-2 py-1 border-b border-border/20 bg-[#030303]">
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Event</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Date</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Region</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Ins Loss</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Line</span>
          </div>
          {(data.lossEvents || FALLBACK_DATA.lossEvents).map((e: any, i: any) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_64px_64px_56px_52px] px-2 py-1 border-b border-border/20 hover:bg-teal-400/[0.02]"
            >
              <span className="text-[8px] font-bold text-white truncate">{e.event}</span>
              <span className="text-[8px] text-neutral-500 tabular-nums">{e.date}</span>
              <span className="text-[8px] text-neutral-400 truncate">{e.region}</span>
              <span className="text-[8px] font-bold text-red-400 text-right tabular-nums">${e.insuredLoss}B</span>
              <span className="text-right">
                <span className={`text-[6px] font-bold px-1 py-0.5 ${lineBadgeColor(e.line)}`}>
                  {e.line}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* ── 6. Insurer Performance ── */}
        <div className="border-b border-teal-400/30">
          <SectionHeader title="Insurer Performance" />
          <div className="grid grid-cols-[1fr_52px_52px_48px_48px] px-2 py-1 border-b border-border/20 bg-[#030303]">
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Company</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Prem</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Comb R</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Inv Ret</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Stk YTD</span>
          </div>
          {(data.insurerPerformance || FALLBACK_DATA.insurerPerformance).map((c: any) => (
            <div
              key={c.company}
              className="grid grid-cols-[1fr_52px_52px_48px_48px] px-2 py-1 border-b border-border/20 hover:bg-teal-400/[0.02]"
            >
              <span className="text-[8px] font-bold text-white truncate">{c.company}</span>
              <span className="text-[8px] text-neutral-400 text-right tabular-nums">${c.premiums}B</span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${combinedColor(c.combinedRatio)}`}>
                {c.combinedRatio}%
              </span>
              <span className="text-[8px] text-teal-400 text-right tabular-nums">{c.investmentReturn}%</span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${c.stockYTD >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {c.stockYTD >= 0 ? '+' : ''}{c.stockYTD}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
