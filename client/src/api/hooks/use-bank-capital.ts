import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBankCapital() {
  return useQuery({
    queryKey: ['bank-capital'],
    queryFn: () => api.get<any>('/bank-capital'),
    staleTime: 60 * 60 * 1000,
  });
}
