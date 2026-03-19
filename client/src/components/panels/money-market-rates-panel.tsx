import { Landmark, RefreshCw } from 'lucide-react';
import { useMoneyMarketRates } from '../../api/hooks/use-money-market-rates';

// ── Fallback Data ──

const FALLBACK_DATA = {
  asOf: '2026-03-19T15:30:00Z',
  fedFundsTarget: { lower: 4.25, upper: 4.50 },
  overnightRates: [
    { name: 'SOFR', rate: 4.30, change: -0.2, prior: 4.32, percentile1Y: 62 },
    { name: 'EFFR', rate: 4.33, change: 0.0, prior: 4.33, percentile1Y: 55 },
    { name: 'OBFR', rate: 4.32, change: -0.1, prior: 4.33, percentile1Y: 58 },
    { name: 'TGCR', rate: 4.29, change: -0.3, prior: 4.32, percentile1Y: 60 },
    { name: 'BGCR', rate: 4.30, change: -0.1, prior: 4.31, percentile1Y: 61 },
  ],
  tbillYields: [
    { tenor: '4W', yield: 4.28, discountRate: 4.22, investmentRate: 4.31, change: -0.5 },
    { tenor: '8W', yield: 4.30, discountRate: 4.24, investmentRate: 4.34, change: -0.3 },
    { tenor: '13W', yield: 4.32, discountRate: 4.25, investmentRate: 4.37, change: 0.2 },
    { tenor: '17W', yield: 4.33, discountRate: 4.26, investmentRate: 4.38, change: 0.4 },
    { tenor: '26W', yield: 4.31, discountRate: 4.23, investmentRate: 4.38, change: -0.8 },
    { tenor: '52W', yield: 4.18, discountRate: 4.02, investmentRate: 4.30, change: -1.2 },
  ],
  repoMarket: {
    overnightRepo: 4.30,
    overnightRepoChange: -0.2,
    termRepos: [
      { tenor: '1W', rate: 4.31 },
      { tenor: '2W', rate: 4.32 },
      { tenor: '1M', rate: 4.33 },
      { tenor: '3M', rate: 4.30 },
    ],
    rrpVolume: 148.5,
    rrpCounterparties: 52,
    rrpRate: 4.25,
  },
  commercialPaper: [
    { name: 'AA Financial CP', tenors: [{ tenor: 'O/N', rate: 4.35 }, { tenor: '1M', rate: 4.38 }, { tenor: '3M', rate: 4.40 }] },
    { name: 'AA Non-Fin CP', tenors: [{ tenor: 'O/N', rate: 4.37 }, { tenor: '1M', rate: 4.42 }, { tenor: '3M', rate: 4.45 }] },
    { name: 'Certificates of Deposit', tenors: [{ tenor: '1M', rate: 4.36 }, { tenor: '3M', rate: 4.39 }, { tenor: '6M', rate: 4.35 }] },
  ],
  globalReferenceRates: [
    { name: 'SOFR 1M Term', rate: 4.31, change: -0.3, currency: 'USD' },
    { name: 'SOFR 3M Term', rate: 4.28, change: -0.5, currency: 'USD' },
    { name: 'SOFR 6M Term', rate: 4.22, change: -1.1, currency: 'USD' },
    { name: 'EURIBOR 3M', rate: 2.65, change: -0.8, currency: 'EUR' },
    { name: 'EURIBOR 6M', rate: 2.58, change: -1.2, currency: 'EUR' },
    { name: 'SONIA', rate: 4.45, change: 0.0, currency: 'GBP' },
    { name: 'TONAR', rate: 0.23, change: 0.1, currency: 'JPY' },
  ],
  fedFundsFutures: [
    { contract: 'Apr 2026', impliedRate: 4.34, cutProb: 12.5, hikeProb: 0.0, holdProb: 87.5 },
    { contract: 'May 2026', impliedRate: 4.30, cutProb: 28.4, hikeProb: 0.0, holdProb: 71.6 },
    { contract: 'Jun 2026', impliedRate: 4.22, cutProb: 54.8, hikeProb: 0.0, holdProb: 45.2 },
    { contract: 'Jul 2026', impliedRate: 4.15, cutProb: 68.2, hikeProb: 0.0, holdProb: 31.8 },
    { contract: 'Sep 2026', impliedRate: 4.02, cutProb: 82.6, hikeProb: 0.0, holdProb: 17.4 },
    { contract: 'Dec 2026', impliedRate: 3.80, cutProb: 94.1, hikeProb: 0.0, holdProb: 5.9 },
  ],
};

// ── Formatting helpers ──

function fmtRate(n: number): string {
  return n.toFixed(2);
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtVol(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}T`;
  return `$${n.toFixed(1)}B`;
}

// ── Color helpers ──

function bpsColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function probColor(prob: number): string {
  if (prob >= 70) return 'text-green-400';
  if (prob >= 40) return 'text-yellow-400';
  if (prob >= 15) return 'text-orange-400';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function MoneyMarketRatesPanel() {
  const { data: rawData, isLoading, refetch } = useMoneyMarketRates();
  const data = rawData || FALLBACK_DATA;

  const sofrRate = data.overnightRates.find((r: any) => r.name === 'SOFR');
  const effrRate = data.overnightRates.find((r: any) => r.name === 'EFFR');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Landmark className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            Money Market Rates
          </span>
        </div>
        <div className="flex items-center gap-2">
          {sofrRate && (
            <span className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30">
              SOFR {fmtRate(sofrRate.rate)}%
            </span>
          )}
          {effrRate && (
            <span className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-neutral-400 bg-neutral-500/10 border border-neutral-500/30">
              FF {fmtRate(data.fedFundsTarget.lower)}–{fmtRate(data.fedFundsTarget.upper)}%
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto no-scrollbar text-[9px] font-mono">
        {isLoading && !rawData && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {data && (
          <>
            {/* Section 1: Key Overnight Rates */}
            <OvernightRatesSection rates={data.overnightRates} />

            {/* Section 2: T-Bill Yields */}
            <TBillYieldsSection yields={data.tbillYields} />

            {/* Section 3: Repo Market */}
            <RepoMarketSection repo={data.repoMarket} />

            {/* Section 4: Commercial Paper & CD Rates */}
            <CommercialPaperSection instruments={data.commercialPaper} />

            {/* Section 5: Global Reference Rates */}
            <GlobalRatesSection rates={data.globalReferenceRates} />

            {/* Section 6: Fed Funds Futures */}
            <FedFundsFuturesSection contracts={data.fedFundsFutures} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section: Key Overnight Rates ──

function OvernightRatesSection({ rates }: { rates: any[] }) {
  return (
    <div className="border-b border-amber-400/30">
      <div className="flex items-center gap-1.5 px-3 py-1 bg-[#050505]">
        <div className="w-1 h-1 bg-amber-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-amber-400">
          Key Overnight Rates
        </span>
      </div>
      <div className="grid grid-cols-5 gap-px bg-border/10">
        {rates.map((r: any) => (
          <div key={r.name} className="bg-black px-2 py-1.5 hover:bg-amber-400/[0.02] transition-colors">
            <div className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 mb-0.5">
              {r.name}
            </div>
            <div className="text-[13px] font-black text-white tabular-nums leading-tight">
              {fmtRate(r.rate)}%
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[8px] font-bold tabular-nums ${bpsColor(r.change)}`}>
                {fmtBps(r.change)}bp
              </span>
              <span className="text-[7px] text-neutral-600 tabular-nums">
                Prior {fmtRate(r.prior)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section: T-Bill Yields ──

function TBillYieldsSection({ yields }: { yields: any[] }) {
  return (
    <div className="border-b border-amber-400/30">
      <div className="flex items-center gap-1.5 px-3 py-1 bg-[#050505]">
        <div className="w-1 h-1 bg-amber-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-amber-400">
          Treasury Bill Yields
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[48px_1fr_1fr_1fr_56px] gap-0 px-3 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Tenor</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Yield</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Disc Rate</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Inv Rate</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Chg (bp)</span>
      </div>

      {/* Rows */}
      {yields.map((y: any) => (
        <div
          key={y.tenor}
          className="grid grid-cols-[48px_1fr_1fr_1fr_56px] gap-0 px-3 py-[3px] border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-bold text-amber-400/80">{y.tenor}</span>
          <span className="text-[8px] text-neutral-300 text-right tabular-nums">{fmtRate(y.yield)}%</span>
          <span className="text-[8px] text-neutral-300 text-right tabular-nums">{fmtRate(y.discountRate)}%</span>
          <span className="text-[8px] text-neutral-300 text-right tabular-nums">{fmtRate(y.investmentRate)}%</span>
          <span className={`text-[8px] font-bold text-right tabular-nums ${bpsColor(y.change)}`}>
            {fmtBps(y.change)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Repo Market ──

function RepoMarketSection({ repo }: { repo: any }) {
  return (
    <div className="border-b border-amber-400/30">
      <div className="flex items-center gap-1.5 px-3 py-1 bg-[#050505]">
        <div className="w-1 h-1 bg-amber-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-amber-400">
          Repo Market
        </span>
      </div>

      {/* Overnight + RRP summary */}
      <div className="grid grid-cols-3 gap-px bg-border/10">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">O/N Repo</div>
          <div className="text-[12px] font-black text-white tabular-nums">{fmtRate(repo.overnightRepo)}%</div>
          <span className={`text-[8px] font-bold tabular-nums ${bpsColor(repo.overnightRepoChange)}`}>
            {fmtBps(repo.overnightRepoChange)}bp
          </span>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">RRP Vol</div>
          <div className="text-[12px] font-black text-white tabular-nums">{fmtVol(repo.rrpVolume)}</div>
          <span className="text-[8px] text-neutral-500 tabular-nums">{repo.rrpCounterparties} cpty</span>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">RRP Rate</div>
          <div className="text-[12px] font-black text-white tabular-nums">{fmtRate(repo.rrpRate)}%</div>
          <span className="text-[8px] text-neutral-600">ON RRP</span>
        </div>
      </div>

      {/* Term repo rates */}
      <div className="flex gap-0 border-t border-border/20">
        {repo.termRepos.map((tr: any) => (
          <div key={tr.tenor} className="flex-1 px-2 py-1 border-r border-border/20 last:border-r-0 hover:bg-amber-400/[0.02] transition-colors">
            <div className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">{tr.tenor}</div>
            <div className="text-[9px] font-bold text-neutral-300 tabular-nums">{fmtRate(tr.rate)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section: Commercial Paper & CD Rates ──

function CommercialPaperSection({ instruments }: { instruments: any[] }) {
  return (
    <div className="border-b border-amber-400/30">
      <div className="flex items-center gap-1.5 px-3 py-1 bg-[#050505]">
        <div className="w-1 h-1 bg-amber-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-amber-400">
          Commercial Paper & CD Rates
        </span>
      </div>

      {instruments.map((inst: any) => (
        <div key={inst.name} className="border-b border-border/20 last:border-b-0">
          <div className="px-3 py-0.5 bg-[#030303]">
            <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">{inst.name}</span>
          </div>
          <div className="flex gap-0">
            {inst.tenors.map((t: any) => (
              <div key={t.tenor} className="flex-1 px-2 py-1 border-r border-border/20 last:border-r-0 hover:bg-amber-400/[0.02] transition-colors">
                <div className="text-[7px] text-neutral-500 uppercase">{t.tenor}</div>
                <div className="text-[9px] font-bold text-neutral-300 tabular-nums">{fmtRate(t.rate)}%</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section: Global Reference Rates ──

function GlobalRatesSection({ rates }: { rates: any[] }) {
  return (
    <div className="border-b border-amber-400/30">
      <div className="flex items-center gap-1.5 px-3 py-1 bg-[#050505]">
        <div className="w-1 h-1 bg-amber-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-amber-400">
          Global Reference Rates
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_40px_56px_56px] gap-0 px-3 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Rate</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-center">CCY</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Level</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Chg (bp)</span>
      </div>

      {rates.map((r: any) => (
        <div
          key={r.name}
          className="grid grid-cols-[1fr_40px_56px_56px] gap-0 px-3 py-[3px] border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-bold text-neutral-300 truncate">{r.name}</span>
          <span className="text-[7px] text-neutral-500 text-center uppercase">{r.currency}</span>
          <span className="text-[8px] text-neutral-300 text-right tabular-nums">{fmtRate(r.rate)}%</span>
          <span className={`text-[8px] font-bold text-right tabular-nums ${bpsColor(r.change)}`}>
            {fmtBps(r.change)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Fed Funds Futures ──

function FedFundsFuturesSection({ contracts }: { contracts: any[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 py-1 bg-[#050505]">
        <div className="w-1 h-1 bg-amber-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-amber-400">
          Fed Funds Futures
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_56px_56px_56px_56px] gap-0 px-3 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500">Contract</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Impl Rate</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Cut %</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Hold %</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-neutral-500 text-right">Hike %</span>
      </div>

      {contracts.map((c: any) => (
        <div
          key={c.contract}
          className="grid grid-cols-[72px_56px_56px_56px_56px] gap-0 px-3 py-[3px] border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-bold text-neutral-300">{c.contract}</span>
          <span className="text-[8px] text-neutral-300 text-right tabular-nums">{fmtRate(c.impliedRate)}%</span>
          <span className={`text-[8px] font-bold text-right tabular-nums ${probColor(c.cutProb)}`}>
            {c.cutProb.toFixed(1)}
          </span>
          <span className="text-[8px] text-neutral-400 text-right tabular-nums">
            {c.holdProb.toFixed(1)}
          </span>
          <span className={`text-[8px] font-bold text-right tabular-nums ${c.hikeProb > 0 ? 'text-red-400' : 'text-neutral-600'}`}>
            {c.hikeProb.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}
