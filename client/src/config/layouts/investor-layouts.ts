import type { IJsonModel } from 'flexlayout-react';

const GLOBAL = {
  tabEnableClose: true,
  tabEnableRename: false,
  tabSetEnableMaximize: true,
  tabSetEnableClose: false,
  splitterSize: 2,
  splitterExtra: 6,
  tabSetMinHeight: 80,
  tabSetMinWidth: 80,
};

// ── Layout 1 — STOCK PICKER ────────────────────────────────────────────────
// Left: Stock Picker table (wide)
// Centre: Chart + Financials
// Right: Valuation Card + DCA panel
export const LAYOUT_STOCK_PICKER: IJsonModel = {
  global: GLOBAL,
  borders: [],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      // Left — stock picker table
      {
        type: 'tabset',
        weight: 45,
        children: [
          { type: 'tab', name: 'STOCK PICKER', component: 'iv-stock-picker', id: 'iv-stock-picker' },
        ],
      },
      // Centre — chart + fundamentals
      {
        type: 'row',
        weight: 30,
        children: [
          {
            type: 'tabset',
            weight: 60,
            children: [
              { type: 'tab', name: 'MARKET WATCH', component: 'market-watch', id: 'market-watch' },
              { type: 'tab', name: 'TECHNICAL CHART', component: 'technical-chart', id: 'technical-chart' },
            ],
          },
          {
            type: 'tabset',
            weight: 40,
            children: [
              { type: 'tab', name: 'FINANCIALS', component: 'financials', id: 'financials' },
              { type: 'tab', name: 'ANALYST RATINGS', component: 'analyst-ratings', id: 'analyst-ratings' },
            ],
          },
        ],
      },
      // Right — valuation + DCA
      {
        type: 'row',
        weight: 25,
        children: [
          {
            type: 'tabset',
            weight: 65,
            children: [
              { type: 'tab', name: 'VALUATION CARD', component: 'iv-valuation-card', id: 'iv-valuation-card' },
            ],
          },
          {
            type: 'tabset',
            weight: 35,
            children: [
              { type: 'tab', name: 'DCA / DOUBLE DOWN', component: 'iv-dca', id: 'iv-dca' },
            ],
          },
        ],
      },
    ],
  },
};

// ── Layout 2 — PORTFOLIO REVIEW ────────────────────────────────────────────
// Left: Portfolio Review table + sector charts
// Right: Research Notes
export const LAYOUT_PORTFOLIO_REVIEW: IJsonModel = {
  global: GLOBAL,
  borders: [],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      // Left — portfolio review (wide)
      {
        type: 'tabset',
        weight: 65,
        children: [
          { type: 'tab', name: 'PORTFOLIO REVIEW', component: 'iv-portfolio-review', id: 'iv-portfolio-review' },
          { type: 'tab', name: 'PORTFOLIO ANALYTICS', component: 'portfolio-analytics', id: 'portfolio-analytics' },
          { type: 'tab', name: 'DCA / DOUBLE DOWN', component: 'iv-dca', id: 'iv-dca' },
        ],
      },
      // Right — research notes + valuation card
      {
        type: 'row',
        weight: 35,
        children: [
          {
            type: 'tabset',
            weight: 55,
            children: [
              { type: 'tab', name: 'RESEARCH & NOTES', component: 'iv-research-notes', id: 'iv-research-notes' },
            ],
          },
          {
            type: 'tabset',
            weight: 45,
            children: [
              { type: 'tab', name: 'VALUATION CARD', component: 'iv-valuation-card', id: 'iv-valuation-card' },
            ],
          },
        ],
      },
    ],
  },
};

// ── Layout 3 — RESEARCH & NOTES ───────────────────────────────────────────
// Left: Research notes (full)
// Right: Stock Picker | Valuation Card
export const LAYOUT_RESEARCH: IJsonModel = {
  global: GLOBAL,
  borders: [],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      // Left — research notes
      {
        type: 'tabset',
        weight: 40,
        children: [
          { type: 'tab', name: 'RESEARCH & NOTES', component: 'iv-research-notes', id: 'iv-research-notes' },
        ],
      },
      // Centre — stock picker
      {
        type: 'tabset',
        weight: 35,
        children: [
          { type: 'tab', name: 'STOCK PICKER', component: 'iv-stock-picker', id: 'iv-stock-picker' },
        ],
      },
      // Right — valuation + news
      {
        type: 'row',
        weight: 25,
        children: [
          {
            type: 'tabset',
            weight: 55,
            children: [
              { type: 'tab', name: 'VALUATION CARD', component: 'iv-valuation-card', id: 'iv-valuation-card' },
            ],
          },
          {
            type: 'tabset',
            weight: 45,
            children: [
              { type: 'tab', name: 'NEWS FEED', component: 'news-feed', id: 'news-feed' },
            ],
          },
        ],
      },
    ],
  },
};

export const INVESTOR_LAYOUTS: Array<{ id: string; label: string; model: IJsonModel }> = [
  { id: 'iv-stock-picker', label: 'STOCK PICKER', model: LAYOUT_STOCK_PICKER },
  { id: 'iv-portfolio', label: 'PORTFOLIO REVIEW', model: LAYOUT_PORTFOLIO_REVIEW },
  { id: 'iv-research', label: 'RESEARCH', model: LAYOUT_RESEARCH },
];
