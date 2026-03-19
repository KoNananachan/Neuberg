import { useState } from 'react';
import { useTotalReturnSwap } from '../../api/hooks/use-total-return-swap';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const ACCENT = '#f472b6'; // pink-400
const ACCENT_DIM = 'rgba(244,114,182,0.12)';

type Tab = 'EQUITY' | 'CREDIT' | 'FUNDING' | 'COUNTERPARTY';

// ── Formatting helpers ──

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

function fmtNotional(n: number | null | undefined): string {
  if (n == null) return '--';
  return `$${n.toLocaleString()}M`;
}

function fmtRate(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(3);
}

// ── Color helpers ──

function returnColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function spreadColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 100) return 'text-red-400';
  if (n > 50) return 'text-orange-400';
  if (n > 25) return 'text-yellow-400';
  return 'text-green-400';
}

function ratingColor(r: string | null | undefined): string {
  if (!r) return 'text-neutral-500';
  if (r.startsWith('AA')) return 'text-green-400';
  if (r.startsWith('A')) return 'text-sky-400';
  if (r.startsWith('BBB')) return 'text-yellow-400';
  return 'text-orange-400';
}

// ── SVG Icon ──

function TrsSwapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 5h7" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 3l2 2-2 2" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9H5" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M6 7l-2 2 2 2" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  );
}

// ── Main Panel ──

export function TotalReturnSwapPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useTotalReturnSwap();
  const [tab, setTab] = useState<Tab>('EQUITY');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'EQUITY', label: 'EQUITY' },
    { key: 'CREDIT', label: 'CREDIT' },
    { key: 'FUNDING', label: 'FUNDING' },
    { key: 'COUNTERPARTY', label: 'COUNTERPARTY' },
  ];

  return (
    <div className="h-full flex flex-col bg-black font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-pink-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <TrsSwapIcon />
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: ACCENT }}>
            {tr(t, 'trsMonitorTitle', 'TRS Monitor')}
          </span>
        </div>

        <div className="flex items-center gap-0">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className="px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-wider transition-colors"
              style={{
                color: tab === tb.key ? ACCENT : 'rgba(255,255,255,0.3)',
                borderBottom: tab === tb.key ? `1px solid ${ACCENT}` : '1px solid transparent',
                background: tab === tb.key ? ACCENT_DIM : 'transparent',
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-pink-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-[9px] font-mono uppercase animate-pulse" style={{ color: ACCENT }}>
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'trsNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'EQUITY' && <EquityTab data={data} t={t} />}
        {data && tab === 'CREDIT' && <CreditTab data={data} t={t} />}
        {data && tab === 'FUNDING' && <FundingTab data={data} t={t} />}
        {data && tab === 'COUNTERPARTY' && <CounterpartyTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── EQUITY Tab ──

function EquityTab({ data, t }: { data: any; t: TFn }) {
  const equities = data?.equityTrs ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
          {tr(t, 'trsEquityTrs', 'Equity Total Return Swaps')}
        </span>
      </div>

      <div className="grid grid-cols-[72px_52px_52px_52px_60px_52px_44px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'trsUnderlying', 'Underlying')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'trsFinSpread', 'Fin Sprd')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'trs1MReturn', '1M Ret')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'trs3MReturn', '3M Ret')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'trsNotional', 'Notional')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'trsRollDate', 'Roll')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'trsCptyCount', 'Cpty')}
        </span>
      </div>

      {equities.map((e: any) => (
        <div
          key={e.underlying}
          className="grid grid-cols-[72px_52px_52px_52px_60px_52px_44px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>{e.underlying}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(e.financingSpread)}`}>
            {fmtBps(e.financingSpread)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${returnColor(e.return1m)}`}>
            {fmtPct(e.return1m)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${returnColor(e.return3m)}`}>
            {fmtPct(e.return3m)}
          </span>
          <span className="text-[8px] font-mono text-white/80 font-bold text-right">{fmtNotional(e.notional)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{e.rollDate ?? '--'}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{e.counterpartyCount ?? '--'}</span>
        </div>
      ))}

      {equities.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">NO DATA</div>
      )}

      {/* Summary metrics */}
      {data?.equitySummary && (
        <div className="border-t border-border/20">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
              {tr(t, 'trsEquitySummary', 'Equity TRS Summary')}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-px">
            {[
              { label: 'TOTAL NOTIONAL', value: fmtNotional(data.equitySummary?.totalNotional) },
              { label: 'AVG SPREAD', value: `${fmtBps(data.equitySummary?.avgSpread)} bp` },
              { label: 'WTD 1M RETURN', value: fmtPct(data.equitySummary?.wtdReturn1m) },
              { label: 'ACTIVE SWAPS', value: data.equitySummary?.activeCount ?? '--' },
            ].map((m) => (
              <div key={m.label} className="px-3 py-1.5 bg-black hover:bg-pink-400/[0.02] transition-colors">
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{m.label}</div>
                <div className="text-[10px] font-mono font-bold mt-0.5" style={{ color: ACCENT }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CREDIT Tab ──

function CreditTab({ data, t }: { data: any; t: TFn }) {
  const credits = data?.creditTrs ?? [];
  const leverage = data?.leverageMetrics;

  return (
    <>
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
            {tr(t, 'trsCreditTrs', 'Credit Total Return Swaps')}
          </span>
        </div>

        <div className="grid grid-cols-[64px_52px_48px_56px_48px_52px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'trsReference', 'Ref Entity')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'trsCreditFinSprd', 'Fin Sprd')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'trsCredit1MRet', '1M Ret')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'trsCreditNotional', 'Notional')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'trsFundAdv', 'Fnd Adv')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'trsAsw', 'ASW bp')}
          </span>
        </div>

        {credits.map((c: any) => (
          <div
            key={c.reference}
            className="grid grid-cols-[64px_52px_48px_56px_48px_52px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>{c.reference}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(c.financingSpread)}`}>
              {fmtBps(c.financingSpread)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${returnColor(c.return1m)}`}>
              {fmtPct(c.return1m)}
            </span>
            <span className="text-[8px] font-mono text-white/80 font-bold text-right">{fmtNotional(c.notional)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${returnColor(c.fundingAdvantage)}`}>
              {fmtBps(c.fundingAdvantage)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(c.assetSwapSpread)}`}>
              {fmtBps(c.assetSwapSpread)}
            </span>
          </div>
        ))}

        {credits.length === 0 && (
          <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">NO DATA</div>
        )}
      </div>

      {/* Leverage Metrics Cards */}
      {leverage && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
              {tr(t, 'trsLeverageMetrics', 'Leverage Metrics')}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-px">
            {[
              { label: 'GROSS LEVERAGE', value: leverage?.grossLeverage != null ? `${leverage.grossLeverage.toFixed(1)}x` : '--' },
              { label: 'NET LEVERAGE', value: leverage?.netLeverage != null ? `${leverage.netLeverage.toFixed(1)}x` : '--' },
              { label: 'FUNDED / UNFUNDED', value: leverage?.fundedRatio != null ? `${leverage.fundedRatio}%` : '--' },
              { label: 'IG NOTIONAL', value: fmtNotional(leverage?.igNotional) },
              { label: 'HY NOTIONAL', value: fmtNotional(leverage?.hyNotional) },
              { label: 'AVG DURATION', value: leverage?.avgDuration != null ? `${leverage.avgDuration.toFixed(1)}yr` : '--' },
            ].map((m) => (
              <div key={m.label} className="px-3 py-1.5 bg-black hover:bg-pink-400/[0.02] transition-colors">
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{m.label}</div>
                <div className="text-[10px] font-mono font-bold mt-0.5" style={{ color: ACCENT }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── FUNDING Tab ──

function FundingTab({ data, t }: { data: any; t: TFn }) {
  const rates = data?.fundingRates;
  const termRates = data?.termRates ?? [];
  const haircuts = data?.haircuts ?? [];
  const regulatory = data?.regulatoryMetrics;

  return (
    <>
      {/* SOFR & Benchmark Rates */}
      {rates && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
              {tr(t, 'trsFundingRates', 'Funding Rates')}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-px">
            {[
              { label: 'SOFR', value: rates?.sofr != null ? `${fmtRate(rates.sofr)}%` : '--', sub: rates?.sofrChange != null ? fmtBps(rates.sofrChange) : null },
              { label: 'SOFR + SPREAD', value: rates?.sofrPlusSpread != null ? `${fmtRate(rates.sofrPlusSpread)}%` : '--', sub: null },
              { label: 'OVERNIGHT GC', value: rates?.overnightGc != null ? `${fmtRate(rates.overnightGc)}%` : '--', sub: null },
              { label: 'TRS FUNDING', value: rates?.trsFunding != null ? `${fmtRate(rates.trsFunding)}%` : '--', sub: null },
              { label: 'REPO RATE', value: rates?.repoRate != null ? `${fmtRate(rates.repoRate)}%` : '--', sub: null },
              { label: 'LIBOR-SOFR', value: rates?.liborSofrSpread != null ? `${fmtBps(rates.liborSofrSpread)} bp` : '--', sub: null },
            ].map((m) => (
              <div key={m.label} className="px-3 py-1.5 bg-black hover:bg-pink-400/[0.02] transition-colors">
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{m.label}</div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-[10px] font-mono font-bold" style={{ color: ACCENT }}>{m.value}</span>
                  {m.sub && (
                    <span className={`text-[7px] font-mono font-bold ${returnColor(rates?.sofrChange)}`}>
                      {m.sub}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Term Rates */}
      {termRates.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
              {tr(t, 'trsTermRates', 'Term Rates')}
            </span>
          </div>

          <div className="grid grid-cols-[56px_56px_48px_56px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'trsTerm', 'Term')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'trsTermRate', 'Rate %')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'trsTermChg', '\u03941D')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'trsTermSpread', 'Spread')}
            </span>
          </div>

          {termRates.map((r: any) => (
            <div
              key={r.term}
              className="grid grid-cols-[56px_56px_48px_56px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>{r.term}</span>
              <span className="text-[8px] font-mono font-bold text-white text-right">{fmtRate(r.rate)}</span>
              <span className={`text-[8px] font-mono font-bold text-right ${returnColor(r.change1d)}`}>
                {fmtBps(r.change1d)}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(r.spread)}`}>
                {fmtBps(r.spread)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Haircuts by Asset Class */}
      {haircuts.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
              {tr(t, 'trsHaircuts', 'Haircuts by Asset Class')}
            </span>
          </div>

          {haircuts.map((h: any) => (
            <div
              key={h.assetClass}
              className="flex items-center gap-3 px-3 py-[3px] border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors"
            >
              <span className="text-[8px] font-mono font-bold w-20" style={{ color: ACCENT }}>{h.assetClass}</span>
              <div className="flex-1 h-3 bg-white/5 overflow-hidden relative">
                <div
                  style={{ width: `${Math.min(h.haircut ?? 0, 100)}%`, height: '100%', background: ACCENT, opacity: 0.3 }}
                />
                <span className="absolute right-1 top-0 text-[7px] font-mono text-white/60">{h.haircut ?? '--'}%</span>
              </div>
              <span className="text-[7px] font-mono text-neutral-500 w-12 text-right">{h.margin ?? '--'}% IM</span>
            </div>
          ))}
        </div>
      )}

      {/* Regulatory Metrics */}
      {regulatory && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
              {tr(t, 'trsRegulatoryMetrics', 'Regulatory Metrics')}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-px">
            {[
              { label: 'SLR IMPACT', value: regulatory?.slrImpact != null ? `${regulatory.slrImpact.toFixed(2)}%` : '--' },
              { label: 'RWA USAGE', value: regulatory?.rwaUsage != null ? fmtNotional(regulatory.rwaUsage) : '--' },
              { label: 'LCR IMPACT', value: regulatory?.lcrImpact != null ? `${regulatory.lcrImpact.toFixed(1)}%` : '--' },
              { label: 'NSFR IMPACT', value: regulatory?.nsfrImpact != null ? `${regulatory.nsfrImpact.toFixed(1)}%` : '--' },
              { label: 'LEVERAGE RATIO', value: regulatory?.leverageRatio != null ? `${regulatory.leverageRatio.toFixed(2)}%` : '--' },
              { label: 'SA-CCR EAD', value: regulatory?.saCcrEad != null ? fmtNotional(regulatory.saCcrEad) : '--' },
            ].map((m) => (
              <div key={m.label} className="px-3 py-1.5 bg-black hover:bg-pink-400/[0.02] transition-colors">
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{m.label}</div>
                <div className="text-[10px] font-mono font-bold mt-0.5" style={{ color: ACCENT }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!rates && termRates.length === 0 && haircuts.length === 0 && !regulatory && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">NO DATA</div>
      )}
    </>
  );
}

// ── COUNTERPARTY Tab ──

function CounterpartyTab({ data, t }: { data: any; t: TFn }) {
  const dealers = data?.counterpartyExposure ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
          {tr(t, 'trsCptyExposure', 'Counterparty Exposure')}
        </span>
      </div>

      <div className="grid grid-cols-[72px_48px_52px_52px_44px_52px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'trsDealer', 'Dealer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'trsMktShare', 'Mkt Shr')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'trsAvgSpread', 'Avg Sprd')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'trsCreditRating', 'Rating')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'trsCva', 'CVA')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'trsCptyNotional', 'Notional')}
        </span>
      </div>

      {dealers.map((d: any) => (
        <div
          key={d.dealer}
          className="grid grid-cols-[72px_48px_52px_52px_44px_52px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>{d.dealer}</span>
          <span className="text-[8px] font-mono text-white/80 font-bold text-right">
            {d.marketShare != null ? `${d.marketShare.toFixed(1)}%` : '--'}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(d.avgSpread)}`}>
            {fmtBps(d.avgSpread)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${ratingColor(d.creditRating)}`}>
            {d.creditRating ?? '--'}
          </span>
          <span className="text-[8px] font-mono text-white/60 font-bold text-right">
            {d.cvaCharge != null ? `${d.cvaCharge.toFixed(1)}` : '--'}
          </span>
          <span className="text-[8px] font-mono text-white/80 font-bold text-right">{fmtNotional(d.notional)}</span>
        </div>
      ))}

      {dealers.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">NO DATA</div>
      )}

      {/* Market share visualization */}
      {dealers.length > 0 && (
        <div className="border-t border-border/20">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
              {tr(t, 'trsMktShareDist', 'Market Share Distribution')}
            </span>
          </div>

          <div className="px-3 py-2 space-y-1">
            {dealers.map((d: any) => (
              <div key={`bar-${d.dealer}`} className="flex items-center gap-2">
                <span className="text-[7px] font-mono font-bold w-16 text-right truncate" style={{ color: ACCENT }}>
                  {d.dealer}
                </span>
                <div className="flex-1 h-3 bg-white/5 overflow-hidden relative">
                  <div
                    style={{
                      width: `${Math.min(d.marketShare ?? 0, 100)}%`,
                      height: '100%',
                      background: ACCENT,
                      opacity: 0.3,
                    }}
                  />
                  <span className="absolute right-1 top-0 text-[7px] font-mono text-white/50">
                    {d.marketShare != null ? `${d.marketShare.toFixed(1)}%` : '--'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
