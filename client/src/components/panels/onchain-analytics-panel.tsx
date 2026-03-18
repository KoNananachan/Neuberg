import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useOnchainAnalytics } from '../../api/hooks/use-onchain-analytics';
import { useT } from '../../i18n';

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => { try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; } };

type View = 'OVERVIEW' | 'EXCHANGE' | 'SUPPLY';

interface Chain {
  id: string; name: string; price: number;
  network: { activeAddresses: number; txVolume24h: number; fees24h: number; hashrate: number | null };
  valuation: { nvtRatio: number; nvtSignal: string; mvrvRatio: number; mvrvSignal: string; sopr: number };
  exchange: { inflow: number; outflow: number; netFlow: number; reserves: number; reserveChange: number };
  whales: { transactions: number; buyVolume: number; sellVolume: number };
  supply: { inProfit: number; onExchanges: number; hodlWaves: Record<string, number> };
  history: { date: string; activeAddresses: number; txVolume: number; fees: number; nvt: number }[];
}

export function OnchainAnalyticsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useOnchainAnalytics();
  const [view, setView] = useState<View>('OVERVIEW');
  const [selectedChain, setSelectedChain] = useState('BTC');

  const chains = useMemo(() => (data?.chains ?? []) as Chain[], [data]);
  const selected = useMemo(() => chains.find(c => c.id === selectedChain) ?? chains[0], [chains, selectedChain]);

  const fmtVal = (v: number) => {
    if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1) + 'B';
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'K';
    return v.toFixed(0);
  };

  const sigColor = (s: string) => s.includes('Under') ? 'text-green-400' : s.includes('Over') ? 'text-red-400' : 'text-neutral-400';
  const chgColor = (v: number) => v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-neutral-400';
  const VIEWS: View[] = ['OVERVIEW', 'EXCHANGE', 'SUPPLY'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            {tr(t, 'panelOnchainAnalytics', 'On-Chain Analytics')}
          </span>
          <span className="text-[7px] font-mono text-neutral-500">{chains.length} chains</span>
        </div>
        <div className="flex items-center gap-1.5">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${view === v ? 'text-orange-400 bg-orange-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{v}</button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-orange-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {(view === 'EXCHANGE' || view === 'SUPPLY') && chains.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 shrink-0">
          {chains.map(c => (
            <button key={c.id} onClick={() => setSelectedChain(c.id)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase transition-colors ${selectedChain === c.id ? 'text-orange-400 bg-orange-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{c.id}</button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-orange-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}
        {view === 'OVERVIEW' && data && <OverviewView chains={chains} fmtVal={fmtVal} sigColor={sigColor} />}
        {view === 'EXCHANGE' && selected && <ExchangeView chain={selected} exchangeFlows={data?.exchangeFlows} fmtVal={fmtVal} chgColor={chgColor} />}
        {view === 'SUPPLY' && selected && <SupplyView chain={selected} fmtVal={fmtVal} chgColor={chgColor} />}
      </div>
    </div>
  );
}

function OverviewView({ chains, fmtVal, sigColor }: { chains: Chain[]; fmtVal: (v: number) => string; sigColor: (s: string) => string }) {
  return (
    <div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase">CHAIN</span>
        <span className="w-[52px] text-[7px] font-mono text-neutral-600 uppercase text-right">PRICE</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right">ACTIVE</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right">TX VOL</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right">FEES</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">NVT</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase text-right">SIGNAL</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right">MVRV</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">SOPR</span>
      </div>
      {chains.map(c => (
        <div key={c.id} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors">
          <span className="w-[40px] text-[8px] font-mono font-bold text-orange-400">{c.id}</span>
          <span className="w-[52px] text-[8px] font-mono text-right text-white font-bold">${c.price >= 1000 ? fmtVal(c.price) : c.price.toFixed(2)}</span>
          <span className="w-[44px] text-[8px] font-mono text-right text-neutral-300">{fmtVal(c.network.activeAddresses)}</span>
          <span className="w-[44px] text-[8px] font-mono text-right text-neutral-300">${fmtVal(c.network.txVolume24h)}</span>
          <span className="w-[36px] text-[8px] font-mono text-right text-neutral-300">${fmtVal(c.network.fees24h)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{c.valuation.nvtRatio.toFixed(0)}</span>
          <span className={`w-[48px] text-[7px] font-mono text-right font-bold ${sigColor(c.valuation.nvtSignal)}`}>{c.valuation.nvtSignal}</span>
          <span className="w-[36px] text-[8px] font-mono text-right text-neutral-300">{c.valuation.mvrvRatio.toFixed(2)}</span>
          <span className={`w-[36px] text-[8px] font-mono text-right pr-1 ${c.valuation.sopr >= 1 ? 'text-green-400' : 'text-red-400'}`}>{c.valuation.sopr.toFixed(3)}</span>
        </div>
      ))}

      {chains[0] && (
        <div className="p-2">
          <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1 tracking-wider">BTC 30-Day Active Addresses</div>
          {chains[0].history.map((h, i) => (
            <div key={i} className="flex items-center gap-1 py-0.5">
              <span className="w-[40px] text-[6px] font-mono text-neutral-600">{h.date.slice(5)}</span>
              <div className="flex-1 h-1 bg-neutral-900 relative">
                <div className="absolute left-0 top-0 h-full bg-orange-400/40" style={{ width: `${(h.activeAddresses / Math.max(...chains[0].history.map(x => x.activeAddresses))) * 100}%` }} />
              </div>
              <span className="w-[36px] text-[6px] font-mono text-right text-neutral-500">{fmtVal(h.activeAddresses)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExchangeView({ chain, exchangeFlows, fmtVal, chgColor }: {
  chain: Chain;
  exchangeFlows: { exchange: string; btcBalance: number; ethBalance: number; btcNetFlow24h: number; ethNetFlow24h: number; volumeShare: number }[];
  fmtVal: (v: number) => string;
  chgColor: (v: number) => string;
}) {
  return (
    <div className="p-2 space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'EXCHANGE INFLOW', value: '$' + fmtVal(chain.exchange.inflow), color: 'text-red-400' },
          { label: 'EXCHANGE OUTFLOW', value: '$' + fmtVal(chain.exchange.outflow), color: 'text-green-400' },
          { label: 'NET FLOW', value: (chain.exchange.netFlow > 0 ? '+$' : '-$') + fmtVal(Math.abs(chain.exchange.netFlow)), color: chgColor(-chain.exchange.netFlow) },
          { label: 'RESERVES', value: '$' + fmtVal(chain.exchange.reserves), color: 'text-neutral-300' },
          { label: 'RESERVE CHG', value: (chain.exchange.reserveChange > 0 ? '+' : '') + chain.exchange.reserveChange.toFixed(2) + '%', color: chgColor(-chain.exchange.reserveChange) },
        ].map(s => (
          <div key={s.label} className="bg-[#050505] border border-border/10 px-2 py-1.5">
            <div className="text-[6px] font-mono text-neutral-600 uppercase">{s.label}</div>
            <div className={`text-[10px] font-mono font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Whale Activity ({chain.id})</div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#050505] border border-border/10 px-2 py-1.5">
          <div className="text-[6px] font-mono text-neutral-600 uppercase">WHALE TXS</div>
          <div className="text-[10px] font-mono font-bold text-orange-400">{chain.whales.transactions}</div>
        </div>
        <div className="bg-[#050505] border border-border/10 px-2 py-1.5">
          <div className="text-[6px] font-mono text-neutral-600 uppercase">WHALE BUYS</div>
          <div className="text-[10px] font-mono font-bold text-green-400">${fmtVal(chain.whales.buyVolume)}</div>
        </div>
        <div className="bg-[#050505] border border-border/10 px-2 py-1.5">
          <div className="text-[6px] font-mono text-neutral-600 uppercase">WHALE SELLS</div>
          <div className="text-[10px] font-mono font-bold text-red-400">${fmtVal(chain.whales.sellVolume)}</div>
        </div>
      </div>

      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Exchange Balances</div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[64px] text-[7px] font-mono text-neutral-600 uppercase">EXCHANGE</span>
        <span className="w-[52px] text-[7px] font-mono text-neutral-600 uppercase text-right">BTC BAL</span>
        <span className="w-[52px] text-[7px] font-mono text-neutral-600 uppercase text-right">ETH BAL</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase text-right">BTC FLOW</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">VOL%</span>
      </div>
      {(exchangeFlows ?? []).map((ex: { exchange: string; btcBalance: number; ethBalance: number; btcNetFlow24h: number; volumeShare: number }) => (
        <div key={ex.exchange} className="flex items-center px-2 py-[3px] border-b border-border/5">
          <span className="w-[64px] text-[8px] font-mono font-bold text-white">{ex.exchange}</span>
          <span className="w-[52px] text-[8px] font-mono text-right text-neutral-300">{fmtVal(ex.btcBalance)}</span>
          <span className="w-[52px] text-[8px] font-mono text-right text-neutral-300">{fmtVal(ex.ethBalance)}</span>
          <span className={`w-[48px] text-[8px] font-mono text-right ${chgColor(-ex.btcNetFlow24h)}`}>{ex.btcNetFlow24h > 0 ? '+' : ''}{fmtVal(ex.btcNetFlow24h)}</span>
          <span className="w-[40px] text-[8px] font-mono text-right text-neutral-500 pr-1">{ex.volumeShare.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function SupplyView({ chain, fmtVal, chgColor }: { chain: Chain; fmtVal: (v: number) => string; chgColor: (v: number) => string }) {
  const hodlLabels: Record<string, string> = { lt1m: '<1M', m1to3: '1-3M', m3to6: '3-6M', m6to12: '6-12M', y1to2: '1-2Y', gt2y: '>2Y' };
  const hodlColors: Record<string, string> = { lt1m: 'bg-red-400/50', m1to3: 'bg-orange-400/50', m3to6: 'bg-yellow-400/50', m6to12: 'bg-green-400/50', y1to2: 'bg-teal-400/50', gt2y: 'bg-blue-400/50' };

  return (
    <div className="p-2 space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'SUPPLY IN PROFIT', value: chain.supply.inProfit.toFixed(1) + '%', color: chain.supply.inProfit > 70 ? 'text-green-400' : 'text-red-400' },
          { label: 'ON EXCHANGES', value: chain.supply.onExchanges.toFixed(1) + '%', color: 'text-neutral-300' },
          { label: 'NVT RATIO', value: chain.valuation.nvtRatio.toFixed(1), color: 'text-neutral-300' },
          { label: 'MVRV Z-SCORE', value: chain.valuation.mvrvRatio.toFixed(2), color: chain.valuation.mvrvRatio > 3 ? 'text-red-400' : 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#050505] border border-border/10 px-2 py-1.5">
            <div className="text-[6px] font-mono text-neutral-600 uppercase">{s.label}</div>
            <div className={`text-[10px] font-mono font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">HODL Waves ({chain.id})</div>
      {Object.entries(chain.supply.hodlWaves).map(([key, val]) => (
        <div key={key} className="flex items-center gap-2 py-0.5">
          <span className="w-[36px] text-[7px] font-mono text-neutral-500">{hodlLabels[key] ?? key}</span>
          <div className="flex-1 h-2.5 bg-neutral-900 relative">
            <div className={`absolute left-0 top-0 h-full ${hodlColors[key] ?? 'bg-neutral-400/50'}`} style={{ width: `${val}%` }} />
          </div>
          <span className="w-[32px] text-[8px] font-mono text-right text-white font-bold">{val.toFixed(1)}%</span>
        </div>
      ))}

      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mt-2">30-Day NVT Ratio Trend</div>
      {chain.history.map((h, i) => (
        <div key={i} className="flex items-center gap-1 py-0.5">
          <span className="w-[40px] text-[6px] font-mono text-neutral-600">{h.date.slice(5)}</span>
          <div className="flex-1 h-1 bg-neutral-900 relative">
            <div className={`absolute left-0 top-0 h-full ${h.nvt < 35 ? 'bg-green-400/50' : h.nvt > 65 ? 'bg-red-400/50' : 'bg-orange-400/40'}`}
              style={{ width: `${Math.min(h.nvt / 100 * 100, 100)}%` }} />
          </div>
          <span className="w-[28px] text-[6px] font-mono text-right text-neutral-500">{h.nvt.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}
