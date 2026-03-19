import { ShieldAlert } from 'lucide-react';
import { useCybersecurity } from '../../api/hooks/use-cybersecurity';

// ── Fallback Data ──

const FALLBACK_DATA = {
  threatLevel: 7.8,
  threatLabel: 'ELEVATED',
  cybercrimeCostYearly: 9.5,
  overview: {
    crimeCostYearly: 9.5,
    avgBreachCost: 4.88,
    ransomwarePerDay: 24,
    avgRansomPayment: 1.54,
    cvesYTD: 18420,
    criticalVulns: 1247,
  },
  sectorRisk: [
    { sector: 'Healthcare', riskScore: 92, breachesYTD: 387, avgCost: 10.93, detectDays: 212, containDays: 75, topVector: 'PHISHING', trend: 'up' },
    { sector: 'Financial Services', riskScore: 88, breachesYTD: 312, avgCost: 5.90, detectDays: 168, containDays: 56, topVector: 'CREDENTIAL', trend: 'up' },
    { sector: 'Energy', riskScore: 85, breachesYTD: 198, avgCost: 4.72, detectDays: 245, containDays: 84, topVector: 'RANSOMWARE', trend: 'up' },
    { sector: 'Government', riskScore: 82, breachesYTD: 276, avgCost: 4.18, detectDays: 287, containDays: 92, topVector: 'APT', trend: 'stable' },
    { sector: 'Technology', riskScore: 78, breachesYTD: 245, avgCost: 4.97, detectDays: 152, containDays: 48, topVector: 'ZERO-DAY', trend: 'down' },
    { sector: 'Manufacturing', riskScore: 76, breachesYTD: 189, avgCost: 4.47, detectDays: 234, containDays: 78, topVector: 'RANSOMWARE', trend: 'up' },
    { sector: 'Retail', riskScore: 71, breachesYTD: 156, avgCost: 3.28, detectDays: 198, containDays: 62, topVector: 'MALWARE', trend: 'stable' },
    { sector: 'Education', riskScore: 68, breachesYTD: 142, avgCost: 3.65, detectDays: 264, containDays: 88, topVector: 'RANSOMWARE', trend: 'up' },
    { sector: 'Telecom', riskScore: 65, breachesYTD: 118, avgCost: 4.01, detectDays: 178, containDays: 54, topVector: 'SUPPLY CHAIN', trend: 'stable' },
  ],
  majorBreaches: [
    { org: 'National Health Corp', sector: 'Healthcare', date: '2026-02-18', recordsAffected: 112000000, costEstimate: 2.4, attackType: 'RANSOMWARE', attribution: 'CRIMINAL' },
    { org: 'MegaBank Intl', sector: 'Finance', date: '2026-01-22', recordsAffected: 78000000, costEstimate: 1.8, attackType: 'APT', attribution: 'NATION-STATE' },
    { org: 'Federal Energy Grid', sector: 'Energy', date: '2026-03-05', recordsAffected: 45000000, costEstimate: 3.2, attackType: 'SUPPLY CHAIN', attribution: 'NATION-STATE' },
    { org: 'CloudServe Pro', sector: 'Technology', date: '2026-02-28', recordsAffected: 89000000, costEstimate: 1.5, attackType: 'ZERO-DAY', attribution: 'UNKNOWN' },
    { org: 'GlobalRetail Inc', sector: 'Retail', date: '2026-01-10', recordsAffected: 34000000, costEstimate: 0.9, attackType: 'CREDENTIAL', attribution: 'CRIMINAL' },
    { org: 'Defense Systems Ltd', sector: 'Government', date: '2026-03-12', recordsAffected: 12000000, costEstimate: 4.1, attackType: 'APT', attribution: 'NATION-STATE' },
    { org: 'EduNet Alliance', sector: 'Education', date: '2026-02-04', recordsAffected: 28000000, costEstimate: 0.7, attackType: 'RANSOMWARE', attribution: 'CRIMINAL' },
    { org: 'AutoMfg Global', sector: 'Manufacturing', date: '2026-01-30', recordsAffected: 18000000, costEstimate: 1.1, attackType: 'INSIDER', attribution: 'INSIDER' },
  ],
  ransomwareGroups: [
    { group: 'LockBit 4.0', attacksYTD: 412, avgDemand: 4.2, avgPayment: 1.8, targetSectors: 'Healthcare, Finance', status: 'ACTIVE' },
    { group: 'BlackCat/ALPHV', attacksYTD: 287, avgDemand: 3.8, avgPayment: 1.5, targetSectors: 'Energy, Govt', status: 'REBRANDED' },
    { group: 'Cl0p', attacksYTD: 198, avgDemand: 5.1, avgPayment: 2.2, targetSectors: 'Tech, Finance', status: 'ACTIVE' },
    { group: 'Play', attacksYTD: 165, avgDemand: 2.4, avgPayment: 0.9, targetSectors: 'Mfg, Retail', status: 'ACTIVE' },
    { group: 'Royal/BlackSuit', attacksYTD: 142, avgDemand: 3.2, avgPayment: 1.4, targetSectors: 'Healthcare, Edu', status: 'ACTIVE' },
    { group: 'Akira', attacksYTD: 128, avgDemand: 1.8, avgPayment: 0.7, targetSectors: 'SMB, Mfg', status: 'ACTIVE' },
    { group: 'Hive', attacksYTD: 0, avgDemand: 0, avgPayment: 0, targetSectors: 'N/A', status: 'DISRUPTED' },
    { group: 'Conti', attacksYTD: 0, avgDemand: 0, avgPayment: 0, targetSectors: 'N/A', status: 'DISRUPTED' },
  ],
  vulnerabilityMetrics: {
    totalCVEs: 18420,
    criticalCVEs: 1247,
    highCVEs: 4832,
    mediumCVEs: 8456,
    lowCVEs: 3885,
    zeroDaysExploited: 47,
    avgPatchTime: 62,
    patchAdoptionRate: 34.2,
    topVendors: [
      { vendor: 'Microsoft', cves: 1842, critical: 187 },
      { vendor: 'Google', cves: 1256, critical: 98 },
      { vendor: 'Apple', cves: 892, critical: 72 },
      { vendor: 'Cisco', cves: 745, critical: 89 },
      { vendor: 'Adobe', cves: 612, critical: 54 },
      { vendor: 'Oracle', cves: 584, critical: 67 },
      { vendor: 'Linux Kernel', cves: 478, critical: 42 },
      { vendor: 'Fortinet', cves: 312, critical: 38 },
    ],
  },
  cyberInsurance: {
    globalPremiums: 14.8,
    premiumGrowthYoY: 18.5,
    avgRateIncrease: 11.2,
    lossRatio: 67.4,
    denialRate: 24.8,
    avgCoverage: 5.2,
    topInsurers: [
      { insurer: 'Chubb', marketShare: 14.2, premiumVol: 2.1, lossRatio: 62.8 },
      { insurer: 'AIG', marketShare: 11.8, premiumVol: 1.75, lossRatio: 71.2 },
      { insurer: 'Beazley', marketShare: 9.4, premiumVol: 1.39, lossRatio: 58.4 },
      { insurer: 'Zurich', marketShare: 8.1, premiumVol: 1.20, lossRatio: 65.1 },
      { insurer: 'Travelers', marketShare: 6.9, premiumVol: 1.02, lossRatio: 69.8 },
      { insurer: 'Allianz', marketShare: 6.2, premiumVol: 0.92, lossRatio: 63.5 },
    ],
  },
};

// ── Helpers ──

function threatLevelColor(level: number): string {
  if (level >= 9) return 'text-red-500';
  if (level >= 7) return 'text-red-400';
  if (level >= 5) return 'text-orange-400';
  if (level >= 3) return 'text-amber-400';
  return 'text-green-400';
}

function threatLevelBg(level: number): string {
  if (level >= 9) return 'bg-red-500/10';
  if (level >= 7) return 'bg-red-400/10';
  if (level >= 5) return 'bg-orange-400/10';
  if (level >= 3) return 'bg-amber-400/10';
  return 'bg-green-400/10';
}

function riskBarColor(score: number): string {
  if (score >= 85) return '#f87171';
  if (score >= 70) return '#fb923c';
  if (score >= 50) return '#fbbf24';
  return '#4ade80';
}

function trendArrow(trend: string): { arrow: string; color: string } {
  switch (trend) {
    case 'up': return { arrow: '\u2191', color: 'text-red-400' };
    case 'down': return { arrow: '\u2193', color: 'text-green-400' };
    default: return { arrow: '\u2192', color: 'text-amber-400' };
  }
}

function vectorBadgeStyle(_v: string): string {
  return 'text-red-400/80 bg-red-400/5';
}

function attributionStyle(attr: string): string {
  switch (attr) {
    case 'NATION-STATE': return 'text-red-400 bg-red-400/10';
    case 'CRIMINAL': return 'text-orange-400 bg-orange-400/10';
    case 'INSIDER': return 'text-yellow-400 bg-yellow-400/10';
    default: return 'text-neutral-400 bg-neutral-400/10';
  }
}

function attackTypeBadge(_t: string): string {
  return 'text-red-400/70 bg-red-400/5';
}

function ransomStatusStyle(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'text-red-400 bg-red-400/10';
    case 'DISRUPTED': return 'text-green-400 bg-green-400/10';
    case 'REBRANDED': return 'text-yellow-400 bg-yellow-400/10';
    default: return 'text-neutral-400 bg-neutral-400/10';
  }
}

function fmtRecords(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

function sectorBadgeStyle(_s: string): string {
  return 'text-neutral-300 bg-white/[0.04]';
}

// ── Main Panel ──

export function CybersecurityPanel() {
  const { data: rawData } = useCybersecurity();

  const d = (rawData as Record<string, unknown>) ?? FALLBACK_DATA;
  const threatLevel = (d.threatLevel as number) ?? FALLBACK_DATA.threatLevel;
  const threatLabel = (d.threatLabel as string) ?? FALLBACK_DATA.threatLabel;
  const cybercrimeCostYearly = (d.cybercrimeCostYearly as number) ?? FALLBACK_DATA.cybercrimeCostYearly;
  const overview = (d.overview as typeof FALLBACK_DATA.overview) ?? FALLBACK_DATA.overview;
  const sectorRisk = (d.sectorRisk as typeof FALLBACK_DATA.sectorRisk) ?? FALLBACK_DATA.sectorRisk;
  const majorBreaches = (d.majorBreaches as typeof FALLBACK_DATA.majorBreaches) ?? FALLBACK_DATA.majorBreaches;
  const ransomwareGroups = (d.ransomwareGroups as typeof FALLBACK_DATA.ransomwareGroups) ?? FALLBACK_DATA.ransomwareGroups;
  const vulnMetrics = (d.vulnerabilityMetrics as typeof FALLBACK_DATA.vulnerabilityMetrics) ?? FALLBACK_DATA.vulnerabilityMetrics;
  const cyberInsurance = (d.cyberInsurance as typeof FALLBACK_DATA.cyberInsurance) ?? FALLBACK_DATA.cyberInsurance;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-red-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-red-400">
            Cybersecurity Threat Index
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 ${threatLevelColor(threatLevel)} ${threatLevelBg(threatLevel)}`}>
            {threatLabel} {threatLevel.toFixed(1)}/10
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[7px] uppercase text-neutral-500">CYBERCRIME</span>
            <span className="text-[9px] font-bold text-red-400 tabular-nums">
              ${cybercrimeCostYearly.toFixed(1)}T/yr
            </span>
          </div>
        </div>
      </div>

      {/* ── Overview Stats Bar ── */}
      <div className="grid grid-cols-6 border-b border-red-400/30 shrink-0">
        {[
          { label: 'CRIME COST/YR', value: `$${overview.crimeCostYearly.toFixed(1)}T` },
          { label: 'AVG BREACH', value: `$${overview.avgBreachCost.toFixed(2)}M` },
          { label: 'RANSOM/DAY', value: `${overview.ransomwarePerDay}` },
          { label: 'AVG RANSOM', value: `$${overview.avgRansomPayment.toFixed(2)}M` },
          { label: 'CVES YTD', value: overview.cvesYTD.toLocaleString() },
          { label: 'CRITICAL VULNS', value: overview.criticalVulns.toLocaleString() },
        ].map((stat: any) => (
          <div key={stat.label} className="px-2 py-1.5 border-r border-border/20 last:border-r-0">
            <div className="text-[6px] uppercase tracking-widest text-neutral-500 font-black">{stat.label}</div>
            <div className="text-[10px] font-black text-red-400 tabular-nums">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-auto no-scrollbar">

        {/* ── Section 1: Sector Risk ── */}
        <div className="px-2 py-2">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="w-1 h-1 bg-red-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-red-400">
              Sector Risk Assessment
            </span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1.1fr_0.8fr_0.6fr_0.6fr_0.5fr_0.5fr_0.7fr_0.3fr] gap-1 px-1 mb-1">
            {['SECTOR', 'RISK', 'BREACH', 'AVG COST', 'DETECT', 'CONTAIN', 'VECTOR', 'T'].map((h: any) => (
              <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">
                {h}
              </span>
            ))}
          </div>

          {sectorRisk.map((s: any) => {
            const trend = trendArrow(s.trend);
            return (
              <div
                key={s.sector}
                className="grid grid-cols-[1.1fr_0.8fr_0.6fr_0.6fr_0.5fr_0.5fr_0.7fr_0.3fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-red-400/[0.02] transition-colors items-center"
              >
                <span className="text-[8px] font-bold text-neutral-300 truncate uppercase">{s.sector}</span>
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1.5 bg-neutral-900 relative">
                    <div
                      className="absolute top-0 left-0 h-full"
                      style={{ width: `${Math.min(s.riskScore, 100)}%`, backgroundColor: riskBarColor(s.riskScore), opacity: 0.7 }}
                    />
                  </div>
                  <span className="text-[7px] font-bold tabular-nums w-5 text-right" style={{ color: riskBarColor(s.riskScore) }}>
                    {s.riskScore}
                  </span>
                </div>
                <span className="text-[8px] text-neutral-300 tabular-nums">{s.breachesYTD}</span>
                <span className="text-[8px] text-neutral-300 tabular-nums">${s.avgCost.toFixed(1)}M</span>
                <span className="text-[8px] text-neutral-400 tabular-nums">{s.detectDays}d</span>
                <span className="text-[8px] text-neutral-400 tabular-nums">{s.containDays}d</span>
                <span className={`text-[6px] font-bold px-1 py-0.5 text-center ${vectorBadgeStyle(s.topVector)}`}>
                  {s.topVector}
                </span>
                <span className={`text-[8px] font-bold ${trend.color}`}>{trend.arrow}</span>
              </div>
            );
          })}
        </div>

        {/* ── Section 2: Major Breaches ── */}
        <div className="px-2 py-2 border-t border-red-400/30">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="w-1 h-1 bg-red-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-red-400">
              Major Breaches 2026
            </span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr_0.5fr_0.7fr_0.7fr] gap-1 px-1 mb-1">
            {['ORGANIZATION', 'SECTOR', 'DATE', 'RECORDS', 'COST', 'ATTACK', 'ATTRIB'].map((h: any) => (
              <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">
                {h}
              </span>
            ))}
          </div>

          {majorBreaches.map((b: any, i: any) => (
            <div
              key={i}
              className="grid grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr_0.5fr_0.7fr_0.7fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-red-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-bold text-neutral-300 truncate">{b.org}</span>
              <span className={`text-[6px] font-bold px-1 py-0.5 text-center ${sectorBadgeStyle(b.sector)}`}>
                {b.sector}
              </span>
              <span className="text-[8px] text-neutral-400 tabular-nums">{b.date.slice(5)}</span>
              <span className="text-[8px] text-white font-bold tabular-nums">{fmtRecords(b.recordsAffected)}</span>
              <span className="text-[8px] text-red-400 font-bold tabular-nums">${b.costEstimate}B</span>
              <span className={`text-[6px] font-bold px-1 py-0.5 text-center ${attackTypeBadge(b.attackType)}`}>
                {b.attackType}
              </span>
              <span className={`text-[6px] font-bold px-1 py-0.5 text-center ${attributionStyle(b.attribution)}`}>
                {b.attribution}
              </span>
            </div>
          ))}
        </div>

        {/* ── Section 3: Ransomware Groups ── */}
        <div className="px-2 py-2 border-t border-red-400/30">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="w-1 h-1 bg-red-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-red-400">
              Ransomware Groups
            </span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1.1fr_0.6fr_0.7fr_0.7fr_1.2fr_0.7fr] gap-1 px-1 mb-1">
            {['GROUP', 'ATTACKS', 'AVG DEMAND', 'AVG PAID', 'TARGETS', 'STATUS'].map((h: any) => (
              <span key={h} className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">
                {h}
              </span>
            ))}
          </div>

          {ransomwareGroups.map((g: any) => (
            <div
              key={g.group}
              className="grid grid-cols-[1.1fr_0.6fr_0.7fr_0.7fr_1.2fr_0.7fr] gap-1 px-1 py-0.5 border-b border-border/20 hover:bg-red-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-bold text-neutral-300 truncate">{g.group}</span>
              <span className="text-[8px] text-white font-bold tabular-nums">{g.attacksYTD}</span>
              <span className="text-[8px] text-neutral-300 tabular-nums">{g.avgDemand > 0 ? `$${g.avgDemand.toFixed(1)}M` : '-'}</span>
              <span className="text-[8px] text-red-400 font-bold tabular-nums">{g.avgPayment > 0 ? `$${g.avgPayment.toFixed(1)}M` : '-'}</span>
              <span className="text-[7px] text-neutral-500 truncate">{g.targetSectors}</span>
              <span className={`text-[6px] font-bold px-1 py-0.5 text-center ${ransomStatusStyle(g.status)}`}>
                {g.status}
              </span>
            </div>
          ))}
        </div>

        {/* ── Section 4: Vulnerability Metrics ── */}
        <div className="px-2 py-2 border-t border-red-400/30">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="w-1 h-1 bg-red-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-red-400">
              Vulnerability Metrics
            </span>
          </div>

          {/* CVE Summary Cards */}
          <div className="grid grid-cols-4 gap-1.5 px-1 mb-2">
            {[
              { label: 'TOTAL CVES', value: vulnMetrics.totalCVEs.toLocaleString() },
              { label: 'CRITICAL', value: vulnMetrics.criticalCVEs.toLocaleString() },
              { label: 'ZERO-DAYS', value: vulnMetrics.zeroDaysExploited.toString() },
              { label: 'PATCH ADOPTION', value: `${vulnMetrics.patchAdoptionRate}%` },
            ].map((item: any) => (
              <div key={item.label} className="p-1.5 border border-border/20 bg-[#060606]">
                <div className="text-[6px] uppercase tracking-wider text-neutral-600 font-black">{item.label}</div>
                <div className="text-[10px] font-black text-red-400 tabular-nums">{item.value}</div>
              </div>
            ))}
          </div>

          {/* CVE Severity Breakdown */}
          <div className="grid grid-cols-4 gap-1.5 px-1 mb-2">
            {[
              { label: 'CRITICAL', value: vulnMetrics.criticalCVEs, color: '#f87171' },
              { label: 'HIGH', value: vulnMetrics.highCVEs, color: '#fb923c' },
              { label: 'MEDIUM', value: vulnMetrics.mediumCVEs, color: '#fbbf24' },
              { label: 'LOW', value: vulnMetrics.lowCVEs, color: '#4ade80' },
            ].map((item: any) => (
              <div key={item.label} className="px-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[6px] font-bold uppercase" style={{ color: item.color }}>{item.label}</span>
                  <span className="text-[7px] font-bold tabular-nums text-neutral-300">{item.value.toLocaleString()}</span>
                </div>
                <div className="h-1 bg-neutral-900 relative">
                  <div
                    className="absolute top-0 left-0 h-full"
                    style={{ width: `${Math.min((item.value / vulnMetrics.totalCVEs) * 100 * 3, 100)}%`, backgroundColor: item.color, opacity: 0.6 }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Top Vendors */}
          <div className="px-1 mt-2">
            <div className="text-[6px] font-bold uppercase tracking-wider text-neutral-500 mb-1">TOP VENDORS BY CVE COUNT</div>
            <div className="grid grid-cols-[1.2fr_0.6fr_0.6fr] gap-1 mb-0.5">
              {['VENDOR', 'CVES', 'CRITICAL'].map((h: any) => (
                <span key={h} className="text-[6px] font-bold uppercase tracking-wider text-neutral-600">
                  {h}
                </span>
              ))}
            </div>
            {vulnMetrics.topVendors.map((v: any) => (
              <div
                key={v.vendor}
                className="grid grid-cols-[1.2fr_0.6fr_0.6fr] gap-1 py-0.5 border-b border-border/20 hover:bg-red-400/[0.02] transition-colors items-center"
              >
                <span className="text-[8px] font-bold text-neutral-300 truncate">{v.vendor}</span>
                <span className="text-[8px] text-neutral-300 tabular-nums">{v.cves.toLocaleString()}</span>
                <span className="text-[8px] text-red-400 font-bold tabular-nums">{v.critical}</span>
              </div>
            ))}
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 gap-1.5 px-1 mt-2">
            <div className="p-1.5 border border-border/20 bg-[#060606]">
              <div className="text-[6px] uppercase tracking-wider text-neutral-600 font-black">AVG PATCH TIME</div>
              <div className="text-[10px] font-black text-amber-400 tabular-nums">{vulnMetrics.avgPatchTime} days</div>
            </div>
            <div className="p-1.5 border border-border/20 bg-[#060606]">
              <div className="text-[6px] uppercase tracking-wider text-neutral-600 font-black">HIGH SEVERITY</div>
              <div className="text-[10px] font-black text-orange-400 tabular-nums">{vulnMetrics.highCVEs.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* ── Section 5: Cyber Insurance ── */}
        <div className="px-2 py-2 border-t border-red-400/30">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="w-1 h-1 bg-red-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-red-400">
              Cyber Insurance Market
            </span>
          </div>

          {/* Insurance Summary */}
          <div className="grid grid-cols-3 gap-1.5 px-1 mb-2">
            {[
              { label: 'GLOBAL PREMIUMS', value: `$${cyberInsurance.globalPremiums}B`, sub: 'ANNUAL' },
              { label: 'PREMIUM GROWTH', value: `+${cyberInsurance.premiumGrowthYoY}%`, sub: 'YoY' },
              { label: 'RATE INCREASE', value: `+${cyberInsurance.avgRateIncrease}%`, sub: 'AVG RENEWAL' },
              { label: 'LOSS RATIO', value: `${cyberInsurance.lossRatio}%`, sub: 'CLAIMS/PREMIUM' },
              { label: 'DENIAL RATE', value: `${cyberInsurance.denialRate}%`, sub: 'CLAIMS DENIED' },
              { label: 'AVG COVERAGE', value: `$${cyberInsurance.avgCoverage}M`, sub: 'PER POLICY' },
            ].map((item: any) => (
              <div key={item.label} className="p-1.5 border border-border/20 bg-[#060606]">
                <div className="text-[6px] uppercase tracking-wider text-neutral-600 font-black">{item.label}</div>
                <div className="text-[10px] font-black text-red-400 tabular-nums">{item.value}</div>
                <div className="text-[6px] uppercase text-neutral-600">{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Top Insurers Table */}
          <div className="px-1">
            <div className="text-[6px] font-bold uppercase tracking-wider text-neutral-500 mb-1">TOP CYBER INSURERS</div>
            <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr] gap-1 mb-0.5">
              {['INSURER', 'MKT SHARE', 'PREMIUM', 'LOSS RATIO'].map((h: any) => (
                <span key={h} className="text-[6px] font-bold uppercase tracking-wider text-neutral-600">
                  {h}
                </span>
              ))}
            </div>
            {cyberInsurance.topInsurers.map((ins: any) => (
              <div
                key={ins.insurer}
                className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr] gap-1 py-0.5 border-b border-border/20 hover:bg-red-400/[0.02] transition-colors items-center"
              >
                <span className="text-[8px] font-bold text-neutral-300 truncate">{ins.insurer}</span>
                <span className="text-[8px] text-neutral-300 tabular-nums">{ins.marketShare}%</span>
                <span className="text-[8px] text-white font-bold tabular-nums">${ins.premiumVol}B</span>
                <span className={`text-[8px] font-bold tabular-nums ${ins.lossRatio > 70 ? 'text-red-400' : ins.lossRatio > 60 ? 'text-amber-400' : 'text-green-400'}`}>
                  {ins.lossRatio}%
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
