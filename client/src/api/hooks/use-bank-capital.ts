import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBankCapital() {
  return useQuery({
    queryKey: ['bank-capital'],
    queryFn: () => api.get<any>('/bank-capital'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
