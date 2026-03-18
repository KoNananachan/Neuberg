import { useHeatMap, type SectorData } from '../../api/hooks/use-heat-map';
import { useAppStore } from '../../stores/use-app-store';
import { useT } from '../../i18n';
import { LayoutGrid, RefreshCw } from 'lucide-react';

/** Map changePercent to a background color (red/green gradient, clamped at +/-5%) */
function getTileColor(changePercent: number): string {
  const clamped = Math.max(-5, Math.min(5, changePercent));
  const intensity = Math.abs(clamped) / 5; // 0..1

  if (clamped >= 0) {
    // Green gradient: hue=142, higher saturation/lightness for stronger gains
    const s = 30 + intensity * 42; // 30-72%
    const l = 10 + intensity * 18; // 10-28%
    return `hsl(142, ${s}%, ${l}%)`;
  } else {
    // Red gradient: hue=0, higher saturation/lightness for stronger losses
    const s = 30 + intensity * 42;
    const l = 10 + intensity * 18;
    return `hsl(0, ${s}%, ${l}%)`;
  }
}

/** Compute relative tile size classes based on market cap within a sector */
function getTileSizeClass(marketCap: number | null, maxCap: number): string {
  if (!marketCap || maxCap === 0) return 'col-span-1 row-span-1';
  const ratio = marketCap / maxCap;
  if (ratio > 0.6) return 'col-span-2 row-span-2';
  if (ratio > 0.3) return 'col-span-2 row-span-1';
  return 'col-span-1 row-span-1';
}

function SectorBlock({ sector }: { sector: SectorData }) {
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);
  const maxCap = Math.max(...sector.stocks.map((s) => s.marketCap ?? 0), 1);

  return (
    <div className="border border-border/20 bg-[#050505]">
      {/* Sector header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/20 bg-black/60">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral/60 truncate">
          {sector.sector}
        </span>
        <span
          className={`text-[9px] font-mono font-bold ${
            sector.sectorChange >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {sector.sectorSymbol}{' '}
          {sector.sectorChange >= 0 ? '+' : ''}
          {sector.sectorChange.toFixed(2)}%
        </span>
      </div>

      {/* Stock tiles grid */}
      <div className="grid grid-cols-4 gap-px p-px">
        {sector.stocks.map((stock) => {
          const sizeClass = getTileSizeClass(stock.marketCap, maxCap);
          return (
            <button
              key={stock.symbol}
              onClick={() => setSelectedSymbol(stock.symbol)}
              className={`${sizeClass} flex flex-col items-center justify-center p-1 transition-opacity hover:opacity-80 cursor-pointer min-h-[32px]`}
              style={{ backgroundColor: getTileColor(stock.changePercent) }}
            >
              <span className="text-[9px] font-mono font-bold text-white leading-tight truncate max-w-full">
                {stock.symbol}
              </span>
              <span
                className={`text-[8px] font-mono leading-tight ${
                  stock.changePercent >= 0 ? 'text-emerald-200' : 'text-red-200'
                }`}
              >
                {stock.changePercent >= 0 ? '+' : ''}
                {stock.changePercent.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HeatMapPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useHeatMap();

  const sectors = data ?? [];
  const sectorsUp = sectors.filter((s) => s.sectorChange >= 0).length;
  const sectorsDown = sectors.filter((s) => s.sectorChange < 0).length;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-emerald-400">
            {t('panelHeatMap')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary bar */}
      {sectors.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-1 border-b border-border/20 bg-black/40 shrink-0">
          <span className="text-[8px] font-mono text-emerald-400">
            {sectorsUp} {t('hmSectorsUp')}
          </span>
          <span className="text-[8px] font-mono text-red-400">
            {sectorsDown} {t('hmSectorsDown')}
          </span>
          <span className="text-[8px] font-mono text-neutral/30 ml-auto">
            {sectors.reduce((acc, s) => acc + s.stocks.length, 0)} stocks
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto no-scrollbar p-1.5">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
            <span className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest">
              {t('loading')}
            </span>
          </div>
        )}

        {!isLoading && sectors.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
              {t('hmNoData')}
            </span>
          </div>
        )}

        {sectors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">
            {sectors.map((sector) => (
              <SectorBlock key={sector.sectorSymbol} sector={sector} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
