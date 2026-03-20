import { useSemiconductor } from '../../api/hooks/use-semiconductor';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
// ── Constants ──

const VIOLET = '#a78bfa';
const GREEN = '#34d399';
const RED = '#f87171';
const AMBER = '#fbbf24';
const CYAN = '#22d3ee';
const BLUE = '#60a5fa';
const PINK = '#f472b6';
const ORANGE = '#fb923c';
const TEAL = '#2dd4bf';

// ── Sector badge colors ──

const SECTOR_COLORS: Record<string, { color: string; bg: string }> = {
  fabless:   { color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  idm:       { color: CYAN, bg: 'rgba(34,211,238,0.12)' },
  foundry:   { color: AMBER, bg: 'rgba(251,191,36,0.10)' },
  equipment: { color: PINK, bg: 'rgba(244,114,182,0.12)' },
  analog:    { color: TEAL, bg: 'rgba(45,212,191,0.12)' },
};

// ── Outlook badge colors ──

const OUTLOOK_COLORS: Record<string, { color: string; bg: string }> = {
  strong: { color: GREEN, bg: 'rgba(52,211,153,0.12)' },
  stable: { color: AMBER, bg: 'rgba(251,191,36,0.10)' },
  weak:   { color: RED, bg: 'rgba(248,113,113,0.12)' },
};

// ── Inventory cycle phases ──

const CYCLE_PHASES = ['buildup', 'peak', 'correction', 'trough'] as const;

const CYCLE_PHASE_COLORS: Record<string, string> = {
  buildup: AMBER,
  peak: RED,
  correction: BLUE,
  trough: GREEN,
};

// ── Formatting helpers ──

function fmtNum(n: number, decimals = 2): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtMarketCap(n: number): string {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
  return '$' + n.toLocaleString();
}

function fmtPrice(n: number): string {
  return '$' + n.toFixed(2);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

// ── Mini trend chart (6 months wafer shipments) ──

function WaferTrendChart({ data }: { data: { month: string; value: number }[] }) {
  if (!data || data.length < 2) return null;

  const W = 180;
  const H = 48;
  const PAD_X = 2;
  const PAD_Y = 4;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2);
    const y = PAD_Y + (1 - (v - min) / range) * (H - PAD_Y * 2);
    return { x, y };
  });

  const pathD = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');

  // Area fill
  const areaD = pathD + ` L${points[points.length - 1].x},${H - PAD_Y} L${points[0].x},${H - PAD_Y} Z`;

  const last = points[points.length - 1];

  return (
    <div className="px-3 py-2">
      <div className="text-[8px] font-mono uppercase tracking-wider text-white/30 mb-1.5">
        WAFER SHIPMENTS (6M)
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block">
        <defs>
          <linearGradient id="wafer-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VIOLET} stopOpacity={0.2} />
            <stop offset="100%" stopColor={VIOLET} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#wafer-grad)" />
        <path d={pathD} fill="none" stroke={VIOLET} strokeWidth={1.2} strokeOpacity={0.7} />
        <circle cx={last.x} cy={last.y} r={2} fill={VIOLET} fillOpacity={0.9} />
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-[7px] font-mono text-white/20">{d.month}</span>
        ))}
      </div>
    </div>
  );
}

// ── Inventory Cycle Indicator ──

function InventoryCycleIndicator({ currentPhase }: { currentPhase: string }) {
  const phaseIndex = CYCLE_PHASES.indexOf(currentPhase as typeof CYCLE_PHASES[number]);
  const activeIdx = phaseIndex >= 0 ? phaseIndex : 0;

  return (
    <div className="px-3 py-2">
      <div className="text-[8px] font-mono uppercase tracking-wider text-white/30 mb-2">
        INVENTORY CYCLE
      </div>
      <div className="flex items-center gap-1">
        {CYCLE_PHASES.map((phase, i) => {
          const isActive = i === activeIdx;
          const color = CYCLE_PHASE_COLORS[phase];
          return (
            <div key={phase} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className="w-full h-1.5 rounded-sm"
                  style={{
                    backgroundColor: isActive ? color : 'rgba(255,255,255,0.06)',
                    boxShadow: isActive ? `0 0 6px ${color}40` : 'none',
                  }}
                />
                <span
                  className="text-[7px] font-mono uppercase mt-1"
                  style={{ color: isActive ? color : 'rgba(255,255,255,0.2)' }}
                >
                  {phase}
                </span>
              </div>
              {i < CYCLE_PHASES.length - 1 && (
                <span className="text-[7px] text-white/10 -mx-0.5 mb-3">&rarr;</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Progress Bar ──

function UtilizationBar({ value }: { value: number }) {
  const color = value > 90 ? RED : value > 75 ? AMBER : GREEN;
  return (
    <div className="w-16 h-1.5 bg-white/[0.04] rounded-sm overflow-hidden">
      <div
        className="h-full rounded-sm"
        style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Main Component ──

export function SemiconductorPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useSemiconductor();

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-violet-400">
            {tr(t, 'panelSemiconductor', 'SEMICONDUCTOR INDEX')}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-white/30 animate-pulse">LOADING SEMICONDUCTOR DATA...</span>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-violet-400">
            {tr(t, 'panelSemiconductor', 'SEMICONDUCTOR INDEX')}
          </span>
          <button onClick={() => refetch()} className="p-1 text-white/30 hover:text-violet-400 transition-colors">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-red-400/60">
            {error instanceof Error ? error.message : 'Failed to load data'}
          </span>
        </div>
      </div>
    );
  }

  const { sox, stocks, foundryUtilization, inventoryCycle, endMarketDemand, waferShipments } = data;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <span className="text-[9px] font-black font-mono uppercase tracking-wider text-violet-400">
          {tr(t, 'panelSemiconductor', 'SEMICONDUCTOR INDEX')}
        </span>
        <button onClick={() => refetch()} className="p-1 text-white/30 hover:text-violet-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-auto">

        {/* ── SOX Index Banner ── */}
        <div className="px-3 py-2 border-b border-border/20 bg-[#050505]">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[8px] font-mono uppercase tracking-wider text-white/30">SOX INDEX</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-mono font-black text-white tabular-nums">
              {fmtNum(sox.level, 2)}
            </span>
            <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color: changeColor(sox.dailyChange) }}>
              {fmtPct(sox.dailyChange)}
            </span>
          </div>
          <div className="flex gap-4 mt-1.5">
            <div className="flex flex-col">
              <span className="text-[7px] font-mono uppercase tracking-wider text-white/20">YTD</span>
              <span className="text-[9px] font-mono tabular-nums" style={{ color: changeColor(sox.ytdReturn) }}>
                {fmtPct(sox.ytdReturn)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-mono uppercase tracking-wider text-white/20">52W HIGH</span>
              <span className="text-[9px] font-mono tabular-nums text-white/50">
                {fmtNum(sox.high52w, 2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-mono uppercase tracking-wider text-white/20">52W LOW</span>
              <span className="text-[9px] font-mono tabular-nums text-white/50">
                {fmtNum(sox.low52w, 2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Stock Table ── */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5">
            <span className="text-[8px] font-mono uppercase tracking-wider text-white/30">CONSTITUENTS</span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead>
              <tr className="text-white/25 uppercase tracking-wider text-[7px]">
                <th className="text-left px-3 py-1 font-normal">TICKER</th>
                <th className="text-right px-1 py-1 font-normal">PRICE</th>
                <th className="text-right px-1 py-1 font-normal">CHG%</th>
                <th className="text-right px-1 py-1 font-normal">MCAP</th>
                <th className="text-right px-1 py-1 font-normal">P/E</th>
                <th className="text-right px-3 py-1 font-normal">SECTOR</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock: any) => {
                const sectorStyle = SECTOR_COLORS[stock.sector] ?? { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.04)' };
                return (
                  <tr key={stock.ticker} className="hover:bg-violet-400/[0.02] transition-colors">
                    <td className="px-3 py-1 text-white/80 font-bold">{stock.ticker}</td>
                    <td className="text-right px-1 py-1 text-white/60 tabular-nums">{fmtPrice(stock.price)}</td>
                    <td className="text-right px-1 py-1 tabular-nums" style={{ color: changeColor(stock.changePercent) }}>
                      {fmtPct(stock.changePercent)}
                    </td>
                    <td className="text-right px-1 py-1 text-white/40 tabular-nums">{fmtMarketCap(stock.marketCap)}</td>
                    <td className="text-right px-1 py-1 text-white/40 tabular-nums">
                      {stock.pe != null ? stock.pe.toFixed(1) : '--'}
                    </td>
                    <td className="text-right px-3 py-1">
                      <span
                        className="inline-block px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider rounded-sm"
                        style={{ color: sectorStyle.color, backgroundColor: sectorStyle.bg }}
                      >
                        {stock.sector}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Foundry Utilization ── */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5">
            <span className="text-[8px] font-mono uppercase tracking-wider text-white/30">FOUNDRY UTILIZATION</span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead>
              <tr className="text-white/25 uppercase tracking-wider text-[7px]">
                <th className="text-left px-3 py-1 font-normal">COMPANY</th>
                <th className="text-right px-1 py-1 font-normal">UTIL%</th>
                <th className="px-1 py-1 font-normal w-20" />
                <th className="text-right px-1 py-1 font-normal">CAPACITY</th>
                <th className="text-right px-3 py-1 font-normal">LEAD TIME</th>
              </tr>
            </thead>
            <tbody>
              {foundryUtilization.map((f: any) => (
                <tr key={f.company} className="hover:bg-violet-400/[0.02] transition-colors">
                  <td className="px-3 py-1 text-white/80 font-bold">{f.company}</td>
                  <td className="text-right px-1 py-1 tabular-nums text-white/60">{f.utilization.toFixed(1)}%</td>
                  <td className="px-1 py-1">
                    <UtilizationBar value={f.utilization} />
                  </td>
                  <td className="text-right px-1 py-1 text-white/40 tabular-nums">{f.capacity}</td>
                  <td className="text-right px-3 py-1 text-white/40 tabular-nums">{f.leadTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Inventory Cycle ── */}
        <div className="border-b border-border/20">
          <InventoryCycleIndicator currentPhase={inventoryCycle.currentPhase} />
        </div>

        {/* ── End-Market Demand Grid ── */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5">
            <span className="text-[8px] font-mono uppercase tracking-wider text-white/30">END-MARKET DEMAND</span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead>
              <tr className="text-white/25 uppercase tracking-wider text-[7px]">
                <th className="text-left px-3 py-1 font-normal">SEGMENT</th>
                <th className="text-right px-1 py-1 font-normal">GROWTH%</th>
                <th className="text-right px-1 py-1 font-normal">REVENUE</th>
                <th className="text-right px-3 py-1 font-normal">OUTLOOK</th>
              </tr>
            </thead>
            <tbody>
              {endMarketDemand.map((seg: any) => {
                const outlookKey = seg.outlook.toLowerCase();
                const outlookStyle = OUTLOOK_COLORS[outlookKey] ?? { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.04)' };
                return (
                  <tr key={seg.segment} className="hover:bg-violet-400/[0.02] transition-colors">
                    <td className="px-3 py-1 text-white/80">{seg.segment}</td>
                    <td className="text-right px-1 py-1 tabular-nums" style={{ color: changeColor(seg.growth) }}>
                      {fmtPct(seg.growth)}
                    </td>
                    <td className="text-right px-1 py-1 text-white/40 tabular-nums">{seg.revenue}</td>
                    <td className="text-right px-3 py-1">
                      <span
                        className="inline-block px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider rounded-sm"
                        style={{ color: outlookStyle.color, backgroundColor: outlookStyle.bg }}
                      >
                        {seg.outlook}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Wafer Shipments Trend ── */}
        <WaferTrendChart data={waferShipments} />

      </div>
    </div>
  );
}
