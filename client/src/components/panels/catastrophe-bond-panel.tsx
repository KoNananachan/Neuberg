import { useCatastropheBond } from '../../api/hooks/use-catastrophe-bond';

const ACCENT = '#f87171'; // red-400
const ACCENT_DIM = 'rgba(248,113,113,0.06)';

const PERIL_COLORS: Record<string, string> = {
  Hurricane: '#60a5fa',
  Earthquake: '#f97316',
  Wildfire: '#ef4444',
  Flood: '#22d3ee',
  Pandemic: '#a78bfa',
  Multi: '#6b7280',
};

function perilColor(peril: string): string {
  for (const [key, color] of Object.entries(PERIL_COLORS)) {
    if (peril.includes(key)) return color;
  }
  return '#6b7280';
}

function fmtPct(n: number, signed = false): string {
  const s = signed && n > 0 ? '+' : '';
  return `${s}${n.toFixed(2)}%`;
}

function fmtBp(n: number): string {
  return `${n}bp`;
}

function fmtUsd(n: number, unit: 'M' | 'B' = 'M'): string {
  return `$${n}${unit}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function seasonColor(active: boolean): string {
  return active ? 'text-amber-400' : 'text-neutral-500';
}

function riskColor(level: string): string {
  if (level === 'HIGH' || level === 'ACTIVE') return 'text-red-400 bg-red-500/10';
  if (level === 'ELEVATED' || level === 'MODERATE') return 'text-amber-400 bg-amber-500/10';
  return 'text-neutral-500 bg-neutral-500/10';
}

export function CatastropheBondPanel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error } = useCatastropheBond() as { data: any; isLoading: boolean; error: any };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">
          Loading catastrophe bond data...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">
          Failed to load catastrophe bond data
        </div>
      </div>
    );
  }

  const summary = data.summary;
  const indices = data.indices;
  const seasonal = data.seasonal;
  const reinsurance = data.reinsurance;
  const bonds = data.outstandingBonds ?? [];
  const perilExposure = data.perilExposure ?? [];
  const newIssuance = data.newIssuance ?? [];

  const maxExposure = Math.max(...perilExposure.map((p: { totalExposure: number }) => p.totalExposure), 1);

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* ── Summary Bar ── */}
      <div className="grid grid-cols-6 gap-0 border-b border-border/20 shrink-0">
        {[
          { label: 'TOTAL MKT SIZE', value: fmtUsd(summary?.totalMarketSize, 'B'), color: ACCENT },
          { label: 'YTD ISSUANCE', value: fmtUsd(summary?.ytdIssuance, 'B'), color: 'white' },
          { label: 'AVG SPREAD', value: fmtBp(summary?.avgSpread), color: ACCENT },
          { label: 'AVG EXPECTED LOSS', value: fmtPct(summary?.avgExpectedLoss), color: '#ef4444' },
          { label: 'YTD RETURN', value: fmtPct(summary?.ytdReturn, true), color: summary?.ytdReturn >= 0 ? '#4ade80' : '#ef4444' },
          { label: 'NEXT MAJOR MAT.', value: summary?.nextMajorMaturity ?? '-', color: 'rgba(255,255,255,0.6)' },
        ].map((m) => (
          <div key={m.label} className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">{m.label}</div>
            <div className="text-[10px] font-mono font-black" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* ── Market Indices ── */}
        <div className="border-b border-border/20">
          <div className="px-2 py-1 border-b border-border/10">
            <span className="text-[8px] font-mono font-black text-neutral/50 uppercase tracking-wider">Market Indices</span>
          </div>
          <div className="grid grid-cols-2 gap-0">
            {[indices?.swissRe, indices?.artemis].map((idx: { name: string; level: number; return1M: number; returnYTD: number; return1Y: number } | undefined, i: number) =>
              idx ? (
                <div key={i} className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
                  <div className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>{idx.name}</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-[10px] font-mono font-black text-white">{idx.level}</span>
                    <span className={`text-[7px] font-mono ${idx.return1M >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      1M {idx.return1M >= 0 ? '+' : ''}{idx.return1M}%
                    </span>
                    <span className={`text-[7px] font-mono ${idx.returnYTD >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      YTD {idx.returnYTD >= 0 ? '+' : ''}{idx.returnYTD}%
                    </span>
                    <span className={`text-[7px] font-mono ${idx.return1Y >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      1Y {idx.return1Y >= 0 ? '+' : ''}{idx.return1Y}%
                    </span>
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>

        {/* ── Seasonal Risk ── */}
        <div className="border-b border-border/20">
          <div className="px-2 py-1 border-b border-border/10">
            <span className="text-[8px] font-mono font-black text-neutral/50 uppercase tracking-wider">Seasonal Risk</span>
          </div>
          <div className="grid grid-cols-4 gap-0">
            {[
              { label: 'HURRICANE SEASON', value: seasonal?.hurricaneSeason ?? 'INACTIVE', active: seasonal?.hurricaneActive },
              { label: 'RECENT EARTHQUAKES', value: seasonal?.recentEarthquakes ?? '0', active: (seasonal?.recentEarthquakes ?? 0) > 0 },
              { label: 'WILDFIRE RISK', value: seasonal?.wildfireRisk ?? 'LOW', active: seasonal?.wildfireRisk === 'HIGH' || seasonal?.wildfireRisk === 'ELEVATED' },
              { label: 'FLOOD RISK', value: seasonal?.floodRisk ?? 'LOW', active: seasonal?.floodRisk === 'HIGH' || seasonal?.floodRisk === 'ELEVATED' },
            ].map((s) => (
              <div key={s.label} className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
                <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">{s.label}</div>
                <div className={`text-[9px] font-mono font-black ${s.active ? riskColor(String(s.value).toUpperCase()).split(' ')[0] : seasonColor(false)}`}>
                  {typeof s.value === 'number' ? s.value : String(s.value).toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Reinsurance Market ── */}
        <div className="border-b border-border/20">
          <div className="px-2 py-1 border-b border-border/10">
            <span className="text-[8px] font-mono font-black text-neutral/50 uppercase tracking-wider">Reinsurance Market</span>
          </div>
          <div className="grid grid-cols-4 gap-0">
            <div className="px-2 py-1.5 border-r border-border/10">
              <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">PROPERTY CAT ROL</div>
              <div className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{reinsurance?.propertyCatRoL}%</div>
            </div>
            <div className="px-2 py-1.5 border-r border-border/10">
              <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">RATE TREND</div>
              <span className={`text-[8px] font-mono font-black px-1 py-0.5 ${
                reinsurance?.rateTrend === 'HARDENING' ? 'text-red-400 bg-red-500/10' :
                reinsurance?.rateTrend === 'SOFTENING' ? 'text-green-400 bg-green-500/10' :
                'text-amber-400 bg-amber-500/10'
              }`}>
                {reinsurance?.rateTrend ?? '-'}
              </span>
            </div>
            <div className="px-2 py-1.5 border-r border-border/10">
              <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">CAPACITY</div>
              <div className="text-[10px] font-mono font-black text-white/70">{fmtUsd(reinsurance?.capacity, 'B')}</div>
            </div>
            <div className="px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">RETRO SPREAD</div>
              <div className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{fmtBp(reinsurance?.retrocessionSpread)}</div>
            </div>
          </div>
        </div>

        {/* ── Outstanding Bonds ── */}
        <div className="border-b border-border/20">
          <div className="px-2 py-1 border-b border-border/10">
            <span className="text-[8px] font-mono font-black text-neutral/50 uppercase tracking-wider">Outstanding Bonds</span>
            <span className="text-[7px] font-mono text-neutral/30 ml-2">{bonds.length}</span>
          </div>
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-1.5 py-1 text-left font-bold">Name</th>
                <th className="px-1.5 py-1 text-left font-bold">Sponsor</th>
                <th className="px-1.5 py-1 text-left font-bold">Peril</th>
                <th className="px-1.5 py-1 text-left font-bold">Region</th>
                <th className="px-1.5 py-1 text-right font-bold">Size</th>
                <th className="px-1.5 py-1 text-right font-bold">Coupon</th>
                <th className="px-1.5 py-1 text-right font-bold">EL</th>
                <th className="px-1.5 py-1 text-right font-bold">Spread</th>
                <th className="px-1.5 py-1 text-right font-bold">Price</th>
                <th className="px-1.5 py-1 text-left font-bold">Rating</th>
                <th className="px-1.5 py-1 text-left font-bold">Maturity</th>
                <th className="px-1.5 py-1 text-left font-bold">Trigger</th>
              </tr>
            </thead>
            <tbody>
              {bonds.slice(0, 15).map((b: {
                id: string; name: string; sponsor: string; peril: string; region: string;
                size: number; coupon: number; expectedLoss: number; spread: number;
                price: number; rating: string; maturity: string; triggerType: string;
              }) => (
                <tr key={b.id ?? b.name} className="border-b border-border/5 hover:bg-red-400/[0.02]">
                  <td className="px-1.5 py-1 font-bold" style={{ color: ACCENT }}>{b.name}</td>
                  <td className="px-1.5 py-1 text-white/50">{b.sponsor}</td>
                  <td className="px-1.5 py-1">
                    <span
                      className="text-[7px] font-bold px-1 py-0"
                      style={{ color: perilColor(b.peril), background: `${perilColor(b.peril)}15` }}
                    >
                      {b.peril}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 text-white/40">{b.region}</td>
                  <td className="px-1.5 py-1 text-right text-white/80 font-bold">{fmtUsd(b.size)}</td>
                  <td className="px-1.5 py-1 text-right text-white/60">{b.coupon}%</td>
                  <td className="px-1.5 py-1 text-right text-red-400">{b.expectedLoss}%</td>
                  <td className="px-1.5 py-1 text-right" style={{ color: b.spread >= 800 ? '#ef4444' : ACCENT }}>{fmtBp(b.spread)}</td>
                  <td className="px-1.5 py-1 text-right text-white/80 font-bold">{b.price}</td>
                  <td className="px-1.5 py-1">
                    <span className={`text-[7px] font-bold px-1 py-0 ${
                      b.rating?.startsWith('BB') ? 'bg-green-500/10 text-green-400' :
                      b.rating?.startsWith('B') && !b.rating?.startsWith('BB') ? 'bg-amber-500/10 text-amber-400' :
                      'bg-white/5 text-white/50'
                    }`}>{b.rating}</span>
                  </td>
                  <td className="px-1.5 py-1 text-white/40 text-[7px]">{b.maturity}</td>
                  <td className="px-1.5 py-1 text-neutral/40 text-[7px]">{b.triggerType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Peril Exposure ── */}
        <div className="border-b border-border/20">
          <div className="px-2 py-1 border-b border-border/10">
            <span className="text-[8px] font-mono font-black text-neutral/50 uppercase tracking-wider">Peril Exposure</span>
          </div>
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-1.5 py-1 text-left font-bold">Peril</th>
                <th className="px-1.5 py-1 text-right font-bold">Exposure</th>
                <th className="px-1.5 py-1 text-left font-bold w-[120px]"></th>
                <th className="px-1.5 py-1 text-right font-bold">Avg Spread</th>
                <th className="px-1.5 py-1 text-right font-bold">Avg EL</th>
                <th className="px-1.5 py-1 text-right font-bold">Bonds</th>
                <th className="px-1.5 py-1 text-right font-bold">Largest</th>
              </tr>
            </thead>
            <tbody>
              {perilExposure.slice(0, 6).map((p: {
                peril: string; totalExposure: number; avgSpread: number;
                avgExpectedLoss: number; bondCount: number; largestSingleExposure: number;
              }) => {
                const barWidth = (p.totalExposure / maxExposure) * 100;
                return (
                  <tr key={p.peril} className="border-b border-border/5 hover:bg-red-400/[0.02]">
                    <td className="px-1.5 py-1">
                      <span className="font-bold" style={{ color: perilColor(p.peril) }}>{p.peril}</span>
                    </td>
                    <td className="px-1.5 py-1 text-right text-white/80 font-bold">{fmtUsd(p.totalExposure)}</td>
                    <td className="px-1.5 py-1">
                      <div className="w-full h-[6px] bg-white/5">
                        <div
                          className="h-full"
                          style={{ width: `${barWidth}%`, background: perilColor(p.peril), opacity: 0.6 }}
                        />
                      </div>
                    </td>
                    <td className="px-1.5 py-1 text-right" style={{ color: ACCENT }}>{fmtBp(p.avgSpread)}</td>
                    <td className="px-1.5 py-1 text-right text-red-400">{p.avgExpectedLoss}%</td>
                    <td className="px-1.5 py-1 text-right text-white/50">{p.bondCount}</td>
                    <td className="px-1.5 py-1 text-right text-white/60 font-bold">{fmtUsd(p.largestSingleExposure)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── New Issuance ── */}
        <div className="border-b border-border/20">
          <div className="px-2 py-1 border-b border-border/10">
            <span className="text-[8px] font-mono font-black text-neutral/50 uppercase tracking-wider">New Issuance</span>
          </div>
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-1.5 py-1 text-left font-bold">Name</th>
                <th className="px-1.5 py-1 text-left font-bold">Sponsor</th>
                <th className="px-1.5 py-1 text-left font-bold">Peril</th>
                <th className="px-1.5 py-1 text-right font-bold">Size</th>
                <th className="px-1.5 py-1 text-right font-bold">Spread</th>
                <th className="px-1.5 py-1 text-right font-bold">EL</th>
                <th className="px-1.5 py-1 text-left font-bold">Trigger</th>
                <th className="px-1.5 py-1 text-left font-bold">Date</th>
              </tr>
            </thead>
            <tbody>
              {newIssuance.slice(0, 6).map((n: {
                id: string; name: string; sponsor: string; peril: string;
                size: number; spread: number; expectedLoss: number;
                triggerType: string; date: string;
              }, i: number) => (
                <tr key={n.id ?? i} className="border-b border-border/5 hover:bg-red-400/[0.02]">
                  <td className="px-1.5 py-1 font-bold" style={{ color: ACCENT }}>{n.name}</td>
                  <td className="px-1.5 py-1 text-white/50">{n.sponsor}</td>
                  <td className="px-1.5 py-1">
                    <span
                      className="text-[7px] font-bold px-1 py-0"
                      style={{ color: perilColor(n.peril), background: `${perilColor(n.peril)}15` }}
                    >
                      {n.peril}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 text-right text-white/80 font-bold">{fmtUsd(n.size)}</td>
                  <td className="px-1.5 py-1 text-right" style={{ color: ACCENT }}>{fmtBp(n.spread)}</td>
                  <td className="px-1.5 py-1 text-right text-red-400">{n.expectedLoss}%</td>
                  <td className="px-1.5 py-1 text-neutral/40 text-[7px]">{n.triggerType}</td>
                  <td className="px-1.5 py-1 text-white/40 text-[7px]">{n.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
