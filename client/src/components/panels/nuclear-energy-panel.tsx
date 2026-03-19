import { useNuclearEnergy } from '../../api/hooks/use-nuclear-energy';
import { Atom, RefreshCw } from 'lucide-react';

// ── Fallback Data ──

const FALLBACK_DATA = {
  overview: {
    totalReactors: 440,
    operatingCapacityGW: 393.4,
    shareOfElectricity: 9.2,
    underConstruction: 64,
    planned: 110,
    uraniumSpotPrice: 91.25,
  },
  countryFleet: [
    { country: 'United States', reactors: 93, capacityGW: 95.8, sharePct: 18.2, underConstruction: 2, planned: 3, fleetAge: 42.1 },
    { country: 'France', reactors: 56, capacityGW: 61.4, sharePct: 64.8, underConstruction: 1, planned: 0, fleetAge: 37.5 },
    { country: 'China', reactors: 55, capacityGW: 53.2, sharePct: 5.0, underConstruction: 24, planned: 44, fleetAge: 9.8 },
    { country: 'Russia', reactors: 37, capacityGW: 28.6, sharePct: 19.6, underConstruction: 4, planned: 28, fleetAge: 28.3 },
    { country: 'Japan', reactors: 33, capacityGW: 31.7, sharePct: 5.5, underConstruction: 2, planned: 1, fleetAge: 33.6 },
    { country: 'South Korea', reactors: 26, capacityGW: 25.8, sharePct: 29.6, underConstruction: 3, planned: 6, fleetAge: 22.4 },
    { country: 'India', reactors: 23, capacityGW: 7.5, sharePct: 3.1, underConstruction: 8, planned: 12, fleetAge: 24.7 },
    { country: 'Canada', reactors: 19, capacityGW: 13.6, sharePct: 13.6, underConstruction: 0, planned: 2, fleetAge: 39.2 },
    { country: 'Ukraine', reactors: 15, capacityGW: 13.1, sharePct: 55.0, underConstruction: 2, planned: 0, fleetAge: 33.8 },
    { country: 'United Kingdom', reactors: 9, capacityGW: 5.9, sharePct: 14.8, underConstruction: 2, planned: 2, fleetAge: 37.1 },
    { country: 'Sweden', reactors: 6, capacityGW: 6.9, sharePct: 29.4, underConstruction: 0, planned: 2, fleetAge: 42.5 },
    { country: 'Belgium', reactors: 5, capacityGW: 3.9, sharePct: 41.0, underConstruction: 0, planned: 0, fleetAge: 42.8 },
  ],
  uraniumMarket: {
    spotPrice: 91.25,
    longTermPrice: 68.00,
    conversionPrice: 22.50,
    enrichmentPrice: 165.00,
    topProducers: [
      { name: 'Kazakhstan', sharePct: 43.0 },
      { name: 'Canada', sharePct: 15.0 },
      { name: 'Namibia', sharePct: 11.0 },
      { name: 'Australia', sharePct: 8.0 },
      { name: 'Uzbekistan', sharePct: 7.0 },
      { name: 'Russia', sharePct: 5.0 },
    ],
    priceHistory: [62, 58, 64, 71, 68, 73, 78, 82, 75, 79, 85, 88, 91, 94, 89, 87, 91],
  },
  newBuildPipeline: [
    { project: 'Hinkley Point C', country: 'UK', type: 'EPR', capacityMW: 3260, status: 'CONSTRUCTION', commissioning: '2030', costBn: 46.0 },
    { project: 'Barakah Unit 4', country: 'UAE', type: 'APR-1400', capacityMW: 1345, status: 'CONSTRUCTION', commissioning: '2025', costBn: 6.1 },
    { project: 'Akkuyu Unit 1', country: 'Turkey', type: 'VVER-1200', capacityMW: 1200, status: 'CONSTRUCTION', commissioning: '2026', costBn: 5.0 },
    { project: 'El Dabaa Unit 1', country: 'Egypt', type: 'VVER-1200', capacityMW: 1200, status: 'CONSTRUCTION', commissioning: '2028', costBn: 4.5 },
    { project: 'Sizewell C', country: 'UK', type: 'EPR', capacityMW: 3340, status: 'APPROVED', commissioning: '2035', costBn: 31.0 },
    { project: 'Dukovany 5', country: 'Czechia', type: 'APR-1000', capacityMW: 1200, status: 'APPROVED', commissioning: '2036', costBn: 8.5 },
    { project: 'Paks II', country: 'Hungary', type: 'VVER-1200', capacityMW: 2400, status: 'CONSTRUCTION', commissioning: '2032', costBn: 12.5 },
    { project: 'Shin-Hanul 3-4', country: 'S. Korea', type: 'APR-1400', capacityMW: 2800, status: 'APPROVED', commissioning: '2033', costBn: 9.2 },
    { project: 'Jaitapur', country: 'India', type: 'EPR', capacityMW: 9600, status: 'PLANNED', commissioning: '2034+', costBn: 17.0 },
    { project: 'Wylfa Newydd', country: 'UK', type: 'ABWR', capacityMW: 2700, status: 'PLANNED', commissioning: '2035+', costBn: 20.0 },
  ],
  smrPipeline: [
    { design: 'BWRX-300', developer: 'GE Hitachi', capacityMW: 300, status: 'APPROVED', firstDeployment: '2029', orders: 6 },
    { design: 'Natrium', developer: 'TerraPower', capacityMW: 345, status: 'CONSTRUCTION', firstDeployment: '2030', orders: 1 },
    { design: 'NuScale VOYGR', developer: 'NuScale', capacityMW: 462, status: 'APPROVED', firstDeployment: '2030', orders: 4 },
    { design: 'SMR-160', developer: 'Holtec', capacityMW: 160, status: 'PLANNED', firstDeployment: '2032', orders: 2 },
    { design: 'Xe-100', developer: 'X-energy', capacityMW: 80, status: 'APPROVED', firstDeployment: '2030', orders: 3 },
    { design: 'ARC-100', developer: 'ARC Clean', capacityMW: 100, status: 'PLANNED', firstDeployment: '2031', orders: 1 },
    { design: 'KP-FHR', developer: 'Kairos Power', capacityMW: 140, status: 'CONSTRUCTION', firstDeployment: '2027', orders: 2 },
    { design: 'Rolls-Royce SMR', developer: 'Rolls-Royce', capacityMW: 470, status: 'APPROVED', firstDeployment: '2031', orders: 4 },
  ],
  policyTracker: [
    { country: 'United States', direction: 'EXPANDING', recentAction: 'ADVANCE Act signed; $30B loan guarantees for new builds', date: '2025-09' },
    { country: 'France', direction: 'EXPANDING', recentAction: 'Confirmed 6 new EPR2 reactors; lifetime extensions to 60y', date: '2025-06' },
    { country: 'China', direction: 'EXPANDING', recentAction: 'Approved 10 new reactors in 2025 batch; 150 GW by 2035 target', date: '2025-07' },
    { country: 'Japan', direction: 'EXPANDING', recentAction: 'Restarted 12 reactors; policy shift to support new builds', date: '2025-05' },
    { country: 'South Korea', direction: 'EXPANDING', recentAction: 'Reversed phase-out; extending Shin-Hanul, new export push', date: '2025-01' },
    { country: 'United Kingdom', direction: 'EXPANDING', recentAction: 'Great British Nuclear: SMR competition final selections', date: '2025-03' },
    { country: 'Germany', direction: 'PHASE-OUT', recentAction: 'Final 3 reactors shut down April 2023; no reversal planned', date: '2023-04' },
    { country: 'Belgium', direction: 'REVERSAL', recentAction: 'Extended Doel 4 & Tihange 3 by 10 years; reversed phase-out', date: '2024-01' },
    { country: 'Sweden', direction: 'EXPANDING', recentAction: 'Lifted cap on reactors; roadmap for new builds by 2035', date: '2025-02' },
    { country: 'Italy', direction: 'REVERSAL', recentAction: 'Government exploring SMR deployment; reversed 1987 ban', date: '2025-04' },
    { country: 'India', direction: 'EXPANDING', recentAction: '10 indigenous PHWRs approved; fleet to triple by 2032', date: '2025-08' },
    { country: 'Poland', direction: 'EXPANDING', recentAction: 'First nuclear plant approved; Westinghouse AP1000 selected', date: '2025-03' },
  ],
  timestamp: new Date().toISOString(),
};

// ── Formatting helpers ──

function fmtNum(n: number, decimals = 1): string {
  return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ── Sparkline SVG ──

function PriceSparkline({ data, width = 80, height = 16 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="rgba(74,222,128,0.6)"
        strokeWidth="1"
      />
      <circle
        cx={(data.length - 1) * stepX}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 2) - 1}
        r="1.5"
        fill="#4ade80"
      />
    </svg>
  );
}

// ── Badge helpers ──

function statusBadge(status: string): { text: string; cls: string } {
  switch (status) {
    case 'CONSTRUCTION':
      return { text: 'CONSTRUCTION', cls: 'text-yellow-400 bg-yellow-500/10' };
    case 'APPROVED':
      return { text: 'APPROVED', cls: 'text-blue-400 bg-blue-500/10' };
    case 'PLANNED':
      return { text: 'PLANNED', cls: 'text-neutral-400 bg-neutral-500/10' };
    default:
      return { text: status, cls: 'text-neutral-400 bg-neutral-500/10' };
  }
}

function directionBadge(direction: string): { text: string; cls: string } {
  switch (direction) {
    case 'EXPANDING':
      return { text: 'EXPANDING', cls: 'text-green-400 bg-green-500/10' };
    case 'MAINTAINING':
      return { text: 'MAINTAINING', cls: 'text-blue-400 bg-blue-500/10' };
    case 'PHASE-OUT':
      return { text: 'PHASE-OUT', cls: 'text-red-400 bg-red-500/10' };
    case 'REVERSAL':
      return { text: 'REVERSAL', cls: 'text-yellow-400 bg-yellow-500/10' };
    default:
      return { text: direction, cls: 'text-neutral-400 bg-neutral-500/10' };
  }
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-green-400/30">
      <div className="w-1 h-1 bg-green-400" />
      <span className="text-[7px] font-black uppercase tracking-widest text-green-400">{title}</span>
    </div>
  );
}

// ── Main Panel ──

export function NuclearEnergyPanel() {
  const { data: rawData, isLoading, refetch } = useNuclearEnergy();
  const data = rawData || FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-green-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Atom className="w-3.5 h-3.5 text-green-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-green-400">
            Nuclear Energy
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral-500">
            {data.overview.totalReactors} reactors
          </span>
          <span className="text-[7px] font-mono text-green-400">
            U<sub>3</sub>O<sub>8</sub> ${fmtNum(data.overview.uraniumSpotPrice, 2)}
          </span>
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral-500 hover:text-green-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !rawData ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-green-400/30 border-t-green-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {/* ── Overview ── */}
            <SectionHeader title="Overview" />
            <div className="grid grid-cols-3 gap-px bg-green-400/30 mx-0">
              {[
                { label: 'Operating Reactors', value: data.overview.totalReactors.toString() },
                { label: 'Capacity', value: `${fmtNum(data.overview.operatingCapacityGW)} GW` },
                { label: 'Share of Electricity', value: `${fmtNum(data.overview.shareOfElectricity)}%` },
                { label: 'Under Construction', value: data.overview.underConstruction.toString() },
                { label: 'Planned', value: data.overview.planned.toString() },
                { label: 'Uranium Spot', value: `$${fmtNum(data.overview.uraniumSpotPrice, 2)}/lb` },
              ].map((item: any, i: number) => (
                <div key={i} className="bg-black px-2 py-1.5">
                  <div className="text-[6px] text-neutral-500 uppercase tracking-wider">{item.label}</div>
                  <div className="text-[11px] font-bold text-white tabular-nums">{item.value}</div>
                </div>
              ))}
            </div>

            {/* ── Country Fleet ── */}
            <SectionHeader title="Country Fleet" />
            <div className="px-3 py-1 border-b border-border/20">
              <div className="grid grid-cols-[1.2fr_0.5fr_0.6fr_1.2fr_0.5fr_0.5fr_0.5fr] text-[6px] font-black text-neutral-500 uppercase tracking-wider">
                <span>Country</span>
                <span className="text-right">Reactors</span>
                <span className="text-right">GW</span>
                <span className="pl-2">Share %</span>
                <span className="text-right">Constr</span>
                <span className="text-right">Plan</span>
                <span className="text-right">Age</span>
              </div>
            </div>
            {data.countryFleet.map((c: any, i: number) => (
              <div
                key={i}
                className="grid grid-cols-[1.2fr_0.5fr_0.6fr_1.2fr_0.5fr_0.5fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors items-center"
              >
                <span className="text-[8px] font-bold text-white/80 truncate">{c.country}</span>
                <span className="text-right text-white/60 tabular-nums">{c.reactors}</span>
                <span className="text-right text-white/60 tabular-nums">{fmtNum(c.capacityGW)}</span>
                <div className="pl-2 flex items-center gap-1">
                  <div className="flex-1 h-1.5 bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full bg-green-400/50"
                      style={{ width: `${Math.min(c.sharePct, 100)}%` }}
                    />
                  </div>
                  <span className="text-[7px] text-green-400 tabular-nums w-8 text-right shrink-0">
                    {fmtNum(c.sharePct)}%
                  </span>
                </div>
                <span className="text-right text-yellow-400/70 tabular-nums">{c.underConstruction || '-'}</span>
                <span className="text-right text-blue-400/70 tabular-nums">{c.planned || '-'}</span>
                <span className="text-right text-neutral-500 tabular-nums">{fmtNum(c.fleetAge)}y</span>
              </div>
            ))}

            {/* ── Uranium Market ── */}
            <SectionHeader title="Uranium Market" />
            <div className="grid grid-cols-4 gap-px bg-green-400/30 mx-0">
              {[
                { label: 'Spot Price', value: `$${fmtNum(data.uraniumMarket.spotPrice, 2)}` },
                { label: 'Long-Term', value: `$${fmtNum(data.uraniumMarket.longTermPrice, 2)}` },
                { label: 'Conversion', value: `$${fmtNum(data.uraniumMarket.conversionPrice, 2)}` },
                { label: 'Enrichment (SWU)', value: `$${fmtNum(data.uraniumMarket.enrichmentPrice, 2)}` },
              ].map((item: any, i: number) => (
                <div key={i} className="bg-black px-2 py-1.5">
                  <div className="text-[6px] text-neutral-500 uppercase tracking-wider">{item.label}</div>
                  <div className="text-[10px] font-bold text-white tabular-nums">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="flex px-3 py-1.5 gap-4 border-b border-green-400/30">
              {/* Top Producers */}
              <div className="flex-1">
                <div className="text-[6px] text-neutral-500 uppercase tracking-wider mb-1">Top Producers</div>
                {data.uraniumMarket.topProducers.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-0.5 border-b border-border/20 hover:bg-green-400/[0.02]">
                    <span className="text-[8px] text-white/60">{p.name}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-1 bg-white/[0.04] overflow-hidden">
                        <div className="h-full bg-green-400/40" style={{ width: `${p.sharePct}%` }} />
                      </div>
                      <span className="text-[7px] text-green-400 tabular-nums w-8 text-right">{fmtNum(p.sharePct, 0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Price History Sparkline */}
              <div className="flex flex-col items-end justify-center">
                <div className="text-[6px] text-neutral-500 uppercase tracking-wider mb-1">Price History</div>
                <PriceSparkline data={data.uraniumMarket.priceHistory} width={90} height={24} />
                <div className="flex justify-between w-[90px] mt-0.5">
                  <span className="text-[5px] text-neutral-600">${Math.min(...data.uraniumMarket.priceHistory)}</span>
                  <span className="text-[5px] text-green-400">${Math.max(...data.uraniumMarket.priceHistory)}</span>
                </div>
              </div>
            </div>

            {/* ── New Build Pipeline ── */}
            <SectionHeader title="New Build Pipeline" />
            <div className="px-3 py-1 border-b border-border/20">
              <div className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.5fr_0.8fr_0.6fr_0.5fr] text-[6px] font-black text-neutral-500 uppercase tracking-wider">
                <span>Project</span>
                <span>Country</span>
                <span>Type</span>
                <span className="text-right">MW</span>
                <span className="text-center">Status</span>
                <span className="text-right">Comm.</span>
                <span className="text-right">$Bn</span>
              </div>
            </div>
            {data.newBuildPipeline.map((p: any, i: number) => {
              const badge = statusBadge(p.status);
              return (
                <div
                  key={i}
                  className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.5fr_0.8fr_0.6fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors items-center"
                >
                  <span className="text-[8px] font-bold text-white/80 truncate">{p.project}</span>
                  <span className="text-white/50 truncate">{p.country}</span>
                  <span className="text-white/40">{p.type}</span>
                  <span className="text-right text-white/60 tabular-nums">{p.capacityMW.toLocaleString()}</span>
                  <span className="text-center">
                    <span className={`px-1 py-0.5 text-[6px] font-black uppercase ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </span>
                  <span className="text-right text-white/50 tabular-nums">{p.commissioning}</span>
                  <span className="text-right text-white/50 tabular-nums">{fmtNum(p.costBn)}</span>
                </div>
              );
            })}

            {/* ── SMR Pipeline ── */}
            <SectionHeader title="SMR Pipeline" />
            <div className="px-3 py-1 border-b border-border/20">
              <div className="grid grid-cols-[1fr_1fr_0.5fr_0.8fr_0.7fr_0.4fr] text-[6px] font-black text-neutral-500 uppercase tracking-wider">
                <span>Design</span>
                <span>Developer</span>
                <span className="text-right">MW</span>
                <span className="text-center">Status</span>
                <span className="text-right">First Deploy</span>
                <span className="text-right">Orders</span>
              </div>
            </div>
            {data.smrPipeline.map((s: any, i: number) => {
              const badge = statusBadge(s.status);
              return (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_1fr_0.5fr_0.8fr_0.7fr_0.4fr] px-3 py-1 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors items-center"
                >
                  <span className="text-[8px] font-bold text-white/80 truncate">{s.design}</span>
                  <span className="text-white/50 truncate">{s.developer}</span>
                  <span className="text-right text-white/60 tabular-nums">{s.capacityMW}</span>
                  <span className="text-center">
                    <span className={`px-1 py-0.5 text-[6px] font-black uppercase ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </span>
                  <span className="text-right text-white/50 tabular-nums">{s.firstDeployment}</span>
                  <span className="text-right text-white/60 tabular-nums">{s.orders}</span>
                </div>
              );
            })}

            {/* ── Policy Tracker ── */}
            <SectionHeader title="Policy Tracker" />
            <div className="px-3 py-1 border-b border-border/20">
              <div className="grid grid-cols-[0.8fr_0.7fr_2fr_0.5fr] text-[6px] font-black text-neutral-500 uppercase tracking-wider">
                <span>Country</span>
                <span className="text-center">Direction</span>
                <span>Recent Action</span>
                <span className="text-right">Date</span>
              </div>
            </div>
            {data.policyTracker.map((p: any, i: number) => {
              const badge = directionBadge(p.direction);
              return (
                <div
                  key={i}
                  className="grid grid-cols-[0.8fr_0.7fr_2fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors items-center"
                >
                  <span className="text-[8px] font-bold text-white/80 truncate">{p.country}</span>
                  <span className="text-center">
                    <span className={`px-1 py-0.5 text-[6px] font-black uppercase ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </span>
                  <span className="text-white/40 truncate">{p.recentAction}</span>
                  <span className="text-right text-neutral-500 tabular-nums">{p.date}</span>
                </div>
              );
            })}

            {/* Footer timestamp */}
            <div className="px-3 py-1.5 border-t border-green-400/30 text-[6px] text-neutral-600">
              Updated {new Date(data.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
