import { useFxOptions } from '../../api/hooks/use-fx-options';
import { useT } from '../../i18n';

const ACCENT = '#34d399'; // emerald-400
const ACCENT_DIM = 'rgba(52,211,153,0.08)';

const TENORS = ['1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y'];

function fmtNum(v: unknown, decimals = 2): string {
  if (v == null || typeof v !== 'number' || isNaN(v)) return '-';
  return v.toFixed(decimals);
}

function fmtSigned(v: unknown, decimals = 2): string {
  if (v == null || typeof v !== 'number' || isNaN(v)) return '-';
  return `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}`;
}

export function FxOptionsPanel() {
  const { data, isLoading } = useFxOptions();
  const t = useT();
  const d = data as any;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-emerald-400/60 uppercase tracking-widest animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="w-[3px] h-3 bg-emerald-400" />
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-emerald-400">
          FX OPTIONS
        </span>
        <div className="flex-1" />
        {d?.summary && (
          <span className="text-[8px] font-mono text-neutral-500">
            {d.summary?.pairCount ?? d.pairs?.length ?? 0} pairs | {t('loading') ? '' : ''}ATM Avg: {fmtNum(d.summary?.avgAtmVol ?? d.summary?.avgG10Vol)}%
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* ── Vol Surface ── */}
        <div className="px-3 pt-2 pb-1">
          <div className="text-[8px] font-mono font-black text-neutral-500 uppercase tracking-wider mb-1.5">
            VOL SURFACE
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead className="text-neutral-500 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1 text-left text-[8px] font-black">PAIR</th>
                  <th className="px-2 py-1 text-right text-[8px] font-black">ATM</th>
                  <th className="px-2 py-1 text-right text-[8px] font-black">25D RR</th>
                  <th className="px-2 py-1 text-right text-[8px] font-black">25D BF</th>
                  <th className="px-2 py-1 text-right text-[8px] font-black">10D RR</th>
                  <th className="px-2 py-1 text-right text-[8px] font-black">10D BF</th>
                </tr>
              </thead>
              <tbody>
                {d?.pairs?.map((p: any) => {
                  const tenors = p.volMatrix ?? p.volSurface ?? [];
                  return tenors.map((row: any) => (
                    <tr key={`${p.id}-${row.tenor}`} className="border-b border-border/20 hover:bg-emerald-400/[0.02]">
                      <td className="px-2 py-1">
                        <span className="font-bold text-emerald-400">{p.id}</span>
                        <span className="text-neutral-600 ml-1">{row.tenor}</span>
                      </td>
                      <td className="px-2 py-1 text-right font-bold text-white/80">
                        {fmtNum(row.atmVol)}
                      </td>
                      <td className={`px-2 py-1 text-right font-bold ${(row.rr25 ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmtSigned(row.rr25)}
                      </td>
                      <td className="px-2 py-1 text-right text-white/60">
                        {fmtNum(row.bf25)}
                      </td>
                      <td className={`px-2 py-1 text-right font-bold ${(row.rr10 ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmtSigned(row.rr10 ?? (row.deltas?.['10C'] != null && row.deltas?.['10P'] != null ? row.deltas['10C'] - row.deltas['10P'] : null))}
                      </td>
                      <td className="px-2 py-1 text-right text-white/60">
                        {fmtNum(row.bf10 ?? (row.deltas?.['10C'] != null && row.deltas?.['10P'] != null && row.atmVol != null ? (row.deltas['10C'] + row.deltas['10P']) / 2 - row.atmVol : null))}
                      </td>
                    </tr>
                  ));
                })}
                {!d?.pairs?.length && (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-center text-neutral-600 text-[8px] uppercase">
                      No vol surface data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Greeks ── */}
        <div className="px-3 pt-2 pb-1">
          <div className="text-[8px] font-mono font-black text-neutral-500 uppercase tracking-wider mb-1.5">
            GREEKS
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1 text-left text-[8px] font-black">PAIR</th>
                <th className="px-2 py-1 text-right text-[8px] font-black">DELTA</th>
                <th className="px-2 py-1 text-right text-[8px] font-black">GAMMA</th>
                <th className="px-2 py-1 text-right text-[8px] font-black">VEGA</th>
                <th className="px-2 py-1 text-right text-[8px] font-black">THETA</th>
                <th className="px-2 py-1 text-right text-[8px] font-black">RHO</th>
              </tr>
            </thead>
            <tbody>
              {d?.pairs?.map((p: any) => {
                const g = p.greeks ?? {};
                return (
                  <tr key={p.id} className="border-b border-border/20 hover:bg-emerald-400/[0.02]">
                    <td className="px-2 py-1 font-bold text-emerald-400">{p.id}</td>
                    <td className={`px-2 py-1 text-right font-bold ${(g.delta ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmtSigned(g.delta, 4)}
                    </td>
                    <td className="px-2 py-1 text-right text-white/70">
                      {fmtNum(g.gamma, 4)}
                    </td>
                    <td className="px-2 py-1 text-right text-white/70">
                      {fmtNum(g.vega)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${(g.theta ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmtSigned(g.theta)}
                    </td>
                    <td className="px-2 py-1 text-right text-white/60">
                      {fmtNum(g.rho, 4)}
                    </td>
                  </tr>
                );
              })}
              {!d?.pairs?.length && (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-neutral-600 text-[8px] uppercase">
                    No greeks data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Market Snapshot ── */}
        <div className="px-3 pt-2 pb-3">
          <div className="text-[8px] font-mono font-black text-neutral-500 uppercase tracking-wider mb-1.5">
            MARKET SNAPSHOT
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1 text-left text-[8px] font-black">PAIR</th>
                <th className="px-2 py-1 text-right text-[8px] font-black">SPOT</th>
                <th className="px-2 py-1 text-right text-[8px] font-black">FWD PTS</th>
                <th className="px-2 py-1 text-right text-[8px] font-black">ATM VOL</th>
                <th className="px-2 py-1 text-right text-[8px] font-black">PUT/CALL SKEW</th>
              </tr>
            </thead>
            <tbody>
              {d?.pairs?.map((p: any) => {
                const snapshot = p.snapshot ?? p;
                const skew = snapshot?.putCallSkew ?? snapshot?.skew ?? p.putCallSkew;
                const fwdPts = snapshot?.fwdPoints ?? snapshot?.forwardPoints ?? p.fwdPoints;
                const atmVol = snapshot?.atmVol ?? (p.volMatrix?.[0]?.atmVol) ?? p.atmVol;
                return (
                  <tr key={p.id} className="border-b border-border/20 hover:bg-emerald-400/[0.02]">
                    <td className="px-2 py-1 font-bold text-emerald-400">{p.id}</td>
                    <td className="px-2 py-1 text-right text-white/80 font-bold">
                      {fmtNum(p.spot, 4)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${(fwdPts ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmtSigned(fwdPts)}
                    </td>
                    <td className="px-2 py-1 text-right text-white/70">
                      {fmtNum(atmVol)}%
                    </td>
                    <td className="px-2 py-1 text-right">
                      {skew != null ? (
                        <span
                          className="inline-block px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider"
                          style={{
                            color: ACCENT,
                            background: ACCENT_DIM,
                          }}
                        >
                          {typeof skew === 'number' ? fmtSigned(skew) : skew}
                        </span>
                      ) : (
                        <span className="text-neutral-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!d?.pairs?.length && (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-neutral-600 text-[8px] uppercase">
                    No market data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
