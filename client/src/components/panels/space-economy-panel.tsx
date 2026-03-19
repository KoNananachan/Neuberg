import { Rocket } from 'lucide-react';
import { useSpaceEconomy } from '../../api/hooks/use-space-economy';

// --- Fallback Data (curated, March 2026) ---

const FALLBACK_DATA = {
  overview: {
    marketSize: 546,
    commercialShare: 78,
    govShare: 22,
    launchesYtd: 67,
    satellitesDeployed: 1842,
    vcInvestment: 18.4,
    growthRate: 9.1,
  },
  launches: [
    { provider: 'SpaceX', launchesYtd: 32, successRate: 99.2, payloadKg: 22800, costPerKg: 1410, vehicle: 'Falcon 9', reusable: true, nextLaunch: '2026-03-22' },
    { provider: 'Rocket Lab', launchesYtd: 8, successRate: 96.5, payloadKg: 300, costPerKg: 23300, vehicle: 'Electron', reusable: false, nextLaunch: '2026-03-28' },
    { provider: 'ULA', launchesYtd: 3, successRate: 100.0, payloadKg: 27200, costPerKg: 5880, vehicle: 'Vulcan Centaur', reusable: false, nextLaunch: '2026-04-05' },
    { provider: 'Arianespace', launchesYtd: 4, successRate: 100.0, payloadKg: 21000, costPerKg: 8570, vehicle: 'Ariane 6', reusable: false, nextLaunch: '2026-04-12' },
    { provider: 'ISRO', launchesYtd: 3, successRate: 100.0, payloadKg: 8000, costPerKg: 3750, vehicle: 'GSLV Mk III', reusable: false, nextLaunch: '2026-04-18' },
    { provider: 'Blue Origin', launchesYtd: 2, successRate: 100.0, payloadKg: 45000, costPerKg: 4440, vehicle: 'New Glenn', reusable: true, nextLaunch: '2026-04-25' },
    { provider: 'CASC', launchesYtd: 12, successRate: 97.8, payloadKg: 25000, costPerKg: 4800, vehicle: 'Long March 5', reusable: false, nextLaunch: '2026-03-25' },
    { provider: 'Relativity', launchesYtd: 1, successRate: 100.0, payloadKg: 1250, costPerKg: 12000, vehicle: 'Terran R', reusable: true, nextLaunch: '2026-05-10' },
  ],
  constellations: [
    { constellation: 'Starlink', operator: 'SpaceX', deployed: 6824, planned: 12000, altitude: 550, purpose: 'Broadband Internet', revenueEstimate: 11.8 },
    { constellation: 'OneWeb', operator: 'Eutelsat', deployed: 634, planned: 648, altitude: 1200, purpose: 'Broadband Internet', revenueEstimate: 1.2 },
    { constellation: 'Kuiper', operator: 'Amazon', deployed: 578, planned: 3236, altitude: 590, purpose: 'Broadband Internet', revenueEstimate: 0.9 },
    { constellation: 'Iridium NEXT', operator: 'Iridium', deployed: 75, planned: 75, altitude: 780, purpose: 'Voice / IoT', revenueEstimate: 1.8 },
    { constellation: 'Planet', operator: 'Planet Labs', deployed: 200, planned: 250, altitude: 475, purpose: 'Earth Imaging', revenueEstimate: 0.24 },
    { constellation: 'BlackSky', operator: 'BlackSky Tech', deployed: 18, planned: 30, altitude: 430, purpose: 'Geospatial Intel', revenueEstimate: 0.11 },
    { constellation: 'Telesat LEO', operator: 'Telesat', deployed: 0, planned: 298, altitude: 1015, purpose: 'Enterprise / Gov', revenueEstimate: 0.0 },
    { constellation: 'Guowang', operator: 'China SatNet', deployed: 108, planned: 13000, altitude: 500, purpose: 'Broadband Internet', revenueEstimate: 0.3 },
  ],
  companies: [
    { company: 'SpaceX', ticker: 'Private', marketCap: 350, revenueGrowth: 42.5, ebitdaMargin: 28.3, stockYtd: null, sector: 'Launch' },
    { company: 'Rocket Lab', ticker: 'RKLB', marketCap: 12.8, revenueGrowth: 68.2, ebitdaMargin: -5.4, stockYtd: 34.2, sector: 'Launch' },
    { company: 'Iridium', ticker: 'IRDM', marketCap: 5.4, revenueGrowth: 7.8, ebitdaMargin: 62.1, stockYtd: 8.3, sector: 'Satellite' },
    { company: 'Planet Labs', ticker: 'PL', marketCap: 1.9, revenueGrowth: 15.4, ebitdaMargin: -18.2, stockYtd: -12.5, sector: 'Imaging' },
    { company: 'Maxar', ticker: 'MAXR', marketCap: 6.2, revenueGrowth: 5.1, ebitdaMargin: 22.7, stockYtd: 4.1, sector: 'Imaging' },
    { company: 'L3Harris', ticker: 'LHX', marketCap: 44.8, revenueGrowth: 11.3, ebitdaMargin: 17.5, stockYtd: 6.7, sector: 'Defense' },
    { company: 'Northrop Grumman', ticker: 'NOC', marketCap: 72.5, revenueGrowth: 4.2, ebitdaMargin: 15.8, stockYtd: 2.9, sector: 'Defense' },
    { company: 'Virgin Galactic', ticker: 'SPCE', marketCap: 0.8, revenueGrowth: -22.4, ebitdaMargin: -340.0, stockYtd: -28.6, sector: 'Tourism' },
    { company: 'Intuitive Machines', ticker: 'LUNR', marketCap: 3.2, revenueGrowth: 125.0, ebitdaMargin: -15.6, stockYtd: 52.3, sector: 'Lunar' },
    { company: 'AST SpaceMobile', ticker: 'ASTS', marketCap: 7.6, revenueGrowth: 0.0, ebitdaMargin: -980.0, stockYtd: 18.4, sector: 'Satellite' },
  ],
  govBudgets: [
    { agency: 'NASA', budget: 25.4, yoyChange: 2.1, keyPrograms: ['Artemis', 'ISS', 'Mars Sample Return', 'CLPS'] },
    { agency: 'DoD Space', budget: 33.7, yoyChange: 8.5, keyPrograms: ['SDA', 'GPS III', 'OPIR', 'Space Fence'] },
    { agency: 'ESA', budget: 7.8, yoyChange: 4.2, keyPrograms: ['Ariane 6', 'ExoMars', 'Copernicus', 'Lunar Gateway'] },
    { agency: 'CNSA', budget: 14.6, yoyChange: 12.3, keyPrograms: ['Tiangong', 'Chang\'e', 'Beidou', 'Guowang'] },
    { agency: 'ISRO', budget: 2.1, yoyChange: 15.8, keyPrograms: ['Gaganyaan', 'Chandrayaan-4', 'NISAR'] },
    { agency: 'JAXA', budget: 3.8, yoyChange: 6.4, keyPrograms: ['H3', 'MMX', 'Lunar Polar', 'ETS-9'] },
    { agency: 'Roscosmos', budget: 3.2, yoyChange: -4.1, keyPrograms: ['Soyuz', 'Angara', 'Orel', 'Luna'] },
    { agency: 'KARI', budget: 0.9, yoyChange: 22.1, keyPrograms: ['Nuri', 'KSLV-III', 'Korea Path Finder'] },
  ],
  orbitalEnvironment: {
    trackedObjects: 48250,
    activeSatellites: 10420,
    debris: 37830,
    collisionRiskEvents: 14,
    conjunctionWarnings: 3842,
    deorbitInitiatives: [
      'ClearSpace-1 (ESA)',
      'ELSA-d (Astroscale)',
      'ADRAS-J (JAXA/Astroscale)',
      'On-orbit Servicing (Northrop)',
    ],
  },
};

// --- Component ---

export function SpaceEconomyPanel() {
  const { data: apiData } = useSpaceEconomy() || {};
  const data = apiData || FALLBACK_DATA;

  const overview = (data as any).overview || FALLBACK_DATA.overview;
  const launches = (data as any).launches || FALLBACK_DATA.launches;
  const constellations = (data as any).constellations || FALLBACK_DATA.constellations;
  const companies = (data as any).companies || FALLBACK_DATA.companies;
  const govBudgets = (data as any).govBudgets || FALLBACK_DATA.govBudgets;
  const orbitalEnv = (data as any).orbitalEnvironment || FALLBACK_DATA.orbitalEnvironment;

  return (
    <div className="h-full flex flex-col bg-black text-[9px] font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-violet-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Rocket className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-violet-400">
            SPACE ECONOMY
          </span>
        </div>
        <div className="flex items-center gap-3 text-[8px] text-neutral/40 tabular-nums">
          <span>MKT SIZE <span className="text-violet-400 font-bold">${overview.marketSize}B</span></span>
          <span>LAUNCHES YTD <span className="text-violet-400 font-bold">{overview.launchesYtd}</span></span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto no-scrollbar">

        {/* Overview */}
        <div className="border-b border-violet-400/30">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.01]">
            <div className="w-1 h-1 bg-violet-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-violet-400">Overview</span>
          </div>
          <div className="grid grid-cols-3 gap-px bg-border/10">
            {[
              { label: 'MARKET SIZE', value: `$${overview.marketSize}B` },
              { label: 'COMMERCIAL', value: `${overview.commercialShare}%` },
              { label: 'GOVERNMENT', value: `${overview.govShare}%` },
              { label: 'LAUNCHES YTD', value: `${overview.launchesYtd}` },
              { label: 'SATELLITES DEPLOYED', value: overview.satellitesDeployed.toLocaleString() },
              { label: 'VC INVESTMENT', value: `$${overview.vcInvestment}B` },
            ].map((item: any) => (
              <div key={item.label} className="bg-black px-3 py-1.5">
                <div className="text-[7px] text-neutral/35 font-bold uppercase tracking-wider">{item.label}</div>
                <div className="text-[12px] font-black text-violet-400 mt-0.5 tabular-nums">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="px-3 py-1.5 bg-black border-t border-border/20">
            <div className="text-[7px] text-neutral/35 font-bold uppercase tracking-wider">ANNUAL GROWTH RATE</div>
            <div className="text-[12px] font-black text-emerald-400 tabular-nums">+{overview.growthRate}%</div>
          </div>
        </div>

        {/* Launch Activity */}
        <div className="border-b border-violet-400/30">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.01]">
            <div className="w-1 h-1 bg-violet-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-violet-400">Launch Activity</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-violet-400/30 bg-white/[0.02]">
                  {['PROVIDER', 'LAUNCHES', 'SUCCESS %', 'PAYLOAD KG', 'COST/KG', 'VEHICLE', 'TYPE', 'NEXT LAUNCH'].map((h: any) => (
                    <th key={h} className="text-left py-1.5 px-2 text-[7px] font-black text-neutral/40 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {launches.map((l: any, i: any) => (
                  <tr key={l.provider} className={`border-b border-border/20 hover:bg-violet-400/[0.02] transition-colors ${i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'}`}>
                    <td className="py-1.5 px-2 text-white font-bold whitespace-nowrap">{l.provider}</td>
                    <td className="py-1.5 px-2 text-violet-400 font-bold tabular-nums">{l.launchesYtd}</td>
                    <td className="py-1.5 px-2 tabular-nums">
                      <span className={l.successRate >= 99 ? 'text-emerald-400' : l.successRate >= 95 ? 'text-amber-400' : 'text-red-400'}>
                        {l.successRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-neutral/60 tabular-nums">{l.payloadKg.toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-neutral/60 tabular-nums">${l.costPerKg.toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-neutral/50 whitespace-nowrap">{l.vehicle}</td>
                    <td className="py-1.5 px-2">
                      {l.reusable ? (
                        <span className="px-1 py-0.5 text-[7px] font-black uppercase bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">REUSE</span>
                      ) : (
                        <span className="px-1 py-0.5 text-[7px] font-black uppercase bg-neutral/5 text-neutral/30 border border-neutral/10">EXPEND</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-neutral/40 tabular-nums whitespace-nowrap">{l.nextLaunch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Satellite Constellations */}
        <div className="border-b border-violet-400/30">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.01]">
            <div className="w-1 h-1 bg-violet-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-violet-400">Satellite Constellations</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-violet-400/30 bg-white/[0.02]">
                  {['CONSTELLATION', 'OPERATOR', 'DEPLOYED/PLANNED', 'ALT (KM)', 'PURPOSE', 'REV EST ($B)'].map((h: any) => (
                    <th key={h} className="text-left py-1.5 px-2 text-[7px] font-black text-neutral/40 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {constellations.map((c: any, i: any) => {
                  const pct = c.planned > 0 ? ((c.deployed / c.planned) * 100).toFixed(0) : '0';
                  return (
                    <tr key={c.constellation} className={`border-b border-border/20 hover:bg-violet-400/[0.02] transition-colors ${i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'}`}>
                      <td className="py-1.5 px-2 text-white font-bold whitespace-nowrap">{c.constellation}</td>
                      <td className="py-1.5 px-2 text-neutral/50 whitespace-nowrap">{c.operator}</td>
                      <td className="py-1.5 px-2 tabular-nums whitespace-nowrap">
                        <span className="text-violet-400 font-bold">{c.deployed.toLocaleString()}</span>
                        <span className="text-neutral/30">/{c.planned.toLocaleString()}</span>
                        <span className="text-neutral/25 ml-1">({pct}%)</span>
                      </td>
                      <td className="py-1.5 px-2 text-neutral/50 tabular-nums">{c.altitude}</td>
                      <td className="py-1.5 px-2 text-neutral/50 whitespace-nowrap">{c.purpose}</td>
                      <td className="py-1.5 px-2 text-violet-400/80 tabular-nums font-bold">
                        {c.revenueEstimate > 0 ? `$${c.revenueEstimate}B` : '--'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Space Companies */}
        <div className="border-b border-violet-400/30">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.01]">
            <div className="w-1 h-1 bg-violet-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-violet-400">Space Companies</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-violet-400/30 bg-white/[0.02]">
                  {['COMPANY', 'MKT CAP ($B)', 'REV GROWTH', 'EBITDA %', 'STOCK YTD', 'SECTOR'].map((h: any) => (
                    <th key={h} className="text-left py-1.5 px-2 text-[7px] font-black text-neutral/40 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companies.map((c: any, i: any) => (
                  <tr key={c.company} className={`border-b border-border/20 hover:bg-violet-400/[0.02] transition-colors ${i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'}`}>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <span className="text-white font-bold">{c.company}</span>
                      <span className="text-neutral/30 ml-1">({c.ticker})</span>
                    </td>
                    <td className="py-1.5 px-2 text-violet-400 font-bold tabular-nums">${c.marketCap.toFixed(1)}</td>
                    <td className="py-1.5 px-2 tabular-nums">
                      <span className={c.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {c.revenueGrowth >= 0 ? '+' : ''}{c.revenueGrowth.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-1.5 px-2 tabular-nums">
                      <span className={c.ebitdaMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {c.ebitdaMargin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-1.5 px-2 tabular-nums font-bold">
                      {c.stockYtd !== null ? (
                        <span className={c.stockYtd >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {c.stockYtd >= 0 ? '+' : ''}{c.stockYtd.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-neutral/25">Private</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2">
                      <span className="px-1 py-0.5 text-[7px] font-black uppercase bg-violet-400/10 text-violet-400/70 border border-violet-400/20">
                        {c.sector}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Government Budgets */}
        <div className="border-b border-violet-400/30">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.01]">
            <div className="w-1 h-1 bg-violet-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-violet-400">Government Budgets</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-violet-400/30 bg-white/[0.02]">
                  {['AGENCY', 'BUDGET ($B)', 'YOY CHANGE', 'KEY PROGRAMS'].map((h: any) => (
                    <th key={h} className="text-left py-1.5 px-2 text-[7px] font-black text-neutral/40 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {govBudgets.map((g: any, i: any) => (
                  <tr key={g.agency} className={`border-b border-border/20 hover:bg-violet-400/[0.02] transition-colors ${i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'}`}>
                    <td className="py-1.5 px-2 text-white font-bold whitespace-nowrap">{g.agency}</td>
                    <td className="py-1.5 px-2 text-violet-400 font-bold tabular-nums">${g.budget.toFixed(1)}</td>
                    <td className="py-1.5 px-2 tabular-nums font-bold">
                      <span className={g.yoyChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {g.yoyChange >= 0 ? '+' : ''}{g.yoyChange.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="flex flex-wrap gap-1">
                        {g.keyPrograms.map((p: any) => (
                          <span key={p} className="px-1 py-0.5 text-[7px] font-bold bg-white/[0.03] text-neutral/40 border border-border/20">
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Orbital Environment */}
        <div className="border-b border-violet-400/30">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.01]">
            <div className="w-1 h-1 bg-violet-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-violet-400">Orbital Environment</span>
          </div>
          <div className="grid grid-cols-3 gap-px bg-border/10">
            {[
              { label: 'TRACKED OBJECTS', value: orbitalEnv.trackedObjects.toLocaleString(), color: 'text-violet-400' },
              { label: 'ACTIVE SATELLITES', value: orbitalEnv.activeSatellites.toLocaleString(), color: 'text-emerald-400' },
              { label: 'DEBRIS', value: orbitalEnv.debris.toLocaleString(), color: 'text-red-400' },
              { label: 'COLLISION RISK EVENTS', value: orbitalEnv.collisionRiskEvents.toString(), color: 'text-amber-400' },
              { label: 'CONJUNCTION WARNINGS', value: orbitalEnv.conjunctionWarnings.toLocaleString(), color: 'text-amber-400' },
            ].map((item: any) => (
              <div key={item.label} className="bg-black px-3 py-1.5">
                <div className="text-[7px] text-neutral/35 font-bold uppercase tracking-wider">{item.label}</div>
                <div className={`text-[12px] font-black mt-0.5 tabular-nums ${item.color}`}>{item.value}</div>
              </div>
            ))}
            <div className="bg-black px-3 py-1.5">
              <div className="text-[7px] text-neutral/35 font-bold uppercase tracking-wider">DEORBIT INITIATIVES</div>
              <div className="text-[12px] font-black text-violet-400 mt-0.5 tabular-nums">{orbitalEnv.deorbitInitiatives.length}</div>
            </div>
          </div>
          <div className="px-3 py-1.5 border-t border-border/20">
            <div className="text-[7px] text-neutral/35 font-bold uppercase tracking-wider mb-1">ACTIVE DEORBIT PROGRAMS</div>
            <div className="flex flex-wrap gap-1">
              {orbitalEnv.deorbitInitiatives.map((d: any) => (
                <span key={d} className="px-1.5 py-0.5 text-[7px] font-bold bg-violet-400/5 text-violet-400/60 border border-violet-400/15">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-2">
          <p className="text-[7px] text-neutral/25 leading-relaxed">
            Data curated from FAA, ESA, SpaceX, industry reports. Reference data as of Q1 2026. Not real-time. Market size includes launch services, satellite manufacturing, ground equipment, and space applications.
          </p>
        </div>
      </div>
    </div>
  );
}
