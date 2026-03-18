import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebtCapitalMarkets() {
  return useQuery({
    queryKey: ['debt-capital-markets'],
    queryFn: () => api.get<any>('/debt-capital-markets'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
