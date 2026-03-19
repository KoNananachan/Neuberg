import { useLiquidityMonitor } from '../../api/hooks/use-liquidity-monitor';

// ── Constants ──

const AMBER = '#fbbf24';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#facc15';

// ── Formatting helpers ──

function fmtTrillion(n: number | null | undefined): string {
  if (n == null) return '--';
  return '$' + n.toFixed(1) + 'T';
}

function fmtBn(n: number | null | undefined): string {
  if (n == null) return '--';
  const abs = Math.abs(n);
  if (abs >= 1000) return '$' + (n / 1000).toFixed(1) + 'T';
  return '$' + n.toFixed(0) + 'B';
}

function fmtBnSigned(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  const abs = Math.abs(n);
  if (abs >= 1000) return sign + '$' + (n / 1000).toFixed(1) + 'T';
  return sign + '$' + n.toFixed(0) + 'B';
}

function fmtRate(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(3);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1) + 'bp';
}

function fmtBpsSigned(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1) + 'bp';
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1) + '%';
}

function fmtPctSigned(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}

function fmtScore(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1);
}

function fmtVol(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(0) + '%';
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'rgba(255,255,255,0.3)';
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function liquidityBadge(level: string | null | undefined): { text: string; color: string; bg: string } {
  const s = (level ?? '').toUpperCase();
  if (s === 'AMPLE' || s.includes('AMPLE')) return { text: 'AMPLE', color: GREEN, bg: 'rgba(52,211,153,0.12)' };
  if (s === 'ADEQUATE' || s.includes('ADEQUATE')) return { text: 'ADEQUATE', color: GREEN, bg: 'rgba(52,211,153,0.08)' };
  if (s === 'TIGHT' || s.includes('TIGHT')) return { text: 'TIGHT', color: AMBER, bg: 'rgba(251,191,36,0.12)' };
  if (s === 'STRESSED' || s.includes('STRESS')) return { text: 'STRESSED', color: RED, bg: 'rgba(248,113,113,0.12)' };
  return { text: s || 'N/A', color: YELLOW, bg: 'rgba(250,204,21,0.08)' };
}

function conditionBadge(level: string | null | undefined): { text: string; color: string; bg: string } {
  const s = (level ?? '').toUpperCase();
  if (s.includes('TIGHT') || s.includes('RESTRICT')) return { text: s, color: AMBER, bg: 'rgba(251,191,36,0.1)' };
  if (s.includes('EASY') || s.includes('LOOSE') || s.includes('NORMAL')) return { text: s, color: GREEN, bg: 'rgba(52,211,153,0.08)' };
  if (s.includes('STRESS') || s.includes('SEVERE')) return { text: s, color: RED, bg: 'rgba(248,113,113,0.1)' };
  return { text: s || '--', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
}

// ── Summary Bar ──

function SummaryBar({ data }: { data: any }) {
  const summary = data?.summary;
  if (!summary) return null;
  const badge = liquidityBadge(summary?.overallLiquidity);

  return (
    <div className="border-b border-border/20 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-border/10">
        {/* Overall Liquidity */}
        <div className="px-3 py-1.5">
          <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">Overall Liquidity</div>
          <div className="mt-0.5">
            <span
              className="text-[9px] font-black font-mono uppercase px-1.5 py-0.5"
              style={{ color: badge.color, backgroundColor: badge.bg }}
            >
              {badge.text}
            </span>
          </div>
        </div>

        {/* Fed Net Liquidity */}
        <div className="px-3 py-1.5">
          <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">Fed Net Liquidity</div>
          <div className="text-[12px] font-mono font-bold text-amber-400 mt-0.5">
            {fmtTrillion(summary?.fedNetLiquidity)}
          </div>
        </div>

        {/* Trend */}
        <div className="px-3 py-1.5">
          <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">Trend</div>
          <div
            className="text-[9px] font-mono font-bold uppercase mt-0.5"
            style={{ color: summary?.liquidityTrend?.includes('TIGHT') || summary?.liquidityTrend?.includes('DOWN') ? RED : summary?.liquidityTrend?.includes('IMPROV') || summary?.liquidityTrend?.includes('UP') ? GREEN : AMBER }}
          >
            {summary?.liquidityTrend ?? '--'}
          </div>
        </div>

        {/* Primary Risk */}
        <div className="px-3 py-1.5">
          <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">Primary Risk</div>
          <div className="text-[9px] font-mono font-bold text-white/60 uppercase mt-0.5 truncate max-w-[100px]">
            {summary?.primaryRisk ?? '--'}
          </div>
        </div>

        {/* Key Metric */}
        <div className="px-3 py-1.5">
          <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">Key Metric</div>
          <div className="text-[9px] font-mono font-bold text-white/60 mt-0.5">
            {summary?.keyMetric ?? '--'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Central Bank Balance Sheets ──

function CentralBankSection({ data }: { data: any }) {
  const banks = data?.centralBanks ?? [];
  const fedDetail = data?.fedDetail;

  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1.5 pb-0.5">
        <span className="text-[7px] text-amber-400/60 uppercase tracking-wider font-bold">
          Central Bank Balance Sheets
        </span>
      </div>

      {/* Table header */}
      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider gap-1">
        <span className="w-[50px] shrink-0">Bank</span>
        <span className="w-[60px] text-right shrink-0">Total Assets</span>
        <span className="w-[50px] text-right shrink-0">MoM Chg</span>
        <span className="flex-1 text-right">YoY Chg</span>
      </div>

      {banks.map((row: any, i: number) => (
        <div
          key={row.name ?? i}
          className="flex items-center py-[3px] px-1 border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors text-[8px] font-mono gap-1"
        >
          <span className="w-[50px] font-bold text-amber-400 truncate shrink-0">{row.name}</span>
          <span className="w-[60px] text-right text-white/60 font-bold shrink-0">
            {fmtTrillion(row.totalAssets)}
          </span>
          <span
            className="w-[50px] text-right font-bold shrink-0"
            style={{ color: changeColor(row.changeMoM) }}
          >
            {fmtPctSigned(row.changeMoM)}
          </span>
          <span
            className="flex-1 text-right font-bold"
            style={{ color: changeColor(row.changeYoY) }}
          >
            {fmtPctSigned(row.changeYoY)}
          </span>
        </div>
      ))}

      {/* Fed Detail */}
      {fedDetail && (
        <div className="grid grid-cols-4 gap-px bg-border/10 mt-px">
          {[
            { label: 'FED BS', value: fmtTrillion(fedDetail.balanceSheet) },
            { label: 'RRP', value: fmtBn(fedDetail.rrp) },
            { label: 'TGA', value: fmtBn(fedDetail.tga) },
            { label: 'NET LIQ', value: fmtTrillion(fedDetail.netLiquidity) },
          ].map((m) => (
            <div key={m.label} className="px-2 py-1 bg-black hover:bg-amber-400/[0.02] transition-colors">
              <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider">{m.label}</div>
              <div className="text-[9px] font-mono font-bold text-white/70">{m.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stress Indicators ──

function StressIndicatorsSection({ data }: { data: any }) {
  const stress = data?.stressIndicators;
  if (!stress) return null;

  const indicators = [
    { label: 'TED SPREAD', key: 'tedSpread', threshold: 50 },
    { label: 'LIBOR-OIS', key: 'liborOis', threshold: 25 },
    { label: 'XCCY BASIS', key: 'crossCurrencyBasis', threshold: -30 },
    { label: 'FX SWAP BASIS', key: 'fxSwapBasis', threshold: -30 },
    { label: 'CP-OIS', key: 'cpOis', threshold: 30 },
    { label: 'BANK CDS', key: 'bankCds', threshold: 80 },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1.5 pb-0.5">
        <span className="text-[7px] text-amber-400/60 uppercase tracking-wider font-bold">
          Stress Indicators
        </span>
      </div>

      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider gap-1">
        <span className="w-[80px] shrink-0">Indicator</span>
        <span className="w-[50px] text-right shrink-0">Current</span>
        <span className="w-[50px] text-right shrink-0">1W Ago</span>
        <span className="flex-1 text-right">Signal</span>
      </div>

      {indicators.map((ind) => {
        const item = stress?.[ind.key];
        const val = item?.current;
        const absVal = val != null ? Math.abs(val) : null;
        const isElevated = absVal != null && absVal > Math.abs(ind.threshold);
        const isWarning = absVal != null && absVal > Math.abs(ind.threshold) * 0.7;

        return (
          <div
            key={ind.key}
            className="flex items-center py-[3px] px-1 border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors text-[8px] font-mono gap-1"
          >
            <span className="w-[80px] font-bold text-white/60 shrink-0">{ind.label}</span>
            <span
              className="w-[50px] text-right font-bold shrink-0"
              style={{ color: isElevated ? RED : isWarning ? AMBER : 'rgba(255,255,255,0.5)' }}
            >
              {fmtBps(item?.current)}
            </span>
            <span className="w-[50px] text-right text-white/30 shrink-0">
              {fmtBps(item?.weekAgo)}
            </span>
            <span className="flex-1 flex justify-end">
              {isElevated ? (
                <span className="text-[6px] font-black font-mono uppercase px-1 py-0" style={{ color: RED, backgroundColor: 'rgba(248,113,113,0.12)' }}>ELEVATED</span>
              ) : isWarning ? (
                <span className="text-[6px] font-black font-mono uppercase px-1 py-0" style={{ color: AMBER, backgroundColor: 'rgba(251,191,36,0.1)' }}>WATCH</span>
              ) : (
                <span className="text-[6px] font-black font-mono uppercase px-1 py-0 text-white/20">NORMAL</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Money Markets Table ──

function MoneyMarketsSection({ data }: { data: any }) {
  const markets = data?.moneyMarkets ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1.5 pb-0.5">
        <span className="text-[7px] text-amber-400/60 uppercase tracking-wider font-bold">
          Money Markets
        </span>
      </div>

      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider gap-1">
        <span className="w-[90px] shrink-0">Instrument</span>
        <span className="w-[50px] text-right shrink-0">Rate %</span>
        <span className="flex-1 text-right">Chg (bps)</span>
      </div>

      {(markets.length > 0 ? markets : [
        { name: 'SOFR', key: 'sofr' },
        { name: 'EFFR', key: 'effr' },
        { name: 'O/N REPO', key: 'overnightRepo' },
        { name: 'TRI-PARTY REPO', key: 'triPartyRepo' },
        { name: 'GCF REPO', key: 'gcfRepo' },
        { name: 'CP 3M', key: 'cp3m' },
        { name: 'T-BILL 3M', key: 'tbill3m' },
        { name: 'FED FUNDS VOL', key: 'fedFundsVolume' },
      ].map((fallback) => {
        const item = data?.moneyMarketRates?.[fallback.key];
        return item ? { name: fallback.name, rate: item.rate, change: item.change } : null;
      }).filter(Boolean)).map((row: any, i: number) => (
        <div
          key={row.name ?? i}
          className="flex items-center py-[3px] px-1 border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors text-[8px] font-mono gap-1"
        >
          <span className="w-[90px] font-bold text-white/70 uppercase truncate shrink-0">{row.name}</span>
          <span className="w-[50px] text-right text-white/60 font-bold shrink-0">
            {fmtRate(row.rate)}
          </span>
          <span
            className="flex-1 text-right font-bold"
            style={{ color: changeColor(row.change) }}
          >
            {fmtBpsSigned(row.change)}
          </span>
        </div>
      ))}

      {markets.length === 0 && !data?.moneyMarketRates && (
        <div className="px-1 py-1.5 text-[7px] font-mono text-white/20 uppercase">No data</div>
      )}
    </div>
  );
}

// ── Credit Conditions ──

function CreditConditionsSection({ data }: { data: any }) {
  const credit = data?.creditConditions;
  if (!credit) return null;

  const surveyBadge = conditionBadge(credit?.loanOfficerSurvey);

  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1.5 pb-0.5">
        <span className="text-[7px] text-amber-400/60 uppercase tracking-wider font-bold">
          Credit Conditions
        </span>
      </div>

      {/* Loan Officer Survey badge */}
      <div className="px-2 py-1 border-b border-border/10">
        <div className="text-[6px] font-mono text-white/20 uppercase tracking-wider">Sr Loan Officer Survey</div>
        <span
          className="text-[8px] font-black font-mono uppercase px-1.5 py-0.5 mt-0.5 inline-block"
          style={{ color: surveyBadge.color, backgroundColor: surveyBadge.bg }}
        >
          {surveyBadge.text}
        </span>
      </div>

      {/* Issuance & FCI */}
      <div className="grid grid-cols-4 gap-px bg-border/10">
        {[
          { label: 'IG ISSUANCE', value: fmtBn(credit?.igIssuance) },
          { label: 'HY ISSUANCE', value: fmtBn(credit?.hyIssuance) },
          { label: 'LEV LOAN', value: fmtBn(credit?.leveragedLoanIssuance) },
          { label: 'FCI', value: credit?.fci != null ? credit.fci.toFixed(2) : '--' },
        ].map((m) => (
          <div key={m.label} className="px-2 py-1 bg-black hover:bg-amber-400/[0.02] transition-colors">
            <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider">{m.label}</div>
            <div className="text-[9px] font-mono font-bold text-white/70">{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Market Liquidity ──

function MarketLiquiditySection({ data }: { data: any }) {
  const assets = data?.marketLiquidity ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1.5 pb-0.5">
        <span className="text-[7px] text-amber-400/60 uppercase tracking-wider font-bold">
          Market Liquidity
        </span>
      </div>

      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider gap-1">
        <span className="w-[60px] shrink-0">Asset</span>
        <span className="w-[40px] text-right shrink-0">Bid-Ask</span>
        <span className="w-[36px] text-right shrink-0">Depth</span>
        <span className="w-[40px] text-right shrink-0">Vol%Avg</span>
        <span className="flex-1 text-right">Score</span>
      </div>

      {assets.map((row: any, i: number) => {
        const score = row.liquidityScore ?? 0;
        const barWidth = Math.min(Math.max(score / 10, 0), 1) * 100;
        const barColor = score >= 7 ? GREEN : score >= 4 ? AMBER : RED;

        return (
          <div
            key={row.asset ?? i}
            className="flex items-center py-[3px] px-1 border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors text-[8px] font-mono gap-1"
          >
            <span className="w-[60px] font-bold text-white/70 uppercase truncate shrink-0">{row.asset}</span>
            <span className="w-[40px] text-right text-white/50 shrink-0">{fmtBps(row.bidAskSpread)}</span>
            <span className="w-[36px] text-right text-white/50 shrink-0">{row.depth ?? '--'}</span>
            <span className="w-[40px] text-right text-white/50 shrink-0">{fmtVol(row.volumeVsAvg)}</span>
            <span className="flex-1 flex items-center justify-end gap-1">
              <span className="text-[7px] font-bold" style={{ color: barColor }}>{fmtScore(score)}</span>
              <div className="w-[30px] h-[4px] bg-white/5 relative">
                <div
                  className="absolute left-0 top-0 h-full"
                  style={{ width: barWidth + '%', backgroundColor: barColor }}
                />
              </div>
            </span>
          </div>
        );
      })}

      {assets.length === 0 && (
        <div className="px-1 py-1.5 text-[7px] font-mono text-white/20 uppercase">No data</div>
      )}
    </div>
  );
}

// ── Flow of Funds ──

function FlowOfFundsSection({ data }: { data: any }) {
  const flow = data?.flowOfFunds;
  if (!flow) return null;

  const metrics = [
    { label: 'BANK RESERVES', value: fmtBn(flow?.bankReserves) },
    { label: 'EXCESS RESERVES', value: fmtBn(flow?.excessReserves) },
    { label: 'M2', value: fmtTrillion(flow?.m2) },
    { label: 'M2 GROWTH', value: fmtPctSigned(flow?.m2Growth), color: changeColor(flow?.m2Growth) },
    { label: 'BANK LENDING', value: fmtTrillion(flow?.bankLending) },
    { label: 'LENDING GROWTH', value: fmtPctSigned(flow?.lendingGrowth), color: changeColor(flow?.lendingGrowth) },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1.5 pb-0.5">
        <span className="text-[7px] text-amber-400/60 uppercase tracking-wider font-bold">
          Flow of Funds
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px bg-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="px-2 py-1 bg-black hover:bg-amber-400/[0.02] transition-colors">
            <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider">{m.label}</div>
            <div
              className="text-[9px] font-mono font-bold"
              style={{ color: m.color ?? 'rgba(255,255,255,0.7)' }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Collateral Market ──

function CollateralMarketSection({ data }: { data: any }) {
  const collateral = data?.collateralMarket;
  if (!collateral) return null;

  const items = [
    { label: 'TSY COLLATERAL RATE', value: fmtRate(collateral?.treasuryCollateralRate), suffix: '%' },
    { label: 'FAILS TO DELIVER', value: fmtBn(collateral?.failsToDeliver), suffix: '' },
    { label: 'SPECIALNESS', value: fmtBps(collateral?.specialness), suffix: '' },
    { label: 'SHORT INTEREST', value: fmtPct(collateral?.shortInterest), suffix: '' },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1.5 pb-0.5">
        <span className="text-[7px] text-amber-400/60 uppercase tracking-wider font-bold">
          Collateral Market
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border/10">
        {items.map((m) => (
          <div key={m.label} className="px-2 py-1 bg-black hover:bg-amber-400/[0.02] transition-colors">
            <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider">{m.label}</div>
            <div className="text-[9px] font-mono font-bold text-white/70">{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function LiquidityMonitorPanel() {
  const { data, isLoading, error } = useLiquidityMonitor();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">
            Liquidity Monitor
          </span>
        </div>
        {d?.timestamp && (
          <span className="text-[6px] text-white/20">
            {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !d && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                Loading...
              </span>
            </div>
          </div>
        )}

        {error && !d && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] text-red-400 uppercase tracking-widest">
              Failed to load liquidity data
            </span>
          </div>
        )}

        {d && (
          <>
            <SummaryBar data={d} />
            <CentralBankSection data={d} />
            <StressIndicatorsSection data={d} />
            <MoneyMarketsSection data={d} />
            <CreditConditionsSection data={d} />
            <MarketLiquiditySection data={d} />
            <FlowOfFundsSection data={d} />
            <CollateralMarketSection data={d} />

            {/* Footer */}
            <div className="px-2 py-1 border-t border-border/20">
              <span className="text-[6px] font-mono text-white/15">
                Last update: {d?.timestamp ? new Date(d.timestamp).toLocaleString() : '-'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
