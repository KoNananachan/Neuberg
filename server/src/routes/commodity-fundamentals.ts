import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data';
const router = Router();


// ── Cache ──

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

type CommodityGroup = 'Energy' | 'Metals' | 'Agriculture' | 'Softs/Other';

interface CommodityConfig {
  name: string;
  group: CommodityGroup;
  unit: string;
  currency: string;
  priceBase: number;
  supplyBase: number;
  demandBase: number;
  inventoryBase: number;
  inventoryFiveYearAvgBase: number;
  daysOfSupplyBase: number;
  topProducers: { country: string; outputBase: number }[];
  topConsumers: { country: string; consumptionBase: number }[];
  seasonalityRange: [number, number]; // typical price range for current month
  contangoSpreadBase: number; // front-month vs 12-month spread in currency units
}

// ── Static Commodity Definitions ──

const COMMODITIES: CommodityConfig[] = [
  // ── Energy ──
  {
    name: 'WTI Crude', group: 'Energy', unit: 'mb/d', currency: 'USD/bbl',
    priceBase: 74.80, supplyBase: 13.4, demandBase: 13.1,
    inventoryBase: 442, inventoryFiveYearAvgBase: 465, daysOfSupplyBase: 26,
    topProducers: [
      { country: 'United States', outputBase: 13.4 },
      { country: 'Canada', outputBase: 2.1 },
      { country: 'Mexico', outputBase: 1.6 },
      { country: 'Brazil', outputBase: 0.8 },
      { country: 'Colombia', outputBase: 0.7 },
    ],
    topConsumers: [
      { country: 'United States', consumptionBase: 20.2 },
      { country: 'China', consumptionBase: 3.8 },
      { country: 'India', consumptionBase: 1.2 },
      { country: 'Japan', consumptionBase: 0.9 },
      { country: 'South Korea', consumptionBase: 0.7 },
    ],
    seasonalityRange: [68, 82], contangoSpreadBase: -1.20,
  },
  {
    name: 'Brent Crude', group: 'Energy', unit: 'mb/d', currency: 'USD/bbl',
    priceBase: 78.50, supplyBase: 101.8, demandBase: 102.6,
    inventoryBase: 285, inventoryFiveYearAvgBase: 310, daysOfSupplyBase: 29,
    topProducers: [
      { country: 'Saudi Arabia', outputBase: 9.0 },
      { country: 'Russia', outputBase: 9.3 },
      { country: 'United States', outputBase: 13.4 },
      { country: 'Iraq', outputBase: 4.3 },
      { country: 'UAE', outputBase: 3.2 },
    ],
    topConsumers: [
      { country: 'United States', consumptionBase: 20.2 },
      { country: 'China', consumptionBase: 16.4 },
      { country: 'India', consumptionBase: 5.6 },
      { country: 'Japan', consumptionBase: 3.4 },
      { country: 'Saudi Arabia', consumptionBase: 3.1 },
    ],
    seasonalityRange: [72, 86], contangoSpreadBase: -0.85,
  },
  {
    name: 'Natural Gas', group: 'Energy', unit: 'bcf/d', currency: 'USD/MMBtu',
    priceBase: 3.15, supplyBase: 105.2, demandBase: 103.8,
    inventoryBase: 2180, inventoryFiveYearAvgBase: 2350, daysOfSupplyBase: 33,
    topProducers: [
      { country: 'United States', outputBase: 105.2 },
      { country: 'Russia', outputBase: 65.0 },
      { country: 'Iran', outputBase: 25.8 },
      { country: 'China', outputBase: 22.4 },
      { country: 'Qatar', outputBase: 18.6 },
    ],
    topConsumers: [
      { country: 'United States', consumptionBase: 88.5 },
      { country: 'Russia', consumptionBase: 45.2 },
      { country: 'China', consumptionBase: 38.6 },
      { country: 'Iran', consumptionBase: 24.0 },
      { country: 'Japan', consumptionBase: 10.2 },
    ],
    seasonalityRange: [2.50, 4.20], contangoSpreadBase: 0.45,
  },
  {
    name: 'Heating Oil', group: 'Energy', unit: 'kb/d', currency: 'USD/gal',
    priceBase: 2.58, supplyBase: 4850, demandBase: 4720,
    inventoryBase: 118, inventoryFiveYearAvgBase: 130, daysOfSupplyBase: 24,
    topProducers: [
      { country: 'United States', outputBase: 4850 },
      { country: 'Russia', outputBase: 2200 },
      { country: 'China', outputBase: 1800 },
      { country: 'India', outputBase: 1200 },
      { country: 'South Korea', outputBase: 980 },
    ],
    topConsumers: [
      { country: 'United States', consumptionBase: 3600 },
      { country: 'Germany', consumptionBase: 820 },
      { country: 'Japan', consumptionBase: 640 },
      { country: 'France', consumptionBase: 510 },
      { country: 'United Kingdom', consumptionBase: 440 },
    ],
    seasonalityRange: [2.20, 3.10], contangoSpreadBase: -0.08,
  },
  {
    name: 'Gasoline', group: 'Energy', unit: 'kb/d', currency: 'USD/gal',
    priceBase: 2.72, supplyBase: 9800, demandBase: 9650,
    inventoryBase: 235, inventoryFiveYearAvgBase: 240, daysOfSupplyBase: 25,
    topProducers: [
      { country: 'United States', outputBase: 9800 },
      { country: 'China', outputBase: 4200 },
      { country: 'Russia', outputBase: 2400 },
      { country: 'India', outputBase: 1800 },
      { country: 'Japan', outputBase: 1200 },
    ],
    topConsumers: [
      { country: 'United States', consumptionBase: 8900 },
      { country: 'China', consumptionBase: 3600 },
      { country: 'India', consumptionBase: 1100 },
      { country: 'Brazil', consumptionBase: 840 },
      { country: 'Japan', consumptionBase: 760 },
    ],
    seasonalityRange: [2.40, 3.20], contangoSpreadBase: -0.05,
  },

  // ── Metals ──
  {
    name: 'Gold', group: 'Metals', unit: 'mt/yr', currency: 'USD/oz',
    priceBase: 2680, supplyBase: 4820, demandBase: 4650,
    inventoryBase: 36500, inventoryFiveYearAvgBase: 35000, daysOfSupplyBase: 120,
    topProducers: [
      { country: 'China', outputBase: 370 },
      { country: 'Australia', outputBase: 310 },
      { country: 'Russia', outputBase: 290 },
      { country: 'Canada', outputBase: 200 },
      { country: 'United States', outputBase: 170 },
    ],
    topConsumers: [
      { country: 'China', consumptionBase: 1270 },
      { country: 'India', consumptionBase: 1100 },
      { country: 'United States', consumptionBase: 290 },
      { country: 'Turkey', consumptionBase: 160 },
      { country: 'Saudi Arabia', consumptionBase: 110 },
    ],
    seasonalityRange: [2500, 2850], contangoSpreadBase: 15.0,
  },
  {
    name: 'Silver', group: 'Metals', unit: 'Moz/yr', currency: 'USD/oz',
    priceBase: 31.50, supplyBase: 1050, demandBase: 1120,
    inventoryBase: 680, inventoryFiveYearAvgBase: 750, daysOfSupplyBase: 90,
    topProducers: [
      { country: 'Mexico', outputBase: 190 },
      { country: 'China', outputBase: 110 },
      { country: 'Peru', outputBase: 105 },
      { country: 'Chile', outputBase: 55 },
      { country: 'Australia', outputBase: 50 },
    ],
    topConsumers: [
      { country: 'India', consumptionBase: 210 },
      { country: 'United States', consumptionBase: 160 },
      { country: 'China', consumptionBase: 145 },
      { country: 'Japan', consumptionBase: 68 },
      { country: 'Germany', consumptionBase: 42 },
    ],
    seasonalityRange: [28.0, 35.0], contangoSpreadBase: 0.35,
  },
  {
    name: 'Copper', group: 'Metals', unit: 'kt/yr', currency: 'USD/mt',
    priceBase: 9250, supplyBase: 22400, demandBase: 22800,
    inventoryBase: 195, inventoryFiveYearAvgBase: 220, daysOfSupplyBase: 14,
    topProducers: [
      { country: 'Chile', outputBase: 5400 },
      { country: 'Peru', outputBase: 2500 },
      { country: 'DR Congo', outputBase: 2300 },
      { country: 'China', outputBase: 1900 },
      { country: 'United States', outputBase: 1200 },
    ],
    topConsumers: [
      { country: 'China', consumptionBase: 14200 },
      { country: 'United States', consumptionBase: 1800 },
      { country: 'Germany', consumptionBase: 1100 },
      { country: 'Japan', consumptionBase: 960 },
      { country: 'India', consumptionBase: 850 },
    ],
    seasonalityRange: [8600, 9800], contangoSpreadBase: 35.0,
  },
  {
    name: 'Aluminum', group: 'Metals', unit: 'kt/yr', currency: 'USD/mt',
    priceBase: 2480, supplyBase: 69800, demandBase: 70500,
    inventoryBase: 485, inventoryFiveYearAvgBase: 520, daysOfSupplyBase: 18,
    topProducers: [
      { country: 'China', outputBase: 41000 },
      { country: 'India', outputBase: 4100 },
      { country: 'Russia', outputBase: 3800 },
      { country: 'Canada', outputBase: 3200 },
      { country: 'UAE', outputBase: 2700 },
    ],
    topConsumers: [
      { country: 'China', consumptionBase: 42000 },
      { country: 'United States', consumptionBase: 4800 },
      { country: 'Germany', consumptionBase: 2200 },
      { country: 'Japan', consumptionBase: 1900 },
      { country: 'India', consumptionBase: 3900 },
    ],
    seasonalityRange: [2300, 2650], contangoSpreadBase: 18.0,
  },
  {
    name: 'Platinum', group: 'Metals', unit: 'koz/yr', currency: 'USD/oz',
    priceBase: 1020, supplyBase: 5700, demandBase: 7200,
    inventoryBase: 2800, inventoryFiveYearAvgBase: 3200, daysOfSupplyBase: 65,
    topProducers: [
      { country: 'South Africa', outputBase: 3950 },
      { country: 'Russia', outputBase: 680 },
      { country: 'Zimbabwe', outputBase: 520 },
      { country: 'Canada', outputBase: 240 },
      { country: 'United States', outputBase: 140 },
    ],
    topConsumers: [
      { country: 'China', consumptionBase: 2100 },
      { country: 'Europe', consumptionBase: 1600 },
      { country: 'North America', consumptionBase: 1150 },
      { country: 'Japan', consumptionBase: 920 },
      { country: 'India', consumptionBase: 380 },
    ],
    seasonalityRange: [950, 1100], contangoSpreadBase: 5.0,
  },
  {
    name: 'Palladium', group: 'Metals', unit: 'koz/yr', currency: 'USD/oz',
    priceBase: 960, supplyBase: 6800, demandBase: 6500,
    inventoryBase: 1200, inventoryFiveYearAvgBase: 1400, daysOfSupplyBase: 40,
    topProducers: [
      { country: 'Russia', outputBase: 2700 },
      { country: 'South Africa', outputBase: 2400 },
      { country: 'Canada', outputBase: 600 },
      { country: 'United States', outputBase: 430 },
      { country: 'Zimbabwe', outputBase: 380 },
    ],
    topConsumers: [
      { country: 'China', consumptionBase: 2200 },
      { country: 'North America', consumptionBase: 1500 },
      { country: 'Europe', consumptionBase: 1400 },
      { country: 'Japan', consumptionBase: 680 },
      { country: 'India', consumptionBase: 350 },
    ],
    seasonalityRange: [880, 1050], contangoSpreadBase: -3.0,
  },

  // ── Agriculture ──
  {
    name: 'Wheat', group: 'Agriculture', unit: 'M mt/yr', currency: 'USc/bu',
    priceBase: 595, supplyBase: 790, demandBase: 795,
    inventoryBase: 258, inventoryFiveYearAvgBase: 280, daysOfSupplyBase: 42,
    topProducers: [
      { country: 'China', outputBase: 137 },
      { country: 'India', outputBase: 112 },
      { country: 'Russia', outputBase: 88 },
      { country: 'United States', outputBase: 50 },
      { country: 'France', outputBase: 36 },
    ],
    topConsumers: [
      { country: 'China', consumptionBase: 150 },
      { country: 'India', consumptionBase: 105 },
      { country: 'Russia', consumptionBase: 42 },
      { country: 'United States', consumptionBase: 31 },
      { country: 'Pakistan', consumptionBase: 28 },
    ],
    seasonalityRange: [540, 660], contangoSpreadBase: 12.0,
  },
  {
    name: 'Corn', group: 'Agriculture', unit: 'M mt/yr', currency: 'USc/bu',
    priceBase: 448, supplyBase: 1220, demandBase: 1205,
    inventoryBase: 312, inventoryFiveYearAvgBase: 295, daysOfSupplyBase: 38,
    topProducers: [
      { country: 'United States', outputBase: 387 },
      { country: 'China', outputBase: 289 },
      { country: 'Brazil', outputBase: 130 },
      { country: 'Argentina', outputBase: 55 },
      { country: 'Ukraine', outputBase: 30 },
    ],
    topConsumers: [
      { country: 'United States', consumptionBase: 315 },
      { country: 'China', consumptionBase: 295 },
      { country: 'Brazil', consumptionBase: 78 },
      { country: 'EU', consumptionBase: 72 },
      { country: 'Mexico', consumptionBase: 45 },
    ],
    seasonalityRange: [400, 510], contangoSpreadBase: 8.0,
  },
  {
    name: 'Soybeans', group: 'Agriculture', unit: 'M mt/yr', currency: 'USc/bu',
    priceBase: 1045, supplyBase: 395, demandBase: 385,
    inventoryBase: 114, inventoryFiveYearAvgBase: 105, daysOfSupplyBase: 30,
    topProducers: [
      { country: 'Brazil', outputBase: 160 },
      { country: 'United States', outputBase: 121 },
      { country: 'Argentina', outputBase: 50 },
      { country: 'China', outputBase: 20 },
      { country: 'India', outputBase: 12 },
    ],
    topConsumers: [
      { country: 'China', consumptionBase: 120 },
      { country: 'United States', consumptionBase: 65 },
      { country: 'Brazil', consumptionBase: 55 },
      { country: 'Argentina', consumptionBase: 48 },
      { country: 'EU', consumptionBase: 32 },
    ],
    seasonalityRange: [980, 1120], contangoSpreadBase: 6.0,
  },
  {
    name: 'Coffee', group: 'Agriculture', unit: 'M bags/yr', currency: 'USc/lb',
    priceBase: 385, supplyBase: 172, demandBase: 176,
    inventoryBase: 34, inventoryFiveYearAvgBase: 40, daysOfSupplyBase: 52,
    topProducers: [
      { country: 'Brazil', outputBase: 62 },
      { country: 'Vietnam', outputBase: 30 },
      { country: 'Colombia', outputBase: 12.5 },
      { country: 'Indonesia', outputBase: 10.2 },
      { country: 'Ethiopia', outputBase: 8.4 },
    ],
    topConsumers: [
      { country: 'EU', consumptionBase: 52 },
      { country: 'United States', consumptionBase: 27 },
      { country: 'Brazil', consumptionBase: 22 },
      { country: 'Japan', consumptionBase: 8 },
      { country: 'Philippines', consumptionBase: 5.5 },
    ],
    seasonalityRange: [340, 430], contangoSpreadBase: -5.0,
  },
  {
    name: 'Sugar', group: 'Agriculture', unit: 'M mt/yr', currency: 'USc/lb',
    priceBase: 19.80, supplyBase: 182, demandBase: 178,
    inventoryBase: 42, inventoryFiveYearAvgBase: 46, daysOfSupplyBase: 48,
    topProducers: [
      { country: 'Brazil', outputBase: 42 },
      { country: 'India', outputBase: 34 },
      { country: 'Thailand', outputBase: 11 },
      { country: 'China', outputBase: 10.5 },
      { country: 'United States', outputBase: 8.2 },
    ],
    topConsumers: [
      { country: 'India', consumptionBase: 29 },
      { country: 'EU', consumptionBase: 18 },
      { country: 'China', consumptionBase: 16 },
      { country: 'Brazil', consumptionBase: 11 },
      { country: 'United States', consumptionBase: 10.5 },
    ],
    seasonalityRange: [17.50, 22.50], contangoSpreadBase: 0.40,
  },
  {
    name: 'Cotton', group: 'Agriculture', unit: 'M bales/yr', currency: 'USc/lb',
    priceBase: 78.50, supplyBase: 117, demandBase: 119,
    inventoryBase: 82, inventoryFiveYearAvgBase: 90, daysOfSupplyBase: 55,
    topProducers: [
      { country: 'China', outputBase: 30 },
      { country: 'India', outputBase: 27 },
      { country: 'United States', outputBase: 15 },
      { country: 'Brazil', outputBase: 14 },
      { country: 'Pakistan', outputBase: 6 },
    ],
    topConsumers: [
      { country: 'China', consumptionBase: 38 },
      { country: 'India', consumptionBase: 25 },
      { country: 'Bangladesh', consumptionBase: 8.5 },
      { country: 'Vietnam', consumptionBase: 7.2 },
      { country: 'Turkey', consumptionBase: 6.8 },
    ],
    seasonalityRange: [72, 86], contangoSpreadBase: 1.50,
  },

  // ── Softs/Other ──
  {
    name: 'Cocoa', group: 'Softs/Other', unit: 'kt/yr', currency: 'USD/mt',
    priceBase: 8200, supplyBase: 4600, demandBase: 4950,
    inventoryBase: 1400, inventoryFiveYearAvgBase: 1750, daysOfSupplyBase: 60,
    topProducers: [
      { country: 'Ivory Coast', outputBase: 2200 },
      { country: 'Ghana', outputBase: 700 },
      { country: 'Ecuador', outputBase: 380 },
      { country: 'Cameroon', outputBase: 280 },
      { country: 'Nigeria', outputBase: 260 },
    ],
    topConsumers: [
      { country: 'Europe', consumptionBase: 1650 },
      { country: 'United States', consumptionBase: 780 },
      { country: 'Brazil', consumptionBase: 260 },
      { country: 'China', consumptionBase: 180 },
      { country: 'Japan', consumptionBase: 140 },
    ],
    seasonalityRange: [7200, 9400], contangoSpreadBase: -120.0,
  },
  {
    name: 'Lumber', group: 'Softs/Other', unit: 'Bbf/yr', currency: 'USD/mbf',
    priceBase: 520, supplyBase: 52, demandBase: 50,
    inventoryBase: 6.2, inventoryFiveYearAvgBase: 7.0, daysOfSupplyBase: 22,
    topProducers: [
      { country: 'Canada', outputBase: 16 },
      { country: 'United States', outputBase: 14 },
      { country: 'Russia', outputBase: 8 },
      { country: 'Sweden', outputBase: 4.5 },
      { country: 'Finland', outputBase: 3.8 },
    ],
    topConsumers: [
      { country: 'United States', consumptionBase: 22 },
      { country: 'China', consumptionBase: 10 },
      { country: 'Japan', consumptionBase: 3.5 },
      { country: 'Germany', consumptionBase: 2.8 },
      { country: 'United Kingdom', consumptionBase: 2.2 },
    ],
    seasonalityRange: [440, 620], contangoSpreadBase: -8.0,
  },
  {
    name: 'Iron Ore', group: 'Softs/Other', unit: 'M mt/yr', currency: 'USD/mt',
    priceBase: 108, supplyBase: 2500, demandBase: 2380,
    inventoryBase: 142, inventoryFiveYearAvgBase: 130, daysOfSupplyBase: 35,
    topProducers: [
      { country: 'Australia', outputBase: 920 },
      { country: 'Brazil', outputBase: 380 },
      { country: 'China', outputBase: 360 },
      { country: 'India', outputBase: 280 },
      { country: 'Russia', outputBase: 100 },
    ],
    topConsumers: [
      { country: 'China', consumptionBase: 1450 },
      { country: 'India', consumptionBase: 220 },
      { country: 'Japan', consumptionBase: 110 },
      { country: 'South Korea', consumptionBase: 72 },
      { country: 'EU', consumptionBase: 140 },
    ],
    seasonalityRange: [95, 125], contangoSpreadBase: -2.50,
  },
  {
    name: 'Lithium', group: 'Softs/Other', unit: 'kt LCE/yr', currency: 'USD/mt LCE',
    priceBase: 14500, supplyBase: 980, demandBase: 1050,
    inventoryBase: 85, inventoryFiveYearAvgBase: 60, daysOfSupplyBase: 28,
    topProducers: [
      { country: 'Australia', outputBase: 380 },
      { country: 'Chile', outputBase: 260 },
      { country: 'China', outputBase: 180 },
      { country: 'Argentina', outputBase: 85 },
      { country: 'Brazil', outputBase: 30 },
    ],
    topConsumers: [
      { country: 'China', consumptionBase: 680 },
      { country: 'South Korea', consumptionBase: 110 },
      { country: 'Japan', consumptionBase: 75 },
      { country: 'United States', consumptionBase: 60 },
      { country: 'Europe', consumptionBase: 55 },
    ],
    seasonalityRange: [12000, 18000], contangoSpreadBase: -350.0,
  },
  {
    name: 'Uranium', group: 'Softs/Other', unit: 'Mlb U3O8/yr', currency: 'USD/lb',
    priceBase: 82, supplyBase: 145, demandBase: 180,
    inventoryBase: 220, inventoryFiveYearAvgBase: 250, daysOfSupplyBase: 150,
    topProducers: [
      { country: 'Kazakhstan', outputBase: 58 },
      { country: 'Canada', outputBase: 18 },
      { country: 'Namibia', outputBase: 14 },
      { country: 'Australia', outputBase: 12 },
      { country: 'Uzbekistan', outputBase: 8 },
    ],
    topConsumers: [
      { country: 'United States', consumptionBase: 44 },
      { country: 'France', consumptionBase: 24 },
      { country: 'China', consumptionBase: 28 },
      { country: 'Russia', consumptionBase: 16 },
      { country: 'South Korea', consumptionBase: 12 },
    ],
    seasonalityRange: [72, 95], contangoSpreadBase: 1.50,
  },
];

// ── Supply Risk Scenarios ──

interface SupplyRiskConfig {
  commodity: string;
  risk: string;
  description: string;
  impactLevel: 'high' | 'medium' | 'low';
}

const SUPPLY_RISKS: SupplyRiskConfig[] = [
  { commodity: 'Brent Crude', risk: 'OPEC+ production policy', description: 'Potential quota adjustments may tighten global crude supply by 0.5-1.0 mb/d in H2 2026', impactLevel: 'high' },
  { commodity: 'Natural Gas', risk: 'LNG export capacity constraints', description: 'US LNG terminal maintenance season may reduce export capacity by 2-3 bcf/d', impactLevel: 'medium' },
  { commodity: 'Copper', risk: 'Chilean mine disruptions', description: 'Water scarcity and labor negotiations threaten 200-300 kt of annualized output', impactLevel: 'high' },
  { commodity: 'Wheat', risk: 'Black Sea export corridor', description: 'Ongoing geopolitical tensions risk disrupting 25-30 M mt of annual export flows', impactLevel: 'high' },
  { commodity: 'Coffee', risk: 'Brazilian frost risk', description: 'La Nina pattern increases frost probability in Minas Gerais growing regions', impactLevel: 'medium' },
  { commodity: 'Cocoa', risk: 'West African crop disease', description: 'Swollen shoot virus spreading in Ivory Coast and Ghana may reduce output 10-15%', impactLevel: 'high' },
  { commodity: 'Lithium', risk: 'DRC artisanal mining regulations', description: 'New ESG compliance requirements may slow spodumene concentrate exports', impactLevel: 'medium' },
  { commodity: 'Platinum', risk: 'South African load-shedding', description: 'Power grid instability continues to constrain PGM smelter throughput', impactLevel: 'medium' },
  { commodity: 'Iron Ore', risk: 'Australian cyclone season', description: 'Pilbara port shutdowns during cyclone season may reduce Q1 shipments by 15-20 M mt', impactLevel: 'medium' },
  { commodity: 'Uranium', risk: 'Kazakhstan production shortfall', description: 'Sulfuric acid supply issues and ISR well depletion limiting Kazatomprom output growth', impactLevel: 'high' },
  { commodity: 'Palladium', risk: 'Russian export sanctions', description: 'Potential broadening of sanctions on Russian PGM exports could remove 2.5 Moz from market', impactLevel: 'high' },
  { commodity: 'Cotton', risk: 'Indian monsoon variability', description: 'Below-normal monsoon forecast threatens Maharashtra and Gujarat cotton yields', impactLevel: 'low' },
  { commodity: 'Sugar', risk: 'Brazilian ethanol diversion', description: 'High ethanol prices incentivizing cane diversion from sugar to fuel production', impactLevel: 'medium' },
  { commodity: 'Aluminum', risk: 'Chinese capacity cap enforcement', description: 'Government enforcing 45 Mt production ceiling may limit global supply growth', impactLevel: 'medium' },
  { commodity: 'Lumber', risk: 'Canadian wildfire season', description: 'Extended fire season in British Columbia threatens 1.5-2.0 Bbf of timber supply', impactLevel: 'low' },
];

// ── Helpers ──

function round2(n: number): number { return Math.round(n * 100) / 100; }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Data Generation ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-commodity-fundamentals'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const currentMonth = new Date().getMonth();

  // Generate per-commodity data
  const commodities = COMMODITIES.map(cfg => {
    const price = round2(jitter(cfg.priceBase, 0.08));
    const change = round2((rng() - 0.48) * cfg.priceBase * 0.04);
    const changePct = round2((change / (price - change)) * 100);

    // Supply & demand
    const supplyCurrent = round2(jitter(cfg.supplyBase, 0.05));
    const supplyForecast = round2(supplyCurrent * (1 + (rng() - 0.45) * 0.06));
    const supplyYoy = round2((rng() - 0.4) * 5);
    const demandCurrent = round2(jitter(cfg.demandBase, 0.05));
    const demandForecast = round2(demandCurrent * (1 + (rng() - 0.4) * 0.06));
    const demandYoy = round2((rng() - 0.35) * 5);
    const balance = round2(supplyCurrent - demandCurrent);

    // Inventory
    const invCurrent = round2(jitter(cfg.inventoryBase, 0.10));
    const invPrevWeek = round2(invCurrent + (rng() - 0.5) * cfg.inventoryBase * 0.03);
    const invFiveYearAvg = round2(jitter(cfg.inventoryFiveYearAvgBase, 0.03));
    const daysOfSupply = round2(jitter(cfg.daysOfSupplyBase, 0.08));
    const invChange = round2(invCurrent - invPrevWeek);

    // Production: top producers with jittered output and computed share
    const rawProducers = cfg.topProducers.map(p => ({
      country: p.country,
      output: round2(jitter(p.outputBase, 0.06)),
    }));
    const totalProd = rawProducers.reduce((s, p) => s + p.output, 0);
    const topProducers = rawProducers.map(p => ({
      country: p.country,
      output: p.output,
      share: round2((p.output / totalProd) * 100),
    }));

    // Consumption: top consumers with jittered values and computed share
    const rawConsumers = cfg.topConsumers.map(c => ({
      country: c.country,
      consumption: round2(jitter(c.consumptionBase, 0.06)),
    }));
    const totalCons = rawConsumers.reduce((s, c) => s + c.consumption, 0);
    const topConsumers = rawConsumers.map(c => ({
      country: c.country,
      consumption: c.consumption,
      share: round2((c.consumption / totalCons) * 100),
    }));

    // Seasonality
    const [rangeLow, rangeHigh] = cfg.seasonalityRange;
    const typicalMid = (rangeLow + rangeHigh) / 2;
    const deviation = round2(((price - typicalMid) / typicalMid) * 100);

    // Contango / backwardation
    const contangoSpread = round2(jitter(cfg.contangoSpreadBase, 0.30));

    return {
      name: cfg.name,
      group: cfg.group,
      unit: cfg.unit,
      currency: cfg.currency,
      price,
      change,
      changePct,
      supply: {
        current: supplyCurrent,
        forecast: supplyForecast,
        yoyChange: supplyYoy,
      },
      demand: {
        current: demandCurrent,
        forecast: demandForecast,
        yoyChange: demandYoy,
      },
      balance,
      balanceStatus: balance >= 0 ? 'surplus' as const : 'deficit' as const,
      inventory: {
        current: invCurrent,
        previousWeek: invPrevWeek,
        fiveYearAvg: invFiveYearAvg,
        daysOfSupply,
        change: invChange,
      },
      production: { topProducers },
      consumption: { topConsumers },
      seasonality: {
        currentMonth: MONTHS[currentMonth],
        typicalRange: { low: rangeLow, high: rangeHigh },
        deviation,
      },
      contango: {
        spread: contangoSpread,
        structure: contangoSpread > 0 ? 'contango' as const : 'backwardation' as const,
      },
    };
  });

  // Sector summary
  const groups: CommodityGroup[] = ['Energy', 'Metals', 'Agriculture', 'Softs/Other'];
  const sectorSummary = groups.map(group => {
    const members = commodities.filter(c => c.group === group);
    const avgReturn = round2(members.reduce((s, c) => s + c.changePct, 0) / members.length);
    const avgInvChange = members.reduce((s, c) => s + c.inventory.change, 0) / members.length;
    const inventoryTrend: 'building' | 'drawing' | 'flat' =
      avgInvChange > 0.5 ? 'building' : avgInvChange < -0.5 ? 'drawing' : 'flat';
    const avgBalance = members.reduce((s, c) => s + c.balance, 0) / members.length;
    const balanceOutlook: 'surplus' | 'deficit' | 'balanced' =
      avgBalance > 0.5 ? 'surplus' : avgBalance < -0.5 ? 'deficit' : 'balanced';
    return { group, avgReturn, inventoryTrend, balanceOutlook };
  });

  // Supply risks (select a subset using PRNG)
  const numRisks = 5 + Math.floor(rng() * 4);
  const shuffled = [...SUPPLY_RISKS].sort(() => rng() - 0.5);
  const supplyRisks = shuffled.slice(0, numRisks).map(r => ({
    commodity: r.commodity,
    risk: r.risk,
    description: r.description,
    impactLevel: r.impactLevel,
  }));

  return {
    commodities,
    sectorSummary,
    supplyRisks,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CommodityFundamentals] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate commodity fundamentals data' });
  }
});

export default router;
