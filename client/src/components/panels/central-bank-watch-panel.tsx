import { Loader2 } from 'lucide-react';
import { useCentralBankWatch } from '../../api/hooks/use-central-bank-watch';
import { useT } from '../../i18n';

// -- Formatting helpers --

function fmtRate(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(3)}%`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(1)}%`;
}

function fmtTrillion(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(2)}T`;
}

function fmtSignedPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

// -- Color helpers --

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-zinc-400';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-zinc-400';
}

function stanceColor(stance: string | null | undefined): string {
  const s = (stance ?? '').toLowerCase();
  if (s.includes('hawkish')) return 'text-red-400';
  if (s.includes('dovish')) return 'text-green-400';
  return 'text-zinc-400';
}

function stanceBg(stance: string | null | undefined): string {
  const s = (stance ?? '').toLowerCase();
  if (s.includes('hawkish')) return 'bg-red-500/10 border-red-500/30';
  if (s.includes('dovish')) return 'bg-green-500/10 border-green-500/30';
  return 'bg-zinc-500/10 border-zinc-500/30';
}

function rateDirectionArrow(current: number | null | undefined, target: number | null | undefined): string {
  if (current == null || target == null) return '';
  if (target > current) return ' \u2191';
  if (target < current) return ' \u2193';
  return ' \u2192';
}

function rateDirectionColor(current: number | null | undefined, target: number | null | undefined): string {
  if (current == null || target == null) return 'text-white/60';
  if (target > current) return 'text-red-400';
  if (target < current) return 'text-green-400';
  return 'text-zinc-400';
}

export function CentralBankWatchPanel() {
  const { data, isLoading, error } = useCentralBankWatch();
  const _t = useT();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          Failed to load central bank data
        </div>
      </div>
    );
  }

  const summary = data.marketSummary;
  const rateDecisions: any[] = data.rateDecisions ?? [];
  const forwardGuidance: any[] = data.forwardGuidance ?? [];
  const ratePaths: any[] = data.ratePaths ?? [];
  const balanceSheets: any[] = data.balanceSheets ?? [];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Market Summary Bar */}
      {summary && (
        <div className="grid grid-cols-5 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Global Avg Rate</div>
            <div className="text-[11px] font-mono font-black text-yellow-400">{fmtRate(summary.globalAvgRate)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Net Hawkish</div>
            <div className={`text-[11px] font-mono font-black ${(summary.netHawkishCount ?? 0) > 0 ? 'text-red-400' : (summary.netHawkishCount ?? 0) < 0 ? 'text-green-400' : 'text-zinc-400'}`}>
              {summary.netHawkishCount ?? 0}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Next Decision</div>
            <div className="text-[11px] font-mono font-black text-white/80">{summary.nextDecisionBank ?? '-'}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Total Assets</div>
            <div className="text-[11px] font-mono font-black text-white/60">{fmtTrillion(summary.totalAssetsGlobal)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Dominant Theme</div>
            <div className="text-[11px] font-mono font-black text-yellow-400 truncate">{summary.dominantTheme ?? '-'}</div>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* Rate Decisions */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-yellow-400 uppercase tracking-wider">Rate Decisions</span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Bank</th>
                <th className="px-2 py-1.5 text-right font-bold">Current</th>
                <th className="px-2 py-1.5 text-right font-bold">Expected</th>
                <th className="px-2 py-1.5 text-right font-bold">Hold</th>
                <th className="px-2 py-1.5 text-right font-bold">Hike</th>
                <th className="px-2 py-1.5 text-right font-bold">Cut</th>
                <th className="px-2 py-1.5 text-right font-bold">Next Meeting</th>
                <th className="px-2 py-1.5 text-right font-bold">Last Action</th>
                <th className="px-2 py-1.5 text-right font-bold">Date</th>
              </tr>
            </thead>
            <tbody>
              {rateDecisions.map((r: any, i: number) => (
                <tr key={r.bank ?? i} className="border-b border-border/10 hover:bg-yellow-400/[0.02]">
                  <td className="px-2 py-1.5 font-bold text-yellow-400">{r.bank}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtRate(r.currentRate)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${rateDirectionColor(r.currentRate, r.expectedRate)}`}>
                    {fmtRate(r.expectedRate)}{rateDirectionArrow(r.currentRate, r.expectedRate)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{fmtPct(r.holdProb)}</td>
                  <td className="px-2 py-1.5 text-right text-red-400">{fmtPct(r.hikeProb)}</td>
                  <td className="px-2 py-1.5 text-right text-green-400">{fmtPct(r.cutProb)}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{r.nextMeeting ?? '-'}</td>
                  <td className="px-2 py-1.5 text-right text-white/40">{r.lastAction ?? '-'}</td>
                  <td className="px-2 py-1.5 text-right text-white/30">{r.lastActionDate ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Forward Guidance */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-yellow-400 uppercase tracking-wider">Forward Guidance</span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Bank</th>
                <th className="px-2 py-1.5 text-left font-bold">Stance</th>
                <th className="px-2 py-1.5 text-left font-bold">Signal</th>
                <th className="px-2 py-1.5 text-right font-bold">Confidence</th>
                <th className="px-2 py-1.5 text-right font-bold">Mkt Pricing</th>
                <th className="px-2 py-1.5 text-right font-bold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {forwardGuidance.map((g: any, i: number) => (
                <tr key={g.bank ?? i} className="border-b border-border/10 hover:bg-yellow-400/[0.02]">
                  <td className="px-2 py-1.5 font-bold text-yellow-400">{g.bank}</td>
                  <td className="px-2 py-1.5">
                    <span className={`text-[7px] font-mono font-black px-1 py-px uppercase border ${stanceColor(g.stance)} ${stanceBg(g.stance)}`}>
                      {g.stance ?? '-'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-white/60 max-w-[140px] truncate">{g.signal ?? '-'}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{fmtPct(g.confidence)}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{g.marketPricing ?? '-'}</td>
                  <td className="px-2 py-1.5 text-right text-white/30">{g.lastUpdated ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rate Paths */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-yellow-400 uppercase tracking-wider">Rate Paths</span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Bank</th>
                <th className="px-2 py-1.5 text-right font-bold">Current</th>
                <th className="px-2 py-1.5 text-right font-bold">+3M</th>
                <th className="px-2 py-1.5 text-right font-bold">+6M</th>
                <th className="px-2 py-1.5 text-right font-bold">+12M</th>
                <th className="px-2 py-1.5 text-right font-bold">+24M</th>
                <th className="px-2 py-1.5 text-right font-bold">Terminal</th>
                <th className="px-2 py-1.5 text-right font-bold">Terminal Date</th>
              </tr>
            </thead>
            <tbody>
              {ratePaths.map((p: any, i: number) => {
                const current = p.current;
                return (
                  <tr key={p.bank ?? i} className="border-b border-border/10 hover:bg-yellow-400/[0.02]">
                    <td className="px-2 py-1.5 font-bold text-yellow-400">{p.bank}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtRate(current)}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${rateDirectionColor(current, p['+3m'] ?? p.plus3m)}`}>
                      {fmtRate(p['+3m'] ?? p.plus3m)}{rateDirectionArrow(current, p['+3m'] ?? p.plus3m)}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${rateDirectionColor(current, p['+6m'] ?? p.plus6m)}`}>
                      {fmtRate(p['+6m'] ?? p.plus6m)}{rateDirectionArrow(current, p['+6m'] ?? p.plus6m)}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${rateDirectionColor(current, p['+12m'] ?? p.plus12m)}`}>
                      {fmtRate(p['+12m'] ?? p.plus12m)}{rateDirectionArrow(current, p['+12m'] ?? p.plus12m)}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${rateDirectionColor(current, p['+24m'] ?? p.plus24m)}`}>
                      {fmtRate(p['+24m'] ?? p.plus24m)}{rateDirectionArrow(current, p['+24m'] ?? p.plus24m)}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${rateDirectionColor(current, p.terminalRate)}`}>
                      {fmtRate(p.terminalRate)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/30">{p.terminalDate ?? '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Balance Sheets */}
        <div>
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-yellow-400 uppercase tracking-wider">Balance Sheets</span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Bank</th>
                <th className="px-2 py-1.5 text-right font-bold">Total Assets</th>
                <th className="px-2 py-1.5 text-right font-bold">MoM Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">QoQ Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">Govt Bonds</th>
                <th className="px-2 py-1.5 text-right font-bold">% GDP</th>
              </tr>
            </thead>
            <tbody>
              {balanceSheets.map((b: any, i: number) => (
                <tr key={b.bank ?? i} className="border-b border-border/10 hover:bg-yellow-400/[0.02]">
                  <td className="px-2 py-1.5 font-bold text-yellow-400">{b.bank}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtTrillion(b.totalAssets)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(b.monthlyChange)}`}>
                    {fmtSignedPct(b.monthlyChange)}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(b.qoqChange)}`}>
                    {fmtSignedPct(b.qoqChange)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{fmtTrillion(b.govtBonds)}</td>
                  <td className="px-2 py-1.5 text-right text-white/40">{fmtPct(b.percentGDP)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
