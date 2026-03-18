import { useQuery } from '@tanstack/react-query';

export interface RSResult {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  rs1m: number;
  rs3m: number;
  rs6m: number;
  rs12m: number;
  rsScore: number;
  rsRating: number;
}

async function fetchRelativeStrength(): Promise<RSResult[]> {
  const res = await fetch('/api/relative-strength');
  if (!res.ok) throw new Error('Failed to fetch relative strength');
  return res.json();
}

export function useRelativeStrength() {
  return useQuery({
    queryKey: ['relative-strength'],
    queryFn: fetchRelativeStrength,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}
