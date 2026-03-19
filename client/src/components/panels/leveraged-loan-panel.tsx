import { useLeveragedLoan } from '../../api/hooks/use-leveraged-loan';

// ── Constants ──

const ACCENT = '#a3e635'; // lime-400
const ACCENT_DIM = 'rgba(163,230,53,0.04)';

// ── Formatting helpers ──

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtBp(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `SOFR+${n.toFixed(0)}`;
}

function fmtBpRaw(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(0) + ' bp';
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals) + '%';
}

function fmtDollar(n: number | null | undefined, unit = 'B'): string {
  if (n == null || isNaN(n)) return '-';
  return `$${n.toFixed(1)}${unit}`;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(2);
}

function fmtChg(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2);
}

function fmtChgPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

// ── Color helpers ──

function priceColor(price: number | null | undefined): string {
  if (price == null) return 'text-white/60';
  if (price >= 100) return 'text-green-400';
  if (price < 80) return 'text-red-400';
  return 'text-white';
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function purposeBadge(purpose: string | null | undefined): { text: string; cls: string } {
  const p = (purpose ?? '').toUpperCase();
  if (p === 'LBO') return { text: 'LBO', cls: 'text-red-400 bg-red-500/15 border border-red-500/30' };
  if (p === 'REFI' || p === 'REFINANCING') return { text: 'REFI', cls: 'text-blue-400 bg-blue-500/15 border border-blue-500/30' };
  if (p === 'M&A' || p === 'MA') return { text: 'M&A', cls: 'text-purple-400 bg-purple-500/15 border border-purple-500/30' };
  if (p === 'RECAP' || p === 'RECAPITALIZATION') return { text: 'RECAP', cls: 'text-orange-400 bg-orange-500/15 border border-orange-500/30' };
  return { text: p || '-', cls: 'text-neutral-500 bg-neutral-500/10 border border-neutral-500/20' };
}

function ratingBadge(rating: string | null | undefined): { text: string; cls: string } {
  const r = (rating ?? '').toUpperCase();
  if (r.startsWith('BB') || r.startsWith('BA')) return { text: r, cls: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30' };
  if (r.startsWith('B') && !r.startsWith('BB') && !r.startsWith('BA')) return { text: r, cls: 'text-orange-400 bg-orange-500/10 border border-orange-500/30' };
  if (r.startsWith('CCC') || r.startsWith('CAA')) return { text: r, cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
  if (r.startsWith('A') || r.startsWith('BBB') || r.startsWith('BAA')) return { text: r, cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
  return { text: r || '-', cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/20' };
}

function flexBadge(flex: string | null | undefined): { text: string; cls: string } {
  const f = (flex ?? '').toLowerCase();
  if (f === 'tighter' || f === 'tight') return { text: 'TIGHT', cls: 'text-green-400' };
  if (f === 'wider' || f === 'wide') return { text: 'WIDE', cls: 'text-red-400' };
  if (f === 'flat') return { text: 'FLAT', cls: 'text-neutral-400' };
  return { text: (flex ?? '-').toUpperCase(), cls: 'text-neutral-500' };
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-3 py-1.5 border-b border-border/20 bg-black/40">
      <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
        {title}
      </span>
    </div>
  );
}

// ── Summary Item ──

function SummaryItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex-1 px-2 py-1 border-r border-border/10 last:border-r-0" style={{ backgroundColor: ACCENT_DIM }}>
      <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider leading-tight">{label}</div>
      <div
        className="text-[10px] font-mono font-bold leading-tight"
        style={{ color: accent ? ACCENT : '#fff' }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function LeveragedLoanPanel() {
  const { data, isLoading, error } = useLeveragedLoan();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest animate-pulse">
          Loading leveraged loan data...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          Failed to load leveraged loan data
        </div>
      </div>
    );
  }

  const summary = data.summary;
  const indexMetrics = data.indexMetrics;
  const secondaryMarket = data.secondaryMarket;
  const cloMarket = data.cloMarket;
  const newIssuance = data.newIssuance ?? [];
  const pipeline = data.pipeline ?? [];
  const topPerformers = data.topPerformers ?? [];
  const bottomPerformers = data.bottomPerformers ?? [];
  const sectorExposure = data.sectorExposure ?? [];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">

      {/* ── 1. Summary Bar ── */}
      {summary && (
        <div className="flex items-center border-b border-border/20 shrink-0">
          <SummaryItem label="TOTAL MKT SIZE" value={fmtDollar(summary.totalMarketSize, 'T')} accent />
          <SummaryItem label="YTD ISSUANCE" value={fmtDollar(summary.ytdIssuance)} accent />
          <SummaryItem label="AVG NEW DEAL SPD" value={fmtBpRaw(summary.avgNewDealSpread)} />
          <SummaryItem label="REFI WALL" value={fmtDollar(summary.refinancingWall)} />
          <SummaryItem label="DEFAULT FCST" value={fmtPct(summary.defaultForecast, 1)} />
        </div>
      )}

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* ── 2. Index Metrics ── */}
        {indexMetrics && (
          <div>
            <SectionHeader title="Index Metrics (LSTA)" />
            <div className="grid grid-cols-5 gap-0 px-3 py-2 border-b border-border/10">
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">RETURN 1D/1W/1M/YTD</div>
                <div className="text-[9px] font-mono font-bold text-white/90">
                  <span className={changeColor(indexMetrics.return1D)}>{fmtChgPct(indexMetrics.return1D)}</span>
                  <span className="text-neutral-600 mx-0.5">/</span>
                  <span className={changeColor(indexMetrics.return1W)}>{fmtChgPct(indexMetrics.return1W)}</span>
                  <span className="text-neutral-600 mx-0.5">/</span>
                  <span className={changeColor(indexMetrics.return1M)}>{fmtChgPct(indexMetrics.return1M)}</span>
                  <span className="text-neutral-600 mx-0.5">/</span>
                  <span className={changeColor(indexMetrics.returnYTD)}>{fmtChgPct(indexMetrics.returnYTD)}</span>
                </div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">YIELD</div>
                <div className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>{fmtPct(indexMetrics.yield)}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">SPREAD</div>
                <div className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>{fmtBpRaw(indexMetrics.spread)}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">AVG PRICE / DUR</div>
                <div className="text-[9px] font-mono font-bold text-white/80">
                  {fmtPrice(indexMetrics.avgPrice)} <span className="text-neutral-500">/</span> {fmt(indexMetrics.duration, 2)}y
                </div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">DEFAULT RATE</div>
                <div className="text-[9px] font-mono font-bold text-white/60">{fmtPct(indexMetrics.defaultRate)}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. Secondary Market ── */}
        {secondaryMarket && (
          <div>
            <SectionHeader title="Secondary Market" />
            <div className="grid grid-cols-5 gap-0 px-3 py-2 border-b border-border/10">
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">AVG BID / ASK</div>
                <div className="text-[9px] font-mono font-bold text-white/80">
                  {fmtPrice(secondaryMarket.avgBid)} <span className="text-neutral-500">/</span> {fmtPrice(secondaryMarket.avgAsk)}
                </div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">BID-ASK SPD</div>
                <div className="text-[9px] font-mono font-bold text-white/60">{fmt(secondaryMarket.bidAskSpread, 2)}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">DISTRESSED</div>
                <div className="text-[9px] font-mono font-bold text-red-400">{secondaryMarket.distressedCount ?? '-'}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">PAR+ COUNT</div>
                <div className="text-[9px] font-mono font-bold text-green-400">{secondaryMarket.parPlusCount ?? '-'}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">VOLUME</div>
                <div className="text-[9px] font-mono font-bold text-white/60">{fmtDollar(secondaryMarket.volume)}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── 4. CLO Market ── */}
        {cloMarket && (
          <div>
            <SectionHeader title="CLO Market" />
            <div className="grid grid-cols-5 gap-0 px-3 py-2 border-b border-border/10">
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">NEW ISSUANCE 1M</div>
                <div className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>{fmtDollar(cloMarket.newIssuance1M)}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">AAA SPREAD</div>
                <div className="text-[9px] font-mono font-bold text-white/80">{fmtBpRaw(cloMarket.aaaSpread)}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">EQUITY RETURN</div>
                <div className={`text-[9px] font-mono font-bold ${changeColor(cloMarket.equityReturn)}`}>{fmtChgPct(cloMarket.equityReturn)}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">TOTAL AUM</div>
                <div className="text-[9px] font-mono font-bold text-white/60">{fmtDollar(cloMarket.totalAUM)}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-500 uppercase">REINVEST PERIOD</div>
                <div className="text-[9px] font-mono font-bold text-white/60">{cloMarket.reinvestmentPeriod ?? '-'}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── 5a. New Issuance ── */}
        {newIssuance.length > 0 && (
          <div>
            <SectionHeader title="New Issuance" />
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-border/20 text-neutral-500 text-[7px] uppercase tracking-wider">
                  <th className="text-left px-3 py-1 font-normal">BORROWER</th>
                  <th className="text-right px-2 py-1 font-normal">SIZE ($M)</th>
                  <th className="text-right px-2 py-1 font-normal">SPREAD</th>
                  <th className="text-right px-2 py-1 font-normal">FLOOR</th>
                  <th className="text-right px-2 py-1 font-normal">TENOR</th>
                  <th className="text-center px-2 py-1 font-normal">RATING</th>
                  <th className="text-center px-2 py-1 font-normal">PURPOSE</th>
                  <th className="text-center px-2 py-1 font-normal">FLEX</th>
                  <th className="text-right px-3 py-1 font-normal">CLR PRICE</th>
                </tr>
              </thead>
              <tbody>
                {newIssuance.slice(0, 12).map((deal: any, i: number) => {
                  const pb = purposeBadge(deal.purpose);
                  const rb = ratingBadge(deal.rating);
                  const fb = flexBadge(deal.flexDirection);
                  return (
                    <tr
                      key={`${deal.borrower}-${i}`}
                      className="border-b border-border/[0.06] hover:bg-lime-400/[0.02] transition-colors"
                    >
                      <td className="px-3 py-1 font-bold truncate max-w-[160px]" style={{ color: ACCENT }}>{deal.borrower ?? '-'}</td>
                      <td className="text-right px-2 py-1 text-white">{deal.size != null ? `$${fmt(deal.size, 0)}` : '-'}</td>
                      <td className="text-right px-2 py-1 text-white">{fmtBp(deal.spread)}</td>
                      <td className="text-right px-2 py-1 text-neutral-400">{deal.floor != null ? fmtBpRaw(deal.floor) : '-'}</td>
                      <td className="text-right px-2 py-1 text-neutral-400">{deal.tenor ?? '-'}</td>
                      <td className="text-center px-2 py-1">
                        <span className={`inline-block px-1 py-px text-[7px] font-bold ${rb.cls}`}>{rb.text}</span>
                      </td>
                      <td className="text-center px-2 py-1">
                        <span className={`inline-block px-1 py-px text-[7px] font-bold ${pb.cls}`}>{pb.text}</span>
                      </td>
                      <td className="text-center px-2 py-1">
                        <span className={`text-[8px] font-bold ${fb.cls}`}>{fb.text}</span>
                      </td>
                      <td className={`text-right px-3 py-1 font-bold ${priceColor(deal.clearingPrice)}`}>{fmtPrice(deal.clearingPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 5b. Pipeline Deals ── */}
        {pipeline.length > 0 && (
          <div>
            <SectionHeader title="Pipeline Deals" />
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-border/20 text-neutral-500 text-[7px] uppercase tracking-wider">
                  <th className="text-left px-3 py-1 font-normal">BORROWER</th>
                  <th className="text-right px-2 py-1 font-normal">EXP SIZE ($M)</th>
                  <th className="text-right px-2 py-1 font-normal">IND SPREAD</th>
                  <th className="text-center px-2 py-1 font-normal">RATING</th>
                  <th className="text-right px-2 py-1 font-normal">EXP DATE</th>
                  <th className="text-left px-3 py-1 font-normal">LEAD ARRANGERS</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.slice(0, 8).map((deal: any, i: number) => {
                  const rb = ratingBadge(deal.rating);
                  return (
                    <tr
                      key={`${deal.borrower}-${i}`}
                      className="border-b border-border/[0.06] hover:bg-lime-400/[0.02] transition-colors"
                    >
                      <td className="px-3 py-1 font-bold truncate max-w-[160px]" style={{ color: ACCENT }}>{deal.borrower ?? '-'}</td>
                      <td className="text-right px-2 py-1 text-white">{deal.expectedSize != null ? `$${fmt(deal.expectedSize, 0)}` : '-'}</td>
                      <td className="text-right px-2 py-1 text-white">{fmtBp(deal.indicatedSpread)}</td>
                      <td className="text-center px-2 py-1">
                        <span className={`inline-block px-1 py-px text-[7px] font-bold ${rb.cls}`}>{rb.text}</span>
                      </td>
                      <td className="text-right px-2 py-1 text-neutral-400">{deal.expectedDate ?? '-'}</td>
                      <td className="text-left px-3 py-1 text-neutral-400 truncate max-w-[180px]">{deal.leadArrangers ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 5c. Top Performers ── */}
        {topPerformers.length > 0 && (
          <div>
            <SectionHeader title="Top Performers" />
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-border/20 text-neutral-500 text-[7px] uppercase tracking-wider">
                  <th className="text-left px-3 py-1 font-normal">BORROWER</th>
                  <th className="text-right px-2 py-1 font-normal">PRICE</th>
                  <th className="text-right px-2 py-1 font-normal">CHG 1W</th>
                  <th className="text-right px-2 py-1 font-normal">YIELD</th>
                  <th className="text-right px-2 py-1 font-normal">SPREAD</th>
                  <th className="text-center px-3 py-1 font-normal">RATING</th>
                </tr>
              </thead>
              <tbody>
                {topPerformers.slice(0, 10).map((loan: any, i: number) => {
                  const rb = ratingBadge(loan.rating);
                  return (
                    <tr
                      key={`${loan.borrower}-${i}`}
                      className="border-b border-border/[0.06] hover:bg-lime-400/[0.02] transition-colors"
                    >
                      <td className="px-3 py-1 font-bold truncate max-w-[160px]" style={{ color: ACCENT }}>{loan.borrower ?? '-'}</td>
                      <td className={`text-right px-2 py-1 font-bold ${priceColor(loan.price)}`}>{fmtPrice(loan.price)}</td>
                      <td className={`text-right px-2 py-1 font-bold ${changeColor(loan.change1W)}`}>{fmtChg(loan.change1W)}</td>
                      <td className="text-right px-2 py-1 text-white/70">{fmtPct(loan.yield)}</td>
                      <td className="text-right px-2 py-1 text-white">{fmtBp(loan.spread)}</td>
                      <td className="text-center px-3 py-1">
                        <span className={`inline-block px-1 py-px text-[7px] font-bold ${rb.cls}`}>{rb.text}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 5d. Bottom Performers ── */}
        {bottomPerformers.length > 0 && (
          <div>
            <SectionHeader title="Bottom Performers" />
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-border/20 text-neutral-500 text-[7px] uppercase tracking-wider">
                  <th className="text-left px-3 py-1 font-normal">BORROWER</th>
                  <th className="text-right px-2 py-1 font-normal">PRICE</th>
                  <th className="text-right px-2 py-1 font-normal">CHG 1W</th>
                  <th className="text-right px-2 py-1 font-normal">YIELD</th>
                  <th className="text-right px-2 py-1 font-normal">SPREAD</th>
                  <th className="text-center px-3 py-1 font-normal">RATING</th>
                </tr>
              </thead>
              <tbody>
                {bottomPerformers.slice(0, 10).map((loan: any, i: number) => {
                  const rb = ratingBadge(loan.rating);
                  return (
                    <tr
                      key={`${loan.borrower}-${i}`}
                      className="border-b border-border/[0.06] hover:bg-lime-400/[0.02] transition-colors"
                    >
                      <td className="px-3 py-1 font-bold truncate max-w-[160px] text-red-400">{loan.borrower ?? '-'}</td>
                      <td className={`text-right px-2 py-1 font-bold ${priceColor(loan.price)}`}>{fmtPrice(loan.price)}</td>
                      <td className="text-right px-2 py-1 font-bold text-red-400">{fmtChg(loan.change1W)}</td>
                      <td className="text-right px-2 py-1 text-white/70">{fmtPct(loan.yield)}</td>
                      <td className="text-right px-2 py-1 text-white">{fmtBp(loan.spread)}</td>
                      <td className="text-center px-3 py-1">
                        <span className={`inline-block px-1 py-px text-[7px] font-bold ${rb.cls}`}>{rb.text}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 5e. Sector Exposure ── */}
        {sectorExposure.length > 0 && (
          <div>
            <SectionHeader title="Sector Exposure" />
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-border/20 text-neutral-500 text-[7px] uppercase tracking-wider">
                  <th className="text-left px-3 py-1 font-normal">SECTOR</th>
                  <th className="text-right px-2 py-1 font-normal">WEIGHT%</th>
                  <th className="text-right px-2 py-1 font-normal">AVG SPREAD</th>
                  <th className="text-right px-2 py-1 font-normal">AVG PRICE</th>
                  <th className="text-right px-3 py-1 font-normal">DEFAULT%</th>
                </tr>
              </thead>
              <tbody>
                {sectorExposure.slice(0, 10).map((sector: any, i: number) => (
                  <tr
                    key={`${sector.sector}-${i}`}
                    className="border-b border-border/[0.06] hover:bg-lime-400/[0.02] transition-colors"
                  >
                    <td className="px-3 py-1 font-bold truncate max-w-[160px]" style={{ color: ACCENT }}>{sector.sector ?? '-'}</td>
                    <td className="text-right px-2 py-1 text-white">{fmtPct(sector.weight, 1)}</td>
                    <td className="text-right px-2 py-1 text-white">{fmtBp(sector.avgSpread)}</td>
                    <td className={`text-right px-2 py-1 font-bold ${priceColor(sector.avgPrice)}`}>{fmtPrice(sector.avgPrice)}</td>
                    <td className={`text-right px-3 py-1 ${(sector.defaultRate ?? 0) > 3 ? 'text-red-400 font-bold' : 'text-white/60'}`}>{fmtPct(sector.defaultRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
