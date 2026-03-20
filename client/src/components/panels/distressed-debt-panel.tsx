import { useMemo } from 'react';
import { useDistressedDebt } from '../../api/hooks/use-distressed-debt';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(0) + ' bps';
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1) + '%';
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2);
}

function fmtYield(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + '%';
}

function fmtDollar(n: number | null | undefined): string {
  if (n == null) return '--';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
  return '$' + n.toFixed(0);
}

function fmtSpread(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(0);
}

// ── Color helpers ──

function priceColor(price: number): string {
  if (price > 70) return 'text-green-400';
  if (price >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function ratingColor(rating: string): string {
  if (rating.startsWith('BB')) return 'text-orange-400';
  if (rating.startsWith('CCC') || rating.startsWith('CC') || rating.startsWith('C') || rating === 'D') return 'text-red-500';
  if (rating.startsWith('B')) return 'text-red-400';
  return 'text-yellow-400';
}

function ratingBg(rating: string): string {
  if (rating.startsWith('BB')) return 'bg-orange-400/10 border border-orange-400/30';
  if (rating.startsWith('CCC') || rating.startsWith('CC') || rating.startsWith('C') || rating === 'D') return 'bg-red-500/10 border border-red-500/30';
  if (rating.startsWith('B')) return 'bg-red-400/10 border border-red-400/30';
  return 'bg-yellow-400/10 border border-yellow-400/30';
}

function distressReasonBg(_reason: string): string {
  return 'bg-red-400/10 border border-red-400/30 text-red-400';
}

function defaultTypeBadge(type: string): { color: string; bg: string } {
  switch (type?.toUpperCase()) {
    case 'MISSED PAYMENT':
    case 'MISSED_PAYMENT':
      return { color: 'text-red-400', bg: 'bg-red-400/10 border border-red-400/30' };
    case 'BANKRUPTCY':
      return { color: 'text-red-500', bg: 'bg-red-500/10 border border-red-500/30' };
    case 'RESTRUCTURING':
      return { color: 'text-orange-400', bg: 'bg-orange-400/10 border border-orange-400/30' };
    case 'DISTRESSED EXCHANGE':
    case 'DISTRESSED_EXCHANGE':
      return { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border border-yellow-400/30' };
    default:
      return { color: 'text-neutral-400', bg: 'bg-neutral-400/10 border border-neutral-400/30' };
  }
}

function loanTypeBadge(type: string): string {
  switch (type?.toUpperCase()) {
    case 'TERM LOAN B':
    case 'TLB':
      return 'text-blue-400 bg-blue-400/10 border border-blue-400/30';
    case 'REVOLVER':
    case 'RCF':
      return 'text-green-400 bg-green-400/10 border border-green-400/30';
    case 'SECOND LIEN':
    case '2ND LIEN':
      return 'text-orange-400 bg-orange-400/10 border border-orange-400/30';
    default:
      return 'text-neutral-400 bg-neutral-400/10 border border-neutral-400/30';
  }
}

// ── Main Panel ──

export function DistressedDebtPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useDistressedDebt();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            {tr(t, 'panelDistressedDebt', 'DISTRESSED DEBT')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING DISTRESSED DEBT DATA...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            ERROR LOADING DATA
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            <IndexBanner data={data} />
            <DistressedIssuersTable data={data} t={t} />
            <SectorBreakdown data={data} t={t} />
            <LeveragedLoansTable data={data} t={t} />
            <DefaultTracker data={data} t={t} />
            <HySpreadChart data={data} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Index Banner ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IndexBanner({ data }: { data: any }) {
  const metrics = [
    { label: 'HY OAS', value: fmtBps(data?.hyOas ?? data?.hyOAS), key: 'hyOas' },
    { label: 'CCC SPREAD', value: fmtBps(data?.cccSpread), key: 'cccSpread' },
    { label: 'DISTRESSED RATIO', value: fmtPct(data?.distressedRatio), key: 'distressedRatio' },
    { label: 'DEFAULT RATE', value: fmtPct(data?.defaultRate), key: 'defaultRate' },
    { label: 'RECOVERY RATE', value: fmtPct(data?.recoveryRate), key: 'recoveryRate' },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-5 gap-px bg-border/10">
        {metrics.map((m) => (
          <div key={m.key} className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500">
              {m.label}
            </div>
            <div className="text-[10px] font-mono font-bold text-white mt-0.5">
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Distressed Issuers Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DistressedIssuersTable({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const issuers = data?.distressedIssuers ?? data?.issuers ?? [];
  if (!Array.isArray(issuers) || issuers.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'ddDistressedIssuers', 'Distressed Issuers')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Name</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Sector</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Coupon</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Maturity</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Price</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Yield</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Spread</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Rating</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Reason</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {issuers.map((issuer: any, idx: number) => (
              <tr key={issuer.name ?? idx} className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{issuer.name ?? '--'}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">{issuer.sector ?? '--'}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">{fmtPct(issuer.coupon)}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">{issuer.maturity ?? '--'}</td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${priceColor(issuer.price ?? 0)}`}>
                  {fmtPrice(issuer.price)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">{fmtYield(issuer.yield)}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">{fmtSpread(issuer.spread)}</td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <span className={`text-[7px] font-bold px-1 py-0.5 ${ratingColor(issuer.rating ?? '')} ${ratingBg(issuer.rating ?? '')}`}>
                    {issuer.rating ?? '--'}
                  </span>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  {issuer.distressReason && (
                    <span className={`text-[7px] font-bold px-1 py-0.5 ${distressReasonBg(issuer.distressReason)}`}>
                      {issuer.distressReason}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sector Breakdown ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectorBreakdown({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const sectors = data?.sectorBreakdown ?? data?.sectors ?? [];
  if (!Array.isArray(sectors) || sectors.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxSpread = useMemo(() => Math.max(...sectors.map((s: any) => s.avgSpread ?? 0), 1), [sectors]);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'ddSectorBreakdown', 'Sector Breakdown')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Sector</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Distressed</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Avg Spread</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Default Rate</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Recovery</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {sectors.map((sector: any, idx: number) => {
              const barPct = ((sector.avgSpread ?? 0) / maxSpread) * 100;
              return (
                <tr key={sector.sector ?? idx} className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold uppercase">{sector.sector ?? '--'}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-red-400 font-bold">{sector.distressedCount ?? sector.count ?? '--'}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-2 bg-neutral-900 relative">
                        <div
                          className="absolute top-0 left-0 h-full bg-red-400/40"
                          style={{ width: `${Math.min(100, barPct)}%` }}
                        />
                      </div>
                      <span className="text-neutral-300">{fmtSpread(sector.avgSpread)}</span>
                    </div>
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">{fmtPct(sector.defaultRate)}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">{fmtPct(sector.recoveryRate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Leveraged Loans Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LeveragedLoansTable({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const loans = data?.leveragedLoans ?? data?.loans ?? [];
  if (!Array.isArray(loans) || loans.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'ddLeveragedLoans', 'Leveraged Loans')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Borrower</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Spread (SOFR+)</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Price</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Facility Size</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Maturity</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Rating</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Type</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {loans.map((loan: any, idx: number) => (
              <tr key={loan.borrower ?? idx} className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{loan.borrower ?? '--'}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">{fmtSpread(loan.spread)}</td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${priceColor(loan.price ?? 100)}`}>
                  {fmtPrice(loan.price)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">{fmtDollar(loan.facilitySize ?? loan.size)}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">{loan.maturity ?? '--'}</td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <span className={`text-[7px] font-bold px-1 py-0.5 ${ratingColor(loan.rating ?? '')} ${ratingBg(loan.rating ?? '')}`}>
                    {loan.rating ?? '--'}
                  </span>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <span className={`text-[7px] font-bold px-1 py-0.5 ${loanTypeBadge(loan.type ?? '')}`}>
                    {loan.type ?? '--'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Default Tracker ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DefaultTracker({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const defaults = data?.defaultTracker ?? data?.defaults ?? [];
  if (!Array.isArray(defaults) || defaults.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'ddDefaultTracker', 'Default Tracker')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Company</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Sector</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Debt Amount</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Default Type</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Exp. Recovery</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {defaults.map((d: any, idx: number) => {
              const badge = defaultTypeBadge(d.defaultType ?? d.type ?? '');
              return (
                <tr key={d.company ?? idx} className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{d.company ?? '--'}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">{d.sector ?? '--'}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">{fmtDollar(d.debtAmount ?? d.amount)}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span className={`text-[7px] font-bold px-1 py-0.5 ${badge.color} ${badge.bg}`}>
                      {(d.defaultType ?? d.type ?? '--').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">{fmtPct(d.expectedRecovery ?? d.recovery)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── HY Spread Monthly Trend Chart (SVG) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HySpreadChart({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const history = data?.hySpreadHistory ?? data?.spreadHistory ?? [];
  if (!Array.isArray(history) || history.length < 2) return null;

  const W = 320;
  const H = 100;
  const PAD_X = 30;
  const PAD_Y = 14;
  const PAD_BOTTOM = 20;

  const chartData = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values = history.map((h: any) => h.value ?? h.spread ?? 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labels = history.map((h: any) => h.month ?? h.label ?? h.date ?? '');
    const minV = Math.min(...values) * 0.95;
    const maxV = Math.max(...values) * 1.05;
    const rangeV = maxV - minV || 1;

    const scaleX = (i: number) => PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2);
    const scaleY = (v: number) => PAD_Y + ((maxV - v) / rangeV) * (H - PAD_Y - PAD_BOTTOM);

    const linePath = values
      .map((v: number, i: number) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    const fillPath = `${linePath} L ${scaleX(values.length - 1).toFixed(1)},${H - PAD_BOTTOM} L ${scaleX(0).toFixed(1)},${H - PAD_BOTTOM} Z`;

    const points = values.map((v: number, i: number) => ({
      x: scaleX(i),
      y: scaleY(v),
      value: v,
      label: labels[i],
    }));

    const gridLines: { y: number; label: string }[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const v = minV + (rangeV / steps) * i;
      gridLines.push({ y: scaleY(v), label: v.toFixed(0) });
    }

    return { linePath, fillPath, points, gridLines, lastPoint: points[points.length - 1] };
  }, [history]);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'ddHySpreadTrend', 'HY Spread Monthly Trend (12M)')}
        </span>
      </div>
      <div className="px-3 py-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
          {/* Grid lines */}
          {chartData.gridLines.map((g, i) => (
            <g key={i}>
              <line
                x1={PAD_X}
                y1={g.y}
                x2={W - PAD_X}
                y2={g.y}
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="2,3"
              />
              <text
                x={PAD_X - 4}
                y={g.y + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.25)"
                fontSize={6}
                fontFamily="monospace"
              >
                {g.label}
              </text>
            </g>
          ))}

          {/* Fill area */}
          <path d={chartData.fillPath} fill="rgba(248,113,113,0.08)" />

          {/* Line */}
          <path d={chartData.linePath} fill="none" stroke="#f87171" strokeWidth={1.5} />

          {/* Data points */}
          {chartData.points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={2} fill="#f87171" />
              {/* Show label for every other month to avoid crowding */}
              {i % 2 === 0 && (
                <text
                  x={p.x}
                  y={H - PAD_BOTTOM + 10}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.25)"
                  fontSize={6}
                  fontFamily="monospace"
                >
                  {p.label}
                </text>
              )}
            </g>
          ))}

          {/* Last point highlight */}
          {chartData.lastPoint && (
            <>
              <circle cx={chartData.lastPoint.x} cy={chartData.lastPoint.y} r={3.5} fill="none" stroke="#f87171" strokeWidth={1} />
              <text
                x={chartData.lastPoint.x}
                y={chartData.lastPoint.y - 6}
                textAnchor="middle"
                fill="white"
                fontSize={7}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {chartData.lastPoint.value.toFixed(0)}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
