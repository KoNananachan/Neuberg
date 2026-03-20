import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// ── Types ──

interface PipelineOverview {
  totalClinicalTrials: number;
  phase1: number;
  phase2: number;
  phase3: number;
  fdaApprovalsYTD: number;
  pdufaDatesUpcoming: number;
  avgTimeToApprovalYears: number;
  avgRDCostBillions: number;
}

interface PipelineDrug {
  drug: string;
  company: string;
  indication: string;
  phase: 'Phase 1' | 'Phase 2' | 'Phase 3' | 'Filed' | 'Approved';
  mechanism: string;
  modality: 'small-molecule' | 'biologic' | 'antibody' | 'gene-therapy' | 'cell-therapy' | 'rna';
  peakSalesEstimateBillions: number;
  pdufaDate: string | null;
  catalystDate: string;
  probabilityOfSuccess: number;
  competitorsCount: number;
}

interface PDUFACatalyst {
  drug: string;
  company: string;
  indication: string;
  dateType: 'PDUFA' | 'AdCom' | 'Phase3-readout' | 'priority-review';
  date: string;
  analystConsensus: 'likely-approval' | 'uncertain' | 'likely-CRL';
}

interface PatentCliff {
  drug: string;
  company: string;
  currentSalesBillions: number;
  patentExpiryYear: number;
  genericCompetitors: number;
  revenueAtRiskBillions: number;
  biosimilarStatus: 'available' | 'pending' | 'none';
}

interface TherapeuticArea {
  area: string;
  activeTrials: number;
  phase3Programs: number;
  recentApprovals: number;
  marketSizeBillions: number;
}

interface RDSpending {
  company: string;
  rdSpendBillions: number;
  rdAsRevenuePct: number;
  pipelineAssets: number;
  phase3Assets: number;
  recentApprovals: number;
}

interface PharmaPipelineResponse {
  pipelineOverview: PipelineOverview;
  majorPipelineDrugs: PipelineDrug[];
  upcomingCatalysts: PDUFACatalyst[];
  patentCliffs: PatentCliff[];
  therapeuticAreas: TherapeuticArea[];
  topRDSpending: RDSpending[];
  timestamp: string;
}

// ── Seed Data ──

const DRUG_SEEDS: {
  drug: string;
  company: string;
  indication: string;
  phase: PipelineDrug['phase'];
  mechanism: string;
  modality: PipelineDrug['modality'];
  basePeakSales: number;
  hasPdufa: boolean;
  basePOS: number;
  baseCompetitors: number;
}[] = [
  { drug: 'Wegovy', company: 'Novo Nordisk', indication: 'Obesity', phase: 'Approved', mechanism: 'GLP-1 receptor agonist', modality: 'biologic', basePeakSales: 18.5, hasPdufa: false, basePOS: 100, baseCompetitors: 8 },
  { drug: 'MK-0616', company: 'Merck', indication: 'Hypercholesterolemia', phase: 'Phase 3', mechanism: 'Oral PCSK9 inhibitor', modality: 'small-molecule', basePeakSales: 6.2, hasPdufa: false, basePOS: 55, baseCompetitors: 4 },
  { drug: 'Lecanemab', company: 'Eisai/Biogen', indication: "Alzheimer's Disease", phase: 'Approved', mechanism: 'Anti-amyloid beta antibody', modality: 'antibody', basePeakSales: 12.8, hasPdufa: false, basePOS: 100, baseCompetitors: 3 },
  { drug: 'Epcoritamab', company: 'AbbVie/Genmab', indication: 'Diffuse Large B-Cell Lymphoma', phase: 'Approved', mechanism: 'CD3xCD20 bispecific antibody', modality: 'antibody', basePeakSales: 4.5, hasPdufa: false, basePOS: 100, baseCompetitors: 5 },
  { drug: 'Suzetrigine', company: 'Vertex', indication: 'Acute Pain', phase: 'Filed', mechanism: 'NaV1.8 sodium channel inhibitor', modality: 'small-molecule', basePeakSales: 5.8, hasPdufa: true, basePOS: 78, baseCompetitors: 2 },
  { drug: 'Bimekizumab', company: 'UCB', indication: 'Psoriasis / Psoriatic Arthritis', phase: 'Approved', mechanism: 'IL-17A/F dual inhibitor', modality: 'antibody', basePeakSales: 3.9, hasPdufa: false, basePOS: 100, baseCompetitors: 6 },
  { drug: 'Dato-DXd', company: 'AstraZeneca/Daiichi Sankyo', indication: 'HR+/HER2-low Breast Cancer', phase: 'Phase 3', mechanism: 'TROP2-directed ADC', modality: 'antibody', basePeakSales: 7.4, hasPdufa: false, basePOS: 62, baseCompetitors: 5 },
  { drug: 'Fitusiran', company: 'Sanofi', indication: 'Hemophilia A/B', phase: 'Approved', mechanism: 'Antithrombin siRNA', modality: 'rna', basePeakSales: 2.8, hasPdufa: false, basePOS: 100, baseCompetitors: 3 },
  { drug: 'Olanzapine LAI', company: 'Teva', indication: 'Schizophrenia', phase: 'Phase 3', mechanism: 'Atypical antipsychotic long-acting injectable', modality: 'small-molecule', basePeakSales: 1.9, hasPdufa: false, basePOS: 58, baseCompetitors: 4 },
  { drug: 'Brexucabtagene Autoleucel', company: 'Kite/Gilead', indication: 'Mantle Cell Lymphoma', phase: 'Approved', mechanism: 'Anti-CD19 CAR-T', modality: 'cell-therapy', basePeakSales: 2.1, hasPdufa: false, basePOS: 100, baseCompetitors: 3 },
  { drug: 'KarXT', company: 'Karuna/BMS', indication: 'Schizophrenia', phase: 'Filed', mechanism: 'Muscarinic M1/M4 agonist', modality: 'small-molecule', basePeakSales: 5.2, hasPdufa: true, basePOS: 82, baseCompetitors: 2 },
  { drug: 'Resmetirom', company: 'Madrigal', indication: 'NASH/MASH', phase: 'Approved', mechanism: 'THR-beta agonist', modality: 'small-molecule', basePeakSales: 4.1, hasPdufa: false, basePOS: 100, baseCompetitors: 4 },
  { drug: 'Donanemab', company: 'Eli Lilly', indication: "Alzheimer's Disease", phase: 'Approved', mechanism: 'Anti-N3pG amyloid beta antibody', modality: 'antibody', basePeakSales: 11.5, hasPdufa: false, basePOS: 100, baseCompetitors: 3 },
  { drug: 'Crovalimab', company: 'Roche', indication: 'Paroxysmal Nocturnal Hemoglobinuria', phase: 'Approved', mechanism: 'Anti-C5 recycling antibody', modality: 'antibody', basePeakSales: 3.2, hasPdufa: false, basePOS: 100, baseCompetitors: 3 },
  { drug: 'Enhertu', company: 'Daiichi Sankyo/AstraZeneca', indication: 'Multiple Solid Tumors', phase: 'Approved', mechanism: 'HER2-directed ADC', modality: 'antibody', basePeakSales: 15.2, hasPdufa: false, basePOS: 100, baseCompetitors: 4 },
];

const CATALYST_SEEDS: {
  drug: string;
  company: string;
  indication: string;
  dateType: PDUFACatalyst['dateType'];
  baseDaysOut: number;
  consensus: PDUFACatalyst['analystConsensus'];
}[] = [
  { drug: 'Suzetrigine', company: 'Vertex', indication: 'Acute Pain', dateType: 'PDUFA', baseDaysOut: 45, consensus: 'likely-approval' },
  { drug: 'KarXT', company: 'Karuna/BMS', indication: 'Schizophrenia', dateType: 'PDUFA', baseDaysOut: 62, consensus: 'likely-approval' },
  { drug: 'MK-0616', company: 'Merck', indication: 'Hypercholesterolemia', dateType: 'Phase3-readout', baseDaysOut: 120, consensus: 'uncertain' },
  { drug: 'Dato-DXd', company: 'AstraZeneca/Daiichi Sankyo', indication: 'Breast Cancer', dateType: 'Phase3-readout', baseDaysOut: 95, consensus: 'likely-approval' },
  { drug: 'Olanzapine LAI', company: 'Teva', indication: 'Schizophrenia', dateType: 'Phase3-readout', baseDaysOut: 180, consensus: 'uncertain' },
  { drug: 'Lecanemab', company: 'Eisai/Biogen', indication: "Alzheimer's (subcutaneous)", dateType: 'priority-review', baseDaysOut: 75, consensus: 'likely-approval' },
  { drug: 'Enhertu', company: 'Daiichi Sankyo/AstraZeneca', indication: 'Colorectal Cancer', dateType: 'AdCom', baseDaysOut: 110, consensus: 'uncertain' },
  { drug: 'Resmetirom', company: 'Madrigal', indication: 'NASH/MASH (cirrhotic)', dateType: 'Phase3-readout', baseDaysOut: 150, consensus: 'likely-approval' },
];

const PATENT_CLIFF_SEEDS: {
  drug: string;
  company: string;
  baseSales: number;
  expiryYear: number;
  baseGenericComp: number;
  baseRevenueAtRisk: number;
  biosimilarStatus: PatentCliff['biosimilarStatus'];
}[] = [
  { drug: 'Keytruda', company: 'Merck', baseSales: 25, expiryYear: 2028, baseGenericComp: 6, baseRevenueAtRisk: 22, biosimilarStatus: 'pending' },
  { drug: 'Eliquis', company: 'BMS/Pfizer', baseSales: 18, expiryYear: 2026, baseGenericComp: 8, baseRevenueAtRisk: 16, biosimilarStatus: 'pending' },
  { drug: 'Opdivo', company: 'BMS', baseSales: 9, expiryYear: 2027, baseGenericComp: 5, baseRevenueAtRisk: 7.5, biosimilarStatus: 'pending' },
  { drug: 'Humira', company: 'AbbVie', baseSales: 4.8, expiryYear: 2023, baseGenericComp: 10, baseRevenueAtRisk: 3.2, biosimilarStatus: 'available' },
  { drug: 'Stelara', company: 'Johnson & Johnson', baseSales: 11, expiryYear: 2025, baseGenericComp: 7, baseRevenueAtRisk: 9.5, biosimilarStatus: 'pending' },
  { drug: 'Xarelto', company: 'Bayer/J&J', baseSales: 6, expiryYear: 2026, baseGenericComp: 5, baseRevenueAtRisk: 5.2, biosimilarStatus: 'none' },
  { drug: 'Eylea', company: 'Regeneron', baseSales: 10, expiryYear: 2027, baseGenericComp: 4, baseRevenueAtRisk: 8.8, biosimilarStatus: 'pending' },
  { drug: 'Dupixent', company: 'Sanofi/Regeneron', baseSales: 13, expiryYear: 2029, baseGenericComp: 3, baseRevenueAtRisk: 11, biosimilarStatus: 'none' },
  { drug: 'Revlimid', company: 'BMS', baseSales: 6, expiryYear: 2022, baseGenericComp: 9, baseRevenueAtRisk: 4.5, biosimilarStatus: 'available' },
  { drug: 'Ozempic', company: 'Novo Nordisk', baseSales: 18, expiryYear: 2031, baseGenericComp: 2, baseRevenueAtRisk: 15, biosimilarStatus: 'none' },
];

const THERAPEUTIC_AREA_SEEDS: {
  area: string;
  baseTrials: number;
  basePhase3: number;
  baseApprovals: number;
  baseMarketSize: number;
}[] = [
  { area: 'Oncology', baseTrials: 2100, basePhase3: 380, baseApprovals: 18, baseMarketSize: 220 },
  { area: 'Immunology', baseTrials: 820, basePhase3: 145, baseApprovals: 8, baseMarketSize: 95 },
  { area: 'Neurology', baseTrials: 680, basePhase3: 110, baseApprovals: 5, baseMarketSize: 78 },
  { area: 'Rare Disease', baseTrials: 540, basePhase3: 85, baseApprovals: 12, baseMarketSize: 52 },
  { area: 'Cardiovascular', baseTrials: 480, basePhase3: 78, baseApprovals: 4, baseMarketSize: 65 },
  { area: 'Infectious Disease', baseTrials: 420, basePhase3: 62, baseApprovals: 6, baseMarketSize: 58 },
  { area: 'Metabolic/GLP-1', baseTrials: 350, basePhase3: 55, baseApprovals: 5, baseMarketSize: 110 },
  { area: 'Gene/Cell Therapy', baseTrials: 310, basePhase3: 42, baseApprovals: 3, baseMarketSize: 18 },
];

const RD_SPENDING_SEEDS: {
  company: string;
  baseRDSpend: number;
  baseRDPct: number;
  basePipeline: number;
  basePhase3: number;
  baseApprovals: number;
}[] = [
  { company: 'Roche', baseRDSpend: 16.1, baseRDPct: 25.2, basePipeline: 182, basePhase3: 38, baseApprovals: 12 },
  { company: 'Merck', baseRDSpend: 13.6, baseRDPct: 25.8, basePipeline: 145, basePhase3: 32, baseApprovals: 10 },
  { company: 'Johnson & Johnson', baseRDSpend: 15.1, baseRDPct: 17.5, basePipeline: 158, basePhase3: 35, baseApprovals: 9 },
  { company: 'Pfizer', baseRDSpend: 11.4, baseRDPct: 19.2, basePipeline: 112, basePhase3: 28, baseApprovals: 8 },
  { company: 'Novartis', baseRDSpend: 11.2, baseRDPct: 21.8, basePipeline: 164, basePhase3: 36, baseApprovals: 11 },
  { company: 'AstraZeneca', baseRDSpend: 10.8, baseRDPct: 23.5, basePipeline: 178, basePhase3: 42, baseApprovals: 13 },
  { company: 'BMS', baseRDSpend: 9.5, baseRDPct: 20.6, basePipeline: 98, basePhase3: 22, baseApprovals: 7 },
  { company: 'Sanofi', baseRDSpend: 7.8, baseRDPct: 16.4, basePipeline: 82, basePhase3: 18, baseApprovals: 6 },
  { company: 'AbbVie', baseRDSpend: 8.2, baseRDPct: 14.8, basePipeline: 92, basePhase3: 20, baseApprovals: 8 },
  { company: 'Eli Lilly', baseRDSpend: 9.3, baseRDPct: 25.1, basePipeline: 105, basePhase3: 25, baseApprovals: 9 },
];

// ── Data Generation ──

function generateOverview(rng: () => number): PipelineOverview {
  const totalClinicalTrials = Math.round(jitter(rng, 6000, 0.04));
  const phase1 = Math.round(jitter(rng, 2400, 0.05));
  const phase2 = Math.round(jitter(rng, 2200, 0.05));
  const phase3 = Math.round(jitter(rng, 1100, 0.05));
  const fdaApprovalsYTD = Math.round(jitter(rng, 38, 0.15));
  const pdufaDatesUpcoming = Math.round(jitter(rng, 22, 0.2));
  const avgTimeToApprovalYears = roundTo(jitter(rng, 10, 0.06), 1);
  const avgRDCostBillions = roundTo(jitter(rng, 2.6, 0.08), 1);

  return {
    totalClinicalTrials,
    phase1,
    phase2,
    phase3,
    fdaApprovalsYTD,
    pdufaDatesUpcoming,
    avgTimeToApprovalYears,
    avgRDCostBillions,
  };
}

function generatePipelineDrugs(rng: () => number): PipelineDrug[] {
  const now = new Date();
  return DRUG_SEEDS.map((seed) => {
    const peakSalesEstimateBillions = roundTo(jitter(rng, seed.basePeakSales, 0.1), 1);
    const probabilityOfSuccess = seed.basePOS === 100
      ? 100
      : Math.min(95, Math.max(15, Math.round(jitter(rng, seed.basePOS, 0.12))));
    const competitorsCount = Math.max(1, Math.round(jitter(rng, seed.baseCompetitors, 0.2)));

    let pdufaDate: string | null = null;
    if (seed.hasPdufa) {
      const daysOut = Math.round(30 + rng() * 180);
      const d = new Date(now.getTime() + daysOut * 86400000);
      pdufaDate = d.toISOString().slice(0, 10);
    }

    const catalystDays = Math.round(30 + rng() * 270);
    const catalystD = new Date(now.getTime() + catalystDays * 86400000);
    const catalystDate = catalystD.toISOString().slice(0, 10);

    return {
      drug: seed.drug,
      company: seed.company,
      indication: seed.indication,
      phase: seed.phase,
      mechanism: seed.mechanism,
      modality: seed.modality,
      peakSalesEstimateBillions,
      pdufaDate,
      catalystDate,
      probabilityOfSuccess,
      competitorsCount,
    };
  });
}

function generateCatalysts(rng: () => number): PDUFACatalyst[] {
  const now = new Date();
  return CATALYST_SEEDS.map((seed) => {
    const daysOut = Math.round(jitter(rng, seed.baseDaysOut, 0.25));
    const d = new Date(now.getTime() + Math.max(7, daysOut) * 86400000);
    const date = d.toISOString().slice(0, 10);

    return {
      drug: seed.drug,
      company: seed.company,
      indication: seed.indication,
      dateType: seed.dateType,
      date,
      analystConsensus: seed.consensus,
    };
  });
}

function generatePatentCliffs(rng: () => number): PatentCliff[] {
  return PATENT_CLIFF_SEEDS.map((seed) => {
    const currentSalesBillions = roundTo(jitter(rng, seed.baseSales, 0.08), 1);
    const genericCompetitors = Math.max(1, Math.round(jitter(rng, seed.baseGenericComp, 0.2)));
    const revenueAtRiskBillions = roundTo(jitter(rng, seed.baseRevenueAtRisk, 0.08), 1);

    return {
      drug: seed.drug,
      company: seed.company,
      currentSalesBillions,
      patentExpiryYear: seed.expiryYear,
      genericCompetitors,
      revenueAtRiskBillions,
      biosimilarStatus: seed.biosimilarStatus,
    };
  });
}

function generateTherapeuticAreas(rng: () => number): TherapeuticArea[] {
  return THERAPEUTIC_AREA_SEEDS.map((seed) => {
    const activeTrials = Math.round(jitter(rng, seed.baseTrials, 0.06));
    const phase3Programs = Math.round(jitter(rng, seed.basePhase3, 0.08));
    const recentApprovals = Math.max(1, Math.round(jitter(rng, seed.baseApprovals, 0.2)));
    const marketSizeBillions = roundTo(jitter(rng, seed.baseMarketSize, 0.06), 1);

    return {
      area: seed.area,
      activeTrials,
      phase3Programs,
      recentApprovals,
      marketSizeBillions,
    };
  });
}

function generateRDSpending(rng: () => number): RDSpending[] {
  return RD_SPENDING_SEEDS.map((seed) => {
    const rdSpendBillions = roundTo(jitter(rng, seed.baseRDSpend, 0.06), 1);
    const rdAsRevenuePct = roundTo(jitter(rng, seed.baseRDPct, 0.05), 1);
    const pipelineAssets = Math.round(jitter(rng, seed.basePipeline, 0.08));
    const phase3Assets = Math.round(jitter(rng, seed.basePhase3, 0.1));
    const recentApprovals = Math.max(1, Math.round(jitter(rng, seed.baseApprovals, 0.2)));

    return {
      company: seed.company,
      rdSpendBillions,
      rdAsRevenuePct,
      pipelineAssets,
      phase3Assets,
      recentApprovals,
    };
  });
}

function generateAll(): PharmaPipelineResponse {
  const rng = seededRandom('pharma-pipeline');

  return {
    pipelineOverview: generateOverview(rng),
    majorPipelineDrugs: generatePipelineDrugs(rng),
    upcomingCatalysts: generateCatalysts(rng),
    patentCliffs: generatePatentCliffs(rng),
    therapeuticAreas: generateTherapeuticAreas(rng),
    topRDSpending: generateRDSpending(rng),
    timestamp: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cacheData: PharmaPipelineResponse | null = null;
let cacheTime = 0;


// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }

    const data = generateAll();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[PharmaPipeline] Error:', err instanceof Error ? err.message : String(err));
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate pharma pipeline data' });
  }
});

export default router;
