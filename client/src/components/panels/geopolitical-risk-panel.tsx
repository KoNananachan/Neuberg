import { useGeopoliticalRisk } from '../../api/hooks/use-geopolitical-risk';
import { useT } from '../../i18n';
import { RefreshCw, Shield } from 'lucide-react';

// i18n fallback helper
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Types ──

interface CountryRisk {
  country: string;
  code: string;
  score: number;
  change1w: number;
  level: string;
  topThreat: string;
}

interface Sanction {
  target: string;
  imposedBy: string;
  type: string;
  dateImposed: string;
  severity: 'low' | 'moderate' | 'severe' | 'critical';
  sectors: string[];
}

interface ConflictZone {
  region: string;
  status: 'active' | 'escalating' | 'de-escalating' | 'frozen';
  intensity: number;
  casualties7d: number;
  marketImpact: string;
  affectedAssets: string[];
}

interface TradeTension {
  corridor: string;
  severity: number;
  trend: 'escalating' | 'stable' | 'de-escalating';
  tariffRate: number;
  tradeVolume: string;
  keyDispute: string;
}

interface SafeHavenFlow {
  asset: string;
  flow7d: number;
  flow30d: number;
  price: number;
  change1d: number;
  signal: 'strong_inflow' | 'inflow' | 'neutral' | 'outflow' | 'strong_outflow';
}

interface GeopoliticalRiskData {
  globalIndex: {
    score: number;
    level: string;
    change1w: number;
    change1m: number;
    percentile: number;
  };
  countryRisks: CountryRisk[];
  sanctions: Sanction[];
  conflictZones: ConflictZone[];
  tradeTensions: TradeTension[];
  safeHavenFlows: SafeHavenFlow[];
  timestamp: string;
}

// ── Fallback Mock Data ──

const FALLBACK_DATA: GeopoliticalRiskData = {
  globalIndex: {
    score: 68,
    level: 'Elevated',
    change1w: 3.2,
    change1m: 7.8,
    percentile: 82,
  },
  countryRisks: [
    { country: 'Russia', code: 'RU', score: 91, change1w: 1.4, level: 'Extreme', topThreat: 'Military conflict' },
    { country: 'China', code: 'CN', score: 72, change1w: 2.1, level: 'High', topThreat: 'Taiwan tensions' },
    { country: 'Iran', code: 'IR', score: 84, change1w: -0.8, level: 'Extreme', topThreat: 'Nuclear program' },
    { country: 'North Korea', code: 'KP', score: 78, change1w: 0.5, level: 'High', topThreat: 'Missile tests' },
    { country: 'Israel', code: 'IL', score: 75, change1w: 3.6, level: 'High', topThreat: 'Regional conflict' },
    { country: 'Turkey', code: 'TR', score: 52, change1w: -1.2, level: 'Elevated', topThreat: 'Kurdish tensions' },
    { country: 'Pakistan', code: 'PK', score: 61, change1w: 0.9, level: 'Elevated', topThreat: 'Internal instability' },
    { country: 'Venezuela', code: 'VE', score: 58, change1w: -0.3, level: 'Elevated', topThreat: 'Economic crisis' },
    { country: 'Myanmar', code: 'MM', score: 70, change1w: 1.1, level: 'High', topThreat: 'Civil war' },
    { country: 'Sudan', code: 'SD', score: 82, change1w: 2.4, level: 'Extreme', topThreat: 'Armed conflict' },
  ],
  sanctions: [
    { target: 'Russia', imposedBy: 'US/EU/G7', type: 'Comprehensive', dateImposed: '2022-02-24', severity: 'critical', sectors: ['Energy', 'Finance', 'Tech'] },
    { target: 'Iran', imposedBy: 'US/EU', type: 'Comprehensive', dateImposed: '2018-11-05', severity: 'critical', sectors: ['Oil', 'Banking', 'Metals'] },
    { target: 'North Korea', imposedBy: 'UN/US', type: 'Comprehensive', dateImposed: '2017-09-11', severity: 'critical', sectors: ['All sectors'] },
    { target: 'China (Tech)', imposedBy: 'US', type: 'Sectoral', dateImposed: '2022-10-07', severity: 'severe', sectors: ['Semiconductors', 'AI', 'Quantum'] },
    { target: 'Venezuela', imposedBy: 'US', type: 'Sectoral', dateImposed: '2019-01-28', severity: 'moderate', sectors: ['Oil', 'Gold', 'Finance'] },
    { target: 'Myanmar', imposedBy: 'US/EU', type: 'Targeted', dateImposed: '2021-02-11', severity: 'moderate', sectors: ['Military', 'Gems'] },
  ],
  conflictZones: [
    { region: 'Ukraine-Russia', status: 'active', intensity: 87, casualties7d: 340, marketImpact: 'Energy & grain prices elevated', affectedAssets: ['NG', 'WEAT', 'RSX'] },
    { region: 'Israel-Gaza', status: 'active', intensity: 82, casualties7d: 210, marketImpact: 'Oil supply risk premium +$4/bbl', affectedAssets: ['CL', 'BNO', 'XLE'] },
    { region: 'Sudan Civil War', status: 'escalating', intensity: 71, casualties7d: 180, marketImpact: 'Humanitarian crisis, limited market impact', affectedAssets: ['WEAT', 'GLD'] },
    { region: 'Myanmar Civil War', status: 'active', intensity: 58, casualties7d: 45, marketImpact: 'Rare earth supply disruption risk', affectedAssets: ['REMX', 'LIT'] },
    { region: 'Taiwan Strait', status: 'frozen', intensity: 42, casualties7d: 0, marketImpact: 'Semiconductor supply chain risk', affectedAssets: ['TSM', 'SMH', 'SOXX'] },
  ],
  tradeTensions: [
    { corridor: 'US-China', severity: 78, trend: 'escalating', tariffRate: 27.5, tradeVolume: '$582B', keyDispute: 'Tech export controls & chip restrictions' },
    { corridor: 'EU-China', severity: 52, trend: 'escalating', tariffRate: 12.8, tradeVolume: '$856B', keyDispute: 'EV subsidies & market access' },
    { corridor: 'US-EU', severity: 31, trend: 'de-escalating', tariffRate: 3.2, tradeVolume: '$1.1T', keyDispute: 'Steel & aluminum tariffs winding down' },
    { corridor: 'Japan-Korea', severity: 28, trend: 'de-escalating', tariffRate: 4.1, tradeVolume: '$82B', keyDispute: 'Export controls normalization' },
    { corridor: 'India-China', severity: 45, trend: 'stable', tariffRate: 15.6, tradeVolume: '$118B', keyDispute: 'Border tensions & app bans' },
  ],
  safeHavenFlows: [
    { asset: 'Gold (XAU)', flow7d: 4.2, flow30d: 12.8, price: 2415.30, change1d: 0.82, signal: 'strong_inflow' },
    { asset: 'US Treasuries', flow7d: 8.6, flow30d: 22.1, price: 110.45, change1d: 0.15, signal: 'strong_inflow' },
    { asset: 'USD Index (DXY)', flow7d: 1.8, flow30d: 3.4, price: 104.82, change1d: 0.24, signal: 'inflow' },
    { asset: 'Swiss Franc', flow7d: 2.1, flow30d: 5.6, price: 1.128, change1d: 0.31, signal: 'inflow' },
    { asset: 'Japanese Yen', flow7d: -0.4, flow30d: 1.2, price: 151.42, change1d: -0.18, signal: 'neutral' },
    { asset: 'Bitcoin', flow7d: -2.8, flow30d: -5.2, price: 62450.0, change1d: -1.42, signal: 'outflow' },
  ],
  timestamp: new Date().toISOString(),
};

// ── Color Helpers ──

function levelColor(level: string): string {
  const l = level.toLowerCase();
  if (l === 'extreme') return 'text-red-400';
  if (l === 'high') return 'text-orange-400';
  if (l === 'elevated') return 'text-amber-400';
  if (l === 'moderate') return 'text-yellow-400';
  return 'text-green-400';
}

function levelBg(level: string): string {
  const l = level.toLowerCase();
  if (l === 'extreme') return 'bg-red-400/10';
  if (l === 'high') return 'bg-orange-400/10';
  if (l === 'elevated') return 'bg-amber-400/10';
  if (l === 'moderate') return 'bg-yellow-400/10';
  return 'bg-green-400/10';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function changePrefix(n: number): string {
  return n > 0 ? '+' : '';
}

function severityColor(s: string): { text: string; bg: string } {
  switch (s) {
    case 'critical': return { text: 'text-red-400', bg: 'bg-red-400/10' };
    case 'severe': return { text: 'text-orange-400', bg: 'bg-orange-400/10' };
    case 'moderate': return { text: 'text-amber-400', bg: 'bg-amber-400/10' };
    default: return { text: 'text-green-400', bg: 'bg-green-400/10' };
  }
}

function statusColor(status: string): { text: string; bg: string } {
  switch (status) {
    case 'active': return { text: 'text-red-400', bg: 'bg-red-400/10' };
    case 'escalating': return { text: 'text-orange-400', bg: 'bg-orange-400/10' };
    case 'de-escalating': return { text: 'text-green-400', bg: 'bg-green-400/10' };
    case 'frozen': return { text: 'text-amber-400', bg: 'bg-amber-400/10' };
    default: return { text: 'text-neutral-500', bg: 'bg-neutral-500/10' };
  }
}

function trendColor(trend: string): { text: string; arrow: string } {
  switch (trend) {
    case 'escalating': return { text: 'text-red-400', arrow: '\u2191' };
    case 'de-escalating': return { text: 'text-green-400', arrow: '\u2193' };
    default: return { text: 'text-amber-400', arrow: '\u2192' };
  }
}

function flowSignalColor(signal: string): { text: string; bg: string; label: string } {
  switch (signal) {
    case 'strong_inflow': return { text: 'text-green-400', bg: 'bg-green-400/10', label: 'STRONG IN' };
    case 'inflow': return { text: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'INFLOW' };
    case 'outflow': return { text: 'text-red-400', bg: 'bg-red-400/10', label: 'OUTFLOW' };
    case 'strong_outflow': return { text: 'text-red-500', bg: 'bg-red-500/10', label: 'STRONG OUT' };
    default: return { text: 'text-amber-400', bg: 'bg-amber-400/10', label: 'NEUTRAL' };
  }
}

function fmtFlow(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}B`;
}

// ── Score Bar (compact horizontal) ──

function ScoreBar({ score, maxScore = 100 }: { score: number; maxScore?: number }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  const color = score >= 80 ? '#f87171' : score >= 60 ? '#fb923c' : score >= 45 ? '#fbbf24' : score >= 25 ? '#facc15' : '#4ade80';

  return (
    <div className="h-1 bg-white/[0.04] relative overflow-hidden w-full">
      <div
        className="absolute top-0 left-0 h-full"
        style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.6 }}
      />
    </div>
  );
}

// ── Global Risk Index Section ──

function GlobalRiskIndex({ data }: { data: GeopoliticalRiskData }) {
  const { globalIndex } = data;

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col items-start">
          <span className="text-[32px] font-black font-mono text-red-400 leading-none">
            {globalIndex.score}
          </span>
          <span className={`text-[8px] font-black font-mono uppercase tracking-wider mt-1 ${levelColor(globalIndex.level)}`}>
            {globalIndex.level}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">1W</span>
            <span className={`text-[8px] font-mono font-bold ${changeColor(globalIndex.change1w)}`}>
              {changePrefix(globalIndex.change1w)}{globalIndex.change1w.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">1M</span>
            <span className={`text-[8px] font-mono font-bold ${changeColor(globalIndex.change1m)}`}>
              {changePrefix(globalIndex.change1m)}{globalIndex.change1m.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">PCTL</span>
            <span className="text-[8px] font-mono font-bold text-neutral-400">
              {globalIndex.percentile}%
            </span>
          </div>
        </div>
      </div>
      {/* Risk gauge bar */}
      <div className="h-1.5 bg-white/[0.04] relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full transition-all"
          style={{
            width: `${globalIndex.score}%`,
            background: 'linear-gradient(to right, #4ade80, #fbbf24, #fb923c, #f87171)',
            opacity: 0.7,
          }}
        />
        <div
          className="absolute top-0 h-full w-px bg-white"
          style={{ left: `${globalIndex.score}%`, opacity: 0.8 }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[6px] font-mono text-neutral-700">0</span>
        <span className="text-[6px] font-mono text-neutral-700">LOW</span>
        <span className="text-[6px] font-mono text-neutral-700">MOD</span>
        <span className="text-[6px] font-mono text-neutral-700">ELEV</span>
        <span className="text-[6px] font-mono text-neutral-700">HIGH</span>
        <span className="text-[6px] font-mono text-neutral-700">100</span>
      </div>
    </div>
  );
}

// ── Country Risk Scores ──

function CountryRiskSection({ countries }: { countries: CountryRisk[] }) {
  const t = useT();

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr(t, 'geoCountryRisk', 'Country Risk Scores')}
      </div>
      {/* Header */}
      <div className="flex items-center py-0.5 border-b border-white/[0.06] text-[6px] font-mono text-neutral-600 uppercase gap-1 mb-0.5">
        <span className="w-20 shrink-0">Country</span>
        <span className="w-8 text-right shrink-0">Score</span>
        <span className="flex-1">Bar</span>
        <span className="w-12 shrink-0">Level</span>
        <span className="w-10 text-right shrink-0">1W</span>
        <span className="w-24 text-right shrink-0">Top Threat</span>
      </div>
      {countries.map((c) => (
        <div
          key={c.code}
          className="flex items-center py-0.5 border-b border-white/[0.02] text-[7px] font-mono gap-1 hover:bg-red-400/[0.02] transition-colors"
        >
          <span className="w-20 font-bold text-white/60 shrink-0 truncate">{c.country}</span>
          <span className={`w-8 text-right font-bold shrink-0 ${levelColor(c.level)}`}>{c.score}</span>
          <div className="flex-1">
            <ScoreBar score={c.score} />
          </div>
          <span className={`w-12 shrink-0 text-[6px] font-black uppercase px-1 py-0 ${levelColor(c.level)} ${levelBg(c.level)}`}>
            {c.level}
          </span>
          <span className={`w-10 text-right font-bold shrink-0 ${changeColor(c.change1w)}`}>
            {changePrefix(c.change1w)}{c.change1w.toFixed(1)}
          </span>
          <span className="w-24 text-right text-white/30 shrink-0 truncate">{c.topThreat}</span>
        </div>
      ))}
    </div>
  );
}

// ── Active Sanctions ──

function SanctionsSection({ sanctions }: { sanctions: Sanction[] }) {
  const t = useT();

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr(t, 'geoSanctions', 'Active Sanctions')}
      </div>
      {/* Header */}
      <div className="flex items-center py-0.5 border-b border-white/[0.06] text-[6px] font-mono text-neutral-600 uppercase gap-1 mb-0.5">
        <span className="w-20 shrink-0">Target</span>
        <span className="w-16 shrink-0">Imposed By</span>
        <span className="w-16 shrink-0">Type</span>
        <span className="w-12 shrink-0">Severity</span>
        <span className="flex-1 text-right">Sectors</span>
      </div>
      {sanctions.map((s, i) => {
        const sev = severityColor(s.severity);
        return (
          <div
            key={i}
            className="flex items-center py-0.5 border-b border-white/[0.02] text-[7px] font-mono gap-1 hover:bg-red-400/[0.02] transition-colors"
          >
            <span className="w-20 font-bold text-white/60 shrink-0 truncate">{s.target}</span>
            <span className="w-16 text-white/30 shrink-0 truncate">{s.imposedBy}</span>
            <span className="w-16 text-white/30 shrink-0 truncate">{s.type}</span>
            <span className={`w-12 shrink-0 text-[6px] font-black uppercase px-1 py-0 ${sev.text} ${sev.bg}`}>
              {s.severity}
            </span>
            <span className="flex-1 text-right text-white/25 truncate">{s.sectors.join(', ')}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Conflict Zones ──

function ConflictZonesSection({ zones }: { zones: ConflictZone[] }) {
  const t = useT();

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr(t, 'geoConflicts', 'Conflict Zones')}
      </div>
      {zones.map((z) => {
        const st = statusColor(z.status);
        return (
          <div
            key={z.region}
            className="py-1.5 border-b border-white/[0.03] hover:bg-red-400/[0.02] transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono font-bold text-white/70">{z.region}</span>
                <span className={`text-[6px] font-black font-mono uppercase px-1 py-0 ${st.text} ${st.bg}`}>
                  {z.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[6px] font-mono text-neutral-600">INT</span>
                <span className={`text-[8px] font-mono font-bold ${z.intensity >= 70 ? 'text-red-400' : z.intensity >= 50 ? 'text-amber-400' : 'text-green-400'}`}>
                  {z.intensity}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[6px] font-mono text-neutral-600">7D CAS</span>
                <span className={`text-[7px] font-mono font-bold ${z.casualties7d > 100 ? 'text-red-400' : z.casualties7d > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                  {z.casualties7d.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {z.affectedAssets.map((a) => (
                  <span key={a} className="text-[6px] font-mono text-white/25 bg-white/[0.03] px-1 py-0">
                    {a}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-0.5">
              <span className="text-[6px] font-mono text-white/20">{z.marketImpact}</span>
            </div>
            <div className="mt-0.5">
              <ScoreBar score={z.intensity} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Trade Tensions ──

function TradeTensionsSection({ tensions }: { tensions: TradeTension[] }) {
  const t = useT();

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr(t, 'geoTradeTensions', 'Trade Tensions')}
      </div>
      {/* Header */}
      <div className="flex items-center py-0.5 border-b border-white/[0.06] text-[6px] font-mono text-neutral-600 uppercase gap-1 mb-0.5">
        <span className="w-16 shrink-0">Corridor</span>
        <span className="w-8 text-right shrink-0">Sev</span>
        <span className="flex-1">Bar</span>
        <span className="w-12 shrink-0">Trend</span>
        <span className="w-10 text-right shrink-0">Tariff</span>
        <span className="w-12 text-right shrink-0">Vol</span>
      </div>
      {tensions.map((tt) => {
        const trend = trendColor(tt.trend);
        return (
          <div
            key={tt.corridor}
            className="hover:bg-red-400/[0.02] transition-colors"
          >
            <div className="flex items-center py-0.5 border-b border-white/[0.02] text-[7px] font-mono gap-1">
              <span className="w-16 font-bold text-white/60 shrink-0 truncate">{tt.corridor}</span>
              <span className={`w-8 text-right font-bold shrink-0 ${tt.severity >= 60 ? 'text-red-400' : tt.severity >= 40 ? 'text-amber-400' : 'text-green-400'}`}>
                {tt.severity}
              </span>
              <div className="flex-1">
                <ScoreBar score={tt.severity} />
              </div>
              <span className={`w-12 shrink-0 text-[6px] font-black uppercase ${trend.text}`}>
                {trend.arrow} {tt.trend.slice(0, 3).toUpperCase()}
              </span>
              <span className="w-10 text-right text-white/40 shrink-0">{tt.tariffRate}%</span>
              <span className="w-12 text-right text-white/30 shrink-0">{tt.tradeVolume}</span>
            </div>
            <div className="py-0.5 pl-16">
              <span className="text-[6px] font-mono text-white/20">{tt.keyDispute}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Safe Haven Flows ──

function SafeHavenSection({ flows }: { flows: SafeHavenFlow[] }) {
  const t = useT();

  return (
    <div className="px-3 py-2">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr(t, 'geoSafeHaven', 'Safe Haven Flows')}
      </div>
      {/* Header */}
      <div className="flex items-center py-0.5 border-b border-white/[0.06] text-[6px] font-mono text-neutral-600 uppercase gap-1 mb-0.5">
        <span className="w-20 shrink-0">Asset</span>
        <span className="w-14 text-right shrink-0">Price</span>
        <span className="w-10 text-right shrink-0">1D</span>
        <span className="w-10 text-right shrink-0">7D Flow</span>
        <span className="w-10 text-right shrink-0">30D Flow</span>
        <span className="flex-1 text-right">Signal</span>
      </div>
      {flows.map((f) => {
        const signal = flowSignalColor(f.signal);
        return (
          <div
            key={f.asset}
            className="flex items-center py-0.5 border-b border-white/[0.02] text-[7px] font-mono gap-1 hover:bg-red-400/[0.02] transition-colors"
          >
            <span className="w-20 font-bold text-white/60 shrink-0 truncate">{f.asset}</span>
            <span className="w-14 text-right text-white/50 shrink-0">
              {f.price >= 1000 ? f.price.toFixed(0) : f.price.toFixed(2)}
            </span>
            <span className={`w-10 text-right font-bold shrink-0 ${f.change1d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {f.change1d >= 0 ? '+' : ''}{f.change1d.toFixed(2)}%
            </span>
            <span className={`w-10 text-right font-bold shrink-0 ${f.flow7d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmtFlow(f.flow7d)}
            </span>
            <span className={`w-10 text-right font-bold shrink-0 ${f.flow30d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmtFlow(f.flow30d)}
            </span>
            <span className={`flex-1 text-right text-[6px] font-black uppercase px-1 py-0 ${signal.text} ${signal.bg}`}>
              {signal.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function GeopoliticalRiskPanel() {
  const t = useT();
  const { data: rawData, isLoading, refetch } = useGeopoliticalRisk();

  const data: GeopoliticalRiskData = rawData ?? FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            {tr(t, 'geoTitle', 'Geopolitical Risk Index')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className={`text-[8px] font-black font-mono uppercase px-1.5 py-0.5 ${levelColor(data.globalIndex.level)} ${levelBg(data.globalIndex.level)}`}>
              {data.globalIndex.level}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-red-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar text-[9px] font-mono">
        {isLoading && !rawData && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!isLoading && !rawData && !data && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {tr(t, 'geoNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <GlobalRiskIndex data={data} />
            <CountryRiskSection countries={data.countryRisks} />
            <SanctionsSection sanctions={data.sanctions} />
            <ConflictZonesSection zones={data.conflictZones} />
            <TradeTensionsSection tensions={data.tradeTensions} />
            <SafeHavenSection flows={data.safeHavenFlows} />
          </>
        )}
      </div>
    </div>
  );
}
