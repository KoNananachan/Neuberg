import { useState, useMemo } from 'react';
import { useFxForward } from '../../api/hooks/use-fx-forward';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Types ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FxForwardData = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForwardTenor = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NdfPair = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CarryAnalytics = any;

// ── Constants ──

const CURRENCY_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF',
  'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP',
];

const TENORS = [
  'O/N', 'T/N', 'S/N', '1W', '2W', '1M', '2M', '3M',
  '6M', '9M', '1Y', '2Y', '3Y', '5Y',
];

type TabMode = 'forwards' | 'carry' | 'ndf' | 'curve';

// ── Formatting helpers ──

function fmtPts(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtRate(n: number | null | undefined, decimals = 5): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}bp`;
}

function fmtSpread(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(1);
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function carryColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 3) return 'text-green-400';
  if (n >= 1) return 'text-teal-400';
  if (n >= 0) return 'text-neutral-400';
  if (n >= -1) return 'text-yellow-400';
  return 'text-red-400';
}

function spreadColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 50) return 'text-red-400';
  if (n > 20) return 'text-yellow-400';
  return 'text-neutral-400';
}

// ── Main Panel ──

export function FxForwardPanel() {
  const t = useT();
  const { data: rawData, isLoading, error } = useFxForward();
  const [tab, setTab] = useState<TabMode>('forwards');
  const [selectedPair, setSelectedPair] = useState<string>(CURRENCY_PAIRS[0]);

  const data = rawData as FxForwardData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-teal-400">
            {tr(t, 'panelFxForward', 'FX Forward Rates')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-teal-400 bg-teal-400/10 border border-teal-400/30">
            FRD
          </span>
        </div>
      </div>

      {/* Currency pair selector */}
      <div className="flex flex-wrap gap-1 px-3 py-1.5 border-b border-border/20 bg-[#030303] shrink-0">
        {CURRENCY_PAIRS.map((pair) => (
          <button
            key={pair}
            onClick={() => setSelectedPair(pair)}
            className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border transition-colors ${
              selectedPair === pair
                ? 'border-teal-400/50 text-teal-400 bg-teal-400/10'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]'
            }`}
          >
            {pair}
          </button>
        ))}
      </div>

      {/* Spot rate display */}
      <SpotRateBar data={data} selectedPair={selectedPair} t={t} />

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 bg-[#050505] shrink-0">
        {(['forwards', 'carry', 'ndf', 'curve'] as TabMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setTab(mode)}
            className={`px-2.5 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
              tab === mode
                ? 'border-teal-400/40 text-teal-400 bg-teal-400/10'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {mode === 'forwards'
              ? tr(t, 'fxfForwards', 'Forwards')
              : mode === 'carry'
                ? tr(t, 'fxfCarry', 'Carry')
                : mode === 'ndf'
                  ? tr(t, 'fxfNdf', 'NDF')
                  : tr(t, 'fxfCurve', 'Curve')}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-teal-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'fxfError', 'Failed to load forward data')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'fxfNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'forwards' && (
          <ForwardPointsTable data={data} selectedPair={selectedPair} t={t} />
        )}
        {data && tab === 'carry' && (
          <CarryAnalyticsSection data={data} selectedPair={selectedPair} t={t} />
        )}
        {data && tab === 'ndf' && (
          <NdfSection data={data} t={t} />
        )}
        {data && tab === 'curve' && (
          <SwapCurveSection data={data} selectedPair={selectedPair} t={t} />
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0 flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral-600">
          {selectedPair} | {TENORS.length} TENORS
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          {data ? 'LIVE' : '---'}
        </span>
      </div>
    </div>
  );
}

// ── Spot Rate Bar ──

function SpotRateBar({
  data,
  selectedPair,
  t,
}: {
  data: FxForwardData | undefined;
  selectedPair: string;
  t: ReturnType<typeof useT>;
}) {
  const spot = data?.spot?.[selectedPair] ?? data?.spot;

  return (
    <div className="border-b border-border/20 shrink-0">
      <div className="grid grid-cols-6 gap-px bg-border/10">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fxfPair', 'Pair')}
          </div>
          <div className="text-[10px] font-mono font-black text-teal-400">
            {selectedPair}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fxfBid', 'Bid')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtRate(spot?.bid)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fxfAsk', 'Ask')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtRate(spot?.ask)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fxfMid', 'Mid')}
          </div>
          <div className="text-[10px] font-mono font-bold text-teal-400">
            {fmtRate(spot?.mid)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fxfSpread', 'Spread')}
          </div>
          <div className="text-[10px] font-mono font-bold text-neutral-400">
            {fmtSpread(spot?.spread)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fxfChange', 'Chg')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${changeColor(spot?.change)}`}>
            {fmtPct(spot?.change)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Forward Points Table ──

function ForwardPointsTable({
  data,
  selectedPair,
  t,
}: {
  data: FxForwardData;
  selectedPair: string;
  t: ReturnType<typeof useT>;
}) {
  const tenors: ForwardTenor[] = useMemo(() => {
    if (!data?.forwards) return [];
    const pairData = data.forwards[selectedPair];
    if (Array.isArray(pairData)) return pairData;
    if (pairData?.tenors && Array.isArray(pairData.tenors)) return pairData.tenors;
    return [];
  }, [data, selectedPair]);

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-teal-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fxfForwardPoints', 'Forward Points')} — {selectedPair}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_56px_56px_68px_68px_56px_64px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'fxfTenor', 'Tenor')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfBidPts', 'Bid Pts')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfAskPts', 'Ask Pts')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfOutBid', 'Out Bid')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfOutAsk', 'Out Ask')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfMidCol', 'Mid')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfImplied', 'Impl Diff')}</span>
      </div>

      {/* Rows */}
      {tenors.length === 0 && (
        <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'fxfNoTenors', 'No tenor data for')} {selectedPair}
        </div>
      )}

      {tenors.map((tenor: ForwardTenor, i: number) => (
        <ForwardRow key={tenor?.tenor ?? tenor?.label ?? i} tenor={tenor} index={i} />
      ))}
    </div>
  );
}

function ForwardRow({ tenor, index }: { tenor: ForwardTenor; index: number }) {
  const label = tenor?.tenor ?? tenor?.label ?? TENORS[index] ?? '-';
  const isKeyTenor = ['1M', '3M', '6M', '1Y'].includes(label);

  return (
    <div
      className={`grid grid-cols-[56px_56px_56px_68px_68px_56px_64px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center ${
        isKeyTenor ? 'bg-teal-400/[0.03]' : ''
      }`}
    >
      <span className={`text-[8px] font-mono font-bold ${isKeyTenor ? 'text-teal-400' : 'text-white'}`}>
        {label}
      </span>
      <span className={`text-[8px] font-mono text-right ${changeColor(tenor?.bidPoints)}`}>
        {fmtPts(tenor?.bidPoints)}
      </span>
      <span className={`text-[8px] font-mono text-right ${changeColor(tenor?.askPoints)}`}>
        {fmtPts(tenor?.askPoints)}
      </span>
      <span className="text-[8px] font-mono font-bold text-neutral-300 text-right">
        {fmtRate(tenor?.outrightBid)}
      </span>
      <span className="text-[8px] font-mono font-bold text-neutral-300 text-right">
        {fmtRate(tenor?.outrightAsk)}
      </span>
      <span className="text-[8px] font-mono font-bold text-teal-400/80 text-right">
        {fmtRate(tenor?.mid)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(tenor?.impliedRateDiff)}`}>
        {fmtBps(tenor?.impliedRateDiff)}
      </span>
    </div>
  );
}

// ── Carry Analytics Section ──

function CarryAnalyticsSection({
  data,
  selectedPair,
  t,
}: {
  data: FxForwardData;
  selectedPair: string;
  t: ReturnType<typeof useT>;
}) {
  const carryData: CarryAnalytics[] = useMemo(() => {
    if (!data?.carry) return [];
    const pairCarry = data.carry[selectedPair];
    if (Array.isArray(pairCarry)) return pairCarry;
    if (pairCarry?.tenors && Array.isArray(pairCarry.tenors)) return pairCarry.tenors;
    return [];
  }, [data, selectedPair]);

  const maxCarry = useMemo(
    () => Math.max(...carryData.map((c: CarryAnalytics) => Math.abs(c?.annualizedReturn ?? 0)), 0.01),
    [carryData],
  );

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-teal-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fxfCarryAnalytics', 'Carry Trade Analytics')} — {selectedPair}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_64px_64px_60px_56px_1fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'fxfTenor', 'Tenor')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfAnnReturn', 'Ann Ret')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfFwdPts', 'Fwd Pts')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfRollCost', 'Roll Cost')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfNetCarry', 'Net')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right pr-1" />
      </div>

      {carryData.length === 0 && (
        <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'fxfNoCarry', 'No carry data')}
        </div>
      )}

      {carryData.map((item: CarryAnalytics, i: number) => {
        const label = item?.tenor ?? TENORS[i] ?? '-';
        const annReturn = item?.annualizedReturn ?? 0;
        const barWidth = maxCarry > 0 ? (Math.abs(annReturn) / maxCarry) * 100 : 0;
        const barColor = annReturn >= 0 ? 'bg-teal-500' : 'bg-red-500';

        return (
          <div
            key={label}
            className="grid grid-cols-[56px_64px_64px_60px_56px_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">{label}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${carryColor(annReturn)}`}>
              {fmtPct(annReturn)}
            </span>
            <span className={`text-[8px] font-mono text-right ${changeColor(item?.forwardPoints)}`}>
              {fmtPts(item?.forwardPoints)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {fmtBps(item?.rollCost)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${carryColor(item?.netCarry)}`}>
              {fmtPct(item?.netCarry)}
            </span>
            <div className="flex justify-end pr-1">
              <div className="w-16 h-[3px] bg-neutral-800 relative">
                <div
                  className={`absolute left-0 top-0 h-full ${barColor}`}
                  style={{ width: `${Math.min(barWidth, 100)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Carry summary */}
      {carryData.length > 0 && (
        <div className="grid grid-cols-3 gap-px bg-border/10 border-t border-border/10">
          {['1M', '3M', '1Y'].map((key) => {
            const item = carryData.find((c: CarryAnalytics) => c?.tenor === key);
            return (
              <div key={key} className="bg-black px-2 py-1.5">
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                  {key} CARRY
                </div>
                <div className={`text-[10px] font-mono font-bold ${carryColor(item?.annualizedReturn)}`}>
                  {fmtPct(item?.annualizedReturn)}
                </div>
                <div className="text-[7px] font-mono text-neutral-600 mt-0.5">
                  Net: {fmtPct(item?.netCarry)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── NDF Section ──

function NdfSection({
  data,
  t,
}: {
  data: FxForwardData;
  t: ReturnType<typeof useT>;
}) {
  const ndfPairs: NdfPair[] = useMemo(() => {
    if (Array.isArray(data?.ndf)) return data.ndf;
    if (data?.ndf?.pairs && Array.isArray(data.ndf.pairs)) return data.ndf.pairs;
    return [];
  }, [data]);

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-teal-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fxfNdfTitle', 'Non-Deliverable Forwards — EM Pairs')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_64px_64px_56px_64px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'fxfPairCol', 'Pair')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfSpotCol', 'Spot')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfNdf1m', 'NDF 1M')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfNdf3m', 'NDF 3M')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfDlvSpread', 'Dlv Sprd')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fxfImplYield', 'Impl Yld')}</span>
      </div>

      {ndfPairs.length === 0 && (
        <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'fxfNoNdf', 'No NDF data available')}
        </div>
      )}

      {ndfPairs.map((pair: NdfPair, i: number) => (
        <div
          key={pair?.pair ?? i}
          className="grid grid-cols-[72px_64px_64px_56px_64px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-teal-400">
            {pair?.pair ?? '-'}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {fmtRate(pair?.spot, 4)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtRate(pair?.ndf1m, 4)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtRate(pair?.ndf3m, 4)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(pair?.deliverableSpread)}`}>
            {fmtBps(pair?.deliverableSpread)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(pair?.impliedYield)}`}>
            {fmtPct(pair?.impliedYield)}
          </span>
        </div>
      ))}

      {/* NDF premium monitor */}
      {ndfPairs.length > 0 && (
        <div className="px-2 py-1.5 border-t border-border/10">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
            {tr(t, 'fxfNdfPremium', 'NDF Premium Monitor')}
          </div>
          <div className="grid grid-cols-4 gap-px bg-border/10">
            {ndfPairs.slice(0, 4).map((pair: NdfPair, i: number) => (
              <div key={pair?.pair ?? i} className="bg-black px-1.5 py-1">
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
                  {pair?.pair ?? '-'}
                </div>
                <div className={`text-[9px] font-mono font-bold ${spreadColor(pair?.deliverableSpread)}`}>
                  {fmtBps(pair?.deliverableSpread)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Swap Curve Visualization ──

function SwapCurveSection({
  data,
  selectedPair,
  t,
}: {
  data: FxForwardData;
  selectedPair: string;
  t: ReturnType<typeof useT>;
}) {
  const curvePoints: ForwardTenor[] = useMemo(() => {
    if (!data?.forwards) return [];
    const pairData = data.forwards[selectedPair];
    if (Array.isArray(pairData)) return pairData;
    if (pairData?.tenors && Array.isArray(pairData.tenors)) return pairData.tenors;
    return [];
  }, [data, selectedPair]);

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-teal-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fxfSwapCurve', 'Forward Points Curve')} — {selectedPair}
        </span>
      </div>

      {curvePoints.length === 0 && (
        <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'fxfNoCurve', 'No curve data')}
        </div>
      )}

      {/* SVG bar chart for forward points progression */}
      {curvePoints.length > 0 && (
        <div className="px-3 pt-2 pb-1">
          <ForwardCurveChart points={curvePoints} />
        </div>
      )}

      {/* Text-based ASCII curve */}
      {curvePoints.length > 0 && (
        <div className="px-3 py-2 border-t border-border/10">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
            {tr(t, 'fxfTextCurve', 'Forward Points Progression')}
          </div>
          <TextCurve points={curvePoints} />
        </div>
      )}

      {/* Curve stats */}
      {curvePoints.length > 0 && <CurveStats points={curvePoints} t={t} />}
    </div>
  );
}

function ForwardCurveChart({ points }: { points: ForwardTenor[] }) {
  const chart = useMemo(() => {
    if (points.length === 0) return null;

    const W = 400;
    const H = 100;
    const PAD_L = 6;
    const PAD_R = 6;
    const PAD_T = 12;
    const PAD_B = 20;

    const midPoints = points.map((p: ForwardTenor) => {
      const bid = p?.bidPoints ?? 0;
      const ask = p?.askPoints ?? 0;
      return (bid + ask) / 2;
    });

    const minPt = Math.min(...midPoints);
    const maxPt = Math.max(...midPoints);
    const range = maxPt - minPt || 1;

    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    const linePoints = midPoints.map((v, i) => {
      const x = PAD_L + (i / (midPoints.length - 1 || 1)) * chartW;
      const y = PAD_T + chartH - ((v - minPt) / range) * chartH;
      return { x, y, value: v, label: points[i]?.tenor ?? points[i]?.label ?? '' };
    });

    const pathD = linePoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const zeroY = minPt <= 0 && maxPt >= 0
      ? PAD_T + chartH - ((0 - minPt) / range) * chartH
      : null;

    return { W, H, PAD_T, PAD_B, PAD_L, linePoints, pathD, zeroY, minPt, maxPt };
  }, [points]);

  if (!chart) return null;

  return (
    <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full" style={{ maxHeight: 110 }}>
      {/* Zero line */}
      {chart.zeroY != null && (
        <line
          x1={chart.PAD_L}
          y1={chart.zeroY}
          x2={chart.W - 6}
          y2={chart.zeroY}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
          strokeDasharray="3,3"
        />
      )}

      {/* Curve line */}
      <path
        d={chart.pathD}
        fill="none"
        stroke="#2dd4bf"
        strokeWidth="1.5"
        opacity={0.8}
      />

      {/* Data points */}
      {chart.linePoints.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="2" fill="#2dd4bf" opacity={0.9} />
          <text
            x={p.x}
            y={chart.H - chart.PAD_B + 12}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={5}
            fontFamily="monospace"
          >
            {p.label.length > 3 ? p.label.slice(0, 3) : p.label}
          </text>
          {i % 2 === 0 && (
            <text
              x={p.x}
              y={p.y - 5}
              textAnchor="middle"
              fill="rgba(45,212,191,0.7)"
              fontSize={5.5}
              fontFamily="monospace"
            >
              {p.value.toFixed(1)}
            </text>
          )}
        </g>
      ))}

      {/* Min/Max labels */}
      <text x={chart.PAD_L} y={chart.PAD_T - 3} fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">
        {chart.maxPt.toFixed(1)}
      </text>
      <text x={chart.PAD_L} y={chart.H - chart.PAD_B - 2} fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">
        {chart.minPt.toFixed(1)}
      </text>
    </svg>
  );
}

function TextCurve({ points }: { points: ForwardTenor[] }) {
  const BAR_WIDTH = 20;

  const midPoints = useMemo(() => {
    return points.map((p: ForwardTenor) => {
      const bid = p?.bidPoints ?? 0;
      const ask = p?.askPoints ?? 0;
      return { label: p?.tenor ?? p?.label ?? '-', value: (bid + ask) / 2 };
    });
  }, [points]);

  const minVal = Math.min(...midPoints.map((m) => m.value));
  const maxVal = Math.max(...midPoints.map((m) => m.value));
  const range = maxVal - minVal || 1;

  return (
    <div className="font-mono text-[8px] space-y-px">
      {midPoints.map((pt, i) => {
        const normalized = (pt.value - minVal) / range;
        const barLen = Math.round(normalized * BAR_WIDTH);
        const bar = '\u2588'.repeat(Math.max(barLen, 1));
        const pad = ' '.repeat(BAR_WIDTH - Math.max(barLen, 1));

        return (
          <div key={i} className="flex items-center gap-1 leading-none">
            <span className="text-neutral-500 w-8 text-right shrink-0">{pt.label}</span>
            <span className="text-neutral-700 shrink-0">|</span>
            <span className="text-teal-400/60 whitespace-pre">{bar}{pad}</span>
            <span className={`shrink-0 ${changeColor(pt.value)}`}>
              {fmtPts(pt.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CurveStats({
  points,
  t,
}: {
  points: ForwardTenor[];
  t: ReturnType<typeof useT>;
}) {
  const stats = useMemo(() => {
    const midPoints = points.map((p: ForwardTenor) => {
      const bid = p?.bidPoints ?? 0;
      const ask = p?.askPoints ?? 0;
      return (bid + ask) / 2;
    });

    const min = Math.min(...midPoints);
    const max = Math.max(...midPoints);
    const avg = midPoints.reduce((a, b) => a + b, 0) / midPoints.length;

    const shortEnd = midPoints.slice(0, 4);
    const longEnd = midPoints.slice(-4);
    const shortAvg = shortEnd.length > 0 ? shortEnd.reduce((a, b) => a + b, 0) / shortEnd.length : 0;
    const longAvg = longEnd.length > 0 ? longEnd.reduce((a, b) => a + b, 0) / longEnd.length : 0;
    const slope = longAvg - shortAvg;

    return { min, max, avg, slope };
  }, [points]);

  return (
    <div className="grid grid-cols-4 gap-px bg-border/10 border-t border-border/10">
      <div className="bg-black px-2 py-1.5">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'fxfMin', 'Min')}
        </div>
        <div className={`text-[10px] font-mono font-bold ${changeColor(stats.min)}`}>
          {fmtPts(stats.min)}
        </div>
      </div>
      <div className="bg-black px-2 py-1.5">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'fxfMax', 'Max')}
        </div>
        <div className={`text-[10px] font-mono font-bold ${changeColor(stats.max)}`}>
          {fmtPts(stats.max)}
        </div>
      </div>
      <div className="bg-black px-2 py-1.5">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'fxfAvg', 'Avg')}
        </div>
        <div className={`text-[10px] font-mono font-bold ${changeColor(stats.avg)}`}>
          {fmtPts(stats.avg)}
        </div>
      </div>
      <div className="bg-black px-2 py-1.5">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'fxfSlope', 'Slope')}
        </div>
        <div className={`text-[10px] font-mono font-bold ${changeColor(stats.slope)}`}>
          {fmtPts(stats.slope)}
        </div>
      </div>
    </div>
  );
}
