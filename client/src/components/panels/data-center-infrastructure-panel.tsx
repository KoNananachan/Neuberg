import { useState } from 'react';
import { useDataCenterInfrastructure } from '../../api/hooks/use-data-center-infrastructure';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const VIOLET = '#a78bfa';
const GREEN = '#34d399';
const RED = '#f87171';
const AMBER = '#fbbf24';
const CYAN = '#22d3ee';

// ── Formatting helpers ──

function fmtNum(n: number, decimals = 1): string {
  return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtDollar(n: number): string {
  if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(1) + 'T';
  if (Math.abs(n) >= 1) return '$' + n.toFixed(1) + 'B';
  return '$' + (n * 1000).toFixed(0) + 'M';
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function changeColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

// ── Badge helpers ──

function availabilityStyle(status: string): { color: string; bg: string } {
  switch (status.toLowerCase()) {
    case 'tight':
    case 'constrained': return { color: RED, bg: 'rgba(248,113,113,0.12)' };
    case 'limited': return { color: AMBER, bg: 'rgba(251,191,36,0.10)' };
    case 'moderate': return { color: CYAN, bg: 'rgba(34,211,238,0.12)' };
    case 'available':
    case 'surplus': return { color: GREEN, bg: 'rgba(52,211,153,0.10)' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
  }
}

function supplyBadge(status: string): { color: string; bg: string } {
  switch (status.toLowerCase()) {
    case 'constrained':
    case 'critical': return { color: RED, bg: 'rgba(248,113,113,0.12)' };
    case 'tight':
    case 'limited': return { color: AMBER, bg: 'rgba(251,191,36,0.10)' };
    case 'moderate':
    case 'balanced': return { color: CYAN, bg: 'rgba(34,211,238,0.12)' };
    case 'available':
    case 'surplus': return { color: GREEN, bg: 'rgba(52,211,153,0.10)' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
  }
}

// ── Fallback Data ──

const FALLBACK_DATA = {
  markets: [
    { market: 'Northern Virginia', capacityMW: 5200, vacancyPct: 2.1, rentPerKW: 142, powerCostPerKWh: 0.065, underConstructionMW: 3400, absorptionMW: 1850, inventoryMSF: 42.8 },
    { market: 'Dallas/Ft. Worth', capacityMW: 2800, vacancyPct: 4.3, rentPerKW: 118, powerCostPerKWh: 0.058, underConstructionMW: 2100, absorptionMW: 920, inventoryMSF: 24.6 },
    { market: 'Phoenix/Mesa', capacityMW: 1900, vacancyPct: 3.8, rentPerKW: 125, powerCostPerKWh: 0.071, underConstructionMW: 1600, absorptionMW: 680, inventoryMSF: 16.2 },
    { market: 'Chicago', capacityMW: 1400, vacancyPct: 5.2, rentPerKW: 132, powerCostPerKWh: 0.078, underConstructionMW: 800, absorptionMW: 420, inventoryMSF: 18.4 },
    { market: 'Silicon Valley', capacityMW: 1200, vacancyPct: 1.8, rentPerKW: 185, powerCostPerKWh: 0.142, underConstructionMW: 600, absorptionMW: 380, inventoryMSF: 12.8 },
    { market: 'Columbus, OH', capacityMW: 950, vacancyPct: 6.4, rentPerKW: 108, powerCostPerKWh: 0.062, underConstructionMW: 1200, absorptionMW: 520, inventoryMSF: 10.2 },
    { market: 'London', capacityMW: 1100, vacancyPct: 2.6, rentPerKW: 168, powerCostPerKWh: 0.185, underConstructionMW: 700, absorptionMW: 340, inventoryMSF: 14.6 },
    { market: 'Frankfurt', capacityMW: 900, vacancyPct: 3.1, rentPerKW: 155, powerCostPerKWh: 0.198, underConstructionMW: 550, absorptionMW: 290, inventoryMSF: 11.8 },
    { market: 'Singapore', capacityMW: 600, vacancyPct: 1.4, rentPerKW: 195, powerCostPerKWh: 0.152, underConstructionMW: 350, absorptionMW: 180, inventoryMSF: 6.4 },
    { market: 'Tokyo', capacityMW: 800, vacancyPct: 2.9, rentPerKW: 178, powerCostPerKWh: 0.168, underConstructionMW: 450, absorptionMW: 240, inventoryMSF: 9.2 },
    { market: 'Amsterdam', capacityMW: 750, vacancyPct: 3.5, rentPerKW: 148, powerCostPerKWh: 0.172, underConstructionMW: 420, absorptionMW: 210, inventoryMSF: 8.6 },
    { market: 'Sydney', capacityMW: 520, vacancyPct: 4.1, rentPerKW: 138, powerCostPerKWh: 0.118, underConstructionMW: 380, absorptionMW: 165, inventoryMSF: 5.8 },
  ],
  hyperscalers: [
    { company: 'Microsoft', ticker: 'MSFT', capexBn: 80.0, yoyGrowth: 42.1, dcCount: 300, powerUsageGW: 4.8, pue: 1.12, aiCapexShare: 65.0 },
    { company: 'Amazon (AWS)', ticker: 'AMZN', capexBn: 100.0, yoyGrowth: 32.8, dcCount: 450, powerUsageGW: 5.5, pue: 1.10, aiCapexShare: 55.0 },
    { company: 'Alphabet (GCP)', ticker: 'GOOG', capexBn: 75.0, yoyGrowth: 55.3, dcCount: 180, powerUsageGW: 4.2, pue: 1.10, aiCapexShare: 64.0 },
    { company: 'Meta', ticker: 'META', capexBn: 45.0, yoyGrowth: 28.6, dcCount: 24, powerUsageGW: 2.8, pue: 1.08, aiCapexShare: 71.1 },
    { company: 'Oracle', ticker: 'ORCL', capexBn: 16.0, yoyGrowth: 88.2, dcCount: 85, powerUsageGW: 1.2, pue: 1.15, aiCapexShare: 65.6 },
    { company: 'Apple', ticker: 'AAPL', capexBn: 12.0, yoyGrowth: 15.2, dcCount: 14, powerUsageGW: 0.8, pue: 1.14, aiCapexShare: 41.7 },
    { company: 'ByteDance', ticker: 'PRIVATE', capexBn: 14.0, yoyGrowth: 62.5, dcCount: 22, powerUsageGW: 0.95, pue: 1.18, aiCapexShare: 78.6 },
  ],
  reits: [
    { company: 'Equinix', ticker: 'EQIX', marketCapBn: 82.4, divYieldPct: 1.9, ffoPerShare: 34.82, occupancyPct: 94.2, pipelineBn: 5.8, netDebtEbitda: 3.8 },
    { company: 'Digital Realty', ticker: 'DLR', marketCapBn: 58.6, divYieldPct: 2.8, ffoPerShare: 6.92, occupancyPct: 87.4, pipelineBn: 4.2, netDebtEbitda: 5.1 },
    { company: 'CyrusOne', ticker: 'CONE', marketCapBn: 14.8, divYieldPct: 0.0, ffoPerShare: 4.18, occupancyPct: 91.8, pipelineBn: 2.1, netDebtEbitda: 4.6 },
    { company: 'CoreSite', ticker: 'COR', marketCapBn: 10.2, divYieldPct: 3.1, ffoPerShare: 6.45, occupancyPct: 92.6, pipelineBn: 1.4, netDebtEbitda: 3.2 },
    { company: 'QTS Realty', ticker: 'QTS', marketCapBn: 8.4, divYieldPct: 0.0, ffoPerShare: 3.28, occupancyPct: 89.1, pipelineBn: 1.8, netDebtEbitda: 5.4 },
    { company: 'Switch', ticker: 'SWCH', marketCapBn: 7.6, divYieldPct: 0.5, ffoPerShare: 0.72, occupancyPct: 96.8, pipelineBn: 2.4, netDebtEbitda: 4.2 },
    { company: 'Vantage DC', ticker: 'PRIVATE', marketCapBn: 6.8, divYieldPct: 0.0, ffoPerShare: 0.0, occupancyPct: 93.4, pipelineBn: 3.6, netDebtEbitda: 5.8 },
    { company: 'GDS Holdings', ticker: 'GDS', marketCapBn: 5.2, divYieldPct: 0.0, ffoPerShare: 1.84, occupancyPct: 72.6, pipelineBn: 2.8, netDebtEbitda: 7.2 },
  ],
  aiGpu: {
    clusters: [
      { operator: 'Microsoft / OpenAI', gpuCount: 125000, gpuType: 'H100/B200', location: 'Iowa / Texas', powerMW: 450, status: 'OPERATIONAL' },
      { operator: 'xAI (Colossus)', gpuCount: 200000, gpuType: 'H100', location: 'Memphis, TN', powerMW: 600, status: 'EXPANDING' },
      { operator: 'Meta FAIR', gpuCount: 600000, gpuType: 'H100/B200', location: 'Multiple US', powerMW: 1800, status: 'OPERATIONAL' },
      { operator: 'Google DeepMind', gpuCount: 50000, gpuType: 'TPU v5p/v6', location: 'Oklahoma', powerMW: 180, status: 'OPERATIONAL' },
      { operator: 'Amazon (AWS)', gpuCount: 80000, gpuType: 'Trainium2/P5', location: 'Virginia / Oregon', powerMW: 320, status: 'EXPANDING' },
      { operator: 'Oracle (OCI)', gpuCount: 65000, gpuType: 'B200/GB200', location: 'Texas / Chicago', powerMW: 240, status: 'OPERATIONAL' },
      { operator: 'CoreWeave', gpuCount: 45000, gpuType: 'H100/B200', location: 'NJ / IL / TX', powerMW: 165, status: 'EXPANDING' },
      { operator: 'Lambda', gpuCount: 22000, gpuType: 'H100/A100', location: 'Texas / Utah', powerMW: 85, status: 'OPERATIONAL' },
    ],
    computeDemand: [
      { segment: 'LLM Training', demandGrowthPct: 142.0, spendBn: 48.2, supplyStatus: 'Constrained' },
      { segment: 'LLM Inference', demandGrowthPct: 218.0, spendBn: 62.4, supplyStatus: 'Tight' },
      { segment: 'Image/Video Gen', demandGrowthPct: 95.0, spendBn: 12.8, supplyStatus: 'Moderate' },
      { segment: 'Autonomous Vehicles', demandGrowthPct: 68.0, spendBn: 8.4, supplyStatus: 'Balanced' },
      { segment: 'Drug Discovery', demandGrowthPct: 82.0, spendBn: 5.6, supplyStatus: 'Moderate' },
      { segment: 'HPC / Scientific', demandGrowthPct: 34.0, spendBn: 14.2, supplyStatus: 'Available' },
    ],
    chipSupply: [
      { chip: 'NVIDIA B200', priceEst: 42000, leadTimeWeeks: 22, supplyStatus: 'Constrained', qtyShippedK: 480, marketSharePct: 72.4 },
      { chip: 'NVIDIA H100', priceEst: 28000, leadTimeWeeks: 8, supplyStatus: 'Available', qtyShippedK: 3200, marketSharePct: 0.0 },
      { chip: 'AMD MI350X', priceEst: 18000, leadTimeWeeks: 14, supplyStatus: 'Limited', qtyShippedK: 320, marketSharePct: 15.2 },
      { chip: 'Google TPU v6', priceEst: 0, leadTimeWeeks: 0, supplyStatus: 'Internal', qtyShippedK: 0, marketSharePct: 6.5 },
      { chip: 'AWS Trainium2', priceEst: 0, leadTimeWeeks: 0, supplyStatus: 'Internal', qtyShippedK: 0, marketSharePct: 3.1 },
      { chip: 'Intel Gaudi 3', priceEst: 12000, leadTimeWeeks: 6, supplyStatus: 'Available', qtyShippedK: 85, marketSharePct: 2.3 },
    ],
  },
};

// ── Tab type ──

type Tab = 'markets' | 'hyperscalers' | 'reits' | 'aigpu';

const TABS: { key: Tab; label: string }[] = [
  { key: 'markets', label: 'MARKETS' },
  { key: 'hyperscalers', label: 'HYPERSCALERS' },
  { key: 'reits', label: 'REITS' },
  { key: 'aigpu', label: 'AI/GPU' },
];

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 border-b border-violet-500/30">
      <div className="w-1 h-1 bg-violet-400" />
      <span className="text-[7px] font-black uppercase tracking-widest text-violet-400">{title}</span>
    </div>
  );
}

// ── Markets Tab ──

function MarketsTab({ markets }: { markets: typeof FALLBACK_DATA.markets }) {
  return (
    <>
      <SectionHeader title="Major Data Center Markets" />
      <div className="px-3 py-1 border-b border-border/20">
        <div className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.5fr_0.5fr_0.6fr_0.5fr] text-[7px] font-bold uppercase tracking-wider text-neutral-500">
          <span>Market</span>
          <span className="text-right">Cap MW</span>
          <span className="text-right">Vacancy</span>
          <span className="text-right">$/kW</span>
          <span className="text-right">Power</span>
          <span className="text-right">Constr MW</span>
          <span className="text-right">Absorp MW</span>
        </div>
      </div>
      {markets.map((m: any, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.5fr_0.5fr_0.6fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-violet-500/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white/80 truncate">{m.market}</span>
          <span className="text-right text-white/60 tabular-nums">{m.capacityMW.toLocaleString()}</span>
          <span className="text-right tabular-nums" style={{ color: m.vacancyPct < 3 ? RED : m.vacancyPct < 5 ? AMBER : GREEN }}>
            {fmtNum(m.vacancyPct)}%
          </span>
          <span className="text-right text-violet-400/80 tabular-nums font-bold">${m.rentPerKW}</span>
          <span className="text-right text-white/50 tabular-nums">${m.powerCostPerKWh.toFixed(3)}</span>
          <span className="text-right text-amber-400/70 tabular-nums">{m.underConstructionMW.toLocaleString()}</span>
          <span className="text-right text-white/40 tabular-nums">{m.absorptionMW.toLocaleString()}</span>
        </div>
      ))}
    </>
  );
}

// ── Hyperscalers Tab ──

function HyperscalersTab({ hyperscalers }: { hyperscalers: typeof FALLBACK_DATA.hyperscalers }) {
  return (
    <>
      <SectionHeader title="Hyperscaler Capex Tracker" />
      <div className="px-3 py-1 border-b border-border/20">
        <div className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.4fr_0.5fr_0.4fr_0.5fr] text-[7px] font-bold uppercase tracking-wider text-neutral-500">
          <span>Company</span>
          <span className="text-right">Capex $B</span>
          <span className="text-right">YoY</span>
          <span className="text-right">DCs</span>
          <span className="text-right">Power GW</span>
          <span className="text-right">PUE</span>
          <span className="text-right">AI %</span>
        </div>
      </div>
      {hyperscalers.map((h: any, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.4fr_0.5fr_0.4fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-violet-500/[0.02] transition-colors items-center"
        >
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-white/80 truncate">{h.company}</span>
            <span className="text-[7px] text-neutral-500">{h.ticker}</span>
          </div>
          <span className="text-right text-violet-400 tabular-nums font-bold">{fmtDollar(h.capexBn)}</span>
          <span className="text-right tabular-nums font-bold" style={{ color: changeColor(h.yoyGrowth) }}>
            {fmtPct(h.yoyGrowth)}
          </span>
          <span className="text-right text-white/60 tabular-nums">{h.dcCount}</span>
          <span className="text-right text-white/50 tabular-nums">{fmtNum(h.powerUsageGW)}</span>
          <span className="text-right tabular-nums" style={{ color: h.pue <= 1.1 ? GREEN : h.pue <= 1.15 ? AMBER : RED }}>
            {h.pue.toFixed(2)}
          </span>
          <span className="text-right text-violet-400/70 tabular-nums">{fmtNum(h.aiCapexShare)}%</span>
        </div>
      ))}

      {/* Capex summary bar */}
      <div className="grid grid-cols-3 gap-px bg-violet-500/30 mx-0 mt-px">
        {[
          { label: 'TOTAL CAPEX', value: fmtDollar(hyperscalers.reduce((s: number, h: any) => s + h.capexBn, 0)) },
          { label: 'AVG YOY GROWTH', value: fmtPct(hyperscalers.reduce((s: number, h: any) => s + h.yoyGrowth, 0) / hyperscalers.length) },
          { label: 'TOTAL POWER', value: fmtNum(hyperscalers.reduce((s: number, h: any) => s + h.powerUsageGW, 0)) + ' GW' },
        ].map((item: any, i: number) => (
          <div key={i} className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-neutral-500 uppercase tracking-wider">{item.label}</div>
            <div className="text-[11px] font-bold text-violet-400 tabular-nums">{item.value}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── REITs Tab ──

function ReitsTab({ reits }: { reits: typeof FALLBACK_DATA.reits }) {
  return (
    <>
      <SectionHeader title="Data Center REITs" />
      <div className="px-3 py-1 border-b border-border/20">
        <div className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr] text-[7px] font-bold uppercase tracking-wider text-neutral-500">
          <span>Company</span>
          <span className="text-right">Mkt Cap</span>
          <span className="text-right">Yield</span>
          <span className="text-right">FFO/Sh</span>
          <span className="text-right">Occup %</span>
          <span className="text-right">Pipeline</span>
          <span className="text-right">ND/EBITDA</span>
        </div>
      </div>
      {reits.map((r: any, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-violet-500/[0.02] transition-colors items-center"
        >
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-white/80 truncate">{r.company}</span>
            <span className="text-[7px] text-neutral-500">{r.ticker}</span>
          </div>
          <span className="text-right text-violet-400 tabular-nums font-bold">{fmtDollar(r.marketCapBn)}</span>
          <span className="text-right tabular-nums" style={{ color: r.divYieldPct > 0 ? GREEN : 'rgba(255,255,255,0.3)' }}>
            {r.divYieldPct > 0 ? fmtNum(r.divYieldPct) + '%' : '--'}
          </span>
          <span className="text-right text-white/60 tabular-nums">${fmtNum(r.ffoPerShare, 2)}</span>
          <span className="text-right tabular-nums">
            <span style={{ color: r.occupancyPct >= 90 ? GREEN : r.occupancyPct >= 80 ? AMBER : RED }}>
              {fmtNum(r.occupancyPct)}%
            </span>
          </span>
          <span className="text-right text-white/50 tabular-nums">{fmtDollar(r.pipelineBn)}</span>
          <span className="text-right tabular-nums" style={{ color: r.netDebtEbitda <= 4 ? GREEN : r.netDebtEbitda <= 6 ? AMBER : RED }}>
            {fmtNum(r.netDebtEbitda)}x
          </span>
        </div>
      ))}

      {/* Occupancy summary */}
      <div className="px-3 py-2 border-t border-violet-500/30">
        <div className="text-[7px] text-neutral-500 uppercase tracking-wider mb-1.5">Occupancy Distribution</div>
        <div className="flex gap-2">
          {reits.filter((r: any) => r.occupancyPct > 0).map((r: any, i: number) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div className="w-full h-1.5 bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${r.occupancyPct}%`,
                    backgroundColor: r.occupancyPct >= 90 ? GREEN : r.occupancyPct >= 80 ? AMBER : RED,
                    opacity: 0.5,
                  }}
                />
              </div>
              <span className="text-[6px] text-neutral-500 mt-0.5 truncate w-full text-center">{r.ticker}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── AI/GPU Tab ──

function AiGpuTab({ aiGpu }: { aiGpu: typeof FALLBACK_DATA.aiGpu }) {
  return (
    <>
      {/* GPU Clusters */}
      <SectionHeader title="GPU Cluster Deployments" />
      <div className="px-3 py-1 border-b border-border/20">
        <div className="grid grid-cols-[1.2fr_0.5fr_0.6fr_0.7fr_0.4fr_0.6fr] text-[7px] font-bold uppercase tracking-wider text-neutral-500">
          <span>Operator</span>
          <span className="text-right">GPUs</span>
          <span>Type</span>
          <span>Location</span>
          <span className="text-right">MW</span>
          <span className="text-center">Status</span>
        </div>
      </div>
      {aiGpu.clusters.map((c: any, i: number) => {
        const statusColor = c.status === 'OPERATIONAL' ? GREEN : c.status === 'EXPANDING' ? AMBER : CYAN;
        return (
          <div
            key={i}
            className="grid grid-cols-[1.2fr_0.5fr_0.6fr_0.7fr_0.4fr_0.6fr] px-3 py-1 border-b border-border/20 hover:bg-violet-500/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-bold text-white/80 truncate">{c.operator}</span>
            <span className="text-right text-violet-400 tabular-nums font-bold">{(c.gpuCount / 1000).toFixed(0)}K</span>
            <span className="text-white/40 truncate">{c.gpuType}</span>
            <span className="text-white/40 truncate">{c.location}</span>
            <span className="text-right text-white/50 tabular-nums">{c.powerMW.toLocaleString()}</span>
            <span className="text-center">
              <span
                className="px-1 py-0.5 text-[6px] font-black uppercase"
                style={{ color: statusColor, backgroundColor: statusColor + '18' }}
              >
                {c.status}
              </span>
            </span>
          </div>
        );
      })}

      {/* Compute Demand */}
      <SectionHeader title="Compute Demand by Segment" />
      <div className="px-3 py-1 border-b border-border/20">
        <div className="grid grid-cols-[1.2fr_0.6fr_0.5fr_0.6fr] text-[7px] font-bold uppercase tracking-wider text-neutral-500">
          <span>Segment</span>
          <span className="text-right">Demand Growth</span>
          <span className="text-right">Spend $B</span>
          <span className="text-center">Supply</span>
        </div>
      </div>
      {aiGpu.computeDemand.map((d: any, i: number) => {
        const ss = supplyBadge(d.supplyStatus);
        return (
          <div
            key={i}
            className="grid grid-cols-[1.2fr_0.6fr_0.5fr_0.6fr] px-3 py-1 border-b border-border/20 hover:bg-violet-500/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-bold text-white/80 truncate">{d.segment}</span>
            <span className="text-right tabular-nums font-bold" style={{ color: changeColor(d.demandGrowthPct) }}>
              {fmtPct(d.demandGrowthPct)}
            </span>
            <span className="text-right text-violet-400 tabular-nums font-bold">{fmtDollar(d.spendBn)}</span>
            <div className="flex justify-center">
              <span
                className="px-1 py-0.5 text-[6px] font-black uppercase"
                style={{ color: ss.color, backgroundColor: ss.bg }}
              >
                {d.supplyStatus}
              </span>
            </div>
          </div>
        );
      })}

      {/* Chip Supply */}
      <SectionHeader title="AI Chip Supply" />
      <div className="px-3 py-1 border-b border-border/20">
        <div className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.6fr_0.5fr] text-[7px] font-bold uppercase tracking-wider text-neutral-500">
          <span>Chip</span>
          <span className="text-right">Price Est</span>
          <span className="text-right">Lead Wks</span>
          <span className="text-center">Supply</span>
          <span className="text-right">Shipped K</span>
        </div>
      </div>
      {aiGpu.chipSupply.map((c: any, i: number) => {
        const ss = supplyBadge(c.supplyStatus);
        return (
          <div
            key={i}
            className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.6fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-violet-500/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-bold text-white/80 truncate">{c.chip}</span>
            <span className="text-right text-white/60 tabular-nums">
              {c.priceEst > 0 ? '$' + (c.priceEst / 1000).toFixed(0) + 'K' : '--'}
            </span>
            <span className="text-right text-white/50 tabular-nums">
              {c.leadTimeWeeks > 0 ? c.leadTimeWeeks + 'w' : '--'}
            </span>
            <div className="flex justify-center">
              <span
                className="px-1 py-0.5 text-[6px] font-black uppercase"
                style={{ color: ss.color, backgroundColor: ss.bg }}
              >
                {c.supplyStatus}
              </span>
            </div>
            <span className="text-right text-white/50 tabular-nums">
              {c.qtyShippedK > 0 ? c.qtyShippedK.toLocaleString() : '--'}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── Main Panel ──

export function DataCenterInfrastructurePanel() {
  const { data, isLoading, refetch } = useDataCenterInfrastructure();
  const [activeTab, setActiveTab] = useState<Tab>('markets');

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-violet-500/30 shrink-0">
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-violet-400">
            DATA CENTER INFRASTRUCTURE
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-white/30 animate-pulse">LOADING DATA CENTER DATA...</span>
        </div>
      </div>
    );
  }

  // No-data state
  if (!data && !isLoading) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-violet-500/30 shrink-0">
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-violet-400">
            DATA CENTER INFRASTRUCTURE
          </span>
          <button onClick={() => refetch()} className="p-1 text-white/30 hover:text-violet-400 transition-colors">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-red-400/60">FAILED TO LOAD DATA CENTER DATA</span>
        </div>
      </div>
    );
  }

  const d = data || FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-violet-500/30 shrink-0">
        <span className="text-[9px] font-black uppercase tracking-wider text-violet-400">
          DATA CENTER INFRASTRUCTURE
        </span>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-1.5 text-[8px] font-bold uppercase tracking-wider transition-colors ${
              activeTab === key
                ? 'text-violet-400 border-b border-violet-400 bg-violet-500/5'
                : 'text-neutral-500 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {activeTab === 'markets' && <MarketsTab markets={(d as any).markets || FALLBACK_DATA.markets} />}
        {activeTab === 'hyperscalers' && <HyperscalersTab hyperscalers={(d as any).hyperscalers || FALLBACK_DATA.hyperscalers} />}
        {activeTab === 'reits' && <ReitsTab reits={(d as any).reits || FALLBACK_DATA.reits} />}
        {activeTab === 'aigpu' && <AiGpuTab aiGpu={(d as any).aiGpu || FALLBACK_DATA.aiGpu} />}
      </div>
    </div>
  );
}
