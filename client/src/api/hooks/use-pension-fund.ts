import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePensionFund() {
  return useQuery({
    queryKey: ['pension-fund'],
    queryFn: () => api.get<any>('/pension-fund'),
    staleTime: 60 * 60 * 1000,
  });
}
