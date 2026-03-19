import { useLiquidityDashboard } from '../../api/hooks/use-liquidity-dashboard';
import { useT } from '../../i18n';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const CYAN = '#22d3ee';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';

// ── Formatting helpers ──

function fmtTrillion(n: number): string {
  return '$' + n.toFixed(2) + 'T';
}

function fmtBillion(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return '$' + (n / 1000).toFixed(2) + 'T';
  return '$' + n.toFixed(0) + 'B';
}

function fmtBillionSigned(n: number): string {
  const prefix = n > 0 ? '+' : '';
  const abs = Math.abs(n);
  if (abs >= 1000) return prefix + '$' + (n / 1000).toFixed(2) + 'T';
  return prefix + '$' + n.toFixed(0) + 'B';
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtBps(n: number): string {
  return n.toFixed(1) + 'bp';
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function signalBadge(signal: string): { text: string; color: string; bg: string } {
  const s = (signal ?? '').toUpperCase();
  if (s === 'EASY' || s.includes('EASY')) return { text: 'EASY', color: GREEN, bg: 'rgba(52,211,153,0.12)' };
  if (s === 'TIGHT' || s.includes('TIGHT')) return { text: 'TIGHT', color: RED, bg: 'rgba(248,113,113,0.12)' };
  return { text: 'NEUTRAL', color: YELLOW, bg: 'rgba(251,191,36,0.1)' };
}

// ── US Liquidity Metrics Section ──

function USLiquiditySection({ usLiquidity }: { usLiquidity: any }) {
  const metrics = [
    { label: 'FED BALANCE SHEET', value: usLiquidity?.fedBalanceSheet, format: fmtTrillion },
    { label: 'TREASURY GENERAL ACCT', value: usLiquidity?.tga, format: fmtBillion },
    { label: 'REVERSE REPO (RRP)', value: usLiquidity?.rrp, format: fmtBillion },
    { label: 'BANK RESERVES', value: usLiquidity?.reserves, format: fmtBillion },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1.5 pb-0.5">
        <span className="text-[6px] text-white/25 uppercase tracking-wider">
          US Liquidity Components
        </span>
      </div>

      {/* Net Liquidity highlight */}
      <div className="px-3 py-1.5 border-b border-border/10">
        <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider mb-0.5">
          Net Liquidity (Fed BS - TGA - RRP)
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] font-mono font-black text-cyan-400">
            {usLiquidity?.netLiquidity != null ? fmtTrillion(usLiquidity.netLiquidity) : '--'}
          </span>
          {usLiquidity?.netLiquidityChange != null && (
            <span
              className="text-[9px] font-mono font-bold"
              style={{ color: changeColor(usLiquidity.netLiquidityChange) }}
            >
              {fmtBillionSigned(usLiquidity.netLiquidityChange)}/wk
            </span>
          )}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-px bg-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="px-2 py-1.5 bg-black hover:bg-cyan-400/[0.02] transition-colors">
            <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider">{m.label}</div>
            <div className="text-[10px] font-mono font-bold text-white/70">
              {m.value != null ? m.format(m.value) : '--'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Central Bank Balance Sheets Section ──

function CentralBankSection({ centralBanks }: { centralBanks: any[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1.5 pb-0.5">
        <span className="text-[6px] text-white/25 uppercase tracking-wider">
          Central Bank Balance Sheets
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[5px] font-mono text-white/20 uppercase gap-1">
        <span className="w-[72px] shrink-0">NAME</span>
        <span className="w-[52px] text-right shrink-0">TOTAL ASSETS</span>
        <span className="w-[48px] text-right shrink-0">MOM CHG</span>
        <span className="flex-1 text-right shrink-0">YOY CHG</span>
      </div>

      {(centralBanks ?? []).map((row: any, i: number) => (
        <div
          key={row.name ?? i}
          className="flex items-center py-[3px] px-1 border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors text-[7px] font-mono gap-1"
        >
          <span className="w-[72px] font-bold text-cyan-400 truncate shrink-0">{row.name}</span>
          <span className="w-[52px] text-right text-white/60 font-bold shrink-0">
            {row.totalAssets != null ? fmtTrillion(row.totalAssets) : '--'}
          </span>
          <span
            className="w-[48px] text-right font-bold shrink-0"
            style={{ color: changeColor(row.changeMoM ?? 0) }}
          >
            {row.changeMoM != null ? fmtPct(row.changeMoM) : '--'}
          </span>
          <span
            className="flex-1 text-right font-bold shrink-0"
            style={{ color: changeColor(row.changeYoY ?? 0) }}
          >
            {row.changeYoY != null ? fmtPct(row.changeYoY) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Funding Stress Section ──

function FundingStressSection({ fundingStress }: { fundingStress: any }) {
  const indicators = [
    { label: 'SOFR-FF SPREAD', key: 'sofrFf' },
    { label: 'FRA-OIS SPREAD', key: 'fraOis' },
    { label: 'XCCY BASIS', key: 'xccyBasis' },
    { label: 'CP-OIS SPREAD', key: 'cpOis' },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1.5 pb-0.5">
        <span className="text-[6px] text-white/25 uppercase tracking-wider">
          Funding Stress Indicators
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[5px] font-mono text-white/20 uppercase gap-1">
        <span className="w-[80px] shrink-0">INDICATOR</span>
        <span className="w-[44px] text-right shrink-0">CURRENT</span>
        <span className="w-[44px] text-right shrink-0">1W AGO</span>
        <span className="flex-1 text-right shrink-0">SIGNAL</span>
      </div>

      {indicators.map((ind) => {
        const item = fundingStress?.[ind.key];
        const badge = signalBadge(item?.signal ?? '');
        return (
          <div
            key={ind.key}
            className="flex items-center py-[3px] px-1 border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors text-[7px] font-mono gap-1"
          >
            <span className="w-[80px] font-bold text-white/60 shrink-0">{ind.label}</span>
            <span className="w-[44px] text-right text-white/70 font-bold shrink-0">
              {item?.current != null ? fmtBps(item.current) : '--'}
            </span>
            <span className="w-[44px] text-right text-white/40 shrink-0">
              {item?.weekAgo != null ? fmtBps(item.weekAgo) : '--'}
            </span>
            <span className="flex-1 flex justify-end shrink-0">
              <span
                className="text-[5px] font-black font-mono uppercase px-1 py-0"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {badge.text}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Liquidity Conditions Section ──

function LiquidityConditionsSection({ conditions }: { conditions: any[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1.5 pb-0.5">
        <span className="text-[6px] text-white/25 uppercase tracking-wider">
          Liquidity Conditions
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[5px] font-mono text-white/20 uppercase gap-1">
        <span className="w-[72px] shrink-0">INDICATOR</span>
        <span className="w-[40px] text-right shrink-0">CURRENT</span>
        <span className="w-[40px] text-right shrink-0">1M AGO</span>
        <span className="w-[40px] text-right shrink-0">3M AGO</span>
        <span className="flex-1 text-right shrink-0">SIGNAL</span>
      </div>

      {(conditions ?? []).map((row: any, i: number) => {
        const badge = signalBadge(row.signal ?? '');
        return (
          <div
            key={row.indicator ?? i}
            className="flex items-center py-[3px] px-1 border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors text-[7px] font-mono gap-1"
          >
            <span className="w-[72px] font-bold text-white/60 truncate shrink-0">{row.indicator}</span>
            <span className="w-[40px] text-right text-white/70 font-bold shrink-0">
              {row.current ?? '--'}
            </span>
            <span className="w-[40px] text-right text-white/40 shrink-0">
              {row.oneMonthAgo ?? '--'}
            </span>
            <span className="w-[40px] text-right text-white/40 shrink-0">
              {row.threeMonthsAgo ?? '--'}
            </span>
            <span className="flex-1 flex justify-end shrink-0">
              <span
                className="text-[5px] font-black font-mono uppercase px-1 py-0"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {badge.text}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function LiquidityDashboardPanel() {
  const t = useT();
  const { data, isLoading } = useLiquidityDashboard();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-cyan-400">
            {tr(t, 'liqDashTitle', 'Liquidity Dashboard')}
          </span>
        </div>
        {data?.timestamp && (
          <span className="text-[6px] text-white/20">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : data ? (
          <>
            <USLiquiditySection usLiquidity={data?.usLiquidity} />
            <CentralBankSection centralBanks={data?.centralBanks ?? []} />
            <FundingStressSection fundingStress={data?.fundingStress} />
            <LiquidityConditionsSection conditions={data?.conditions ?? []} />

            {/* Timestamp footer */}
            <div className="px-2 py-1 border-t border-border/20">
              <span className="text-[6px] font-mono text-white/15">
                Last update: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : '-'}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'liqDashNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}
