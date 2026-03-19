import { useAITechCapex } from '../../api/hooks/use-ai-tech-capex';
import { Cpu } from 'lucide-react';

// ── Constants ──

const BLUE = '#60a5fa'; // blue-400
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';
const ORANGE = '#fb923c';
const PURPLE = '#c084fc';
const CYAN = '#22d3ee';

// ── Formatting helpers ──

function fmtDollar(n: number): string {
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'T';
  if (Math.abs(n) >= 1) return '$' + n.toFixed(1) + 'B';
  return '$' + (n * 1_000).toFixed(0) + 'M';
}

function fmtShort(n: number): string {
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'T';
  if (Math.abs(n) >= 1) return n.toFixed(1) + 'B';
  return (n * 1_000).toFixed(0) + 'M';
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtPctUnsigned(n: number): string {
  return n.toFixed(1) + '%';
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function constraintStyle(level: string): { color: string; bg: string; label: string } {
  switch (level.toUpperCase()) {
    case 'CRITICAL': return { color: RED, bg: 'rgba(248,113,113,0.15)', label: 'CRITICAL' };
    case 'SEVERE': return { color: ORANGE, bg: 'rgba(251,146,60,0.12)', label: 'SEVERE' };
    case 'MOD':
    case 'MODERATE': return { color: YELLOW, bg: 'rgba(251,191,36,0.1)', label: 'MOD' };
    case 'LOW': return { color: GREEN, bg: 'rgba(52,211,153,0.1)', label: 'LOW' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)', label: level };
  }
}

function supplyStatusStyle(status: string): { color: string; bg: string } {
  switch (status.toLowerCase()) {
    case 'constrained':
    case 'tight': return { color: RED, bg: 'rgba(248,113,113,0.12)' };
    case 'limited': return { color: ORANGE, bg: 'rgba(251,146,60,0.12)' };
    case 'moderate':
    case 'adequate': return { color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
    case 'available':
    case 'surplus': return { color: GREEN, bg: 'rgba(52,211,153,0.1)' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
  }
}

// ── Fallback data ──

const FALLBACK_DATA = {
  timestamp: '2026-03-19T14:30:00Z',
  overview: {
    totalCapex: 342.0,
    aiRelatedCapex: 198.5,
    yoyGrowth: 38.2,
    dataCenterConstruction: 127.4,
    aiChipRevenue: 184.6,
  },
  hyperscalers: [
    { company: 'Microsoft', ticker: 'MSFT', totalCapex: 80.0, aiCapexEstimate: 52.0, capexRevenueRatio: 29.4, yoyChange: 42.1, guidanceLow: 75.0, guidanceHigh: 85.0, dataCenterMW: 4800 },
    { company: 'Alphabet', ticker: 'GOOG', totalCapex: 75.0, aiCapexEstimate: 48.0, capexRevenueRatio: 19.8, yoyChange: 55.3, guidanceLow: 70.0, guidanceHigh: 80.0, dataCenterMW: 4200 },
    { company: 'Amazon', ticker: 'AMZN', totalCapex: 100.0, aiCapexEstimate: 55.0, capexRevenueRatio: 14.7, yoyChange: 32.8, guidanceLow: 90.0, guidanceHigh: 110.0, dataCenterMW: 5500 },
    { company: 'Meta', ticker: 'META', totalCapex: 45.0, aiCapexEstimate: 32.0, capexRevenueRatio: 24.1, yoyChange: 28.6, guidanceLow: 40.0, guidanceHigh: 50.0, dataCenterMW: 2800 },
    { company: 'Apple', ticker: 'AAPL', totalCapex: 12.0, aiCapexEstimate: 5.0, capexRevenueRatio: 2.9, yoyChange: 15.2, guidanceLow: 10.0, guidanceHigh: 14.0, dataCenterMW: 800 },
    { company: 'Oracle', ticker: 'ORCL', totalCapex: 16.0, aiCapexEstimate: 10.5, capexRevenueRatio: 28.6, yoyChange: 88.2, guidanceLow: 14.0, guidanceHigh: 18.0, dataCenterMW: 1200 },
    { company: 'ByteDance', ticker: 'PRIVATE', totalCapex: 14.0, aiCapexEstimate: 11.0, capexRevenueRatio: 12.3, yoyChange: 62.5, guidanceLow: 12.0, guidanceHigh: 16.0, dataCenterMW: 950 },
  ],
  aiChipMarket: [
    { company: 'NVIDIA', ticker: 'NVDA', revenue: 130.0, marketShare: 70.4, latestGpu: 'B200 / GB200 NVL72', supplyStatus: 'Constrained' },
    { company: 'AMD', ticker: 'AMD', revenue: 28.0, marketShare: 15.2, latestGpu: 'MI350X', supplyStatus: 'Limited' },
    { company: 'Intel', ticker: 'INTC', revenue: 4.2, marketShare: 2.3, latestGpu: 'Gaudi 3', supplyStatus: 'Available' },
    { company: 'Broadcom', ticker: 'AVGO', revenue: 12.0, marketShare: 6.5, latestGpu: 'Custom ASIC (Google TPU v6)', supplyStatus: 'Moderate' },
    { company: 'Marvell', ticker: 'MRVL', revenue: 5.8, marketShare: 3.1, latestGpu: 'Custom ASIC (AWS Trainium3)', supplyStatus: 'Limited' },
    { company: 'Cerebras', ticker: 'PRIVATE', revenue: 2.4, marketShare: 1.3, latestGpu: 'WSE-3', supplyStatus: 'Constrained' },
  ],
  dataCenterBuildOut: [
    { market: 'Northern Virginia', powerMW: 5200, availability: 'Tight', constructionPipeline: 3400, renewablePct: 42 },
    { market: 'Dallas/Ft. Worth', powerMW: 2800, availability: 'Moderate', constructionPipeline: 2100, renewablePct: 35 },
    { market: 'Phoenix/Mesa', powerMW: 1900, availability: 'Moderate', constructionPipeline: 1600, renewablePct: 58 },
    { market: 'Chicago', powerMW: 1400, availability: 'Adequate', constructionPipeline: 800, renewablePct: 31 },
    { market: 'Silicon Valley', powerMW: 1200, availability: 'Tight', constructionPipeline: 600, renewablePct: 52 },
    { market: 'Columbus, OH', powerMW: 950, availability: 'Available', constructionPipeline: 1200, renewablePct: 28 },
    { market: 'London', powerMW: 1100, availability: 'Tight', constructionPipeline: 700, renewablePct: 65 },
    { market: 'Frankfurt', powerMW: 900, availability: 'Moderate', constructionPipeline: 550, renewablePct: 72 },
    { market: 'Singapore', powerMW: 600, availability: 'Tight', constructionPipeline: 350, renewablePct: 18 },
    { market: 'Tokyo', powerMW: 800, availability: 'Moderate', constructionPipeline: 450, renewablePct: 24 },
  ],
  regionalInvestment: [
    { region: 'United States', investment: 210.0, majorProjects: 'Project Stargate ($500B JV), MSFT Iowa campus, GOOG Kansas City', keyInvestors: 'MSFT, GOOG, AMZN, ORCL' },
    { region: 'Europe', investment: 48.0, majorProjects: 'MSFT Sweden $3.2B, GOOG UK $1B, AWS Spain $17B', keyInvestors: 'MSFT, AMZN, GOOG, META' },
    { region: 'Asia-Pacific', investment: 52.0, majorProjects: 'MSFT Japan $2.9B, GOOG Malaysia $2B, AWS Thailand $5B', keyInvestors: 'AMZN, MSFT, GOOG, ByteDance' },
    { region: 'Middle East', investment: 18.5, majorProjects: 'MSFT UAE $1.5B, GOOG Saudi $10B, AWS Bahrain expansion', keyInvestors: 'GOOG, MSFT, AMZN, ORCL' },
    { region: 'Latin America', investment: 8.2, majorProjects: 'MSFT Brazil $2.7B, AWS Mexico expansion, GOOG Chile DC', keyInvestors: 'MSFT, AMZN, GOOG' },
    { region: 'Africa', investment: 3.8, majorProjects: 'MSFT South Africa $1B, GOOG Kenya, AWS Nigeria', keyInvestors: 'MSFT, GOOG, AMZN' },
  ],
  supplyChainBottlenecks: [
    { component: 'HBM3E Memory', leadTime: '26 weeks', priceChange: 42.5, supplier: 'SK Hynix / Samsung', constraintLevel: 'CRITICAL' },
    { component: 'CoWoS Packaging', leadTime: '20 weeks', priceChange: 35.0, supplier: 'TSMC', constraintLevel: 'CRITICAL' },
    { component: 'Advanced Node Wafers (3nm)', leadTime: '18 weeks', priceChange: 22.0, supplier: 'TSMC', constraintLevel: 'SEVERE' },
    { component: 'GPU Modules (B200)', leadTime: '16 weeks', priceChange: 18.5, supplier: 'NVIDIA / Foxconn', constraintLevel: 'SEVERE' },
    { component: 'Power Transformers', leadTime: '52 weeks', priceChange: 28.0, supplier: 'Hitachi Energy / Siemens', constraintLevel: 'SEVERE' },
    { component: 'Networking (800G)', leadTime: '12 weeks', priceChange: 8.2, supplier: 'Arista / Cisco', constraintLevel: 'MOD' },
    { component: 'Cooling Systems (Liquid)', leadTime: '14 weeks', priceChange: 15.4, supplier: 'Vertiv / Schneider', constraintLevel: 'MOD' },
    { component: 'Rack PDUs', leadTime: '8 weeks', priceChange: 5.1, supplier: 'Eaton / Schneider', constraintLevel: 'LOW' },
    { component: 'Fiber Optic Cable', leadTime: '6 weeks', priceChange: -2.3, supplier: 'Corning / Prysmian', constraintLevel: 'LOW' },
    { component: 'Diesel Generators', leadTime: '24 weeks', priceChange: 12.8, supplier: 'Caterpillar / Cummins', constraintLevel: 'MOD' },
  ],
};

// ── Main Panel ──

export function AITechCapexPanel() {
  const { data: hookData, isLoading, refetch } = useAITechCapex();
  const data = hookData ?? FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-blue-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Cpu className="w-3 h-3 text-blue-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-blue-400">
            AI &amp; Tech Capex
          </span>
        </div>
        <div className="flex items-center gap-3 text-[8px] text-neutral-400">
          <span>Hyperscaler Capex <span className="text-blue-400 font-bold">{fmtDollar(data.overview.totalCapex)}</span></span>
          <span>AI Chip TAM <span className="text-blue-400 font-bold">{fmtDollar(data.overview.aiChipRevenue)}</span></span>
          <button
            onClick={() => refetch()}
            className="text-neutral-500 hover:text-blue-400 transition-colors"
          >
            <svg className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <OverviewBar overview={data.overview} />

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        <HyperscalerCapexSection hyperscalers={data.hyperscalers} />
        <AIChipMarketSection chips={data.aiChipMarket} />
        <DataCenterBuildOutSection markets={data.dataCenterBuildOut} />
        <RegionalInvestmentSection regions={data.regionalInvestment} />
        <SupplyChainSection bottlenecks={data.supplyChainBottlenecks} />
      </div>
    </div>
  );
}

// ── Overview Stats Bar ──

function OverviewBar({ overview }: { overview: any }) {
  const stats = [
    { label: 'TOTAL CAPEX', value: fmtDollar(overview.totalCapex) },
    { label: 'AI-RELATED', value: fmtDollar(overview.aiRelatedCapex) },
    { label: 'YOY GROWTH', value: fmtPct(overview.yoyGrowth) },
    { label: 'DC CONSTRUCTION', value: fmtDollar(overview.dataCenterConstruction) },
    { label: 'AI CHIP REV', value: fmtDollar(overview.aiChipRevenue) },
  ];

  return (
    <div className="shrink-0 grid grid-cols-5 border-b border-blue-400/30">
      {stats.map((s: any, i: any) => (
        <div key={i} className="flex flex-col items-center py-1.5 px-1 border-r border-border/20 last:border-r-0">
          <span className="text-[7px] uppercase tracking-widest font-black text-neutral-500">{s.label}</span>
          <span className="text-[10px] font-bold tabular-nums text-blue-400">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Hyperscaler Capex Table ──

function HyperscalerCapexSection({ hyperscalers }: { hyperscalers: any[] }) {
  return (
    <div className="border-b border-blue-400/30">
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border/20">
        <div className="w-1 h-1 bg-blue-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-blue-400">Hyperscaler Capex</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_50px_50px_45px_45px_70px_40px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Company</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Capex</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">AI Est</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">C/R %</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">YoY</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Guidance</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">MW</span>
      </div>

      {/* Rows */}
      {hyperscalers.map((h: any, i: any) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_50px_50px_45px_45px_70px_40px] px-3 py-1 border-b border-border/20 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <div className="flex flex-col">
            <span className="text-neutral-300 font-bold truncate">{h.company}</span>
            <span className="text-[7px] text-neutral-500">{h.ticker}</span>
          </div>
          <span className="text-neutral-300 text-right tabular-nums">{fmtShort(h.totalCapex)}</span>
          <span className="text-blue-400 text-right tabular-nums font-bold">{fmtShort(h.aiCapexEstimate)}</span>
          <span className="text-neutral-300 text-right tabular-nums">{fmtPctUnsigned(h.capexRevenueRatio)}</span>
          <span className="text-right tabular-nums font-bold" style={{ color: changeColor(h.yoyChange) }}>
            {fmtPct(h.yoyChange)}
          </span>
          <span className="text-neutral-400 text-center tabular-nums text-[8px]">
            ${h.guidanceLow.toFixed(0)}-{h.guidanceHigh.toFixed(0)}B
          </span>
          <span className="text-neutral-300 text-right tabular-nums">{(h.dataCenterMW / 1000).toFixed(1)}K</span>
        </div>
      ))}
    </div>
  );
}

// ── AI Chip Market Section ──

function AIChipMarketSection({ chips }: { chips: any[] }) {
  return (
    <div className="border-b border-blue-400/30">
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border/20">
        <div className="w-1 h-1 bg-blue-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-blue-400">AI Chip Market</span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-px bg-border/20 mx-3 my-1.5">
        {chips.map((c: any, i: any) => {
          const ss = supplyStatusStyle(c.supplyStatus);
          return (
            <div key={i} className="bg-black p-2 hover:bg-blue-400/[0.02] transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-200 font-bold">{c.company}</span>
                  <span className="text-[7px] text-neutral-500">{c.ticker}</span>
                </div>
                <span
                  className="text-[6px] font-black uppercase px-1 py-0"
                  style={{ color: ss.color, backgroundColor: ss.bg }}
                >
                  {c.supplyStatus}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[8px]">
                <div>
                  <span className="text-neutral-500">Rev </span>
                  <span className="text-blue-400 font-bold tabular-nums">{fmtDollar(c.revenue)}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Share </span>
                  <span className="text-neutral-300 tabular-nums">{fmtPctUnsigned(c.marketShare)}</span>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-[7px] text-neutral-500">GPU</span>
                <span className="text-[7px] text-neutral-300 truncate">{c.latestGpu}</span>
              </div>
              {/* Market share bar */}
              <div className="mt-1 w-full h-[3px] bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full bg-blue-400/40"
                  style={{ width: `${c.marketShare}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Data Center Build-Out Section ──

function DataCenterBuildOutSection({ markets }: { markets: any[] }) {
  const maxMW = Math.max(...markets.map((m: any) => m.powerMW), 1);

  return (
    <div className="border-b border-blue-400/30">
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border/20">
        <div className="w-1 h-1 bg-blue-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-blue-400">Data Center Build-Out</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_50px_60px_55px_90px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Market</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Power MW</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Avail</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Pipeline</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Renewable %</span>
      </div>

      {/* Rows */}
      {markets.map((m: any, i: any) => {
        const avail = supplyStatusStyle(m.availability);
        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_50px_60px_55px_90px] px-3 py-1 border-b border-border/20 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <span className="text-neutral-300 font-bold truncate">{m.market}</span>
            <span className="text-neutral-300 text-right tabular-nums">{m.powerMW.toLocaleString()}</span>
            <div className="flex justify-center">
              <span
                className="text-[6px] font-black uppercase px-1 py-0"
                style={{ color: avail.color, backgroundColor: avail.bg }}
              >
                {m.availability}
              </span>
            </div>
            <span className="text-neutral-400 text-right tabular-nums">{m.constructionPipeline.toLocaleString()}</span>
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-blue-400 tabular-nums text-[8px] font-bold">{m.renewablePct}%</span>
              <div className="w-[40px] h-[4px] bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${m.renewablePct}%`,
                    backgroundColor: m.renewablePct >= 50 ? GREEN : m.renewablePct >= 30 ? YELLOW : ORANGE,
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Regional AI Investment Section ──

function RegionalInvestmentSection({ regions }: { regions: any[] }) {
  return (
    <div className="border-b border-blue-400/30">
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border/20">
        <div className="w-1 h-1 bg-blue-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-blue-400">Regional AI Investment</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[80px_55px_1fr_100px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Region</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Invest</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 pl-2">Major Projects</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Key Investors</span>
      </div>

      {/* Rows */}
      {regions.map((r: any, i: any) => (
        <div
          key={i}
          className="grid grid-cols-[80px_55px_1fr_100px] px-3 py-1 border-b border-border/20 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-neutral-300 font-bold truncate">{r.region}</span>
          <span className="text-blue-400 text-right tabular-nums font-bold">{fmtDollar(r.investment)}</span>
          <span className="text-neutral-400 truncate pl-2 text-[8px]">{r.majorProjects}</span>
          <span className="text-neutral-500 text-right truncate text-[8px]">{r.keyInvestors}</span>
        </div>
      ))}
    </div>
  );
}

// ── Supply Chain Bottlenecks Section ──

function SupplyChainSection({ bottlenecks }: { bottlenecks: any[] }) {
  return (
    <div className="border-b border-blue-400/30">
      {/* Section header */}
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-border/20">
        <div className="w-1 h-1 bg-blue-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-blue-400">Supply Chain Bottlenecks</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_45px_90px_55px] px-3 py-1 border-b border-border/20">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Component</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Lead Time</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Price</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Supplier</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">Level</span>
      </div>

      {/* Rows */}
      {bottlenecks.map((b: any, i: any) => {
        const cs = constraintStyle(b.constraintLevel);
        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_55px_45px_90px_55px] px-3 py-1 border-b border-border/20 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <span className="text-neutral-300 font-bold truncate">{b.component}</span>
            <span className="text-neutral-300 text-right tabular-nums">{b.leadTime}</span>
            <span className="text-right tabular-nums font-bold" style={{ color: changeColor(b.priceChange) }}>
              {fmtPct(b.priceChange)}
            </span>
            <span className="text-neutral-400 text-center truncate text-[8px]">{b.supplier}</span>
            <div className="flex justify-center">
              <span
                className="text-[6px] font-black uppercase px-1 py-0"
                style={{ color: cs.color, backgroundColor: cs.bg }}
              >
                {cs.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
