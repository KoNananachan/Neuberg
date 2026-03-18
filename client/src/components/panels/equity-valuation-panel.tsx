import { useEquityValuation } from '../../api/hooks/use-equity-valuation';
import { useT } from '../../i18n';

// ── Translation helper with fallback ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Formatting helpers ──

function fmtNum(v: number | null | undefined, decimals = 1): string {
  if (v == null || !isFinite(v)) return '--';
  return v.toFixed(decimals);
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '--';
  return (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
}

function fmtMktCap(v: number | null | undefined): string {
  if (v == null) return '--';
  if (v >= 1e12) return (v / 1e12).toFixed(1) + 'T';
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(0) + 'M';
  return v.toFixed(0);
}

function fmtCurrency(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '--';
  if (Math.abs(v) >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
  if (Math.abs(v) >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  return '$' + v.toFixed(2);
}

// ── Color helpers ──

function relativeColor(value: number | null | undefined, sectorAvg: number | null | undefined, lowerIsBetter: boolean): string {
  if (value == null || sectorAvg == null || !isFinite(value) || !isFinite(sectorAvg)) return 'text-neutral-400';
  if (lowerIsBetter) {
    return value < sectorAvg ? 'text-green-400' : value > sectorAvg ? 'text-red-400' : 'text-neutral-400';
  }
  return value > sectorAvg ? 'text-green-400' : value < sectorAvg ? 'text-red-400' : 'text-neutral-400';
}

function upsideColor(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return 'text-neutral-400';
  if (v > 10) return 'text-green-400';
  if (v > 0) return 'text-green-400/70';
  if (v > -10) return 'text-red-400/70';
  return 'text-red-400';
}

// ── Component ──

export function EquityValuationPanel() {
  const t = useT();
  const { data, isLoading } = useEquityValuation();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 bg-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-blue-400">
            {tr(t, 'panelEquityValuation', 'EQUITY VALUATION')}
          </span>
        </div>
        {data?.asOfDate && (
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {data.asOfDate}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-blue-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {data && (
          <>
            {/* ── Section 1: Comparables Table ── */}
            <div className="border-b border-border/20">
              <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
                <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
                  {tr(t, 'evComparables', 'PEER COMPARABLES')}
                </span>
              </div>

              {/* Table header */}
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr className="border-b border-border/20 bg-[#030303]">
                      <th className="text-left px-2 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600">
                        {tr(t, 'evTicker', 'TICKER')}
                      </th>
                      <th className="text-right px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600">
                        {tr(t, 'evMktCap', 'MKT CAP')}
                      </th>
                      <th className="text-right px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600">
                        {tr(t, 'evPeTtm', 'P/E TTM')}
                      </th>
                      <th className="text-right px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600">
                        {tr(t, 'evPeFwd', 'P/E FWD')}
                      </th>
                      <th className="text-right px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600">
                        {tr(t, 'evEvEbitda', 'EV/EBITDA')}
                      </th>
                      <th className="text-right px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600">
                        {tr(t, 'evPb', 'P/B')}
                      </th>
                      <th className="text-right px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600">
                        {tr(t, 'evPs', 'P/S')}
                      </th>
                      <th className="text-right px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600">
                        {tr(t, 'evPeg', 'PEG')}
                      </th>
                      <th className="text-right px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600 pr-2">
                        {tr(t, 'evDivYield', 'DIV YLD')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Sector average row */}
                    {data?.sectorAverages && (
                      <tr className="border-b border-blue-400/20 bg-blue-400/[0.04]">
                        <td className="px-2 py-[3px] text-[8px] font-mono font-bold text-blue-400 uppercase">
                          {tr(t, 'evSectorAvg', 'SECTOR AVG')}
                        </td>
                        <td className="text-right px-1.5 py-[3px] text-[8px] font-mono text-blue-400/70">
                          {fmtMktCap(data.sectorAverages?.marketCap)}
                        </td>
                        <td className="text-right px-1.5 py-[3px] text-[8px] font-mono text-blue-400/70">
                          {fmtNum(data.sectorAverages?.peTtm)}
                        </td>
                        <td className="text-right px-1.5 py-[3px] text-[8px] font-mono text-blue-400/70">
                          {fmtNum(data.sectorAverages?.peFwd)}
                        </td>
                        <td className="text-right px-1.5 py-[3px] text-[8px] font-mono text-blue-400/70">
                          {fmtNum(data.sectorAverages?.evEbitda)}
                        </td>
                        <td className="text-right px-1.5 py-[3px] text-[8px] font-mono text-blue-400/70">
                          {fmtNum(data.sectorAverages?.pb, 2)}
                        </td>
                        <td className="text-right px-1.5 py-[3px] text-[8px] font-mono text-blue-400/70">
                          {fmtNum(data.sectorAverages?.ps, 2)}
                        </td>
                        <td className="text-right px-1.5 py-[3px] text-[8px] font-mono text-blue-400/70">
                          {fmtNum(data.sectorAverages?.peg, 2)}
                        </td>
                        <td className="text-right px-1.5 py-[3px] text-[8px] font-mono text-blue-400/70 pr-2">
                          {data.sectorAverages?.divYield != null ? fmtNum(data.sectorAverages.divYield, 2) + '%' : '--'}
                        </td>
                      </tr>
                    )}

                    {/* Comparable rows */}
                    {data?.comparables?.map((comp: Record<string, unknown>, i: number) => {
                      const sa = data.sectorAverages;
                      return (
                        <tr
                          key={(comp?.ticker as string) ?? i}
                          className="border-b border-border/10 transition-colors hover:bg-blue-400/[0.02]"
                        >
                          <td className="px-2 py-[3px]">
                            <div className="text-[8px] font-mono font-bold text-white">
                              {(comp?.ticker as string) ?? '--'}
                            </div>
                            <div className="text-[6px] font-mono text-neutral-600 max-w-[80px] truncate">
                              {(comp?.name as string) ?? ''}
                            </div>
                          </td>
                          <td className="text-right px-1.5 py-[3px] text-[8px] font-mono text-neutral-300">
                            {fmtMktCap(comp?.marketCap as number)}
                          </td>
                          <td className={`text-right px-1.5 py-[3px] text-[8px] font-mono ${relativeColor(comp?.peTtm as number, sa?.peTtm as number, true)}`}>
                            {fmtNum(comp?.peTtm as number)}
                          </td>
                          <td className={`text-right px-1.5 py-[3px] text-[8px] font-mono ${relativeColor(comp?.peFwd as number, sa?.peFwd as number, true)}`}>
                            {fmtNum(comp?.peFwd as number)}
                          </td>
                          <td className={`text-right px-1.5 py-[3px] text-[8px] font-mono ${relativeColor(comp?.evEbitda as number, sa?.evEbitda as number, true)}`}>
                            {fmtNum(comp?.evEbitda as number)}
                          </td>
                          <td className={`text-right px-1.5 py-[3px] text-[8px] font-mono ${relativeColor(comp?.pb as number, sa?.pb as number, true)}`}>
                            {fmtNum(comp?.pb as number, 2)}
                          </td>
                          <td className={`text-right px-1.5 py-[3px] text-[8px] font-mono ${relativeColor(comp?.ps as number, sa?.ps as number, true)}`}>
                            {fmtNum(comp?.ps as number, 2)}
                          </td>
                          <td className={`text-right px-1.5 py-[3px] text-[8px] font-mono ${relativeColor(comp?.peg as number, sa?.peg as number, true)}`}>
                            {fmtNum(comp?.peg as number, 2)}
                          </td>
                          <td className={`text-right px-1.5 py-[3px] text-[8px] font-mono pr-2 ${relativeColor(comp?.divYield as number, sa?.divYield as number, false)}`}>
                            {comp?.divYield != null ? fmtNum(comp.divYield as number, 2) + '%' : '--'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Section 2: DCF Summary ── */}
            <div className="border-b border-border/20">
              <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
                <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
                  {tr(t, 'evDcfSummary', 'DCF SUMMARY')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-0 divide-x divide-border/10">
                {/* WACC */}
                <div className="px-3 py-2 text-center">
                  <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 mb-0.5">
                    {tr(t, 'evWacc', 'WACC')}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-white">
                    {data?.dcf?.wacc != null ? fmtNum(data.dcf.wacc, 2) + '%' : '--'}
                  </div>
                </div>
                {/* Terminal Growth */}
                <div className="px-3 py-2 text-center">
                  <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 mb-0.5">
                    {tr(t, 'evTerminalGrowth', 'TERMINAL GROWTH')}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-white">
                    {data?.dcf?.terminalGrowth != null ? fmtNum(data.dcf.terminalGrowth, 2) + '%' : '--'}
                  </div>
                </div>
                {/* Enterprise Value */}
                <div className="px-3 py-2 text-center">
                  <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 mb-0.5">
                    {tr(t, 'evEnterpriseValue', 'ENTERPRISE VALUE')}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-white">
                    {fmtCurrency(data?.dcf?.enterpriseValue)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-0 divide-x divide-border/10 border-t border-border/10">
                {/* Equity Value */}
                <div className="px-3 py-2 text-center">
                  <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 mb-0.5">
                    {tr(t, 'evEquityValue', 'EQUITY VALUE')}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-white">
                    {fmtCurrency(data?.dcf?.equityValue)}
                  </div>
                </div>
                {/* Implied Price */}
                <div className="px-3 py-2 text-center">
                  <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 mb-0.5">
                    {tr(t, 'evImpliedPrice', 'IMPLIED PRICE')}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-blue-400">
                    {data?.dcf?.impliedPrice != null ? '$' + fmtNum(data.dcf.impliedPrice, 2) : '--'}
                  </div>
                </div>
                {/* Upside */}
                <div className="px-3 py-2 text-center">
                  <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 mb-0.5">
                    {tr(t, 'evUpside', 'UPSIDE / DOWNSIDE')}
                  </div>
                  <div className={`text-[10px] font-mono font-bold ${upsideColor(data?.dcf?.upsidePct)}`}>
                    {fmtPct(data?.dcf?.upsidePct)}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Sector Comparison ── */}
            <div>
              <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
                <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
                  {tr(t, 'evSectorComparison', 'SECTOR COMPARISON')}
                </span>
              </div>

              {data?.sectorComparison?.map((sector: Record<string, unknown>, i: number) => {
                const peTtm = sector?.peTtm as number | null | undefined;
                const evEbitda = sector?.evEbitda as number | null | undefined;
                const pb = sector?.pb as number | null | undefined;
                const divYield = sector?.divYield as number | null | undefined;
                const count = sector?.count as number | null | undefined;

                return (
                  <div
                    key={(sector?.name as string) ?? i}
                    className="flex items-center px-3 py-[4px] border-b border-border/10 transition-colors hover:bg-blue-400/[0.02]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[8px] font-mono font-bold text-white truncate">
                        {(sector?.name as string) ?? '--'}
                      </div>
                      {count != null && (
                        <div className="text-[6px] font-mono text-neutral-600">
                          {count} {tr(t, 'evCompanies', 'companies')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center w-[48px]">
                        <div className="text-[6px] font-mono uppercase tracking-wider text-neutral-600">P/E</div>
                        <div className="text-[8px] font-mono text-neutral-300">{fmtNum(peTtm)}</div>
                      </div>
                      <div className="text-center w-[48px]">
                        <div className="text-[6px] font-mono uppercase tracking-wider text-neutral-600">EV/EB</div>
                        <div className="text-[8px] font-mono text-neutral-300">{fmtNum(evEbitda)}</div>
                      </div>
                      <div className="text-center w-[36px]">
                        <div className="text-[6px] font-mono uppercase tracking-wider text-neutral-600">P/B</div>
                        <div className="text-[8px] font-mono text-neutral-300">{fmtNum(pb, 2)}</div>
                      </div>
                      <div className="text-center w-[44px]">
                        <div className="text-[6px] font-mono uppercase tracking-wider text-neutral-600">DIV Y</div>
                        <div className="text-[8px] font-mono text-neutral-300">
                          {divYield != null ? fmtNum(divYield, 2) + '%' : '--'}
                        </div>
                      </div>
                      {/* Visual bar for P/E relative to 25x baseline */}
                      <div className="w-16 flex items-center">
                        <div className="w-full h-1.5 bg-white/[0.03] relative">
                          <div
                            className="absolute top-0 left-0 h-full bg-blue-400/40"
                            style={{ width: `${Math.min(((peTtm ?? 0) / 40) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!isLoading && !data && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'evNoData', 'No data available')}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-border/20 bg-[#050505] shrink-0 flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {data?.comparables ? `${data.comparables.length} ${tr(t, 'evPeers', 'peers')}` : ''}
        </span>
        <span className="text-[7px] font-mono text-neutral-600/50 uppercase tracking-wider">
          {tr(t, 'evSource', 'EQUITY VALUATION MODEL')}
        </span>
      </div>
    </div>
  );
}
