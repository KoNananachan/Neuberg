import { useState } from 'react';
import { useFreightRateMonitor } from '../../api/hooks/use-freight-rate-monitor';
import { Anchor, RefreshCw } from 'lucide-react';

type Tab = 'baltic' | 'container' | 'tanker' | 'ffas' | 'ports';

const ACCENT = '#fbbf24'; // amber-400
const ACCENT_DIM = 'rgba(251,191,36,0.08)';

const TAB_LABELS: Record<Tab, string> = {
  baltic: 'BALTIC',
  container: 'CONTAINER',
  tanker: 'TANKER',
  ffas: 'FFAS',
  ports: 'PORTS',
};

/* ---------- Formatters ---------- */

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n.toFixed(0);
}

function fmtRate(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '$' + n.toFixed(0);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

function fmtDays(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1) + 'd';
}

function fmtWs(n: number | null | undefined): string {
  if (n == null) return '--';
  return 'WS' + n.toFixed(1);
}

function pctColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral/40';
  return n >= 0 ? 'text-bullish' : 'text-bearish';
}

function congestionColor(level: string | null | undefined): string {
  if (!level) return 'text-neutral/40';
  const l = level.toLowerCase();
  if (l === 'high' || l === 'severe' || l === 'critical') return 'text-red-400';
  if (l === 'elevated' || l === 'moderate') return 'text-amber-400';
  return 'text-emerald-400';
}

function congestionBadge(level: string | null | undefined): string {
  if (!level) return 'bg-neutral/20 text-neutral/60';
  const l = level.toLowerCase();
  if (l === 'high' || l === 'severe' || l === 'critical') return 'bg-red-500/20 text-red-400';
  if (l === 'elevated' || l === 'moderate') return 'bg-amber-500/20 text-amber-400';
  return 'bg-emerald-500/20 text-emerald-400';
}

function trendArrow(n: number | null | undefined): string {
  if (n == null) return '--';
  if (n > 0) return '\u25B2';
  if (n < 0) return '\u25BC';
  return '\u25AC';
}

/* ---------- Main Panel ---------- */

export function FreightRateMonitorPanel() {
  const [tab, setTab] = useState<Tab>('baltic');
  const { data, isLoading, refetch } = useFreightRateMonitor();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4" style={{ color: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-wider"
            style={{ color: ACCENT }}
          >
            FREIGHT RATE MONITOR
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 transition-colors"
          onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT)}
          onMouseLeave={(e) => (e.currentTarget.style.color = '')}
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 bg-black/40 shrink-0">
        {(['baltic', 'container', 'tanker', 'ffas', 'ports'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-wider border-b-2 transition-colors ${
              tab === t
                ? 'text-amber-400 border-amber-400'
                : 'border-transparent text-neutral/40 hover:text-neutral'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div
              className="w-4 h-4 border-2 animate-spin"
              style={{ borderColor: `${ACCENT}33`, borderTopColor: ACCENT }}
            />
            <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-wider">
              Loading...
            </span>
          </div>
        )}

        {!isLoading && !data && (
          <div className="flex items-center justify-center py-8 text-[10px] font-mono text-neutral/40 uppercase tracking-wider">
            NO DATA AVAILABLE
          </div>
        )}

        {data && tab === 'baltic' && <BalticTab data={data.baltic} />}
        {data && tab === 'container' && <ContainerTab data={data.container} />}
        {data && tab === 'tanker' && <TankerTab data={data.tanker} />}
        {data && tab === 'ffas' && <FFAsTab data={data.ffas} />}
        {data && tab === 'ports' && <PortsTab data={data.ports} />}
      </div>
    </div>
  );
}

/* ---------- Baltic Tab ---------- */

function BalticTab({ data }: { data: any }) {
  if (!data || !data.indices || data.indices.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* BDI Headline */}
      {data.bdi && (
        <div className="px-3 py-2 border-b border-border/20" style={{ background: ACCENT_DIM }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
                BALTIC DRY INDEX
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-mono font-black" style={{ color: ACCENT }}>
                  {fmtNum(data.bdi.value)}
                </span>
                <span className={`text-[10px] font-mono font-bold ${pctColor(data.bdi.change)}`}>
                  {trendArrow(data.bdi.change)} {fmtPct(data.bdi.change)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">52W RANGE</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[8px] font-mono text-neutral/50">{fmtNum(data.bdi.low52w)}</span>
                <RangeBar
                  low={data.bdi.low52w}
                  high={data.bdi.high52w}
                  current={data.bdi.value}
                />
                <span className="text-[8px] font-mono text-neutral/50">{fmtNum(data.bdi.high52w)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Indices Table */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_1.2fr_0.4fr]">
        <span>INDEX</span>
        <span className="text-right">VALUE</span>
        <span className="text-right">1D CHG</span>
        <span className="text-right">1W CHG</span>
        <span className="text-right">52W RANGE</span>
        <span className="text-right">TREND</span>
      </div>
      {data.indices.map((idx: any, i: number) => (
        <div
          key={idx.id ?? idx.name ?? i}
          className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_1.2fr_0.4fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <div>
            <span className="text-[10px] font-mono font-bold" style={{ color: ACCENT }}>
              {idx.id ?? idx.name}
            </span>
            {idx.description && (
              <span className="text-[7px] font-mono text-neutral/30 ml-1.5">{idx.description}</span>
            )}
          </div>
          <span className="text-[10px] font-mono font-bold text-white text-right">
            {fmtNum(idx.value)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(idx.dayChange)}`}>
            {fmtPct(idx.dayChange)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(idx.weekChange)}`}>
            {fmtPct(idx.weekChange)}
          </span>
          <div className="flex items-center justify-end gap-1">
            <span className="text-[7px] font-mono text-neutral/30">{fmtNum(idx.low52w)}</span>
            <RangeBar low={idx.low52w} high={idx.high52w} current={idx.value} />
            <span className="text-[7px] font-mono text-neutral/30">{fmtNum(idx.high52w)}</span>
          </div>
          <span className={`text-[10px] text-right ${pctColor(idx.dayChange)}`}>
            {trendArrow(idx.dayChange)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Container Tab ---------- */

function ContainerTab({ data }: { data: any }) {
  if (!data || !data.routes || data.routes.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* SCFI Summary */}
      {data.scfiComposite != null && (
        <div className="px-3 py-2 border-b border-border/20" style={{ background: ACCENT_DIM }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
                SCFI COMPOSITE INDEX
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-mono font-black" style={{ color: ACCENT }}>
                  {fmtNum(data.scfiComposite)}
                </span>
                <span className={`text-[9px] font-mono font-bold ${pctColor(data.scfiChange)}`}>
                  {fmtPct(data.scfiChange)}
                </span>
              </div>
            </div>
            {data.lastUpdated && (
              <span className="text-[7px] font-mono text-neutral/30 uppercase">
                {data.lastUpdated}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Routes Table */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_0.7fr]">
        <span>ROUTE</span>
        <span className="text-right">RATE/TEU</span>
        <span className="text-right">1W CHG</span>
        <span className="text-right">1M CHG</span>
        <span className="text-right">YTD CHG</span>
      </div>
      {data.routes.map((r: any, i: number) => (
        <div
          key={r.route ?? r.id ?? i}
          className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <div>
            <span className="text-[10px] font-mono font-bold" style={{ color: ACCENT }}>
              {r.route ?? r.id}
            </span>
            {r.description && (
              <div className="text-[7px] font-mono text-neutral/30 truncate">{r.description}</div>
            )}
          </div>
          <span className="text-[10px] font-mono font-bold text-white text-right">
            {fmtRate(r.rateTeu)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.weekChange)}`}>
            {fmtPct(r.weekChange)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.monthChange)}`}>
            {fmtPct(r.monthChange)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.ytdChange)}`}>
            {fmtPct(r.ytdChange)}
          </span>
        </div>
      ))}

      {/* Route Comparison */}
      {data.comparison && data.comparison.length > 0 && (
        <div className="mt-1">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black uppercase tracking-wider" style={{ color: ACCENT }}>
              ROUTE COMPARISON
            </span>
          </div>
          {data.comparison.map((c: any, i: number) => (
            <div key={c.route ?? i} className="px-3 py-1.5 border-b border-border/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono font-bold text-white/80">{c.route}</span>
                <span className="text-[9px] font-mono font-bold text-white">{fmtRate(c.rate)}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(100, Math.max(2, (c.rate / (data.maxRate || c.rate)) * 100))}%`,
                    background: ACCENT,
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Tanker Tab ---------- */

function TankerTab({ data }: { data: any }) {
  if (!data || !data.routes || data.routes.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Segment Summary */}
      {data.segments && (
        <div
          className="grid gap-px shrink-0 border-b border-border/20"
          style={{
            gridTemplateColumns: `repeat(${Math.min(data.segments.length, 4)}, 1fr)`,
            background: ACCENT_DIM,
          }}
        >
          {data.segments.map((seg: any, i: number) => (
            <div key={seg.type ?? i} className="px-3 py-1.5 bg-black">
              <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
                {seg.type}
              </div>
              <div className="text-[11px] font-mono font-black text-white">
                {fmtWs(seg.worldscale)}
              </div>
              <div className={`text-[8px] font-mono font-bold ${pctColor(seg.change)}`}>
                {fmtPct(seg.change)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Routes Table */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider grid grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr_0.6fr_0.6fr]">
        <span>ROUTE</span>
        <span>TYPE</span>
        <span className="text-right">WS</span>
        <span className="text-right">TCE ($/DAY)</span>
        <span className="text-right">1D CHG</span>
        <span className="text-right">1W CHG</span>
      </div>
      {data.routes.map((r: any, i: number) => (
          <div
            key={r.route ?? `${r.type}-${i}`}
            className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
          >
            <span className="text-[10px] font-mono font-bold truncate" style={{ color: ACCENT }}>
              {r.route}
            </span>
            <span className="text-[9px] font-mono text-neutral/60">{r.type}</span>
            <span className="text-[10px] font-mono text-white text-right">
              {fmtWs(r.worldscale)}
            </span>
            <span className="text-[10px] font-mono text-white text-right">
              {fmtRate(r.tce)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.dayChange)}`}>
              {fmtPct(r.dayChange)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.weekChange)}`}>
              {fmtPct(r.weekChange)}
            </span>
          </div>
        ))}

      {/* Route Breakdown by Vessel */}
      {data.breakdown && data.breakdown.length > 0 && (
        <div className="mt-1">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black uppercase tracking-wider" style={{ color: ACCENT }}>
              ROUTE BREAKDOWN
            </span>
          </div>
          {data.breakdown.map((group: any, gi: number) => (
            <div key={group.vessel ?? gi}>
              <div className="px-3 py-1 bg-white/[0.02] border-b border-border/10">
                <span className="text-[8px] font-mono font-bold text-amber-400/80 uppercase tracking-wider">
                  {group.vessel}
                </span>
              </div>
              {group.routes?.map((r: any, ri: number) => (
                <div
                  key={r.route ?? ri}
                  className="grid grid-cols-[1fr_0.6fr_0.6fr_0.5fr] px-3 py-1 border-b border-border/5 text-[8px] font-mono"
                >
                  <span className="text-neutral/60 truncate">{r.route}</span>
                  <span className="text-right text-white/70">{fmtWs(r.worldscale)}</span>
                  <span className="text-right text-white/70">{fmtRate(r.tce)}</span>
                  <span className={`text-right font-bold ${pctColor(r.change)}`}>
                    {fmtPct(r.change)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- FFAs Tab ---------- */

function FFAsTab({ data }: { data: any }) {
  if (!data || !data.contracts || data.contracts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Market Status */}
      {data.marketStatus && (
        <div className="px-3 py-2 border-b border-border/20" style={{ background: ACCENT_DIM }}>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">CURVE</div>
              <div className={`text-[10px] font-mono font-black uppercase ${
                data.marketStatus.structure === 'contango' ? 'text-amber-400' :
                data.marketStatus.structure === 'backwardation' ? 'text-sky-400' :
                'text-neutral/60'
              }`}>
                {data.marketStatus.structure ?? '--'}
              </div>
            </div>
            <div>
              <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">VOLUME</div>
              <div className="text-[10px] font-mono font-black text-white/80">
                {fmtNum(data.marketStatus.totalVolume)}
              </div>
            </div>
            <div>
              <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">OI</div>
              <div className="text-[10px] font-mono font-black text-white/80">
                {fmtNum(data.marketStatus.openInterest)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FFA Contracts */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr_0.5fr]">
        <span>CONTRACT</span>
        <span>QUARTER</span>
        <span className="text-right">RATE</span>
        <span className="text-right">CHG</span>
        <span className="text-right">CHG %</span>
        <span className="text-center">CURVE</span>
      </div>
      {data.contracts.map((c: any, i: number) => (
        <div
          key={c.contract ?? c.id ?? i}
          className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr_0.5fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[10px] font-mono font-bold" style={{ color: ACCENT }}>
            {c.contract ?? c.id}
          </span>
          <span className="text-[9px] font-mono text-neutral/60">{c.quarter ?? c.period}</span>
          <span className="text-[10px] font-mono font-bold text-white text-right">
            {fmtRate(c.rate)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(c.change)}`}>
            {c.change != null ? (c.change >= 0 ? '+' : '') + fmtNum(c.change) : '--'}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(c.changePercent)}`}>
            {fmtPct(c.changePercent)}
          </span>
          <span className="flex justify-center">
            {c.contango != null && (
              <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 uppercase tracking-wider ${
                c.contango
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
                  : 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              }`}>
                {c.contango ? 'C' : 'B'}
              </span>
            )}
          </span>
        </div>
      ))}

      {/* Forward Curve */}
      {data.forwardCurve && data.forwardCurve.length > 0 && (
        <div className="mt-1">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black uppercase tracking-wider" style={{ color: ACCENT }}>
              FORWARD CURVE
            </span>
          </div>
          <div className="px-3 py-2">
            <div className="flex items-end gap-[2px] h-20">
              {data.forwardCurve.map((p: any, i: number) => {
                const vals = data.forwardCurve.map((x: any) => x.rate);
                const min = Math.min(...vals);
                const max = Math.max(...vals);
                const range = max - min || 1;
                const pct = ((p.rate - min) / range) * 100;
                const isContango = i > 0 && p.rate > data.forwardCurve[i - 1].rate;
                return (
                  <div
                    key={i}
                    className="flex-1 min-w-0 flex flex-col items-center justify-end h-full"
                  >
                    <div
                      className="w-full"
                      style={{
                        height: `${Math.max(5, pct)}%`,
                        background: isContango ? ACCENT : '#38bdf8',
                        opacity: 0.4 + (i / data.forwardCurve.length) * 0.6,
                      }}
                      title={`${p.period}: ${fmtRate(p.rate)}`}
                    />
                    <span className="text-[6px] font-mono text-neutral/30 mt-1 truncate w-full text-center">
                      {p.period}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-1.5 text-[7px] font-mono text-neutral/40">
              <span className="text-amber-400">{'\u25A0'} Contango</span>
              <span className="text-sky-400">{'\u25A0'} Backwardation</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Ports Tab ---------- */

function PortsTab({ data }: { data: any }) {
  if (!data || !data.ports || data.ports.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Congestion Overview */}
      {data.overview && (
        <div
          className="grid grid-cols-3 gap-px shrink-0 border-b border-border/20"
          style={{ background: ACCENT_DIM }}
        >
          <div className="px-3 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">AVG WAIT</div>
            <div className="text-[11px] font-mono font-black text-white">
              {fmtDays(data.overview.avgWaitTime)}
            </div>
          </div>
          <div className="px-3 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">TOTAL QUEUE</div>
            <div className="text-[11px] font-mono font-black text-white">
              {fmtNum(data.overview.totalQueue)}
            </div>
          </div>
          <div className="px-3 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">CONGESTION</div>
            <div className={`text-[11px] font-mono font-black uppercase ${congestionColor(data.overview.level)}`}>
              {data.overview.level ?? '--'}
            </div>
          </div>
        </div>
      )}

      {/* Ports Table */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider grid grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr]">
        <span>PORT</span>
        <span className="text-right">VESSELS</span>
        <span className="text-right">WAIT TIME</span>
        <span className="text-right">1W CHG</span>
        <span className="text-right">QUEUE</span>
        <span className="text-right">STATUS</span>
      </div>
      {data.ports.map((p: any, i: number) => (
        <div
          key={p.port ?? p.name ?? i}
          className="grid grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <div>
            <span className="text-[10px] font-mono font-bold" style={{ color: ACCENT }}>
              {p.port ?? p.name}
            </span>
            {p.country && (
              <span className="text-[7px] font-mono text-neutral/30 ml-1.5">{p.country}</span>
            )}
          </div>
          <span className="text-[10px] font-mono text-white text-right">
            {fmtNum(p.vesselCount)}
          </span>
          <span className={`text-[10px] font-mono text-right ${
            (p.waitTime ?? 0) > 7 ? 'text-red-400' : (p.waitTime ?? 0) > 3 ? 'text-amber-400' : 'text-white'
          }`}>
            {fmtDays(p.waitTime)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(p.weekChange)}`}>
            {fmtPct(p.weekChange)}
          </span>
          <span className="text-[10px] font-mono text-white/70 text-right">
            {fmtNum(p.queueLength)}
          </span>
          <span className="flex justify-end">
            <span className={`text-[7px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 ${congestionBadge(p.congestionLevel)}`}>
              {p.congestionLevel ?? '--'}
            </span>
          </span>
        </div>
      ))}

      {/* Top Congested */}
      {data.topCongested && data.topCongested.length > 0 && (
        <div className="mt-1">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black uppercase tracking-wider" style={{ color: ACCENT }}>
              TOP CONGESTED PORTS
            </span>
          </div>
          {data.topCongested.map((p: any, i: number) => (
            <div key={p.port ?? i} className="px-3 py-1.5 border-b border-border/10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-bold text-red-400">#{i + 1}</span>
                  <span className="text-[9px] font-mono font-bold text-white/80">{p.port}</span>
                  {p.country && (
                    <span className="text-[7px] font-mono text-neutral/30">{p.country}</span>
                  )}
                </div>
                <span className="text-[9px] font-mono font-bold text-red-400">
                  {fmtDays(p.waitTime)} avg
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/5 overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(100, Math.max(5, (p.waitTime / (data.maxWaitTime || 14)) * 100))}%`,
                    background: (p.waitTime ?? 0) > 7 ? '#f87171' : ACCENT,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Shared Components ---------- */

function RangeBar({
  low,
  high,
  current,
}: {
  low: number | null | undefined;
  high: number | null | undefined;
  current: number | null | undefined;
}) {
  if (low == null || high == null || current == null) return null;
  const range = high - low;
  const pct = range > 0 ? ((current - low) / range) * 100 : 50;

  return (
    <div className="w-16 h-1.5 bg-white/10 relative">
      <div
        className="absolute top-0 h-full"
        style={{
          left: 0,
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: ACCENT,
          opacity: 0.5,
        }}
      />
      <div
        className="absolute top-[-1px] w-[3px] h-[8px]"
        style={{
          left: `${Math.min(100, Math.max(0, pct))}%`,
          background: ACCENT,
          transform: 'translateX(-50%)',
        }}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-8 text-[10px] font-mono text-neutral/40 uppercase tracking-wider">
      NO DATA AVAILABLE
    </div>
  );
}
