import { Loader2 } from 'lucide-react';
import { useCryptoDerivatives } from '../../api/hooks/use-crypto-derivatives';
import { useT } from '../../i18n';

// -- Formatting helpers --

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals) + '%';
}

function fmtSignedPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtMillions(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toLocaleString();
}

function fmtSigned(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

// -- Color helpers --

function rateColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function spreadColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Asset badge --

function AssetBadge({ asset }: { asset: string }) {
  const isBtc = (asset ?? '').toUpperCase().includes('BTC');
  return (
    <span
      className={`inline-block px-1 py-px text-[7px] font-mono font-black uppercase tracking-wider ${
        isBtc
          ? 'text-orange-400 bg-orange-500/10 border border-orange-500/30'
          : 'text-blue-400 bg-blue-500/10 border border-blue-500/30'
      }`}
    >
      {(asset ?? '').toUpperCase()}
    </span>
  );
}

// -- Direction badge --

function DirectionBadge({ direction }: { direction: string }) {
  const d = (direction ?? '').toLowerCase();
  const isContango = d.includes('contango');
  const isBackwardation = d.includes('backwardation');
  return (
    <span
      className={`inline-block px-1 py-px text-[7px] font-mono font-black uppercase tracking-wider border ${
        isContango
          ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
          : isBackwardation
            ? 'text-green-400 bg-green-500/10 border-green-500/30'
            : 'text-neutral-400 bg-neutral-500/10 border-neutral-500/30'
      }`}
    >
      {direction}
    </span>
  );
}

// -- Section header --

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 border-b border-border/10 bg-black/40">
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
        {label}
      </span>
    </div>
  );
}

// -- Main Panel --

export function CryptoDerivativesPanel() {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error } = useCryptoDerivatives() as { data: any; isLoading: boolean; error: any };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'cdFailedLoad', 'Failed to load crypto derivatives')}
        </div>
      </div>
    );
  }

  const optionsData: any[] = data.optionsData ?? [];
  const perpetualFunding: any[] = data.perpetualFunding ?? [];
  const basisTrades: any[] = data.basisTrades ?? [];
  const termStructure: any[] = data.termStructure ?? [];
  const summary = data.marketSummary;

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Market Summary Bar */}
      {summary && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/20 bg-black/60 shrink-0 text-[8px] font-mono overflow-x-auto no-scrollbar">
          <SummaryItem label="BTC" value={fmtPrice(summary.btcPrice)} />
          <SummaryItem label="ETH" value={fmtPrice(summary.ethPrice)} />
          <SummaryItem label="Options OI" value={fmtMillions(summary.totalOptionsOI)} />
          <SummaryItem label="Perp OI" value={fmtMillions(summary.totalPerpOI)} />
          <SummaryItem
            label="Avg Funding"
            value={fmtSignedPct(summary.avgFundingRate, 4)}
            valueColor={rateColor(summary.avgFundingRate)}
          />
          <SummaryItem label="DVOL" value={fmtPct(summary.dvol, 1)} />
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Options Data Table */}
        <div className="border-b border-border/20">
          <SectionHeader label="Options Data" />
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-[7px] text-neutral-500 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-3 py-1 font-bold">Asset</th>
                  <th className="text-left px-2 py-1 font-bold">Expiry</th>
                  <th className="text-right px-2 py-1 font-bold">Strike</th>
                  <th className="text-center px-2 py-1 font-bold">Type</th>
                  <th className="text-right px-2 py-1 font-bold">IV%</th>
                  <th className="text-right px-2 py-1 font-bold">Price</th>
                  <th className="text-right px-2 py-1 font-bold">Delta</th>
                  <th className="text-right px-2 py-1 font-bold">Gamma</th>
                  <th className="text-right px-2 py-1 font-bold">Volume</th>
                  <th className="text-right px-3 py-1 font-bold">OI</th>
                </tr>
              </thead>
              <tbody>
                {optionsData.map((row: any, i: number) => (
                  <tr
                    key={`opt-${i}`}
                    className="border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors"
                  >
                    <td className="px-3 py-1">
                      <AssetBadge asset={row.asset} />
                    </td>
                    <td className="px-2 py-1 text-neutral-400">{row.expiry}</td>
                    <td className="text-right px-2 py-1 text-white">
                      {row.strike != null ? '$' + Number(row.strike).toLocaleString() : '-'}
                    </td>
                    <td className="text-center px-2 py-1">
                      <span
                        className={`font-bold uppercase ${
                          (row.type ?? '').toLowerCase() === 'call' ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {(row.type ?? '').toLowerCase() === 'call' ? 'C' : 'P'}
                      </span>
                    </td>
                    <td className="text-right px-2 py-1 text-orange-400 font-bold">{fmtPct(row.iv)}</td>
                    <td className="text-right px-2 py-1 text-white">{fmtPrice(row.price)}</td>
                    <td className="text-right px-2 py-1 text-neutral-400">{row.delta != null ? row.delta.toFixed(4) : '-'}</td>
                    <td className="text-right px-2 py-1 text-neutral-500">{row.gamma != null ? row.gamma.toFixed(4) : '-'}</td>
                    <td className="text-right px-2 py-1 text-neutral-300">{fmtNum(row.volume)}</td>
                    <td className="text-right px-3 py-1 text-neutral-400">{fmtNum(row.openInterest)}</td>
                  </tr>
                ))}
                {optionsData.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-3 text-neutral-600 text-[8px] uppercase tracking-widest">
                      No options data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Perpetual Funding Table */}
        <div className="border-b border-border/20">
          <SectionHeader label="Perpetual Funding" />
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-[7px] text-neutral-500 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-3 py-1 font-bold">Pair</th>
                  <th className="text-left px-2 py-1 font-bold">Exchange</th>
                  <th className="text-right px-2 py-1 font-bold">Funding%</th>
                  <th className="text-right px-2 py-1 font-bold">Annualized%</th>
                  <th className="text-right px-2 py-1 font-bold">OI ($M)</th>
                  <th className="text-right px-2 py-1 font-bold">Vol 24h ($M)</th>
                  <th className="text-right px-3 py-1 font-bold">Basis%</th>
                </tr>
              </thead>
              <tbody>
                {perpetualFunding.map((row: any, i: number) => (
                  <tr
                    key={`perp-${i}`}
                    className="border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors"
                  >
                    <td className="px-3 py-1 text-white font-bold">{row.pair}</td>
                    <td className="px-2 py-1 text-neutral-400">{row.exchange}</td>
                    <td className={`text-right px-2 py-1 font-bold ${rateColor(row.fundingRate)}`}>
                      {fmtSignedPct(row.fundingRate, 4)}
                    </td>
                    <td className={`text-right px-2 py-1 ${rateColor(row.annualized)}`}>
                      {fmtSignedPct(row.annualized)}
                    </td>
                    <td className="text-right px-2 py-1 text-neutral-300">
                      {row.openInterest != null ? (row.openInterest / 1e6).toFixed(1) : '-'}
                    </td>
                    <td className="text-right px-2 py-1 text-neutral-400">
                      {row.volume24h != null ? (row.volume24h / 1e6).toFixed(1) : '-'}
                    </td>
                    <td className="text-right px-3 py-1 text-orange-400">{fmtPct(row.basis, 3)}</td>
                  </tr>
                ))}
                {perpetualFunding.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-3 text-neutral-600 text-[8px] uppercase tracking-widest">
                      No perpetual funding data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Basis Trades Table */}
        <div className="border-b border-border/20">
          <SectionHeader label="Basis Trades" />
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-[7px] text-neutral-500 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-3 py-1 font-bold">Asset</th>
                  <th className="text-left px-2 py-1 font-bold">Venue</th>
                  <th className="text-right px-2 py-1 font-bold">Spot</th>
                  <th className="text-right px-2 py-1 font-bold">Futures</th>
                  <th className="text-right px-2 py-1 font-bold">Basis%</th>
                  <th className="text-right px-2 py-1 font-bold">Annual%</th>
                  <th className="text-right px-2 py-1 font-bold">DTE</th>
                  <th className="text-left px-3 py-1 font-bold">Direction</th>
                </tr>
              </thead>
              <tbody>
                {basisTrades.map((row: any, i: number) => (
                  <tr
                    key={`basis-${i}`}
                    className="border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors"
                  >
                    <td className="px-3 py-1">
                      <AssetBadge asset={row.asset} />
                    </td>
                    <td className="px-2 py-1 text-neutral-400">{row.venue}</td>
                    <td className="text-right px-2 py-1 text-white">{fmtPrice(row.spotPrice)}</td>
                    <td className="text-right px-2 py-1 text-white">{fmtPrice(row.futuresPrice)}</td>
                    <td className={`text-right px-2 py-1 font-bold ${spreadColor(row.basis)}`}>
                      {fmtSignedPct(row.basis, 3)}
                    </td>
                    <td className={`text-right px-2 py-1 ${spreadColor(row.annualizedBasis)}`}>
                      {fmtSignedPct(row.annualizedBasis)}
                    </td>
                    <td className="text-right px-2 py-1 text-neutral-400">{row.daysToExpiry ?? '-'}</td>
                    <td className="px-3 py-1">
                      <DirectionBadge direction={row.direction ?? '-'} />
                    </td>
                  </tr>
                ))}
                {basisTrades.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-3 text-neutral-600 text-[8px] uppercase tracking-widest">
                      No basis trade data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Term Structure Table */}
        <div className="border-b border-border/20">
          <SectionHeader label="Term Structure" />
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-[7px] text-neutral-500 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-3 py-1 font-bold">Asset</th>
                  <th className="text-left px-2 py-1 font-bold">Tenor</th>
                  <th className="text-right px-2 py-1 font-bold">IV%</th>
                  <th className="text-right px-2 py-1 font-bold">RV%</th>
                  <th className="text-right px-2 py-1 font-bold">IV-RV</th>
                  <th className="text-right px-2 py-1 font-bold">25d Skew</th>
                  <th className="text-right px-3 py-1 font-bold">P/C Ratio</th>
                </tr>
              </thead>
              <tbody>
                {termStructure.map((row: any, i: number) => {
                  const ivRvSpread = row.iv != null && row.rv != null ? row.iv - row.rv : null;
                  return (
                    <tr
                      key={`term-${i}`}
                      className="border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors"
                    >
                      <td className="px-3 py-1">
                        <AssetBadge asset={row.asset} />
                      </td>
                      <td className="px-2 py-1 text-neutral-300 font-bold">{row.tenor}</td>
                      <td className="text-right px-2 py-1 text-orange-400 font-bold">{fmtPct(row.iv)}</td>
                      <td className="text-right px-2 py-1 text-neutral-400">{fmtPct(row.rv)}</td>
                      <td className={`text-right px-2 py-1 font-bold ${spreadColor(ivRvSpread)}`}>
                        {fmtSigned(ivRvSpread != null ? ivRvSpread : undefined)}
                      </td>
                      <td className="text-right px-2 py-1 text-neutral-300">
                        {row.skew25d != null ? row.skew25d.toFixed(2) : '-'}
                      </td>
                      <td className="text-right px-3 py-1 text-neutral-400">
                        {row.putCallRatio != null ? row.putCallRatio.toFixed(2) : '-'}
                      </td>
                    </tr>
                  );
                })}
                {termStructure.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-3 text-neutral-600 text-[8px] uppercase tracking-widest">
                      No term structure data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Summary stat item --

function SummaryItem({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-neutral-500">{label}</span>
      <span className={`font-bold ${valueColor ?? 'text-white'}`}>{value}</span>
    </div>
  );
}
