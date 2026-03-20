import { useState } from 'react';
import { useShippingFreight } from '../../api/hooks/use-shipping-freight';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const BLUE = '#60a5fa';
const BLUE_DIM = 'rgba(96,165,250,0.12)';
const GREEN = '#4ade80';
const RED = '#f87171';
const YELLOW = '#fbbf24';

// ── Types ──

type TabKey = 'DRY BULK' | 'TANKER' | 'CONTAINER' | 'SUPPLY';

const TABS: TabKey[] = ['DRY BULK', 'TANKER', 'CONTAINER', 'SUPPLY'];

// ── Formatting helpers ──

function fmtNum(n: number): string {
  if (n >= 10_000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 100) return n.toFixed(1);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(3);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function changeCls(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function statusBadge(status: string): { text: string; color: string; bg: string } {
  const s = status?.toLowerCase() ?? '';
  if (s === 'rising' || s === 'strong') return { text: status.toUpperCase(), color: GREEN, bg: 'rgba(74,222,128,0.12)' };
  if (s === 'falling' || s === 'weak') return { text: status.toUpperCase(), color: RED, bg: 'rgba(248,113,113,0.12)' };
  if (s === 'stable' || s === 'steady') return { text: status.toUpperCase(), color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
  return { text: status?.toUpperCase() ?? 'N/A', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
}

function congestionBadge(level: string): { text: string; color: string; bg: string } {
  const l = level?.toLowerCase() ?? '';
  if (l === 'severe' || l === 'critical') return { text: level.toUpperCase(), color: RED, bg: 'rgba(248,113,113,0.15)' };
  if (l === 'high') return { text: 'HIGH', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' };
  if (l === 'moderate' || l === 'medium') return { text: level.toUpperCase(), color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
  if (l === 'low' || l === 'normal') return { text: level.toUpperCase(), color: GREEN, bg: 'rgba(74,222,128,0.1)' };
  return { text: level?.toUpperCase() ?? 'N/A', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
}

// ── SVG Ship/Anchor Icon ──

function ShipIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4">
      {/* Hull */}
      <path d="M2 11 L3 13 L13 13 L14 11 Z" fill="none" stroke={BLUE} strokeWidth="0.8" />
      {/* Deck */}
      <path d="M4 11 L4 8 L12 8 L12 11" fill="none" stroke={BLUE} strokeWidth="0.7" />
      {/* Bridge */}
      <rect x="6.5" y="5" width="3" height="3" fill="none" stroke={BLUE} strokeWidth="0.6" />
      {/* Mast */}
      <line x1="8" y1="5" x2="8" y2="2.5" stroke={BLUE} strokeWidth="0.6" />
      {/* Flag */}
      <path d="M8 2.5 L10.5 3.5 L8 4.5" fill={BLUE} fillOpacity="0.3" stroke={BLUE} strokeWidth="0.4" />
      {/* Waves */}
      <path d="M1 14.5 Q3 13.5 5 14.5 Q7 15.5 9 14.5 Q11 13.5 13 14.5 Q14.5 15.2 15 14.5" fill="none" stroke={BLUE} strokeWidth="0.5" strokeOpacity="0.4" />
    </svg>
  );
}

// ── Dry Bulk Tab ──

function DryBulkTab({ data, t }: { data: any; t: TFn }) {
  const indices = data?.balticIndices ?? [];
  const flows = data?.commodityFlows ?? [];

  return (
    <>
      {/* Baltic Indices Table */}
      <div className="border-b border-border/20">
        <div className="px-2 py-1 border-b border-border/10">
          <span className="text-[7px] font-mono font-black text-white/25 uppercase tracking-wider">
            {tr(t, 'sfBalticIndices', 'Baltic Indices')}
          </span>
        </div>
        <div className="grid grid-cols-[1.2fr_0.7fr_0.5fr_0.5fr_0.5fr_0.6fr_0.6fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">Index</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Value</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">1D</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">1W</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">1M</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Yr Hi</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Yr Lo</span>
        </div>
        {indices.length === 0 && (
          <div className="py-3 text-center text-[8px] font-mono text-neutral-600 uppercase">
            {tr(t, 'sfNoIndices', 'No index data')}
          </div>
        )}
        {indices.map((idx: any) => (
          <div
            key={idx?.name ?? idx?.symbol}
            className="grid grid-cols-[1.2fr_0.7fr_0.5fr_0.5fr_0.5fr_0.6fr_0.6fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <div>
              <div className="text-[8px] font-mono font-bold text-white">{idx?.name}</div>
              {idx?.symbol && <div className="text-[6px] font-mono text-neutral-600">{idx.symbol}</div>}
            </div>
            <span className="text-[8px] font-mono text-white text-right">{fmtNum(idx?.value ?? 0)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeCls(idx?.change1d ?? 0)}`}>
              {fmtPct(idx?.change1d ?? 0)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeCls(idx?.change1w ?? 0)}`}>
              {fmtPct(idx?.change1w ?? 0)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeCls(idx?.change1m ?? 0)}`}>
              {fmtPct(idx?.change1m ?? 0)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtNum(idx?.yearHigh ?? 0)}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtNum(idx?.yearLow ?? 0)}</span>
          </div>
        ))}
      </div>

      {/* Commodity Flows Table */}
      <div>
        <div className="px-2 py-1 border-b border-border/10">
          <span className="text-[7px] font-mono font-black text-white/25 uppercase tracking-wider">
            {tr(t, 'sfCommodityFlows', 'Commodity Flows')}
          </span>
        </div>
        <div className="grid grid-cols-[1.2fr_0.8fr_0.6fr_0.6fr_0.8fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">Commodity</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Route</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Volume</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Chg%</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Trend</span>
        </div>
        {flows.length === 0 && (
          <div className="py-3 text-center text-[8px] font-mono text-neutral-600 uppercase">
            {tr(t, 'sfNoFlows', 'No flow data')}
          </div>
        )}
        {flows.map((flow: any, i: number) => (
          <div
            key={flow?.commodity ?? i}
            className="grid grid-cols-[1.2fr_0.8fr_0.6fr_0.6fr_0.8fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">{flow?.commodity}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right truncate">{flow?.route}</span>
            <span className="text-[8px] font-mono text-white text-right">{flow?.volume}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeCls(flow?.changePct ?? 0)}`}>
              {fmtPct(flow?.changePct ?? 0)}
            </span>
            <div className="flex justify-end">
              {flow?.trend && (() => {
                const badge = statusBadge(flow.trend);
                return (
                  <span
                    className="text-[6px] font-mono font-black uppercase px-1 py-px"
                    style={{ color: badge.color, backgroundColor: badge.bg }}
                  >
                    {badge.text}
                  </span>
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Tanker Tab ──

function TankerTab({ data, t }: { data: any; t: TFn }) {
  const rates = data?.tankerRates ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-2 py-1 border-b border-border/10">
        <span className="text-[7px] font-mono font-black text-white/25 uppercase tracking-wider">
          {tr(t, 'sfTankerRates', 'Tanker Rates')}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.6fr_0.5fr_0.6fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Route</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Vessel</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Rate/Day</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">WS</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">1W</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">Status</span>
      </div>
      {rates.length === 0 && (
        <div className="py-3 text-center text-[8px] font-mono text-neutral-600 uppercase">
          {tr(t, 'sfNoTanker', 'No tanker data')}
        </div>
      )}
      {rates.map((r: any, i: number) => {
        const badge = statusBadge(r?.status ?? '');
        return (
          <div
            key={r?.route ?? i}
            className="grid grid-cols-[1fr_0.7fr_0.7fr_0.6fr_0.5fr_0.6fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <div>
              <div className="text-[8px] font-mono font-bold text-white truncate">{r?.route}</div>
            </div>
            <span className="text-[7px] font-mono text-neutral-400 text-right">{r?.vesselType}</span>
            <span className="text-[8px] font-mono text-white text-right">{fmtUsd(r?.ratePerDay ?? 0)}</span>
            <span className="text-[8px] font-mono text-neutral-300 text-right">{r?.worldscale != null ? `WS${r.worldscale}` : '-'}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeCls(r?.change1w ?? 0)}`}>
              {fmtPct(r?.change1w ?? 0)}
            </span>
            <div className="flex justify-center">
              <span
                className="text-[6px] font-mono font-black uppercase px-1 py-px"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {badge.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Container Tab ──

function ContainerTab({ data, t }: { data: any; t: TFn }) {
  const containerRates = data?.containerRates ?? [];
  const portCongestion = data?.portCongestion ?? [];

  return (
    <>
      {/* Container Rates Table */}
      <div className="border-b border-border/20">
        <div className="px-2 py-1 border-b border-border/10">
          <span className="text-[7px] font-mono font-black text-white/25 uppercase tracking-wider">
            {tr(t, 'sfContainerRates', 'Container Rates')}
          </span>
        </div>
        <div className="grid grid-cols-[1.1fr_0.7fr_0.5fr_0.5fr_0.6fr_0.6fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">Route</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">$/FEU</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">1W</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">1M</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Index</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Cap Util</span>
        </div>
        {containerRates.length === 0 && (
          <div className="py-3 text-center text-[8px] font-mono text-neutral-600 uppercase">
            {tr(t, 'sfNoContainer', 'No container data')}
          </div>
        )}
        {containerRates.map((c: any, i: number) => (
          <div
            key={c?.route ?? i}
            className="grid grid-cols-[1.1fr_0.7fr_0.5fr_0.5fr_0.6fr_0.6fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{c?.route}</span>
            <span className="text-[8px] font-mono text-white text-right">{fmtUsd(c?.rateFeu ?? 0)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeCls(c?.change1w ?? 0)}`}>
              {fmtPct(c?.change1w ?? 0)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeCls(c?.change1m ?? 0)}`}>
              {fmtPct(c?.change1m ?? 0)}
            </span>
            <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtNum(c?.index ?? 0)}</span>
            <div className="flex items-center justify-end gap-1">
              <div className="w-8 h-[3px] bg-neutral-800 relative">
                <div
                  className="absolute left-0 top-0 h-full"
                  style={{
                    width: `${Math.min(c?.capacityUtil ?? 0, 100)}%`,
                    backgroundColor: (c?.capacityUtil ?? 0) >= 90 ? RED : (c?.capacityUtil ?? 0) >= 70 ? YELLOW : GREEN,
                  }}
                />
              </div>
              <span className="text-[7px] font-mono text-neutral-400">{(c?.capacityUtil ?? 0).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Port Congestion Table */}
      <div>
        <div className="px-2 py-1 border-b border-border/10">
          <span className="text-[7px] font-mono font-black text-white/25 uppercase tracking-wider">
            {tr(t, 'sfPortCongestion', 'Port Congestion')}
          </span>
        </div>
        <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.8fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">Port</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Waiting</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Avg Wait</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">Level</span>
        </div>
        {portCongestion.length === 0 && (
          <div className="py-3 text-center text-[8px] font-mono text-neutral-600 uppercase">
            {tr(t, 'sfNoCongestion', 'No congestion data')}
          </div>
        )}
        {portCongestion.map((p: any, i: number) => {
          const badge = congestionBadge(p?.congestionLevel ?? '');
          return (
            <div
              key={p?.port ?? i}
              className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.8fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-white">{p?.port}</span>
              <span className="text-[8px] font-mono text-white text-right">{p?.waitingVessels ?? '-'}</span>
              <span className="text-[8px] font-mono text-neutral-300 text-right">{p?.avgWaitDays != null ? `${p.avgWaitDays.toFixed(1)}d` : '-'}</span>
              <div className="flex justify-center">
                <span
                  className="text-[6px] font-mono font-black uppercase px-1 py-px"
                  style={{ color: badge.color, backgroundColor: badge.bg }}
                >
                  {badge.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Supply Tab ──

function SupplyTab({ data, t }: { data: any; t: TFn }) {
  const supply = data?.vesselSupply;

  if (!supply) {
    return (
      <div className="py-6 text-center text-[8px] font-mono text-neutral-600 uppercase">
        {tr(t, 'sfNoSupply', 'No supply data')}
      </div>
    );
  }

  const metrics = [
    { label: tr(t, 'sfOrderbook', 'Orderbook'), value: supply?.orderbook, unit: 'vessels', sub: supply?.orderbookDwt ? `${(supply.orderbookDwt / 1e6).toFixed(1)}M DWT` : null },
    { label: tr(t, 'sfScrapping', 'Scrapping (YTD)'), value: supply?.scrapping, unit: 'vessels', sub: supply?.scrappingDwt ? `${(supply.scrappingDwt / 1e6).toFixed(1)}M DWT` : null },
    { label: tr(t, 'sfDeliveries', 'Deliveries (YTD)'), value: supply?.deliveries, unit: 'vessels', sub: supply?.deliveriesDwt ? `${(supply.deliveriesDwt / 1e6).toFixed(1)}M DWT` : null },
    { label: tr(t, 'sfFleetGrowth', 'Fleet Growth'), value: supply?.fleetGrowthPct != null ? `${supply.fleetGrowthPct.toFixed(2)}%` : null, unit: 'YoY', sub: null },
    { label: tr(t, 'sfAvgAge', 'Avg Fleet Age'), value: supply?.avgAge != null ? `${supply.avgAge.toFixed(1)}` : null, unit: 'years', sub: null },
  ];

  const segments = supply?.segments ?? [];

  return (
    <>
      {/* Key Supply Metrics Grid */}
      <div className="border-b border-border/20">
        <div className="px-2 py-1 border-b border-border/10">
          <span className="text-[7px] font-mono font-black text-white/25 uppercase tracking-wider">
            {tr(t, 'sfSupplyOverview', 'Supply Overview')}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-px bg-border/10">
          {metrics.map((m) => (
            <div key={m.label} className="bg-black px-2 py-1.5">
              <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider truncate">
                {m.label}
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-[10px] font-mono font-bold text-white">
                  {m.value ?? '-'}
                </span>
                <span className="text-[6px] font-mono text-neutral-600">{m.unit}</span>
              </div>
              {m.sub && (
                <div className="text-[6px] font-mono text-neutral-500 mt-0.5">{m.sub}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Segment Breakdown */}
      {segments.length > 0 && (
        <div>
          <div className="px-2 py-1 border-b border-border/10">
            <span className="text-[7px] font-mono font-black text-white/25 uppercase tracking-wider">
              {tr(t, 'sfSegments', 'Segment Breakdown')}
            </span>
          </div>
          <div className="grid grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">Segment</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Fleet</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Order</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Growth</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Avg Age</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Scrap</span>
          </div>
          {segments.map((seg: any, i: number) => (
            <div
              key={seg?.name ?? i}
              className="grid grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-white">{seg?.name}</span>
              <span className="text-[8px] font-mono text-white text-right">{seg?.fleetSize ?? '-'}</span>
              <span className="text-[8px] font-mono text-neutral-300 text-right">{seg?.orderbook ?? '-'}</span>
              <span className={`text-[8px] font-mono font-bold text-right ${changeCls(seg?.growthPct ?? 0)}`}>
                {seg?.growthPct != null ? fmtPct(seg.growthPct) : '-'}
              </span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">
                {seg?.avgAge != null ? `${seg.avgAge.toFixed(1)}y` : '-'}
              </span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">{seg?.scrapped ?? '-'}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Main Panel ──

export function ShippingFreightPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useShippingFreight();
  const [activeTab, setActiveTab] = useState<TabKey>('DRY BULK');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <ShipIcon />
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: BLUE }}>
            {tr(t, 'sfTitle', 'Shipping & Freight')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-white/30 hover:text-blue-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : !data && !isLoading ? (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'sfNoData', 'No data available')}
          </div>
        ) : (
          <>
            {activeTab === 'DRY BULK' && <DryBulkTab data={data} t={t} />}
            {activeTab === 'TANKER' && <TankerTab data={data} t={t} />}
            {activeTab === 'CONTAINER' && <ContainerTab data={data} t={t} />}
            {activeTab === 'SUPPLY' && <SupplyTab data={data} t={t} />}
          </>
        )}
      </div>

      {/* Footer status bar */}
      {data && (
        <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0 flex items-center gap-3 text-[7px] font-mono">
          {data?.bdiValue != null && (
            <span className="text-white/40">
              BDI <span className="text-white font-bold">{fmtNum(data.bdiValue)}</span>
              {data?.bdiChange != null && (
                <span style={{ color: changeColor(data.bdiChange), marginLeft: 3 }}>
                  {fmtPct(data.bdiChange)}
                </span>
              )}
            </span>
          )}
          {data?.bdtiValue != null && (
            <span className="text-white/40">
              BDTI <span className="text-white font-bold">{fmtNum(data.bdtiValue)}</span>
            </span>
          )}
          {data?.scfiValue != null && (
            <span className="text-white/40">
              SCFI <span className="text-white font-bold">{fmtNum(data.scfiValue)}</span>
            </span>
          )}
          <span className="ml-auto text-neutral-700">{tr(t, 'sfSource', 'Baltic Exchange')}</span>
        </div>
      )}
    </div>
  );
}
