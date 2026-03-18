import { useState } from 'react';
import { useElectricityMarkets } from '../../api/hooks/use-electricity-markets';
import { RefreshCw, Zap } from 'lucide-react';

type Tab = 'regions' | 'forwards' | 'generation' | 'congestion';

const ACCENT = '#facc15';
const ACCENT_DIM = 'rgba(250,204,21,0.08)';

// ── Formatting helpers ──

function fmtNum(n: number, decimals = 2): string {
  if (n == null || isNaN(n)) return '—';
  return n.toFixed(decimals);
}

function fmtPrice(n: number): string {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  if (n == null || isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function reserveMarginColor(pct: number): string {
  if (pct >= 20) return 'text-green-400';
  if (pct >= 15) return 'text-yellow-400';
  return 'text-red-400';
}

// ── Main Panel ──

export function ElectricityMarketsPanel() {
  const [tab, setTab] = useState<Tab>('regions');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const { data, isLoading, refetch } = useElectricityMarkets();

  const tabs: Tab[] = ['regions', 'forwards', 'generation', 'congestion'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            Electricity Markets
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary bar */}
      {data && <SummaryBar data={data} />}

      {/* Tab bar */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div
            className="text-center py-8 text-[9px] font-mono uppercase animate-pulse"
            style={{ color: ACCENT }}
          >
            Loading...
          </div>
        )}

        {!isLoading && !data && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && tab === 'regions' && <RegionsTab data={data} />}
        {data && tab === 'forwards' && (
          <ForwardsTab data={data} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} />
        )}
        {data && tab === 'generation' && <GenerationTab data={data} />}
        {data && tab === 'congestion' && <CongestionTab data={data} />}
      </div>
    </div>
  );
}

// ── Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SummaryBar({ data }: { data: any }) {
  const summary = data?.summary;
  if (!summary) return null;

  const items = [
    { label: 'Avg Spot', value: `$${fmtPrice(summary.avgSpot)}`, unit: '$/MWh' },
    { label: 'Peak Demand', value: fmtNum(summary.peakDemand, 1), unit: 'GW' },
    { label: 'Renewable', value: fmtNum(summary.renewableShare, 1), unit: '%' },
    { label: 'Avg Forward', value: `$${fmtPrice(summary.avgForward)}`, unit: '' },
    { label: 'Congestion', value: `$${fmtNum(summary.congestionCost, 1)}`, unit: 'M' },
  ];

  return (
    <div className="grid grid-cols-5 border-b border-border/20 shrink-0" style={{ backgroundColor: ACCENT_DIM }}>
      {items.map((item) => (
        <div key={item.label} className="px-2 py-1.5 text-center border-r border-border/10 last:border-r-0">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {item.label}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {item.value}
            {item.unit && <span className="text-[7px] text-neutral-500 ml-0.5">{item.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Regions Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RegionsTab({ data }: { data: any }) {
  const regions = data?.regions;
  if (!regions || !regions.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No region data
      </div>
    );
  }

  return (
    <div>
      {/* Column header */}
      <div className="grid grid-cols-[1.4fr_0.8fr_0.6fr_0.7fr_0.7fr_0.6fr_0.6fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Region</span>
        <span className="text-right">Spot $/MWh</span>
        <span className="text-right">1D Chg</span>
        <span className="text-right">Peak</span>
        <span className="text-right">Off-Peak</span>
        <span className="text-right">Load GW</span>
        <span className="text-right">Capacity</span>
        <span className="text-right">Reserve %</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {regions.map((r: any) => (
        <div
          key={r.region}
          className="grid grid-cols-[1.4fr_0.8fr_0.6fr_0.7fr_0.7fr_0.6fr_0.6fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
            {r.region}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtPrice(r.spotPrice)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(r.change1d)}`}>
            {fmtPct(r.change1d)}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtPrice(r.peakPrice)}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtPrice(r.offPeakPrice)}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtNum(r.load, 1)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {fmtNum(r.capacity, 1)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${reserveMarginColor(r.reserveMargin)}`}>
            {fmtNum(r.reserveMargin, 1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Forwards Tab ──

function ForwardsTab({
  data,
  selectedRegion,
  onSelectRegion,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  selectedRegion: string;
  onSelectRegion: (r: string) => void;
}) {
  const forwards = data?.forwards;
  if (!forwards) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No forwards data
      </div>
    );
  }

  const regionNames: string[] = Object.keys(forwards);
  const activeRegion = selectedRegion && regionNames.includes(selectedRegion)
    ? selectedRegion
    : regionNames[0] || '';

  const tenors = activeRegion ? (forwards[activeRegion] || []) : [];

  return (
    <div>
      {/* Region selector */}
      <div className="flex flex-wrap gap-1 px-3 py-1.5 border-b border-border/20">
        {regionNames.map((name: string) => (
          <button
            key={name}
            onClick={() => onSelectRegion(name)}
            className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border transition-colors ${
              name === activeRegion
                ? 'border-yellow-400 text-yellow-400'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]'
            }`}
            style={name === activeRegion ? { backgroundColor: ACCENT_DIM } : undefined}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Column header */}
      <div className="grid grid-cols-[1.2fr_1fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Tenor</span>
        <span className="text-right">Price $/MWh</span>
        <span className="text-right">1W Chg</span>
      </div>

      {/* Rows */}
      {tenors.length === 0 && (
        <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
          No tenor data for {activeRegion}
        </div>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {tenors.map((t: any) => (
        <div
          key={t.tenor}
          className="grid grid-cols-[1.2fr_1fr_0.8fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
            {t.tenor}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtPrice(t.price)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(t.change1w)}`}>
            {fmtPct(t.change1w)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Generation Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GenerationTab({ data }: { data: any }) {
  const generation = data?.generation;
  if (!generation || !generation.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No generation data
      </div>
    );
  }

  const maxShare = Math.max(...generation.map((g: { share: number }) => g.share), 1);

  return (
    <div>
      {/* Column header */}
      <div className="grid grid-cols-[1.2fr_2fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Source</span>
        <span>Share %</span>
        <span className="text-right">Cap GW</span>
        <span className="text-right">1Y Chg</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {generation.map((g: any) => (
        <div
          key={g.source}
          className="grid grid-cols-[1.2fr_2fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
            {g.source}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[6px] bg-white/5 relative">
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${(g.share / maxShare) * 100}%`,
                  backgroundColor: ACCENT,
                  opacity: 0.6,
                }}
              />
            </div>
            <span className="text-[8px] font-mono text-white w-10 text-right shrink-0">
              {fmtNum(g.share, 1)}%
            </span>
          </div>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtNum(g.capacity, 1)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(g.change1y)}`}>
            {g.change1y >= 0 ? '+' : ''}{fmtNum(g.change1y, 1)}pp
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Congestion Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CongestionTab({ data }: { data: any }) {
  const congestion = data?.congestion;
  if (!congestion || !congestion.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No congestion data
      </div>
    );
  }

  return (
    <div>
      {/* Column header */}
      <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.6fr_0.7fr_0.6fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Node</span>
        <span>Region</span>
        <span className="text-right">Price $/MWh</span>
        <span className="text-right">Freq %</span>
        <span className="text-center">Direction</span>
        <span className="text-right">1M Chg</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {congestion.map((c: any) => (
        <div
          key={c.node}
          className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.6fr_0.7fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[9px] font-mono font-bold truncate" style={{ color: ACCENT }}>
            {c.node}
          </span>
          <span className="text-[8px] font-mono text-neutral-400">
            {c.region}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtPrice(c.price)}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtNum(c.frequency, 1)}%
          </span>
          <span className="text-center">
            <DirectionBadge direction={c.direction} />
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(c.change1m)}`}>
            {fmtPct(c.change1m)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Direction Badge ──

function DirectionBadge({ direction }: { direction: string }) {
  const normalized = (direction || '').toLowerCase();
  let colorClass = 'text-neutral-400 border-neutral-500/30 bg-neutral-500/10';
  if (normalized === 'import' || normalized === 'inbound') {
    colorClass = 'text-green-400 border-green-500/30 bg-green-500/10';
  } else if (normalized === 'export' || normalized === 'outbound') {
    colorClass = 'text-red-400 border-red-500/30 bg-red-500/10';
  } else if (normalized === 'bidirectional') {
    colorClass = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
  }

  return (
    <span className={`inline-block px-1.5 py-px text-[7px] font-mono font-bold uppercase tracking-wider border ${colorClass}`}>
      {direction || '—'}
    </span>
  );
}
