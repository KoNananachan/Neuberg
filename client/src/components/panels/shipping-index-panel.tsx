import { useMemo } from 'react';
import { useShippingIndex } from '../../api/hooks/use-shipping-index';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtRate(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}`;
}

function fmtAge(n: number): string {
  return `${n.toFixed(1)}y`;
}

function fmtDays(n: number): string {
  return `${n.toFixed(1)}d`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function congestionColor(level: string): { text: string; bg: string } {
  if (level === 'severe' || level === 'critical')
    return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  if (level === 'high')
    return { text: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' };
  if (level === 'moderate')
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
}

// ── Main Panel ──

export function ShippingIndexPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useShippingIndex();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-blue-400">
            {tr(t, 'panelShippingIndex', 'Shipping Index')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-blue-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-blue-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING SHIPPING DATA...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'siError', 'Failed to load shipping data')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'noData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <BdiBanner data={data} t={t} />
            <DryBulkTable indices={data.dryBulkIndices} t={t} />
            <ContainerRatesTable routes={data.containerRoutes} t={t} />
            <TankerRatesSection tankers={data.tankerRates} t={t} />
            <FleetDataSection fleet={data.fleetData} t={t} />
            <PortCongestionSection ports={data.portCongestion} t={t} />
            <BdiTrendChart history={data.bdiHistory} />
          </>
        )}
      </div>
    </div>
  );
}

// ── BDI Banner ──

function BdiBanner({
  data,
  t,
}: {
  data: any;
  t: ReturnType<typeof useT>;
}) {
  const bdi = data.dryBulkIndices?.find((i: any) => i.symbol === 'BDI');
  if (!bdi) return null;

  const isUp = bdi.change >= 0;

  return (
    <div className="border-b border-border/20 bg-[#030303]">
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'siBdiComposite', 'Baltic Dry Index')}
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-[20px] font-mono font-black text-white">
            {fmtNumber(bdi.value)}
          </span>
          <span className={`text-[11px] font-mono font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {fmtChange(bdi.change)} ({fmtPct(bdi.changePct)})
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">30D AVG</span>
            <span className="text-[8px] font-mono text-neutral-400">{fmtNumber(bdi.avg30d)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">52W H</span>
            <span className="text-[8px] font-mono text-neutral-400">{fmtNumber(bdi.high52w)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">52W L</span>
            <span className="text-[8px] font-mono text-neutral-400">{fmtNumber(bdi.low52w)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dry Bulk Indices Table ──

function DryBulkTable({
  indices,
  t,
}: {
  indices: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!indices || indices.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'siDryBulkIndices', 'Dry Bulk Indices')}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_0.7fr_0.6fr_0.6fr_0.7fr] px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">INDEX</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">VALUE</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CHG</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CHG%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">30D AVG</span>
      </div>
      {indices.map((idx: any) => (
        <div
          key={idx.symbol}
          className="grid grid-cols-[1fr_0.7fr_0.6fr_0.6fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors"
        >
          <div>
            <span className="text-[9px] font-mono font-bold text-white">{idx.symbol}</span>
            {idx.name && (
              <span className="text-[7px] font-mono text-neutral-600 ml-1">{idx.name}</span>
            )}
          </div>
          <span className="text-[9px] font-mono text-white text-right self-center">
            {fmtNumber(idx.value)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right self-center ${changeColor(idx.change)}`}>
            {fmtChange(idx.change)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right self-center ${changeColor(idx.changePct)}`}>
            {fmtPct(idx.changePct)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right self-center">
            {fmtNumber(idx.avg30d)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Container Rates Table ──

function ContainerRatesTable({
  routes,
  t,
}: {
  routes: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!routes || routes.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'siContainerRates', 'Container Rates')}
        </span>
      </div>
      <div className="grid grid-cols-[1.2fr_0.8fr_0.6fr_0.6fr] px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">TRADE LANE</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">RATE $/FEU</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CHG</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">W/W%</span>
      </div>
      {routes.map((route: any, i: number) => (
        <div
          key={route.lane || i}
          className="grid grid-cols-[1.2fr_0.8fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-white truncate">{route.lane}</span>
          <span className="text-[9px] font-mono text-white text-right self-center">
            ${fmtRate(route.rate)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right self-center ${changeColor(route.change)}`}>
            {fmtChange(route.change)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right self-center ${changeColor(route.weeklyChangePct)}`}>
            {fmtPct(route.weeklyChangePct)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Tanker Rates Section ──

function TankerRatesSection({
  tankers,
  t,
}: {
  tankers: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!tankers || tankers.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'siTankerRates', 'Tanker Rates')}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.6fr] px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">VESSEL TYPE</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">TCE $/DAY</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">ROUTE</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">WORLDSCALE</span>
      </div>
      {tankers.map((tanker: any, i: number) => (
        <div
          key={tanker.vesselType || i}
          className="grid grid-cols-[1fr_0.8fr_0.8fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-white">{tanker.vesselType}</span>
          <span className="text-[9px] font-mono text-white text-right self-center">
            ${fmtRate(tanker.tce)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right self-center">
            {tanker.route}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right self-center">
            {tanker.worldscale != null ? `WS${tanker.worldscale.toFixed(0)}` : '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Fleet Data Section ──

function FleetDataSection({
  fleet,
  t,
}: {
  fleet: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!fleet || fleet.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'siFleetData', 'Fleet Data')}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_0.7fr_0.6fr_0.5fr_0.6fr] px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">VESSEL TYPE</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">FLEET SIZE</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">ORDERBOOK%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">AVG AGE</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">SCRAPPING</span>
      </div>
      {fleet.map((vessel: any, i: number) => (
        <div
          key={vessel.vesselType || i}
          className="grid grid-cols-[1fr_0.7fr_0.6fr_0.5fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-white">{vessel.vesselType}</span>
          <span className="text-[9px] font-mono text-white text-right self-center">
            {fmtNumber(vessel.fleetSize)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right self-center">
            {vessel.orderbookPct.toFixed(1)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right self-center">
            {fmtAge(vessel.avgAge)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right self-center">
            {vessel.scrappingRate.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Port Congestion Section ──

function PortCongestionSection({
  ports,
  t,
}: {
  ports: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!ports || ports.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'siPortCongestion', 'Port Congestion')}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_0.7fr_0.6fr_0.8fr] px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">PORT</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">WAITING</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">AVG WAIT</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">LEVEL</span>
      </div>
      {ports.map((port: any, i: number) => {
        const level = congestionColor(port.congestionLevel);
        return (
          <div
            key={port.name || i}
            className="grid grid-cols-[1fr_0.7fr_0.6fr_0.8fr] px-3 py-1.5 border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-white truncate">{port.name}</span>
            <span className="text-[9px] font-mono text-white text-right self-center">
              {fmtNumber(port.waitingVessels)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right self-center">
              {fmtDays(port.avgWaitDays)}
            </span>
            <div className="flex justify-end self-center">
              <span
                className={`px-1.5 py-px text-[7px] font-mono font-black uppercase border ${level.text} ${level.bg}`}
              >
                {port.congestionLevel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── BDI Monthly Trend Chart (mini SVG) ──

function BdiTrendChart({ history }: { history: any[] }) {
  const chartData = useMemo(() => {
    if (!history || history.length < 2) return null;

    const W = 280;
    const H = 70;
    const PAD_X = 4;
    const PAD_Y = 10;

    const values = history.map((h: any) => h.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const rangeV = maxV - minV || 1;

    const scaleX = (i: number) =>
      PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2);
    const scaleY = (v: number) =>
      PAD_Y + ((maxV - v) / rangeV) * (H - PAD_Y * 2);

    const linePath = values
      .map((v: number, i: number) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    const fillPath = `${linePath} L ${scaleX(values.length - 1).toFixed(1)},${H} L ${scaleX(0).toFixed(1)},${H} Z`;

    const lastX = scaleX(values.length - 1);
    const lastY = scaleY(values[values.length - 1]);

    const isUp = values[values.length - 1] >= values[0];

    return { linePath, fillPath, lastX, lastY, isUp, W, H, minV, maxV };
  }, [history]);

  if (!chartData) return null;

  const lineColor = chartData.isUp ? '#60a5fa' : '#f87171';
  const fillColor = chartData.isUp ? 'rgba(96,165,250,0.08)' : 'rgba(248,113,113,0.08)';

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          BDI MONTHLY TREND
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral-600">
            L: {fmtNumber(chartData.minV)}
          </span>
          <span className="text-[7px] font-mono text-neutral-600">
            H: {fmtNumber(chartData.maxV)}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${chartData.W} ${chartData.H}`} className="w-full" style={{ height: 56 }}>
        <path d={chartData.fillPath} fill={fillColor} />
        <path d={chartData.linePath} fill="none" stroke={lineColor} strokeWidth={1.5} />
        <circle cx={chartData.lastX} cy={chartData.lastY} r={2.5} fill={lineColor} />
      </svg>
    </div>
  );
}
