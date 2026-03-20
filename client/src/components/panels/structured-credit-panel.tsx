import { useStructuredCredit } from '../../api/hooks/use-structured-credit';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtSize(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}

function fmtBps(n: number): string {
  return `${n.toFixed(0)}bp`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtWal(n: number): string {
  return `${n.toFixed(1)}y`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}`;
}

// ── Color helpers ──

function spreadRiskColor(bps: number): string {
  if (bps <= 80) return 'text-green-400';
  if (bps <= 200) return 'text-cyan-400';
  if (bps <= 500) return 'text-amber-400';
  if (bps <= 1000) return 'text-orange-400';
  return 'text-red-400';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function spreadChangeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function passFailBadge(result: string): { text: string; bg: string } {
  const r = (result ?? '').toUpperCase();
  if (r === 'PASS' || r === 'P') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (r === 'FAIL' || r === 'F') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
}

function trancheColor(tranche: string): string {
  const t = (tranche ?? '').toUpperCase();
  if (t === 'AAA') return 'text-green-400';
  if (t === 'AA') return 'text-emerald-400';
  if (t === 'A') return 'text-cyan-400';
  if (t === 'BBB') return 'text-blue-400';
  if (t === 'BB') return 'text-amber-400';
  if (t === 'B') return 'text-orange-400';
  if (t === 'EQUITY' || t === 'EQ') return 'text-red-400';
  return 'text-neutral-400';
}

function trancheBg(tranche: string): string {
  const t = (tranche ?? '').toUpperCase();
  if (t === 'AAA') return 'bg-green-500/5';
  if (t === 'AA') return 'bg-emerald-500/5';
  if (t === 'A') return 'bg-cyan-500/5';
  if (t === 'BBB') return 'bg-blue-500/5';
  if (t === 'BB') return 'bg-amber-500/5';
  if (t === 'B') return 'bg-orange-500/5';
  if (t === 'EQUITY' || t === 'EQ') return 'bg-red-500/5';
  return '';
}

function defaultRateColor(rate: number): string {
  if (rate <= 1) return 'text-green-400';
  if (rate <= 3) return 'text-amber-400';
  if (rate <= 5) return 'text-orange-400';
  return 'text-red-400';
}

function recoveryColor(rate: number): string {
  if (rate >= 70) return 'text-green-400';
  if (rate >= 50) return 'text-amber-400';
  if (rate >= 30) return 'text-orange-400';
  return 'text-red-400';
}

// ── Main Panel ──

export function StructuredCreditPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useStructuredCredit();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {tr(t, 'scTitle', 'Structured Credit Dashboard')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !d && (
          <div className="text-center py-8">
            <div className="text-red-400 text-[9px] font-mono uppercase mb-2">
              FAILED TO LOAD
            </div>
            <button
              onClick={() => refetch()}
              className="text-[8px] font-mono text-amber-400 hover:text-amber-300 uppercase tracking-wider"
            >
              RETRY
            </button>
          </div>
        )}

        {d && (
          <>
            <CloMarketSection data={d} t={t} />
            <TrancheAnalysisSection data={d} t={t} />
            <MarketOverviewSection data={d} t={t} />
            <DefaultRecoverySection data={d} t={t} />
            <NewIssuanceSection data={d} t={t} />
            <SecondaryTradingSection data={d} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: CLO Market ──

function CloMarketSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const deals = data.cloMarket ?? data.deals ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scCloMarket', 'CLO Market')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_60px_50px_55px_55px_55px_40px_40px_45px_45px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">MANAGER</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">DEAL</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">VNTG</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">SIZE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">AAA</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">BB</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">WAL</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">WARF</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">OC</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">IC</span>
      </div>

      {/* Table Rows */}
      {deals.map((deal: any, idx: number) => {
        const ocStyle = passFailBadge(deal.ocTest ?? deal.oc ?? '');
        const icStyle = passFailBadge(deal.icTest ?? deal.ic ?? '');

        return (
          <div
            key={deal.deal ?? deal.name ?? idx}
            className="grid grid-cols-[1fr_60px_50px_55px_55px_55px_40px_40px_45px_45px] px-3 py-1 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-white truncate">{deal.manager ?? ''}</span>
            <span className="text-[9px] font-mono text-amber-400 truncate">{deal.deal ?? deal.name ?? ''}</span>
            <span className="text-[9px] font-mono text-neutral-400 text-right">{deal.vintage ?? ''}</span>
            <span className="text-[9px] font-mono text-white text-right">{fmtSize(deal.size ?? 0)}</span>
            <span className={`text-[9px] font-mono text-right ${spreadRiskColor(deal.aaaSpread ?? deal.aaa ?? 0)}`}>
              {fmtBps(deal.aaaSpread ?? deal.aaa ?? 0)}
            </span>
            <span className={`text-[9px] font-mono text-right ${spreadRiskColor(deal.bbSpread ?? deal.bb ?? 0)}`}>
              {fmtBps(deal.bbSpread ?? deal.bb ?? 0)}
            </span>
            <span className="text-[9px] font-mono text-neutral-300 text-right">{fmtWal(deal.wal ?? 0)}</span>
            <span className="text-[9px] font-mono text-neutral-300 text-right">{(deal.warf ?? 0).toFixed(0)}</span>
            <span className={`text-[7px] font-mono font-bold text-center px-1 py-px ${ocStyle.text} ${ocStyle.bg}`}>
              {(deal.ocTest ?? deal.oc ?? 'N/A').toString().toUpperCase()}
            </span>
            <span className={`text-[7px] font-mono font-bold text-center px-1 py-px ${icStyle.text} ${icStyle.bg}`}>
              {(deal.icTest ?? deal.ic ?? 'N/A').toString().toUpperCase()}
            </span>
          </div>
        );
      })}

      {deals.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO CLO DATA
        </div>
      )}
    </div>
  );
}

// ── Section 2: Tranche Analysis ──

function TrancheAnalysisSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const tranches = data.trancheAnalysis ?? data.tranches ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scTrancheAnalysis', 'Tranche Analysis — Waterfall')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[60px_80px_70px_65px_75px_80px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">TRANCHE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">BALANCE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">SPREAD</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">PRICE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">SUBORDINATION</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">LOSS-TO-IMPAIR</span>
      </div>

      {/* Waterfall Rows */}
      {tranches.map((tr_: any, idx: number) => {
        const name = tr_.tranche ?? tr_.name ?? '';
        const tColor = trancheColor(name);
        const tBg = trancheBg(name);

        return (
          <div
            key={name || idx}
            className={`grid grid-cols-[60px_80px_70px_65px_75px_80px] px-3 py-1.5 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors ${tBg}`}
          >
            <span className={`text-[9px] font-mono font-bold ${tColor}`}>
              {name.toUpperCase()}
            </span>
            <span className="text-[9px] font-mono text-white text-right">
              {fmtSize(tr_.balance ?? tr_.size ?? 0)}
            </span>
            <span className={`text-[9px] font-mono text-right ${spreadRiskColor(tr_.spread ?? 0)}`}>
              {name.toUpperCase() === 'EQUITY' || name.toUpperCase() === 'EQ'
                ? 'N/A'
                : fmtBps(tr_.spread ?? 0)}
            </span>
            <span className="text-[9px] font-mono text-white text-right">
              {fmtPrice(tr_.price ?? 100)}
            </span>
            <span className="text-[9px] font-mono text-neutral-300 text-right">
              {fmtPct(tr_.subordination ?? 0)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${
              (tr_.lossToImpair ?? 0) <= 5 ? 'text-red-400' :
              (tr_.lossToImpair ?? 0) <= 15 ? 'text-orange-400' :
              (tr_.lossToImpair ?? 0) <= 30 ? 'text-amber-400' : 'text-green-400'
            }`}>
              {fmtPct(tr_.lossToImpair ?? 0)}
            </span>
          </div>
        );
      })}

      {tranches.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO TRANCHE DATA
        </div>
      )}
    </div>
  );
}

// ── Section 3: Market Overview ──

function MarketOverviewSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const overview = data.marketOverview ?? {};

  const metrics = [
    { label: 'CLO OUTSTANDING', value: fmtSize(overview.cloOutstanding ?? 0) },
    { label: 'NEW ISSUANCE YTD', value: fmtSize(overview.newIssuanceYtd ?? 0) },
    { label: 'NEW ISSUANCE MTD', value: fmtSize(overview.newIssuanceMtd ?? 0) },
    { label: 'REFI/RESET VOL', value: fmtSize(overview.refiResetVolume ?? 0) },
  ];

  const indices = overview.indexSpreads ?? overview.indices ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scMarketOverview', 'Market Overview')}
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-px bg-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="bg-black px-2.5 py-2 hover:bg-amber-400/[0.02] transition-colors">
            <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-0.5">
              {m.label}
            </div>
            <div className="text-[11px] font-mono font-bold text-white">
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Index Spreads */}
      {indices.length > 0 && (
        <>
          <div className="px-3 py-1 border-y border-border/10">
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">
              INDEX SPREADS
            </span>
          </div>

          <div className="grid grid-cols-[1fr_70px_60px_60px_60px] px-3 py-1 border-b border-border/20 bg-[#050505]">
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">INDEX</span>
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">SPREAD</span>
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">1D CHG</span>
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">1W CHG</span>
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">1M CHG</span>
          </div>

          {indices.map((idx: any, i: number) => (
            <div
              key={idx.name ?? i}
              className="grid grid-cols-[1fr_70px_60px_60px_60px] px-3 py-1 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors"
            >
              <span className="text-[9px] font-mono font-bold text-white truncate">{idx.name ?? ''}</span>
              <span className={`text-[9px] font-mono text-right ${spreadRiskColor(idx.spread ?? 0)}`}>
                {fmtBps(idx.spread ?? 0)}
              </span>
              <span className={`text-[9px] font-mono text-right ${spreadChangeColor(idx.change1d ?? 0)}`}>
                {fmtChange(idx.change1d ?? 0)}
              </span>
              <span className={`text-[9px] font-mono text-right ${spreadChangeColor(idx.change1w ?? 0)}`}>
                {fmtChange(idx.change1w ?? 0)}
              </span>
              <span className={`text-[9px] font-mono text-right ${spreadChangeColor(idx.change1m ?? 0)}`}>
                {fmtChange(idx.change1m ?? 0)}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Section 4: Default & Recovery ──

function DefaultRecoverySection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const defaults = data.defaultRecovery ?? data.defaults ?? {};
  const defaultRates = defaults.defaultRates ?? [];
  const recoveryRates = defaults.recoveryRates ?? [];
  const stressScenarios = defaults.stressScenarios ?? defaults.stress ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scDefaultRecovery', 'Default & Recovery')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border/10">
        {/* Default Rates */}
        <div className="bg-black">
          <div className="px-2.5 py-1 border-b border-border/10">
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">
              DEFAULT RATES
            </span>
          </div>
          {defaultRates.map((dr: any, i: number) => (
            <div
              key={dr.period ?? dr.name ?? i}
              className="flex items-center justify-between px-2.5 py-1 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors"
            >
              <span className="text-[9px] font-mono text-neutral-400">{dr.period ?? dr.name ?? ''}</span>
              <span className={`text-[9px] font-mono font-bold ${defaultRateColor(dr.rate ?? 0)}`}>
                {fmtPct(dr.rate ?? 0)}
              </span>
            </div>
          ))}
          {defaultRates.length === 0 && (
            <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">NO DATA</div>
          )}
        </div>

        {/* Recovery Rates */}
        <div className="bg-black">
          <div className="px-2.5 py-1 border-b border-border/10">
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">
              RECOVERY RATES
            </span>
          </div>
          {recoveryRates.map((rr: any, i: number) => (
            <div
              key={rr.seniority ?? rr.name ?? i}
              className="flex items-center justify-between px-2.5 py-1 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors"
            >
              <span className="text-[9px] font-mono text-neutral-400">{rr.seniority ?? rr.name ?? ''}</span>
              <span className={`text-[9px] font-mono font-bold ${recoveryColor(rr.rate ?? 0)}`}>
                {fmtPct(rr.rate ?? 0)}
              </span>
            </div>
          ))}
          {recoveryRates.length === 0 && (
            <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">NO DATA</div>
          )}
        </div>
      </div>

      {/* Stress Scenarios */}
      {stressScenarios.length > 0 && (
        <>
          <div className="px-3 py-1 border-y border-border/10">
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">
              STRESS SCENARIOS
            </span>
          </div>

          <div className="grid grid-cols-[1fr_55px_55px_55px_55px_55px_55px] px-3 py-1 border-b border-border/20 bg-[#050505]">
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">SCENARIO</span>
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">AAA</span>
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">AA</span>
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">A</span>
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">BBB</span>
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">BB</span>
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">EQUITY</span>
          </div>

          {stressScenarios.map((ss: any, i: number) => (
            <div
              key={ss.scenario ?? ss.name ?? i}
              className="grid grid-cols-[1fr_55px_55px_55px_55px_55px_55px] px-3 py-1 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors"
            >
              <span className="text-[9px] font-mono font-bold text-white truncate">{ss.scenario ?? ss.name ?? ''}</span>
              <span className={`text-[9px] font-mono text-right ${stressLossColor(ss.aaa ?? 0)}`}>
                {fmtPct(ss.aaa ?? 0)}
              </span>
              <span className={`text-[9px] font-mono text-right ${stressLossColor(ss.aa ?? 0)}`}>
                {fmtPct(ss.aa ?? 0)}
              </span>
              <span className={`text-[9px] font-mono text-right ${stressLossColor(ss.a ?? 0)}`}>
                {fmtPct(ss.a ?? 0)}
              </span>
              <span className={`text-[9px] font-mono text-right ${stressLossColor(ss.bbb ?? 0)}`}>
                {fmtPct(ss.bbb ?? 0)}
              </span>
              <span className={`text-[9px] font-mono text-right ${stressLossColor(ss.bb ?? 0)}`}>
                {fmtPct(ss.bb ?? 0)}
              </span>
              <span className={`text-[9px] font-mono text-right ${stressLossColor(ss.equity ?? 0)}`}>
                {fmtPct(ss.equity ?? 0)}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function stressLossColor(loss: number): string {
  if (loss <= 0) return 'text-green-400';
  if (loss <= 5) return 'text-amber-400';
  if (loss <= 20) return 'text-orange-400';
  return 'text-red-400';
}

// ── Section 5: New Issuance ──

function NewIssuanceSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const pipeline = data.newIssuance ?? data.pipeline ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scNewIssuance', 'New Issuance Pipeline')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_70px_60px_60px_55px_65px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">DEAL / MANAGER</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">SIZE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">AAA GDN</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">PRICING</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">RI</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">STATUS</span>
      </div>

      {/* Table Rows */}
      {pipeline.map((deal: any, idx: number) => (
        <div
          key={deal.deal ?? deal.name ?? idx}
          className="grid grid-cols-[1fr_70px_60px_60px_55px_65px] px-3 py-1.5 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors"
        >
          <div className="min-w-0">
            <div className="text-[9px] font-mono font-bold text-amber-400 truncate">{deal.deal ?? deal.name ?? ''}</div>
            <div className="text-[7px] font-mono text-neutral-600 truncate">{deal.manager ?? ''}</div>
          </div>
          <span className="text-[9px] font-mono text-white text-right">{fmtSize(deal.size ?? 0)}</span>
          <span className={`text-[9px] font-mono text-right ${spreadRiskColor(deal.aaaGuidance ?? deal.aaaSpread ?? 0)}`}>
            {fmtBps(deal.aaaGuidance ?? deal.aaaSpread ?? 0)}
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">{deal.pricingDate ?? deal.pricing ?? ''}</span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">{deal.reinvestmentPeriod ?? deal.ri ?? ''}</span>
          <span className={`text-[7px] font-mono font-bold text-center px-1 py-px ${statusStyle(deal.status ?? '')}`}>
            {(deal.status ?? 'TBD').toUpperCase()}
          </span>
        </div>
      ))}

      {pipeline.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO PIPELINE DATA
        </div>
      )}
    </div>
  );
}

function statusStyle(status: string): string {
  const s = (status ?? '').toUpperCase();
  if (s === 'PRICED' || s === 'CLOSED') return 'text-green-400 bg-green-500/10 border border-green-500/30';
  if (s === 'MARKETING' || s === 'ROADSHOW') return 'text-amber-400 bg-amber-500/10 border border-amber-500/30';
  if (s === 'LAUNCHED') return 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30';
  return 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30';
}

// ── Section 6: Secondary Trading ──

function SecondaryTradingSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const trades = data.secondaryTrading ?? data.recentTrades ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scSecondaryTrading', 'Secondary Trading')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_55px_55px_65px_65px_55px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">BOND / TRANCHE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">RATING</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">PRICE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">SPREAD</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">VOLUME</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">CHG</span>
      </div>

      {/* Table Rows */}
      {trades.map((trade: any, idx: number) => (
        <div
          key={trade.bond ?? trade.name ?? idx}
          className="grid grid-cols-[1fr_55px_55px_65px_65px_55px] px-3 py-1 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors"
        >
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold text-white truncate block">{trade.bond ?? trade.name ?? ''}</span>
            {(trade.tranche ?? trade.class) && (
              <span className={`text-[7px] font-mono ${trancheColor(trade.tranche ?? trade.class ?? '')}`}>
                {(trade.tranche ?? trade.class ?? '').toUpperCase()}
              </span>
            )}
          </div>
          <span className={`text-[9px] font-mono text-right ${trancheColor(trade.rating ?? '')}`}>
            {trade.rating ?? ''}
          </span>
          <span className="text-[9px] font-mono text-white text-right">{fmtPrice(trade.price ?? 0)}</span>
          <span className={`text-[9px] font-mono text-right ${spreadRiskColor(trade.spread ?? 0)}`}>
            {fmtBps(trade.spread ?? 0)}
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">{fmtSize(trade.volume ?? 0)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(trade.priceChange ?? trade.change ?? 0)}`}>
            {fmtChange(trade.priceChange ?? trade.change ?? 0)}
          </span>
        </div>
      ))}

      {trades.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO RECENT TRADES
        </div>
      )}

      {/* Timestamp */}
      {data.timestamp && (
        <div className="px-3 py-1.5 border-t border-border/10">
          <span className="text-[7px] font-mono text-neutral-700">
            Last update: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
