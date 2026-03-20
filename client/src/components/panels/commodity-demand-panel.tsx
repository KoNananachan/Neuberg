import { useCommodityDemand } from '../../api/hooks/use-commodity-demand';
import { useT, tr, TFn } from '../../i18n';

// ── Types ──

interface CommoditySummary {
  totalEnergySurplus: number;
  totalMetalsDeficit: number;
  avgDemandGrowth: number;
  commoditiesInDeficit: number;
  commoditiesInSurplus: number;
}

interface Commodity {
  name: string;
  sector: string;
  currentDemand: number;
  demandUnit: string;
  currentSupply: number;
  supplyDemandBalance: number;
  balanceStatus: string;
  inventoryDays: number;
  inventoryChange: number;
  demandGrowthYoY: number;
  supplyGrowthYoY: number;
  forecastQ1: number;
  forecastQ2: number;
  forecastQ3: number;
  forecastQ4: number;
  forecastChangeQ4: number;
  topConsumers: string[];
  spotPrice: number;
  priceUnit: string;
}

interface CommodityDemandData {
  commodities: Commodity[];
  summary: CommoditySummary;
}

// ── Formatting helpers ──

function fmtNum(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtBalance(n: number): string {
  return (n >= 0 ? '+' : '') + fmtNum(n);
}

// ── Color helpers ──

function balanceColor(status: string): string {
  const s = status.toUpperCase();
  if (s === 'DEFICIT') return 'text-red-400';
  if (s === 'SURPLUS') return 'text-green-400';
  return 'text-neutral-400';
}

function balanceBg(status: string): string {
  const s = status.toUpperCase();
  if (s === 'DEFICIT') return 'bg-red-400/[0.06]';
  if (s === 'SURPLUS') return 'bg-green-400/[0.06]';
  return '';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function invChangeColor(n: number): string {
  // Negative inventory change = declining = red; positive = building = green
  if (n < 0) return 'text-red-400';
  if (n > 0) return 'text-green-400';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function CommodityDemandPanel() {
  const t = useT();
  const { data, isLoading } = useCommodityDemand();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest animate-pulse">
          LOADING...
        </div>
      </div>
    );
  }

  const typed = data as CommodityDemandData | undefined;
  const commodities = typed?.commodities ?? [];
  const summary = typed?.summary;

  // Group by sector
  const sectors = new Map<string, Commodity[]>();
  for (const c of commodities) {
    const existing = sectors.get(c.sector);
    if (existing) {
      existing.push(c);
    } else {
      sectors.set(c.sector, [c]);
    }
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden font-mono">
      {/* Header */}
      <div className="px-3 py-2 border-b border-amber-400/30 shrink-0">
        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
          {tr(t, 'panelCommodityDemand', 'COMMODITY DEMAND FORECAST')}
        </span>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="grid grid-cols-5 border-b border-amber-400/30 shrink-0">
          <SummaryCell label="AVG DEMAND GROWTH" value={fmtPct(summary.avgDemandGrowth)} color={changeColor(summary.avgDemandGrowth)} />
          <SummaryCell label="IN DEFICIT" value={String(summary.commoditiesInDeficit)} color="text-red-400" />
          <SummaryCell label="IN SURPLUS" value={String(summary.commoditiesInSurplus)} color="text-green-400" />
          <SummaryCell label="ENERGY SURPLUS" value={fmtNum(summary.totalEnergySurplus)} color="text-green-400" />
          <SummaryCell label="METALS DEFICIT" value={fmtNum(summary.totalMetalsDeficit)} color="text-red-400" />
        </div>
      )}

      {/* Main table */}
      <div className="flex-1 overflow-auto no-scrollbar">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-black/95 z-10">
            <tr className="text-[7px] font-black text-neutral-500 uppercase tracking-wider border-b border-amber-400/30">
              <th className="px-2 py-1.5 text-left">COMMODITY</th>
              <th className="px-2 py-1.5 text-right">DEMAND</th>
              <th className="px-2 py-1.5 text-right">SUPPLY</th>
              <th className="px-2 py-1.5 text-right">BALANCE</th>
              <th className="px-2 py-1.5 text-center">STATUS</th>
              <th className="px-2 py-1.5 text-right">INV DAYS</th>
              <th className="px-2 py-1.5 text-right">INV CHG</th>
              <th className="px-2 py-1.5 text-right">DEMAND YOY</th>
              <th className="px-2 py-1.5 text-right">SUPPLY YOY</th>
              <th className="px-2 py-1.5 text-right">Q1 FCST</th>
              <th className="px-2 py-1.5 text-right">Q4 FCST</th>
              <th className="px-2 py-1.5 text-right">Q4 CHG</th>
              <th className="px-2 py-1.5 text-right">PRICE</th>
            </tr>
          </thead>
          <tbody>
            {[...sectors.entries()].map(([sector, items]) => (
              <SectorGroup key={sector} sector={sector} items={items} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Summary Cell ──

function SummaryCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-2 py-1.5 border-r border-amber-400/10 last:border-r-0">
      <div className="text-[7px] text-neutral-500 uppercase tracking-wider font-black">{label}</div>
      <div className={`text-[9px] font-bold ${color}`}>{value}</div>
    </div>
  );
}

// ── Sector Group ──

function SectorGroup({ sector, items }: { sector: string; items: Commodity[] }) {
  return (
    <>
      {/* Sector header row */}
      <tr className="bg-amber-400/[0.04]">
        <td colSpan={13} className="px-2 py-1 text-[7px] font-black text-amber-400/70 uppercase tracking-wider border-b border-amber-400/10">
          {sector}
        </td>
      </tr>
      {/* Commodity rows */}
      {items.map((c) => (
        <CommodityRow key={c.name} commodity={c} />
      ))}
    </>
  );
}

// ── Commodity Row ──

function CommodityRow({ commodity: c }: { commodity: Commodity }) {
  const status = (c.balanceStatus || '').toUpperCase();

  return (
    <tr className={`border-b border-neutral-800/30 hover:bg-amber-400/[0.02] transition-colors ${balanceBg(c.balanceStatus)}`}>
      {/* Name */}
      <td className="px-2 py-1.5 font-bold text-amber-400 whitespace-nowrap">{c.name}</td>

      {/* Demand */}
      <td className="px-2 py-1.5 text-right text-white/80">
        {fmtNum(c.currentDemand)}
        <span className="text-neutral-600 ml-0.5">{c.demandUnit}</span>
      </td>

      {/* Supply */}
      <td className="px-2 py-1.5 text-right text-white/80">{fmtNum(c.currentSupply)}</td>

      {/* Balance */}
      <td className={`px-2 py-1.5 text-right font-bold ${balanceColor(c.balanceStatus)}`}>
        {fmtBalance(c.supplyDemandBalance)}
      </td>

      {/* Status badge */}
      <td className="px-2 py-1.5 text-center">
        <StatusBadge status={status} />
      </td>

      {/* Inventory days */}
      <td className="px-2 py-1.5 text-right text-white/60">{c.inventoryDays.toFixed(1)}</td>

      {/* Inventory change */}
      <td className={`px-2 py-1.5 text-right font-bold ${invChangeColor(c.inventoryChange)}`}>
        {c.inventoryChange >= 0 ? '+' : ''}{c.inventoryChange.toFixed(1)}
      </td>

      {/* Demand YoY */}
      <td className={`px-2 py-1.5 text-right ${changeColor(c.demandGrowthYoY)}`}>
        {fmtPct(c.demandGrowthYoY)}
      </td>

      {/* Supply YoY */}
      <td className={`px-2 py-1.5 text-right ${changeColor(c.supplyGrowthYoY)}`}>
        {fmtPct(c.supplyGrowthYoY)}
      </td>

      {/* Q1 Forecast */}
      <td className="px-2 py-1.5 text-right text-white/70">{fmtNum(c.forecastQ1)}</td>

      {/* Q4 Forecast */}
      <td className="px-2 py-1.5 text-right text-white/70">{fmtNum(c.forecastQ4)}</td>

      {/* Q4 Change */}
      <td className={`px-2 py-1.5 text-right font-bold ${changeColor(c.forecastChangeQ4)}`}>
        {fmtPct(c.forecastChangeQ4)}
      </td>

      {/* Spot Price */}
      <td className="px-2 py-1.5 text-right text-white/80 font-bold whitespace-nowrap">
        {fmtPrice(c.spotPrice)}
        <span className="text-neutral-600 ml-0.5">{c.priceUnit}</span>
      </td>
    </tr>
  );
}

// ── Status Badge ──

function StatusBadge({ status }: { status: string }) {
  let bgClass = 'bg-neutral-500/15 border-neutral-500/30';
  let textClass = 'text-neutral-400';

  if (status === 'DEFICIT') {
    bgClass = 'bg-red-500/15 border-red-500/30';
    textClass = 'text-red-400';
  } else if (status === 'SURPLUS') {
    bgClass = 'bg-green-500/15 border-green-500/30';
    textClass = 'text-green-400';
  } else if (status === 'BALANCED') {
    bgClass = 'bg-amber-500/15 border-amber-500/30';
    textClass = 'text-amber-400';
  }

  return (
    <span className={`px-1.5 py-0.5 text-[6px] font-black uppercase tracking-wider border ${bgClass} ${textClass}`}>
      {status || 'N/A'}
    </span>
  );
}
