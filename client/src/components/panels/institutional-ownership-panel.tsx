import { useInstitutionalOwnership } from '../../api/hooks/use-institutional-ownership';
import { useT } from '../../i18n';

// -- i18n fallback helper --

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Formatting helpers --

function fmtNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtValue(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return '$' + (abs / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return '$' + (abs / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return '$' + (abs / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return '$' + (abs / 1e3).toFixed(0) + 'K';
  return '$' + abs.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(2) + '%';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-white/40';
}

function changePrefix(n: number): string {
  if (n > 0) return '+';
  return '';
}

// -- Main Panel --

export function InstitutionalOwnershipPanel() {
  const t = useT();
  const { data, isLoading } = useInstitutionalOwnership();

  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
          <div className="w-1 h-3 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-teal-400">
            {tr(t, 'panelInstitutionalOwnership', 'Institutional Ownership')}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  const topHolders = (data?.topHolders ?? []) as Array<{
    institution: string;
    shares: number;
    value: number;
    portfolioPct: number;
    outstandingPct: number;
    change: number;
  }>;

  const summary = data?.summary as
    | {
        institutionalPct: number;
        totalInstitutions: number;
        newPositions: number;
        increasedPositions: number;
        decreasedPositions: number;
        soldOutPositions: number;
      }
    | undefined;

  const quarterlyTrend = (data?.quarterlyTrend ?? []) as Array<{
    quarter: string;
    totalShares: number;
    totalValue: number;
    institutions: number;
  }>;

  const topBuys = (data?.topBuys ?? []) as Array<{
    institution: string;
    shares: number;
    value: number;
    changePct: number;
  }>;

  const topSells = (data?.topSells ?? []) as Array<{
    institution: string;
    shares: number;
    value: number;
    changePct: number;
  }>;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="w-1 h-3 bg-teal-400" />
        <span className="text-[9px] font-black font-mono uppercase tracking-wider text-teal-400">
          {tr(t, 'panelInstitutionalOwnership', 'Institutional Ownership')}
        </span>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* ── Section 1: Top Holders ── */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-white/30">
              {tr(t, 'ioTopHolders', 'Top Holders')}
            </span>
          </div>

          {/* Table header */}
          <div className="flex items-center px-3 py-0.5 border-b border-border/20 bg-[#030303] text-[7px] font-mono text-white/30 uppercase tracking-wider">
            <span className="flex-1 min-w-0">Institution</span>
            <span className="w-[64px] text-right shrink-0">Shares</span>
            <span className="w-[64px] text-right shrink-0">Value</span>
            <span className="w-[48px] text-right shrink-0">% Port</span>
            <span className="w-[48px] text-right shrink-0">% Out</span>
            <span className="w-[56px] text-right shrink-0">Change</span>
          </div>

          {/* Rows */}
          {topHolders.map((holder, i) => (
            <div
              key={holder.institution + '-' + i}
              className="flex items-center px-3 py-1 border-b border-border/20 hover:bg-teal-400/[0.02] transition-colors"
            >
              <span className="flex-1 min-w-0 text-white/70 truncate pr-2">
                <span className="text-teal-400/60 mr-1">{i + 1}.</span>
                {holder.institution}
              </span>
              <span className="w-[64px] text-right text-white/50 tabular-nums shrink-0">
                {fmtNumber(holder.shares)}
              </span>
              <span className="w-[64px] text-right text-white/50 tabular-nums shrink-0">
                {fmtValue(holder.value)}
              </span>
              <span className="w-[48px] text-right text-white/50 tabular-nums shrink-0">
                {fmtPct(holder.portfolioPct)}
              </span>
              <span className="w-[48px] text-right text-teal-400 font-bold tabular-nums shrink-0">
                {fmtPct(holder.outstandingPct)}
              </span>
              <span
                className={`w-[56px] text-right tabular-nums font-bold shrink-0 ${changeColor(holder.change)}`}
              >
                {changePrefix(holder.change)}{fmtPct(holder.change)}
              </span>
            </div>
          ))}
        </div>

        {/* ── Section 2: Ownership Summary ── */}
        {summary && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
              <span className="text-[8px] font-black font-mono uppercase tracking-wider text-white/30">
                {tr(t, 'ioSummary', 'Ownership Summary')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-0 divide-x divide-border/20">
              <div className="px-3 py-2 text-center">
                <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5">
                  Institutional %
                </div>
                <div className="text-[12px] font-bold text-teal-400 tabular-nums">
                  {fmtPct(summary.institutionalPct)}
                </div>
              </div>
              <div className="px-3 py-2 text-center">
                <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5">
                  # Institutions
                </div>
                <div className="text-[12px] font-bold text-white/80 tabular-nums">
                  {summary.totalInstitutions.toLocaleString()}
                </div>
              </div>
              <div className="px-3 py-2 text-center">
                <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5">
                  Activity
                </div>
                <div className="flex items-center justify-center gap-2 text-[8px] font-mono">
                  <span className="text-emerald-400">+{summary.newPositions} new</span>
                  <span className="text-white/20">|</span>
                  <span className="text-red-400">-{summary.soldOutPositions} sold</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-3 py-1 border-t border-border/20 text-[7px] font-mono text-white/30">
              <span>
                Increased:{' '}
                <span className="text-emerald-400 font-bold">{summary.increasedPositions}</span>
              </span>
              <span>
                Decreased:{' '}
                <span className="text-red-400 font-bold">{summary.decreasedPositions}</span>
              </span>
            </div>
          </div>
        )}

        {/* ── Section 3: Quarterly Trend ── */}
        {quarterlyTrend.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
              <span className="text-[8px] font-black font-mono uppercase tracking-wider text-white/30">
                {tr(t, 'ioQuarterlyTrend', 'Quarterly Trend')}
              </span>
            </div>

            {/* Table header */}
            <div className="flex items-center px-3 py-0.5 border-b border-border/20 bg-[#030303] text-[7px] font-mono text-white/30 uppercase tracking-wider">
              <span className="w-[56px] shrink-0">Quarter</span>
              <span className="flex-1 text-right">Total Shares</span>
              <span className="flex-1 text-right">Total Value</span>
              <span className="w-[64px] text-right shrink-0">Institutions</span>
            </div>

            {quarterlyTrend.map((q, i) => {
              const prev = quarterlyTrend[i + 1];
              const sharesDelta = prev ? q.totalShares - prev.totalShares : 0;
              return (
                <div
                  key={q.quarter + '-' + i}
                  className="flex items-center px-3 py-1 border-b border-border/20 hover:bg-teal-400/[0.02] transition-colors"
                >
                  <span className="w-[56px] shrink-0 text-teal-400 font-bold">{q.quarter}</span>
                  <span className="flex-1 text-right text-white/60 tabular-nums">
                    {fmtNumber(q.totalShares)}
                    {prev && (
                      <span className={`ml-1 text-[7px] ${changeColor(sharesDelta)}`}>
                        {changePrefix(sharesDelta)}{fmtNumber(sharesDelta)}
                      </span>
                    )}
                  </span>
                  <span className="flex-1 text-right text-white/60 tabular-nums">
                    {fmtValue(q.totalValue)}
                  </span>
                  <span className="w-[64px] text-right text-white/40 tabular-nums shrink-0">
                    {q.institutions.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Section 4: Top Buys / Sells ── */}
        {(topBuys.length > 0 || topSells.length > 0) && (
          <div>
            <div className="flex gap-0 h-full">
              {/* Top Buys */}
              <div className="flex-1 border-r border-border/20">
                <div className="px-3 py-1 border-b border-border/20 bg-emerald-500/[0.03]">
                  <span className="text-[8px] font-black font-mono uppercase tracking-wider text-emerald-400">
                    {tr(t, 'ioTopBuys', 'Top Buys')}
                  </span>
                </div>

                <div className="flex items-center px-3 py-0.5 border-b border-border/20 bg-[#030303] text-[6px] font-mono text-white/25 uppercase tracking-wider">
                  <span className="flex-1">Institution</span>
                  <span className="w-[48px] text-right">Shares</span>
                  <span className="w-[48px] text-right">Value</span>
                  <span className="w-[40px] text-right">Chg</span>
                </div>

                {topBuys.map((entry, i) => (
                  <div
                    key={entry.institution + '-buy-' + i}
                    className="flex items-center px-3 py-1 border-b border-border/20 hover:bg-teal-400/[0.02] transition-colors"
                  >
                    <span className="flex-1 min-w-0 text-[8px] text-white/60 truncate pr-2">
                      {entry.institution}
                    </span>
                    <span className="w-[48px] text-right text-[8px] text-white/50 tabular-nums">
                      {fmtNumber(entry.shares)}
                    </span>
                    <span className="w-[48px] text-right text-[8px] text-emerald-400 tabular-nums font-bold">
                      {fmtValue(entry.value)}
                    </span>
                    <span className="w-[40px] text-right text-[8px] text-emerald-400 tabular-nums">
                      +{fmtPct(entry.changePct)}
                    </span>
                  </div>
                ))}

                {topBuys.length === 0 && (
                  <div className="px-3 py-3 text-center text-[8px] text-white/20 uppercase">
                    No data
                  </div>
                )}
              </div>

              {/* Top Sells */}
              <div className="flex-1">
                <div className="px-3 py-1 border-b border-border/20 bg-red-500/[0.03]">
                  <span className="text-[8px] font-black font-mono uppercase tracking-wider text-red-400">
                    {tr(t, 'ioTopSells', 'Top Sells')}
                  </span>
                </div>

                <div className="flex items-center px-3 py-0.5 border-b border-border/20 bg-[#030303] text-[6px] font-mono text-white/25 uppercase tracking-wider">
                  <span className="flex-1">Institution</span>
                  <span className="w-[48px] text-right">Shares</span>
                  <span className="w-[48px] text-right">Value</span>
                  <span className="w-[40px] text-right">Chg</span>
                </div>

                {topSells.map((entry, i) => (
                  <div
                    key={entry.institution + '-sell-' + i}
                    className="flex items-center px-3 py-1 border-b border-border/20 hover:bg-teal-400/[0.02] transition-colors"
                  >
                    <span className="flex-1 min-w-0 text-[8px] text-white/60 truncate pr-2">
                      {entry.institution}
                    </span>
                    <span className="w-[48px] text-right text-[8px] text-white/50 tabular-nums">
                      {fmtNumber(entry.shares)}
                    </span>
                    <span className="w-[48px] text-right text-[8px] text-red-400 tabular-nums font-bold">
                      {fmtValue(entry.value)}
                    </span>
                    <span className="w-[40px] text-right text-[8px] text-red-400 tabular-nums">
                      -{fmtPct(Math.abs(entry.changePct))}
                    </span>
                  </div>
                ))}

                {topSells.length === 0 && (
                  <div className="px-3 py-3 text-center text-[8px] text-white/20 uppercase">
                    No data
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
