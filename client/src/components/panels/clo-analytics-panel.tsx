import { Loader2 } from 'lucide-react';
import { useCloAnalytics } from '../../api/hooks/use-clo-analytics';
import { useT } from '../../i18n';

type TFn = ReturnType<typeof useT>;
const tr = (_t: TFn, _key: string, fallback: string): string => {
  try { return (_t as (k: string) => string)(_key) || fallback; } catch { return fallback; }
};

const ACCENT = '#34d399'; // emerald-400

// ── Formatting helpers ──

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtBp(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(0);
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(decimals)}%`;
}

function fmtDollarB(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `$${n.toFixed(1)}B`;
}

function fmtChange(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}`;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';   // spread widening = negative
  if (n < 0) return 'text-green-400'; // spread tightening = positive
  return 'text-neutral-500';
}

function cushionColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendBadge(trend: string | null | undefined): { text: string; cls: string } {
  const t = trend?.toLowerCase() ?? '';
  if (t === 'improving') return { text: 'IMPROVING', cls: 'text-green-400 bg-green-500/15 border-green-500/30' };
  if (t === 'stable') return { text: 'STABLE', cls: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' };
  if (t === 'deteriorating') return { text: 'DETER.', cls: 'text-red-400 bg-red-500/15 border-red-500/30' };
  if (t === 'tightening') return { text: 'TIGHTEN', cls: 'text-green-400 bg-green-500/15 border-green-500/30' };
  if (t === 'widening') return { text: 'WIDEN', cls: 'text-red-400 bg-red-500/15 border-red-500/30' };
  return { text: (trend ?? '-').toUpperCase(), cls: 'text-neutral-500 bg-neutral-500/10 border-neutral-500/20' };
}

function passFailBadge(status: string | null | undefined): { text: string; cls: string } {
  const s = status?.toLowerCase() ?? '';
  if (s === 'pass') return { text: 'PASS', cls: 'text-green-400 bg-green-500/15 border-green-500/30' };
  if (s === 'warning') return { text: 'WARN', cls: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' };
  if (s === 'fail') return { text: 'FAIL', cls: 'text-red-400 bg-red-500/15 border-red-500/30' };
  return { text: (status ?? '-').toUpperCase(), cls: 'text-neutral-500 bg-neutral-500/10 border-neutral-500/20' };
}

// ── Main Panel ──

export function CloAnalyticsPanel() {
  const t = useT();
  const { data, isLoading, error } = useCloAnalytics();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'error.loadFailed', 'Failed to load CLO analytics data')}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Market Summary Bar */}
      {data.marketSummary && (
        <div className="flex items-center gap-0 border-b border-border/20 px-3 py-2 shrink-0">
          <SummaryItem label="Total Issuance YTD" value={fmtDollarB(data.marketSummary.totalIssuanceYTD)} />
          <SummaryItem label="New Deal Volume" value={fmtDollarB(data.marketSummary.newDealVolume)} />
          <SummaryItem
            label="Avg AAA Spread"
            value={`${fmtBp(data.marketSummary.avgAAA_spread)} bp`}
            color={ACCENT}
          />
          <SummaryItem
            label="Avg Equity IRR"
            value={fmtPct(data.marketSummary.avgEquityIRR)}
            color={ACCENT}
          />
          <SummaryItem
            label="CCC Bucket Avg"
            value={fmtPct(data.marketSummary.cccBucketAvg)}
          />
          <SummaryItem
            label="Managers"
            value={String(data.marketSummary.managerCount ?? '-')}
          />
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* Tranche Spreads Table */}
        {data.trancheSpreads && data.trancheSpreads.length > 0 && (
          <div>
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                Tranche Spreads
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-border/20 text-neutral-500">
                  <th className="text-left px-3 py-1 font-normal">Tranche</th>
                  <th className="text-right px-2 py-1 font-normal">Spread (bp)</th>
                  <th className="text-right px-2 py-1 font-normal">Change</th>
                  <th className="text-right px-2 py-1 font-normal">Week Chg</th>
                  <th className="text-right px-2 py-1 font-normal">New Issue DM</th>
                  <th className="text-right px-2 py-1 font-normal">Secondary DM</th>
                  <th className="text-right px-2 py-1 font-normal">Bid-Ask</th>
                  <th className="text-right px-3 py-1 font-normal">WAL</th>
                </tr>
              </thead>
              <tbody>
                {data.trancheSpreads.map((row: Record<string, unknown>, i: number) => (
                  <tr
                    key={i}
                    className="border-b border-border/[0.06] hover:bg-emerald-400/[0.02] transition-colors"
                  >
                    <td className="px-3 py-1 text-white font-bold">{String(row.tranche ?? '-')}</td>
                    <td className="text-right px-2 py-1 text-white">{fmtBp(row.spread as number)}</td>
                    <td className={`text-right px-2 py-1 font-bold ${changeColor(row.change as number)}`}>
                      {fmtChange(row.change as number)}
                    </td>
                    <td className={`text-right px-2 py-1 ${changeColor(row.weekChange as number)}`}>
                      {fmtChange(row.weekChange as number)}
                    </td>
                    <td className="text-right px-2 py-1 text-neutral-400">{fmtBp(row.newIssueDM as number)}</td>
                    <td className="text-right px-2 py-1 text-neutral-400">{fmtBp(row.secondaryDM as number)}</td>
                    <td className="text-right px-2 py-1 text-neutral-500">{fmtBp(row.bidAskSpread as number)}</td>
                    <td className="text-right px-3 py-1 text-neutral-400">{fmtNum(row.weightedAvgLife as number, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Manager Rankings Table */}
        {data.managerRankings && data.managerRankings.length > 0 && (
          <div>
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                Manager Rankings
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-border/20 text-neutral-500">
                  <th className="text-left px-3 py-1 font-normal">Manager</th>
                  <th className="text-right px-2 py-1 font-normal">AUM ($B)</th>
                  <th className="text-right px-2 py-1 font-normal">Deals</th>
                  <th className="text-right px-2 py-1 font-normal">Avg WARS</th>
                  <th className="text-right px-2 py-1 font-normal">Avg OC%</th>
                  <th className="text-right px-2 py-1 font-normal">Avg IC%</th>
                  <th className="text-right px-2 py-1 font-normal">Default%</th>
                  <th className="text-right px-3 py-1 font-normal">Ann. Ret%</th>
                </tr>
              </thead>
              <tbody>
                {data.managerRankings.map((row: Record<string, unknown>, i: number) => (
                  <tr
                    key={i}
                    className="border-b border-border/[0.06] hover:bg-emerald-400/[0.02] transition-colors"
                  >
                    <td className="px-3 py-1 text-white font-bold truncate max-w-[140px]">{String(row.manager ?? '-')}</td>
                    <td className="text-right px-2 py-1 text-white">{fmtNum(row.aum as number, 1)}</td>
                    <td className="text-right px-2 py-1 text-neutral-400">{row.dealsActive != null ? String(row.dealsActive) : '-'}</td>
                    <td className="text-right px-2 py-1 text-neutral-400">{fmtNum(row.avgWARS as number)}</td>
                    <td className="text-right px-2 py-1 text-neutral-400">{fmtPct(row.avgOC as number)}</td>
                    <td className="text-right px-2 py-1 text-neutral-400">{fmtPct(row.avgIC as number)}</td>
                    <td className={`text-right px-2 py-1 ${(row.defaultRate as number) > 2 ? 'text-red-400' : 'text-neutral-400'}`}>
                      {fmtPct(row.defaultRate as number)}
                    </td>
                    <td className={`text-right px-3 py-1 font-bold ${(row.annualizedReturn as number) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmtPct(row.annualizedReturn as number)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Collateral Quality Table */}
        {data.collateralQuality && data.collateralQuality.length > 0 && (
          <div>
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                Collateral Quality
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-border/20 text-neutral-500">
                  <th className="text-left px-3 py-1 font-normal">Metric</th>
                  <th className="text-right px-2 py-1 font-normal">Current</th>
                  <th className="text-right px-2 py-1 font-normal">Limit</th>
                  <th className="text-right px-2 py-1 font-normal">Cushion</th>
                  <th className="text-center px-2 py-1 font-normal">Trend</th>
                  <th className="text-right px-3 py-1 font-normal">Percentile</th>
                </tr>
              </thead>
              <tbody>
                {data.collateralQuality.map((row: Record<string, unknown>, i: number) => {
                  const badge = trendBadge(row.trend as string);
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/[0.06] hover:bg-emerald-400/[0.02] transition-colors"
                    >
                      <td className="px-3 py-1 text-white font-bold">{String(row.metric ?? '-')}</td>
                      <td className="text-right px-2 py-1 text-white">{fmtNum(row.currentValue as number)}</td>
                      <td className="text-right px-2 py-1 text-neutral-500">{fmtNum(row.limit as number)}</td>
                      <td className={`text-right px-2 py-1 font-bold ${cushionColor(row.cushion as number)}`}>
                        {fmtNum(row.cushion as number)}
                      </td>
                      <td className="text-center px-2 py-1">
                        <span className={`inline-block px-1.5 py-px text-[7px] font-bold uppercase border ${badge.cls}`}>
                          {badge.text}
                        </span>
                      </td>
                      <td className="text-right px-3 py-1 text-neutral-400">
                        {row.percentile != null ? `${fmtNum(row.percentile as number, 0)}th` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Coverage Tests Table */}
        {data.coverageTests && data.coverageTests.length > 0 && (
          <div>
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                Coverage Tests
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-border/20 text-neutral-500">
                  <th className="text-left px-3 py-1 font-normal">Test</th>
                  <th className="text-right px-2 py-1 font-normal">Current</th>
                  <th className="text-right px-2 py-1 font-normal">Trigger</th>
                  <th className="text-right px-2 py-1 font-normal">Cushion</th>
                  <th className="text-center px-2 py-1 font-normal">Pass/Fail</th>
                  <th className="text-center px-3 py-1 font-normal">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.coverageTests.map((row: Record<string, unknown>, i: number) => {
                  const pfBadge = passFailBadge(row.passFail as string);
                  const tBadge = trendBadge(row.trend as string);
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/[0.06] hover:bg-emerald-400/[0.02] transition-colors"
                    >
                      <td className="px-3 py-1 text-white font-bold">{String(row.test ?? '-')}</td>
                      <td className="text-right px-2 py-1 text-white">{fmtPct(row.currentLevel as number)}</td>
                      <td className="text-right px-2 py-1 text-neutral-500">{fmtPct(row.trigger as number)}</td>
                      <td className={`text-right px-2 py-1 font-bold ${cushionColor(row.cushion as number)}`}>
                        {fmtNum(row.cushion as number)}
                      </td>
                      <td className="text-center px-2 py-1">
                        <span className={`inline-block px-1.5 py-px text-[7px] font-bold uppercase border ${pfBadge.cls}`}>
                          {pfBadge.text}
                        </span>
                      </td>
                      <td className="text-center px-3 py-1">
                        <span className={`inline-block px-1.5 py-px text-[7px] font-bold uppercase border ${tBadge.cls}`}>
                          {tBadge.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Summary Item (for Market Summary bar) ──

function SummaryItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex-1 px-2 py-0.5 border-r border-border/10 last:border-r-0">
      <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider leading-tight">{label}</div>
      <div
        className="text-[10px] font-mono font-bold leading-tight"
        style={color ? { color } : { color: '#fff' }}
      >
        {value}
      </div>
    </div>
  );
}
