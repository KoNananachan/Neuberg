import { useSupplyChainStress } from '../../api/hooks/use-supply-chain-stress';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Fallback mock data ──

const MOCK_DATA = {
  timestamp: new Date().toISOString(),
  pressureIndex: {
    current: 2.14,
    previous: 1.87,
    change: 0.27,
    level: 'elevated' as const,
    percentile: 78,
    history: [0.82, 0.95, 1.12, 1.34, 1.18, 1.45, 1.62, 1.78, 1.55, 1.87, 2.14],
  },
  shippingRates: [
    { route: 'SCFI Composite', rate: 1842, change: 12.4, unit: '$/TEU', status: 'elevated' as const },
    { route: 'Shanghai-USWC', rate: 2650, change: 8.7, unit: '$/FEU', status: 'elevated' as const },
    { route: 'Shanghai-Europe', rate: 2180, change: -3.2, unit: '$/TEU', status: 'normal' as const },
    { route: 'Baltic Dry Index', rate: 1534, change: 5.1, unit: 'pts', status: 'normal' as const },
    { route: 'Shanghai-USEC', rate: 3820, change: 18.6, unit: '$/FEU', status: 'severe' as const },
    { route: 'Trans-Pacific Avg', rate: 3235, change: 14.2, unit: '$/FEU', status: 'elevated' as const },
  ],
  portCongestion: [
    { port: 'Los Angeles', vessels: 28, avgWait: 4.2, change: 1.3, status: 'elevated' as const },
    { port: 'Long Beach', vessels: 22, avgWait: 3.8, change: 0.9, status: 'elevated' as const },
    { port: 'Shanghai', vessels: 14, avgWait: 1.6, change: -0.4, status: 'normal' as const },
    { port: 'Rotterdam', vessels: 18, avgWait: 2.4, change: 0.6, status: 'normal' as const },
    { port: 'Singapore', vessels: 32, avgWait: 5.1, change: 2.8, status: 'severe' as const },
    { port: 'Busan', vessels: 11, avgWait: 1.2, change: -0.2, status: 'normal' as const },
    { port: 'Savannah', vessels: 16, avgWait: 2.8, change: 1.1, status: 'elevated' as const },
    { port: 'Hamburg', vessels: 9, avgWait: 1.4, change: 0.1, status: 'normal' as const },
  ],
  supplierDeliveryTimes: [
    { region: 'US Manufacturing', current: 52.8, baseline: 50.0, change: 1.4, trend: 'worsening' as const },
    { region: 'EU Manufacturing', current: 48.6, baseline: 50.0, change: -0.8, trend: 'improving' as const },
    { region: 'China Manufacturing', current: 51.2, baseline: 50.0, change: 0.6, trend: 'worsening' as const },
    { region: 'Japan Manufacturing', current: 49.4, baseline: 50.0, change: -1.2, trend: 'improving' as const },
    { region: 'EM Asia', current: 53.6, baseline: 50.0, change: 2.1, trend: 'worsening' as const },
    { region: 'UK Manufacturing', current: 50.8, baseline: 50.0, change: 0.3, trend: 'worsening' as const },
  ],
  commodityFreight: [
    { commodity: 'Crude Oil', route: 'MEG-Asia', rate: 48500, unit: '$/day', change: 6.2, status: 'elevated' as const },
    { commodity: 'Iron Ore', route: 'Brazil-China', rate: 22.4, unit: '$/mt', change: -2.1, status: 'normal' as const },
    { commodity: 'Coal', route: 'Australia-Asia', rate: 14.8, unit: '$/mt', change: 3.4, status: 'normal' as const },
    { commodity: 'LNG', route: 'US-Europe', rate: 82000, unit: '$/day', change: 15.8, status: 'severe' as const },
    { commodity: 'Grain', route: 'US Gulf-Asia', rate: 38.2, unit: '$/mt', change: 4.6, status: 'elevated' as const },
    { commodity: 'Chemicals', route: 'Trans-Pacific', rate: 62.5, unit: '$/mt', change: 1.2, status: 'normal' as const },
  ],
  inventoryToSales: [
    { sector: 'Retail', ratio: 1.24, baseline: 1.30, change: -0.04, trend: 'tightening' as const },
    { sector: 'Wholesale', ratio: 1.35, baseline: 1.32, change: 0.02, trend: 'building' as const },
    { sector: 'Manufacturing', ratio: 1.48, baseline: 1.42, change: 0.08, trend: 'building' as const },
    { sector: 'Auto Dealers', ratio: 0.94, baseline: 1.15, change: -0.06, trend: 'tightening' as const },
    { sector: 'Electronics', ratio: 1.18, baseline: 1.25, change: -0.03, trend: 'tightening' as const },
    { sector: 'Food & Bev', ratio: 1.41, baseline: 1.38, change: 0.01, trend: 'stable' as const },
  ],
};

type MockData = typeof MOCK_DATA;
type StatusLevel = 'normal' | 'elevated' | 'severe';
type TrendDirection = 'improving' | 'worsening';
type InventoryTrend = 'tightening' | 'building' | 'stable';

// ── Formatting helpers ──

function fmtNum(n: number, decimals = 1): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtRate(n: number): string {
  if (n >= 10000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 100) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(1);
}

// ── Color helpers ──

function statusColor(status: StatusLevel): string {
  if (status === 'severe') return 'text-red-400';
  if (status === 'elevated') return 'text-amber-400';
  return 'text-green-400';
}

function statusBg(status: StatusLevel): string {
  if (status === 'severe') return 'bg-red-500/10 border border-red-500/30';
  if (status === 'elevated') return 'bg-amber-500/10 border border-amber-500/30';
  return 'bg-green-500/10 border border-green-500/30';
}

function statusLabel(status: StatusLevel): string {
  if (status === 'severe') return 'SEVERE';
  if (status === 'elevated') return 'ELEVATED';
  return 'NORMAL';
}

function trendColor(trend: TrendDirection): string {
  if (trend === 'improving') return 'text-green-400';
  return 'text-red-400';
}

function inventoryTrendColor(trend: InventoryTrend): string {
  if (trend === 'tightening') return 'text-red-400';
  if (trend === 'building') return 'text-amber-400';
  return 'text-green-400';
}

function changeColor(n: number, invert = false): string {
  const positive = invert ? n < 0 : n > 0;
  const negative = invert ? n > 0 : n < 0;
  if (positive) return 'text-red-400';
  if (negative) return 'text-green-400';
  return 'text-neutral-500';
}

function pressureLevelColor(level: string): string {
  if (level === 'severe' || level === 'critical') return 'text-red-400';
  if (level === 'elevated') return 'text-amber-400';
  if (level === 'low') return 'text-green-400';
  return 'text-green-400';
}

function pressureLevelBg(level: string): string {
  if (level === 'severe' || level === 'critical') return 'bg-red-500/10 border border-red-500/30';
  if (level === 'elevated') return 'bg-amber-500/10 border border-amber-500/30';
  return 'bg-green-500/10 border border-green-500/30';
}

// ── Sparkline ──

function PressureSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  const W = 120;
  const H = 32;
  const PAD = 2;

  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const rangeV = maxV - minV || 0.01;

  const scaleX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const scaleY = (v: number) => PAD + ((maxV - v) / rangeV) * (H - PAD * 2);

  const linePath = data
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
    .join(' ');

  const fillPath = `${linePath} L ${scaleX(data.length - 1).toFixed(1)},${H} L ${scaleX(0).toFixed(1)},${H} Z`;

  const lastVal = data[data.length - 1];
  const lineColor = lastVal > 2 ? '#f87171' : lastVal > 1 ? '#fbbf24' : '#4ade80';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 32 }}>
      <path d={fillPath} fill={lineColor} fillOpacity={0.06} />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={1.2} />
      <circle
        cx={scaleX(data.length - 1)}
        cy={scaleY(lastVal)}
        r={2}
        fill={lineColor}
      />
    </svg>
  );
}

// ── Pressure Gauge Bar ──

function PressureGauge({ percentile }: { percentile: number }) {
  const color = percentile > 80 ? '#f87171' : percentile > 50 ? '#fbbf24' : '#4ade80';

  return (
    <div className="w-full h-1.5 bg-white/[0.04] relative mt-1">
      <div
        className="absolute top-0 left-0 h-full"
        style={{ width: `${percentile}%`, backgroundColor: color, opacity: 0.7 }}
      />
      <div className="absolute top-0 left-1/4 w-px h-full bg-white/[0.08]" />
      <div className="absolute top-0 left-1/2 w-px h-full bg-white/[0.08]" />
      <div className="absolute top-0 left-3/4 w-px h-full bg-white/[0.08]" />
    </div>
  );
}

// ── Section: Global Pressure Index ──

function PressureIndexSection({
  pressureIndex,
  t,
}: {
  pressureIndex: MockData['pressureIndex'];
  t: ReturnType<typeof useT>;
}) {
  const changeSign = pressureIndex.change >= 0 ? '+' : '';
  const changeClass = pressureIndex.change > 0 ? 'text-red-400' : 'text-green-400';

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scsGlobalPressureIndex', 'Global Supply Chain Pressure Index')}
        </span>
      </div>
      <div className="px-3 py-2">
        <div className="flex items-start gap-4">
          {/* Main value */}
          <div className="shrink-0">
            <div className="flex items-baseline gap-2">
              <span className={`text-[22px] font-mono font-black ${pressureLevelColor(pressureIndex.level)}`}>
                {pressureIndex.current.toFixed(2)}
              </span>
              <span className={`text-[9px] font-mono font-bold ${changeClass}`}>
                {changeSign}{pressureIndex.change.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[7px] font-mono font-black uppercase px-1 py-px ${pressureLevelColor(pressureIndex.level)} ${pressureLevelBg(pressureIndex.level)}`}
              >
                {pressureIndex.level.toUpperCase()}
              </span>
              <span className="text-[7px] font-mono text-neutral-600">
                {pressureIndex.percentile}th {tr(t, 'scsPercentile', 'percentile')}
              </span>
            </div>
            <PressureGauge percentile={pressureIndex.percentile} />
            <div className="flex justify-between mt-0.5">
              <span className="text-[6px] font-mono text-neutral-700">0</span>
              <span className="text-[6px] font-mono text-neutral-700">25</span>
              <span className="text-[6px] font-mono text-neutral-700">50</span>
              <span className="text-[6px] font-mono text-neutral-700">75</span>
              <span className="text-[6px] font-mono text-neutral-700">100</span>
            </div>
          </div>

          {/* Sparkline */}
          <div className="flex-1 min-w-0">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
              {tr(t, 'scsHistoricalTrend', '12-Month Trend')}
            </div>
            <PressureSparkline data={pressureIndex.history} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section: Shipping Rates ──

function ShippingRatesSection({
  rates,
  t,
}: {
  rates: MockData['shippingRates'];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scsShippingRates', 'Shipping Rates')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_70px_60px_50px_52px] px-3 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'scsRoute', 'Route')}</span>
        <span className="text-right">{tr(t, 'scsRate', 'Rate')}</span>
        <span className="text-right">{tr(t, 'scsUnit', 'Unit')}</span>
        <span className="text-right">{tr(t, 'scsChg', 'Chg%')}</span>
        <span className="text-right">{tr(t, 'scsStatus', 'Status')}</span>
      </div>

      {rates.map((r) => (
        <div
          key={r.route}
          className="grid grid-cols-[1fr_70px_60px_50px_52px] px-3 py-0.5 border-b border-border/[0.06] hover:bg-sky-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-bold text-white/70 truncate">{r.route}</span>
          <span className="text-[8px] font-mono text-white/80 text-right">{fmtRate(r.rate)}</span>
          <span className="text-[7px] font-mono text-neutral-600 text-right">{r.unit}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.change)}`}>
            {fmtChange(r.change)}
          </span>
          <span className="text-right">
            <span className={`text-[6px] font-mono font-black uppercase px-1 py-px ${statusColor(r.status)} ${statusBg(r.status)}`}>
              {statusLabel(r.status)}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Port Congestion ──

function PortCongestionSection({
  ports,
  t,
}: {
  ports: MockData['portCongestion'];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scsPortCongestion', 'Port Congestion')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_50px_55px_50px_52px] px-3 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'scsPort', 'Port')}</span>
        <span className="text-right">{tr(t, 'scsVessels', 'Ships')}</span>
        <span className="text-right">{tr(t, 'scsAvgWait', 'Wait(d)')}</span>
        <span className="text-right">{tr(t, 'scsChg', 'Chg')}</span>
        <span className="text-right">{tr(t, 'scsStatus', 'Status')}</span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border/[0.04]">
        {ports.map((p) => (
          <div
            key={p.port}
            className="bg-black px-2 py-1 hover:bg-sky-400/[0.02] transition-colors"
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] font-mono font-bold text-white/70">{p.port}</span>
              <span className={`text-[6px] font-mono font-black uppercase px-1 py-px ${statusColor(p.status)} ${statusBg(p.status)}`}>
                {statusLabel(p.status)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <span className="text-[6px] font-mono text-neutral-600 uppercase">Ships</span>
                  <span className="text-[9px] font-mono font-bold text-white/80 ml-1">{p.vessels}</span>
                </div>
                <div>
                  <span className="text-[6px] font-mono text-neutral-600 uppercase">Wait</span>
                  <span className="text-[9px] font-mono font-bold text-white/80 ml-1">{p.avgWait}d</span>
                </div>
              </div>
              <span className={`text-[8px] font-mono font-bold ${changeColor(p.change)}`}>
                {p.change >= 0 ? '+' : ''}{p.change.toFixed(1)}d
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section: Supplier Delivery Times ──

function SupplierDeliverySection({
  deliveryTimes,
  t,
}: {
  deliveryTimes: MockData['supplierDeliveryTimes'];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scsSupplierDelivery', 'Supplier Delivery Times (PMI)')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_50px_50px_50px_60px] px-3 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'scsRegion', 'Region')}</span>
        <span className="text-right">{tr(t, 'scsCurrent', 'PMI')}</span>
        <span className="text-right">{tr(t, 'scsBase', 'Base')}</span>
        <span className="text-right">{tr(t, 'scsChg', 'Chg')}</span>
        <span className="text-right">{tr(t, 'scsTrend', 'Trend')}</span>
      </div>

      {deliveryTimes.map((dt) => {
        const deviation = dt.current - dt.baseline;
        const deviationColor = deviation > 0 ? 'text-red-400' : deviation < 0 ? 'text-green-400' : 'text-neutral-500';
        const barWidth = Math.min(Math.abs(deviation) * 10, 100);

        return (
          <div
            key={dt.region}
            className="grid grid-cols-[1fr_50px_50px_50px_60px] px-3 py-0.5 border-b border-border/[0.06] hover:bg-sky-400/[0.02] transition-colors items-center"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono font-bold text-white/70 truncate">{dt.region}</span>
              {/* Deviation bar */}
              <div className="w-8 h-1 bg-white/[0.04] relative shrink-0">
                <div
                  className="absolute top-0 h-full"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: deviation > 0 ? '#f87171' : '#4ade80',
                    opacity: 0.5,
                    left: deviation >= 0 ? '50%' : undefined,
                    right: deviation < 0 ? '50%' : undefined,
                  }}
                />
                <div className="absolute top-0 left-1/2 w-px h-full bg-white/[0.15]" />
              </div>
            </div>
            <span className={`text-[8px] font-mono font-bold text-right ${deviationColor}`}>
              {dt.current.toFixed(1)}
            </span>
            <span className="text-[8px] font-mono text-neutral-600 text-right">{dt.baseline.toFixed(1)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(dt.change)}`}>
              {dt.change >= 0 ? '+' : ''}{dt.change.toFixed(1)}
            </span>
            <span className="text-right">
              <span className={`text-[6px] font-mono font-black uppercase px-1 py-px ${trendColor(dt.trend)} ${dt.trend === 'worsening' ? 'bg-red-500/10 border border-red-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
                {dt.trend.toUpperCase()}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section: Commodity Freight ──

function CommodityFreightSection({
  freight,
  t,
}: {
  freight: MockData['commodityFreight'];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scsCommodityFreight', 'Commodity Freight')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[80px_1fr_70px_50px_52px] px-3 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'scsCommodity', 'Commodity')}</span>
        <span>{tr(t, 'scsRoute', 'Route')}</span>
        <span className="text-right">{tr(t, 'scsRate', 'Rate')}</span>
        <span className="text-right">{tr(t, 'scsChg', 'Chg%')}</span>
        <span className="text-right">{tr(t, 'scsStatus', 'Status')}</span>
      </div>

      {freight.map((f) => (
        <div
          key={f.commodity}
          className="grid grid-cols-[80px_1fr_70px_50px_52px] px-3 py-0.5 border-b border-border/[0.06] hover:bg-sky-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-bold text-white/70">{f.commodity}</span>
          <span className="text-[7px] font-mono text-neutral-500 truncate">{f.route}</span>
          <span className="text-[8px] font-mono text-white/80 text-right">
            {fmtRate(f.rate)} <span className="text-[6px] text-neutral-600">{f.unit}</span>
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(f.change)}`}>
            {fmtChange(f.change)}
          </span>
          <span className="text-right">
            <span className={`text-[6px] font-mono font-black uppercase px-1 py-px ${statusColor(f.status)} ${statusBg(f.status)}`}>
              {statusLabel(f.status)}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Inventory-to-Sales Ratio ──

function InventoryToSalesSection({
  inventory,
  t,
}: {
  inventory: MockData['inventoryToSales'];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scsInventoryToSales', 'Inventory-to-Sales Ratio')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_50px_50px_50px_60px] px-3 py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>{tr(t, 'scsSector', 'Sector')}</span>
        <span className="text-right">{tr(t, 'scsRatio', 'Ratio')}</span>
        <span className="text-right">{tr(t, 'scsBase', 'Base')}</span>
        <span className="text-right">{tr(t, 'scsChg', 'Chg')}</span>
        <span className="text-right">{tr(t, 'scsTrend', 'Trend')}</span>
      </div>

      {inventory.map((inv) => {
        const deviation = inv.ratio - inv.baseline;
        const barWidth = Math.min(Math.abs(deviation) * 200, 100);

        return (
          <div
            key={inv.sector}
            className="grid grid-cols-[1fr_50px_50px_50px_60px] px-3 py-0.5 border-b border-border/[0.06] hover:bg-sky-400/[0.02] transition-colors items-center"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono font-bold text-white/70">{inv.sector}</span>
              {/* Deviation bar */}
              <div className="w-6 h-1 bg-white/[0.04] relative shrink-0">
                <div
                  className="absolute top-0 h-full"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: deviation < 0 ? '#f87171' : '#fbbf24',
                    opacity: 0.5,
                    left: deviation >= 0 ? '50%' : undefined,
                    right: deviation < 0 ? '50%' : undefined,
                  }}
                />
                <div className="absolute top-0 left-1/2 w-px h-full bg-white/[0.15]" />
              </div>
            </div>
            <span className="text-[8px] font-mono font-bold text-white/80 text-right">{inv.ratio.toFixed(2)}</span>
            <span className="text-[8px] font-mono text-neutral-600 text-right">{inv.baseline.toFixed(2)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${inv.change >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
              {inv.change >= 0 ? '+' : ''}{inv.change.toFixed(2)}
            </span>
            <span className="text-right">
              <span className={`text-[6px] font-mono font-black uppercase px-1 py-px ${inventoryTrendColor(inv.trend)} ${inv.trend === 'tightening' ? 'bg-red-500/10 border border-red-500/30' : inv.trend === 'building' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
                {inv.trend.toUpperCase()}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function SupplyChainStressPanel() {
  const t = useT();
  const { data: hookData, isLoading, refetch } = useSupplyChainStress();

  const data = hookData || MOCK_DATA;

  // Count stress levels for header summary
  const severeCount = [
    ...data.shippingRates.filter((r: any) => r.status === 'severe'),
    ...data.portCongestion.filter((p: any) => p.status === 'severe'),
    ...data.commodityFreight.filter((f: any) => f.status === 'severe'),
  ].length;

  const elevatedCount = [
    ...data.shippingRates.filter((r: any) => r.status === 'elevated'),
    ...data.portCongestion.filter((p: any) => p.status === 'elevated'),
    ...data.commodityFreight.filter((f: any) => f.status === 'elevated'),
  ].length;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-sky-400">
            {tr(t, 'scsTitle', 'Supply Chain Stress')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {severeCount > 0 && (
            <span className="text-[7px] font-mono font-black uppercase px-1 py-px text-red-400 bg-red-500/10 border border-red-500/30">
              {severeCount} {tr(t, 'scsSevere', 'SEVERE')}
            </span>
          )}
          {elevatedCount > 0 && (
            <span className="text-[7px] font-mono font-black uppercase px-1 py-px text-amber-400 bg-amber-500/10 border border-amber-500/30">
              {elevatedCount} {tr(t, 'scsElevated', 'ELEVATED')}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-sky-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !hookData && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!isLoading && !hookData && !data && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'scsNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <PressureIndexSection pressureIndex={data.pressureIndex} t={t} />
            <ShippingRatesSection rates={data.shippingRates} t={t} />
            <PortCongestionSection ports={data.portCongestion} t={t} />
            <SupplierDeliverySection deliveryTimes={data.supplierDeliveryTimes} t={t} />
            <CommodityFreightSection freight={data.commodityFreight} t={t} />
            <InventoryToSalesSection inventory={data.inventoryToSales} t={t} />

            {/* Timestamp footer */}
            <div className="px-3 py-1.5">
              <span className="text-[7px] font-mono text-neutral-700">
                {tr(t, 'scsLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
