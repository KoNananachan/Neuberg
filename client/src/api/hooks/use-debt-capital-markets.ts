import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDebtCapitalMarkets() {
  return useQuery({
    queryKey: ['debt-capital-markets'],
    queryFn: () => api.get<any>('/debt-capital-markets'),
    staleTime: 60 * 60 * 1000,
  });
}
