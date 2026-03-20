import { useCriticalMinerals } from '../../api/hooks/use-critical-minerals';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Gem } from 'lucide-react';

// ── Fallback Data ──

const FALLBACK_DATA = {
  timestamp: new Date().toISOString(),
  overview: {
    totalMarket: 320e9,
    growthRate: 12.4,
    chinaSupplyShare: 63.2,
    supplyRiskIndex: 7.8,
  },
  mineralPrices: [
    { mineral: 'Lithium Carbonate', price: 12.40, unit: '$/kg', dailyChange: -1.82, ytdChange: -24.6, low52w: 9.80, high52w: 22.50, primaryUse: 'EV Batteries', supplyConcentration: 'high' },
    { mineral: 'Cobalt', price: 29350, unit: '$/t', dailyChange: 0.74, ytdChange: -8.3, low52w: 24100, high52w: 38200, primaryUse: 'Battery Cathodes', supplyConcentration: 'critical' },
    { mineral: 'Nickel (Class 1)', price: 16420, unit: '$/t', dailyChange: -0.45, ytdChange: -18.7, low52w: 14850, high52w: 21300, primaryUse: 'Stainless/Batteries', supplyConcentration: 'moderate' },
    { mineral: 'Rare Earth (NdPr)', price: 62.80, unit: '$/kg', dailyChange: 2.14, ytdChange: 8.5, low52w: 48.20, high52w: 78.60, primaryUse: 'Magnets/Motors', supplyConcentration: 'critical' },
    { mineral: 'Graphite (Flake)', price: 538, unit: '$/t', dailyChange: -0.22, ytdChange: -32.1, low52w: 420, high52w: 890, primaryUse: 'Battery Anodes', supplyConcentration: 'high' },
    { mineral: 'Manganese', price: 4.85, unit: '$/kg', dailyChange: 0.62, ytdChange: -5.2, low52w: 3.90, high52w: 6.40, primaryUse: 'Steel/Batteries', supplyConcentration: 'moderate' },
    { mineral: 'Vanadium', price: 32.10, unit: '$/kg', dailyChange: 1.28, ytdChange: 14.3, low52w: 24.50, high52w: 38.20, primaryUse: 'Energy Storage', supplyConcentration: 'high' },
    { mineral: 'Gallium', price: 315, unit: '$/kg', dailyChange: 3.42, ytdChange: 42.8, low52w: 195, high52w: 340, primaryUse: 'Semiconductors', supplyConcentration: 'critical' },
    { mineral: 'Germanium', price: 1850, unit: '$/kg', dailyChange: 1.95, ytdChange: 38.2, low52w: 1120, high52w: 2050, primaryUse: 'Fiber Optics/IR', supplyConcentration: 'critical' },
    { mineral: 'Tungsten', price: 325, unit: '$/mtu', dailyChange: 0.31, ytdChange: 6.8, low52w: 270, high52w: 365, primaryUse: 'Cutting Tools', supplyConcentration: 'high' },
    { mineral: 'Antimony', price: 25400, unit: '$/t', dailyChange: 4.12, ytdChange: 68.5, low52w: 12800, high52w: 28600, primaryUse: 'Flame Retardant', supplyConcentration: 'critical' },
    { mineral: 'Titanium Sponge', price: 12.50, unit: '$/kg', dailyChange: 0.16, ytdChange: 3.2, low52w: 10.80, high52w: 14.20, primaryUse: 'Aerospace', supplyConcentration: 'moderate' },
  ],
  supplyChain: [
    { mineral: 'Lithium', topProducer: 'Australia', topProducerShare: 46.9, topProcessor: 'China', topProcessorShare: 65.3, chinaProcessing: 65.3 },
    { mineral: 'Cobalt', topProducer: 'DRC', topProducerShare: 72.6, topProcessor: 'China', topProcessorShare: 74.1, chinaProcessing: 74.1 },
    { mineral: 'Rare Earths', topProducer: 'China', topProducerShare: 69.8, topProcessor: 'China', topProcessorShare: 90.2, chinaProcessing: 90.2 },
    { mineral: 'Graphite', topProducer: 'China', topProducerShare: 65.4, topProcessor: 'China', topProcessorShare: 93.0, chinaProcessing: 93.0 },
    { mineral: 'Nickel', topProducer: 'Indonesia', topProducerShare: 48.6, topProcessor: 'China', topProcessorShare: 68.2, chinaProcessing: 68.2 },
    { mineral: 'Manganese', topProducer: 'South Africa', topProducerShare: 36.8, topProcessor: 'China', topProcessorShare: 58.4, chinaProcessing: 58.4 },
    { mineral: 'Gallium', topProducer: 'China', topProducerShare: 98.2, topProcessor: 'China', topProcessorShare: 98.8, chinaProcessing: 98.8 },
    { mineral: 'Germanium', topProducer: 'China', topProducerShare: 68.5, topProcessor: 'China', topProcessorShare: 83.7, chinaProcessing: 83.7 },
    { mineral: 'Tungsten', topProducer: 'China', topProducerShare: 82.4, topProcessor: 'China', topProcessorShare: 86.3, chinaProcessing: 86.3 },
    { mineral: 'Antimony', topProducer: 'China', topProducerShare: 48.1, topProcessor: 'China', topProcessorShare: 79.5, chinaProcessing: 79.5 },
  ],
  strategicReserves: [
    { entity: 'US (NDS)', reservesStatus: 'rebuilding', monthsOfSupply: 4.2, stockpilingTarget: '180-day', budget: 1.5e9 },
    { entity: 'EU (CRMA)', reservesStatus: 'establishing', monthsOfSupply: 1.8, stockpilingTarget: '90-day', budget: 3.4e9 },
    { entity: 'Japan (JOGMEC)', reservesStatus: 'adequate', monthsOfSupply: 8.6, stockpilingTarget: '60-day', budget: 820e6 },
    { entity: 'South Korea', reservesStatus: 'expanding', monthsOfSupply: 3.4, stockpilingTarget: '100-day', budget: 640e6 },
    { entity: 'India (KABIL)', reservesStatus: 'nascent', monthsOfSupply: 0.6, stockpilingTarget: 'TBD', budget: 210e6 },
    { entity: 'China (SRB)', reservesStatus: 'dominant', monthsOfSupply: 18.5, stockpilingTarget: 'classified', budget: 4.8e9 },
  ],
  demandDrivers: [
    { sector: 'Electric Vehicles', growth: 28.4, keyMinerals: ['Lithium', 'Cobalt', 'Nickel', 'Graphite', 'Rare Earths'], demandMultiple2030: 4.2 },
    { sector: 'Energy Storage', growth: 35.6, keyMinerals: ['Lithium', 'Vanadium', 'Iron Phosphate'], demandMultiple2030: 5.8 },
    { sector: 'Wind Turbines', growth: 18.2, keyMinerals: ['Rare Earths', 'Copper', 'Zinc'], demandMultiple2030: 2.4 },
    { sector: 'Semiconductors', growth: 22.8, keyMinerals: ['Gallium', 'Germanium', 'Silicon'], demandMultiple2030: 3.1 },
    { sector: 'Defense/Aerospace', growth: 14.6, keyMinerals: ['Titanium', 'Tungsten', 'Rare Earths', 'Cobalt'], demandMultiple2030: 1.9 },
    { sector: 'Hydrogen Economy', growth: 42.1, keyMinerals: ['Platinum', 'Iridium', 'Nickel'], demandMultiple2030: 7.2 },
  ],
  tradePolicy: [
    { date: '2026-03-15', country: 'China', action: 'Extended export controls on gallium & germanium compounds', affectedMinerals: ['Gallium', 'Germanium'], impact: 'high' },
    { date: '2026-03-08', country: 'US', action: 'Expanded critical minerals tax credits under IRA extension', affectedMinerals: ['Lithium', 'Nickel', 'Cobalt', 'Graphite'], impact: 'positive' },
    { date: '2026-02-28', country: 'EU', action: 'CRMA implementation: mandatory recycling targets enacted', affectedMinerals: ['Rare Earths', 'Cobalt', 'Lithium'], impact: 'moderate' },
    { date: '2026-02-20', country: 'Indonesia', action: 'Nickel ore export ban extended to processed products', affectedMinerals: ['Nickel'], impact: 'high' },
    { date: '2026-02-12', country: 'China', action: 'New antimony export licensing regime effective', affectedMinerals: ['Antimony'], impact: 'critical' },
    { date: '2026-01-30', country: 'Australia', action: 'Fast-track approvals for lithium & rare earth mining', affectedMinerals: ['Lithium', 'Rare Earths'], impact: 'positive' },
    { date: '2026-01-18', country: 'DRC', action: 'Revised mining code increases cobalt royalties 5% to 10%', affectedMinerals: ['Cobalt'], impact: 'moderate' },
    { date: '2026-01-05', country: 'US', action: 'Defense Production Act invoked for graphite processing', affectedMinerals: ['Graphite'], impact: 'moderate' },
  ],
};

// ── Formatting helpers ──

function fmtVol(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + n.toFixed(0);
}

function fmtPrice(n: number): string {
  if (n >= 10000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 100) return n.toFixed(0);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(3);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

// ── Color helpers ──

function concentrationBadge(level: string): { label: string; cls: string } {
  switch (level) {
    case 'critical':
      return { label: 'CRITICAL', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
    case 'high':
      return { label: 'HIGH', cls: 'text-orange-400 bg-orange-500/10 border border-orange-500/30' };
    case 'moderate':
      return { label: 'MODERATE', cls: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30' };
    default:
      return { label: 'LOW', cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
  }
}

function chinaBarColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-orange-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

function chinaTextColor(pct: number): string {
  if (pct >= 90) return 'text-red-400';
  if (pct >= 70) return 'text-orange-400';
  if (pct >= 50) return 'text-yellow-400';
  return 'text-green-400';
}

function reserveStatusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case 'dominant':
      return { label: 'DOMINANT', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
    case 'adequate':
      return { label: 'ADEQUATE', cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
    case 'expanding':
    case 'rebuilding':
      return { label: status.toUpperCase(), cls: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30' };
    case 'establishing':
      return { label: 'ESTABLISHING', cls: 'text-orange-400 bg-orange-500/10 border border-orange-500/30' };
    case 'nascent':
      return { label: 'NASCENT', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
    default:
      return { label: status.toUpperCase(), cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30' };
  }
}

function impactBadge(impact: string): { label: string; cls: string } {
  switch (impact) {
    case 'critical':
      return { label: 'CRITICAL', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
    case 'high':
      return { label: 'HIGH', cls: 'text-orange-400 bg-orange-500/10 border border-orange-500/30' };
    case 'moderate':
      return { label: 'MODERATE', cls: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30' };
    case 'positive':
      return { label: 'POSITIVE', cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
    default:
      return { label: impact.toUpperCase(), cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30' };
  }
}

// ── Section Header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 border-b border-orange-400/30 flex items-center gap-2">
      <div className="w-1 h-1 bg-orange-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-orange-400">
        {label}
      </span>
    </div>
  );
}

// ── Overview Section ──

function OverviewSection({ overview, t }: { overview: any; t: ReturnType<typeof useT> }) {
  const metrics = [
    { label: tr(t, 'cmTotalMarket', 'Total Market'), value: fmtVol(overview.totalMarket) },
    { label: tr(t, 'cmGrowth', 'Growth Rate'), value: fmtPct(overview.growthRate) },
    { label: tr(t, 'cmChinaShare', 'China Supply Share'), value: overview.chinaSupplyShare.toFixed(1) + '%' },
    { label: tr(t, 'cmRiskIndex', 'Supply Risk Index'), value: overview.supplyRiskIndex.toFixed(1) + '/10' },
  ];

  return (
    <div className="border-b border-orange-400/30">
      <SectionHeader label={tr(t, 'cmOverview', 'Market Overview')} />
      <div className="grid grid-cols-4 gap-px bg-border/10">
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

// ── Mineral Prices Section ──

function MineralPricesSection({ minerals, t }: { minerals: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-orange-400/30">
      <SectionHeader label={tr(t, 'cmPrices', 'Mineral Prices')} />
      <div className="grid grid-cols-[1.2fr_0.7fr_0.5fr_0.5fr_0.5fr_0.8fr_0.8fr_0.6fr] px-3 py-0.5 border-b border-border/20 text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'cmMineral', 'Mineral')}</span>
        <span className="text-right">{tr(t, 'cmPrice', 'Price')}</span>
        <span className="text-right">{tr(t, 'cmDaily', '1D')}</span>
        <span className="text-right">{tr(t, 'cmYtd', 'YTD')}</span>
        <span className="text-right">{tr(t, 'cm52w', '52W Range')}</span>
        <span>{tr(t, 'cmUse', 'Primary Use')}</span>
        <span>{tr(t, 'cmConcentration', 'Concentration')}</span>
        <span />
      </div>
      {minerals.map((m: any) => {
        const badge = concentrationBadge(m.supplyConcentration);
        return (
          <div
            key={m.mineral}
            className="grid grid-cols-[1.2fr_0.7fr_0.5fr_0.5fr_0.5fr_0.8fr_0.8fr_0.6fr] px-3 py-1 border-b border-border/20 hover:bg-orange-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{m.mineral}</span>
            <div className="text-right">
              <span className="text-[8px] font-mono font-bold text-white tabular-nums">{fmtPrice(m.price)}</span>
              <span className="text-[6px] font-mono text-neutral-600 ml-1">{m.unit}</span>
            </div>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${m.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtPct(m.dailyChange)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${m.ytdChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtPct(m.ytdChange)}
            </span>
            <div className="text-right">
              <span className="text-[6px] font-mono text-neutral-600 tabular-nums">{fmtPrice(m.low52w)}-{fmtPrice(m.high52w)}</span>
            </div>
            <span className="text-[7px] font-mono text-neutral-400 truncate">{m.primaryUse}</span>
            <span className={`text-[6px] font-black font-mono uppercase px-1 py-0 ${badge.cls} inline-block w-fit`}>
              {badge.label}
            </span>
            <span />
          </div>
        );
      })}
    </div>
  );
}

// ── Supply Chain Concentration Section ──

function SupplyChainSection({ supplyChain, t }: { supplyChain: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-orange-400/30">
      <SectionHeader label={tr(t, 'cmSupplyChain', 'Supply Chain Concentration')} />
      <div className="grid grid-cols-[1fr_1.2fr_1.2fr_1fr] px-3 py-0.5 border-b border-border/20 text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'cmMineral', 'Mineral')}</span>
        <span>{tr(t, 'cmTopProducer', 'Top Producer')}</span>
        <span>{tr(t, 'cmTopProcessor', 'Top Processor')}</span>
        <span>{tr(t, 'cmChinaProcessing', 'China Processing')}</span>
      </div>
      {supplyChain.map((s: any) => (
        <div
          key={s.mineral}
          className="grid grid-cols-[1fr_1.2fr_1.2fr_1fr] px-3 py-1 border-b border-border/20 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{s.mineral}</span>
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-mono text-neutral-300">{s.topProducer}</span>
            <span className="text-[7px] font-mono text-neutral-500 tabular-nums">{s.topProducerShare.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-mono text-neutral-300">{s.topProcessor}</span>
            <span className="text-[7px] font-mono text-neutral-500 tabular-nums">{s.topProcessorShare.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-2 bg-white/[0.03] overflow-hidden">
              <div
                className={`h-full ${chinaBarColor(s.chinaProcessing)}`}
                style={{ width: `${Math.min(s.chinaProcessing, 100)}%`, opacity: 0.7 }}
              />
            </div>
            <span className={`text-[7px] font-mono font-bold tabular-nums w-10 text-right ${chinaTextColor(s.chinaProcessing)}`}>
              {s.chinaProcessing.toFixed(1)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Strategic Reserves Section ──

function StrategicReservesSection({ reserves, t }: { reserves: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-orange-400/30">
      <SectionHeader label={tr(t, 'cmReserves', 'Strategic Reserves')} />
      <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.7fr] px-3 py-0.5 border-b border-border/20 text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'cmEntity', 'Entity')}</span>
        <span className="text-center">{tr(t, 'cmStatus', 'Status')}</span>
        <span className="text-right">{tr(t, 'cmMonths', 'Months')}</span>
        <span className="text-right">{tr(t, 'cmTarget', 'Target')}</span>
        <span className="text-right">{tr(t, 'cmBudget', 'Budget')}</span>
      </div>
      {reserves.map((r: any) => {
        const badge = reserveStatusBadge(r.reservesStatus);
        return (
          <div
            key={r.entity}
            className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 hover:bg-orange-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">{r.entity}</span>
            <div className="flex justify-center">
              <span className={`text-[6px] font-black font-mono uppercase px-1 py-0 ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <span className="text-[8px] font-mono font-bold text-white text-right tabular-nums">
              {r.monthsOfSupply.toFixed(1)}
            </span>
            <span className="text-[7px] font-mono text-neutral-400 text-right">{r.stockpilingTarget}</span>
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">{fmtVol(r.budget)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Demand Drivers Section ──

function DemandDriversSection({ drivers, t }: { drivers: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-orange-400/30">
      <SectionHeader label={tr(t, 'cmDemand', 'Demand Drivers')} />
      <div className="grid grid-cols-[1fr_0.5fr_1.5fr_0.6fr] px-3 py-0.5 border-b border-border/20 text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'cmSector', 'Sector')}</span>
        <span className="text-right">{tr(t, 'cmGrowthPct', 'Growth')}</span>
        <span>{tr(t, 'cmKeyMinerals', 'Key Minerals')}</span>
        <span className="text-right">{tr(t, 'cm2030', '2030 Mult.')}</span>
      </div>
      {drivers.map((d: any) => (
        <div
          key={d.sector}
          className="grid grid-cols-[1fr_0.5fr_1.5fr_0.6fr] px-3 py-1 border-b border-border/20 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{d.sector}</span>
          <span className="text-[8px] font-mono font-bold text-green-400 text-right tabular-nums">
            +{d.growth.toFixed(1)}%
          </span>
          <div className="flex flex-wrap gap-0.5">
            {d.keyMinerals.map((km: any) => (
              <span
                key={km}
                className="text-[6px] font-mono font-bold text-orange-400/80 bg-orange-500/10 px-1 py-0"
              >
                {km}
              </span>
            ))}
          </div>
          <span className="text-[8px] font-mono font-bold text-orange-400 text-right tabular-nums">
            {d.demandMultiple2030.toFixed(1)}x
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Trade Policy & Geopolitics Section ──

function TradePolicySection({ policies, t }: { policies: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-orange-400/30">
      <SectionHeader label={tr(t, 'cmPolicy', 'Trade Policy & Geopolitics')} />
      {policies.map((p: any, idx: any) => {
        const badge = impactBadge(p.impact);
        return (
          <div
            key={idx}
            className="px-3 py-1.5 border-b border-border/20 hover:bg-orange-400/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[7px] font-mono text-neutral-600 tabular-nums">{p.date}</span>
              <span className="text-[7px] font-mono font-bold text-orange-400">{p.country}</span>
              <span className={`text-[6px] font-black font-mono uppercase px-1 py-0 ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <div className="text-[8px] font-mono text-neutral-300 leading-relaxed mb-0.5">
              {p.action}
            </div>
            <div className="flex flex-wrap gap-0.5">
              {p.affectedMinerals.map((am: any) => (
                <span
                  key={am}
                  className="text-[6px] font-mono font-bold text-neutral-500 bg-white/[0.04] px-1 py-0"
                >
                  {am}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function CriticalMineralsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCriticalMinerals();

  const d = data || FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-orange-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Gem className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            {tr(t, 'cmTitle', 'Critical Minerals')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral-500 tabular-nums">
            {fmtVol(d.overview.totalMarket)}
          </span>
          <span className="text-[7px] font-mono font-bold text-orange-400 tabular-nums">
            CN {d.overview.chinaSupplyShare.toFixed(1)}%
          </span>
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral-500 hover:text-orange-400 transition-colors"
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
              <div className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : (
          <>
            <OverviewSection overview={d.overview} t={t} />
            <MineralPricesSection minerals={d.mineralPrices} t={t} />
            <SupplyChainSection supplyChain={d.supplyChain} t={t} />
            <StrategicReservesSection reserves={d.strategicReserves} t={t} />
            <DemandDriversSection drivers={d.demandDrivers} t={t} />
            <TradePolicySection policies={d.tradePolicy} t={t} />
          </>
        )}
      </div>
    </div>
  );
}
