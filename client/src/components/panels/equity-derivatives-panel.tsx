import { Activity } from 'lucide-react';
import { useEquityDerivatives } from '../../api/hooks/use-equity-derivatives';

// ── Fallback data ──

const FALLBACK_DATA = {
  vix: 18.42,
  vixChange: -0.87,
  vixChangePercent: -4.51,
  putCallRatio: 0.82,
  totalVolume: 42_850_000,
  marketOverview: {
    impliedCorrelation: 0.38,
    realizedVol30d: 14.7,
    impliedVol30d: 18.9,
    skewIndex: 128.5,
  },
  optionsFlow: [
    { underlying: 'SPY', direction: 'CALL', strike: 520, expiry: '2026-04-18', volume: 85420, premium: 4_250_000, iv: 19.2, sentiment: 'Bullish', flowType: 'Sweep' },
    { underlying: 'QQQ', direction: 'PUT', strike: 440, expiry: '2026-04-18', volume: 62100, premium: 3_180_000, iv: 22.8, sentiment: 'Bearish', flowType: 'Block' },
    { underlying: 'NVDA', direction: 'CALL', strike: 950, expiry: '2026-05-16', volume: 48300, premium: 8_920_000, iv: 52.1, sentiment: 'Bullish', flowType: 'Sweep' },
    { underlying: 'AAPL', direction: 'PUT', strike: 170, expiry: '2026-04-25', volume: 35600, premium: 1_450_000, iv: 24.3, sentiment: 'Bearish', flowType: 'Split' },
    { underlying: 'TSLA', direction: 'CALL', strike: 280, expiry: '2026-05-16', volume: 72800, premium: 6_340_000, iv: 61.7, sentiment: 'Bullish', flowType: 'Block' },
    { underlying: 'META', direction: 'CALL', strike: 540, expiry: '2026-04-18', volume: 28900, premium: 2_780_000, iv: 31.5, sentiment: 'Neutral', flowType: 'Sweep' },
    { underlying: 'AMZN', direction: 'PUT', strike: 185, expiry: '2026-04-25', volume: 41200, premium: 1_920_000, iv: 28.9, sentiment: 'Bearish', flowType: 'Block' },
    { underlying: 'MSFT', direction: 'CALL', strike: 430, expiry: '2026-05-16', volume: 33500, premium: 2_150_000, iv: 22.1, sentiment: 'Bullish', flowType: 'Split' },
  ],
  volSurface: {
    tenors: ['1W', '2W', '1M', '2M', '3M', '6M', '1Y'],
    strikes: ['90%', '95%', '97.5%', 'ATM', '102.5%', '105%', '110%'],
    ivMatrix: [
      [28.1, 24.2, 22.1, 19.8, 18.5, 17.9, 17.2],
      [26.3, 22.8, 20.9, 18.6, 17.4, 16.8, 16.3],
      [24.8, 21.5, 19.8, 17.9, 16.8, 16.2, 15.8],
      [23.2, 20.4, 18.9, 17.2, 16.3, 15.8, 15.4],
      [21.8, 19.5, 18.1, 16.7, 15.9, 15.4, 15.1],
      [20.9, 18.8, 17.5, 16.2, 15.5, 15.1, 14.8],
      [19.5, 17.6, 16.5, 15.4, 14.8, 14.5, 14.2],
    ],
  },
  putCallRatios: [
    { index: 'SPX', pcRatio: 1.24, callVol: 1_250_000, putVol: 1_550_000 },
    { index: 'NDX', pcRatio: 0.89, callVol: 680_000, putVol: 605_200 },
    { index: 'RUT', pcRatio: 1.42, callVol: 320_000, putVol: 454_400 },
    { index: 'DJX', pcRatio: 1.08, callVol: 185_000, putVol: 199_800 },
    { index: 'VIX', pcRatio: 0.67, callVol: 890_000, putVol: 596_300 },
  ],
  sectorVolatility: [
    { sector: 'Technology', iv30d: 28.4, rv20d: 22.1, spread: 6.3 },
    { sector: 'Healthcare', iv30d: 22.8, rv20d: 18.5, spread: 4.3 },
    { sector: 'Financials', iv30d: 19.2, rv20d: 16.8, spread: 2.4 },
    { sector: 'Energy', iv30d: 32.5, rv20d: 29.8, spread: 2.7 },
    { sector: 'Consumer Disc.', iv30d: 25.1, rv20d: 21.4, spread: 3.7 },
    { sector: 'Industrials', iv30d: 20.8, rv20d: 18.2, spread: 2.6 },
    { sector: 'Utilities', iv30d: 15.3, rv20d: 13.9, spread: 1.4 },
    { sector: 'Materials', iv30d: 24.6, rv20d: 22.1, spread: 2.5 },
  ],
  termStructure: [
    { tenor: '1W', iv: 16.8 },
    { tenor: '2W', iv: 17.2 },
    { tenor: '1M', iv: 17.9 },
    { tenor: '2M', iv: 18.6 },
    { tenor: '3M', iv: 19.2 },
    { tenor: '6M', iv: 20.1 },
    { tenor: '9M', iv: 20.8 },
    { tenor: '1Y', iv: 21.4 },
  ],
};

// ── Formatting helpers ──

function fmtCompact(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toFixed(0);
}

function fmtPremium(n: number): string {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toFixed(0);
}

function vixColor(level: number): string {
  if (level >= 30) return 'text-red-400';
  if (level >= 20) return 'text-yellow-400';
  return 'text-emerald-400';
}

function ivHeatColor(iv: number): string {
  // Low IV (14-18): cool cyan, Mid (18-24): warm, High (24+): hot
  if (iv <= 15) return 'bg-cyan-900/40 text-cyan-300';
  if (iv <= 17) return 'bg-cyan-800/40 text-cyan-200';
  if (iv <= 19) return 'bg-cyan-600/30 text-cyan-100';
  if (iv <= 21) return 'bg-yellow-700/30 text-yellow-200';
  if (iv <= 23) return 'bg-orange-700/30 text-orange-200';
  if (iv <= 26) return 'bg-orange-600/30 text-orange-100';
  return 'bg-red-700/30 text-red-200';
}

// ── Main Panel ──

export function EquityDerivativesPanel() {
  const { data: liveData } = useEquityDerivatives();
  const data = liveData || FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-cyan-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            Equity Derivatives
          </span>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-mono">
          <span className="text-neutral-500">VIX</span>
          <span className={`font-bold tabular-nums ${vixColor(data.vix)}`}>
            {data.vix.toFixed(2)}
          </span>
          <span className="text-neutral-500">P/C</span>
          <span className="font-bold tabular-nums text-neutral-300">{data.putCallRatio.toFixed(2)}</span>
          <span className="text-neutral-500">VOL</span>
          <span className="font-bold tabular-nums text-neutral-300">{fmtCompact(data.totalVolume)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* ── Market Overview Stats Bar ── */}
        <div className="px-3 py-2 border-b border-cyan-400/30 bg-[#020808]">
          <div className="flex items-center gap-1 mb-1.5">
            <div className="w-1 h-1 bg-cyan-400" />
            <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
              Market Overview
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'VIX', value: data.vix.toFixed(2), sub: `${data.vixChange >= 0 ? '+' : ''}${data.vixChange.toFixed(2)}`, subColor: data.vixChange >= 0 ? 'text-red-400' : 'text-emerald-400' },
              { label: 'Impl Corr', value: data.marketOverview.impliedCorrelation.toFixed(2), sub: null, subColor: '' },
              { label: 'RV 30d', value: data.marketOverview.realizedVol30d.toFixed(1) + '%', sub: null, subColor: '' },
              { label: 'IV 30d', value: data.marketOverview.impliedVol30d.toFixed(1) + '%', sub: null, subColor: '' },
              { label: 'Skew', value: data.marketOverview.skewIndex.toFixed(1), sub: null, subColor: '' },
            ].map((item: any) => (
              <div key={item.label} className="text-center">
                <div className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">{item.label}</div>
                <div className="text-[11px] font-mono font-bold tabular-nums text-white">{item.value}</div>
                {item.sub && <div className={`text-[7px] font-mono tabular-nums ${item.subColor}`}>{item.sub}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Notable Options Flow ── */}
        <div className="border-b border-cyan-400/30">
          <div className="px-3 py-1.5">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-cyan-400" />
              <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
                Notable Options Flow
              </span>
            </div>
          </div>
          {/* Table header */}
          <div className="grid grid-cols-[48px_38px_48px_52px_44px_52px_32px_48px_40px] px-3 py-1 border-b border-border/20 text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">
            <span>Sym</span>
            <span>Dir</span>
            <span className="text-right">Strike</span>
            <span className="text-right">Expiry</span>
            <span className="text-right">Vol</span>
            <span className="text-right">Prem</span>
            <span className="text-right">IV</span>
            <span className="text-center">Sent</span>
            <span className="text-center">Flow</span>
          </div>
          {data.optionsFlow.map((flow: any, i: any) => (
            <div
              key={`${flow.underlying}-${flow.strike}-${i}`}
              className="grid grid-cols-[48px_38px_48px_52px_44px_52px_32px_48px_40px] px-3 py-1 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors items-center text-[9px] font-mono"
            >
              <span className="font-bold text-cyan-400">{flow.underlying}</span>
              <span>
                <span className={`px-1 py-[1px] text-[7px] font-bold uppercase ${
                  flow.direction === 'CALL'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-red-500/15 text-red-400'
                }`}>
                  {flow.direction}
                </span>
              </span>
              <span className="text-right tabular-nums text-neutral-300">{flow.strike}</span>
              <span className="text-right tabular-nums text-neutral-300">
                {new Date(flow.expiry).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-right tabular-nums text-neutral-300">{fmtCompact(flow.volume)}</span>
              <span className="text-right tabular-nums text-neutral-300">{fmtPremium(flow.premium)}</span>
              <span className="text-right tabular-nums text-neutral-300">{flow.iv.toFixed(0)}%</span>
              <span className="text-center">
                <span className={`px-1 py-[1px] text-[7px] font-bold ${
                  flow.sentiment === 'Bullish' ? 'text-emerald-400'
                  : flow.sentiment === 'Bearish' ? 'text-red-400'
                  : 'text-yellow-400'
                }`}>
                  {flow.sentiment.slice(0, 4).toUpperCase()}
                </span>
              </span>
              <span className="text-center">
                <span className="px-1 py-[1px] text-[7px] font-bold text-cyan-400/70">
                  {flow.flowType}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* ── Volatility Surface Heatmap (SPX) ── */}
        <div className="border-b border-cyan-400/30">
          <div className="px-3 py-1.5">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-cyan-400" />
              <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
                SPX Volatility Surface
              </span>
            </div>
          </div>
          <div className="px-3 pb-2 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-left py-1 pr-2">Tenor</th>
                  {data.volSurface.strikes.map((strike: any) => (
                    <th key={strike} className="text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500 text-center py-1 px-1 min-w-[36px]">
                      {strike}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.volSurface.tenors.map((tenor: any, ti: any) => (
                  <tr key={tenor} className="border-t border-border/20 hover:bg-cyan-400/[0.02]">
                    <td className="text-[8px] font-mono font-bold text-neutral-400 py-1 pr-2">{tenor}</td>
                    {data.volSurface.ivMatrix[ti].map((iv: any, si: any) => (
                      <td key={`${ti}-${si}`} className={`text-center py-1 px-1 text-[8px] font-mono tabular-nums font-bold ${ivHeatColor(iv)}`}>
                        {iv.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Index Put/Call Ratios ── */}
        <div className="border-b border-cyan-400/30">
          <div className="px-3 py-1.5">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-cyan-400" />
              <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
                Index Put/Call Ratios
              </span>
            </div>
          </div>
          <div className="grid grid-cols-[48px_56px_64px_64px] px-3 py-1 border-b border-border/20 text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">
            <span>Index</span>
            <span className="text-right">P/C</span>
            <span className="text-right">Call Vol</span>
            <span className="text-right">Put Vol</span>
          </div>
          {data.putCallRatios.map((row: any) => (
            <div
              key={row.index}
              className="grid grid-cols-[48px_56px_64px_64px] px-3 py-1 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors items-center text-[9px] font-mono"
            >
              <span className="font-bold text-cyan-400">{row.index}</span>
              <span className={`text-right tabular-nums font-bold ${row.pcRatio > 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                {row.pcRatio.toFixed(2)}
              </span>
              <span className="text-right tabular-nums text-neutral-300">{fmtCompact(row.callVol)}</span>
              <span className="text-right tabular-nums text-neutral-300">{fmtCompact(row.putVol)}</span>
            </div>
          ))}
        </div>

        {/* ── Sector Volatility ── */}
        <div className="border-b border-cyan-400/30">
          <div className="px-3 py-1.5">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-cyan-400" />
              <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
                Sector Volatility
              </span>
            </div>
          </div>
          <div className="grid grid-cols-[80px_48px_48px_56px] px-3 py-1 border-b border-border/20 text-[7px] font-bold font-mono uppercase tracking-wider text-neutral-500">
            <span>Sector</span>
            <span className="text-right">IV 30d</span>
            <span className="text-right">RV 20d</span>
            <span className="text-right">Spread</span>
          </div>
          {data.sectorVolatility.map((row: any) => (
            <div
              key={row.sector}
              className="grid grid-cols-[80px_48px_48px_56px] px-3 py-1 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors items-center text-[9px] font-mono"
            >
              <span className="text-neutral-300 truncate">{row.sector}</span>
              <span className="text-right tabular-nums text-neutral-300">{row.iv30d.toFixed(1)}%</span>
              <span className="text-right tabular-nums text-neutral-300">{row.rv20d.toFixed(1)}%</span>
              <span className={`text-right tabular-nums font-bold ${row.spread >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {row.spread >= 0 ? '+' : ''}{row.spread.toFixed(1)}
              </span>
            </div>
          ))}
        </div>

        {/* ── Vol Term Structure ── */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-1 mb-2">
            <div className="w-1 h-1 bg-cyan-400" />
            <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
              Vol Term Structure
            </span>
          </div>
          {(() => {
            const maxIV = Math.max(...data.termStructure.map((p: any) => p.iv));
            const barScale = maxIV > 0 ? 100 / maxIV : 1;
            return (
              <div className="space-y-1">
                {data.termStructure.map((point: any) => (
                  <div key={point.tenor} className="flex items-center gap-2">
                    <span className="text-[8px] font-mono font-bold text-neutral-400 w-8 text-right shrink-0">
                      {point.tenor}
                    </span>
                    <div className="flex-1 h-3 bg-white/[0.02] overflow-hidden relative">
                      <div
                        className="h-full bg-cyan-400/30 transition-all"
                        style={{ width: `${point.iv * barScale}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-mono font-bold tabular-nums text-cyan-400 w-10 text-right shrink-0">
                      {point.iv.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
