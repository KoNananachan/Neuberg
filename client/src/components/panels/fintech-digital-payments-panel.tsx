import { useState } from 'react';
import { useFintechDigitalPayments } from '../../api/hooks/use-fintech-digital-payments';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtDollar(n: number): string {
  if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(1) + 'T';
  if (Math.abs(n) >= 1) return '$' + n.toFixed(1) + 'B';
  return '$' + (n * 1000).toFixed(0) + 'M';
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtNum(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function changeColor(n: number): string {
  if (n > 0) return '#34d399';
  if (n < 0) return '#f87171';
  return 'rgba(255,255,255,0.3)';
}

// ── Fallback Data ──

const FALLBACK_DATA = {
  processors: [
    { name: 'Visa', ticker: 'V', tpvBn: 3420, revenueBn: 36.8, takeRateBps: 10.8, growthPct: 9.2, marketCapBn: 612, ps: 16.6 },
    { name: 'Mastercard', ticker: 'MA', tpvBn: 2280, revenueBn: 28.2, takeRateBps: 12.4, growthPct: 11.4, marketCapBn: 478, ps: 17.0 },
    { name: 'PayPal', ticker: 'PYPL', tpvBn: 1680, revenueBn: 32.6, takeRateBps: 19.4, growthPct: 6.8, marketCapBn: 82, ps: 2.5 },
    { name: 'Stripe', ticker: 'PRIVATE', tpvBn: 1250, revenueBn: 18.6, takeRateBps: 14.9, growthPct: 24.5, marketCapBn: 91, ps: 4.9 },
    { name: 'Adyen', ticker: 'ADYEN', tpvBn: 1120, revenueBn: 9.4, takeRateBps: 8.4, growthPct: 22.1, marketCapBn: 58, ps: 6.2 },
    { name: 'Block (SQ)', ticker: 'XYZ', tpvBn: 245, revenueBn: 24.1, takeRateBps: 98.4, growthPct: 8.2, marketCapBn: 42, ps: 1.7 },
    { name: 'Fiserv', ticker: 'FI', tpvBn: 980, revenueBn: 20.1, takeRateBps: 20.5, growthPct: 7.4, marketCapBn: 118, ps: 5.9 },
    { name: 'FIS', ticker: 'FIS', tpvBn: 720, revenueBn: 14.8, takeRateBps: 20.6, growthPct: 3.2, marketCapBn: 48, ps: 3.2 },
    { name: 'Global Payments', ticker: 'GPN', tpvBn: 410, revenueBn: 9.6, takeRateBps: 23.4, growthPct: 5.8, marketCapBn: 28, ps: 2.9 },
    { name: 'Worldline', ticker: 'WLN', tpvBn: 380, revenueBn: 4.8, takeRateBps: 12.6, growthPct: -1.2, marketCapBn: 6.2, ps: 1.3 },
  ],
  neobanks: [
    { name: 'Nubank', ticker: 'NU', usersM: 105, depositsBn: 28.4, revenueBn: 12.8, valuationBn: 62, breakeven: 'YES', region: 'LATAM' },
    { name: 'Revolut', ticker: 'PRIVATE', usersM: 48, depositsBn: 24.2, revenueBn: 3.4, valuationBn: 45, breakeven: 'YES', region: 'EMEA' },
    { name: 'Chime', ticker: 'PRIVATE', usersM: 22, depositsBn: 18.6, revenueBn: 1.8, valuationBn: 25, breakeven: 'NO', region: 'US' },
    { name: 'N26', ticker: 'PRIVATE', usersM: 8, depositsBn: 8.4, revenueBn: 0.38, valuationBn: 9.2, breakeven: 'NO', region: 'EMEA' },
    { name: 'Monzo', ticker: 'PRIVATE', usersM: 10, depositsBn: 7.8, revenueBn: 0.84, valuationBn: 5.8, breakeven: 'YES', region: 'UK' },
    { name: 'SoFi', ticker: 'SOFI', usersM: 9.4, depositsBn: 22.1, revenueBn: 2.6, valuationBn: 14.2, breakeven: 'YES', region: 'US' },
    { name: 'Starling', ticker: 'PRIVATE', usersM: 4.2, depositsBn: 12.8, revenueBn: 0.62, valuationBn: 3.2, breakeven: 'YES', region: 'UK' },
    { name: 'Cash App', ticker: 'XYZ', usersM: 57, depositsBn: 14.2, revenueBn: 15.4, valuationBn: 0, breakeven: 'YES', region: 'US' },
    { name: 'Wise', ticker: 'WISE', usersM: 16.5, depositsBn: 12.4, revenueBn: 1.2, valuationBn: 11.8, breakeven: 'YES', region: 'GLOBAL' },
    { name: 'Mercado Pago', ticker: 'MELI', usersM: 52, depositsBn: 9.8, revenueBn: 6.2, valuationBn: 0, breakeven: 'YES', region: 'LATAM' },
  ],
  bnpl: [
    { name: 'Klarna', ticker: 'KLAR', gmvBn: 105, revenueBn: 2.8, takeRatePct: 2.67, lossRatePct: 1.8, activeUsersM: 85 },
    { name: 'Affirm', ticker: 'AFRM', gmvBn: 32, revenueBn: 2.4, takeRatePct: 7.5, lossRatePct: 4.2, activeUsersM: 19 },
    { name: 'Afterpay (Block)', ticker: 'XYZ', gmvBn: 28, revenueBn: 1.1, takeRatePct: 3.93, lossRatePct: 2.1, activeUsersM: 24 },
    { name: 'Zip', ticker: 'ZIP', gmvBn: 10.4, revenueBn: 0.78, takeRatePct: 7.5, lossRatePct: 3.8, activeUsersM: 6.2 },
    { name: 'Sezzle', ticker: 'SEZL', gmvBn: 2.4, revenueBn: 0.24, takeRatePct: 10.0, lossRatePct: 2.4, activeUsersM: 4.8 },
    { name: 'PayPal BNPL', ticker: 'PYPL', gmvBn: 38, revenueBn: 1.6, takeRatePct: 4.21, lossRatePct: 1.5, activeUsersM: 32 },
    { name: 'Apple Pay Later', ticker: 'AAPL', gmvBn: 18, revenueBn: 0, takeRatePct: 0, lossRatePct: 0.8, activeUsersM: 14 },
    { name: 'Tabby', ticker: 'PRIVATE', gmvBn: 8.2, revenueBn: 0.42, takeRatePct: 5.12, lossRatePct: 1.9, activeUsersM: 12 },
  ],
  rtp: [
    { country: 'India (UPI)', volumeBn: 172, growthPct: 42.8, adoptionPct: 78.2, provider: 'NPCI', launchYear: 2016 },
    { country: 'Brazil (PIX)', volumeBn: 52.4, growthPct: 65.2, adoptionPct: 72.4, provider: 'BCB', launchYear: 2020 },
    { country: 'Thailand (PromptPay)', volumeBn: 18.6, growthPct: 38.4, adoptionPct: 64.8, provider: 'BOT', launchYear: 2017 },
    { country: 'South Korea', volumeBn: 14.2, growthPct: 12.4, adoptionPct: 58.2, provider: 'KFTC', launchYear: 2001 },
    { country: 'UK (Faster Payments)', volumeBn: 12.8, growthPct: 8.6, adoptionPct: 52.4, provider: 'Pay.UK', launchYear: 2008 },
    { country: 'Nigeria (NIP)', volumeBn: 8.4, growthPct: 54.2, adoptionPct: 42.8, provider: 'NIBSS', launchYear: 2011 },
    { country: 'USA (FedNow)', volumeBn: 4.8, growthPct: 285.0, adoptionPct: 12.4, provider: 'Fed Reserve', launchYear: 2023 },
    { country: 'Singapore (PayNow)', volumeBn: 3.2, growthPct: 28.4, adoptionPct: 68.2, provider: 'ABS', launchYear: 2017 },
    { country: 'EU (TIPS)', volumeBn: 6.8, growthPct: 42.1, adoptionPct: 18.6, provider: 'ECB', launchYear: 2018 },
    { country: 'Australia (NPP)', volumeBn: 5.4, growthPct: 22.8, adoptionPct: 48.6, provider: 'NPPA', launchYear: 2018 },
    { country: 'Japan (Zengin)', volumeBn: 8.2, growthPct: 6.4, adoptionPct: 34.2, provider: 'BOJ', launchYear: 1973 },
    { country: 'Mexico (SPEI)', volumeBn: 7.6, growthPct: 32.4, adoptionPct: 38.4, provider: 'Banxico', launchYear: 2004 },
  ],
};

// ── Tab type ──

type Tab = 'processors' | 'neobanks' | 'bnpl' | 'rtp';

const TABS: { key: Tab; label: string }[] = [
  { key: 'processors', label: 'PROCESSORS' },
  { key: 'neobanks', label: 'NEOBANKS' },
  { key: 'bnpl', label: 'BNPL' },
  { key: 'rtp', label: 'RTP' },
];

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 border-b border-teal-500/30">
      <div className="w-1 h-1 bg-teal-400" />
      <span className="text-[7px] font-black uppercase tracking-widest text-teal-400">{title}</span>
    </div>
  );
}

// ── Processors Tab ──

function ProcessorsTab({ processors }: { processors: typeof FALLBACK_DATA.processors }) {
  return (
    <>
      <SectionHeader title="Payment Processor Overview" />
      <div className="px-3 py-1 border-b border-border/20">
        <div className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr_0.4fr] text-[7px] font-bold uppercase tracking-wider text-neutral-500">
          <span>Processor</span>
          <span className="text-right">TPV</span>
          <span className="text-right">Revenue</span>
          <span className="text-right">Take Rate</span>
          <span className="text-right">Growth</span>
          <span className="text-right">Mkt Cap</span>
          <span className="text-right">P/S</span>
        </div>
      </div>
      {processors.map((p: any, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr_0.4fr] px-3 py-1 border-b border-border/20 hover:bg-teal-500/[0.02] transition-colors items-center"
        >
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-white/80 truncate">{p.name}</span>
            <span className="text-[7px] text-neutral-500">{p.ticker}</span>
          </div>
          <span className="text-right text-teal-400 tabular-nums font-bold">{fmtDollar(p.tpvBn)}</span>
          <span className="text-right text-white/60 tabular-nums">{fmtDollar(p.revenueBn)}</span>
          <span className="text-right text-white/50 tabular-nums">{fmtNum(p.takeRateBps)}bp</span>
          <span className="text-right tabular-nums font-bold" style={{ color: changeColor(p.growthPct) }}>
            {fmtPct(p.growthPct)}
          </span>
          <span className="text-right text-white/60 tabular-nums">{fmtDollar(p.marketCapBn)}</span>
          <span className="text-right text-teal-400/70 tabular-nums">{fmtNum(p.ps)}x</span>
        </div>
      ))}

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-px bg-teal-500/30 mx-0 mt-px">
        {[
          { label: 'TOTAL TPV', value: fmtDollar(processors.reduce((s: number, p: any) => s + p.tpvBn, 0)) },
          { label: 'TOTAL REVENUE', value: fmtDollar(processors.reduce((s: number, p: any) => s + p.revenueBn, 0)) },
          { label: 'AVG GROWTH', value: fmtPct(processors.reduce((s: number, p: any) => s + p.growthPct, 0) / processors.length) },
        ].map((item: any, i: number) => (
          <div key={i} className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-neutral-500 uppercase tracking-wider">{item.label}</div>
            <div className="text-[11px] font-bold text-teal-400 tabular-nums">{item.value}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Neobanks Tab ──

function NeobanksTab({ neobanks }: { neobanks: typeof FALLBACK_DATA.neobanks }) {
  return (
    <>
      <SectionHeader title="Digital Banks & Neobanks" />
      <div className="px-3 py-1 border-b border-border/20">
        <div className="grid grid-cols-[1.1fr_0.4fr_0.5fr_0.5fr_0.5fr_0.5fr_0.4fr] text-[7px] font-bold uppercase tracking-wider text-neutral-500">
          <span>Bank</span>
          <span className="text-right">Users</span>
          <span className="text-right">Deposits</span>
          <span className="text-right">Revenue</span>
          <span className="text-right">Valuation</span>
          <span className="text-center">B/E</span>
          <span className="text-center">Region</span>
        </div>
      </div>
      {neobanks.map((n: any, i: number) => {
        const beColor = n.breakeven === 'YES' ? '#34d399' : '#f87171';
        const beBg = n.breakeven === 'YES' ? 'rgba(52,211,153,0.10)' : 'rgba(248,113,113,0.10)';
        return (
          <div
            key={i}
            className="grid grid-cols-[1.1fr_0.4fr_0.5fr_0.5fr_0.5fr_0.5fr_0.4fr] px-3 py-1 border-b border-border/20 hover:bg-teal-500/[0.02] transition-colors items-center"
          >
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-white/80 truncate">{n.name}</span>
              <span className="text-[7px] text-neutral-500">{n.ticker}</span>
            </div>
            <span className="text-right text-teal-400 tabular-nums font-bold">{fmtNum(n.usersM)}M</span>
            <span className="text-right text-white/60 tabular-nums">{fmtDollar(n.depositsBn)}</span>
            <span className="text-right text-white/50 tabular-nums">{fmtDollar(n.revenueBn)}</span>
            <span className="text-right text-teal-400/70 tabular-nums font-bold">
              {n.valuationBn > 0 ? fmtDollar(n.valuationBn) : '--'}
            </span>
            <div className="flex justify-center">
              <span
                className="px-1 py-0.5 text-[6px] font-black uppercase"
                style={{ color: beColor, backgroundColor: beBg }}
              >
                {n.breakeven}
              </span>
            </div>
            <div className="flex justify-center">
              <span className="px-1 py-0.5 text-[6px] font-black uppercase text-neutral-300 bg-white/[0.04]">
                {n.region}
              </span>
            </div>
          </div>
        );
      })}

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-px bg-teal-500/30 mx-0 mt-px">
        {[
          { label: 'TOTAL USERS', value: fmtNum(neobanks.reduce((s: number, n: any) => s + n.usersM, 0)) + 'M' },
          { label: 'TOTAL DEPOSITS', value: fmtDollar(neobanks.reduce((s: number, n: any) => s + n.depositsBn, 0)) },
          { label: 'PROFITABLE', value: neobanks.filter((n: any) => n.breakeven === 'YES').length + '/' + neobanks.length },
        ].map((item: any, i: number) => (
          <div key={i} className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-neutral-500 uppercase tracking-wider">{item.label}</div>
            <div className="text-[11px] font-bold text-teal-400 tabular-nums">{item.value}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── BNPL Tab ──

function BnplTab({ bnpl }: { bnpl: typeof FALLBACK_DATA.bnpl }) {
  return (
    <>
      <SectionHeader title="Buy Now Pay Later Providers" />
      <div className="px-3 py-1 border-b border-border/20">
        <div className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr] text-[7px] font-bold uppercase tracking-wider text-neutral-500">
          <span>Provider</span>
          <span className="text-right">GMV</span>
          <span className="text-right">Revenue</span>
          <span className="text-right">Take Rate</span>
          <span className="text-right">Loss Rate</span>
          <span className="text-right">Users</span>
        </div>
      </div>
      {bnpl.map((b: any, i: number) => {
        const lossColor = b.lossRatePct >= 4 ? '#f87171' : b.lossRatePct >= 2.5 ? '#fbbf24' : '#34d399';
        return (
          <div
            key={i}
            className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-teal-500/[0.02] transition-colors items-center"
          >
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-white/80 truncate">{b.name}</span>
              <span className="text-[7px] text-neutral-500">{b.ticker}</span>
            </div>
            <span className="text-right text-teal-400 tabular-nums font-bold">{fmtDollar(b.gmvBn)}</span>
            <span className="text-right text-white/60 tabular-nums">
              {b.revenueBn > 0 ? fmtDollar(b.revenueBn) : '--'}
            </span>
            <span className="text-right text-white/50 tabular-nums">
              {b.takeRatePct > 0 ? fmtNum(b.takeRatePct) + '%' : '--'}
            </span>
            <span className="text-right tabular-nums font-bold" style={{ color: lossColor }}>
              {fmtNum(b.lossRatePct)}%
            </span>
            <span className="text-right text-white/60 tabular-nums">{fmtNum(b.activeUsersM)}M</span>
          </div>
        );
      })}

      {/* Loss rate distribution */}
      <div className="px-3 py-2 border-t border-teal-500/30">
        <div className="text-[7px] text-neutral-500 uppercase tracking-wider mb-1.5">Loss Rate Distribution</div>
        <div className="flex gap-2">
          {bnpl.filter((b: any) => b.lossRatePct > 0).map((b: any, i: number) => {
            const barColor = b.lossRatePct >= 4 ? '#f87171' : b.lossRatePct >= 2.5 ? '#fbbf24' : '#34d399';
            return (
              <div key={i} className="flex flex-col items-center flex-1">
                <div className="w-full h-1.5 bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.min(b.lossRatePct * 20, 100)}%`,
                      backgroundColor: barColor,
                      opacity: 0.5,
                    }}
                  />
                </div>
                <span className="text-[6px] text-neutral-500 mt-0.5 truncate w-full text-center">
                  {b.name.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-px bg-teal-500/30 mx-0 mt-px">
        {[
          { label: 'TOTAL GMV', value: fmtDollar(bnpl.reduce((s: number, b: any) => s + b.gmvBn, 0)) },
          { label: 'TOTAL USERS', value: fmtNum(bnpl.reduce((s: number, b: any) => s + b.activeUsersM, 0)) + 'M' },
          { label: 'AVG LOSS RATE', value: fmtNum(bnpl.reduce((s: number, b: any) => s + b.lossRatePct, 0) / bnpl.length) + '%' },
        ].map((item: any, i: number) => (
          <div key={i} className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-neutral-500 uppercase tracking-wider">{item.label}</div>
            <div className="text-[11px] font-bold text-teal-400 tabular-nums">{item.value}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── RTP Tab ──

function RtpTab({ rtp }: { rtp: typeof FALLBACK_DATA.rtp }) {
  return (
    <>
      <SectionHeader title="Real-Time Payment Systems by Country" />
      <div className="px-3 py-1 border-b border-border/20">
        <div className="grid grid-cols-[1.3fr_0.5fr_0.5fr_0.5fr_0.5fr_0.4fr] text-[7px] font-bold uppercase tracking-wider text-neutral-500">
          <span>Country / System</span>
          <span className="text-right">Vol (Bn)</span>
          <span className="text-right">Growth</span>
          <span className="text-right">Adoption</span>
          <span className="text-center">Provider</span>
          <span className="text-right">Launch</span>
        </div>
      </div>
      {rtp.map((r: any, i: number) => {
        const adoptionColor = r.adoptionPct >= 60 ? '#34d399' : r.adoptionPct >= 30 ? '#fbbf24' : '#f87171';
        return (
          <div
            key={i}
            className="grid grid-cols-[1.3fr_0.5fr_0.5fr_0.5fr_0.5fr_0.4fr] px-3 py-1 border-b border-border/20 hover:bg-teal-500/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-bold text-white/80 truncate">{r.country}</span>
            <span className="text-right text-teal-400 tabular-nums font-bold">{fmtNum(r.volumeBn)}</span>
            <span className="text-right tabular-nums font-bold" style={{ color: changeColor(r.growthPct) }}>
              {fmtPct(r.growthPct)}
            </span>
            <span className="text-right tabular-nums" style={{ color: adoptionColor }}>
              {fmtNum(r.adoptionPct)}%
            </span>
            <div className="flex justify-center">
              <span className="px-1 py-0.5 text-[6px] font-black uppercase text-neutral-300 bg-white/[0.04]">
                {r.provider}
              </span>
            </div>
            <span className="text-right text-white/40 tabular-nums">{r.launchYear}</span>
          </div>
        );
      })}

      {/* Adoption rate visual */}
      <div className="px-3 py-2 border-t border-teal-500/30">
        <div className="text-[7px] text-neutral-500 uppercase tracking-wider mb-1.5">Adoption Rate by Market</div>
        {rtp.slice(0, 8).map((r: any, i: number) => {
          const adoptionColor = r.adoptionPct >= 60 ? '#34d399' : r.adoptionPct >= 30 ? '#fbbf24' : '#f87171';
          return (
            <div key={i} className="flex items-center gap-2 mb-0.5">
              <span className="text-[7px] text-neutral-500 w-20 truncate">{r.country.split(' (')[0]}</span>
              <div className="flex-1 h-1.5 bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${r.adoptionPct}%`,
                    backgroundColor: adoptionColor,
                    opacity: 0.5,
                  }}
                />
              </div>
              <span className="text-[7px] tabular-nums w-8 text-right" style={{ color: adoptionColor }}>
                {fmtNum(r.adoptionPct)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-px bg-teal-500/30 mx-0 mt-px">
        {[
          { label: 'TOTAL VOLUME', value: fmtNum(rtp.reduce((s: number, r: any) => s + r.volumeBn, 0)) + 'Bn' },
          { label: 'AVG GROWTH', value: fmtPct(rtp.reduce((s: number, r: any) => s + r.growthPct, 0) / rtp.length) },
          { label: 'AVG ADOPTION', value: fmtNum(rtp.reduce((s: number, r: any) => s + r.adoptionPct, 0) / rtp.length) + '%' },
        ].map((item: any, i: number) => (
          <div key={i} className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-neutral-500 uppercase tracking-wider">{item.label}</div>
            <div className="text-[11px] font-bold text-teal-400 tabular-nums">{item.value}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Main Panel ──

export function FintechDigitalPaymentsPanel() {
  const { data, isLoading, refetch } = useFintechDigitalPayments();
  const [activeTab, setActiveTab] = useState<Tab>('processors');

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-teal-500/30 shrink-0">
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-teal-400">
            FINTECH & DIGITAL PAYMENTS
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-white/30 animate-pulse">LOADING FINTECH DATA...</span>
        </div>
      </div>
    );
  }

  // No-data state
  if (!data && !isLoading) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-teal-500/30 shrink-0">
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-teal-400">
            FINTECH & DIGITAL PAYMENTS
          </span>
          <button onClick={() => refetch()} className="p-1 text-white/30 hover:text-teal-400 transition-colors">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-red-400/60">FAILED TO LOAD FINTECH DATA</span>
        </div>
      </div>
    );
  }

  const d = data || FALLBACK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-teal-500/30 shrink-0">
        <span className="text-[9px] font-black uppercase tracking-wider text-teal-400">
          FINTECH & DIGITAL PAYMENTS
        </span>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-teal-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-1.5 text-[8px] font-bold uppercase tracking-wider transition-colors ${
              activeTab === key
                ? 'text-teal-400 border-b border-teal-400 bg-teal-500/5'
                : 'text-neutral-500 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {activeTab === 'processors' && <ProcessorsTab processors={(d as any).processors || FALLBACK_DATA.processors} />}
        {activeTab === 'neobanks' && <NeobanksTab neobanks={(d as any).neobanks || FALLBACK_DATA.neobanks} />}
        {activeTab === 'bnpl' && <BnplTab bnpl={(d as any).bnpl || FALLBACK_DATA.bnpl} />}
        {activeTab === 'rtp' && <RtpTab rtp={(d as any).rtp || FALLBACK_DATA.rtp} />}
      </div>
    </div>
  );
}
