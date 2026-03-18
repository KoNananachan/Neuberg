import { useState } from 'react';
import { useRepoMarket } from '../../api/hooks/use-repo-market';

const ACCENT = '#94a3b8'; // slate-400
const ACCENT_DIM = 'rgba(148,163,184,0.08)';

type Tab = 'rates' | 'collateral' | 'term' | 'fails';

export function RepoMarketPanel() {
  const { data, isLoading, error } = useRepoMarket();
  const [tab, setTab] = useState<Tab>('rates');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading repo market data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'rates', label: 'RATES' },
    { key: 'collateral', label: 'COLLATERAL' },
    { key: 'term', label: 'TERM STRUCTURE' },
    { key: 'fails', label: 'FAILS' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">SOFR</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.sofrRate}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Fed Funds</div>
          <div className="text-[11px] font-mono font-black text-white/80">{data.summary?.fedFundsRate}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Tri-Party Vol</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.triPartyVolume}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Bilateral Vol</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.bilateralVolume}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Total Fails</div>
          <div className={`text-[11px] font-mono font-black ${(data.summary?.totalFails ?? 0) > 50 ? 'text-bearish' : 'text-white/60'}`}>
            ${data.summary?.totalFails}B
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors" style={{ color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)', borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent', background: tab === t.key ? ACCENT_DIM : 'transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'rates' && <RatesTab data={data} />}
        {tab === 'collateral' && <CollateralTab data={data} />}
        {tab === 'term' && <TermStructureTab data={data} />}
        {tab === 'fails' && <FailsTab data={data} />}
      </div>
    </div>
  );
}

// ── Rates Tab ──

function RatesTab({ data }: { data: any }) {
  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left font-bold">Type</th>
          <th className="px-2 py-1.5 text-right font-bold">Rate (%)</th>
          <th className="px-2 py-1.5 text-right font-bold">1D Chg (bp)</th>
          <th className="px-2 py-1.5 text-right font-bold">Volume ($B)</th>
          <th className="px-2 py-1.5 text-right font-bold">Percentile</th>
        </tr>
      </thead>
      <tbody>
        {data.rates?.map((r: any) => (
          <tr key={r.type} className="border-b border-border/5 hover:bg-white/[0.02]">
            <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.type}</td>
            <td className="px-2 py-1.5 text-right text-white/80 font-bold">{r.rate}%</td>
            <td className={`px-2 py-1.5 text-right font-bold ${r.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {r.change1d >= 0 ? '+' : ''}{r.change1d}
            </td>
            <td className="px-2 py-1.5 text-right text-white/50">{r.volume}</td>
            <td className="px-2 py-1.5 text-right">
              <div className="flex items-center justify-end gap-1.5">
                <div className="w-16 h-[4px] bg-white/5 overflow-hidden">
                  <div style={{ width: `${Math.min(r.percentile ?? 0, 100)}%`, height: '100%', background: ACCENT, opacity: 0.5 }} />
                </div>
                <span className="text-white/40 w-8 text-right">{r.percentile}%</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Collateral Tab ──

function CollateralTab({ data }: { data: any }) {
  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left font-bold">Type</th>
          <th className="px-2 py-1.5 text-right font-bold">Avg Rate (%)</th>
          <th className="px-2 py-1.5 text-right font-bold">Haircut (%)</th>
          <th className="px-2 py-1.5 text-right font-bold">Vol Share (%)</th>
          <th className="px-2 py-1.5 text-right font-bold">1W Chg (bp)</th>
        </tr>
      </thead>
      <tbody>
        {data.collateral?.map((c: any) => (
          <tr key={c.type} className="border-b border-border/5 hover:bg-white/[0.02]">
            <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.type}</td>
            <td className="px-2 py-1.5 text-right text-white/80 font-bold">{c.avgRate}%</td>
            <td className="px-2 py-1.5 text-right text-white/50">{c.haircut}%</td>
            <td className="px-2 py-1.5 text-right text-white/50">{c.volumeShare}%</td>
            <td className={`px-2 py-1.5 text-right font-bold ${c.change1w >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {c.change1w >= 0 ? '+' : ''}{c.change1w}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Term Structure Tab ──

function TermStructureTab({ data }: { data: any }) {
  const tenors = data.termStructure ?? [];
  const maxVol = Math.max(...tenors.map((t: any) => t.volume ?? 0), 1);

  return (
    <div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Tenor</th>
            <th className="px-2 py-1.5 text-right font-bold">Rate (%)</th>
            <th className="px-2 py-1.5 text-right font-bold">Spread to O/N (bp)</th>
            <th className="px-2 py-1.5 text-right font-bold">Volume ($B)</th>
          </tr>
        </thead>
        <tbody>
          {tenors.map((t: any) => (
            <tr key={t.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
              <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{t.tenor}</td>
              <td className="px-2 py-1.5 text-right text-white/80 font-bold">{t.rate}%</td>
              <td className={`px-2 py-1.5 text-right font-bold ${t.spreadToON > 0 ? 'text-bullish' : t.spreadToON < 0 ? 'text-bearish' : 'text-white/40'}`}>
                {t.spreadToON > 0 ? '+' : ''}{t.spreadToON}
              </td>
              <td className="px-2 py-1.5 text-right text-white/50">{t.volume}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Step-up visualization */}
      {tenors.length > 0 && (
        <div className="px-3 py-3 border-t border-border/10">
          <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">Term Structure Step-Up</div>
          <div className="flex items-end gap-3 h-20">
            {tenors.map((t: any) => {
              const maxRate = Math.max(...tenors.map((x: any) => x.rate ?? 0));
              const minRate = Math.min(...tenors.map((x: any) => x.rate ?? 0));
              const range = maxRate - minRate || 1;
              const pct = ((t.rate - minRate) / range) * 100;
              return (
                <div key={t.tenor} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[7px] text-white/50">{t.rate}%</div>
                  <div className="w-full bg-white/5 relative" style={{ height: '48px' }}>
                    <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${Math.max(pct, 5)}%`, background: ACCENT, opacity: 0.35 }} />
                  </div>
                  <div className="text-[6px] text-neutral/30">{t.tenor}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fails Tab ──

function FailsTab({ data }: { data: any }) {
  const fails = data.fails ?? [];
  const maxTotal = Math.max(...fails.map((f: any) => f.total ?? 0), 1);

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left font-bold">Week Ending</th>
          <th className="px-2 py-1.5 text-right font-bold">Treasury ($B)</th>
          <th className="px-2 py-1.5 text-right font-bold">Agency ($B)</th>
          <th className="px-2 py-1.5 text-right font-bold">Total ($B)</th>
          <th className="px-2 py-1.5 text-right font-bold">WoW Chg (%)</th>
        </tr>
      </thead>
      <tbody>
        {fails.map((f: any) => (
          <tr key={f.weekEnding} className="border-b border-border/5 hover:bg-white/[0.02]">
            <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{f.weekEnding}</td>
            <td className="px-2 py-1.5 text-right text-white/60">{f.treasuryFails}</td>
            <td className="px-2 py-1.5 text-right text-white/60">{f.agencyFails}</td>
            <td className="px-2 py-1.5 text-right">
              <div className="flex items-center justify-end gap-1.5">
                <div className="w-14 h-[4px] bg-white/5 overflow-hidden">
                  <div style={{ width: `${((f.total ?? 0) / maxTotal) * 100}%`, height: '100%', background: (f.total ?? 0) > 50 ? '#ef4444' : ACCENT, opacity: 0.5 }} />
                </div>
                <span className="text-white/80 font-bold">{f.total}</span>
              </div>
            </td>
            <td className={`px-2 py-1.5 text-right font-bold ${f.wowChange >= 0 ? 'text-bearish' : 'text-bullish'}`}>
              {f.wowChange >= 0 ? '+' : ''}{f.wowChange}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
