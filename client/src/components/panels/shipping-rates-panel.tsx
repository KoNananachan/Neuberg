import { useState } from 'react';
import { useShippingRates } from '../../api/hooks/use-shipping-rates';
import { Ship, RefreshCw } from 'lucide-react';

type Tab = 'dryBulk' | 'tanker' | 'container' | 'ports';

const ACCENT = '#06b6d4';
const ACCENT_DIM = 'rgba(6,182,212,0.08)';

const TAB_LABELS: Record<Tab, string> = {
  dryBulk: 'DRY BULK',
  tanker: 'TANKER',
  container: 'CONTAINER',
  ports: 'PORTS',
};

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

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e3) return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n.toFixed(0);
}

function fmtDays(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1) + 'd';
}

function pctColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral/40';
  return n >= 0 ? 'text-bullish' : 'text-bearish';
}

export function ShippingRatesPanel() {
  const [tab, setTab] = useState<Tab>('dryBulk');
  const { data, isLoading, refetch } = useShippingRates();

  const summary = data?.summary;
  const dryBulk = data?.dryBulk ?? [];
  const tanker = data?.tanker ?? [];
  const container = data?.container ?? [];
  const ports = data?.ports ?? [];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Ship className="w-4 h-4" style={{ color: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            FREIGHT & SHIPPING
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 transition-colors"
          style={{ ['--tw-hover-color' as string]: ACCENT }}
          onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT)}
          onMouseLeave={(e) => (e.currentTarget.style.color = '')}
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary bar */}
      {summary && (
        <div
          className="grid grid-cols-4 gap-px shrink-0 border-b border-border/30"
          style={{ background: ACCENT_DIM }}
        >
          <SummaryCell label="BDI" value={fmtNum(summary.bdi)} accent />
          <SummaryCell label="BDTI" value={fmtNum(summary.bdti)} />
          <SummaryCell label="BCTI" value={fmtNum(summary.bcti)} />
          <SummaryCell
            label="1D CHG"
            value={fmtPct(summary.dayChange)}
            colorClass={pctColor(summary.dayChange)}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['dryBulk', 'tanker', 'container', 'ports'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t
                ? 'text-[#06b6d4] border-[#06b6d4]'
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
            <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
              LOADING
            </span>
          </div>
        )}

        {!isLoading && !data && (
          <div className="flex items-center justify-center py-8 text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
            NO DATA
          </div>
        )}

        {data && tab === 'dryBulk' && <DryBulkTable rows={dryBulk} />}
        {data && tab === 'tanker' && <TankerTable rows={tanker} />}
        {data && tab === 'container' && <ContainerTable rows={container} />}
        {data && tab === 'ports' && <PortsView rows={ports} />}
      </div>
    </div>
  );
}

/* ---------- Summary Cell ---------- */

function SummaryCell({
  label,
  value,
  accent,
  colorClass,
}: {
  label: string;
  value: string;
  accent?: boolean;
  colorClass?: string;
}) {
  return (
    <div className="px-3 py-1.5 bg-black">
      <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">{label}</div>
      <div
        className={`text-[12px] font-mono font-black ${colorClass ?? (accent ? 'text-[#06b6d4]' : 'text-white')}`}
      >
        {value}
      </div>
    </div>
  );
}

/* ---------- Dry Bulk ---------- */

interface DryBulkRow {
  vesselType: string;
  route: string;
  rate: number;
  dayChange: number;
  weekChange: number;
  tcAvg: number;
}

function DryBulkTable({ rows }: { rows: DryBulkRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        NO DATA
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr_0.6fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>VESSEL TYPE</span>
        <span>ROUTE</span>
        <span className="text-right">RATE ($/DAY)</span>
        <span className="text-right">1D CHG</span>
        <span className="text-right">1W CHG</span>
        <span className="text-right">TC AVG</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={`${r.vesselType}-${r.route}-${i}`}
          className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr_0.6fr_0.8fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-[10px] font-mono font-bold text-[#06b6d4]">{r.vesselType}</span>
          <span className="text-[9px] font-mono text-neutral/60 truncate">{r.route}</span>
          <span className="text-[10px] font-mono text-white text-right">{fmtRate(r.rate)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.dayChange)}`}>
            {fmtPct(r.dayChange)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.weekChange)}`}>
            {fmtPct(r.weekChange)}
          </span>
          <span className="text-[9px] font-mono text-neutral/50 text-right">{fmtRate(r.tcAvg)}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Tanker ---------- */

interface TankerRow {
  route: string;
  type: string;
  worldscale: number;
  tceRate: number;
  dayChange: number;
  weekChange: number;
}

function TankerTable({ rows }: { rows: TankerRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        NO DATA
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>ROUTE</span>
        <span>TYPE</span>
        <span className="text-right">WS</span>
        <span className="text-right">TCE RATE</span>
        <span className="text-right">1D CHG</span>
        <span className="text-right">1W CHG</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={`${r.route}-${r.type}-${i}`}
          className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-[10px] font-mono font-bold text-[#06b6d4] truncate">{r.route}</span>
          <span className="text-[9px] font-mono text-neutral/60">{r.type}</span>
          <span className="text-[10px] font-mono text-white text-right">{r.worldscale.toFixed(1)}</span>
          <span className="text-[10px] font-mono text-white text-right">{fmtRate(r.tceRate)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.dayChange)}`}>
            {fmtPct(r.dayChange)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.weekChange)}`}>
            {fmtPct(r.weekChange)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Container ---------- */

interface ContainerRow {
  route: string;
  teu20: number;
  teu40: number;
  weekChange: number;
  monthChange: number;
  carrier: string;
}

function ContainerTable({ rows }: { rows: ContainerRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        NO DATA
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.6fr_0.6fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>ROUTE</span>
        <span className="text-right">20FT TEU</span>
        <span className="text-right">40FT TEU</span>
        <span className="text-right">1W CHG</span>
        <span className="text-right">1M CHG</span>
        <span className="text-right">CARRIER</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={`${r.route}-${r.carrier}-${i}`}
          className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.6fr_0.6fr_0.8fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-[10px] font-mono font-bold text-[#06b6d4] truncate">{r.route}</span>
          <span className="text-[10px] font-mono text-white text-right">{fmtRate(r.teu20)}</span>
          <span className="text-[10px] font-mono text-white text-right">{fmtRate(r.teu40)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.weekChange)}`}>
            {fmtPct(r.weekChange)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.monthChange)}`}>
            {fmtPct(r.monthChange)}
          </span>
          <span className="text-[8px] font-mono text-neutral/50 text-right truncate">{r.carrier}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Ports ---------- */

interface PortRow {
  port: string;
  country: string;
  vesselsWaiting: number;
  avgWaitDays: number;
  weekChange: number;
  category: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  container: 'bg-[#06b6d4]/20 text-[#06b6d4]',
  bulk: 'bg-amber-500/20 text-amber-400',
  tanker: 'bg-purple-500/20 text-purple-400',
  lng: 'bg-emerald-500/20 text-emerald-400',
  general: 'bg-neutral/20 text-neutral/60',
};

function PortsView({ rows }: { rows: PortRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        NO DATA
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[1fr_0.7fr_0.6fr_0.6fr_0.6fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>PORT</span>
        <span>COUNTRY</span>
        <span className="text-right">WAITING</span>
        <span className="text-right">AVG WAIT</span>
        <span className="text-right">1W CHG</span>
        <span className="text-right">CATEGORY</span>
      </div>
      {rows.map((r, i) => {
        const catClass = CATEGORY_COLORS[r.category?.toLowerCase()] ?? CATEGORY_COLORS.general;

        return (
          <div
            key={`${r.port}-${r.country}-${i}`}
            className="grid grid-cols-[1fr_0.7fr_0.6fr_0.6fr_0.6fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
          >
            <span className="text-[10px] font-mono font-bold text-[#06b6d4] truncate">{r.port}</span>
            <span className="text-[9px] font-mono text-neutral/60">{r.country}</span>
            <span className="text-[10px] font-mono text-white text-right">{fmtNum(r.vesselsWaiting)}</span>
            <span className="text-[10px] font-mono text-neutral/60 text-right">{fmtDays(r.avgWaitDays)}</span>
            <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.weekChange)}`}>
              {fmtPct(r.weekChange)}
            </span>
            <span className="flex justify-end">
              <span className={`text-[7px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 ${catClass}`}>
                {r.category}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
