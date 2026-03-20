import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEquityCapitalMarkets() {
  return useQuery({
    queryKey: ['equity-capital-markets'],
    queryFn: () => api.get<any>('/equity-capital-markets'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
