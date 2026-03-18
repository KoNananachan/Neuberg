import { useMoneyMarketMonitor } from '../../api/hooks/use-money-market-monitor';
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

// ── Formatting helpers ──

function fmtRate(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2);
}

function fmtRate3(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(3);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtBn(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}T`;
  return `${n.toFixed(1)}B`;
}

function fmtDays(n: number | null | undefined): string {
  if (n == null) return '--';
  return `${n.toFixed(0)}d`;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function MoneyMarketPanel() {
  const t = useT();
  const { data, isLoading, error } = useMoneyMarketMonitor();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-teal-400">
            {tr(t, 'mmTitle', 'Money Market Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.asOfDate && (
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {d.asOfDate}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-teal-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !d && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            FAILED TO LOAD
          </div>
        )}

        {d && (
          <>
            <KeyRatesSection d={d} t={t} />
            <RepoMarketSection d={d} t={t} />
            <CommercialPaperSection d={d} t={t} />
            <TreasuryBillsSection d={d} t={t} />
            <SpreadsSection d={d} t={t} />
            <MoneyMarketFundsSection d={d} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: Key Rates ──

function KeyRatesSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const rates = d?.keyRates ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-teal-400">
          {tr(t, 'mmKeyRates', 'Key Rates')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_60px_50px_50px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mmRate', 'Rate')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmLevel', 'Level %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mm1D', '1D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mm1W', '1W')}
        </span>
      </div>

      {/* Rate rows */}
      {rates.map((r: any) => (
        <div
          key={r.name}
          className="grid grid-cols-[1fr_60px_50px_50px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {r.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate3(r.rate)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.change1d)}`}>
            {fmtBps(r.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.change1w)}`}>
            {fmtBps(r.change1w)}
          </span>
        </div>
      ))}

      {rates.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ── Section 2: Repo Market ──

function RepoMarketSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const repo = d?.repoMarket;
  if (!repo) return null;

  const rows = [
    { label: 'OVERNIGHT REPO', rate: repo.overnightRate, change: repo.overnightChange },
    { label: 'TERM REPO', rate: repo.termRate, change: repo.termChange },
    { label: 'ON RRP RATE', rate: repo.onRrpRate, change: repo.onRrpChange },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-teal-400">
          {tr(t, 'mmRepoMarket', 'Repo Market')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px">
        {rows.map((row) => (
          <div key={row.label} className="px-3 py-1.5 bg-black hover:bg-teal-400/[0.02] transition-colors">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {row.label}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-[10px] font-mono font-bold text-white">
                {fmtRate3(row.rate)}%
              </span>
              <span className={`text-[8px] font-mono font-bold ${changeColor(row.change)}`}>
                {fmtBps(row.change)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Facility Usage */}
      {repo.facilityUsage != null && (
        <div className="px-3 py-1.5 border-t border-border/10">
          <div className="flex items-center justify-between">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              ON RRP FACILITY USAGE
            </span>
            <span className="text-[8px] font-mono font-bold text-white">
              {fmtBn(repo.facilityUsage)}
            </span>
          </div>
          {repo.facilityCounterparties != null && (
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                COUNTERPARTIES
              </span>
              <span className="text-[8px] font-mono text-neutral-400">
                {repo.facilityCounterparties}
              </span>
            </div>
          )}
          {repo.facilityUsageChange != null && (
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                USAGE CHANGE
              </span>
              <span className={`text-[8px] font-mono font-bold ${changeColor(repo.facilityUsageChange)}`}>
                {fmtBn(repo.facilityUsageChange)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section 3: Commercial Paper ──

function CommercialPaperSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const cp = d?.commercialPaper;
  if (!cp) return null;

  const termStructure = cp.termStructure ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-teal-400">
          {tr(t, 'mmCommercialPaper', 'Commercial Paper')}
        </span>
      </div>

      {/* Term structure table */}
      {termStructure.length > 0 && (
        <>
          <div className="grid grid-cols-[1fr_60px_60px_60px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              TENOR
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              AA FIN
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              AA NONFIN
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              ABCP
            </span>
          </div>
          {termStructure.map((row: any) => (
            <div
              key={row.tenor}
              className="grid grid-cols-[1fr_60px_60px_60px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-white uppercase">
                {row.tenor}
              </span>
              <span className="text-[8px] font-mono font-bold text-white text-right">
                {fmtRate3(row.aaFinancial)}
              </span>
              <span className="text-[8px] font-mono font-bold text-white text-right">
                {fmtRate3(row.aaNonfinancial)}
              </span>
              <span className="text-[8px] font-mono font-bold text-white text-right">
                {fmtRate3(row.abcp)}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Total outstanding */}
      {cp.totalOutstanding != null && (
        <div className="px-3 py-1.5 border-t border-border/10">
          <div className="flex items-center justify-between">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              TOTAL OUTSTANDING
            </span>
            <span className="text-[8px] font-mono font-bold text-white">
              {fmtBn(cp.totalOutstanding)}
            </span>
          </div>
          {cp.outstandingChange != null && (
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                WEEKLY CHANGE
              </span>
              <span className={`text-[8px] font-mono font-bold ${changeColor(cp.outstandingChange)}`}>
                {fmtBn(cp.outstandingChange)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section 4: Treasury Bills ──

function TreasuryBillsSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const tbills = d?.treasuryBills;
  if (!tbills) return null;

  const yields = tbills.yields ?? [];
  const auctions = tbills.recentAuctions ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-teal-400">
          {tr(t, 'mmTreasuryBills', 'Treasury Bills')}
        </span>
      </div>

      {/* Yields grid */}
      {yields.length > 0 && (
        <>
          <div className="grid grid-cols-[1fr_60px_50px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              TENOR
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              YIELD %
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              CHG
            </span>
          </div>
          {yields.map((row: any) => (
            <div
              key={row.tenor}
              className="grid grid-cols-[1fr_60px_50px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-white uppercase">
                {row.tenor}
              </span>
              <span className="text-[8px] font-mono font-bold text-white text-right">
                {fmtRate3(row.yield)}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${changeColor(row.change)}`}>
                {fmtBps(row.change)}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Recent Auctions */}
      {auctions.length > 0 && (
        <div className="px-3 py-1.5 border-t border-border/10">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
            RECENT AUCTIONS
          </div>
          {auctions.map((a: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-[2px]">
              <span className="text-[7px] font-mono text-neutral-400 uppercase">
                {a.tenor} {a.date}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-white">
                  {fmtRate3(a.highRate)}%
                </span>
                {a.bidToCover != null && (
                  <span className="text-[7px] font-mono text-neutral-500">
                    BTC {a.bidToCover.toFixed(2)}
                  </span>
                )}
                {a.tailBps != null && (
                  <span className={`text-[7px] font-mono ${a.tailBps > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    TAIL {fmtBps(a.tailBps)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section 5: Spreads ──

function SpreadsSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const spreads = d?.spreads ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-teal-400">
          {tr(t, 'mmSpreads', 'Spreads')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_60px_50px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mmSpreadName', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmSpreadLevel', 'Level')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmSpreadChg', 'Chg')}
        </span>
      </div>

      {spreads.map((s: any) => (
        <div
          key={s.name}
          className="grid grid-cols-[1fr_60px_50px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {s.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(s.level)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.change)}`}>
            {fmtBps(s.change)}
          </span>
        </div>
      ))}

      {spreads.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ── Section 6: Money Market Funds ──

function MoneyMarketFundsSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const mmf = d?.moneyMarketFunds;
  if (!mmf) return null;

  const funds = mmf.funds ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-teal-400">
          {tr(t, 'mmMoneyMarketFunds', 'Money Market Funds')}
        </span>
      </div>

      {/* Aggregate metrics */}
      <div className="grid grid-cols-4 gap-px border-b border-border/10">
        <MetricCell label="TOTAL AUM" value={fmtBn(mmf.totalAum)} />
        <MetricCell label="AVG YIELD" value={mmf.avgYield != null ? `${fmtRate(mmf.avgYield)}%` : '--'} />
        <MetricCell label="AVG WAM" value={fmtDays(mmf.avgWam)} />
        <MetricCell label="AVG WAL" value={fmtDays(mmf.avgWal)} />
      </div>

      {/* Weekly flows */}
      {mmf.weeklyFlows != null && (
        <div className="px-3 py-1 border-b border-border/10">
          <div className="flex items-center justify-between">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              WEEKLY FLOWS
            </span>
            <span className={`text-[8px] font-mono font-bold ${changeColor(mmf.weeklyFlows)}`}>
              {mmf.weeklyFlows >= 0 ? '+' : ''}{fmtBn(mmf.weeklyFlows)}
            </span>
          </div>
        </div>
      )}

      {/* Individual funds table */}
      {funds.length > 0 && (
        <>
          <div className="grid grid-cols-[1fr_55px_40px_40px_50px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              FUND
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              AUM
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              WAM
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              WAL
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              YIELD
            </span>
          </div>
          {funds.map((f: any, i: number) => (
            <div
              key={f.name ?? i}
              className="grid grid-cols-[1fr_55px_40px_40px_50px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
                {f.name}
              </span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">
                {fmtBn(f.aum)}
              </span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">
                {fmtDays(f.wam)}
              </span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">
                {fmtDays(f.wal)}
              </span>
              <span className="text-[8px] font-mono font-bold text-white text-right">
                {f.yield != null ? `${fmtRate(f.yield)}%` : '--'}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Flows detail */}
      {mmf.flowBreakdown && (
        <div className="px-3 py-1.5 border-t border-border/10">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
            FLOW BREAKDOWN
          </div>
          <div className="grid grid-cols-3 gap-2">
            {mmf.flowBreakdown.government != null && (
              <div>
                <div className="text-[6px] font-mono text-neutral-600 uppercase">GOVT</div>
                <div className={`text-[8px] font-mono font-bold ${changeColor(mmf.flowBreakdown.government)}`}>
                  {fmtBn(mmf.flowBreakdown.government)}
                </div>
              </div>
            )}
            {mmf.flowBreakdown.prime != null && (
              <div>
                <div className="text-[6px] font-mono text-neutral-600 uppercase">PRIME</div>
                <div className={`text-[8px] font-mono font-bold ${changeColor(mmf.flowBreakdown.prime)}`}>
                  {fmtBn(mmf.flowBreakdown.prime)}
                </div>
              </div>
            )}
            {mmf.flowBreakdown.taxExempt != null && (
              <div>
                <div className="text-[6px] font-mono text-neutral-600 uppercase">TAX-EXEMPT</div>
                <div className={`text-[8px] font-mono font-bold ${changeColor(mmf.flowBreakdown.taxExempt)}`}>
                  {fmtBn(mmf.flowBreakdown.taxExempt)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared Components ──

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 bg-black">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        {label}
      </div>
      <div className="text-[10px] font-mono font-bold text-white mt-0.5">
        {value}
      </div>
    </div>
  );
}
