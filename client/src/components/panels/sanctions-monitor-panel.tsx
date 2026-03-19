import { useState } from 'react';
import { useSanctionsMonitor } from '../../api/hooks/use-sanctions-monitor';
import { RefreshCw, Shield } from 'lucide-react';

// ── Types ──

interface SanctionsRegime {
  target: string;
  type: 'COMPREHENSIVE' | 'TARGETED' | 'SECTORAL';
  imposedBy: string;
  sectors: string[];
  entities: number;
  severity: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  measures?: RegimeMeasure[];
  tradeImpact?: TradeImpact;
  exemptions?: string[];
  complianceRequirements?: string[];
}

interface RegimeMeasure {
  name: string;
  description: string;
}

interface TradeImpact {
  preSanctionVolume: string;
  postSanctionVolume: string;
  reductionPct: number;
  estimatedCost: string;
}

interface RecentAction {
  date: string;
  actionType: 'NEW DESIGNATION' | 'REMOVAL' | 'UPDATE' | 'EXPANSION';
  target: string;
  authority: string;
  description: string;
}

interface ComplianceAlert {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  entity: string;
  issue: string;
  recommendation: string;
}

interface SanctionsMonitorData {
  summary: {
    totalRegimes: number;
    designatedEntities: number;
    newDesignationsYtd: number;
    removalsYtd: number;
    totalTradeAffected: string;
  };
  regimes: SanctionsRegime[];
  recentActions: RecentAction[];
  complianceAlerts: ComplianceAlert[];
}

// ── Fallback Data ──

const FALLBACK_DATA: SanctionsMonitorData = {
  summary: {
    totalRegimes: 38,
    designatedEntities: 14287,
    newDesignationsYtd: 1842,
    removalsYtd: 214,
    totalTradeAffected: '$2.1T',
  },
  regimes: [
    {
      target: 'Russia',
      type: 'COMPREHENSIVE',
      imposedBy: 'US/EU/G7/AU',
      sectors: ['Energy', 'Finance', 'Technology', 'Transport', 'Luxury'],
      entities: 4218,
      severity: 5,
      risk: 'CRITICAL',
      measures: [
        { name: 'SWIFT Disconnection', description: 'Major Russian banks excluded from SWIFT messaging system' },
        { name: 'Oil Price Cap', description: 'G7 price cap of $60/bbl on Russian crude oil exports' },
        { name: 'Asset Freeze', description: 'Central bank reserves frozen across G7 jurisdictions (~$300B)' },
        { name: 'Export Controls', description: 'Dual-use technology and semiconductor export ban' },
      ],
      tradeImpact: { preSanctionVolume: '$580B', postSanctionVolume: '$312B', reductionPct: 46.2, estimatedCost: '$268B' },
      exemptions: ['Agricultural commodities', 'Humanitarian goods', 'Licensed energy transactions'],
      complianceRequirements: ['Enhanced due diligence on all Russia-connected counterparties', 'Screening against consolidated SDN list', 'Price cap attestation for oil transactions'],
    },
    {
      target: 'Iran',
      type: 'COMPREHENSIVE',
      imposedBy: 'US/EU/UN',
      sectors: ['Oil', 'Banking', 'Metals', 'Petrochemicals', 'Shipping'],
      entities: 2841,
      severity: 5,
      risk: 'CRITICAL',
      measures: [
        { name: 'Oil Embargo', description: 'Full embargo on Iranian crude oil purchases' },
        { name: 'Financial Isolation', description: 'All major banks sanctioned, SWIFT access restricted' },
        { name: 'Metals & Mining', description: 'Ban on steel, aluminum, copper, and iron exports' },
      ],
      tradeImpact: { preSanctionVolume: '$110B', postSanctionVolume: '$38B', reductionPct: 65.5, estimatedCost: '$72B' },
      exemptions: ['Humanitarian trade via Swiss channel', 'Medical supplies'],
      complianceRequirements: ['Zero tolerance policy for Iran-nexus transactions', 'Vessel tracking for sanctions evasion'],
    },
    {
      target: 'North Korea',
      type: 'COMPREHENSIVE',
      imposedBy: 'UN/US/EU/JP/KR',
      sectors: ['All sectors', 'WMD', 'Luxury', 'Coal', 'Textiles'],
      entities: 892,
      severity: 5,
      risk: 'CRITICAL',
      measures: [
        { name: 'Total Trade Ban', description: 'Near-complete ban on all trade with DPRK entities' },
        { name: 'WMD Proliferation', description: 'UN resolutions targeting nuclear and missile programs' },
      ],
      tradeImpact: { preSanctionVolume: '$6.2B', postSanctionVolume: '$0.8B', reductionPct: 87.1, estimatedCost: '$5.4B' },
      exemptions: ['Humanitarian aid via approved channels'],
      complianceRequirements: ['Enhanced screening for DPRK front companies', 'Cyber threat monitoring for DPRK-linked IT workers'],
    },
    {
      target: 'China (Tech)',
      type: 'SECTORAL',
      imposedBy: 'US/NL/JP',
      sectors: ['Semiconductors', 'AI', 'Quantum', 'Supercomputing'],
      entities: 648,
      severity: 4,
      risk: 'HIGH',
      measures: [
        { name: 'Chip Export Controls', description: 'Advanced semiconductor manufacturing equipment restricted' },
        { name: 'Entity List', description: 'Key Chinese tech firms added to BIS Entity List' },
      ],
      tradeImpact: { preSanctionVolume: '$42B', postSanctionVolume: '$28B', reductionPct: 33.3, estimatedCost: '$14B' },
      exemptions: ['Consumer-grade chips below threshold', 'Legacy node equipment'],
      complianceRequirements: ['End-use verification for semiconductor exports', 'License requirement for Entity List entities'],
    },
    {
      target: 'Venezuela',
      type: 'SECTORAL',
      imposedBy: 'US/EU/CA',
      sectors: ['Oil', 'Gold', 'Finance', 'Government bonds'],
      entities: 412,
      severity: 3,
      risk: 'HIGH',
      measures: [
        { name: 'Oil Sector', description: 'PDVSA sanctions limiting oil exports and revenue' },
        { name: 'Gold Ban', description: 'Prohibition on gold sector transactions' },
      ],
      tradeImpact: { preSanctionVolume: '$32B', postSanctionVolume: '$14B', reductionPct: 56.3, estimatedCost: '$18B' },
      exemptions: ['Licensed humanitarian transactions', 'Certain Chevron operations'],
      complianceRequirements: ['OFAC license verification for Venezuela-related transactions'],
    },
    {
      target: 'Myanmar',
      type: 'TARGETED',
      imposedBy: 'US/EU/UK/CA',
      sectors: ['Military', 'Gems', 'Timber', 'State enterprises'],
      entities: 287,
      severity: 3,
      risk: 'MEDIUM',
    },
    {
      target: 'Belarus',
      type: 'COMPREHENSIVE',
      imposedBy: 'US/EU/UK',
      sectors: ['Potash', 'Petroleum', 'Finance', 'Technology'],
      entities: 318,
      severity: 4,
      risk: 'HIGH',
    },
    {
      target: 'Syria',
      type: 'COMPREHENSIVE',
      imposedBy: 'US/EU',
      sectors: ['Oil', 'Finance', 'Military', 'Government'],
      entities: 521,
      severity: 4,
      risk: 'HIGH',
    },
    {
      target: 'Cuba',
      type: 'COMPREHENSIVE',
      imposedBy: 'US',
      sectors: ['All sectors', 'Tourism', 'Finance'],
      entities: 234,
      severity: 3,
      risk: 'MEDIUM',
    },
    {
      target: 'Yemen (Houthis)',
      type: 'TARGETED',
      imposedBy: 'US/UN',
      sectors: ['Arms', 'Finance', 'Shipping'],
      entities: 156,
      severity: 3,
      risk: 'HIGH',
    },
  ],
  recentActions: [
    { date: '2026-03-18', actionType: 'NEW DESIGNATION', target: 'Russian Maritime Network LLC', authority: 'OFAC', description: 'Designated for facilitating Russian oil exports above price cap via shadow fleet' },
    { date: '2026-03-17', actionType: 'EXPANSION', target: 'China Semiconductor Sector', authority: 'BIS', description: 'Additional 14 Chinese entities added to Entity List for advanced chip diversion' },
    { date: '2026-03-15', actionType: 'NEW DESIGNATION', target: 'Iran Drone Program Entities', authority: 'EU Council', description: '8 entities designated for involvement in Iranian UAV production and export' },
    { date: '2026-03-14', actionType: 'UPDATE', target: 'Venezuela Oil License', authority: 'OFAC', description: 'General License 44A extended for Chevron operations through July 2026' },
    { date: '2026-03-13', actionType: 'REMOVAL', target: 'Sudan Transitional Gov Entities', authority: 'OFAC', description: '3 entities removed following humanitarian corridor agreement compliance' },
    { date: '2026-03-12', actionType: 'NEW DESIGNATION', target: 'DPRK Cyber Operations Unit', authority: 'OFAC/FBI', description: 'Lazarus Group sub-entities designated for cryptocurrency theft operations' },
    { date: '2026-03-11', actionType: 'EXPANSION', target: 'Russia Energy Sector', authority: 'EU Council', description: 'Extended oil price cap enforcement to additional tanker registration flags' },
    { date: '2026-03-10', actionType: 'UPDATE', target: 'Myanmar Gems Sector', authority: 'OFAC', description: 'Updated guidance on jade and ruby import prohibitions' },
    { date: '2026-03-09', actionType: 'NEW DESIGNATION', target: 'Houthi Maritime Operations', authority: 'OFAC', description: '5 entities designated for facilitating Red Sea shipping attacks' },
    { date: '2026-03-08', actionType: 'REMOVAL', target: 'Ethiopian Entities', authority: 'OFAC', description: 'Delisting of 2 entities following Pretoria peace agreement milestones' },
  ],
  complianceAlerts: [
    { severity: 'CRITICAL', entity: 'Shadow Fleet Vessel Tracking', issue: 'Increased AIS manipulation detected among Russia-linked oil tankers in Mediterranean', recommendation: 'Implement satellite-based vessel monitoring for all crude oil shipments from high-risk origins' },
    { severity: 'HIGH', entity: 'Chinese Tech Subsidiaries', issue: 'Entity List firms establishing new subsidiaries in third countries to circumvent export controls', recommendation: 'Screen all end-users in SE Asia and Middle East for Entity List affiliate connections' },
    { severity: 'HIGH', entity: 'Iran Financial Networks', issue: 'New hawala networks identified routing funds through UAE and Turkey exchange houses', recommendation: 'Enhanced KYC on all remittance flows to/from identified jurisdictions' },
    { severity: 'MEDIUM', entity: 'DPRK IT Workers', issue: 'North Korean IT workers using fraudulent identities on freelance platforms', recommendation: 'Verify identity documentation and payment routing for remote contractors' },
    { severity: 'LOW', entity: 'Cuba Tourism Sector', issue: 'Updated OFAC FAQ on authorized travel categories effective Q2 2026', recommendation: 'Review and update internal travel authorization procedures' },
  ],
};

// ── Color Helpers ──

function typeBadge(type: string): { text: string; bg: string } {
  switch (type) {
    case 'COMPREHENSIVE': return { text: 'text-red-400', bg: 'bg-red-400/10' };
    case 'TARGETED': return { text: 'text-orange-400', bg: 'bg-orange-400/10' };
    case 'SECTORAL': return { text: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    default: return { text: 'text-neutral-400', bg: 'bg-neutral-400/10' };
  }
}

function riskBadge(risk: string): { text: string; bg: string } {
  switch (risk) {
    case 'CRITICAL': return { text: 'text-red-400', bg: 'bg-red-400/10' };
    case 'HIGH': return { text: 'text-orange-400', bg: 'bg-orange-400/10' };
    case 'MEDIUM': return { text: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    case 'LOW': return { text: 'text-green-400', bg: 'bg-green-400/10' };
    default: return { text: 'text-neutral-400', bg: 'bg-neutral-400/10' };
  }
}

function actionColor(actionType: string): string {
  switch (actionType) {
    case 'NEW DESIGNATION': return 'text-red-400';
    case 'REMOVAL': return 'text-green-400';
    case 'UPDATE': return 'text-yellow-400';
    case 'EXPANSION': return 'text-orange-400';
    default: return 'text-neutral-400';
  }
}

function actionBg(actionType: string): string {
  switch (actionType) {
    case 'NEW DESIGNATION': return 'bg-red-400/10';
    case 'REMOVAL': return 'bg-green-400/10';
    case 'UPDATE': return 'bg-yellow-400/10';
    case 'EXPANSION': return 'bg-orange-400/10';
    default: return 'bg-neutral-400/10';
  }
}

function severityBarColor(level: number): string {
  if (level >= 5) return '#f87171';
  if (level >= 4) return '#fb923c';
  if (level >= 3) return '#fbbf24';
  if (level >= 2) return '#facc15';
  return '#4ade80';
}

function alertSeverityBadge(severity: string): { text: string; bg: string } {
  switch (severity) {
    case 'CRITICAL': return { text: 'text-red-400', bg: 'bg-red-400/10' };
    case 'HIGH': return { text: 'text-orange-400', bg: 'bg-orange-400/10' };
    case 'MEDIUM': return { text: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    case 'LOW': return { text: 'text-green-400', bg: 'bg-green-400/10' };
    default: return { text: 'text-neutral-400', bg: 'bg-neutral-400/10' };
  }
}

// ── Severity Bar ──

function SeverityBar({ level, max = 5 }: { level: number; max?: number }) {
  const pct = Math.min((level / max) * 100, 100);
  const color = severityBarColor(level);

  return (
    <div className="flex items-center gap-1">
      <div className="w-10 h-1.5 bg-white/[0.04] relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <span className="text-[7px] font-mono font-bold tabular-nums" style={{ color }}>
        {level}
      </span>
    </div>
  );
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-red-400/30">
      <div className="w-1 h-1 shrink-0 bg-red-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-red-400">
        {title}
      </span>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ summary }: { summary: SanctionsMonitorData['summary'] }) {
  const metrics = [
    { label: 'NEW DESIGNATIONS YTD', value: summary.newDesignationsYtd.toLocaleString(), color: 'text-red-400' },
    { label: 'REMOVALS YTD', value: summary.removalsYtd.toLocaleString(), color: 'text-green-400' },
    { label: 'TOTAL TRADE AFFECTED', value: summary.totalTradeAffected, color: 'text-orange-400' },
  ];

  return (
    <div className="grid grid-cols-3 border-b border-red-400/30 bg-black">
      {metrics.map((m) => (
        <div key={m.label} className="px-2 py-1.5 border-r border-red-400/10 last:border-r-0">
          <div className="text-[6px] font-mono uppercase tracking-wider text-neutral-500">
            {m.label}
          </div>
          <div className={`text-[10px] font-mono font-bold ${m.color}`}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Regimes Table ──

function RegimesTable({
  regimes,
  selectedTarget,
  onSelect,
}: {
  regimes: SanctionsRegime[];
  selectedTarget: string | null;
  onSelect: (target: string | null) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Target" align="left" />
            <ThCell label="Type" align="left" />
            <ThCell label="Imposed By" align="left" />
            <ThCell label="Sectors" align="left" />
            <ThCell label="Entities" align="right" />
            <ThCell label="Severity" align="left" />
            <ThCell label="Risk" align="left" />
          </tr>
        </thead>
        <tbody>
          {regimes.map((r) => {
            const tb = typeBadge(r.type);
            const rb = riskBadge(r.risk);
            const isSelected = selectedTarget === r.target;

            return (
              <tr
                key={r.target}
                className={`border-b border-border/10 cursor-pointer transition-colors ${
                  isSelected ? 'bg-red-400/[0.06]' : 'hover:bg-red-400/[0.02]'
                }`}
                onClick={() => onSelect(isSelected ? null : r.target)}
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className="text-white font-bold">{r.target}</span>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className={`text-[7px] font-black px-1 py-0.5 uppercase ${tb.text} ${tb.bg}`}>
                    {r.type}
                  </span>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-400">
                  {r.imposedBy}
                </td>
                <td className="px-1.5 py-1 text-left text-neutral-500 max-w-[140px] truncate">
                  {r.sectors.join(', ')}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold tabular-nums">
                  {r.entities.toLocaleString()}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <SeverityBar level={r.severity} />
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className={`text-[7px] font-black px-1 py-0.5 uppercase ${rb.text} ${rb.bg}`}>
                    {r.risk}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Selected Regime Detail ──

function RegimeDetail({ regime }: { regime: SanctionsRegime }) {
  return (
    <div className="px-3 py-2 border-b border-red-400/30 bg-[#050505]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-red-400">
          {regime.target} — DETAIL
        </span>
        <span className={`text-[6px] font-black px-1 py-0.5 uppercase ${typeBadge(regime.type).text} ${typeBadge(regime.type).bg}`}>
          {regime.type}
        </span>
      </div>

      {/* Key Measures */}
      {regime.measures && regime.measures.length > 0 && (
        <div className="mb-2">
          <div className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 mb-1">
            KEY MEASURES
          </div>
          {regime.measures.map((m, i) => (
            <div key={i} className="flex items-start gap-2 py-0.5">
              <span className="text-[7px] font-mono font-bold text-red-400 shrink-0 w-1">-</span>
              <div>
                <span className="text-[8px] font-mono font-bold text-white/70">{m.name}</span>
                <span className="text-[7px] font-mono text-neutral-500 ml-1">{m.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trade Impact */}
      {regime.tradeImpact && (
        <div className="mb-2">
          <div className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 mb-1">
            TRADE IMPACT
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <div className="text-[6px] font-mono text-neutral-600 uppercase">PRE-SANCTION</div>
              <div className="text-[9px] font-mono font-bold text-neutral-300">{regime.tradeImpact.preSanctionVolume}</div>
            </div>
            <div>
              <div className="text-[6px] font-mono text-neutral-600 uppercase">POST-SANCTION</div>
              <div className="text-[9px] font-mono font-bold text-neutral-300">{regime.tradeImpact.postSanctionVolume}</div>
            </div>
            <div>
              <div className="text-[6px] font-mono text-neutral-600 uppercase">REDUCTION</div>
              <div className="text-[9px] font-mono font-bold text-red-400">-{regime.tradeImpact.reductionPct.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[6px] font-mono text-neutral-600 uppercase">EST. COST</div>
              <div className="text-[9px] font-mono font-bold text-orange-400">{regime.tradeImpact.estimatedCost}</div>
            </div>
          </div>
        </div>
      )}

      {/* Exemptions */}
      {regime.exemptions && regime.exemptions.length > 0 && (
        <div className="mb-2">
          <div className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 mb-1">
            EXEMPTIONS
          </div>
          <div className="flex flex-wrap gap-1">
            {regime.exemptions.map((e, i) => (
              <span key={i} className="text-[7px] font-mono text-green-400/70 bg-green-400/[0.06] px-1 py-0.5">
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Requirements */}
      {regime.complianceRequirements && regime.complianceRequirements.length > 0 && (
        <div>
          <div className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 mb-1">
            COMPLIANCE REQUIREMENTS
          </div>
          {regime.complianceRequirements.map((c, i) => (
            <div key={i} className="flex items-start gap-2 py-0.5">
              <span className="text-[7px] font-mono font-bold text-yellow-400 shrink-0">!</span>
              <span className="text-[7px] font-mono text-neutral-400">{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Recent Actions Feed ──

function RecentActionsFeed({ actions }: { actions: RecentAction[] }) {
  return (
    <div className="max-h-[200px] overflow-auto no-scrollbar">
      {actions.map((a, i) => (
        <div
          key={i}
          className="flex items-start gap-2 px-3 py-1.5 border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
        >
          <span className="text-[7px] font-mono text-neutral-600 shrink-0 tabular-nums w-16">
            {a.date}
          </span>
          <span className={`text-[6px] font-black font-mono uppercase px-1 py-0.5 shrink-0 ${actionColor(a.actionType)} ${actionBg(a.actionType)}`}>
            {a.actionType}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-[8px] font-mono font-bold text-white/70">{a.target}</span>
            <span className="text-[7px] font-mono text-neutral-600 ml-1">({a.authority})</span>
            <div className="text-[7px] font-mono text-neutral-500 truncate">{a.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Compliance Alerts ──

function ComplianceAlerts({ alerts }: { alerts: ComplianceAlert[] }) {
  return (
    <div>
      {alerts.map((a, i) => {
        const badge = alertSeverityBadge(a.severity);
        return (
          <div
            key={i}
            className="flex items-start gap-2 px-3 py-1.5 border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
          >
            <span className={`text-[6px] font-black font-mono uppercase px-1 py-0.5 shrink-0 ${badge.text} ${badge.bg}`}>
              {a.severity}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-[8px] font-mono font-bold text-white/70">{a.entity}</span>
              <div className="text-[7px] font-mono text-neutral-500">{a.issue}</div>
              <div className="text-[7px] font-mono text-yellow-400/60 mt-0.5">{a.recommendation}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Table header cell ──

function ThCell({ label, align }: { label: string; align: 'left' | 'right' }) {
  return (
    <th
      className={`px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {label}
    </th>
  );
}

// ── Main Panel ──

export function SanctionsMonitorPanel() {
  const { data: rawData, isLoading } = useSanctionsMonitor();
  const [selectedRegime, setSelectedRegime] = useState<string | null>(null);

  const data: SanctionsMonitorData = (rawData as SanctionsMonitorData) ?? FALLBACK_DATA;

  const selectedRegimeData = selectedRegime
    ? data.regimes?.find((r) => r.target === selectedRegime)
    : null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-red-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-red-400">
            SANCTIONS MONITOR
          </span>
        </div>
        <div className="flex items-center gap-3">
          {data?.summary && (
            <>
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-mono text-neutral-600 uppercase">REGIMES</span>
                <span className="text-[9px] font-mono font-bold text-red-400 tabular-nums">
                  {data.summary.totalRegimes}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-mono text-neutral-600 uppercase">ENTITIES</span>
                <span className="text-[9px] font-mono font-bold text-neutral-300 tabular-nums">
                  {data.summary.designatedEntities.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && !rawData && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider animate-pulse">
            LOADING...
          </span>
        </div>
      )}

      {/* No data */}
      {!data && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            NO DATA AVAILABLE
          </span>
        </div>
      )}

      {/* Content */}
      {data && (
        <div className="flex-1 overflow-auto no-scrollbar text-[9px] font-mono">
          {/* Summary Bar */}
          {data.summary && <SummaryBar summary={data.summary} />}

          {/* Sanctions Regimes Table */}
          {data.regimes && data.regimes.length > 0 && (
            <>
              <SectionHeader title="SANCTIONS REGIMES" />
              <RegimesTable
                regimes={data.regimes}
                selectedTarget={selectedRegime}
                onSelect={setSelectedRegime}
              />
            </>
          )}

          {/* Selected Regime Detail */}
          {selectedRegimeData && <RegimeDetail regime={selectedRegimeData} />}

          {/* Recent Actions Feed */}
          {data.recentActions && data.recentActions.length > 0 && (
            <>
              <SectionHeader title="RECENT ACTIONS" />
              <RecentActionsFeed actions={data.recentActions} />
            </>
          )}

          {/* Compliance Alerts */}
          {data.complianceAlerts && data.complianceAlerts.length > 0 && (
            <>
              <SectionHeader title="COMPLIANCE ALERTS" />
              <ComplianceAlerts alerts={data.complianceAlerts} />
            </>
          )}

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
