import { useWaterMarket } from '../../api/hooks/use-water-market';
import { Droplets, RefreshCw } from 'lucide-react';

// ── Fallback Data ──

const FALLBACK_DATA = {
  timestamp: new Date().toISOString(),
  overview: {
    marketSize: 937.7e9,
    stressedPopulation: 2.3e9,
    desalinationCapacity: 107.8,
    infraInvestment: 198.4e9,
    waterLossRate: 30.2,
  },
  waterRights: [
    { market: 'NQH2O (Nasdaq Veles)', price: 1124, dailyChange: 2.34, ytdChange: 18.7, volume: '4.2K', scarcity: 'HIGH' },
    { market: 'Murray-Darling (AU)', price: 312, dailyChange: -0.85, ytdChange: 24.3, volume: '1.8K', scarcity: 'EXTREME' },
    { market: 'Colorado River (US)', price: 874, dailyChange: 1.12, ytdChange: 32.6, volume: '2.1K', scarcity: 'EXTREME' },
    { market: 'Texas (Edwards Aq.)', price: 548, dailyChange: 0.67, ytdChange: 14.2, volume: '980', scarcity: 'HIGH' },
    { market: 'Chile (Atacama)', price: 1680, dailyChange: 3.41, ytdChange: 45.8, volume: '620', scarcity: 'EXTREME' },
    { market: 'South Africa (W Cape)', price: 285, dailyChange: -1.23, ytdChange: 8.4, volume: '540', scarcity: 'HIGH' },
    { market: 'Spain (Tagus-Segura)', price: 462, dailyChange: 1.87, ytdChange: 22.1, volume: '780', scarcity: 'HIGH' },
    { market: 'India (Gujarat)', price: 68, dailyChange: 4.52, ytdChange: 56.3, volume: '3.4K', scarcity: 'EXTREME' },
    { market: 'UK (Thames)', price: 195, dailyChange: 0.34, ytdChange: 5.8, volume: '1.2K', scarcity: 'MOD' },
    { market: 'China (N. Plain)', price: 142, dailyChange: 2.18, ytdChange: 28.9, volume: '5.6K', scarcity: 'HIGH' },
    { market: 'Brazil (Sao Paulo)', price: 98, dailyChange: -0.45, ytdChange: -3.2, volume: '890', scarcity: 'MOD' },
    { market: 'Middle East (GCC)', price: 2240, dailyChange: 0.92, ytdChange: 12.4, volume: '1.5K', scarcity: 'EXTREME' },
  ],
  scarcityIndex: [
    { region: 'Middle East & N Africa', stressScore: 4.8, trend: 'RISING', populationAffected: '380M', projection2030: 5.0 },
    { region: 'South Asia', stressScore: 4.2, trend: 'RISING', populationAffected: '620M', projection2030: 4.7 },
    { region: 'Central Asia', stressScore: 3.9, trend: 'RISING', populationAffected: '85M', projection2030: 4.4 },
    { region: 'Sub-Saharan Africa', stressScore: 3.6, trend: 'RISING', populationAffected: '400M', projection2030: 4.2 },
    { region: 'Western US', stressScore: 3.4, trend: 'STABLE', populationAffected: '65M', projection2030: 3.8 },
    { region: 'Mediterranean Europe', stressScore: 3.1, trend: 'RISING', populationAffected: '120M', projection2030: 3.6 },
    { region: 'Northern China', stressScore: 3.8, trend: 'STABLE', populationAffected: '450M', projection2030: 4.0 },
    { region: 'Southeast Australia', stressScore: 3.0, trend: 'RISING', populationAffected: '18M', projection2030: 3.5 },
    { region: 'Andes (Chile/Peru)', stressScore: 3.5, trend: 'RISING', populationAffected: '28M', projection2030: 4.1 },
    { region: 'East Africa', stressScore: 3.3, trend: 'RISING', populationAffected: '190M', projection2030: 3.9 },
  ],
  desalination: {
    globalCapacity: 107.8,
    underConstruction: 18.4,
    topMarkets: [
      { country: 'Saudi Arabia', capacity: 22.4 },
      { country: 'UAE', capacity: 14.2 },
      { country: 'US', capacity: 8.6 },
      { country: 'China', capacity: 7.8 },
      { country: 'Israel', capacity: 6.2 },
    ],
    costPerM3: 0.52,
    energyConsumption: 3.5,
    techMix: [
      { tech: 'RO', share: 69 },
      { tech: 'MSF', share: 18 },
      { tech: 'MED', share: 7 },
      { tech: 'Other', share: 6 },
    ],
  },
  utilities: [
    { company: 'American Water Works', ticker: 'AWK', marketCap: '28.4B', revenueGrowth: 8.2, ebitdaMargin: 52.4, divYield: 2.1, stockYtd: 12.6, nrw: 12.8, customers: '14M' },
    { company: 'Xylem', ticker: 'XYL', marketCap: '32.1B', revenueGrowth: 12.4, ebitdaMargin: 22.8, divYield: 1.1, stockYtd: 18.3, nrw: null, customers: null },
    { company: 'Veolia Environnement', ticker: 'VEOEY', marketCap: '24.8B', revenueGrowth: 6.8, ebitdaMargin: 16.2, divYield: 3.4, stockYtd: 8.7, nrw: 18.4, customers: '95M' },
    { company: 'Essential Utilities', ticker: 'WTRG', marketCap: '12.2B', revenueGrowth: 5.4, ebitdaMargin: 48.6, divYield: 2.8, stockYtd: 6.2, nrw: 14.2, customers: '5.5M' },
    { company: 'Pentair', ticker: 'PNR', marketCap: '16.8B', revenueGrowth: 9.6, ebitdaMargin: 24.1, divYield: 1.3, stockYtd: 22.4, nrw: null, customers: null },
    { company: 'Mueller Water', ticker: 'MWA', marketCap: '3.8B', revenueGrowth: 14.8, ebitdaMargin: 20.6, divYield: 0.6, stockYtd: 28.9, nrw: null, customers: null },
    { company: 'Severn Trent', ticker: 'SVT.L', marketCap: '9.6B', revenueGrowth: 4.2, ebitdaMargin: 56.8, divYield: 4.2, stockYtd: -2.4, nrw: 20.1, customers: '8M' },
    { company: 'United Utilities', ticker: 'UU.L', marketCap: '8.4B', revenueGrowth: 3.8, ebitdaMargin: 54.2, divYield: 4.6, stockYtd: -4.8, nrw: 22.6, customers: '7.3M' },
    { company: 'Energy Recovery', ticker: 'ERII', marketCap: '4.2B', revenueGrowth: 18.6, ebitdaMargin: 42.8, divYield: 0.0, stockYtd: 34.2, nrw: null, customers: null },
    { company: 'IDEX Corp', ticker: 'IEX', marketCap: '18.6B', revenueGrowth: 7.2, ebitdaMargin: 28.4, divYield: 1.2, stockYtd: 10.8, nrw: null, customers: null },
  ],
  infrastructure: {
    globalInvestment: 198.4e9,
    investmentGap: 260e9,
    regionalBreakdown: [
      { region: 'Asia-Pacific', investment: 72.4e9, share: 36.5 },
      { region: 'North America', investment: 48.2e9, share: 24.3 },
      { region: 'Europe', investment: 38.6e9, share: 19.5 },
      { region: 'Middle East & Africa', investment: 22.8e9, share: 11.5 },
      { region: 'Latin America', investment: 16.4e9, share: 8.2 },
    ],
    keyTrends: [
      { trend: 'Smart water networks & IoT sensors', growth: 24.8 },
      { trend: 'Pipe rehabilitation & trenchless tech', growth: 18.2 },
      { trend: 'Advanced metering infrastructure (AMI)', growth: 22.4 },
      { trend: 'Membrane bioreactor (MBR) systems', growth: 16.8 },
      { trend: 'Water reuse & recycling facilities', growth: 28.6 },
      { trend: 'Nature-based solutions (wetlands, aquifer recharge)', growth: 14.2 },
    ],
  },
};

// ── Formatting helpers ──

function fmtVol(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + n.toFixed(0);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtNum(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toLocaleString('en-US');
}

// ── Color helpers ──

function scarcityBadge(level: string): { label: string; cls: string } {
  switch (level) {
    case 'EXTREME':
      return { label: 'EXTREME', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
    case 'HIGH':
      return { label: 'HIGH', cls: 'text-orange-400 bg-orange-500/10 border border-orange-500/30' };
    case 'MOD':
      return { label: 'MOD', cls: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30' };
    case 'LOW':
    default:
      return { label: 'LOW', cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
  }
}

function stressBarColor(score: number): string {
  if (score >= 4.5) return 'bg-red-500';
  if (score >= 3.5) return 'bg-orange-500';
  if (score >= 2.5) return 'bg-yellow-500';
  return 'bg-green-500';
}

function stressTextColor(score: number): string {
  if (score >= 4.5) return 'text-red-400';
  if (score >= 3.5) return 'text-orange-400';
  if (score >= 2.5) return 'text-yellow-400';
  return 'text-green-400';
}

function trendBadge(trend: string): { label: string; cls: string } {
  switch (trend) {
    case 'RISING':
      return { label: 'RISING', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
    case 'STABLE':
      return { label: 'STABLE', cls: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30' };
    case 'FALLING':
      return { label: 'FALLING', cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
    default:
      return { label: trend, cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30' };
  }
}

// ── Section Header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 border-b border-cyan-400/30 flex items-center gap-2">
      <div className="w-1 h-1 bg-cyan-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-cyan-400">
        {label}
      </span>
    </div>
  );
}

// ── Overview Section ──

function OverviewSection({ overview }: { overview: any }) {
  const metrics = [
    { label: 'Market Size', value: fmtVol(overview.marketSize) },
    { label: 'Stressed Pop.', value: fmtNum(overview.stressedPopulation) },
    { label: 'Desal Capacity', value: overview.desalinationCapacity.toFixed(1) + ' Mm\u00B3/d' },
    { label: 'Infra Investment', value: fmtVol(overview.infraInvestment) },
    { label: 'Water Loss Rate', value: overview.waterLossRate.toFixed(1) + '%' },
  ];

  return (
    <div className="border-b border-cyan-400/30">
      <SectionHeader label="Market Overview" />
      <div className="grid grid-cols-5 gap-px bg-border/10">
        {metrics.map((m: any) => (
          <div key={m.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {m.label}
            </div>
            <div className="text-[9px] font-mono font-bold text-white tabular-nums">
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Water Rights Pricing Section ──

function WaterRightsSection({ rights }: { rights: any[] }) {
  return (
    <div className="border-b border-cyan-400/30">
      <SectionHeader label="Water Rights Pricing" />
      <div className="grid grid-cols-[1.4fr_0.6fr_0.5fr_0.5fr_0.5fr_0.5fr] px-3 py-0.5 border-b border-border/20 text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
        <span>Market</span>
        <span className="text-right">Price</span>
        <span className="text-right">1D</span>
        <span className="text-right">YTD</span>
        <span className="text-right">Volume</span>
        <span className="text-center">Scarcity</span>
      </div>
      {rights.map((r: any) => {
        const badge = scarcityBadge(r.scarcity);
        return (
          <div
            key={r.market}
            className="grid grid-cols-[1.4fr_0.6fr_0.5fr_0.5fr_0.5fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{r.market}</span>
            <span className="text-[8px] font-mono font-bold text-white text-right tabular-nums">
              ${r.price.toLocaleString()}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${r.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtPct(r.dailyChange)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${r.ytdChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtPct(r.ytdChange)}
            </span>
            <span className="text-[7px] font-mono text-neutral-400 text-right tabular-nums">{r.volume}</span>
            <div className="flex justify-center">
              <span className={`text-[6px] font-black font-mono uppercase px-1 py-0 ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Scarcity Index Section ──

function ScarcityIndexSection({ indices }: { indices: any[] }) {
  return (
    <div className="border-b border-cyan-400/30">
      <SectionHeader label="Water Scarcity Index" />
      <div className="grid grid-cols-[1.2fr_0.8fr_0.5fr_0.6fr_0.5fr] px-3 py-0.5 border-b border-border/20 text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
        <span>Region</span>
        <span>Stress (0-5)</span>
        <span className="text-center">Trend</span>
        <span className="text-right">Pop. Affected</span>
        <span className="text-right">2030 Proj.</span>
      </div>
      {indices.map((s: any) => {
        const trend = trendBadge(s.trend);
        const barPct = (s.stressScore / 5) * 100;
        return (
          <div
            key={s.region}
            className="grid grid-cols-[1.2fr_0.8fr_0.5fr_0.6fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{s.region}</span>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-2 bg-white/[0.03] overflow-hidden">
                <div
                  className={`h-full ${stressBarColor(s.stressScore)}`}
                  style={{ width: `${barPct}%`, opacity: 0.7 }}
                />
              </div>
              <span className={`text-[7px] font-mono font-bold tabular-nums w-7 text-right ${stressTextColor(s.stressScore)}`}>
                {s.stressScore.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-center">
              <span className={`text-[6px] font-black font-mono uppercase px-1 py-0 ${trend.cls}`}>
                {trend.label}
              </span>
            </div>
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">{s.populationAffected}</span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${s.projection2030 > s.stressScore ? 'text-red-400' : 'text-green-400'}`}>
              {s.projection2030.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Desalination Section ──

function DesalinationSection({ desal }: { desal: any }) {
  return (
    <div className="border-b border-cyan-400/30">
      <SectionHeader label="Desalination" />
      <div className="grid grid-cols-3 gap-px bg-border/10 mb-px">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Global Capacity</div>
          <div className="text-[9px] font-mono font-bold text-white tabular-nums">{desal.globalCapacity} Mm&#179;/d</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Under Construction</div>
          <div className="text-[9px] font-mono font-bold text-cyan-400 tabular-nums">+{desal.underConstruction} Mm&#179;/d</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Cost / m&#179;</div>
          <div className="text-[9px] font-mono font-bold text-white tabular-nums">${desal.costPerM3.toFixed(2)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border/10 mb-px">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Energy Consumption</div>
          <div className="text-[9px] font-mono font-bold text-white tabular-nums">{desal.energyConsumption} kWh/m&#179;</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">Tech Mix</div>
          <div className="flex h-2 overflow-hidden">
            {desal.techMix.map((t: any, i: number) => {
              const colors = ['bg-cyan-400', 'bg-cyan-600', 'bg-cyan-800', 'bg-cyan-950'];
              return (
                <div
                  key={t.tech}
                  className={`h-full ${colors[i] || 'bg-cyan-400'}`}
                  style={{ width: `${t.share}%`, opacity: 0.8 }}
                  title={`${t.tech}: ${t.share}%`}
                />
              );
            })}
          </div>
          <div className="flex gap-2 mt-1">
            {desal.techMix.map((t: any) => (
              <span key={t.tech} className="text-[6px] font-mono text-neutral-500 tabular-nums">
                {t.tech} {t.share}%
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="px-3 py-1.5">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">Top Markets (Mm&#179;/d)</div>
        <div className="flex gap-3">
          {desal.topMarkets.map((m: any) => (
            <div key={m.country} className="flex items-center gap-1">
              <span className="text-[7px] font-mono text-neutral-400">{m.country}</span>
              <span className="text-[8px] font-mono font-bold text-cyan-400 tabular-nums">{m.capacity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Water Utilities Section ──

function UtilitiesSection({ utilities }: { utilities: any[] }) {
  return (
    <div className="border-b border-cyan-400/30">
      <SectionHeader label="Water Utilities" />
      <div className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.5fr_0.4fr_0.4fr_0.4fr_0.5fr] px-3 py-0.5 border-b border-border/20 text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
        <span>Company</span>
        <span className="text-right">Mkt Cap</span>
        <span className="text-right">Rev Grw</span>
        <span className="text-right">EBITDA</span>
        <span className="text-right">Div</span>
        <span className="text-right">YTD</span>
        <span className="text-right">NRW</span>
        <span className="text-right">Cust.</span>
      </div>
      {utilities.map((u: any) => (
        <div
          key={u.ticker}
          className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.5fr_0.4fr_0.4fr_0.4fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <div>
            <span className="text-[8px] font-mono font-bold text-white">{u.company}</span>
            <span className="text-[6px] font-mono text-cyan-400/60 ml-1">{u.ticker}</span>
          </div>
          <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">${u.marketCap}</span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${u.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmtPct(u.revenueGrowth)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">{u.ebitdaMargin.toFixed(1)}%</span>
          <span className="text-[8px] font-mono text-cyan-400 text-right tabular-nums">{u.divYield.toFixed(1)}%</span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${u.stockYtd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmtPct(u.stockYtd)}
          </span>
          <span className="text-[7px] font-mono text-neutral-400 text-right tabular-nums">
            {u.nrw !== null ? u.nrw.toFixed(1) + '%' : '\u2014'}
          </span>
          <span className="text-[7px] font-mono text-neutral-400 text-right tabular-nums">
            {u.customers || '\u2014'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Infrastructure Section ──

function InfrastructureSection({ infra }: { infra: any }) {
  return (
    <div className="border-b border-cyan-400/30">
      <SectionHeader label="Water Infrastructure" />
      <div className="grid grid-cols-2 gap-px bg-border/10 mb-px">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Global Investment</div>
          <div className="text-[9px] font-mono font-bold text-white tabular-nums">{fmtVol(infra.globalInvestment)}/yr</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Investment Gap</div>
          <div className="text-[9px] font-mono font-bold text-red-400 tabular-nums">{fmtVol(infra.investmentGap)}/yr</div>
        </div>
      </div>

      <div className="px-3 py-1.5">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">Regional Breakdown</div>
        {infra.regionalBreakdown.map((r: any) => (
          <div key={r.region} className="flex items-center gap-2 py-0.5">
            <span className="text-[7px] font-mono text-neutral-400 w-28 truncate">{r.region}</span>
            <div className="flex-1 h-1.5 bg-white/[0.03] overflow-hidden">
              <div
                className="h-full bg-cyan-400"
                style={{ width: `${r.share}%`, opacity: 0.6 }}
              />
            </div>
            <span className="text-[7px] font-mono font-bold text-cyan-400 tabular-nums w-10 text-right">{fmtVol(r.investment)}</span>
            <span className="text-[6px] font-mono text-neutral-500 tabular-nums w-8 text-right">{r.share.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      <div className="px-3 py-1.5 border-t border-border/20">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">Key Trends</div>
        {infra.keyTrends.map((t: any) => (
          <div key={t.trend} className="flex items-center justify-between py-0.5">
            <span className="text-[7px] font-mono text-neutral-300">{t.trend}</span>
            <span className="text-[7px] font-mono font-bold text-green-400 tabular-nums">+{t.growth.toFixed(1)}% CAGR</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function WaterMarketPanel() {
  const { data, isLoading, refetch } = useWaterMarket();

  const d = data || FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-cyan-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Droplets className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            Water Market
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral-500 tabular-nums">
            {fmtVol(d.overview.marketSize)}
          </span>
          <span className="text-[7px] font-mono font-bold text-cyan-400 tabular-nums">
            {fmtNum(d.overview.stressedPopulation)} stressed
          </span>
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral-500 hover:text-cyan-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                Loading...
              </span>
            </div>
          </div>
        ) : (
          <>
            <OverviewSection overview={d.overview} />
            <WaterRightsSection rights={d.waterRights} />
            <ScarcityIndexSection indices={d.scarcityIndex} />
            <DesalinationSection desal={d.desalination} />
            <UtilitiesSection utilities={d.utilities} />
            <InfrastructureSection infra={d.infrastructure} />
          </>
        )}
      </div>
    </div>
  );
}
