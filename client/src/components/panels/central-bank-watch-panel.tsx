import { useCentralBankWatch } from '../../api/hooks/use-central-bank-watch';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Format helpers ──

function fmtRate(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${Math.round(n)}bp`;
}

function fmtTrillions(n: number): string {
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

function fmtDate(d: string): string {
  if (!d) return '--';
  const date = new Date(d);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${m}/${day}`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function directionArrow(dir: string): { arrow: string; color: string } {
  if (dir === 'hike' || dir === 'up') return { arrow: '\u25B2', color: 'text-red-400' };
  if (dir === 'cut' || dir === 'down') return { arrow: '\u25BC', color: 'text-green-400' };
  return { arrow: '\u25C6', color: 'text-yellow-400' };
}

function divergenceArrow(dir: string): { arrow: string; color: string } {
  if (dir === 'widening') return { arrow: '\u2191', color: 'text-red-400' };
  if (dir === 'narrowing') return { arrow: '\u2193', color: 'text-green-400' };
  return { arrow: '\u2194', color: 'text-yellow-400' };
}

function hawkDoveColor(score: number): string {
  if (score >= 0.5) return 'bg-red-500';
  if (score >= 0.2) return 'bg-red-400/70';
  if (score > -0.2) return 'bg-yellow-400/70';
  if (score > -0.5) return 'bg-green-400/70';
  return 'bg-green-500';
}

function hawkDoveText(score: number): string {
  if (score >= 0.5) return 'text-red-400';
  if (score >= 0.2) return 'text-red-300';
  if (score > -0.2) return 'text-yellow-400';
  if (score > -0.5) return 'text-green-300';
  return 'text-green-400';
}

function hawkDoveLabel(score: number): string {
  if (score >= 0.5) return 'HAWKISH';
  if (score >= 0.2) return 'LEAN HAWK';
  if (score > -0.2) return 'NEUTRAL';
  if (score > -0.5) return 'LEAN DOVE';
  return 'DOVISH';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/15 bg-[#030303]">
      <div className="w-1 h-1 shrink-0 bg-sky-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-sky-400">
        {title}
      </span>
    </div>
  );
}

// ── Section 1: Rate Decisions ──

function RateDecisions({ banks }: { banks: any[] }) {
  if (!banks || banks.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Rate Decisions" />
      {/* Column headers */}
      <div className="grid grid-cols-[1.4fr_0.7fr_0.5fr_0.7fr_0.7fr_1.6fr_0.6fr] gap-px px-2 py-1 border-b border-border/15 text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">
        <span>Central Bank</span>
        <span className="text-right">Rate</span>
        <span className="text-center">Chg</span>
        <span className="text-right">Next Mtg</span>
        <span className="text-right">Implied</span>
        <span className="text-center">Hike / Hold / Cut</span>
        <span className="text-right">YTD</span>
      </div>

      {banks.map((bank: any, i: number) => {
        const dir = directionArrow(bank.lastChangeDirection ?? 'hold');
        const hikeP = bank.hikeProb ?? 0;
        const holdP = bank.holdProb ?? 0;
        const cutP = bank.cutProb ?? 0;
        const totalP = hikeP + holdP + cutP || 1;

        return (
          <div
            key={bank.name ?? i}
            className={`grid grid-cols-[1.4fr_0.7fr_0.5fr_0.7fr_0.7fr_1.6fr_0.6fr] gap-px px-2 py-1.5 border-b border-border/10 hover:bg-sky-400/[0.02] ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            {/* Name */}
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[8px] font-mono font-bold text-white truncate">
                {bank.code ?? bank.name}
              </span>
              {bank.currency && (
                <span className="text-[6px] font-mono text-neutral-600 shrink-0">
                  {bank.currency}
                </span>
              )}
            </div>

            {/* Current rate */}
            <span className="text-[11px] font-mono font-black text-sky-400 text-right tabular-nums">
              {fmtRate(bank.currentRate ?? 0)}
            </span>

            {/* Last change direction */}
            <span className={`text-[9px] font-mono text-center ${dir.color}`}>
              {dir.arrow}
            </span>

            {/* Next meeting */}
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtDate(bank.nextMeeting)}
            </span>

            {/* Implied rate */}
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
              {bank.impliedRate != null ? fmtRate(bank.impliedRate) : '--'}
            </span>

            {/* Probability bars */}
            <div className="flex items-center gap-0.5">
              <div className="flex-1 h-3 flex overflow-hidden bg-neutral-900">
                {hikeP > 0 && (
                  <div
                    className="h-full bg-red-500/80 relative group"
                    style={{ width: `${(hikeP / totalP) * 100}%` }}
                  >
                    {hikeP >= 15 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[6px] font-mono font-bold text-white">
                        {Math.round(hikeP)}
                      </span>
                    )}
                  </div>
                )}
                {holdP > 0 && (
                  <div
                    className="h-full bg-yellow-500/70 relative"
                    style={{ width: `${(holdP / totalP) * 100}%` }}
                  >
                    {holdP >= 15 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[6px] font-mono font-bold text-black/70">
                        {Math.round(holdP)}
                      </span>
                    )}
                  </div>
                )}
                {cutP > 0 && (
                  <div
                    className="h-full bg-green-500/80 relative"
                    style={{ width: `${(cutP / totalP) * 100}%` }}
                  >
                    {cutP >= 15 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[6px] font-mono font-bold text-white">
                        {Math.round(cutP)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* YTD change */}
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${changeColor(bank.ytdChange ?? 0)}`}>
              {bank.ytdChange != null ? fmtBps(bank.ytdChange) : '--'}
            </span>
          </div>
        );
      })}

      {/* Probability legend */}
      <div className="flex items-center gap-3 px-2 py-0.5 border-b border-border/10">
        <div className="flex items-center gap-1">
          <div className="w-2 h-1.5 bg-red-500/80" />
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Hike</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-1.5 bg-yellow-500/70" />
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Hold</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-1.5 bg-green-500/80" />
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Cut</span>
        </div>
      </div>
    </div>
  );
}

// ── Section 2: Rate Path ──

function RatePath({ paths }: { paths: any[] }) {
  if (!paths || paths.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Implied Rate Path" />
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {paths.map((path: any, idx: number) => (
          <div key={path.bank ?? idx} className="bg-black">
            {/* Bank label */}
            <div className="px-2 py-1 border-b border-border/15">
              <span className="text-[8px] font-mono font-black text-sky-300 uppercase tracking-wider">
                {path.bank}
              </span>
              {path.currentRate != null && (
                <span className="text-[7px] font-mono text-neutral-500 ml-1.5">
                  Now: {fmtRate(path.currentRate)}
                </span>
              )}
            </div>

            {/* Meeting dates + implied rates */}
            {(path.meetings ?? []).slice(0, 6).map((mtg: any, i: number) => {
              const chg = mtg.change ?? (mtg.impliedRate != null && path.currentRate != null
                ? (mtg.impliedRate - path.currentRate) * 100
                : null);

              return (
                <div
                  key={mtg.date ?? i}
                  className={`grid grid-cols-[1fr_0.8fr_0.8fr] px-2 py-0.5 border-b border-border/5 hover:bg-sky-400/[0.02] ${
                    i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
                  }`}
                >
                  <span className="text-[7px] font-mono text-neutral-500 tabular-nums">
                    {fmtDate(mtg.date)}
                  </span>
                  <span className="text-[8px] font-mono font-bold text-white text-right tabular-nums">
                    {mtg.impliedRate != null ? fmtRate(mtg.impliedRate) : '--'}
                  </span>
                  <span className={`text-[7px] font-mono font-bold text-right tabular-nums ${
                    chg != null ? changeColor(chg) : 'text-neutral-600'
                  }`}>
                    {chg != null ? fmtBps(chg) : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 3: Balance Sheets ──

function BalanceSheets({ sheets }: { sheets: any[] }) {
  if (!sheets || sheets.length === 0) return null;

  const maxAssets = Math.max(...sheets.map((s: any) => s.totalAssets ?? 0), 1);

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Balance Sheets" />
      <div className="grid grid-cols-[1fr_1.2fr_0.8fr_0.6fr_0.8fr] gap-px px-2 py-1 border-b border-border/15 text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">
        <span>Bank</span>
        <span className="text-right">Total Assets</span>
        <span className="text-right">Mo. Chg</span>
        <span className="text-right">% GDP</span>
        <span className="text-right">From Peak</span>
      </div>

      {sheets.map((sheet: any, i: number) => {
        const barWidth = ((sheet.totalAssets ?? 0) / maxAssets) * 100;
        const barColor = sheet.bank === 'FED' ? 'bg-sky-500/30'
          : sheet.bank === 'ECB' ? 'bg-blue-500/30'
          : 'bg-purple-500/30';

        return (
          <div
            key={sheet.bank ?? i}
            className={`relative border-b border-border/10 hover:bg-sky-400/[0.02] ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            {/* Relative size bar (background) */}
            <div
              className={`absolute inset-y-0 left-0 ${barColor}`}
              style={{ width: `${barWidth}%` }}
            />

            <div className="relative z-10 grid grid-cols-[1fr_1.2fr_0.8fr_0.6fr_0.8fr] gap-px px-2 py-1.5">
              <span className="text-[9px] font-mono font-black text-white">{sheet.bank}</span>
              <span className="text-[9px] font-mono font-bold text-sky-300 text-right tabular-nums">
                {sheet.totalAssets != null ? fmtTrillions(sheet.totalAssets) : '--'}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${
                changeColor(sheet.monthlyChange ?? 0)
              }`}>
                {sheet.monthlyChange != null ? fmtTrillions(sheet.monthlyChange) : '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
                {sheet.pctOfGdp != null ? `${sheet.pctOfGdp.toFixed(0)}%` : '--'}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${
                (sheet.drawdownFromPeak ?? 0) < 0 ? 'text-red-400' : 'text-neutral-500'
              }`}>
                {sheet.drawdownFromPeak != null ? fmtPct(sheet.drawdownFromPeak) : '--'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 4: Policy Divergence ──

function PolicyDivergence({ pairs }: { pairs: any[] }) {
  if (!pairs || pairs.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Policy Divergence" />
      <div className="grid grid-cols-[1.2fr_0.8fr_0.5fr_0.8fr_1fr] gap-px px-2 py-1 border-b border-border/15 text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">
        <span>Pair</span>
        <span className="text-right">Spread</span>
        <span className="text-center">Dir</span>
        <span className="text-right">Chg 3M</span>
        <span className="text-right">FX Impact</span>
      </div>

      {pairs.map((pair: any, i: number) => {
        const dv = divergenceArrow(pair.direction ?? 'stable');

        return (
          <div
            key={pair.pair ?? i}
            className={`grid grid-cols-[1.2fr_0.8fr_0.5fr_0.8fr_1fr] gap-px px-2 py-1.5 border-b border-border/10 hover:bg-sky-400/[0.02] ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{pair.pair}</span>
            <span className="text-[9px] font-mono font-bold text-sky-300 text-right tabular-nums">
              {pair.spread != null ? fmtBps(pair.spread) : '--'}
            </span>
            <span className={`text-[9px] font-mono text-center ${dv.color}`}>
              {dv.arrow}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${
              changeColor(pair.change3m ?? 0)
            }`}>
              {pair.change3m != null ? fmtBps(pair.change3m) : '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right truncate">
              {pair.fxImpact ?? '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 5: Recent Statements ──

function RecentStatements({ statements }: { statements: any[] }) {
  if (!statements || statements.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Recent Statements" />

      {statements.map((stmt: any, i: number) => {
        const score = stmt.hawkishScore ?? 0;
        const scoreColor = hawkDoveColor(score);
        const scoreText = hawkDoveText(score);
        const label = hawkDoveLabel(score);

        return (
          <div
            key={stmt.date ?? i}
            className={`px-2 py-1.5 border-b border-border/10 hover:bg-sky-400/[0.02] ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[8px] font-mono font-black text-white shrink-0">
                  {stmt.bank ?? stmt.speaker}
                </span>
                <span className="text-[7px] font-mono text-neutral-500 tabular-nums shrink-0">
                  {fmtDate(stmt.date)}
                </span>
                {stmt.speaker && stmt.bank && (
                  <span className="text-[7px] font-mono text-neutral-600 truncate">
                    {stmt.speaker}
                  </span>
                )}
              </div>

              {/* Hawk-Dove indicator */}
              <div className="flex items-center gap-1 shrink-0">
                <div className={`w-8 h-1.5 ${scoreColor}`} style={{ opacity: 0.8 + Math.abs(score) * 0.2 }} />
                <span className={`text-[7px] font-mono font-black uppercase tracking-wider ${scoreText}`}>
                  {label}
                </span>
              </div>
            </div>

            {/* Key phrase */}
            {stmt.keyPhrase && (
              <div className="text-[7px] font-mono text-neutral-400 leading-tight truncate mb-0.5">
                &quot;{stmt.keyPhrase}&quot;
              </div>
            )}

            {/* Market reaction */}
            {stmt.marketReaction && (
              <div className="flex items-center gap-1">
                <span className="text-[6px] font-mono text-neutral-600 uppercase">Mkt:</span>
                <span className="text-[7px] font-mono text-neutral-400">
                  {stmt.marketReaction}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function CentralBankWatchPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useCentralBankWatch();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-sky-400">
            {tr(t, 'panelCentralBankWatch', 'Central Bank Watch')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-600 hover:text-sky-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !d && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-sky-400 uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </span>
        </div>
      )}

      {/* Error */}
      {error && !d && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-red-400 uppercase">
            FAILED TO LOAD
          </span>
        </div>
      )}

      {/* No data */}
      {!d && !isLoading && !error && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            No data
          </span>
        </div>
      )}

      {/* Content */}
      {d && (
        <div className="flex-1 overflow-auto no-scrollbar">
          <RateDecisions banks={d.banks ?? d.rateDecisions ?? []} />
          <RatePath paths={d.ratePaths ?? d.ratePath ?? []} />
          <BalanceSheets sheets={d.balanceSheets ?? []} />
          <PolicyDivergence pairs={d.policyDivergence ?? d.divergence ?? []} />
          <RecentStatements statements={d.recentStatements ?? d.statements ?? []} />

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
