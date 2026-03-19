import { useMoneyMarket } from '../../api/hooks/use-money-market';
import { useT } from '../../i18n';

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
  return `${n.toFixed(2)}%`;
}

function fmtBn(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}T`;
  return `${n.toFixed(1)}B`;
}

function fmtBnSigned(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  if (Math.abs(n) >= 1000) return `${sign}${(n / 1000).toFixed(1)}T`;
  return `${sign}${n.toFixed(1)}B`;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(4);
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

function flowColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function MoneyMarketPanel() {
  const t = useT();
  const { data, isLoading, error } = useMoneyMarket();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-sky-400">
            {t('panelMoneyMarket')}
          </span>
        </div>
        {d?.asOfDate && (
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {d.asOfDate}
          </span>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-sky-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING MONEY MARKET DATA...
          </div>
        )}

        {error && !d && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            FAILED TO LOAD MONEY MARKET DATA
          </div>
        )}

        {d && (
          <>
            <FedFundsBanner d={d} t={t} />
            <OvernightRatesSection d={d} t={t} />
            <RepoRatesSection d={d} t={t} />
            <CommercialPaperSection d={d} t={t} />
            <TBillYieldsSection d={d} t={t} />
            <MoneyMarketFundFlowsSection d={d} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: Fed Funds Target Banner ──

function FedFundsBanner({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const ff = d?.fedFunds;
  if (!ff) return null;

  return (
    <div className="border-b border-border/20 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-border/10">
        {/* Target Range */}
        <div className="flex-1 px-3 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'mmFedFundsTarget', 'Fed Funds Target')}
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-[13px] font-mono font-bold text-white">
              {fmtRate(ff.lowerBound)}-{fmtRate(ff.upperBound)}%
            </span>
          </div>
        </div>

        {/* Effective Rate */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'mmEffectiveRate', 'Effective Rate')}
          </div>
          <div className="text-[13px] font-mono font-bold text-sky-400 mt-0.5">
            {fmtRate(ff.effectiveRate)}%
          </div>
        </div>

        {/* Probability of Next Move */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'mmNextMoveProb', 'Next Move Probability')}
          </div>
          <div className="mt-0.5">
            {ff.nextMoveProb != null ? (
              <div className="flex items-center justify-center gap-2">
                {ff.nextMoveDirection && (
                  <span className={`text-[8px] font-mono font-bold uppercase ${
                    ff.nextMoveDirection === 'CUT' ? 'text-green-400' :
                    ff.nextMoveDirection === 'HIKE' ? 'text-red-400' :
                    'text-neutral-400'
                  }`}>
                    {ff.nextMoveDirection}
                  </span>
                )}
                <span className="text-[13px] font-mono font-bold text-white">
                  {fmtPct(ff.nextMoveProb)}
                </span>
              </div>
            ) : (
              <span className="text-[10px] font-mono text-neutral-500">--</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section 2: Overnight Rates ──

function OvernightRatesSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const rates = d?.overnightRates ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-sky-400">
          {tr(t, 'mmOvernightRates', 'Overnight Rates')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_50px_55px_55px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mmRate', 'Rate')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmLevel', 'Level %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmChgBps', 'Chg (bps)')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mm30dAvg', '30D Avg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mm90dAvg', '90D Avg')}
        </span>
      </div>

      {/* Rate rows */}
      {rates.map((r: any) => (
        <div
          key={r.name}
          className="grid grid-cols-[1fr_55px_50px_55px_55px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {r.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate3(r.rate)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.changeBps)}`}>
            {fmtBps(r.changeBps)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate3(r.avg30d)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate3(r.avg90d)}
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

// ── Section 3: Repo Rates ──

function RepoRatesSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const repo = d?.repoRates ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-sky-400">
          {tr(t, 'mmRepoRates', 'Repo Rates')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_55px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mmTerm', 'Term')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmRepoRate', 'Rate %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmVolume', 'Vol ($B)')}
        </span>
      </div>

      {/* Repo rows */}
      {repo.map((r: any) => (
        <div
          key={r.term}
          className="grid grid-cols-[1fr_55px_55px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase">
            {r.term}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate3(r.rate)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtBn(r.volume)}
          </span>
        </div>
      ))}

      {repo.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ── Section 4: Commercial Paper Rates ──

function CommercialPaperSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const cp = d?.commercialPaper;
  if (!cp) return null;

  const tenors = cp.tenors ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-sky-400">
          {tr(t, 'mmCommercialPaper', 'Commercial Paper Rates')}
        </span>
      </div>

      {/* Table header */}
      {tenors.length > 0 && (
        <>
          <div className="grid grid-cols-[1fr_60px_60px_60px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'mmTenor', 'Tenor')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              AA FIN
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              AA NONFIN
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              A2/P2
            </span>
          </div>

          {tenors.map((row: any) => (
            <div
              key={row.tenor}
              className="grid grid-cols-[1fr_60px_60px_60px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-sky-400/[0.02] transition-colors items-center"
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
                {fmtRate3(row.a2p2)}
              </span>
            </div>
          ))}
        </>
      )}

      {tenors.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ── Section 5: T-Bill Yields ──

function TBillYieldsSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const tbills = d?.tbillYields ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-sky-400">
          {tr(t, 'mmTBillYields', 'T-Bill Yields')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_55px_55px_55px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mmTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmYield', 'Yield %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmDiscRate', 'Disc Rate')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmPrice', 'Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmAuctionSize', 'Auction')}
        </span>
      </div>

      {/* T-Bill rows */}
      {tbills.map((row: any) => (
        <div
          key={row.tenor}
          className="grid grid-cols-[1fr_55px_55px_55px_55px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase">
            {row.tenor}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate3(row.yield)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate3(row.discountRate)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtPrice(row.price)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtBn(row.auctionSize)}
          </span>
        </div>
      ))}

      {tbills.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ── Section 6: Money Market Fund Flows ──

function MoneyMarketFundFlowsSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const funds = d?.moneyMarketFundFlows ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-sky-400">
          {tr(t, 'mmFundFlows', 'Money Market Fund Flows')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_55px_50px_40px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mmCategory', 'Category')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmAum', 'AUM')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmWeeklyFlow', 'Wk Flow')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mm7dYield', '7D Yield')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmWam', 'WAM')}
        </span>
      </div>

      {/* Fund rows */}
      {funds.map((f: any) => (
        <div
          key={f.category}
          className="grid grid-cols-[1fr_55px_55px_50px_40px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {f.category}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtBn(f.aum)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(f.weeklyFlow)}`}>
            {fmtBnSigned(f.weeklyFlow)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {f.yield7d != null ? fmtPct(f.yield7d) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtDays(f.wam)}
          </span>
        </div>
      ))}

      {funds.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}
