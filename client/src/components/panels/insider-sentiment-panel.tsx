import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useInsiderSentiment } from '../../api/hooks/use-insider-sentiment';
import { useT, tr, TFn } from '../../i18n';

type View = 'OVERVIEW' | 'TRANSACTIONS' | 'SIGNALS';

interface Transaction {
  ticker: string; company: string; insiderName: string; title: string;
  transactionType: string; formType: string; shares: number; pricePerShare: number;
  totalValue: number; sharesOwned: number; date: string; filingDate: string;
  sentimentScore: number;
}

interface Aggregated {
  ticker: string; company: string;
  buyCount: number; sellCount: number;
  buyVolume: number; sellVolume: number; netVolume: number; buySellRatio: number;
  avgSentiment: number; uniqueInsiders: number;
  recentTransactions: Transaction[];
}

export function InsiderSentimentPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useInsiderSentiment();
  const [view, setView] = useState<View>('OVERVIEW');
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const filteredTx = useMemo(() => {
    if (!data?.transactions) return [] as Transaction[];
    if (filter === 'ALL') return data.transactions as Transaction[];
    return (data.transactions as Transaction[]).filter(tx => filter === 'BUY' ? tx.transactionType === 'Purchase' : tx.transactionType === 'Sale');
  }, [data, filter]);

  const VIEWS: View[] = ['OVERVIEW', 'TRANSACTIONS', 'SIGNALS'];

  const fmtVal = (v: number) => {
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'K';
    return v.toString();
  };

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-lime-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-lime-400">
            {tr(t, 'panelInsiderSentiment', 'Insider Sentiment')}
          </span>
          {data?.summary && (
            <span className="text-[7px] font-mono text-neutral-500">
              {data.summary.totalBuys}B / {data.summary.totalSells}S
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${view === v ? 'text-lime-400 bg-lime-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{v}</button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-lime-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {view === 'TRANSACTIONS' && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 shrink-0">
          {(['ALL', 'BUY', 'SELL'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase transition-colors ${filter === f ? 'text-lime-400 bg-lime-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{f}</button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-lime-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {view === 'OVERVIEW' && data && <OverviewView aggregated={data.aggregated as Aggregated[]} summary={data.summary} fmtVal={fmtVal} />}
        {view === 'TRANSACTIONS' && data && <TransactionsView transactions={filteredTx} fmtVal={fmtVal} />}
        {view === 'SIGNALS' && data && <SignalsView aggregated={data.aggregated as Aggregated[]} summary={data.summary} fmtVal={fmtVal} />}
      </div>
    </div>
  );
}

// ── Overview View ──
function OverviewView({ aggregated, summary, fmtVal }: {
  aggregated: Aggregated[];
  summary: { totalBuys: number; totalSells: number; totalBuyVolume: number; totalSellVolume: number; avgSentiment: number };
  fmtVal: (v: number) => string;
}) {
  const netColor = (v: number) => v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-neutral-400';
  const maxAbs = Math.max(...aggregated.map(a => Math.abs(a.netVolume)), 1);

  return (
    <div>
      <div className="grid grid-cols-5 gap-2 p-2">
        {[
          { label: 'TOTAL BUYS', value: summary.totalBuys.toString(), color: 'text-green-400' },
          { label: 'TOTAL SELLS', value: summary.totalSells.toString(), color: 'text-red-400' },
          { label: 'BUY VOLUME', value: '$' + fmtVal(summary.totalBuyVolume), color: 'text-green-400' },
          { label: 'SELL VOLUME', value: '$' + fmtVal(summary.totalSellVolume), color: 'text-red-400' },
          { label: 'AVG SENTIMENT', value: summary.avgSentiment.toFixed(1), color: summary.avgSentiment > 50 ? 'text-green-400' : 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#050505] border border-border/10 px-2 py-1.5">
            <div className="text-[6px] font-mono text-neutral-600 uppercase">{s.label}</div>
            <div className={`text-[10px] font-mono font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase">TICKER</span>
        <span className="w-[28px] text-[7px] font-mono text-neutral-600 uppercase text-right">B</span>
        <span className="w-[28px] text-[7px] font-mono text-neutral-600 uppercase text-right">S</span>
        <span className="w-[52px] text-[7px] font-mono text-neutral-600 uppercase text-right">NET VOL</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right">B/S</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase text-center">NET FLOW</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">SENT</span>
      </div>
      {aggregated.map(a => (
        <div key={a.ticker} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
          <span className="w-[48px] text-[8px] font-mono font-bold text-white">{a.ticker}</span>
          <span className="w-[28px] text-[8px] font-mono text-right text-green-400">{a.buyCount}</span>
          <span className="w-[28px] text-[8px] font-mono text-right text-red-400">{a.sellCount}</span>
          <span className={`w-[52px] text-[8px] font-mono text-right font-bold ${netColor(a.netVolume)}`}>
            {a.netVolume > 0 ? '+' : ''}{fmtVal(a.netVolume)}
          </span>
          <span className="w-[36px] text-[8px] font-mono text-right text-neutral-300">{a.buySellRatio.toFixed(1)}</span>
          <div className="flex-1 px-2">
            <div className="h-1.5 bg-neutral-900 relative flex">
              {a.netVolume >= 0 ? (
                <div className="absolute left-1/2 top-0 h-full bg-green-400/50" style={{ width: `${(a.netVolume / maxAbs) * 50}%` }} />
              ) : (
                <div className="absolute top-0 h-full bg-red-400/50" style={{ right: '50%', width: `${(Math.abs(a.netVolume) / maxAbs) * 50}%` }} />
              )}
              <div className="absolute left-1/2 top-0 h-full w-px bg-neutral-700" />
            </div>
          </div>
          <span className={`w-[36px] text-[8px] font-mono text-right pr-1 font-bold ${a.avgSentiment > 50 ? 'text-green-400' : 'text-red-400'}`}>{a.avgSentiment.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Transactions View ──
function TransactionsView({ transactions, fmtVal }: { transactions: Transaction[]; fmtVal: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase">TICKER</span>
        <span className="w-[80px] text-[7px] font-mono text-neutral-600 uppercase">INSIDER</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-center">TYPE</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right">SHARES</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase text-right">VALUE</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">PRICE</span>
        <span className="w-[56px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">DATE</span>
      </div>
      {transactions.map((tx, i) => (
        <div key={i} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
          <span className="w-[48px] text-[8px] font-mono font-bold text-white truncate">{tx.ticker}</span>
          <span className="w-[80px] text-[7px] font-mono text-neutral-400 truncate" title={`${tx.insiderName} (${tx.title})`}>{tx.insiderName}</span>
          <span className={`w-[32px] text-[7px] font-mono font-bold text-center ${tx.transactionType === 'Purchase' ? 'text-green-400' : 'text-red-400'}`}>
            {tx.transactionType === 'Purchase' ? 'BUY' : 'SELL'}
          </span>
          <span className="w-[44px] text-[8px] font-mono text-right text-neutral-300">{fmtVal(tx.shares)}</span>
          <span className="w-[48px] text-[8px] font-mono text-right text-neutral-300">${fmtVal(tx.totalValue)}</span>
          <span className="w-[40px] text-[8px] font-mono text-right text-neutral-300">{tx.pricePerShare.toFixed(0)}</span>
          <span className="w-[56px] text-[7px] font-mono text-right text-neutral-500 pr-1">{tx.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Signals View ──
function SignalsView({ aggregated, summary, fmtVal }: {
  aggregated: Aggregated[];
  summary: { totalBuyVolume: number; totalSellVolume: number; avgSentiment: number };
  fmtVal: (v: number) => string;
}) {
  const bullish = aggregated.filter(a => a.netVolume > 0 && a.buyCount >= 2).sort((a, b) => b.avgSentiment - a.avgSentiment);
  const bearish = aggregated.filter(a => a.netVolume < 0 && a.sellCount >= 2).sort((a, b) => a.avgSentiment - b.avgSentiment);
  const clusterBuys = aggregated.filter(a => a.uniqueInsiders >= 3 && a.buyCount >= 3);

  const overallSentiment = summary.totalBuyVolume > summary.totalSellVolume ? 'BULLISH' : 'BEARISH';
  const sentColor = overallSentiment === 'BULLISH' ? 'text-green-400' : 'text-red-400';

  return (
    <div className="p-2 space-y-3">
      <div className="bg-[#050505] border border-border/10 px-3 py-2">
        <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1">Overall Market Insider Sentiment</div>
        <div className="flex items-center gap-3">
          <span className={`text-[12px] font-mono font-black ${sentColor}`}>{overallSentiment}</span>
          <div className="flex-1 h-2 bg-neutral-900 relative">
            <div className="absolute left-0 top-0 h-full bg-green-400/50" style={{ width: `${(summary.totalBuyVolume / (summary.totalBuyVolume + summary.totalSellVolume)) * 100}%` }} />
          </div>
          <span className="text-[8px] font-mono text-neutral-400">Score: {summary.avgSentiment.toFixed(1)}</span>
        </div>
      </div>

      {clusterBuys.length > 0 && (
        <div>
          <div className="text-[7px] font-mono text-yellow-400 uppercase mb-1 tracking-wider">Cluster Buy Signals (3+ insiders buying)</div>
          {clusterBuys.map(a => (
            <div key={a.ticker} className="flex items-center gap-2 px-2 py-1 border-b border-border/5">
              <span className="text-[8px] font-mono font-bold text-yellow-400">{a.ticker}</span>
              <span className="text-[7px] font-mono text-neutral-400">{a.uniqueInsiders} insiders</span>
              <span className="text-[7px] font-mono text-green-400">{a.buyCount} buys</span>
              <span className="text-[7px] font-mono text-neutral-300">${fmtVal(a.buyVolume)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[7px] font-mono text-green-400 uppercase mb-1 tracking-wider">Bullish Signals</div>
          {bullish.slice(0, 8).map(a => (
            <div key={a.ticker} className="flex items-center justify-between px-2 py-1 border-b border-border/5">
              <span className="text-[8px] font-mono font-bold text-white">{a.ticker}</span>
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-green-400">+${fmtVal(a.netVolume)}</span>
                <span className="text-[7px] font-mono text-neutral-500">{a.avgSentiment.toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[7px] font-mono text-red-400 uppercase mb-1 tracking-wider">Bearish Signals</div>
          {bearish.slice(0, 8).map(a => (
            <div key={a.ticker} className="flex items-center justify-between px-2 py-1 border-b border-border/5">
              <span className="text-[8px] font-mono font-bold text-white">{a.ticker}</span>
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-red-400">${fmtVal(a.netVolume)}</span>
                <span className="text-[7px] font-mono text-neutral-500">{a.avgSentiment.toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
