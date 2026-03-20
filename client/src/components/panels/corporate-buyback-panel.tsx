import { useCorporateBuyback } from '../../api/hooks/use-corporate-buyback';
import { useT, tr, TFn } from '../../i18n';

// ── Types (mirroring server response) ──

interface ActiveProgram {
  ticker: string;
  companyName: string;
  programSize: number;
  remaining: number;
  completionPct: number;
  buybackYield: number;
  avgPrice: number;
  sharesRepurchased: number;
  announcedDate: string;
  expiryDate: string;
}

interface SectorSummary {
  sector: string;
  totalPrograms: number;
  totalSize: number;
  avgCompletion: number;
  avgBuybackYield: number;
  netShareChange: number;
}

interface RecentExecution {
  ticker: string;
  date: string;
  sharesRepurchased: number;
  avgPrice: number;
  totalCost: number;
  dailyVolumePct: number;
}

interface MarketSummary {
  totalActivePrograms: number;
  totalProgramValue: number;
  avgBuybackYield: number;
  topSector: string;
  ytdBuybacks: number;
  timestamp: string;
}

interface CorporateBuybackResponse {
  activePrograms: ActiveProgram[];
  sectorSummary: SectorSummary[];
  recentActivity: RecentExecution[];
  marketSummary: MarketSummary;
}

// ── Formatting helpers ──

function fmtB(n: number): string {
  return n.toFixed(1);
}

function fmtT(n: number): string {
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtSharesM(n: number): string {
  return (n / 1_000_000).toFixed(2);
}

function fmtCostM(n: number): string {
  return n.toFixed(1);
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

// ── Main Panel ──

export function CorporateBuybackPanel() {
  const t = useT();
  const { data, isLoading } = useCorporateBuyback();

  const buyback = data as CorporateBuybackResponse | undefined;

  // Loading state
  if (isLoading && !buyback) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-emerald-400/40 uppercase tracking-widest animate-pulse">
          {tr(t, 'loading', 'LOADING...')}
        </span>
      </div>
    );
  }

  // Error / no data state
  if (!buyback?.activePrograms) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          {tr(t, 'cbNoData', 'NO DATA AVAILABLE')}
        </span>
      </div>
    );
  }

  const summary = buyback.marketSummary;

  return (
    <div className="h-full overflow-auto bg-black p-1 text-[9px] font-mono">
      {/* ── Summary Bar ── */}
      <div className="grid grid-cols-4 gap-px bg-emerald-400/[0.06] mb-1">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">ACTIVE PROGRAMS</div>
          <div className="text-[11px] font-black text-emerald-400">{summary.totalActivePrograms}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">TOTAL VALUE</div>
          <div className="text-[11px] font-black text-emerald-400">${fmtT(summary.totalProgramValue)}T</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">AVG BUYBACK YIELD</div>
          <div className="text-[11px] font-black text-white/60">{fmtPct(summary.avgBuybackYield)}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">YTD BUYBACKS</div>
          <div className="text-[11px] font-black text-emerald-400">${fmtB(summary.ytdBuybacks)}B</div>
        </div>
      </div>

      {/* ── Active Programs ── */}
      <div className="mb-1">
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-emerald-400/60 uppercase tracking-wider font-bold">
            ACTIVE PROGRAMS
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[36px] shrink-0">TICKER</span>
          <span className="w-[100px] shrink-0">COMPANY</span>
          <span className="w-[48px] shrink-0 text-right">SIZE $B</span>
          <span className="w-[48px] shrink-0 text-right">REM $B</span>
          <span className="w-[72px] shrink-0 text-right">COMPLETION</span>
          <span className="w-[44px] shrink-0 text-right">YIELD</span>
          <span className="w-[48px] shrink-0 text-right">AVG PX</span>
          <span className="flex-1 text-right">EXPIRY</span>
        </div>

        {/* Rows */}
        {buyback.activePrograms.map((p) => (
          <div
            key={p.ticker}
            className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-emerald-400/[0.02] transition-colors"
          >
            <span className="w-[36px] shrink-0 text-[8px] font-bold text-emerald-400">{p.ticker}</span>
            <span className="w-[100px] shrink-0 text-white/40 truncate">{p.companyName}</span>
            <span className="w-[48px] shrink-0 text-right text-white/60">{fmtB(p.programSize)}</span>
            <span className="w-[48px] shrink-0 text-right text-white/40">{fmtB(p.remaining)}</span>
            <span className="w-[72px] shrink-0 text-right flex items-center justify-end gap-1">
              <span className="w-[36px] h-[4px] bg-white/[0.06] relative overflow-hidden">
                <span
                  className="absolute inset-y-0 left-0 bg-emerald-400/60"
                  style={{ width: `${Math.min(p.completionPct, 100)}%` }}
                />
              </span>
              <span className="text-white/50 text-[7px] w-[28px] text-right">{fmtPct(p.completionPct)}</span>
            </span>
            <span className="w-[44px] shrink-0 text-right text-emerald-400/80">{fmtPct(p.buybackYield)}</span>
            <span className="w-[48px] shrink-0 text-right text-white/50">{fmtPrice(p.avgPrice)}</span>
            <span className="flex-1 text-right text-white/30 text-[7px]">{fmtDate(p.expiryDate)}</span>
          </div>
        ))}
      </div>

      {/* ── Sector Summary ── */}
      <div className="mb-1">
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-emerald-400/60 uppercase tracking-wider font-bold">
            SECTOR SUMMARY
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[100px] shrink-0">SECTOR</span>
          <span className="w-[44px] shrink-0 text-right">PROGS</span>
          <span className="w-[52px] shrink-0 text-right">SIZE $B</span>
          <span className="w-[52px] shrink-0 text-right">AVG COMPL</span>
          <span className="w-[44px] shrink-0 text-right">AVG YLD</span>
          <span className="flex-1 text-right">NET SHR CHG</span>
        </div>

        {/* Rows */}
        {buyback.sectorSummary.map((s) => (
          <div
            key={s.sector}
            className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-emerald-400/[0.02] transition-colors"
          >
            <span className="w-[100px] shrink-0 text-[8px] font-bold text-white/60 truncate">{s.sector}</span>
            <span className="w-[44px] shrink-0 text-right text-white/50">{s.totalPrograms}</span>
            <span className="w-[52px] shrink-0 text-right text-white/60">{fmtB(s.totalSize)}</span>
            <span className="w-[52px] shrink-0 text-right text-white/40">{fmtPct(s.avgCompletion)}</span>
            <span className="w-[44px] shrink-0 text-right text-emerald-400/80">{fmtPct(s.avgBuybackYield)}</span>
            <span
              className="flex-1 text-right font-bold"
              style={{ color: s.netShareChange <= 0 ? '#4ade80' : '#f87171' }}
            >
              {s.netShareChange > 0 ? '+' : ''}{s.netShareChange.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      {/* ── Recent Activity ── */}
      <div>
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-emerald-400/60 uppercase tracking-wider font-bold">
            RECENT ACTIVITY
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[60px] shrink-0">DATE</span>
          <span className="w-[40px] shrink-0">TICKER</span>
          <span className="w-[52px] shrink-0 text-right">SHARES M</span>
          <span className="w-[50px] shrink-0 text-right">AVG PX</span>
          <span className="w-[52px] shrink-0 text-right">COST $M</span>
          <span className="flex-1 text-right">% DLY VOL</span>
        </div>

        {/* Rows */}
        {buyback.recentActivity.map((r, i) => {
          const highVol = r.dailyVolumePct >= 20;
          return (
            <div
              key={`${r.ticker}-${r.date}-${i}`}
              className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-emerald-400/[0.02] transition-colors"
            >
              <span className="w-[60px] shrink-0 text-[7px] text-white/30">{fmtDate(r.date)}</span>
              <span className="w-[40px] shrink-0 text-[8px] font-bold text-emerald-400">{r.ticker}</span>
              <span className="w-[52px] shrink-0 text-right text-white/50">{fmtSharesM(r.sharesRepurchased)}</span>
              <span className="w-[50px] shrink-0 text-right text-white/60">{fmtPrice(r.avgPrice)}</span>
              <span className="w-[52px] shrink-0 text-right text-white/40">{fmtCostM(r.totalCost)}</span>
              <span
                className={`flex-1 text-right font-bold ${highVol ? 'text-emerald-400' : 'text-white/40'}`}
              >
                {fmtPct(r.dailyVolumePct)}
                {highVol && (
                  <span className="ml-1 text-[6px] text-emerald-400/80 bg-emerald-400/[0.08] px-0.5">HIGH</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
