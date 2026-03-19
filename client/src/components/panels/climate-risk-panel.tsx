import { Leaf } from 'lucide-react';
import { useClimateRisk } from '../../api/hooks/use-climate-risk';

// ── Fallback Data ──

const FALLBACK_DATA = {
  carbonPrice: 68.42,
  tempAnomaly: 1.48,
  summaryStats: {
    globalEmissions: 37.4,
    greenBondIssuance: 582,
    carbonMarketCap: 948,
    climateFinanceGap: 2800,
  },
  sectorRisk: [
    { sector: 'Oil & Gas', physicalRisk: 42, transitionRisk: 92, strandedAssets: 1320, carbonIntensity: 548, regulatoryExposure: 'CRITICAL' },
    { sector: 'Utilities', physicalRisk: 58, transitionRisk: 78, strandedAssets: 890, carbonIntensity: 412, regulatoryExposure: 'HIGH' },
    { sector: 'Mining', physicalRisk: 55, transitionRisk: 71, strandedAssets: 640, carbonIntensity: 385, regulatoryExposure: 'HIGH' },
    { sector: 'Transport', physicalRisk: 38, transitionRisk: 65, strandedAssets: 420, carbonIntensity: 298, regulatoryExposure: 'MEDIUM' },
    { sector: 'Agriculture', physicalRisk: 72, transitionRisk: 45, strandedAssets: 310, carbonIntensity: 195, regulatoryExposure: 'MEDIUM' },
    { sector: 'Real Estate', physicalRisk: 64, transitionRisk: 52, strandedAssets: 580, carbonIntensity: 142, regulatoryExposure: 'MEDIUM' },
    { sector: 'Industrials', physicalRisk: 35, transitionRisk: 58, strandedAssets: 290, carbonIntensity: 178, regulatoryExposure: 'LOW' },
    { sector: 'Technology', physicalRisk: 18, transitionRisk: 22, strandedAssets: 45, carbonIntensity: 32, regulatoryExposure: 'LOW' },
  ],
  regionalRisk: [
    { region: 'South Asia', flood: 88, drought: 72, heat: 94, seaLevel: 82, wildfire: 35 },
    { region: 'Southeast Asia', flood: 85, drought: 55, heat: 78, seaLevel: 90, wildfire: 42 },
    { region: 'Sub-Saharan Africa', flood: 62, drought: 88, heat: 85, seaLevel: 48, wildfire: 58 },
    { region: 'Mediterranean', flood: 52, drought: 78, heat: 82, seaLevel: 55, wildfire: 88 },
    { region: 'Central America', flood: 75, drought: 68, heat: 72, seaLevel: 70, wildfire: 45 },
    { region: 'Pacific Islands', flood: 70, drought: 42, heat: 65, seaLevel: 95, wildfire: 22 },
    { region: 'North America', flood: 55, drought: 62, heat: 58, seaLevel: 45, wildfire: 72 },
    { region: 'Northern Europe', flood: 48, drought: 32, heat: 42, seaLevel: 52, wildfire: 28 },
  ],
  carbonMarkets: [
    { market: 'EU ETS', price: 68.42, dailyChange: 1.24, ytdChange: 12.8, volume: '14.2M' },
    { market: 'UK ETS', price: 42.18, dailyChange: -0.56, ytdChange: 8.4, volume: '2.8M' },
    { market: 'CA RGGI', price: 15.85, dailyChange: 0.32, ytdChange: 5.2, volume: '4.1M' },
    { market: 'NZ ETS', price: 52.30, dailyChange: -1.10, ytdChange: -3.6, volume: '1.2M' },
    { market: 'KR ETS', price: 8.92, dailyChange: 0.15, ytdChange: -8.2, volume: '0.9M' },
    { market: 'CN ETS', price: 11.45, dailyChange: 0.28, ytdChange: 22.4, volume: '6.5M' },
  ],
  policyTracker: [
    { jurisdiction: 'EU', policy: 'CBAM Phase 2', status: 'ACTIVE', impact: 'HIGH', sectors: 'Steel, Cement, Aluminum' },
    { jurisdiction: 'US', policy: 'IRA Clean Energy Credits', status: 'ACTIVE', impact: 'HIGH', sectors: 'Renewables, EV, Storage' },
    { jurisdiction: 'UK', policy: 'Green Taxonomy', status: 'PENDING', impact: 'MEDIUM', sectors: 'All Financial Services' },
    { jurisdiction: 'JP', policy: 'GX Transition Bonds', status: 'ACTIVE', impact: 'MEDIUM', sectors: 'Heavy Industry, Transport' },
    { jurisdiction: 'AU', policy: 'Safeguard Mechanism', status: 'ACTIVE', impact: 'HIGH', sectors: 'Mining, Oil & Gas' },
    { jurisdiction: 'CA', policy: 'Clean Fuel Standard', status: 'ACTIVE', impact: 'MEDIUM', sectors: 'Transport, Refining' },
    { jurisdiction: 'IN', policy: 'Carbon Credit Trading', status: 'DRAFT', impact: 'HIGH', sectors: 'Power, Steel, Cement' },
    { jurisdiction: 'SG', policy: 'Carbon Tax Increase', status: 'PENDING', impact: 'LOW', sectors: 'All Emitters >25k tCO2' },
  ],
  greenFinance: {
    greenBondYTD: 582,
    sustainabilityLinked: 198,
    transitionBonds: 85,
    greenLoanVolume: 312,
    esgAUM: 41200,
    carbonOffsetMarket: 2.4,
  },
};

// ── Helpers ──

function riskBarColor(score: number): string {
  if (score <= 25) return '#34d399';
  if (score <= 50) return '#fbbf24';
  if (score <= 75) return '#fb923c';
  return '#ef4444';
}

function exposureBadgeStyle(level: string): string {
  switch (level) {
    case 'CRITICAL': return 'text-red-400 bg-red-400/10';
    case 'HIGH': return 'text-orange-400 bg-orange-400/10';
    case 'MEDIUM': return 'text-amber-400 bg-amber-400/10';
    case 'LOW': return 'text-emerald-400 bg-emerald-400/10';
    default: return 'text-neutral-500 bg-neutral-500/10';
  }
}

function statusBadgeStyle(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'text-emerald-400 bg-emerald-400/10';
    case 'PENDING': return 'text-amber-400 bg-amber-400/10';
    case 'DRAFT': return 'text-neutral-400 bg-neutral-400/10';
    default: return 'text-neutral-500 bg-neutral-500/10';
  }
}

function impactColor(impact: string): string {
  switch (impact) {
    case 'HIGH': return 'text-red-400';
    case 'MEDIUM': return 'text-amber-400';
    case 'LOW': return 'text-emerald-400';
    default: return 'text-neutral-500';
  }
}

function fmtChange(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;
}

function fmtPctChange(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

// ── Main Panel ──

export function ClimateRiskPanel() {
  const { data: rawData } = useClimateRisk();

  const d = (rawData as Record<string, unknown>) ?? FALLBACK_DATA;
  const carbonPrice = (d.carbonPrice as number) ?? FALLBACK_DATA.carbonPrice;
  const tempAnomaly = (d.tempAnomaly as number) ?? FALLBACK_DATA.tempAnomaly;
  const summaryStats = (d.summaryStats as typeof FALLBACK_DATA.summaryStats) ?? FALLBACK_DATA.summaryStats;
  const sectorRisk = (d.sectorRisk as typeof FALLBACK_DATA.sectorRisk) ?? FALLBACK_DATA.sectorRisk;
  const regionalRisk = (d.regionalRisk as typeof FALLBACK_DATA.regionalRisk) ?? FALLBACK_DATA.regionalRisk;
  const carbonMarkets = (d.carbonMarkets as typeof FALLBACK_DATA.carbonMarkets) ?? FALLBACK_DATA.carbonMarkets;
  const policyTracker = (d.policyTracker as typeof FALLBACK_DATA.policyTracker) ?? FALLBACK_DATA.policyTracker;
  const greenFinance = (d.greenFinance as typeof FALLBACK_DATA.greenFinance) ?? FALLBACK_DATA.greenFinance;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-emerald-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Leaf className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-400">
            Climate Risk Dashboard
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[7px] uppercase text-neutral-500">CARBON</span>
            <span className="text-[9px] font-bold text-emerald-400 tabular-nums">
              ${carbonPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] uppercase text-neutral-500">TEMP</span>
            <span className="text-[9px] font-bold text-red-400 tabular-nums">
              +{tempAnomaly.toFixed(2)}C
            </span>
          </div>
        </div>
      </div>

      {/* ── Summary Stats Bar ── */}
      <div className="grid grid-cols-4 border-b border-emerald-400/30 shrink-0">
        {[
          { label: 'GLOBAL EMISSIONS', value: `${summaryStats.globalEmissions} GtCO2`, accent: true },
          { label: 'GREEN BOND YTD', value: `$${summaryStats.greenBondIssuance}B`, accent: false },
          { label: 'CARBON MKT CAP', value: `$${summaryStats.carbonMarketCap}B`, accent: true },
          { label: 'CLIMATE FIN GAP', value: `$${(summaryStats.climateFinanceGap / 1000).toFixed(1)}T`, accent: false },
        ].map((stat: any) => (
          <div key={stat.label} className="px-2 py-1.5 border-r border-border/20 last:border-r-0">
            <div className="text-[7px] uppercase tracking-widest text-neutral-500 font-black">{stat.label}</div>
            <div className={`text-[10px] font-black tabular-nums ${stat.accent ? 'text-emerald-400' : 'text-white'}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-auto no-scrollbar">

        {/* ── Section 1: Sector Risk Assessment ── */}
        <div className="px-2 py-2">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="w-1 h-1 bg-emerald-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
              Sector Risk Assessment
            </span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr] gap-1 px-1 mb-1">
            {['SECTOR', 'PHYSICAL', 'TRANSITION', 'STRANDED', 'CO2 INT', 'REG EXP'].map((h: any) => (
              <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">
                {h}
              </span>
            ))}
          </div>

          {/* Sector Rows */}
          {sectorRisk.map((s: any) => (
            <div
              key={s.sector}
              className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-bold text-neutral-300 truncate uppercase">{s.sector}</span>
              {/* Physical Risk Bar */}
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-neutral-900 relative">
                  <div
                    className="absolute top-0 left-0 h-full"
                    style={{ width: `${Math.min(s.physicalRisk, 100)}%`, backgroundColor: riskBarColor(s.physicalRisk), opacity: 0.7 }}
                  />
                </div>
                <span className="text-[7px] font-bold tabular-nums w-5 text-right" style={{ color: riskBarColor(s.physicalRisk) }}>
                  {s.physicalRisk}
                </span>
              </div>
              {/* Transition Risk Bar */}
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-neutral-900 relative">
                  <div
                    className="absolute top-0 left-0 h-full"
                    style={{ width: `${Math.min(s.transitionRisk, 100)}%`, backgroundColor: riskBarColor(s.transitionRisk), opacity: 0.7 }}
                  />
                </div>
                <span className="text-[7px] font-bold tabular-nums w-5 text-right" style={{ color: riskBarColor(s.transitionRisk) }}>
                  {s.transitionRisk}
                </span>
              </div>
              <span className="text-[8px] text-neutral-300 tabular-nums">${s.strandedAssets}B</span>
              <span className="text-[8px] text-neutral-300 tabular-nums">{s.carbonIntensity}</span>
              <span className={`text-[7px] font-bold px-1 py-0.5 text-center ${exposureBadgeStyle(s.regulatoryExposure)}`}>
                {s.regulatoryExposure}
              </span>
            </div>
          ))}
        </div>

        {/* ── Section 2: Regional Physical Risk ── */}
        <div className="px-2 py-2 border-t border-emerald-400/30">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="w-1 h-1 bg-emerald-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
              Regional Physical Risk
            </span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1fr] gap-1 px-1 mb-1">
            {['REGION', 'FLOOD', 'DROUGHT', 'HEAT', 'SEA LEVEL', 'WILDFIRE'].map((h: any) => (
              <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">
                {h}
              </span>
            ))}
          </div>

          {/* Regional Rows */}
          {regionalRisk.map((r: any) => (
            <div
              key={r.region}
              className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-bold text-neutral-300 truncate uppercase">{r.region}</span>
              {[r.flood, r.drought, r.heat, r.seaLevel, r.wildfire].map((score: any, i: any) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="flex-1 h-1.5 bg-neutral-900 relative">
                    <div
                      className="absolute top-0 left-0 h-full"
                      style={{ width: `${Math.min(score, 100)}%`, backgroundColor: riskBarColor(score), opacity: 0.7 }}
                    />
                  </div>
                  <span className="text-[7px] font-bold tabular-nums w-5 text-right" style={{ color: riskBarColor(score) }}>
                    {score}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── Section 3: Carbon Markets ── */}
        <div className="px-2 py-2 border-t border-emerald-400/30">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="w-1 h-1 bg-emerald-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
              Carbon Markets
            </span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-1 px-1 mb-1">
            {['MARKET', 'PRICE', 'DAILY CHG', 'YTD CHG', 'VOLUME'].map((h: any) => (
              <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">
                {h}
              </span>
            ))}
          </div>

          {/* Market Rows */}
          {carbonMarkets.map((m: any) => (
            <div
              key={m.market}
              className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-bold text-neutral-300 uppercase">{m.market}</span>
              <span className="text-[8px] text-white font-bold tabular-nums">${m.price.toFixed(2)}</span>
              <span className={`text-[8px] font-bold tabular-nums ${m.dailyChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtChange(m.dailyChange)}
              </span>
              <span className={`text-[8px] font-bold tabular-nums ${m.ytdChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtPctChange(m.ytdChange)}
              </span>
              <span className="text-[8px] text-neutral-300 tabular-nums">{m.volume}</span>
            </div>
          ))}
        </div>

        {/* ── Section 4: Climate Policy Tracker ── */}
        <div className="px-2 py-2 border-t border-emerald-400/30">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="w-1 h-1 bg-emerald-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
              Climate Policy Tracker
            </span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[0.5fr_1.2fr_0.6fr_0.5fr_1.2fr] gap-1 px-1 mb-1">
            {['JURIS', 'POLICY', 'STATUS', 'IMPACT', 'SECTORS'].map((h: any) => (
              <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">
                {h}
              </span>
            ))}
          </div>

          {/* Policy Rows */}
          {policyTracker.map((p: any) => (
            <div
              key={`${p.jurisdiction}-${p.policy}`}
              className="grid grid-cols-[0.5fr_1.2fr_0.6fr_0.5fr_1.2fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-bold text-emerald-400 uppercase">{p.jurisdiction}</span>
              <span className="text-[8px] text-neutral-300 truncate">{p.policy}</span>
              <span className={`text-[7px] font-bold px-1 py-0.5 text-center ${statusBadgeStyle(p.status)}`}>
                {p.status}
              </span>
              <span className={`text-[8px] font-bold ${impactColor(p.impact)}`}>{p.impact}</span>
              <span className="text-[7px] text-neutral-500 truncate">{p.sectors}</span>
            </div>
          ))}
        </div>

        {/* ── Section 5: Green Finance ── */}
        <div className="px-2 py-2 border-t border-emerald-400/30">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="w-1 h-1 bg-emerald-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
              Green Finance
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 px-1">
            {[
              { label: 'GREEN BONDS YTD', value: `$${greenFinance.greenBondYTD}B`, sub: 'ISSUANCE' },
              { label: 'SUSTAINABILITY-LINKED', value: `$${greenFinance.sustainabilityLinked}B`, sub: 'BONDS & LOANS' },
              { label: 'TRANSITION BONDS', value: `$${greenFinance.transitionBonds}B`, sub: 'YTD VOLUME' },
              { label: 'GREEN LOAN VOLUME', value: `$${greenFinance.greenLoanVolume}B`, sub: '2026 YTD' },
              { label: 'ESG AUM', value: `$${(greenFinance.esgAUM / 1000).toFixed(1)}T`, sub: 'GLOBAL TOTAL' },
              { label: 'CARBON OFFSET MKT', value: `$${greenFinance.carbonOffsetMarket}B`, sub: 'VOLUNTARY' },
            ].map((item: any) => (
              <div key={item.label} className="p-1.5 border border-border/20 bg-[#060606]">
                <div className="text-[6px] uppercase tracking-wider text-neutral-600 font-black">{item.label}</div>
                <div className="text-[10px] font-black text-emerald-400 tabular-nums">{item.value}</div>
                <div className="text-[6px] uppercase text-neutral-600">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
