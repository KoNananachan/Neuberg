import { useState } from 'react';
import { useTradeFinance } from '../../api/hooks/use-trade-finance';
import { RefreshCw, Landmark } from 'lucide-react';

type Tab = 'corridors' | 'instruments' | 'commodities' | 'banks';

const ACCENT = '#a3e635';
const ACCENT_DIM = 'rgba(163,230,53,0.08)';

const TAB_LABELS: Record<Tab, string> = {
  corridors: 'CORRIDORS',
  instruments: 'INSTRUMENTS',
  commodities: 'COMMODITIES',
  banks: 'BANKS',
};

function fmtB(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'T';
  return '$' + n.toFixed(1) + 'B';
}

function fmtT(n: number | null | undefined): string {
  if (n == null) return '--';
  return '$' + n.toFixed(2) + 'T';
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

function fmtBp(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(0) + 'bp';
}

function fmtDays(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(0) + 'd';
}

function fmtRate(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + '%';
}

function fmtShare(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1) + '%';
}

function pctColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral/40';
  return n >= 0 ? 'text-bullish' : 'text-bearish';
}

function riskScoreColor(score: number): string {
  if (score <= 2) return '#34d399';
  if (score <= 4) return '#a3e635';
  if (score <= 6) return '#fbbf24';
  if (score <= 8) return '#f97316';
  return '#ef4444';
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
        className={`text-[12px] font-mono font-black ${colorClass ?? (accent ? 'text-[#a3e635]' : 'text-white')}`}
      >
        {value}
      </div>
    </div>
  );
}

/* ---------- Corridors Tab ---------- */

interface CorridorRow {
  corridor: string;
  volume: number;
  monthChange: number;
  lcRate: number;
  avgTenor: number;
  primaryCommodity: string;
  riskScore: number;
}

function CorridorsTable({ rows }: { rows: CorridorRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        NO DATA
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[1.4fr_0.7fr_0.6fr_0.6fr_0.6fr_1fr_0.5fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>CORRIDOR</span>
        <span className="text-right">VOL ($B)</span>
        <span className="text-right">1M CHG</span>
        <span className="text-right">L/C RATE</span>
        <span className="text-right">TENOR</span>
        <span className="text-right">COMMODITY</span>
        <span className="text-right">RISK</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={`${r.corridor}-${i}`}
          className="grid grid-cols-[1.4fr_0.7fr_0.6fr_0.6fr_0.6fr_1fr_0.5fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[10px] font-mono font-bold text-[#a3e635] truncate">{r.corridor}</span>
          <span className="text-[10px] font-mono text-white text-right">{fmtB(r.volume)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.monthChange)}`}>
            {fmtPct(r.monthChange)}
          </span>
          <span className="text-[9px] font-mono text-neutral/60 text-right">{fmtBp(r.lcRate)}</span>
          <span className="text-[9px] font-mono text-neutral/60 text-right">{fmtDays(r.avgTenor)}</span>
          <span className="text-[8px] font-mono text-neutral/50 text-right truncate">{r.primaryCommodity}</span>
          <span className="flex justify-end">
            <span
              className="text-[9px] font-mono font-black w-5 text-center"
              style={{ color: riskScoreColor(r.riskScore) }}
            >
              {r.riskScore}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Instruments Tab ---------- */

interface InstrumentRow {
  type: string;
  outstanding: number;
  avgRate: number;
  avgTenor: number;
  quarterChange: number;
}

function InstrumentsTable({ rows }: { rows: InstrumentRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        NO DATA
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>TYPE</span>
        <span className="text-right">OUTSTANDING ($B)</span>
        <span className="text-right">AVG RATE</span>
        <span className="text-right">AVG TENOR</span>
        <span className="text-right">1Q CHG</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={`${r.type}-${i}`}
          className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-[10px] font-mono font-bold text-[#a3e635]">{r.type}</span>
          <span className="text-[10px] font-mono text-white text-right">{fmtB(r.outstanding)}</span>
          <span className="text-[9px] font-mono text-neutral/60 text-right">{fmtRate(r.avgRate)}</span>
          <span className="text-[9px] font-mono text-neutral/60 text-right">{fmtDays(r.avgTenor)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.quarterChange)}`}>
            {fmtPct(r.quarterChange)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Commodities Tab ---------- */

interface CommodityRow {
  commodity: string;
  tradeVolume: number;
  topRoute: string;
  financingRate: number;
  monthChange: number;
}

function CommoditiesTable({ rows }: { rows: CommodityRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        NO DATA
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[1.2fr_0.8fr_1fr_0.7fr_0.6fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>COMMODITY</span>
        <span className="text-right">TRADE VOL ($B)</span>
        <span className="text-right">TOP ROUTE</span>
        <span className="text-right">FIN RATE</span>
        <span className="text-right">1M CHG</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={`${r.commodity}-${i}`}
          className="grid grid-cols-[1.2fr_0.8fr_1fr_0.7fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-[10px] font-mono font-bold text-[#a3e635]">{r.commodity}</span>
          <span className="text-[10px] font-mono text-white text-right">{fmtB(r.tradeVolume)}</span>
          <span className="text-[8px] font-mono text-neutral/50 text-right truncate">{r.topRoute}</span>
          <span className="text-[9px] font-mono text-neutral/60 text-right">{fmtRate(r.financingRate)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(r.monthChange)}`}>
            {fmtPct(r.monthChange)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Banks Tab ---------- */

interface BankRow {
  bank: string;
  marketShare: number;
  lcVolume: number;
  avgRate: number;
  topCorridor: string;
}

function BanksTable({ rows }: { rows: BankRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        NO DATA
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.6fr_1fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>BANK</span>
        <span>MKT SHARE</span>
        <span className="text-right">L/C VOL ($B)</span>
        <span className="text-right">AVG RATE</span>
        <span className="text-right">TOP CORRIDOR</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={`${r.bank}-${i}`}
          className="grid grid-cols-[1.2fr_1fr_0.7fr_0.6fr_1fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[10px] font-mono font-bold text-[#a3e635] truncate">{r.bank}</span>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-2 bg-white/[0.03] relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full"
                style={{
                  width: `${Math.min(r.marketShare, 100)}%`,
                  backgroundColor: ACCENT,
                  opacity: 0.35,
                }}
              />
            </div>
            <span className="text-[9px] font-mono font-bold text-neutral/60 w-8 text-right shrink-0">
              {fmtShare(r.marketShare)}
            </span>
          </div>
          <span className="text-[10px] font-mono text-white text-right">{fmtB(r.lcVolume)}</span>
          <span className="text-[9px] font-mono text-neutral/60 text-right">{fmtRate(r.avgRate)}</span>
          <span className="text-[8px] font-mono text-neutral/50 text-right truncate">{r.topCorridor}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Main Panel ---------- */

export function TradeFinancePanel() {
  const [tab, setTab] = useState<Tab>('corridors');
  const { data, isLoading, refetch } = useTradeFinance();

  const summary = data?.summary;
  const corridors = data?.corridors ?? [];
  const instruments = data?.instruments ?? [];
  const commodities = data?.commodities ?? [];
  const banks = data?.banks ?? [];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4" style={{ color: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            TRADE FINANCE
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

      {/* Summary bar */}
      {summary && (
        <div
          className="grid grid-cols-5 gap-px shrink-0 border-b border-border/30"
          style={{ background: ACCENT_DIM }}
        >
          <SummaryCell label="TRADE VOL" value={fmtT(summary.tradeVolume)} accent />
          <SummaryCell label="L/C OUTST" value={fmtB(summary.lcOutstanding)} />
          <SummaryCell label="AVG L/C RATE" value={fmtBp(summary.avgLcRate)} />
          <SummaryCell label="TOP CORRIDOR" value={summary.topCorridor ?? '--'} />
          <SummaryCell label="FIN GAP" value={fmtB(summary.financeGap)} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['corridors', 'instruments', 'commodities', 'banks'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t
                ? 'text-[#a3e635] border-[#a3e635]'
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

        {data && tab === 'corridors' && <CorridorsTable rows={corridors} />}
        {data && tab === 'instruments' && <InstrumentsTable rows={instruments} />}
        {data && tab === 'commodities' && <CommoditiesTable rows={commodities} />}
        {data && tab === 'banks' && <BanksTable rows={banks} />}
      </div>
    </div>
  );
}
