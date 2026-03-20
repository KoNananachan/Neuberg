import { useShortSqueeze } from '../../api/hooks/use-short-squeeze';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtDays(n: number): string {
  return n.toFixed(1);
}

function fmtCost(n: number): string {
  return n.toFixed(1);
}

function fmtScore(n: number): string {
  return n.toFixed(0);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtGamma(n: number): string {
  return n.toFixed(2);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-red-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-lime-400';
  return 'text-neutral-400';
}

function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-red-400';
  if (score >= 60) return 'bg-yellow-400';
  if (score >= 40) return 'bg-lime-400';
  return 'bg-neutral-500';
}

function ctbColor(ctb: number): string {
  if (ctb >= 100) return 'text-red-400';
  if (ctb >= 50) return 'text-yellow-400';
  if (ctb >= 20) return 'text-lime-400';
  return 'text-neutral-400';
}

function sentimentColor(sentiment: string): string {
  const s = sentiment.toUpperCase();
  if (s === 'BULLISH') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (s === 'BEARISH') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (s === 'NEUTRAL') return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
  return 'bg-lime-400/20 text-lime-400 border-lime-400/30';
}

// ── Interfaces ──

interface SqueezeHighRisk {
  ticker: string;
  siPct: number;
  dtc: number;
  ctb: number;
  squeezeScore: number;
}

interface MostShorted {
  ticker: string;
  siPct: number;
  sharesShort: number;
  change1w: number;
}

interface CostToBorrow {
  ticker: string;
  ctbAvg: number;
  ctbMax: number;
  change1w: number;
  utilization: number;
}

interface SiChange {
  ticker: string;
  prevSi: number;
  currSi: number;
  changePct: number;
  direction: string;
}

interface SqueezeCandidate {
  ticker: string;
  siPct: number;
  dtc: number;
  ctb: number;
  catalyst: string;
  probability: number;
}

interface OptionsGamma {
  ticker: string;
  netGamma: number;
  callOi: number;
  putOi: number;
  pcRatio: number;
  gammaFlip: number;
}

interface SocialSentiment {
  ticker: string;
  sentiment: string;
  mentions: number;
  change24h: number;
  source: string;
}

interface HistoricalSqueeze {
  ticker: string;
  date: string;
  peakGain: number;
  duration: string;
  siAtStart: number;
  trigger: string;
}

// ── Main Panel ──

export function ShortSqueezePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useShortSqueeze();

  const highRisk = data?.highRisk as SqueezeHighRisk[] | undefined;
  const mostShorted = data?.mostShorted as MostShorted[] | undefined;
  const costToBorrow = data?.costToBorrow as CostToBorrow[] | undefined;
  const siChanges = data?.siChanges as SiChange[] | undefined;
  const squeezeCandidates = data?.squeezeCandidates as SqueezeCandidate[] | undefined;
  const optionsGamma = data?.optionsGamma as OptionsGamma[] | undefined;
  const socialSentiment = data?.socialSentiment as SocialSentiment[] | undefined;
  const historicalSqueezes = data?.historicalSqueezes as HistoricalSqueeze[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-lime-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-lime-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-lime-400">
            {tr(t, 'panelShortSqueeze', 'Short Squeeze Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-lime-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-lime-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'panelShortSqueezeNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {highRisk && highRisk.length > 0 && (
              <HighRiskSection stocks={highRisk} t={t} />
            )}
            {mostShorted && mostShorted.length > 0 && (
              <MostShortedSection stocks={mostShorted} t={t} />
            )}
            {costToBorrow && costToBorrow.length > 0 && (
              <CostToBorrowSection stocks={costToBorrow} t={t} />
            )}
            {siChanges && siChanges.length > 0 && (
              <SiChangesSection changes={siChanges} t={t} />
            )}
            {squeezeCandidates && squeezeCandidates.length > 0 && (
              <SqueezeCandidatesSection candidates={squeezeCandidates} t={t} />
            )}
            {optionsGamma && optionsGamma.length > 0 && (
              <OptionsGammaSection gamma={optionsGamma} t={t} />
            )}
            {socialSentiment && socialSentiment.length > 0 && (
              <SocialSentimentSection sentiment={socialSentiment} t={t} />
            )}
            {historicalSqueezes && historicalSqueezes.length > 0 && (
              <HistoricalSqueezesSection squeezes={historicalSqueezes} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── High Risk Stocks Section ──

function HighRiskSection({
  stocks,
  t,
}: {
  stocks: SqueezeHighRisk[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-lime-400/30">
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShortSqueezeHighRisk', 'High Risk Stocks')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_48px_48px_80px] gap-0 px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShortSqueezeTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezeSiPct', 'SI %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezeDtc', 'DTC')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezeCtb', 'CTB %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelShortSqueezeScore', 'Squeeze Score')}
        </span>
      </div>

      {/* Rows */}
      {stocks.map((stock, i) => (
        <div
          key={`${stock.ticker}-${i}`}
          className="grid grid-cols-[1fr_48px_48px_48px_80px] gap-0 px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {stock.ticker}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(stock.siPct)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtDays(stock.dtc)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${ctbColor(stock.ctb)}`}>
            {fmtCost(stock.ctb)}
          </span>
          {/* Squeeze score with color bar */}
          <div className="flex items-center gap-1 justify-end pr-2">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 left-0 h-full ${scoreBarColor(stock.squeezeScore)}`}
                style={{ width: `${Math.min(stock.squeezeScore, 100)}%` }}
              />
            </div>
            <span className={`text-[8px] font-mono font-bold w-6 text-right ${scoreColor(stock.squeezeScore)}`}>
              {fmtScore(stock.squeezeScore)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Most Shorted Section ──

function MostShortedSection({
  stocks,
  t,
}: {
  stocks: MostShorted[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-lime-400/30">
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShortSqueezeMostShorted', 'Most Shorted')}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_48px_64px_48px] gap-0 px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShortSqueezeTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezeSiPct', 'SI %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezeShares', 'Shares (M)')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelShortSqueeze1wChg', '1W Chg')}
        </span>
      </div>

      {stocks.map((stock, i) => (
        <div
          key={`${stock.ticker}-${i}`}
          className="grid grid-cols-[1fr_48px_64px_48px] gap-0 px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {stock.ticker}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(stock.siPct)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {(stock.sharesShort / 1e6).toFixed(1)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(stock.change1w)}`}>
            {fmtChg(stock.change1w)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Cost to Borrow Section ──

function CostToBorrowSection({
  stocks,
  t,
}: {
  stocks: CostToBorrow[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-lime-400/30">
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShortSqueezeCtbTitle', 'Cost to Borrow')}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_48px_48px_48px_56px] gap-0 px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShortSqueezeTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezeCtbAvg', 'Avg %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezeCtbMax', 'Max %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueeze1wChg', '1W Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelShortSqueezeUtil', 'Util %')}
        </span>
      </div>

      {stocks.map((stock, i) => (
        <div
          key={`${stock.ticker}-${i}`}
          className="grid grid-cols-[1fr_48px_48px_48px_56px] gap-0 px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {stock.ticker}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${ctbColor(stock.ctbAvg)}`}>
            {fmtCost(stock.ctbAvg)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${ctbColor(stock.ctbMax)}`}>
            {fmtCost(stock.ctbMax)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(stock.change1w)}`}>
            {fmtChg(stock.change1w)}%
          </span>
          <div className="flex items-center gap-1 justify-end pr-2">
            <div className="w-10 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-lime-400"
                style={{ width: `${Math.min(stock.utilization, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-white w-6 text-right">
              {fmtPct(stock.utilization)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SI Changes Section ──

function SiChangesSection({
  changes,
  t,
}: {
  changes: SiChange[];
  t: ReturnType<typeof useT>;
}) {
  const increases = changes.filter((c) => c.direction === 'increase');
  const decreases = changes.filter((c) => c.direction === 'decrease');

  return (
    <div className="border-b border-lime-400/30">
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShortSqueezeSiChanges', 'SI Changes')}
        </span>
      </div>

      {/* Two-column layout: Increases | Decreases */}
      <div className="grid grid-cols-2 gap-0 divide-x divide-lime-400/10">
        {/* Increases */}
        <div>
          <div className="px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
            <span className="text-[7px] font-mono font-bold text-red-400 uppercase tracking-wider">
              {tr(t, 'panelShortSqueezeIncreases', 'Biggest Increases')}
            </span>
          </div>
          {increases.map((c, i) => (
            <div
              key={`inc-${c.ticker}-${i}`}
              className="flex items-center justify-between px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors"
            >
              <span className="text-[8px] font-mono font-bold text-lime-400">{c.ticker}</span>
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-neutral-500">
                  {fmtPct(c.prevSi)}→{fmtPct(c.currSi)}
                </span>
                <span className="text-[8px] font-mono font-bold text-red-400">
                  {fmtChg(c.changePct)}%
                </span>
              </div>
            </div>
          ))}
          {increases.length === 0 && (
            <div className="px-2 py-2 text-[7px] font-mono text-neutral-600 text-center">—</div>
          )}
        </div>

        {/* Decreases */}
        <div>
          <div className="px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
            <span className="text-[7px] font-mono font-bold text-green-400 uppercase tracking-wider">
              {tr(t, 'panelShortSqueezeDecreases', 'Biggest Decreases')}
            </span>
          </div>
          {decreases.map((c, i) => (
            <div
              key={`dec-${c.ticker}-${i}`}
              className="flex items-center justify-between px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors"
            >
              <span className="text-[8px] font-mono font-bold text-lime-400">{c.ticker}</span>
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-neutral-500">
                  {fmtPct(c.prevSi)}→{fmtPct(c.currSi)}
                </span>
                <span className="text-[8px] font-mono font-bold text-green-400">
                  {fmtChg(c.changePct)}%
                </span>
              </div>
            </div>
          ))}
          {decreases.length === 0 && (
            <div className="px-2 py-2 text-[7px] font-mono text-neutral-600 text-center">—</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Squeeze Candidates Section ──

function SqueezeCandidatesSection({
  candidates,
  t,
}: {
  candidates: SqueezeCandidate[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-lime-400/30">
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShortSqueezeCandidates', 'Squeeze Candidates')}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_40px_40px_40px_80px_56px] gap-0 px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShortSqueezeTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezeSiPct', 'SI %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezeDtc', 'DTC')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezeCtb', 'CTB')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
          {tr(t, 'panelShortSqueezeCatalyst', 'Catalyst')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelShortSqueezeProb', 'Prob %')}
        </span>
      </div>

      {candidates.map((c, i) => (
        <div
          key={`${c.ticker}-${i}`}
          className="grid grid-cols-[1fr_40px_40px_40px_80px_56px] gap-0 px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {c.ticker}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(c.siPct)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtDays(c.dtc)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${ctbColor(c.ctb)}`}>
            {fmtCost(c.ctb)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {c.catalyst}
          </span>
          <div className="flex items-center gap-1 justify-end pr-2">
            <div className="w-10 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 left-0 h-full ${scoreBarColor(c.probability)}`}
                style={{ width: `${Math.min(c.probability, 100)}%` }}
              />
            </div>
            <span className={`text-[8px] font-mono font-bold w-6 text-right ${scoreColor(c.probability)}`}>
              {fmtScore(c.probability)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Options Gamma Section ──

function OptionsGammaSection({
  gamma,
  t,
}: {
  gamma: OptionsGamma[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-lime-400/30">
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShortSqueezeGamma', 'Options Gamma')}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_56px_48px_48px_48px_56px] gap-0 px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShortSqueezeTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezeNetGamma', 'Net Gamma')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezeCallOi', 'Call OI')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezePutOi', 'Put OI')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezePcRatio', 'P/C')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelShortSqueezeGammaFlip', 'Gamma Flip')}
        </span>
      </div>

      {gamma.map((g, i) => (
        <div
          key={`${g.ticker}-${i}`}
          className="grid grid-cols-[1fr_56px_48px_48px_48px_56px] gap-0 px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {g.ticker}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(g.netGamma)}`}>
            {fmtGamma(g.netGamma)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {(g.callOi / 1e3).toFixed(0)}k
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {(g.putOi / 1e3).toFixed(0)}k
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {g.pcRatio.toFixed(2)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            ${g.gammaFlip.toFixed(0)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Social Sentiment Section ──

function SocialSentimentSection({
  sentiment,
  t,
}: {
  sentiment: SocialSentiment[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-lime-400/30">
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShortSqueezeSocial', 'Social Sentiment')}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_56px_48px_48px_64px] gap-0 px-2 py-0.5 border-b border-lime-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShortSqueezeTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShortSqueezeSentiment', 'Sentiment')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueezeMentions', 'Mentions')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShortSqueeze24hChg', '24H Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelShortSqueezeSource', 'Source')}
        </span>
      </div>

      {sentiment.map((s, i) => (
        <div
          key={`${s.ticker}-${i}`}
          className="grid grid-cols-[1fr_56px_48px_48px_64px] gap-0 px-2 py-[3px] border-b border-lime-400/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-lime-400 truncate">
            {s.ticker}
          </span>
          <span>
            <span
              className={`inline-block px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${sentimentColor(s.sentiment)}`}
            >
              {s.sentiment}
            </span>
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {s.mentions.toLocaleString()}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.change24h)}`}>
            {fmtChg(s.change24h)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate">
            {s.source}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Historical Squeezes Section ──

function HistoricalSqueezesSection({
  squeezes,
  t,
}: {
  squeezes: HistoricalSqueeze[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-lime-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShortSqueezeHistorical', 'Historical Squeezes')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-lime-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'panelShortSqueezeTicker', 'Ticker')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'panelShortSqueezeDate', 'Date')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'panelShortSqueezePeakGain', 'Peak Gain')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'panelShortSqueezeDuration', 'Duration')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'panelShortSqueezeSiStart', 'SI @ Start')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'panelShortSqueezeTrigger', 'Trigger')}</th>
            </tr>
          </thead>
          <tbody>
            {squeezes.map((s, i) => (
              <tr
                key={`${s.ticker}-${s.date}-${i}`}
                className="border-b border-neutral-900 hover:bg-lime-400/[0.02]"
              >
                <td className="px-2 py-1 text-lime-400 font-bold">{s.ticker}</td>
                <td className="px-2 py-1 text-neutral-400">{s.date}</td>
                <td className="px-2 py-1 text-right text-green-400 font-bold">
                  +{fmtPct(s.peakGain)}%
                </td>
                <td className="px-2 py-1 text-right text-neutral-300">{s.duration}</td>
                <td className="px-2 py-1 text-right text-white font-bold">
                  {fmtPct(s.siAtStart)}%
                </td>
                <td className="px-2 py-1 text-neutral-500 truncate max-w-[120px]">
                  {s.trigger}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
