import { useState } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { useCyberRiskInsurance } from '../../api/hooks/use-cyber-risk-insurance';

// ── Fallback Data ──

const FALLBACK_DATA = {
  insurerMarket: [
    { insurer: 'Chubb', marketShare: 14.2, gwp: 2.10, lossRatio: 62.8, combinedRatio: 88.5, premiumChange: 12.4, capacity: 850 },
    { insurer: 'AIG', marketShare: 11.8, gwp: 1.75, lossRatio: 71.2, combinedRatio: 97.3, premiumChange: 8.6, capacity: 720 },
    { insurer: 'Beazley', marketShare: 9.4, gwp: 1.39, lossRatio: 58.4, combinedRatio: 82.1, premiumChange: 15.2, capacity: 580 },
    { insurer: 'Zurich', marketShare: 8.1, gwp: 1.20, lossRatio: 65.1, combinedRatio: 91.4, premiumChange: 9.8, capacity: 650 },
    { insurer: 'Travelers', marketShare: 6.9, gwp: 1.02, lossRatio: 69.8, combinedRatio: 95.1, premiumChange: 7.2, capacity: 520 },
    { insurer: 'Allianz', marketShare: 6.2, gwp: 0.92, lossRatio: 63.5, combinedRatio: 89.8, premiumChange: 11.0, capacity: 480 },
    { insurer: 'Hiscox', marketShare: 5.4, gwp: 0.80, lossRatio: 54.2, combinedRatio: 78.6, premiumChange: 18.4, capacity: 420 },
    { insurer: 'Axis Capital', marketShare: 4.8, gwp: 0.71, lossRatio: 67.4, combinedRatio: 93.2, premiumChange: 6.5, capacity: 380 },
    { insurer: 'Coalition', marketShare: 3.6, gwp: 0.53, lossRatio: 48.8, combinedRatio: 74.2, premiumChange: 22.8, capacity: 300 },
    { insurer: 'Corvus', marketShare: 2.9, gwp: 0.43, lossRatio: 52.1, combinedRatio: 79.5, premiumChange: 19.6, capacity: 250 },
  ],
  threatLandscape: [
    { type: 'RANSOMWARE', frequency: 412, avgCost: 4.88, yoyChange: 18.4, targetedSector: 'Healthcare', mitigationRate: 34.2 },
    { type: 'PHISHING', frequency: 1842, avgCost: 1.24, yoyChange: 12.6, targetedSector: 'Financial Services', mitigationRate: 52.8 },
    { type: 'SUPPLY CHAIN', frequency: 198, avgCost: 6.42, yoyChange: 28.5, targetedSector: 'Technology', mitigationRate: 22.4 },
    { type: 'ZERO-DAY', frequency: 47, avgCost: 8.94, yoyChange: 35.2, targetedSector: 'Government', mitigationRate: 14.8 },
    { type: 'DDoS', frequency: 2456, avgCost: 0.52, yoyChange: -4.2, targetedSector: 'E-Commerce', mitigationRate: 68.4 },
    { type: 'INSIDER THREAT', frequency: 287, avgCost: 3.18, yoyChange: 8.8, targetedSector: 'Finance', mitigationRate: 28.6 },
    { type: 'APT', frequency: 86, avgCost: 12.45, yoyChange: 22.1, targetedSector: 'Defense', mitigationRate: 18.2 },
    { type: 'BEC', frequency: 624, avgCost: 2.76, yoyChange: 15.4, targetedSector: 'Manufacturing', mitigationRate: 42.1 },
    { type: 'CREDENTIAL STUFFING', frequency: 3218, avgCost: 0.34, yoyChange: -8.6, targetedSector: 'Retail', mitigationRate: 74.2 },
  ],
  sectorRiskProfiles: [
    { sector: 'Healthcare', breachCost: 10.93, containmentDays: 287, adoptionPct: 42.6, premium: 385, attackVector: 'PHISHING' },
    { sector: 'Financial Services', breachCost: 5.90, containmentDays: 224, adoptionPct: 78.4, premium: 312, attackVector: 'CREDENTIAL' },
    { sector: 'Energy', breachCost: 4.72, containmentDays: 329, adoptionPct: 38.2, premium: 428, attackVector: 'RANSOMWARE' },
    { sector: 'Technology', breachCost: 4.97, containmentDays: 200, adoptionPct: 82.6, premium: 245, attackVector: 'ZERO-DAY' },
    { sector: 'Government', breachCost: 4.18, containmentDays: 379, adoptionPct: 24.8, premium: 512, attackVector: 'APT' },
    { sector: 'Manufacturing', breachCost: 4.47, containmentDays: 312, adoptionPct: 35.4, premium: 368, attackVector: 'RANSOMWARE' },
    { sector: 'Retail', breachCost: 3.28, containmentDays: 260, adoptionPct: 56.2, premium: 198, attackVector: 'MALWARE' },
    { sector: 'Education', breachCost: 3.65, containmentDays: 352, adoptionPct: 18.4, premium: 442, attackVector: 'RANSOMWARE' },
    { sector: 'Telecom', breachCost: 4.01, containmentDays: 232, adoptionPct: 64.8, premium: 276, attackVector: 'SUPPLY CHAIN' },
  ],
  recentIncidents: [
    { org: 'National Health Corp', type: 'RANSOMWARE', impact: '$2.4B', recordsAffected: 112000000, coverage: 'PARTIAL' },
    { org: 'MegaBank Intl', type: 'APT', impact: '$1.8B', recordsAffected: 78000000, coverage: 'COVERED' },
    { org: 'Federal Energy Grid', type: 'SUPPLY CHAIN', impact: '$3.2B', recordsAffected: 45000000, coverage: 'DENIED' },
    { org: 'CloudServe Pro', type: 'ZERO-DAY', impact: '$1.5B', recordsAffected: 89000000, coverage: 'PENDING' },
    { org: 'GlobalRetail Inc', type: 'CREDENTIAL', impact: '$0.9B', recordsAffected: 34000000, coverage: 'COVERED' },
    { org: 'Defense Systems Ltd', type: 'APT', impact: '$4.1B', recordsAffected: 12000000, coverage: 'EXCLUDED' },
    { org: 'EduNet Alliance', type: 'RANSOMWARE', impact: '$0.7B', recordsAffected: 28000000, coverage: 'PARTIAL' },
    { org: 'AutoMfg Global', type: 'INSIDER', impact: '$1.1B', recordsAffected: 18000000, coverage: 'COVERED' },
    { org: 'TelcoNet Corp', type: 'DDoS', impact: '$0.4B', recordsAffected: 8500000, coverage: 'COVERED' },
  ],
};

// ── Types ──

type Tab = 'INSURANCE' | 'THREATS' | 'SECTORS' | 'INCIDENTS';

// ── Helpers ──

function lossRatioColor(ratio: number): string {
  if (ratio > 70) return 'text-red-400';
  if (ratio > 60) return 'text-amber-400';
  return 'text-green-400';
}

function combinedRatioColor(ratio: number): string {
  return ratio >= 100 ? 'text-red-400' : ratio >= 90 ? 'text-amber-400' : 'text-green-400';
}

function coverageBadgeStyle(coverage: string): string {
  switch (coverage) {
    case 'COVERED': return 'text-green-400 bg-green-400/10';
    case 'PARTIAL': return 'text-amber-400 bg-amber-400/10';
    case 'DENIED': return 'text-red-400 bg-red-400/10';
    case 'EXCLUDED': return 'text-red-400 bg-red-400/10';
    case 'PENDING': return 'text-neutral-400 bg-neutral-400/10';
    default: return 'text-neutral-500 bg-neutral-500/10';
  }
}

function threatTypeBadgeStyle(_type: string): string {
  return 'text-red-400/80 bg-red-400/5';
}

function vectorBadgeStyle(_v: string): string {
  return 'text-red-400/80 bg-red-400/5';
}

function adoptionBarColor(pct: number): string {
  if (pct >= 70) return '#34d399';
  if (pct >= 40) return '#fbbf24';
  return '#f87171';
}

function mitigationColor(rate: number): string {
  if (rate >= 60) return 'text-green-400';
  if (rate >= 30) return 'text-amber-400';
  return 'text-red-400';
}

function fmtRecords(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

// ── Main Panel ──

export function CyberRiskInsurancePanel() {
  const { data: rawData, isLoading, refetch } = useCyberRiskInsurance();
  const [activeTab, setActiveTab] = useState<Tab>('INSURANCE');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (rawData as any) ?? FALLBACK_DATA;
  const insurerMarket = d.insurerMarket ?? FALLBACK_DATA.insurerMarket;
  const threatLandscape = d.threatLandscape ?? FALLBACK_DATA.threatLandscape;
  const sectorRiskProfiles = d.sectorRiskProfiles ?? FALLBACK_DATA.sectorRiskProfiles;
  const recentIncidents = d.recentIncidents ?? FALLBACK_DATA.recentIncidents;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-red-500/30 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-red-400">
            CYBER RISK & INSURANCE
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex border-b border-red-500/30 shrink-0">
        <div className="flex gap-px px-2 py-1 flex-1">
          {(['INSURANCE', 'THREATS', 'SECTORS', 'INCIDENTS'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? 'text-red-400 border-b border-red-400'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !rawData && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase tracking-widest animate-pulse">
            LOADING CYBER RISK DATA...
          </div>
        )}

        {!rawData && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {activeTab === 'INSURANCE' && <InsuranceTab data={insurerMarket} />}
        {activeTab === 'THREATS' && <ThreatsTab data={threatLandscape} />}
        {activeTab === 'SECTORS' && <SectorsTab data={sectorRiskProfiles} />}
        {activeTab === 'INCIDENTS' && <IncidentsTab data={recentIncidents} />}
      </div>
    </div>
  );
}

// ── Tab 1: Insurance ──

function InsuranceTab({ data }: { data: typeof FALLBACK_DATA.insurerMarket }) {
  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <div className="w-1 h-1 bg-red-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-red-400">
          Insurer Market
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.7fr_0.7fr_0.5fr] gap-1 px-1 mb-1">
        {['INSURER', 'MKT SHARE', 'GWP', 'LOSS R', 'COMB R', 'PREM CHG', 'CAP'].map((h) => (
          <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">
            {h}
          </span>
        ))}
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {data.map((row: any) => (
        <div
          key={row.insurer}
          className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.7fr_0.7fr_0.5fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-neutral-300 truncate">{row.insurer}</span>
          <span className="text-[8px] text-neutral-300 tabular-nums">{row.marketShare}%</span>
          <span className="text-[8px] text-white font-bold tabular-nums">${row.gwp.toFixed(2)}B</span>
          <span className={`text-[8px] font-bold tabular-nums ${lossRatioColor(row.lossRatio)}`}>
            {row.lossRatio}%
          </span>
          <span className={`text-[8px] font-bold tabular-nums ${combinedRatioColor(row.combinedRatio)}`}>
            {row.combinedRatio}%
          </span>
          <span className="text-[8px] text-red-400 font-bold tabular-nums">
            +{row.premiumChange}%
          </span>
          <span className="text-[8px] text-neutral-400 tabular-nums">${row.capacity}M</span>
        </div>
      ))}
    </div>
  );
}

// ── Tab 2: Threats ──

function ThreatsTab({ data }: { data: typeof FALLBACK_DATA.threatLandscape }) {
  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <div className="w-1 h-1 bg-red-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-red-400">
          Threat Landscape
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_1fr_0.6fr] gap-1 px-1 mb-1">
        {['TYPE', 'FREQ', 'AVG COST', 'YOY CHG', 'TARGET', 'MITIG'].map((h) => (
          <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">
            {h}
          </span>
        ))}
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {data.map((row: any) => (
        <div
          key={row.type}
          className="grid grid-cols-[1fr_0.6fr_0.6fr_0.6fr_1fr_0.6fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className={`text-[6px] font-bold px-1 py-0.5 text-center ${threatTypeBadgeStyle(row.type)}`}>
            {row.type}
          </span>
          <span className="text-[8px] text-white font-bold tabular-nums">{row.frequency.toLocaleString()}</span>
          <span className="text-[8px] text-red-400 font-bold tabular-nums">${row.avgCost.toFixed(2)}M</span>
          <span className={`text-[8px] font-bold tabular-nums ${row.yoyChange >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            {row.yoyChange >= 0 ? '+' : ''}{row.yoyChange}%
          </span>
          <span className="text-[8px] text-neutral-300 truncate">{row.targetedSector}</span>
          <span className={`text-[8px] font-bold tabular-nums ${mitigationColor(row.mitigationRate)}`}>
            {row.mitigationRate}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Tab 3: Sectors ──

function SectorsTab({ data }: { data: typeof FALLBACK_DATA.sectorRiskProfiles }) {
  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <div className="w-1 h-1 bg-red-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-red-400">
          Sector Risk Profiles
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1.1fr_0.6fr_0.7fr_0.8fr_0.6fr_0.8fr] gap-1 px-1 mb-1">
        {['SECTOR', 'BREACH $', 'CONTAIN', 'ADOPTION', 'PREM', 'VECTOR'].map((h) => (
          <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">
            {h}
          </span>
        ))}
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {data.map((row: any) => (
        <div
          key={row.sector}
          className="grid grid-cols-[1.1fr_0.6fr_0.7fr_0.8fr_0.6fr_0.8fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-neutral-300 truncate uppercase">{row.sector}</span>
          <span className="text-[8px] text-red-400 font-bold tabular-nums">${row.breachCost.toFixed(1)}M</span>
          <span className="text-[8px] text-neutral-400 tabular-nums">{row.containmentDays}d</span>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-1.5 bg-neutral-900 relative">
              <div
                className="absolute top-0 left-0 h-full"
                style={{ width: `${Math.min(row.adoptionPct, 100)}%`, backgroundColor: adoptionBarColor(row.adoptionPct), opacity: 0.7 }}
              />
            </div>
            <span className="text-[7px] font-bold tabular-nums w-7 text-right" style={{ color: adoptionBarColor(row.adoptionPct) }}>
              {row.adoptionPct}%
            </span>
          </div>
          <span className="text-[8px] text-white font-bold tabular-nums">${row.premium}</span>
          <span className={`text-[6px] font-bold px-1 py-0.5 text-center ${vectorBadgeStyle(row.attackVector)}`}>
            {row.attackVector}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Tab 4: Incidents ──

function IncidentsTab({ data }: { data: typeof FALLBACK_DATA.recentIncidents }) {
  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <div className="w-1 h-1 bg-red-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-red-400">
          Recent Major Incidents
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1.2fr_0.7fr_0.5fr_0.6fr_0.6fr] gap-1 px-1 mb-1">
        {['ORGANIZATION', 'TYPE', 'IMPACT', 'RECORDS', 'COVERAGE'].map((h) => (
          <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">
            {h}
          </span>
        ))}
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {data.map((row: any, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1.2fr_0.7fr_0.5fr_0.6fr_0.6fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-red-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-neutral-300 truncate">{row.org}</span>
          <span className={`text-[6px] font-bold px-1 py-0.5 text-center ${threatTypeBadgeStyle(row.type)}`}>
            {row.type}
          </span>
          <span className="text-[8px] text-red-400 font-bold tabular-nums">{row.impact}</span>
          <span className="text-[8px] text-white font-bold tabular-nums">{fmtRecords(row.recordsAffected)}</span>
          <span className={`text-[6px] font-bold px-1 py-0.5 text-center ${coverageBadgeStyle(row.coverage)}`}>
            {row.coverage}
          </span>
        </div>
      ))}
    </div>
  );
}
