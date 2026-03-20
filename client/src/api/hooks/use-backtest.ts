import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface BacktestTrade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  holdingDays: number;
}

export interface BacktestEquityPoint {
  date: string;
  value: number;
}

export interface BacktestMonthlyReturn {
  month: string;
  return: number;
}

export interface BacktestMetrics {
  totalReturn: number;
  annReturn: number;
  maxDrawdown: number;
  sharpe: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgHoldDays: number;
}

export interface BacktestBuyHold {
  totalReturn: number;
  maxDrawdown: number;
  sharpe: number;
}

export interface BacktestParams {
  symbol: string;
  strategy: string;
  params: Record<string, number>;
  startDate: string;
  endDate: string;
}

export interface BacktestResult {
  symbol: string;
  strategy: string;
  params: Record<string, number>;
  trades: BacktestTrade[];
  metrics: BacktestMetrics;
  equity: BacktestEquityPoint[];
  buyHold: BacktestBuyHold;
  monthlyReturns: BacktestMonthlyReturn[];
}

export function useBacktest(config: BacktestParams | null) {
  return useQuery({
    queryKey: ['backtest', config],
    queryFn: () => api.post<BacktestResult>('/backtest', config),
    enabled: !!config,
    staleTime: 60 * 60_000,
  });
}
