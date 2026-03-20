import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFiscalPolicy() {
  return useQuery({
    queryKey: ['fiscal-policy'],
    queryFn: () => api.get<any>('/fiscal-policy'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
